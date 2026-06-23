'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, ScrollText, Bell, Users, Gavel,
  ShieldCheck, Ban, BarChart3, ChevronLeft, ChevronRight, LogOut, X, Settings,
  GraduationCap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { getClientSession, clearSession, type SessionUser } from '@/lib/session'
import { ROLE_CONFIG } from '@/lib/constants'

const navigation = [
  { name: 'Overview', href: '/', icon: LayoutDashboard },
  { name: 'Logs', href: '/logs', icon: ScrollText },
  { name: 'Action Log', href: '/alerts', icon: Bell },
  { name: 'Team', href: '/team', icon: Users },
  { name: 'Mod Actions', href: '/actions', icon: Gavel },
  { name: 'Verification', href: '/verification', icon: ShieldCheck },
  { name: 'Blacklist', href: '/blacklist', icon: Ban },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Training Portal', href: '/training', icon: GraduationCap },
  { name: 'Settings', href: '/settings', icon: Settings },
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

interface SidebarProps {
  open?: boolean
  onClose?: () => void
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [user, setUser] = useState<SessionUser | null>(null)

  useEffect(() => {
    setUser(getClientSession())
  }, [])

  function handleLogout() {
    clearSession()
    window.location.replace('/login')
  }

  const roleLabel = user ? ROLE_CONFIG[user.dashboardRole]?.label : null
  const roleColor = user ? ROLE_CONFIG[user.dashboardRole]?.color : null

  return (
    <aside className={cn(
      // Desktop: always visible, fixed
      'fixed left-0 top-0 z-40 h-screen flex flex-col border-r border-border bg-sidebar transition-[width,transform] duration-300 ease-in-out',
      // Mobile: slide in/out
      'lg:translate-x-0',
      open ? 'translate-x-0' : '-translate-x-full',
      // Width
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
              <p className="text-sm font-semibold text-foreground leading-none">Enmity Exe</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Enmity Exe</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-md bg-primary/15 flex items-center justify-center border border-primary/20 mx-auto">
            <ToriiIcon className="w-5 h-5 text-primary" />
          </div>
        )}
        <div className="flex items-center gap-1">
          {/* Mobile close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-sidebar-accent transition-colors text-muted-foreground hover:text-foreground lg:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {/* Desktop collapse button */}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="p-1.5 rounded hover:bg-sidebar-accent transition-colors text-muted-foreground hover:text-foreground hidden lg:flex"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="mx-auto mt-3 p-1.5 rounded hover:bg-sidebar-accent transition-colors text-muted-foreground hover:text-foreground hidden lg:flex"
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
                  onClick={onClose}
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
              Sign in with Discord
            </a>
          )}
        </div>
      )}
    </aside>
  )
}