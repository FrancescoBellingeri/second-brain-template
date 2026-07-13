export type FileType = 'code' | 'document' | 'paper' | 'image' | 'rationale' | 'concept'

export type Confidence = 'EXTRACTED' | 'INFERRED' | 'AMBIGUOUS'

// Mirrors graphify.export.to_json's on-disk shape (graphify-out/graph.json).
// See kepra-setup/scripts/kepra-index.py and graphify/export.py — nodes
// always carry id/label/file_type/source_file/community; source_location and
// norm_label are optional/not relied on here.
export interface GraphNode {
  id: string
  label: string
  file_type: FileType
  source_file: string
  community: number
  source_location?: string | null
}

export interface GraphEdge {
  source: string
  target: string
  relation: string
  confidence: Confidence
  confidence_score: number
  source_file?: string | null
  weight?: number
}

export interface GraphData {
  nodes: GraphNode[]
  links: GraphEdge[]
}

// Visualization-layer node/link: plain data shapes computed once by
// filterGraph, not live react-force-graph internal objects. x/y are mutated
// in place by the force engine at runtime, not set by filterGraph itself.
export interface VizNode extends GraphNode {
  color?: string
  val?: number
  degree: number
  x?: number
  y?: number
}

export interface VizLink {
  source: string
  target: string
  relation: string
}
