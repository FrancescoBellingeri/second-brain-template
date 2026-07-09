#!/usr/bin/env python3
# What: /today's mechanical phase. Reads inbox note frontmatter (editorial
#   metadata) + graphify-out/graph.json (connectivity), applies the candidate
#   filters, scores, and prints a ranked JSON — so /today only has to phrase the
#   angles. Keeps parsing/scoring deterministic and cheap instead of re-deriving
#   it in the prompt every run. Stdlib only; the vault path is an ARGUMENT.
# Usage: today-candidates <vault> [project] [--today YYYY-MM-DD]
# Output (stdout): {"today","vault","project","candidates":[...],"skipped":[...]}
#   candidates are sorted by score desc; each carries degree, neighbors,
#   community, score, and suggested_agent. skipped carries skipped_reason[].
# How to test: today-candidates <vault> | python3 -m json.tool — notes with
#   content_potential:none or non-empty posted[] appear under "skipped".
import sys, os, json, re, glob, datetime

AGENT = {
    "benchmark": "LinkedIn Content Creator",
    "error":     "Twitter Engager",
    "decision":  "Reddit Community Builder",
    "insight":   "Content Creator",
    "idea":      "Content Creator",
}

def parse_fm(text):
    m = re.match(r"^---\s*\n(.*?)\n---", text, re.S)
    fm = {}
    if not m:
        return fm
    for line in m.group(1).splitlines():
        mm = re.match(r"^([A-Za-z_]+):\s*(.*)$", line)
        if mm:
            fm[mm.group(1)] = mm.group(2).strip()
    return fm

def parse_list(v):
    v = (v or "").strip()
    if v in ("", "[]"):
        return []
    return [x.strip() for x in v.strip("[]").split(",") if x.strip()]

def main():
    args = [a for a in sys.argv[1:]]
    today = datetime.date.today()
    if "--today" in args:
        i = args.index("--today")
        today = datetime.date.fromisoformat(args[i + 1])
        del args[i:i + 2]
    if not args:
        print("usage: today-candidates <vault> [project] [--today YYYY-MM-DD]", file=sys.stderr)
        sys.exit(2)
    vault = args[0]
    project = args[1] if len(args) > 1 else None

    # --- graph connectivity ---
    deg, comm, neigh, label, id_by_src = {}, {}, {}, {}, {}
    gp = os.path.join(vault, "graphify-out", "graph.json")
    if os.path.exists(gp):
        g = json.load(open(gp))
        for n in g["nodes"]:
            label[n["id"]] = n.get("label", n["id"])
            comm[n["id"]] = n.get("community")
            sf = n.get("source_file", "")
            if sf.startswith("inbox/"):
                id_by_src[os.path.basename(sf)] = n["id"]
        adj = {}
        for e in g.get("links", []):
            adj.setdefault(e["source"], set()).add(e["target"])
            adj.setdefault(e["target"], set()).add(e["source"])
        for nid, s in adj.items():
            deg[nid] = len(s)
            neigh[nid] = sorted(label.get(x, x) for x in s)

    candidates, skipped = [], []
    for p in sorted(glob.glob(os.path.join(vault, "inbox", "*.md"))):
        base = os.path.basename(p)
        fm = parse_fm(open(p, encoding="utf-8").read())
        typ, proj, cp = fm.get("type", ""), fm.get("project", ""), fm.get("content_potential", "")
        status = fm.get("status", "fresh")
        posted, channels = parse_list(fm.get("posted")), parse_list(fm.get("channels"))
        try:
            days = (today - datetime.date.fromisoformat(fm.get("date", ""))).days
        except Exception:
            days = 999
        nid = id_by_src.get(base)
        ndeg = deg.get(nid, 0)
        rec = {"file": base, "project": proj, "type": typ, "content_potential": cp,
               "status": status, "date": fm.get("date", ""), "days": days, "channels": channels, "posted": posted,
               "degree": ndeg, "community": comm.get(nid), "neighbors": neigh.get(nid, []),
               "suggested_agent": AGENT.get(typ, "Content Creator")}
        reasons = []
        if status != "fresh":    reasons.append("status:%s" % (status or "unset"))
        if not (0 <= days <= 7): reasons.append("out-of-window")
        if cp == "none":         reasons.append("content_potential:none")
        if posted:               reasons.append("already-posted")
        if project and proj != project: reasons.append("project!=%s" % project)
        if reasons:
            rec["skipped_reason"] = reasons
            skipped.append(rec)
            continue
        recency = 3 if days == 0 else (2 if days <= 3 else 1)
        pot = {"high": 3, "medium": 2, "low": 1}.get(cp, 0)
        rec["score"] = recency * pot * (1 + ndeg)
        candidates.append(rec)

    candidates.sort(key=lambda r: -r["score"])
    print(json.dumps({"today": today.isoformat(), "vault": vault, "project": project,
                      "candidates": candidates, "skipped": skipped}, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    main()
