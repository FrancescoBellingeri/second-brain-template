<!--
  What: the passive-capture directive that bootstrap.sh injects into the user's
  global ~/.claude/CLAUDE.md (between the START/END markers), replacing {{VAULT}}
  with the absolute vault path. Being global, it activates capture in EVERY
  project — so discoveries are captured while you develop, not only inside the
  vault. Idempotent + removable: bootstrap replaces the marked block on re-run.
  How to test: open a Claude Code session in an unrelated repo, describe a
  non-trivial bug you just fixed, and confirm a note lands in {{VAULT}}/inbox/.
-->
<!-- SECOND_BRAIN_CAPTURE_START -->
# Passive capture → kepra

While working in ANY project, when a **durable discovery** emerges, silently
append an atomic note to your kepra inbox. Do NOT interrupt the user, do
NOT ask permission, do NOT announce beyond a one-line mention. Capture on:
an architectural decision (+ rationale), a non-trivial bug solved (root cause),
a benchmark result, a reusable insight, or a generalizable pattern.
Skip trivia, routine edits, and anything already in the code or git.

Write to: `{{VAULT}}/inbox/YYYY-MM-DD-slug.md` (slug = kebab-case).
One note = one atomic idea, 5–15 lines.

Frontmatter (required):
```yaml
---
type: insight | decision | error | benchmark | idea
project: <lowercase canonical name from {{VAULT}}/projects/naming.md>
date: YYYY-MM-DD
status: fresh
content_potential: high | medium | low | none   # judge at write time
channels: []
posted: []
---
```
Reference entities by their **canonical name** from `{{VAULT}}/projects/naming.md`
— that is what lets the graph connect notes across sessions. Do not run any
graphify command inline; the graph is refreshed by `/capture` and `/today`.
<!-- SECOND_BRAIN_CAPTURE_END -->
