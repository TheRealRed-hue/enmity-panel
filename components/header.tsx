'use client'

import NotificationBell from '@/components/notification-bell'
import { NotificationPanel } from '@/components/ui/notification-panel'

interface HeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3.5 bg-background/90 backdrop-blur-sm border-b border-border">
      <div>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {actions}

        <NotificationBell userId={undefined} />

        <NotificationPanel />

        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-success-green/10 border border-success-green/20 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-success-green" />
          <span className="text-[11px] text-success-green font-medium">Online</span>
        </div>
      </div>
    </header>
  )
}
