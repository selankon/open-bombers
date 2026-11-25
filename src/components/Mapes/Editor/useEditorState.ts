import { useCallback, useMemo, useReducer } from 'react'
import { MAPA } from '~utils/constants'
import { MapaNode } from '../types'

type Fn = (nodes: MapaNode[]) => MapaNode[]

interface History {
  past: MapaNode[][]
  present: MapaNode[]
  future: MapaNode[][]
}

type Action =
  | { type: 'apply'; fn: Fn }
  | { type: 'patch'; fn: Fn }
  | { type: 'checkpoint' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'drop' }

const push = (past: MapaNode[][], nodes: MapaNode[]) => [...past.slice(-(MAPA.HISTORY_LIMIT - 1)), nodes]

const reducer = (state: History, action: Action): History => {
  switch (action.type) {
    case 'apply': {
      const next = action.fn(state.present)
      if (next === state.present) return state
      return { past: push(state.past, state.present), present: next, future: [] }
    }
    case 'patch': {
      const next = action.fn(state.present)
      return next === state.present ? state : { ...state, present: next }
    }
    case 'checkpoint':
      return { past: push(state.past, state.present), present: state.present, future: [] }
    case 'undo': {
      if (!state.past.length) return state
      return {
        past: state.past.slice(0, -1),
        present: state.past[state.past.length - 1],
        future: [state.present, ...state.future],
      }
    }
    case 'redo': {
      if (!state.future.length) return state
      return { past: push(state.past, state.present), present: state.future[0], future: state.future.slice(1) }
    }
    // Forgets the last step completely (e.g. a new node left empty)
    case 'drop': {
      if (!state.past.length) return state
      return { past: state.past.slice(0, -1), present: state.past[state.past.length - 1], future: state.future }
    }
  }
}

/**
 * Nodes being edited, with undo / redo.
 * - `apply`: a change that is one undo step
 * - `checkpoint` + `patch`: a continuous change (dragging) that becomes a single step
 */
export const useEditorState = (initial: MapaNode[]) => {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({ past: [], present: initial, future: [] }))

  const apply = useCallback((fn: Fn) => dispatch({ type: 'apply', fn }), [])
  const patch = useCallback((fn: Fn) => dispatch({ type: 'patch', fn }), [])
  const checkpoint = useCallback(() => dispatch({ type: 'checkpoint' }), [])
  const undo = useCallback(() => dispatch({ type: 'undo' }), [])
  const redo = useCallback(() => dispatch({ type: 'redo' }), [])
  const drop = useCallback(() => dispatch({ type: 'drop' }), [])

  return useMemo(
    () => ({
      nodes: state.present,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
      apply,
      patch,
      checkpoint,
      undo,
      redo,
      drop,
    }),
    [state, apply, patch, checkpoint, undo, redo, drop]
  )
}
