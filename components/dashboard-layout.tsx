'use client'

/**
 * Place at: components/dashboard-layout.tsx (replaces existing file)
 *
 * The left sidebar is gone — navigation now lives in <ProfileNavMenu />
 * (top-right of the header, see components/profile-nav-menu.tsx).
 *
 * This component now just:
 *  - Provides <PinnedMenuProvider> so ProfileNavMenu can report whether
 *    it's docked open as a right-side drawer.
 *  - Adds padding-right to <main> when pinned, so the drawer (288px /
 *    w-72) doesn't cover page content.
 *
 * The old `Sidebar` export, the `navigation` array, and the mobile
 * "Menu" button are all removed — ProfileNavMenu handles every screen
 * size on its own.
 */

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { PinnedMenuProvider, usePinnedMenu } from '@/components/pinned-menu-context'

function LayoutContent({ children }: { children: ReactNode }) {
  const { pinned } = usePinnedMenu()

  return (
    <main className={cn('min-h-screen transition-[padding] duration-300', pinned && 'lg:pr-72')}>
      {children}
    </main>
  )
}

interface DashboardLayoutProps {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PinnedMenuProvider>
        <LayoutContent>{children}</LayoutContent>
      </PinnedMenuProvider>
    </div>
  )
}