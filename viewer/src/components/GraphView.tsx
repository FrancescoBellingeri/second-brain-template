import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph2D, { type ForceGraphMethods } from 'react-force-graph-2d'
import type { FileType, GraphData, GraphNode, VizNode } from '../types'
import type { Theme } from '../constants'
import { ALL_FILE_TYPES, FILE_TYPE_LABELS, getGraphColors, getNodeColors } from '../constants'
import { computeDegree, filterGraph } from '../utils/graphFilter'
import { AlertIcon, CloseIcon, FitIcon, RefreshIcon, SearchIcon } from './icons'

interface Props {
  graph: GraphData
  focusIds: Set<string>
  highlightIds: Set<string>
  selectedNode: GraphNode | null
  onSelectNode: (node: GraphNode | null) => void
  onClearFocus: () => void
  theme: Theme
}

export function GraphView({
  graph,
  focusIds,
  highlightIds,
  selectedNode,
  onSelectNode,
  onClearFocus,
  theme,
}: Props) {
  const fgRef = useRef<ForceGraphMethods | undefined>(undefined)
  const wrapRef = useRef<HTMLDivElement>(null)
  const didFitRef = useRef(false)
  const [search, setSearch] = useState('')
  const [searchMiss, setSearchMiss] = useState<string | null>(null)
  const [dims, setDims] = useState({ w: 0, h: 0 })
  const [hoverId, setHoverId] = useState<string | null>(null)

  const nodeColors = useMemo(() => getNodeColors(theme), [theme])
  const gc = useMemo(() => getGraphColors(theme), [theme])
  const degree = useMemo(() => computeDegree(graph.nodes, graph.links), [graph.nodes, graph.links])
  const nodeById = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph.nodes])
  const allTypes = useMemo(() => new Set<FileType>(ALL_FILE_TYPES), [])

  const vizData = useMemo(
    () =>
      filterGraph(graph.nodes, graph.links, allTypes, focusIds, highlightIds, degree, {
        nodeColors,
        highlight: gc.highlight,
        focus: gc.focus,
      }),
    [graph, allTypes, focusIds, highlightIds, degree, nodeColors, gc],
  )

  const nodeCount = vizData.nodes.length
  const focused = focusIds.size > 0 || highlightIds.size > 0

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setDims({ w: el.clientWidth, h: el.clientHeight })
    })
    ro.observe(el)
    setDims({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  const fitView = useCallback(() => fgRef.current?.zoomToFit(500, 90), [])

  useEffect(() => {
    if (focused) {
      const t = window.setTimeout(fitView, 340)
      return () => window.clearTimeout(t)
    }
  }, [focusIds, highlightIds, vizData, focused, fitView])

  const handleSearch = useCallback(() => {
    if (!search.trim()) return
    const q = search.trim().toLowerCase()
    const match =
      graph.nodes.find((n) => n.id.toLowerCase() === q) ??
      graph.nodes.find(
        (n) => n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q),
      )
    if (match) {
      setSearchMiss(null)
      onSelectNode(match)
    } else {
      setSearchMiss(search.trim())
    }
  }, [graph.nodes, search, onSelectNode])

  const paintNode = useCallback(
    (node: object, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const n = node as VizNode
      const x = n.x ?? 0
      const y = n.y ?? 0
      const isHi = highlightIds.has(n.id)
      const isFocus = focusIds.has(n.id)
      const isHover = hoverId === n.id
      const base = nodeColors[n.file_type]
      const r = 4 + Math.sqrt(Math.max(n.val ?? 1, 0.5)) * 3

      ctx.save()
      ctx.shadowColor = isHi ? gc.highlight : base
      ctx.shadowBlur = ((isHi || isHover ? 18 : 8) * gc.glow) / Math.max(globalScale, 0.6)
      ctx.beginPath()
      ctx.arc(x, y, r, 0, 2 * Math.PI)
      ctx.fillStyle = n.color ?? base
      ctx.fill()
      ctx.restore()

      if (isHi || isFocus || isHover) {
        ctx.beginPath()
        ctx.arc(x, y, r + 2.5 / globalScale, 0, 2 * Math.PI)
        ctx.lineWidth = 1.5 / globalScale
        ctx.strokeStyle = isFocus ? gc.focus : isHi ? gc.highlight : gc.ringHover
        ctx.stroke()
      }

      const showLabel = isHi || isFocus || isHover || globalScale > 1.4
      if (showLabel) {
        const fontSize = Math.min(12, 11 / globalScale + 1)
        ctx.font = `500 ${fontSize}px ui-sans-serif, system-ui, sans-serif`
        ctx.fillStyle = isHi || isFocus ? gc.labelHi : gc.label
        ctx.textBaseline = 'middle'
        const raw = n.label || n.id
        const full = isHi || isFocus || isHover
        const text = full || raw.length <= 22 ? raw : `${raw.slice(0, 21).trimEnd()}…`
        ctx.fillText(text, x + r + 4 / globalScale, y)
      }
    },
    [highlightIds, focusIds, hoverId, nodeColors, gc],
  )

  const a11yNodes = useMemo(
    () => [...vizData.nodes].sort((a, b) => (b.val ?? 0) - (a.val ?? 0)),
    [vizData.nodes],
  )

  const neighborIds = useMemo(() => {
    if (!selectedNode) return []
    const ids = new Set<string>()
    for (const e of graph.links) {
      if (e.source === selectedNode.id) ids.add(e.target)
      else if (e.target === selectedNode.id) ids.add(e.source)
    }
    return [...ids]
  }, [selectedNode, graph.links])

  return (
    <section className="panel-graph" role="main" aria-label="Knowledge graph">
      <nav className="sr-only sr-only-focusable" aria-label="Knowledge graph entities">
        <h2>Knowledge graph entities</h2>
        <p>
          {nodeCount.toLocaleString()} {nodeCount === 1 ? 'entity' : 'entities'}{' '}
          {focused ? 'in the focused neighborhood' : 'shown'}. Select one to inspect it and
          focus it in the graph.
        </p>
        <ul>
          {a11yNodes.map((n) => (
            <li key={n.id}>
              <button type="button" onClick={() => onSelectNode(n as GraphNode)}>
                {n.label} — {FILE_TYPE_LABELS[n.file_type]} ({n.id})
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sr-only" role="status" aria-live="polite">
        {selectedNode
          ? `Selected ${selectedNode.label}, ${FILE_TYPE_LABELS[selectedNode.file_type]}, ${selectedNode.id}.`
          : ''}
      </div>

      <div className="graph-canvas-wrap" ref={wrapRef}>
        {dims.w > 0 && (
          <ForceGraph2D
            ref={fgRef}
            width={dims.w}
            height={dims.h}
            graphData={vizData as unknown as { nodes: object[]; links: object[] }}
            nodeId="id"
            nodeRelSize={5}
            nodeLabel={(n) => (n as VizNode).label}
            linkColor={(l) => {
              const link = l as { source: string | { id: string }; target: string | { id: string } }
              const s = typeof link.source === 'object' ? link.source.id : link.source
              const t = typeof link.target === 'object' ? link.target.id : link.target
              return (s && highlightIds.has(s)) || (t && highlightIds.has(t)) ? gc.linkHi : gc.linkBase
            }}
            linkWidth={(l) => {
              const link = l as { source: string | { id: string }; target: string | { id: string } }
              const s = typeof link.source === 'object' ? link.source.id : link.source
              const t = typeof link.target === 'object' ? link.target.id : link.target
              return (s && highlightIds.has(s)) || (t && highlightIds.has(t)) ? 1.6 : 0.8
            }}
            linkDirectionalParticles={focused ? 2 : 0}
            linkDirectionalParticleWidth={1.8}
            linkDirectionalParticleColor={() => gc.particle}
            nodeCanvasObject={paintNode}
            nodePointerAreaPaint={(node, color, ctx) => {
              const n = node as VizNode
              const r = 6 + Math.sqrt(Math.max(n.val ?? 1, 0.5)) * 3
              ctx.beginPath()
              ctx.arc(n.x ?? 0, n.y ?? 0, r, 0, 2 * Math.PI)
              ctx.fillStyle = color
              ctx.fill()
            }}
            onNodeClick={(n) => onSelectNode(n as GraphNode)}
            onNodeHover={(n) => setHoverId(n ? (n as VizNode).id : null)}
            onBackgroundClick={() => onSelectNode(null)}
            onEngineStop={() => {
              if (!didFitRef.current) {
                didFitRef.current = true
                fitView()
              }
            }}
            backgroundColor="rgba(0,0,0,0)"
            warmupTicks={80}
            cooldownTicks={70}
          />
        )}

        <div className="graph-toolbar">
          <div className="graph-search-wrap">
            <SearchIcon size={15} />
            <input
              className="graph-search"
              aria-label="Find a note or entity in the graph"
              placeholder="Find a note or entity…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                if (searchMiss) setSearchMiss(null)
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          {focused && (
            <button type="button" className="tool-btn accent" onClick={onClearFocus}>
              <CloseIcon size={14} />
              Clear focus
            </button>
          )}
          <button type="button" className="tool-btn" onClick={fitView} title="Fit view">
            <FitIcon size={14} />
            Fit
          </button>
          <button
            type="button"
            className="tool-btn"
            onClick={() => window.location.reload()}
            title="Reload — this file doesn't auto-refresh; re-open it after new notes are captured"
          >
            <RefreshIcon size={13} />
          </button>
          <span className="tool-count">
            {nodeCount.toLocaleString()} {focused ? 'in focus' : 'nodes'}
          </span>
        </div>

        {searchMiss && (
          <div className="search-miss" role="status">
            <AlertIcon size={14} />
            No match for <span className="mono">&ldquo;{searchMiss}&rdquo;</span>
          </div>
        )}

        {selectedNode && (
          <div className="inspector">
            <div className="inspector-top">
              <span className="type-tag">
                <span className="dot" style={{ background: nodeColors[selectedNode.file_type] }} />
                {FILE_TYPE_LABELS[selectedNode.file_type]}
              </span>
              <span className="inspector-id">{selectedNode.id}</span>
              <button
                type="button"
                className="inspector-close"
                onClick={() => onSelectNode(null)}
                aria-label="Close inspector"
              >
                <CloseIcon size={14} />
              </button>
            </div>
            <p className="inspector-label">{selectedNode.label}</p>
            <div className="inspector-meta">
              <span>{degree.get(selectedNode.id) ?? 0} connections</span>
              <span>Community {selectedNode.community}</span>
            </div>
            <p className="inspector-source" title={selectedNode.source_file}>
              {selectedNode.source_file}
            </p>
            {neighborIds.length > 0 && (
              <>
                <div className="inspector-section-label">Neighbors ({neighborIds.length})</div>
                <div className="inspector-neighbors">
                  {neighborIds.map((nid) => {
                    const nb = nodeById.get(nid)
                    if (!nb) return null
                    return (
                      <button
                        key={nid}
                        type="button"
                        className="neighbor-link"
                        style={{ borderLeftColor: nodeColors[nb.file_type] }}
                        onClick={() => onSelectNode(nb)}
                      >
                        {nb.label}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
