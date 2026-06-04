'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, ScrollText, Bell, Users, Gavel,
  ShieldCheck, Ban, BarChart3, ChevronLeft, ChevronRight, LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { getClientSession, clearSession, type SessionUser } from '@/lib/session'
import { ROLE_CONFIG } from '@/lib/constants'

const navigation = [
  { name: 'Overview', href: '/', icon: LayoutDashboard },
  { name: 'Logs', href: '/logs', icon: ScrollText },
  { name: 'Alerts', href: '/alerts', icon: Bell },
  { name: 'Team', href: '/team', icon: Users },
  { name: 'Mod Actions', href: '/actions', icon: Gavel },
  { name: 'Verification', href: '/verification', icon: ShieldCheck },
  { name: 'Blacklist', href: '/blacklist', icon: Ban },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
]

function ToriiIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 80" className={className} fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 22 L95 22" strokeLinecap="round" />
      <path d="M10 30 L90 30" strokeLinecap="round" />
      <path d="M0 20 Q50 4 100 20" strokeLinecap="round" />
      <path d="M22 22 L22 80" strokeLinecap="round" />
      <path d="M78 22 L78 80" strokeLinecap="round" />
      <path d="M16 76 L28 76" strokeLinecap="round" />
      <path d="M72 76 L84 76" strokeLinecap="round" />
    </svg>
  )
}
export function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [user, setUser] = useState<SessionUser | null>(null)

  useEffect(() => {
    setUser(getClientSession())
  }, [])

  // PRECISA ESTAR AQUI DENTRO ↓
  async function handleLogout() {
    const session = getClientSession()

    if (session) {
      await fetch('/api/auth/offline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discordId: session.discordId,
          username: session.username,
          dashboardRole: session.dashboardRole,
        }),
      })
    }

    clearSession()
    window.location.replace('/login')
  }

  const roleLabel = user ? ROLE_CONFIG[user.dashboardRole]?.label : null
  const roleColor = user ? ROLE_CONFIG[user.dashboardRole]?.color : null

  return (
    <aside className={cn(
      'fixed left-0 top-0 z-40 h-screen flex flex-col border-r border-border bg-sidebar transition-[width] duration-300 ease-in-out',
      collapsed ? 'w-16' : 'w-60'
    )}>
      {/* Logo */}
      <div className="flex h-14 items-center justify-between px-3 border-b border-border shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-primary/15 flex items-center justify-center border border-primary/20">
              <ToriiIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-none">Deepwoken</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Japan Arc</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-md bg-primary/15 flex items-center justify-center border border-primary/20 mx-auto">
            <ToriiIcon className="w-5 h-5 text-primary" />
          </div>
        )}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="p-1.5 rounded hover:bg-sidebar-accent transition-colors text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="mx-auto mt-3 p-1.5 rounded hover:bg-sidebar-accent transition-colors text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        <ul className="space-y-0.5">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  title={collapsed ? item.name : undefined}
                  className={cn(
                    'flex items-center gap-3 px-2.5 py-2 rounded-md text-sm font-medium transition-colors relative',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60'
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
                  )}
                  <item.icon className={cn('shrink-0', isActive ? 'text-primary' : '')} size={18} />
                  {!collapsed && <span className="truncate">{item.name}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User area */}
      {!collapsed && (
        <div className="p-3 border-t border-border shrink-0">
          {user ? (
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-md bg-secondary/40">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 shrink-0">
                <span className="text-[11px] font-semibold text-primary">
                  {user.username.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{user.username}</p>
                <p className={cn('text-[11px] truncate', roleColor ?? 'text-muted-foreground')}>
                  {roleLabel}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-critical-red"
                title="Sign out"
              >
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <a
              href="/login"
              className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-md bg-[#5865F2]/20 hover:bg-[#5865F2]/30 border border-[#5865F2]/30 transition-colors text-xs font-medium text-[#5865F2]"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 127.14 96.36" fill="currentColor">
                <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
              </svg>
              Sign in with Discord
            </a>
          )}
        </div>
      )}
    </aside>
  )
}
