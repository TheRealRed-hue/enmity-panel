'use client'

/**
 * Place at: app/verification/page.tsx
 *
 * Full rework of the Verify Issues page.
 * New features:
 *  - Rover API integration: live Roblox avatar, account ages, friend count, Deepwoken badges
 *  - Discord account age derived from snowflake (no API needed)
 *  - Tabbed detail panel: Overview · Profile · Badges · Risk · Timeline
 *  - Animated status transitions and skeleton states
 *  - FriendModal with backdrop blur and slide-in
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  ExternalLink,
  RefreshCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  Users,
  XCircle,
} from 'lucide-react'

import { DashboardLayout } from '@/components/dashboard-layout'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageShell } from '@/components/ui/page-shell'
import { cn } from '@/lib/utils'
import {
  failureReasonConfig,
  getRiskLevel,
  loadMockVerificationRequests,
  statusConfig,
} from '@/lib/verification'
import type { VerificationIssueStatus, VerificationRequest } from '@/types'

// ─── Deepwoken badge labels (keep in sync with api-verification-roblox-route.ts) ──
const BADGE_LABELS: Record<number, string> = {
  2124445880: 'You Have Awoken',
  2124731695: 'Layer 2 Cleared',
  2124994003: 'Bell Ringer',
  2125003241: 'Chime of Conflict',
  2127891023: 'Trial of One',
}
const ALL_BADGE_IDS = Object.keys(BADGE_LABELS).map(Number)

// ─── Types ────────────────────────────────────────────────────────────────────

interface RobloxProfileData {
  robloxId: number
  robloxUsername: string
  robloxDisplayName: string
  robloxCreatedAt: string
  robloxAccountAgeDays: number
  avatarUrl: string | null
  friendCount: number
  discordCreatedAt: string
  discordAccountAgeDays: number
  ownedBadgeIds: number[]
  missingBadgeIds: number[]
  badgeDetails: Record<number, { name: string; owned: boolean; awardedDate?: string }>
}

type DetailTab = 'overview' | 'profile' | 'badges' | 'risk' | 'timeline'

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_OPTIONS: Array<VerificationIssueStatus | 'all'> = [
  'all',
  'waiting_for_roblox',
  'verification_in_progress',
  'verification_completed',
  'pending_moderator_review',
  'verification_failed',
  'approved',
  'denied',
  'manually_verified',
]

const STATUS_LABELS: Record<VerificationIssueStatus | 'all', string> = {
  all: 'All',
  waiting_for_roblox: 'Waiting',
  verification_in_progress: 'In Progress',
  verification_completed: 'Completed',
  pending_moderator_review: 'Review',
  verification_failed: 'Failed',
  approved: 'Approved',
  denied: 'Denied',
  manually_verified: 'Manual',
}

const STATUS_DOT: Record<VerificationIssueStatus, string> = {
  waiting_for_roblox: 'bg-sky-400',
  verification_in_progress: 'bg-amber-400 animate-pulse',
  verification_completed: 'bg-emerald-400',
  pending_moderator_review: 'bg-yellow-400',
  verification_failed: 'bg-rose-500',
  approved: 'bg-emerald-400',
  denied: 'bg-rose-500',
  manually_verified: 'bg-violet-400',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function snowflakeToISO(id: string): string {
  return new Date(Number(BigInt(id) >> 22n) + 1_420_070_400_000).toISOString()
}

function ageDays(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

function formatAge(days: number) {
  if (days < 30) return `${days}d`
  if (days < 365) return `${Math.floor(days / 30)}mo`
  const y = Math.floor(days / 365)
  const m = Math.floor((days % 365) / 30)
  return m ? `${y}y ${m}mo` : `${y}y`
}

function queryMatches(r: VerificationRequest, q: string) {
  const s = q.toLowerCase()
  return (
    r.discordUsername.toLowerCase().includes(s) ||
    r.discordId.includes(s) ||
    r.ticketId.toLowerCase().includes(s) ||
    r.robloxUsername.toLowerCase().includes(s)
  )
}

// ─── Rover hook ───────────────────────────────────────────────────────────────

function useRobloxProfile(discordId: string | null) {
  const [data, setData] = useState<RobloxProfileData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abort = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!discordId) return
    abort.current?.abort()
    const ctrl = new AbortController()
    abort.current = ctrl
    setLoading(true)
    setData(null)
    setError(null)

    const guildId = process.env.NEXT_PUBLIC_GUILD_ID ?? ''
    fetch(`/api/verification/roblox?discordId=${discordId}&guildId=${guildId}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : r.json().then((e: { error: string }) => Promise.reject(e.error))))
      .then((d: RobloxProfileData) => { setData(d); setLoading(false) })
      .catch((e) => {
        if ((e as Error)?.name === 'AbortError') return
        setError(typeof e === 'string' ? e : 'Could not reach Rover.')
        setLoading(false)
      })

    return () => ctrl.abort()
  }, [discordId])

  return { data, loading, error }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SkeletonRow() {
  return <div className="h-[72px] animate-pulse rounded-2xl bg-slate-900/60" />
}

function SkeletonBlock({ h = 'h-16' }: { h?: string }) {
  return <div className={cn('w-full animate-pulse rounded-2xl bg-slate-900/60', h)} />
}

function AgeBar({ days }: { days: number }) {
  const pct = Math.min(100, (days / 1825) * 100)
  const color = days < 30 ? 'bg-rose-500' : days < 90 ? 'bg-amber-400' : days < 365 ? 'bg-yellow-400' : 'bg-emerald-400'
  return (
    <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-800">
      <div className={cn('h-full rounded-full transition-all duration-700', color)} style={{ width: `${pct}%` }} />
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function VerificationPage() {
  const [requests, setRequests] = useState<VerificationRequest[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<VerificationIssueStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [friendModalOpen, setFriendModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<DetailTab>('overview')

  const loadRequests = useCallback(async () => {
    setIsLoading(true)
    setFetchError(null)
    try {
      const data = await loadMockVerificationRequests()
      setRequests(data)
      setSelectedId((cur) => cur ?? data[0]?.id ?? null)
    } catch {
      setFetchError('Unable to load verification requests.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRequests()
    const id = window.setInterval(loadRequests, 15_000)
    return () => window.clearInterval(id)
  }, [loadRequests])

  const filtered = useMemo(() => {
    const base = statusFilter === 'all' ? requests : requests.filter((r) => r.status === statusFilter)
    return searchQuery.trim() ? base.filter((r) => queryMatches(r, searchQuery)) : base
  }, [requests, searchQuery, statusFilter])

  const selected = useMemo(
    () => requests.find((r) => r.id === selectedId) ?? filtered[0] ?? null,
    [requests, filtered, selectedId]
  )

  useEffect(() => {
    if (!selectedId && filtered.length) setSelectedId(filtered[0].id)
  }, [filtered, selectedId])

  useEffect(() => { setActiveTab('overview') }, [selectedId])

  const counts = useMemo(
    () => requests.reduce((acc, r) => { acc[r.status] = (acc[r.status] ?? 0) + 1; return acc }, {} as Record<VerificationIssueStatus, number>),
    [requests]
  )

  const { data: roblox, loading: robloxLoading, error: robloxError } = useRobloxProfile(selected?.discordId ?? null)

  // Discord age from snowflake — no API needed
  const discordAge = useMemo(() => {
    if (!selected?.discordId) return null
    const iso = snowflakeToISO(selected.discordId)
    return { iso, days: ageDays(iso) }
  }, [selected?.discordId])

  const handleAction = (action: 'approved' | 'denied' | 'manually_verified') => {
    if (!selected) return
    const labels = { approved: 'Request approved', denied: 'Request denied', manually_verified: 'Manually verified' }
    const descs = {
      approved: 'A moderator approved this verification request.',
      denied: 'A moderator denied this verification request.',
      manually_verified: 'A moderator confirmed this verification manually.',
    }
    setRequests((cur) =>
      cur.map((r) =>
        r.id === selected.id
          ? {
              ...r,
              status: action,
              lastUpdated: new Date().toISOString(),
              activity: [
                ...r.activity,
                { id: `mod-${Date.now()}`, title: labels[action], description: descs[action], timestamp: new Date().toISOString(), type: 'moderator' as const },
              ],
            }
          : r
      )
    )
  }

  const TABS: { id: DetailTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <ShieldCheck className="h-3.5 w-3.5" /> },
    { id: 'profile', label: 'Profile', icon: <User className="h-3.5 w-3.5" /> },
    { id: 'badges', label: 'Badges', icon: <Award className="h-3.5 w-3.5" /> },
    { id: 'risk', label: 'Risk & Flags', icon: <ShieldAlert className="h-3.5 w-3.5" /> },
    { id: 'timeline', label: 'Timeline', icon: <Clock className="h-3.5 w-3.5" /> },
  ]

  return (
    <DashboardLayout>
      <PageShell className="space-y-6">
        <Header
          title="Verify Issues"
          subtitle="Audit Roblox identity, Deepwoken badges, and account signals before taking action."
        />

        <div className="grid gap-6 xl:grid-cols-[340px_1fr]">

          {/* ── Left: queue ─────────────────────────────────────────────── */}
          <aside className="flex flex-col gap-4">

            {/* Summary counters */}
            <div className="grid grid-cols-2 gap-2">
              {([
                { key: 'waiting_for_roblox', label: 'Waiting', icon: Clock, color: 'text-sky-400 bg-sky-500/10' },
                { key: 'verification_in_progress', label: 'In Progress', icon: ArrowRight, color: 'text-amber-400 bg-amber-500/10' },
                { key: 'pending_moderator_review', label: 'Review', icon: ShieldCheck, color: 'text-yellow-400 bg-yellow-500/10' },
                { key: 'verification_failed', label: 'Failed', icon: AlertTriangle, color: 'text-rose-400 bg-rose-500/10' },
              ] as const).map(({ key, label, icon: Icon, color }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left transition hover:border-primary/40',
                    statusFilter === key && 'border-primary/50 bg-primary/5'
                  )}
                >
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-xl', color)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-lg font-semibold text-white">{counts[key as VerificationIssueStatus] ?? 0}</p>
                    <p className="truncate text-xs text-muted-foreground">{label}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Search + filter chips */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Discord, ticket, Roblox…"
                  className="w-full rounded-xl border border-border bg-slate-950/60 py-2 pl-9 pr-3 text-sm text-white outline-none transition focus:border-primary/60 placeholder:text-muted-foreground"
                />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setStatusFilter(opt)}
                    className={cn(
                      'rounded-full px-3 py-1 text-xs font-medium transition',
                      statusFilter === opt
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-slate-950/80 text-muted-foreground hover:bg-slate-900 hover:text-white'
                    )}
                  >
                    {STATUS_LABELS[opt]}
                  </button>
                ))}
              </div>
            </div>

            {/* Ticket list */}
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-sm font-semibold">Open tickets</p>
                  <p className="text-xs text-muted-foreground">Select to inspect risk profile.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-950 px-2.5 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                    {filtered.length}
                  </span>
                  <button
                    type="button"
                    onClick={loadRequests}
                    className="flex items-center gap-1.5 rounded-xl border border-border bg-slate-950/80 px-3 py-1.5 text-xs text-muted-foreground transition hover:text-white"
                  >
                    <RefreshCcw className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {isLoading
                  ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
                  : fetchError
                  ? <EmptyState title="Failed to load" description={fetchError} />
                  : !filtered.length
                  ? <EmptyState title="No matching tickets" description="Clear search or change filter." />
                  : filtered.map((req) => {
                      const cfg = statusConfig[req.status]
                      return (
                        <button
                          key={req.id}
                          type="button"
                          onClick={() => setSelectedId(req.id)}
                          className={cn(
                            'group w-full rounded-2xl border px-4 py-3 text-left transition-all duration-200',
                            selected?.id === req.id
                              ? 'border-primary/60 bg-primary/5'
                              : 'border-border bg-slate-950/30 hover:border-primary/30 hover:bg-slate-950/70'
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={cn('mt-0.5 h-2 w-2 shrink-0 rounded-full', STATUS_DOT[req.status])} />
                              <p className="truncate text-sm font-semibold text-white">{req.discordUsername}</p>
                            </div>
                            <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider', cfg.badge)}>
                              {STATUS_LABELS[req.status]}
                            </span>
                          </div>
                          <div className="mt-1.5 pl-4 flex items-center justify-between gap-2">
                            <p className="text-xs text-muted-foreground truncate">Roblox: {req.robloxUsername}</p>
                            <span className="shrink-0 text-[10px] text-muted-foreground">{req.ticketId}</span>
                          </div>
                        </button>
                      )
                    })
                }
              </div>
            </div>
          </aside>

          {/* ── Right: detail panel ──────────────────────────────────────── */}
          <section>
            {!selected ? (
              <div className="flex h-64 items-center justify-center rounded-3xl border border-dashed border-border text-sm text-muted-foreground">
                Select a ticket from the queue to review it.
              </div>
            ) : (
              <div className="rounded-3xl border border-border bg-card overflow-hidden">

                {/* Panel header */}
                <div className="border-b border-border px-6 pt-5 pb-0">
                  <div className="flex items-start justify-between gap-4 pb-1">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      {roblox?.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={roblox.avatarUrl}
                          alt={roblox.robloxDisplayName}
                          className="h-12 w-12 rounded-2xl border border-border object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-slate-900">
                          <User className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground">{selected.ticketId}</p>
                        <h2 className="text-lg font-semibold text-white leading-tight">{selected.discordUsername}</h2>
                        <p className="text-xs text-muted-foreground">
                          Roblox: <span className="text-white">{roblox?.robloxDisplayName ?? selected.robloxUsername}</span>
                          {roblox && <span className="ml-1 text-muted-foreground">@{roblox.robloxUsername}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <span className={cn('h-2 w-2 rounded-full', STATUS_DOT[selected.status])} />
                      <span className={cn('rounded-full px-3 py-1 text-xs uppercase tracking-wider', statusConfig[selected.status].badge)}>
                        {statusConfig[selected.status].label}
                      </span>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="mt-3 flex overflow-x-auto">
                    {TABS.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          'flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                          activeTab === tab.id
                            ? 'border-primary text-white'
                            : 'border-transparent text-muted-foreground hover:text-white'
                        )}
                      >
                        {tab.icon}
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tab content */}
                <div className="p-6 space-y-5">

                  {/* ── Overview ─────────────────────────────────────────── */}
                  {activeTab === 'overview' && (
                    <div className="space-y-5 animate-in fade-in duration-200">

                      {/* Identity cards */}
                      <div className="grid gap-4 sm:grid-cols-2">
                        {/* Discord */}
                        <div className="rounded-2xl border border-border bg-slate-950/60 p-5 space-y-3">
                          <p className="text-xs uppercase tracking-widest text-muted-foreground">Discord identity</p>
                          <div>
                            <p className="text-base font-semibold text-white">{selected.discordUsername}</p>
                            <p className="text-xs text-muted-foreground font-mono">{selected.discordId}</p>
                          </div>
                          <div className="space-y-2">
                            <InfoRow label="Opened" value={new Date(selected.ticketCreatedAt).toLocaleString()} />
                            <InfoRow label="Updated" value={new Date(selected.lastUpdated).toLocaleString()} />
                            {discordAge && (
                              <div>
                                <InfoRow label="Account age" value={
                                  <span className={cn('font-semibold', discordAge.days < 30 ? 'text-rose-400' : 'text-white')}>
                                    {formatAge(discordAge.days)}
                                  </span>
                                } />
                                <AgeBar days={discordAge.days} />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Roblox */}
                        <div className="rounded-2xl border border-border bg-slate-950/60 p-5 space-y-3">
                          <p className="text-xs uppercase tracking-widest text-muted-foreground">Roblox profile</p>
                          {robloxLoading ? (
                            <div className="space-y-2">
                              <SkeletonBlock h="h-5" />
                              <SkeletonBlock h="h-4" />
                              <SkeletonBlock h="h-4" />
                            </div>
                          ) : roblox ? (
                            <div className="space-y-2">
                              <div>
                                <p className="text-base font-semibold text-white">{roblox.robloxDisplayName}</p>
                                <p className="text-xs text-muted-foreground">@{roblox.robloxUsername}</p>
                              </div>
                              <InfoRow label="Account age" value={
                                <span className={cn('font-semibold', roblox.robloxAccountAgeDays < 30 ? 'text-rose-400' : 'text-white')}>
                                  {formatAge(roblox.robloxAccountAgeDays)}
                                </span>
                              } />
                              <AgeBar days={roblox.robloxAccountAgeDays} />
                              <InfoRow label="Friends" value={roblox.friendCount} />
                              <InfoRow label="Verified at" value={new Date(selected.robloxVerifiedAt).toLocaleString()} />
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <InfoRow label="Display name" value={selected.robloxDisplayName} />
                              <InfoRow label="Account age" value={selected.robloxAccountAge} />
                              <InfoRow label="Verified at" value={new Date(selected.robloxVerifiedAt).toLocaleString()} />
                              {robloxError && <p className="text-xs text-rose-400">{robloxError}</p>}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Risk bar */}
                      <div className="rounded-2xl border border-border bg-slate-950/60 p-5">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm text-muted-foreground">Verification risk</p>
                          <span className={cn('rounded-full px-3 py-1 text-xs uppercase tracking-widest', getRiskLevel(selected.riskScore.value).badge)}>
                            {getRiskLevel(selected.riskScore.value).label}
                          </span>
                        </div>
                        <div className="mt-2 flex items-end justify-between gap-4">
                          <p className="text-4xl font-semibold text-white">{selected.riskScore.value}<span className="text-sm text-muted-foreground">/100</span></p>
                          {roblox && (
                            <p className="text-xs text-muted-foreground text-right">
                              {roblox.ownedBadgeIds.length}/{ALL_BADGE_IDS.length} badges · {formatAge(roblox.robloxAccountAgeDays)} Roblox age
                            </p>
                          )}
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 transition-all duration-700"
                            style={{ width: `${selected.riskScore.value}%` }}
                          />
                        </div>
                      </div>

                      {/* Friend audit + moderator actions */}
                      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                        <div className="rounded-2xl border border-border bg-slate-950/60 p-5">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs uppercase tracking-widest text-muted-foreground">Friend audit</p>
                              <p className="mt-1 text-lg font-semibold text-white">
                                {selected.friendAnalysis.blacklistedFriendsCount}{' '}
                                <span className="text-sm font-normal text-muted-foreground">flagged</span>
                              </p>
                            </div>
                            <Users className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <p className="mt-3 text-xs text-muted-foreground leading-5">
                            Connections to blacklisted Roblox accounts are available for review before moderating.
                          </p>
                          <Button className="mt-4 w-full" variant="outline" onClick={() => setFriendModalOpen(true)}>
                            View friend analysis
                          </Button>
                        </div>

                        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-slate-950/60 p-5 min-w-[180px]">
                          <p className="text-xs uppercase tracking-widest text-muted-foreground">Moderator actions</p>
                          <Button onClick={() => handleAction('approved')} className="gap-2">
                            <CheckCircle2 className="h-4 w-4" /> Approve
                          </Button>
                          <Button variant="destructive" onClick={() => handleAction('denied')} className="gap-2">
                            <XCircle className="h-4 w-4" /> Deny
                          </Button>
                          <Button variant="secondary" onClick={() => handleAction('manually_verified')} className="gap-2">
                            <Sparkles className="h-4 w-4" /> Manual verify
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Profile tab ───────────────────────────────────────── */}
                  {activeTab === 'profile' && (
                    <div className="space-y-5 animate-in fade-in duration-200">
                      {robloxLoading ? (
                        <div className="space-y-3">
                          {Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} h="h-20" />)}
                        </div>
                      ) : roblox ? (
                        <>
                          {/* Avatar + identity */}
                          <div className="flex items-center gap-5 rounded-2xl border border-border bg-slate-950/60 p-5">
                            {roblox.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={roblox.avatarUrl}
                                alt={roblox.robloxDisplayName}
                                className="h-20 w-20 rounded-2xl border border-border object-cover"
                              />
                            ) : (
                              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-border bg-slate-900">
                                <User className="h-8 w-8 text-muted-foreground" />
                              </div>
                            )}
                            <div className="space-y-1">
                              <p className="text-xl font-semibold text-white">{roblox.robloxDisplayName}</p>
                              <p className="text-sm text-muted-foreground">@{roblox.robloxUsername}</p>
                              <p className="text-xs text-muted-foreground font-mono">ID: {roblox.robloxId}</p>
                              <a
                                href={`https://www.roblox.com/users/${roblox.robloxId}/profile`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                              >
                                Open on Roblox <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          </div>

                          {/* Ages */}
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-border bg-slate-950/60 p-5">
                              <p className="text-xs uppercase tracking-widest text-muted-foreground">Roblox account age</p>
                              <p className={cn('mt-2 text-3xl font-semibold', roblox.robloxAccountAgeDays < 30 ? 'text-rose-400' : 'text-white')}>
                                {formatAge(roblox.robloxAccountAgeDays)}
                              </p>
                              <p className="text-xs text-muted-foreground">Since {new Date(roblox.robloxCreatedAt).toLocaleDateString()}</p>
                              <AgeBar days={roblox.robloxAccountAgeDays} />
                            </div>
                            {discordAge && (
                              <div className="rounded-2xl border border-border bg-slate-950/60 p-5">
                                <p className="text-xs uppercase tracking-widest text-muted-foreground">Discord account age</p>
                                <p className={cn('mt-2 text-3xl font-semibold', discordAge.days < 30 ? 'text-rose-400' : 'text-white')}>
                                  {formatAge(discordAge.days)}
                                </p>
                                <p className="text-xs text-muted-foreground">Since {new Date(discordAge.iso).toLocaleDateString()}</p>
                                <AgeBar days={discordAge.days} />
                              </div>
                            )}
                          </div>

                          {/* Friends */}
                          <div className="rounded-2xl border border-border bg-slate-950/60 p-5">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-xs uppercase tracking-widest text-muted-foreground">Roblox friends</p>
                                <p className="mt-1 text-2xl font-semibold text-white">{roblox.friendCount}</p>
                              </div>
                              <Users className="h-6 w-6 text-muted-foreground" />
                            </div>
                            {selected.friendAnalysis.blacklistedFriendsCount > 0 && (
                              <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-500/10 px-4 py-2.5 text-sm text-rose-400">
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                {selected.friendAnalysis.blacklistedFriendsCount} friend(s) on the blacklist
                                <button type="button" onClick={() => setFriendModalOpen(true)} className="ml-auto text-xs underline">
                                  View
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="space-y-3">
                          <div className="rounded-2xl border border-border bg-slate-950/60 p-5 space-y-2">
                            <InfoRow label="Display name" value={selected.robloxDisplayName} />
                            <InfoRow label="Username" value={selected.robloxUsername} />
                            <InfoRow label="Account age" value={selected.robloxAccountAge} />
                            <InfoRow label="Verified at" value={new Date(selected.robloxVerifiedAt).toLocaleString()} />
                          </div>
                          {discordAge && (
                            <div className="rounded-2xl border border-border bg-slate-950/60 p-5">
                              <p className="text-xs uppercase tracking-widest text-muted-foreground">Discord account age</p>
                              <p className="mt-2 text-2xl font-semibold text-white">{formatAge(discordAge.days)}</p>
                              <AgeBar days={discordAge.days} />
                            </div>
                          )}
                          {robloxError && (
                            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-400">
                              Rover error: {robloxError} — showing mock data.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Badges tab ────────────────────────────────────────── */}
                  {activeTab === 'badges' && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      {robloxLoading ? (
                        <div className="space-y-2">
                          {Array.from({ length: ALL_BADGE_IDS.length }).map((_, i) => <SkeletonBlock key={i} h="h-16" />)}
                        </div>
                      ) : roblox ? (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-medium text-emerald-400">
                              {roblox.ownedBadgeIds.length} owned
                            </span>
                            <span className="rounded-full bg-rose-500/15 px-3 py-1 text-sm font-medium text-rose-400">
                              {roblox.missingBadgeIds.length} missing
                            </span>
                          </div>
                          <div className="space-y-2">
                            {ALL_BADGE_IDS.map((id) => {
                              const detail = roblox.badgeDetails[id]
                              const owned = roblox.ownedBadgeIds.includes(id)
                              return (
                                <div
                                  key={id}
                                  className={cn(
                                    'flex items-center justify-between gap-4 rounded-2xl border px-5 py-4 transition',
                                    owned ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-border bg-slate-950/40 opacity-50'
                                  )}
                                >
                                  <div className="flex items-center gap-3">
                                    {owned
                                      ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                                      : <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                                    }
                                    <div>
                                      <p className={cn('text-sm font-medium', owned ? 'text-white' : 'text-muted-foreground line-through')}>
                                        {detail?.name ?? BADGE_LABELS[id] ?? `Badge ${id}`}
                                      </p>
                                      <p className="text-xs text-muted-foreground">ID: {id}</p>
                                    </div>
                                  </div>
                                  {owned && detail?.awardedDate && (
                                    <span className="shrink-0 text-xs text-muted-foreground">
                                      Earned {new Date(detail.awardedDate).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </>
                      ) : (
                        <EmptyState
                          title="Badge data unavailable"
                          description={robloxError ?? 'Rover + Roblox API must be configured to check Deepwoken badges.'}
                        />
                      )}
                    </div>
                  )}

                  {/* ── Risk & Flags tab ──────────────────────────────────── */}
                  {activeTab === 'risk' && (
                    <div className="space-y-5 animate-in fade-in duration-200">
                      <div className="rounded-2xl border border-border bg-slate-950/60 p-5">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm text-muted-foreground">Risk score</p>
                          <span className={cn('rounded-full px-3 py-1 text-xs uppercase tracking-widest', getRiskLevel(selected.riskScore.value).badge)}>
                            {getRiskLevel(selected.riskScore.value).label}
                          </span>
                        </div>
                        <p className="mt-2 text-5xl font-semibold text-white">
                          {selected.riskScore.value}<span className="text-lg text-muted-foreground">/100</span>
                        </p>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 transition-all duration-700"
                            style={{ width: `${selected.riskScore.value}%` }}
                          />
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Evaluated from account age, friend connections, badge history, and flag count.
                        </p>
                      </div>

                      <div>
                        <p className="mb-3 text-sm font-medium">
                          Failure reasons{' '}
                          <span className="text-muted-foreground">({selected.failureReasons.length})</span>
                        </p>
                        {selected.failureReasons.length ? (
                          <div className="space-y-2">
                            {selected.failureReasons.map((reason) => (
                              <div key={reason} className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="font-medium text-white">{failureReasonConfig[reason].label}</p>
                                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                                    {reason.replace(/_/g, ' ')}
                                  </span>
                                </div>
                                <p className="mt-1.5 text-sm text-muted-foreground">{failureReasonConfig[reason].description}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-border bg-slate-950/60 px-5 py-4 text-sm text-muted-foreground">
                            No failure reasons detected for this request.
                          </div>
                        )}
                      </div>

                      {/* Moderator actions inline */}
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button onClick={() => handleAction('approved')} className="gap-2">
                          <CheckCircle2 className="h-4 w-4" /> Approve request
                        </Button>
                        <Button variant="destructive" onClick={() => handleAction('denied')} className="gap-2">
                          <XCircle className="h-4 w-4" /> Deny request
                        </Button>
                        <Button variant="secondary" onClick={() => handleAction('manually_verified')} className="gap-2">
                          <Sparkles className="h-4 w-4" /> Mark manually verified
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* ── Timeline tab ──────────────────────────────────────── */}
                  {activeTab === 'timeline' && (
                    <div className="animate-in fade-in duration-200">
                      <div className="relative pl-5">
                        <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />
                        {selected.activity.map((event) => (
                          <div key={event.id} className="relative pb-4 last:pb-0">
                            <div className={cn(
                              'absolute left-[-12px] top-[14px] h-2.5 w-2.5 rounded-full border-2 border-card',
                              event.type === 'moderator' ? 'bg-primary' : event.type === 'system' ? 'bg-yellow-400' : 'bg-slate-600'
                            )} />
                            <div className="ml-4 rounded-2xl border border-border bg-slate-950/60 px-4 py-3">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-medium text-white">{event.title}</p>
                                <span className="shrink-0 text-[10px] text-muted-foreground">
                                  {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">{event.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}
          </section>
        </div>
      </PageShell>

      {friendModalOpen && selected && (
        <FriendModal request={selected} onClose={() => setFriendModalOpen(false)} />
      )}
    </DashboardLayout>
  )
}

// ─── Friend modal ─────────────────────────────────────────────────────────────

function FriendModal({ request, onClose }: { request: VerificationRequest; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 p-4 backdrop-blur-sm animate-in fade-in duration-150 sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-2xl animate-in slide-in-from-bottom-4 rounded-3xl border border-border bg-card p-6 shadow-2xl duration-200">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Friend audit</p>
            <h3 className="mt-1 text-xl font-semibold text-white">
              Blacklisted connections
              {request.friendAnalysis.blacklistedFriendsCount > 0 && (
                <span className="ml-2 rounded-full bg-rose-500/15 px-2.5 py-0.5 text-sm text-rose-400">
                  {request.friendAnalysis.blacklistedFriendsCount}
                </span>
              )}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-3 py-1.5 text-sm text-muted-foreground transition hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="mt-5 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
          {request.friendAnalysis.blacklistedFriends.length ? (
            request.friendAnalysis.blacklistedFriends.map((friend) => (
              <div key={friend.id} className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{friend.username}</p>
                    <p className="text-xs text-muted-foreground font-mono">ID: {friend.robloxId}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>Flagged by {friend.moderator}</p>
                    <p>{new Date(friend.addedAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{friend.blacklistReason}</p>
                <a
                  href={friend.evidenceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  View evidence <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-border bg-slate-950/60 p-6 text-center text-sm text-muted-foreground">
              No flagged connections found for this account.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}