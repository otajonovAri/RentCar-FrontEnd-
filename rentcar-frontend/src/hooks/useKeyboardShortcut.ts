import { useEffect, useCallback } from 'react'

interface Options {
  /** Required modifier keys */
  modifiers?: ('ctrl' | 'shift' | 'alt')[]
  preventDefault?: boolean
  enabled?: boolean
  /** If true, shortcut fires even when an input/textarea is focused */
  ignoreInputFocus?: boolean
}

/**
 * Global keyboard shortcut hook.
 * Ctrl/Cmd are treated as equivalent for cross-platform support.
 *
 * @example
 * useKeyboardShortcut('k', () => setOpen(true), { modifiers: ['ctrl'] })
 */
export function useKeyboardShortcut(
  key: string,
  callback: (e: KeyboardEvent) => void,
  options: Options = {},
) {
  const {
    modifiers       = [],
    preventDefault  = true,
    enabled         = true,
    ignoreInputFocus = false,
  } = options

  const stable = useCallback(callback, [callback])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!enabled) return

    const handler = (e: KeyboardEvent) => {
      // Modifier gates
      if (modifiers.includes('ctrl')  && !(e.ctrlKey || e.metaKey)) return
      if (modifiers.includes('shift') && !e.shiftKey) return
      if (modifiers.includes('alt')   && !e.altKey)   return

      // Skip inputs unless overridden (only for non-modifier shortcuts)
      if (!ignoreInputFocus && modifiers.length === 0) {
        const t = e.target as HTMLElement
        if (
          t.tagName === 'INPUT' ||
          t.tagName === 'TEXTAREA' ||
          t.contentEditable === 'true'
        ) return
      }

      if (e.key !== key) return

      if (preventDefault) e.preventDefault()
      stable(e)
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [key, modifiers, preventDefault, enabled, ignoreInputFocus, stable])
}
