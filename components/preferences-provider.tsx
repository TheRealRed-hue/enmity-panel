'use client'

import { useEffect, useState } from 'react'
import { getClientSession } from '@/lib/session'
import {
  DEFAULT_PREFERENCES,
  getFontOption,
  getFontSizeOption,
  type ThemeColors,
  type UserPreferences,
} from '@/lib/preferences'

const FONT_LINK_ID = 'dynamic-font-link'

/**
 * Applies a set of saved preferences to the document immediately
 * (used both on initial load and right after the user saves changes
 * on the Settings page, for instant feedback).
 */
export function applyPreferences(prefs: Partial<UserPreferences>) {
  if (typeof document === 'undefined') return
  const root = document.documentElement

  // Theme mode (light/dark). 'system' falls back to dark for this dashboard.
  if (prefs.theme_mode === 'light') {
    root.classList.remove('dark')
  } else {
    root.classList.add('dark')
  }

  // Custom color overrides
  const colors: ThemeColors = prefs.theme_colors ?? {}
  // Reset any previously-set custom properties first
  for (const cssVar of Object.values(CUSTOM_VAR_RESET)) {
    root.style.removeProperty(cssVar)
  }
  for (const [key, value] of Object.entries(colors)) {
    if (value) root.style.setProperty(`--${key}`, value)
  }

  // Font family
  const font = getFontOption(prefs.font_family ?? DEFAULT_PREFERENCES.font_family)
  if (font.google) {
    let link = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null
    if (!link) {
      link = document.createElement('link')
      link.id = FONT_LINK_ID
      link.rel = 'stylesheet'
      document.head.appendChild(link)
    }
    link.href = `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`
  }
  root.style.setProperty('--font-sans', font.family)

  // Font size (base rem size)
  const size = getFontSizeOption(prefs.font_size ?? DEFAULT_PREFERENCES.font_size)
  root.style.fontSize = `${size.rootPx}px`
}

// All theme color vars we ever set, used to clear stale overrides before re-applying
const CUSTOM_VAR_RESET = [
  'primary', 'background', 'foreground', 'card', 'secondary',
  'accent', 'border', 'sidebar', 'sidebar-accent',
].reduce<Record<string, string>>((acc, key) => {
  acc[key] = `--${key}`
  return acc
}, {})

export async function fetchPreferences(discordId: string): Promise<UserPreferences> {
  try {
    const res = await fetch(`/api/preferences?discord_id=${discordId}`)
    if (!res.ok) return DEFAULT_PREFERENCES
    const data = await res.json()
    return {
      theme_mode: data.theme_mode ?? DEFAULT_PREFERENCES.theme_mode,
      theme_colors: data.theme_colors ?? {},
      font_family: data.font_family ?? DEFAULT_PREFERENCES.font_family,
      font_size: data.font_size ?? DEFAULT_PREFERENCES.font_size,
      notifications_enabled: data.notifications_enabled ?? true,
    }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export async function savePreferences(discordId: string, prefs: UserPreferences) {
  const res = await fetch('/api/preferences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ discord_id: discordId, ...prefs }),
  })
  if (!res.ok) throw new Error('Falha ao salvar preferências')
  return res.json()
}

/**
 * Drop this once near the root of the app (inside <body>). It silently loads
 * the logged-in user's saved preferences and applies them to the document.
 */
export function PreferencesProvider() {
  useEffect(() => {
    const user = getClientSession()
    if (!user) return

    let cancelled = false
    fetchPreferences(user.discordId).then((prefs) => {
      if (cancelled) return
      applyPreferences(prefs)
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('notifications_enabled', String(prefs.notifications_enabled))
        window.dispatchEvent(new CustomEvent(NOTIFICATIONS_EVENT, { detail: prefs.notifications_enabled }))
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  return null
}

export function isNotificationsEnabled(): boolean {
  if (typeof localStorage === 'undefined') return true
  return localStorage.getItem('notifications_enabled') !== 'false'
}

const NOTIFICATIONS_EVENT = 'preferences:notifications-enabled-changed'

export function setNotificationsEnabled(enabled: boolean) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem('notifications_enabled', String(enabled))
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_EVENT, { detail: enabled }))
}

/**
 * React hook that returns whether the dashboard notification panel/bell
 * should be shown for the current user, updating live when the user
 * changes the setting on the Settings page (no reload needed).
 */
export function useNotificationsEnabled(): boolean {
  const [enabled, setEnabled] = useState<boolean>(true)

  useEffect(() => {
    setEnabled(isNotificationsEnabled())

    function handleStorage(e: StorageEvent) {
      if (e.key === 'notifications_enabled') setEnabled(e.newValue !== 'false')
    }
    function handleCustom(e: Event) {
      setEnabled((e as CustomEvent<boolean>).detail)
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener(NOTIFICATIONS_EVENT, handleCustom)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener(NOTIFICATIONS_EVENT, handleCustom)
    }
  }, [])

  return enabled
}
