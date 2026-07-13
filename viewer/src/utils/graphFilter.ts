import type { FileType, GraphEdge, GraphNode, VizLink, VizNode } from '../types'

interface NodePalette {
  nodeColors: Record<FileType, string>
  highlight: string
  focus: string
}

function buildAdjacency(edges: GraphEdge[]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>()
  const link = (a: string, b: string) => {
    if (!adj.has(a)) adj.set(a, new Set())
    adj.get(a)!.add(b)
  }
  for (const e of edges) {
    link(e.source, e.target)
    link(e.target, e.source)
  }
  return adj
}

function neighborhood(rootId: string, edges: GraphEdge[], hops: number): Set<string> {
  const adj = buildAdjacency(edges)
  const seen = new Set<string>([rootId])
  let frontier = [rootId]
  for (let h = 0; h < hops; h++) {
    const next: string[] = []
    for (const id of frontier) {
      for (const n of adj.get(id) ?? []) {
        if (!seen.has(n)) {
          seen.add(n)
          next.push(n)
        }
      }
    }
    frontier = next
  }
  return seen
}

// degree is never persisted in graph.json (graphify only computes it
// in-memory for its own HTML export) — derive it once from links.
export function computeDegree(nodes: GraphNode[], edges: GraphEdge[]): Map<string, number> {
  const deg = new Map<string, number>(nodes.map((n) => [n.id, 0]))
  for (const e of edges) {
    deg.set(e.source, (deg.get(e.source) ?? 0) + 1)
    deg.set(e.target, (deg.get(e.target) ?? 0) + 1)
  }
  return deg
}

export function filterGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
  visibleTypes: Set<FileType>,
  focusIds: Set<string>,
  highlightIds: Set<string>,
  degree: Map<string, number>,
  palette: NodePalette,
): { nodes: VizNode[]; links: VizLink[] } {
  const nodeById = new Map(nodes.map((n) => [n.id, n]))
  let allowedIds: Set<string>

  if (focusIds.size > 0) {
    allowedIds = new Set<string>()
    for (const fid of focusIds) {
      if (nodeById.has(fid)) {
        for (const id of neighborhood(fid, edges, 2)) allowedIds.add(id)
      }
    }
    for (const hid of highlightIds) {
      if (nodeById.has(hid)) {
        for (const id of neighborhood(hid, edges, 1)) allowedIds.add(id)
      }
    }
  } else {
    allowedIds = new Set(
      nodes.filter((n) => visibleTypes.has(n.file_type)).map((n) => n.id),
    )
  }

  const filteredEdges = edges.filter(
    (e) => allowedIds.has(e.source) && allowedIds.has(e.target),
  )

  const vizNodes: VizNode[] = [...allowedIds]
    .map((id) => nodeById.get(id))
    .filter((n): n is GraphNode => Boolean(n))
    .map((n) => ({
      ...n,
      degree: degree.get(n.id) ?? 0,
      color: highlightIds.has(n.id)
        ? palette.highlight
        : focusIds.has(n.id)
          ? palette.focus
          : palette.nodeColors[n.file_type],
      val: highlightIds.has(n.id) ? 3 : focusIds.has(n.id) ? 2.5 : 1,
    }))

  const links: VizLink[] = filteredEdges.map((e) => ({
    source: e.source,
    target: e.target,
    relation: e.relation,
  }))

  return { nodes: vizNodes, links }
}
