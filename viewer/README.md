# kepra graph viewer (maintainer-only)

React + `react-force-graph-2d` viewer for `graphify-out/graph.json`, adapted
from a prior project's design system. This directory is **never** touched by
`bootstrap.sh` or `scripts/kepra-index.py`, and end users never need Node to
install/use kepra — only the maintainer needs it, to (re)build the single
static HTML file that actually ships.

## Rebuild the shipped template

```bash
npm install
npm run build
cp dist/index.html ../assets/graph-viewer.template.html
```

Commit the updated `assets/graph-viewer.template.html`. `dist/index.html` is
a single self-contained file (JS + CSS inlined via `vite-plugin-singlefile`,
zero external network requests — it must open correctly via `file://`).

## How data gets in

`index.html` has a placeholder:

```html
<script type="application/json" id="kepra-graph-data">__KEPRA_GRAPH_DATA__</script>
```

`kepra-index.py`'s `render_graph_html()` substitutes that placeholder with the
freshly written `graph.json` text (escaped so note content can never break out
of the tag) to produce `graphify-out/graph.html`. `src/main.tsx` reads it
synchronously at load — no `fetch`, no loading state.

## Local dev

`npm run dev` serves the unbuilt app — `#kepra-graph-data` will still contain
the literal placeholder string, so the app shows its "no graph data" empty
state. To develop against real data, either paste a `graph.json`'s contents
into `index.html` in place of the placeholder temporarily (don't commit that),
or build once and test the injected output directly (see the repo root's
implementation plan / verification steps).
