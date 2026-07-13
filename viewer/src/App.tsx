import { useCallback, useEffect, useMemo, useState } from 'react'
import { GraphView } from './components/GraphView'
import { useTheme } from './theme'
import type { GraphData, GraphNode } from './types'
import { ALL_FILE_TYPES, FILE_TYPE_LABELS, getNodeColors } from './constants'

interface Props {
  graph: GraphData | null
  parseError: string | null
}

export default function App({ graph, parseError }: Props) {
  const { resolved: theme } = useTheme()
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [focusIds, setFocusIds] = useState<Set<string>>(new Set())
  const [highlightIds, setHighlightIds] = useState<Set<string>>(new Set())

  const clearFocus = useCallback(() => {
    setSelectedNode(null)
    setFocusIds(new Set())
    setHighlightIds(new Set())
  }, [])

  const handleSelectNode = useCallback((node: GraphNode | null) => {
    setSelectedNode(node)
    setFocusIds(node ? new Set([node.id]) : new Set())
    setHighlightIds(node ? new Set([node.id]) : new Set())
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) clearFocus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [clearFocus])

  const nodeColors = useMemo(() => getNodeColors(theme), [theme])

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const n of graph?.nodes ?? []) counts.set(n.file_type, (counts.get(n.file_type) ?? 0) + 1)
    return counts
  }, [graph])

  if (parseError || !graph) {
    return (
      <div className="empty-state">
        <h1>kepra · graph</h1>
        <p>{parseError ?? 'No graph data found.'}</p>
      </div>
    )
  }

  if (graph.nodes.length === 0) {
    return (
      <div className="empty-state">
        <h1>kepra · graph</h1>
        <p>Your vault doesn't have any notes yet.</p>
        <p className="hint">Capture a note — the graph fills in on its own.</p>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>
          kepra <span className="dim">· graph</span>
        </h1>
        <div className="legend">
          {ALL_FILE_TYPES.map((t) => (
            <span key={t} className="legend-item">
              <span className="legend-dot" style={{ background: nodeColors[t] }} />
              {FILE_TYPE_LABELS[t]}
              <span className="legend-count">{typeCounts.get(t) ?? 0}</span>
            </span>
          ))}
        </div>
      </header>
      <GraphView
        graph={graph}
        focusIds={focusIds}
        highlightIds={highlightIds}
        selectedNode={selectedNode}
        onSelectNode={handleSelectNode}
        onClearFocus={clearFocus}
        theme={theme}
      />
    </div>
  )
}
