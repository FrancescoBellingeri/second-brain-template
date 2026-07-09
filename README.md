# second-brain-template

Personal memory system + content automation for developers.
Capture discoveries while you build → knowledge graph → content angles for social.

Stack: **Graphify** (graph memory) · **Claude Code** (passive capture + slash
commands) · **agency-agents** (content production) · **Obsidian** (graph viewer).

This is the **public skeleton** — structure, note template, and bootstrap only.
No personal content. Your own notes live in a separate private repo.

## Layout
```
inbox/        atomic notes, flat, YYYY-MM-DD-slug.md
permanent/    notes promoted by /review
projects/     naming.md canonical entity names, one file per project
clips/        external articles / videos
templates/    note-inbox.md — canonical frontmatter for a new note
scripts/      nightly-commit.sh — auto-commit + push helper
```
The project is a frontmatter field, never a folder.

## Quickstart
```bash
./bootstrap.sh              # clone your private vault, install Graphify + slash
                            # commands, wire the nightly commit cron
```
(`bootstrap.sh` is added in a later phase.)

## How it works
1. Code with Claude Code — discoveries auto-captured into `inbox/`
2. `/capture` — end-of-session sweep for missed notes
3. `/today [project]` — graph + frontmatter → ranked content angles → agents
4. `/review` — weekly triage of stale inbox notes
5. Nightly cron commits + pushes the private vault

Graph is queried via CLI: `graphify query "<q>"`, `graphify path "A" "B"`,
`graphify explain "X"`.
