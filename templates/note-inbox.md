<!--
  What: canonical frontmatter for one atomic inbox note.
  Filename: YYYY-MM-DD-slug.md   (slug = kebab-case nominal phrase).
  One note = one atomic idea, 5-15 lines. Reference entities ALWAYS by the
  canonical name defined in projects/naming.md — that is what lets Graphify
  build useful edges between notes.
  How to test: copy into inbox/, fill the fields, run `graphify update .`,
  then confirm the note shows up as a node in graphify-out/graph.json.
-->
---
type: insight            # insight | decision | error | benchmark | idea
project: PROJECT         # canonical value from projects/naming.md
date: YYYY-MM-DD         # capture date
status: fresh            # fresh → promoted | archived
content_potential: medium   # high | medium | low | none
channels: []             # optional, e.g. [linkedin, twitter]
posted: []               # e.g. [linkedin-2026-07-10]
---

<!-- Body: one atomic idea, 5-15 lines. Entities by canonical name. -->
