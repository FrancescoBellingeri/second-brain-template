---
description: Turn recent captures into 3–5 ranked content angles, then hand the chosen one to an agency-agents agent
argument-hint: [project]
---
<!--
  What: /today reads your kepra vault and proposes content angles for social.
  It keeps two sources separate: the Graphify graph for RELATIONS (neighbors,
  clusters) and the raw note frontmatter for EDITORIAL metadata (date,
  content_potential, posted, channels). The mechanical filtering + scoring is
  done by the `today-candidates` helper; this command's job is to REFRESH the
  graph, then PHRASE the angles and hand the chosen one to an agent.
  Install: bootstrap.sh copies this to ~/.claude/commands/today.md (replacing
  {{VAULT}}) and installs scripts/today-candidates.py to ~/.local/bin/today-candidates.
  How to test: with fresh notes in inbox/, run /today and /today <project>;
  expect 3–5 ranked angles, notes with content_potential:none or non-empty
  posted[] excluded, and the project arg filtering by frontmatter `project`.
-->

Generate today's content angles from your kepra vault.
Vault = `{{VAULT}}`.
Optional argument `$1` = project filter (e.g. `/today mango`).

## Phase 1 — Refresh the graph (relations)
Run `kepra-index {{VAULT}}` — deterministic, instant, zero tokens. It rebuilds the
note↔entity / note↔note graph from `projects/naming.md` so connectivity is current.
(Do NOT dispatch the `/graphify` subagent skill here.)

## Phase 2 — Get ranked candidates (deterministic)
Run:
```
today-candidates {{VAULT}} $1
```
It reads inbox frontmatter (editorial metadata) **and** `graphify-out/graph.json`
(connectivity), then prints JSON:
- `candidates` — sorted by `score` (= recency × potential × (1 + graph degree)),
  each with `degree`, `neighbors` (connected entities), `community`, `channels`,
  and `suggested_agent`.
- `skipped` — with `skipped_reason` (out-of-window / content_potential:none /
  already-posted / project!=…).

Report the counts ("N candidates, M skipped") and briefly why the skipped ones
were dropped.

## Phase 3 — Phrase 3–5 angles
From the top candidates, write **at most 3–5 angles**, highest score first. Merge
candidates that share a `community` / overlapping `neighbors` into ONE angle when
they tell a single story. Each angle:

- **Title** — the angle of the post, not the note filename
- **Hook** — one line that would stop the scroll
- **Source notes** — the inbox filename(s)
- **Channel** — the note's `channels[]` if set, else inferred
- **Agent** — the candidate's `suggested_agent`. Routing reference:

  | note type / nature               | agent                    |
  |----------------------------------|--------------------------|
  | benchmark / result               | LinkedIn Content Creator |
  | error / bug / TIL                | Twitter Engager          |
  | decision / technical debate      | Reddit Community Builder |
  | docs / explainer / reference     | AI Citation Strategist   |
  | insight / idea / story (default) | Content Creator          |

- **Why here** — one line (recency / potential / connections)

## Phase 4 — Stop and ask
Present the ranked angles and **STOP**. Ask: *"Which angle should I draft?
(number, or none)"*. Do not draft anything yet.

On the user's choice (agent handoff):
1. Invoke the chosen angle's `suggested_agent` with the Agent tool, passing the
   angle (title + hook + channel) **and the full text of every source note**.
2. When the user approves the draft as published, append `<channel>-<today>` to
   that source note's `posted[]` and set `status: promoted`, so it is not
   re-suggested tomorrow.
