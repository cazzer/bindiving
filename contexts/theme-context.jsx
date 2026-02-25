'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const THEME_KEY = 'bindiving_theme'
const LIGHT = 'lofi'
const DARK = 'lofi-dark'

function getStoredMode() {
  if (typeof window === 'undefined') return 'auto'
  return (window.localStorage.getItem(THEME_KEY) || 'auto')
}

function getEffectiveTheme(mode) {
  if (mode === 'light') return LIGHT
  if (mode === 'dark') return DARK
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK : LIGHT
}

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState('auto')
  const [effective, setEffective] = useState(LIGHT)

  useEffect(() => {
    setModeState(getStoredMode())
  }, [])

  useEffect(() => {
    const theme = getEffectiveTheme(mode)
    setEffective(theme)
    document.documentElement.setAttribute('data-theme', theme)
  }, [mode])

  useEffect(() => {
    if (mode !== 'auto') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const theme = getEffectiveTheme('auto')
      setEffective(theme)
      document.documentElement.setAttribute('data-theme', theme)
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [mode])

  const setMode = useCallback((next) => {
    setModeState(next)
    if (typeof window !== 'undefined') window.localStorage.setItem(THEME_KEY, next)
  }, [])

  return (
    <ThemeContext.Provider value={{ mode, setMode, effective }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
