import { useCallback, useMemo, useReducer } from 'react'
import { MAPA } from '~utils/constants'

type Fn<T> = (content: T) => T

interface History<T> {
  past: T[]
  present: T
  future: T[]
}

type Action<T> =
  | { type: 'apply'; fn: Fn<T> }
  | { type: 'patch'; fn: Fn<T> }
  | { type: 'checkpoint' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'drop' }

const push = <T>(past: T[], content: T) => [...past.slice(-(MAPA.HISTORY_LIMIT - 1)), content]

const reducer = <T>(state: History<T>, action: Action<T>): History<T> => {
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
 * Content being edited (ideas, ink, shapes, pictures, or the annotations of a PDF), with undo / redo.
 * - `apply`: a change that is one undo step
 * - `checkpoint` + `patch`: a continuous change (dragging) that becomes a single step
 */
export const useEditorState = <T>(initial: T) => {
  const [state, dispatch] = useReducer(reducer<T>, undefined, (): History<T> => ({
    past: [],
    present: initial,
    future: [],
  }))

  const apply = useCallback((fn: Fn<T>) => dispatch({ type: 'apply', fn }), [])
  const patch = useCallback((fn: Fn<T>) => dispatch({ type: 'patch', fn }), [])
  const checkpoint = useCallback(() => dispatch({ type: 'checkpoint' }), [])
  const undo = useCallback(() => dispatch({ type: 'undo' }), [])
  const redo = useCallback(() => dispatch({ type: 'redo' }), [])
  const drop = useCallback(() => dispatch({ type: 'drop' }), [])

  return useMemo(
    () => ({
      content: state.present,
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
