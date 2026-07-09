---
description: Weekly triage — promote, archive, or delete inbox notes older than 7 days
---
<!--
  What: /review is the weekly gardening pass. It surfaces inbox notes that have
  sat for more than 7 days and are still `status: fresh`, and for each asks you
  to promote (→ permanent/), archive, or delete. This keeps the inbox from
  becoming a graveyard and moves durable ideas into permanent/.
  Install: bootstrap.sh copies this to ~/.claude/commands/review.md, replacing
  {{VAULT}} with the absolute vault path.
  How to test: with an inbox note dated >7 days ago and status: fresh, run
  /review — it should surface that note and, on your choice, move it to
  permanent/ (promote) or set status archived, or delete it.
-->

Weekly review of the vault `{{VAULT}}`.

## 1. Select stale notes
List `{{VAULT}}/inbox/*.md` and read each frontmatter. A note is **stale** if
`status == fresh` AND its `date` is more than 7 days before today. Report the
count. If none are stale, say so and stop.

## 2. Triage (oldest first, a few at a time)
For each stale note, show: filename · `type`/`project` · `content_potential` ·
`date`, then its body. Ask which action:

- **promote** — durable and reusable, worth keeping. Move the file to
  `{{VAULT}}/permanent/` and set `status: promoted`. If it reads too
  project-specific, offer to **generalize** it (keep the reusable principle, drop
  the specifics) — show the rewrite and confirm before saving.
- **archive** — no longer useful but keep for the record. Set `status: archived`
  (leave it in `inbox/`; it is excluded from `/today` automatically).
- **delete** — noise. Remove the file.

Apply exactly the chosen action. Never promote, rewrite, or delete without the
user's explicit word.

## 3. Finish
After the actions, refresh the graph: `/graphify {{VAULT}} --update`.
Summarize: N promoted · M archived · K deleted · P stale notes still pending.
