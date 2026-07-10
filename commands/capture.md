---
description: End-of-session sweep — write notes passive capture missed, then refresh the graph
---
<!--
  What: /capture is the final capture pass for a working session. Passive capture
  (the global block in ~/.claude/CLAUDE.md) writes notes as discoveries happen;
  this command re-reads the whole session and catches what slipped through, then
  refreshes the semantic graph so the new notes get note-to-note edges.
  Install: bootstrap.sh copies this to ~/.claude/commands/capture.md, replacing
  {{VAULT}} with the absolute vault path.
  How to test: after a session where you discussed a decision or a fixed bug that
  did NOT get auto-captured, run /capture — expect a new well-formed note in
  {{VAULT}}/inbox/ and a graph refresh (graph.json mtime bumps).
-->

Final capture pass for this session. The vault is `{{VAULT}}`.

1. **Re-scan this whole conversation** for durable discoveries NOT already written
   to the vault's `inbox/`: architectural decisions (+ rationale), non-trivial
   bugs solved (root cause), benchmark results, reusable insights, generalizable
   patterns. Ignore trivia, routine edits, and anything already in code/git.

2. For each genuine miss, write **one atomic note** (5–15 lines) to
   `{{VAULT}}/inbox/YYYY-MM-DD-slug.md` with the mandatory frontmatter:
   ```yaml
   type: insight | decision | error | benchmark | idea
   project: <lowercase canonical name from projects/naming.md>
   date: <today>
   status: fresh
   content_potential: high | medium | low | none
   channels: []
   posted: []
   ```
   Reference entities by their canonical name from `projects/naming.md`. If a note
   was already captured this session, do not duplicate it.

3. Report what you wrote — one line per note — or say "nothing new to capture."

4. **Refresh the graph** so the new notes get linked: run one bash command,
   `kepra-index {{VAULT}}`. It is deterministic and instant (zero tokens) —
   it rebuilds note↔entity and note↔note edges by string-matching the canonical
   names in `projects/naming.md`. Do NOT dispatch the `/graphify` subagent skill
   here (that costs tokens and re-reads the whole corpus). If no notes were
   written in step 2, you can skip this.
   *(Optional, occasional: `/graphify {{VAULT}}` adds LLM `semantically_similar_to`
   edges on top — kepra-index preserves them on future rebuilds.)*
