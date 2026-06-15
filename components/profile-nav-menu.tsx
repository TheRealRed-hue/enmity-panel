'use client'

/**
 * Place at: components/profile-nav-menu.tsx
 *
 * Hybrid profile + navigation menu for the top-right of the header.
 *
 *  - Click the avatar → opens an animated dropdown panel.
 *  - Pin button → panel becomes a fixed right-side drawer that stays
 *    open across navigation (click outside / Escape no longer close it).
 *  - "Customize profile" section lets the user preview avatar frames
 *    and name effects from lib/cosmetics.ts. Selections are LOCAL STATE
 *    ONLY for now — persisting to Supabase (staff_members.avatar_frame /
 *    name_effect) and reflecting them on the Team page is a follow-up
 *    once this design is approved.
 *
 * This component is self-contained — it does not yet replace the
 * existing sidebar. Drop it into the header next to the notification
 * bell to preview it.
 */

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ScrollText,
  Bell,
  Gavel,
  ShieldCheck,
  Ban,
  Users,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  Pin,
  PinOff,
  X,
  Sparkles,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { getClientSession, clearSession, type SessionUser } from '@/lib/session'
import { ROLE_CONFIG } from '@/lib/constants'
import { usePinnedMenu } from '@/components/pinned-menu-context'
import {
  AVATAR_FRAMES,
  NAME_EFFECTS,
  getFrameClass,
  getNameEffectClass,
  type AvatarFrameId,
  type NameEffectId,
} from '@/lib/cosmetics'

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
}

interface NavGroup {
  label?: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    items: [{ name: 'Overview', href: '/', icon: LayoutDashboard }],
  },
  {
    label: 'Moderation',
    items: [
      { name: 'Logs', href: '/logs', icon: ScrollText },
      { name: 'Action Logs', href: '/alerts', icon: Bell },
      { name: 'Mod Actions', href: '/actions', icon: Gavel },
      { name: 'Verification', href: '/verification', icon: ShieldCheck },
      { name: 'Blacklist', href: '/blacklist', icon: Ban },
    ],
  },
  {
    label: 'Management',
    items: [
      { name: 'Team', href: '/team', icon: Users },
      { name: 'Analytics', href: '/analytics', icon: BarChart3 },
      { name: 'Settings', href: '/settings', icon: Settings },
    ],
  },
]

function Avatar({
  user,
  frameId,
  size = 36,
}: {
  user: SessionUser | null
  frameId: AvatarFrameId
  size?: number
}) {
  const initials = user?.username?.slice(0, 2).toUpperCase() ?? '??'
  return (
    <div className={cn('avatar-frame', getFrameClass(frameId))} style={{ width: size, height: size }}>
      <div className="avatar-frame-inner flex items-center justify-center border border-primary/30 bg-primary/15">
        {user?.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatar} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs font-semibold text-primary">{initials}</span>
        )}
      </div>
    </div>
  )
}

export function ProfileNavMenu() {
  const pathname = usePathname()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [open, setOpen] = useState(false)
  const { pinned, setPinned } = usePinnedMenu()
  const [showCustomize, setShowCustomize] = useState(false)

  // TODO: replace with values from the session / staff_members row once
  // cosmetics are persisted server-side.
  const [frameId, setFrameId] = useState<AvatarFrameId>('gradient-spin')
  const [nameEffectId, setNameEffectId] = useState<NameEffectId>('gradient-animated')

  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setUser(getClientSession())
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pinned) return
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape' && !pinned) setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, pinned])

  async function handleLogout() {
    if (user) {
      const payload = JSON.stringify({
        discordId: user.discordId,
        username: user.username,
        dashboardRole: user.dashboardRole,
      })
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/auth/offline', new Blob([payload], { type: 'application/json' }))
      } else {
        await fetch('/api/auth/offline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        })
      }
    }
    clearSession()
    window.location.replace('/login')
  }

  const role = user ? ROLE_CONFIG[user.dashboardRole] : null
  const panelVisible = open || pinned

  return (
    <div ref={containerRef} className="relative">
      {/* ── Trigger ──────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-2 transition-colors hover:border-primary/40',
          panelVisible && 'border-primary/50'
        )}
        aria-expanded={panelVisible}
        aria-label="Open profile menu"
      >
        <Avatar user={user} frameId={frameId} size={32} />
        <ChevronDown
          size={14}
          className={cn('text-muted-foreground transition-transform duration-200', panelVisible && 'rotate-180')}
        />
      </button>

      {/* Backdrop — only relevant on small screens when pinned */}
      {pinned && (
        <div
          className="fixed inset-0 z-30 bg-black/30 animate-in fade-in duration-200 lg:hidden"
          onClick={() => setPinned(false)}
        />
      )}

      {/* ── Panel ────────────────────────────────────────────────────── */}
      {panelVisible && (
        <div
          className={cn(
            'z-40 flex flex-col border border-border bg-card shadow-2xl',
            pinned
              ? 'fixed right-0 top-0 h-screen w-72 rounded-none border-y-0 border-r-0 animate-in slide-in-from-right duration-300'
              : 'absolute right-0 top-12 w-72 overflow-hidden rounded-2xl animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200'
          )}
        >
          {/* Profile header */}
          <div className="flex items-start gap-3 border-b border-border p-4">
            <Avatar user={user} frameId={frameId} size={48} />
            <div className="min-w-0 flex-1">
              <p className={cn('truncate text-sm font-semibold', getNameEffectClass(nameEffectId))}>
                {user?.username ?? 'Guest'}
              </p>
              {role && (
                <span
                  className={cn(
                    'mt-1 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium',
                    role.bgColor,
                    role.color
                  )}
                >
                  {role.label}
                </span>
              )}
              <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-success-green" />
                Online
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPinned(!pinned)}
                className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                title={pinned ? 'Unpin menu' : 'Pin menu open'}
                aria-label={pinned ? 'Unpin menu' : 'Pin menu open'}
              >
                {pinned ? <PinOff size={14} /> : <Pin size={14} />}
              </button>
              {!pinned && (
                <button
                  onClick={() => setOpen(false)}
                  className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  aria-label="Close menu"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Customize toggle */}
          <button
            onClick={() => setShowCustomize((v) => !v)}
            className="flex items-center justify-between border-b border-border px-4 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary/40 hover:text-foreground"
          >
            <span className="flex items-center gap-2">
              <Sparkles size={13} />
              Customize profile
            </span>
            <ChevronDown size={12} className={cn('transition-transform duration-200', showCustomize && 'rotate-180')} />
          </button>

          {showCustomize && (
            <div className="space-y-3 border-b border-border bg-secondary/20 p-4 animate-in fade-in slide-in-from-top-1 duration-150">
              {/* Avatar frames */}
              <div>
                <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Avatar frame</p>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_FRAMES.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFrameId(f.id)}
                      title={f.label}
                      className={cn(
                        'rounded-full p-0.5 transition-all',
                        frameId === f.id
                          ? 'ring-2 ring-primary ring-offset-2 ring-offset-card'
                          : 'opacity-70 hover:opacity-100'
                      )}
                    >
                      <div className={cn('avatar-frame', f.className)} style={{ width: 28, height: 28 }}>
                        <div className="avatar-frame-inner flex items-center justify-center border border-primary/30 bg-primary/15">
                          <span className="text-[9px] font-semibold text-primary">
                            {user?.username?.slice(0, 1).toUpperCase() ?? '?'}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Name effects */}
              <div>
                <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Name effect</p>
                <div className="flex flex-col gap-1.5">
                  {NAME_EFFECTS.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => setNameEffectId(e.id)}
                      className={cn(
                        'flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors',
                        nameEffectId === e.id
                          ? 'bg-primary/15 text-foreground'
                          : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                      )}
                    >
                      <span className={cn('font-semibold', e.className)}>{user?.username ?? 'YourName'}</span>
                      <span className="text-[10px]">{e.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-[10px] leading-relaxed text-muted-foreground">
                Preview only for now — selections will be saved to your profile and shown on the Team page once wired up.
              </p>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-2 py-2">
            {navGroups.map((group, gi) => (
              <div key={gi} className="mb-1">
                {group.label && (
                  <p className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </p>
                )}
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => !pinned && setOpen(false)}
                          className={cn(
                            'relative flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                            isActive
                              ? 'bg-secondary text-foreground'
                              : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                          )}
                        >
                          {isActive && (
                            <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
                          )}
                          <item.icon size={17} className={cn('shrink-0', isActive && 'text-primary')} />
                          {item.name}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="border-t border-border p-2">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium text-critical-red transition-colors hover:bg-critical-red/10"
            >
              <LogOut size={17} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}