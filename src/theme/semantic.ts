/**
 * Semantic color tokens (light / dark). Feature code uses these names, never raw hex values.
 */
export const semanticColors = {
  surface: { default: 'white', _dark: '#151C2C' },
  surfaceMuted: { default: 'slate.50', _dark: '#10172A' },
  surfaceGlass: { default: 'rgba(255,255,255,0.72)', _dark: 'rgba(17,24,39,0.68)' },
  pageBg: { default: '#F7F6F4', _dark: '#0B1120' },
  border: { default: 'slate.200', _dark: 'whiteAlpha.200' },
  textPrimary: { default: 'slate.900', _dark: 'slate.100' },
  textMuted: { default: 'slate.500', _dark: 'slate.400' },
  accent: { default: 'primary.600', _dark: 'primary.300' },
  lightText: { default: 'slate.600', _dark: 'slate.400' },
  lighterText: { default: 'slate.500', _dark: 'slate.500' },

  // Table: tema cells and groups
  temaCode: { default: 'primary.600', _dark: 'primary.700' },
  temaName: { default: 'primary.100', _dark: '#3A2116' },
  temaNameText: { default: 'slate.900', _dark: 'primary.100' },
  groupHead: { default: 'primary.600', _dark: 'primary.700' },
  groupInfo: { default: 'slate.400', _dark: 'slate.600' },
  rowHover: { default: 'rgba(15,23,42,0.035)', _dark: 'rgba(255,255,255,0.04)' },

  // Subgroups: header / column header / cell tint
  'sg.info.head': { default: 'slate.200', _dark: 'slate.700' },
  'sg.info.col': { default: 'slate.100', _dark: '#1A2335' },
  'sg.info.cell': { default: 'white', _dark: '#131A29' },
  'sg.imprescindibles.head': { default: '#F8C544', _dark: '#7A5D12' },
  'sg.imprescindibles.col': { default: '#FEF7DC', _dark: '#2E2716' },
  'sg.imprescindibles.cell': { default: '#FEFBF2', _dark: '#1B1A17' },
  'sg.tasques2.head': { default: '#95CBCA', _dark: '#2F5F5E' },
  'sg.tasques2.col': { default: '#DCF2F1', _dark: '#172B2C' },
  'sg.tasques2.cell': { default: '#F0F9F8', _dark: '#121F21' },
  'sg.tasques3.head': { default: '#E89DA2', _dark: '#6E3A3E' },
  'sg.tasques3.col': { default: '#FDE4E6', _dark: '#2E1D20' },
  'sg.tasques3.cell': { default: '#FEF3F5', _dark: '#1E1518' },
  'sg.repassos.head': { default: '#E2DCD6', _dark: '#4A4340' },
  'sg.repassos.col': { default: '#F4F1EE', _dark: '#25211F' },
  'sg.repassos.cell': { default: '#FAF9F7', _dark: '#1A1817' },

  // Levels: background / text / border
  'na.bg': { default: '#ECFDF5', _dark: 'rgba(16,185,129,0.16)' },
  'na.fg': { default: '#047857', _dark: '#6EE7B7' },
  'na.border': { default: '#10B981', _dark: '#10B981' },
  'nm.bg': { default: '#FFFBEB', _dark: 'rgba(245,158,11,0.16)' },
  'nm.fg': { default: '#B45309', _dark: '#FCD34D' },
  'nm.border': { default: '#F59E0B', _dark: '#F59E0B' },
  'nb.bg': { default: '#FEF2F2', _dark: 'rgba(239,68,68,0.16)' },
  'nb.fg': { default: '#B91C1C', _dark: '#FCA5A5' },
  'nb.border': { default: '#EF4444', _dark: '#EF4444' },

  // Scores (purple)
  'score.fg': { default: '#6D28D9', _dark: '#C4B5FD' },
  'score.focus': { default: '#7C3AED', _dark: '#A78BFA' },
  'score.fill': { default: '#F5F3FF', _dark: 'rgba(124,58,237,0.18)' },

  // Calendar session kinds
  'kind.d1': { default: '#3B82F6', _dark: '#60A5FA' },
  'kind.d1.bg': { default: '#EFF6FF', _dark: 'rgba(59,130,246,0.18)' },
  'kind.setmanal': { default: '#2F8F8D', _dark: '#95CBCA' },
  'kind.setmanal.bg': { default: '#E3F3F2', _dark: 'rgba(149,203,202,0.16)' },
  'kind.mensual': { default: '#C0567E', _dark: '#E89DA2' },
  'kind.mensual.bg': { default: '#FDE8EC', _dark: 'rgba(232,157,162,0.16)' },
  'kind.estudi': { default: 'primary.600', _dark: 'primary.300' },
  'kind.estudi.bg': { default: 'primary.50', _dark: 'rgba(229,83,26,0.18)' },

  // Mind maps: canvas, dot grid and branch colors (line / node tint)
  'mapa.canvas': { default: '#F7F6F4', _dark: '#0B1120' },
  'mapa.grid': { default: 'rgba(15,23,42,0.10)', _dark: 'rgba(255,255,255,0.08)' },
  'mapa.primari': { default: 'primary.500', _dark: 'primary.300' },
  'mapa.primari.bg': { default: 'primary.50', _dark: 'rgba(255,255,255,0.06)' },
  'mapa.blau': { default: '#3B82F6', _dark: '#60A5FA' },
  'mapa.blau.bg': { default: '#EFF6FF', _dark: 'rgba(59,130,246,0.16)' },
  'mapa.verd': { default: '#10B981', _dark: '#34D399' },
  'mapa.verd.bg': { default: '#ECFDF5', _dark: 'rgba(16,185,129,0.16)' },
  'mapa.groc': { default: '#D97706', _dark: '#FBBF24' },
  'mapa.groc.bg': { default: '#FFFBEB', _dark: 'rgba(245,158,11,0.16)' },
  'mapa.vermell': { default: '#E11D48', _dark: '#FB7185' },
  'mapa.vermell.bg': { default: '#FFF1F2', _dark: 'rgba(225,29,72,0.16)' },
  'mapa.lila': { default: '#7C3AED', _dark: '#A78BFA' },
  'mapa.lila.bg': { default: '#F5F3FF', _dark: 'rgba(124,58,237,0.18)' },
}
