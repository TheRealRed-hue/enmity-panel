'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Header } from '@/components/header'
import { PageShell, Section } from '@/components/ui/page-shell'
import { EmptyState } from '@/components/ui/empty-state'
import { SeverityBadge } from '@/components/ui/severity-badge'
import {
  Ban,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Users,
  Server,
  Hash,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { getClientSession } from '@/lib/session'
import { addNotification } from '@/lib/notifications'
import type { BlacklistEntry, BlacklistScope } from '@/types'

const BLACKLIST_TABLE = 'blacklist'
const ITEMS_PER_PAGE = 25

const scopeLabels: Record<BlacklistScope, { label: string; icon: React.ElementType }> = {
  user: { label: 'User', icon: Users },
  guild: { label: 'Guild', icon: Server },
  server: { label: 'Server', icon: Server },
  channel: { label: 'Channel', icon: Hash },
}

function AddBlacklistModal({
  onClose,
  onAdded,
  onLogAction,
}: {
  onClose: () => void
  onAdded: () => void
  onLogAction: (action: 'blacklist' | 'unblacklist') => Promise<void>
}) {
  const [scope, setScope] = useState<BlacklistScope>('user')
  const [targetId, setTargetId] = useState('')
  const [targetName, setTargetName] = useState('')
  const [reason, setReason] = useState('')
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('critical')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setError(null)

    if (!targetId.trim() || !reason.trim()) {
      setError('Target ID and reason are required.')
      return
    }

    setSaving(true)
    const session = getClientSession()
    const currentTimestamp = new Date().toISOString()
    const { error: insertError } = await supabase.from(BLACKLIST_TABLE).insert({
      scope,
      target_id: targetId.trim(),
      target_username: targetName.trim() || targetId.trim(),
      reason: reason.trim(),
      added_by_id: session?.discordId ?? 'dashboard_user',
      added_by_username: session?.username ?? 'Dashboard',
      expires_at: null,
      severity,
      created_at: currentTimestamp,
    })

    setSaving(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    addNotification({
      type: 'mod_action',
      title: 'Blacklist added',
      body: `${session?.username ?? 'A moderator'} blacklisted ${targetName.trim() || targetId.trim()}`,
    })

    await onLogAction('blacklist')
    onAdded()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="w-full max-w-xl rounded-xl bg-card border border-border p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-foreground">Add blacklist entry</h2>
          <button onClick={onClose} className="p-2 rounded hover:bg-secondary transition-colors text-muted-foreground">
            ×
          </button>
        </div>

        <div className="grid gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-2 text-xs text-muted-foreground">
              <span>Target ID</span>
              <input
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm"
                placeholder="123456789012345678"
              />
            </label>
            <label className="space-y-2 text-xs text-muted-foreground">
              <span>Target name</span>
              <input
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm"
                placeholder="Optional display name"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-2 text-xs text-muted-foreground">
              <span>Scope</span>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as BlacklistScope)}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm"
              >
                {(['user', 'guild', 'server', 'channel'] as const).map((scopeOption) => (
                  <option key={scopeOption} value={scopeOption}>
                    {scopeLabels[scopeOption].label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-xs text-muted-foreground">
              <span>Severity</span>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as 'low' | 'medium' | 'high' | 'critical')}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>
          </div>

          <label className="space-y-2 text-xs text-muted-foreground">
            <span>Reason</span>
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm"
              placeholder="Describe why this target is blacklisted..."
            />
          </label>


          {error && (
            <div className="rounded-md bg-critical-red/10 border border-critical-red/20 p-3 text-xs text-critical-red">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm text-muted-foreground bg-secondary/70 hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-md text-sm text-background bg-primary hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save entry'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function BlacklistPage() {
  const [entries, setEntries] = useState<BlacklistEntry[]>([])
  const [search, setSearch] = useState('')
  const [scopeFilter, setScopeFilter] = useState<BlacklistScope | 'all'>('all')
  const [page, setPage] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [deletingIds, setDeletingIds] = useState<string[]>([])
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const session = getClientSession()
  const canManageBlacklist = session?.permissions.includes('blacklist') ?? false

  function normalizeBlacklistEntry(entry: Record<string, any>): BlacklistEntry {
    return {
      id: entry.id,
      scope: entry.scope,
      targetId: entry.target_id ?? entry.targetId ?? '',
      targetName: entry.target_username ?? entry.targetName ?? entry.target_id ?? entry.targetId ?? '',
      reason: entry.reason ?? '',
      addedBy: entry.added_by_id ?? entry.addedBy ?? 'dashboard_user',
      addedByUsername: entry.added_by_username ?? entry.addedByUsername ?? 'Dashboard',
      permanent: entry.expires_at == null,
      expiresAt: entry.expires_at ?? null,
      evidence: Array.isArray(entry.evidence) ? entry.evidence : [],
      relatedEntries: Array.isArray(entry.related_entries) ? entry.related_entries : [],
      severity: entry.severity ?? 'low',
      createdAt: entry.created_at ?? entry.createdAt ?? new Date().toISOString(),
      updatedAt: entry.updated_at ?? entry.updatedAt ?? entry.created_at ?? entry.createdAt ?? new Date().toISOString(),
    }
  }

  async function fetchEntries() {
    setLoading(true)
    const { data, error } = await supabase
      .from(BLACKLIST_TABLE)
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setFetchError(error.message)
      setEntries([])
    } else {
      setEntries((data ?? []).map(normalizeBlacklistEntry))
      setFetchError(null)
    }
    setLoading(false)
  }

  async function recordModeratorAction(action: 'blacklist' | 'unblacklist') {
    const session = getClientSession()
    if (!session) return

    try {
      const response = await fetch('/api/logs/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discordId: session.discordId,
          username: session.username,
          action,
          dashboardRole: session.dashboardRole,
        }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        console.error('Access log failed', action, response.status, body)
      }
    } catch (err) {
      console.error('Access log request failed', action, err)
    }
  }

  async function handleRemoveEntry(entry: BlacklistEntry) {
    if (!canManageBlacklist) {
      setDeleteError('Você não tem permissão para remover entradas da blacklist.')
      return
    }

    const confirmed = window.confirm(`Remove blacklist entry for ${entry.targetName || entry.targetId}?`)
    if (!confirmed) return

    const session = getClientSession()
    setDeleteError(null)
    setDeletingIds((prev) => [...prev, entry.id])

    const { error } = await supabase.from(BLACKLIST_TABLE).delete().eq('id', entry.id)

    if (error) {
      setDeleteError(error.message)
      setDeletingIds((prev) => prev.filter((id) => id !== entry.id))
      return
    }

    await fetchEntries()
    setDeletingIds((prev) => prev.filter((id) => id !== entry.id))

    addNotification({
      type: 'mod_action',
      title: 'Blacklist removed',
      body: `${session?.username ?? 'A moderator'} removed ${entry.targetName || entry.targetId} from the blacklist`,
    })

    await recordModeratorAction('unblacklist')
  }

  useEffect(() => {
    fetchEntries()

    const channel = supabase
      .channel('blacklist-entries')
      .on('postgres_changes', { event: '*', schema: 'public', table: BLACKLIST_TABLE }, () => {
        fetchEntries()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const filtered = entries.filter((e) => {
    const matchesScope = scopeFilter === 'all' || e.scope === scopeFilter
    const matchesSearch =
      !search ||
      e.targetName.toLowerCase().includes(search.toLowerCase()) ||
      e.targetId.includes(search) ||
      e.reason.toLowerCase().includes(search.toLowerCase())
    return matchesScope && matchesSearch
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const counts = {
    user: entries.filter((e) => e.scope === 'user').length,
    guild: entries.filter((e) => e.scope === 'guild').length,
    server: entries.filter((e) => e.scope === 'server').length,
    channel: entries.filter((e) => e.scope === 'channel').length,
  }

  return (
    <DashboardLayout>
      <Header
        title="Blacklist"
        subtitle="Management of banned users, guilds, servers and channels"
        actions={
          canManageBlacklist ? (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-critical-red/20 hover:bg-critical-red/30 transition-colors text-critical-red border border-critical-red/30"
            >
              <Plus size={13} />
              Add
            </button>
          ) : (
            <div className="text-xs text-muted-foreground">Only higher up + can blacklist people</div>
          )
        }
      />

      <PageShell>
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(
            [
              { scope: 'user', label: 'Users', color: 'text-critical-red', bg: 'bg-critical-red/10 border-critical-red/20' },
              { scope: 'guild', label: 'Guilds', color: 'text-warning-amber', bg: 'bg-warning-amber/10 border-warning-amber/20' },
              { scope: 'server', label: 'Servers', color: 'text-muted-foreground', bg: 'bg-secondary border-border' },
              { scope: 'channel', label: 'Channels', color: 'text-primary', bg: 'bg-primary/10 border-primary/20' },
            ] as const
          ).map((item) => (
            <div key={item.scope} className={cn('rounded-lg border p-3', item.bg)}>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={cn('text-2xl font-semibold mt-1 tabular-nums', item.color)}>
                {counts[item.scope]}
              </p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <Section>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, ID or reason..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-9 pr-4 py-2 text-sm bg-secondary/50 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>

            <div className="flex items-center gap-1 border border-border rounded-md p-1">
              {(['all', 'user', 'guild', 'server', 'channel'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => { setScopeFilter(s); setPage(1) }}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                    scopeFilter === s
                      ? 'bg-primary/20 text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {s === 'all' ? 'All' : scopeLabels[s].label}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* Table */}
        <Section>
          <div className="rounded-lg bg-card border border-border overflow-hidden">
            <div className="hidden md:grid grid-cols-[2fr_1fr_2fr_1fr_1fr_100px] gap-4 px-4 py-2.5 border-b border-border bg-secondary/20 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <span>Target</span>
              <span>Type</span>
              <span>Reason</span>
              <span>Added by</span>
              <span>Severity</span>
              <span>Date</span>
            </div>

            {paginated.length === 0 ? (
              <EmptyState
                icon={Ban}
                title="Empty blacklist"
                description={
                  loading
                    ? 'Loading blacklist entries…'
                    : fetchError
                      ? fetchError
                      : entries.length === 0
                        ? 'Banned users, guilds, servers and channels will appear here after database integration.'
                        : 'No records match the applied filters.'
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {paginated.map((entry) => (
                  <BlacklistRow
                    key={entry.id}
                    entry={entry}
                    onRemove={handleRemoveEntry}
                    deleting={deletingIds.includes(entry.id)}
                    canManageBlacklist={canManageBlacklist}
                  />
                ))}
              </ul>
            )}

            {filtered.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  {filtered.length} record{filtered.length !== 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </Section>
      </PageShell>

      {deleteError && (
        <div className="my-4 rounded-md bg-critical-red/10 border border-critical-red/20 p-3 text-xs text-critical-red">
          {deleteError}
        </div>
      )}
      {showAddModal && (
        <AddBlacklistModal
          onClose={() => setShowAddModal(false)}
          onAdded={fetchEntries}
          onLogAction={recordModeratorAction}
        />
      )}
    </DashboardLayout>
  )
}

function BlacklistRow({
  entry,
  onRemove,
  deleting,
  canManageBlacklist,
}: {
  entry: BlacklistEntry
  onRemove?: (entry: BlacklistEntry) => void
  deleting?: boolean
  canManageBlacklist: boolean
}) {
  const scope = scopeLabels[entry.scope]

  return (
    <li className="grid grid-cols-1 md:grid-cols-[2fr_1fr_2fr_1fr_1fr_100px] gap-2 md:gap-4 px-4 py-3 text-sm hover:bg-secondary/20 transition-colors">
      <div>
        <p className="font-medium text-foreground truncate">{entry.targetName}</p>
        <p className="text-xs text-muted-foreground">{entry.targetId}</p>
      </div>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <scope.icon size={13} />
        <span>{scope.label}</span>
      </div>
      <div className="text-muted-foreground truncate">{entry.reason}</div>
      <div className="text-muted-foreground truncate">{entry.addedByUsername}</div>
      <SeverityBadge severity={entry.severity} />
      <div className="text-xs text-muted-foreground flex flex-col gap-2">
        <span>{new Date(entry.createdAt).toLocaleDateString('en-US')}</span>
        {onRemove ? (
          <button
            type="button"
            onClick={() => onRemove(entry)}
            disabled={deleting || !canManageBlacklist}
            className={cn(
              'inline-flex items-center justify-center rounded-md border border-border px-2 py-1 text-xs',
              'text-muted-foreground hover:bg-secondary/70 hover:text-foreground disabled:opacity-40',
              !canManageBlacklist && 'cursor-not-allowed'
            )}
          >
            <Trash2 size={14} />
          </button>
        ) : null}
      </div>
    </li>
  )
}
