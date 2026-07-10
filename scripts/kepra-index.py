#!/usr/bin/env python3
# What: deterministic, zero-token knowledge-graph builder for a kepra vault.
#   Reads projects/naming.md for the canonical entity dictionary, then string-
#   matches those entities (and [[wikilinks]]) across every note in inbox/ and
#   permanent/ to build note->entity and note<->note edges. The result is fed
#   through graphify's OWN build/cluster/export, so graph.json is byte-compatible
#   with `graphify query/path/explain` and today-candidates. No LLM. Runs <1s.
#   An occasional `/graphify` run can still enrich this graph with semantic
#   (`semantically_similar_to`) edges — those are preserved across rebuilds.
# Usage: kepra-index <vault>
# How to test:
#   kepra-index <vault>
#   graphify explain "company_dependent"    # → the notes that mention it
#   today-candidates <vault>                 # → connected notes show degree > 0
import sys, os, re, json, glob

def _ensure_graphify_interpreter():
    """graphify is installed for one specific python; if the current interpreter
    can't import it, re-exec under the interpreter behind the `graphify` binary
    so we get real Louvain clustering (not the raw fallback)."""
    try:
        import graphify  # noqa: F401
        return
    except Exception:
        pass
    import shutil
    gbin = shutil.which("graphify")
    if not gbin:
        return
    try:
        first = open(gbin, encoding="utf-8").readline().strip()
    except Exception:
        return
    if first.startswith("#!"):
        cand = first[2:].strip().split()[0]
        if os.path.exists(cand) and os.path.realpath(cand) != os.path.realpath(sys.executable):
            os.execv(cand, [cand] + sys.argv)

# ---------- helpers ----------
def norm_id(s):
    return re.sub(r"_+", "_", re.sub(r"[^a-z0-9]+", "_", s.lower())).strip("_")

def strip_frontmatter(text):
    m = re.match(r"^---\s*\n.*?\n---\s*\n?", text, re.S)
    return text[m.end():] if m else text

def split_top_commas(s):
    parts, depth, cur = [], 0, ""
    for ch in s:
        if ch in "([": depth += 1
        elif ch in ")]": depth = max(0, depth - 1)
        if ch == "," and depth == 0:
            parts.append(cur); cur = ""
        else:
            cur += ch
    if cur.strip():
        parts.append(cur)
    return parts

# ---------- entity dictionary from naming.md ----------
def load_entities(naming_path):
    """Return {label: kind} where kind is 'symbol' (case-sensitive, code-boundary)
    or 'concept' (case-insensitive, word-boundary)."""
    if not os.path.exists(naming_path):
        return {}
    text = open(naming_path, encoding="utf-8").read()
    # Restrict to the per-project "canonical entities" sections: everything
    # between the first "## <x> — canonical entities" header and "## Canonical
    # taxonomy". This deliberately EXCLUDES the global tech-tags list (hub-noise).
    start = re.search(r"\n##\s+\S[^\n]*canonical entities", text, re.I)
    end = re.search(r"\n##\s+Canonical taxonomy", text)
    block = text[(start.start() if start else 0):(end.start() if end else len(text))]

    ents = {}
    def add(label):
        label = label.strip().strip(" `*·—-").rstrip("()")
        if not label or len(label) > 45 or not re.search(r"[A-Za-z]", label):
            return
        kind = "symbol" if (" " not in label and re.fullmatch(r"[A-Za-z0-9_.\-]+", label)) else "concept"
        if kind == "symbol" and len(label) < 2:
            return
        ents.setdefault(label, kind)

    for line in block.splitlines():
        if re.match(r"\s*-\s*\*\*Stack", line):   # skip generic frameworks
            continue
        for tok in re.findall(r"`([^`]+)`", line):          # backtick code symbols
            add(tok)
        for b in re.findall(r"\*\*([^*]+)\*\*", line):       # bold, unless a category label
            if not b.rstrip().endswith(":"):
                add(b)
        # comma-separated concepts after a "- **Label:** ..." bullet
        mm = re.match(r"\s*-\s*\*\*([^:*]+):\*\*\s*(.*)", line)
        if mm and mm.group(1).strip() != "Stack":
            for piece in split_top_commas(mm.group(2)):
                alias = re.search(r"\(([^)]+)\)", piece)
                if alias:
                    add(alias.group(1))
                base = re.sub(r"\([^)]*\)", "", piece).strip(" `*·—-.")
                # keep only Title-Case / acronym phrases (drop prose like "honest abstention")
                if base and base[0].isupper() and len(base.split()) <= 6:
                    add(base)
    return ents

def make_matcher(label, kind):
    core = re.escape(label)
    if kind == "symbol":
        rx = re.compile(r"(?<![\w.\-])" + core + r"(?![\w.\-])")          # case-sensitive
    else:
        rx = re.compile(r"\b" + core + r"\b", re.I)                        # case-insensitive
    return rx

# ---------- build ----------
def main():
    if len(sys.argv) < 2:
        print("usage: kepra-index <vault>", file=sys.stderr); sys.exit(2)
    _ensure_graphify_interpreter()
    vault = os.path.abspath(sys.argv[1])
    out_dir = os.path.join(vault, "graphify-out")
    out_path = os.path.join(out_dir, "graph.json")
    os.makedirs(out_dir, exist_ok=True)

    ents = load_entities(os.path.join(vault, "projects", "naming.md"))
    matchers = {lab: (make_matcher(lab, kind), kind) for lab, kind in ents.items()}

    note_paths = sorted(
        glob.glob(os.path.join(vault, "inbox", "*.md")) +
        glob.glob(os.path.join(vault, "permanent", "*.md"))
    )

    nodes, edges = [], []
    used_entities = {}          # label -> node id
    note_of_stem = {}           # filename stem -> note id
    note_entities = {}          # note id -> set(entity ids)

    def ent_node(label):
        if label not in used_entities:
            eid = "ent_" + norm_id(label)
            used_entities[label] = eid
            nodes.append({"id": eid, "label": label, "file_type": "concept",
                          "source_file": "projects/naming.md", "source_location": None})
        return used_entities[label]

    note_recs = []
    for p in note_paths:
        rel = "inbox/" + os.path.basename(p) if os.sep + "inbox" + os.sep in p \
              else "permanent/" + os.path.basename(p)
        stem = os.path.splitext(os.path.basename(p))[0]
        nid = norm_id(rel.replace("/", "_").replace(".md", ""))
        note_of_stem[stem] = nid
        body = strip_frontmatter(open(p, encoding="utf-8").read())
        title = re.sub(r"^\d{4}-\d{2}-\d{2}-", "", stem).replace("-", " ")
        nodes.append({"id": nid, "label": title, "file_type": "document",
                      "source_file": rel, "source_location": None})
        note_recs.append((nid, body))

    for nid, body in note_recs:
        found = set()
        for lab, (rx, _kind) in matchers.items():
            if rx.search(body):
                eid = ent_node(lab)
                found.add(eid)
                edges.append({"source": nid, "target": eid, "relation": "references",
                              "confidence": "EXTRACTED", "confidence_score": 1.0,
                              "source_file": None, "weight": 1.0})
        note_entities[nid] = found
        # [[wikilinks]] -> note->note
        for tgt in re.findall(r"\[\[([^\]]+)\]\]", body):
            t = note_of_stem.get(tgt.strip()) or note_of_stem.get(os.path.splitext(tgt.strip())[0])
            if t and t != nid:
                edges.append({"source": nid, "target": t, "relation": "references",
                              "confidence": "EXTRACTED", "confidence_score": 1.0,
                              "source_file": None, "weight": 1.0})

    # note<->note when they share >=1 entity (one edge per pair)
    ids = list(note_entities)
    for i in range(len(ids)):
        for j in range(i + 1, len(ids)):
            if note_entities[ids[i]] & note_entities[ids[j]]:
                edges.append({"source": ids[i], "target": ids[j],
                              "relation": "conceptually_related_to", "confidence": "INFERRED",
                              "confidence_score": 0.75, "source_file": None, "weight": 1.0})

    # preserve LLM enrichment (semantically_similar_to) from any prior /graphify run
    node_ids = {n["id"] for n in nodes}
    if os.path.exists(out_path):
        try:
            old = json.load(open(out_path, encoding="utf-8"))
            for e in old.get("links", []):
                if e.get("relation") == "semantically_similar_to" \
                   and e.get("source") in node_ids and e.get("target") in node_ids:
                    edges.append(e)
        except Exception:
            pass

    extraction = {"nodes": nodes, "edges": edges, "hyperedges": [],
                  "input_tokens": 0, "output_tokens": 0}

    # Build + cluster + export via graphify itself (identical output schema).
    try:
        from graphify.build import build_from_json
        from graphify.cluster import cluster
        from graphify.export import to_json
        G = build_from_json(extraction)
        communities = cluster(G)
        to_json(G, communities, out_path)
        ncomm = len(communities)
    except Exception as ex:
        # Fallback: write node-link graph.json directly (still readable by
        # today-candidates; graphify CLI needs it too but this keeps us running).
        for n in nodes:
            n.setdefault("community", 0)
        json.dump({"directed": False, "multigraph": False, "graph": {},
                   "nodes": nodes, "links": edges}, open(out_path, "w"), ensure_ascii=False)
        ncomm = 1
        print(f"[kepra-index] graphify build unavailable ({ex}); wrote raw graph.json", file=sys.stderr)

    print(f"[kepra-index] {len(note_recs)} notes, {len(used_entities)} entities, "
          f"{len(edges)} edges, {ncomm} communities → {out_path}")

if __name__ == "__main__":
    main()
