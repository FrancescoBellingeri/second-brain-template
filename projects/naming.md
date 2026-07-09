<!--
  What: the canonical-name registry. Notes must spell projects, entities, types,
  and tags EXACTLY as listed here — that consistency is what lets Graphify build
  correct note-to-note edges (two notes naming an entity the same way link;
  different spellings do not). Code symbols keep their source casing; project,
  type, and tags are lowercase / kebab-case.
  How to test: write two notes that both reference the same entity, run
  `/graphify <vault> --update`, then `graphify explain "<entity>"` — both notes
  should show up as connections.
  Setup: replace the example project below with your own. One section per project.
-->

# Canonical names

## Projects (frontmatter `project`, lowercase)
- `example` — one-line description of the project
- `general` — cross-cutting / not project-specific
<!-- add one bullet per project you capture for -->

---

## example — canonical entities
<!-- List the exact names of the classes, services, concepts, and metrics you
     want linked across notes. Keep source casing for code symbols. -->
- **Core:** `MainClass`, `SomeService`
- **Concepts:** Some Concept, Another Pattern
- **Metrics:** YourBenchmark

---

## Canonical taxonomy
- `type`: insight | decision | error | benchmark | idea
- `status`: fresh | promoted | archived
- `content_potential`: high | medium | low | none
- `channels`: linkedin | twitter | reddit  *(add as needed)*

## Canonical tech tags (kebab-case)
<!-- your stack, e.g.: python, fastapi, postgresql, redis, react, ... -->

## Rules
- `project` and `type` always lowercase; tech tags kebab-case.
- Code symbols keep source casing exactly (`MainClass`, not `main_class`).
- No spelling variants — pick one spelling per entity and stick to it.
- Filename slug: kebab-case nominal phrase (e.g. `cache-invalidation-race`).
