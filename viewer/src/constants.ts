import type { FileType } from './types'

export type Theme = 'light' | 'dark'

// Categorical palette validated with the dataviz skill's validate_palette.js
// (fixed hue order, both light and dark PASS overall; the two WARN slots —
// aqua/document, yellow/concept — sit in the floor band and are mitigated by
// the direct labels this viewer always shows: node labels, legend text, and
// the inspector panel — never color alone).
export const NODE_COLORS: Record<FileType, string> = {
  code: '#3987e5',
  document: '#199e70',
  concept: '#c98500',
  paper: '#008300',
  rationale: '#9085e9',
  image: '#e66767',
}

const NODE_COLORS_LIGHT: Record<FileType, string> = {
  code: '#2a78d6',
  document: '#1baf7a',
  concept: '#eda100',
  paper: '#008300',
  rationale: '#4a3aa7',
  image: '#e34948',
}

export function getNodeColors(theme: Theme): Record<FileType, string> {
  return theme === 'light' ? NODE_COLORS_LIGHT : NODE_COLORS
}

// Unused categorical slots (magenta/orange) repurposed as accent colors, so
// highlight/focus never collide visually with a node-type color.
const HIGHLIGHT_LIGHT = '#eb6834'
const HIGHLIGHT_DARK = '#d95926'

export interface GraphColors {
  highlight: string
  focus: string
  linkBase: string
  linkHi: string
  particle: string
  label: string
  labelHi: string
  ringHover: string
  glow: number
}

const GRAPH_COLORS: Record<Theme, GraphColors> = {
  dark: {
    highlight: HIGHLIGHT_DARK,
    focus: '#ffffff',
    linkBase: 'rgba(195, 194, 183, 0.16)',
    linkHi: 'rgba(217, 89, 38, 0.55)',
    particle: 'rgba(217, 89, 38, 0.8)',
    label: 'rgba(255, 255, 255, 0.72)',
    labelHi: 'rgba(255, 255, 255, 0.96)',
    ringHover: 'rgba(255, 255, 255, 0.4)',
    glow: 1,
  },
  light: {
    highlight: HIGHLIGHT_LIGHT,
    focus: '#0b0b0b',
    linkBase: 'rgba(82, 81, 78, 0.22)',
    linkHi: 'rgba(235, 104, 52, 0.55)',
    particle: 'rgba(235, 104, 52, 0.9)',
    label: 'rgba(11, 11, 11, 0.82)',
    labelHi: 'rgba(11, 11, 11, 0.98)',
    ringHover: 'rgba(11, 11, 11, 0.45)',
    glow: 0.35,
  },
}

export function getGraphColors(theme: Theme): GraphColors {
  return GRAPH_COLORS[theme]
}

export const FILE_TYPE_LABELS: Record<FileType, string> = {
  code: 'Code',
  document: 'Notes',
  concept: 'Entities',
  paper: 'Papers',
  rationale: 'Rationale',
  image: 'Images',
}

export const ALL_FILE_TYPES: FileType[] = [
  'document',
  'concept',
  'code',
  'paper',
  'rationale',
  'image',
]
