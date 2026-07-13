import { useCallback, useEffect, useState } from 'react'

export type ThemePref = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'kepra-theme'
const MEDIA = '(prefers-color-scheme: dark)'

function readPref(): ThemePref {
  if (typeof localStorage === 'undefined') return 'system'
  const v = localStorage.getItem(STORAGE_KEY)
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'system'
}

function systemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark'
  return window.matchMedia(MEDIA).matches ? 'dark' : 'light'
}

/**
 * Tri-state theme: 'system' follows the OS, 'light'/'dark' force a choice.
 * The resolved value is mirrored onto <html data-theme> so CSS can switch
 * token ramps; the pre-paint script in index.html applies it before first
 * paint (keep that script in sync with this file).
 */
export function useTheme() {
  const [pref, setPref] = useState<ThemePref>(readPref)
  const [system, setSystem] = useState<ResolvedTheme>(systemTheme)

  useEffect(() => {
    if (!window.matchMedia) return
    const mq = window.matchMedia(MEDIA)
    const onChange = () => setSystem(mq.matches ? 'dark' : 'light')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const resolved: ResolvedTheme = pref === 'system' ? system : pref

  useEffect(() => {
    document.documentElement.dataset.theme = resolved
    document.documentElement.style.colorScheme = resolved
  }, [resolved])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, pref)
    } catch {
      /* storage unavailable — ignore */
    }
  }, [pref])

  const choose = useCallback((next: ThemePref) => setPref(next), [])

  return { pref, resolved, choose }
}
