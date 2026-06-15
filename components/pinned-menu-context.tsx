'use client'

/**
 * Place at: components/pinned-menu-context.tsx
 *
 * Shares the "pinned" state of <ProfileNavMenu /> with
 * <DashboardLayout />, so the main content area can make room
 * (padding-right) when the menu is docked open as a right-side drawer.
 */

import { createContext, useContext, useState, type ReactNode } from 'react'

interface PinnedMenuContextValue {
  pinned: boolean
  setPinned: (value: boolean) => void
}

const PinnedMenuContext = createContext<PinnedMenuContextValue | null>(null)

export function PinnedMenuProvider({ children }: { children: ReactNode }) {
  const [pinned, setPinned] = useState(false)
  return (
    <PinnedMenuContext.Provider value={{ pinned, setPinned }}>
      {children}
    </PinnedMenuContext.Provider>
  )
}

export function usePinnedMenu(): PinnedMenuContextValue {
  const ctx = useContext(PinnedMenuContext)
  if (!ctx) {
    throw new Error('usePinnedMenu must be used within <DashboardLayout>')
  }
  return ctx
}