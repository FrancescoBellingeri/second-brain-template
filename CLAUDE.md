<!--
  What: rules Claude Code follows when a session's cwd is this vault. Its core
  job is PASSIVE CAPTURE — silently turning discoveries into atomic inbox notes —
  plus how the knowledge graph is kept fresh. The same capture protocol is
  installed GLOBALLY (a delimited block in ~/.claude/CLAUDE.md, written by
  bootstrap.sh from templates/global-capture-block.md) so capture also fires
  while you work in OTHER project repos.
  How to test: start a Claude Code session, describe an architectural decision or
  a solved non-trivial bug, and confirm a well-formed note appears in inbox/
  without Claude asking permission. Then run /capture and check the graph
  refreshed (graphify-out/graph.json mtime updates).
-->

# kepra — capture rules

This is your kepra vault: atomic notes → knowledge graph (Graphify) →
content angles (agency-agents). The project is always a frontmatter field, never
a folder. Never hardcode a project name.

## Passive capture (do this without being asked)

While working in a session, when a **durable discovery** emerges, silently write
an atomic note to `inbox/`. Do NOT interrupt the flow, do NOT ask permission,
do NOT announce it beyond a one-line mention. Capture when you hit:

- an **architectural decision** (and its rationale / trade-off)
- a **non-trivial bug** solved (root cause, not the symptom)
- a **benchmark / measurement** result
- a **reusable insight** worth recalling later
- a **generalizable pattern** or anti-pattern

Do NOT capture: routine edits, trivia, restated docs, or anything already
recorded in the code or git history. One note = one atomic idea, 5–15 lines.

### Note format (mandatory)

Filename: `inbox/YYYY-MM-DD-slug.md` (slug = kebab-case nominal phrase).

```yaml
---
type: insight | decision | error | benchmark | idea
project: PROJECT          # lowercase canonical value from projects/naming.md
date: YYYY-MM-DD
status: fresh
content_potential: high | medium | low | none   # judge NOW, at write time
channels: []              # optional, e.g. [linkedin, twitter]
posted: []
---
```

Body: one atomic idea. **Reference every entity by its canonical name from
`projects/naming.md`** — this is what lets Graphify build useful edges between
notes. If an entity isn't in `naming.md` yet and it matters, add it there.

`content_potential` = could this become a social post? Judge honestly:
`high` = a standalone story/benchmark/lesson; `none` = internal-only detail.

## Graph

Never hand-edit `graphify-out/` — it is generated. The graph is built
**deterministically** by `kepra-index`: it string-matches the canonical names in
`projects/naming.md` (and `[[wikilinks]]`) across your notes to link them. Zero
tokens, under a second. It runs by itself after every note write (hook) and inside
`/capture`, `/today`, and the nightly commit — so keeping `naming.md` accurate is
what makes the graph good.

Optionally, `/graphify <vault>` adds LLM `semantically_similar_to` edges on top;
kepra-index preserves them on later rebuilds. This is opt-in, not the default path.

Query the graph via CLI (not MCP):
`graphify query "<q>"` · `graphify path "A" "B"` · `graphify explain "X"`.
