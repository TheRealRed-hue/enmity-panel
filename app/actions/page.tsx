'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Header } from '@/components/header'
import { PageShell, Section } from '@/components/ui/page-shell'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Gavel, Ban, UserMinus, Clock, MessageSquareWarning,
  Shield, AlertTriangle, ScrollText, CheckCircle2, Trash2,
  Search, ChevronLeft, ChevronRight, RefreshCw, Loader2,
  XCircle, User, Edit2, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { getClientSession } from '@/lib/session'
import { ROLE_CONFIG, ACTION_TYPE_LABELS } from '@/lib/constants'
import type { ModerationActionType, SeverityLevel, DashboardRole } from '@/types'

// ── Types ──────────────────────────────────────────────────────────────────────

interface CommandDef {
  type: ModerationActionType
  label: string
  description: string
  icon: React.ElementType
  color: string
  defaultSeverity: SeverityLevel
  requiredPermission?: string
  fields: Array<{
    key: string
    label: string
    type: 'text' | 'number' | 'select' | 'textarea'
    required: boolean
    placeholder?: string
    options?: string[]
  }>
}

interface ModeratorOption {
  id: string
  discord_id: string
  username: string
  global_name: string | null
  avatar: string | null
  dashboard_role: DashboardRole
  online: boolean
}

interface ActionLogRow {
  id: string
  action_type: string
  action_description: string
  status: string
  target_id: string
  target_username: string
  assigned_mod_id: string
  assigned_mod_username: string
  assigned_mod_discord: string | null
  creator_mod_id: string
  creator_mod_username: string
  creator_mod_discord: string | null
  severity: string
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

// ── Command definitions ────────────────────────────────────────────────────────

const commands: CommandDef[] = [
  {
    type: 'ban', label: 'Ban',
    description: 'Permanently or temporarily ban a user from the server.',
    icon: Ban, color: 'text-critical-red', defaultSeverity: 'high',
    fields: [
      { key: 'userId', label: 'Discord ID or @user', type: 'text', required: true, placeholder: '123456789012345678' },
      { key: 'reason', label: 'Reason', type: 'textarea', required: true, placeholder: 'Describe the reason for the ban...' },
      { key: 'duration', label: 'Duration (0 = permanent)', type: 'select', required: false, options: ['Permanent', '1 hour', '6 hours', '1 day', '3 days', '7 days', '30 days'] },
      { key: 'deleteMessages', label: 'Delete messages (days)', type: 'select', required: false, options: ['None', '1 day', '7 days'] },
    ],
  },
  {
    type: 'kick', label: 'Kick',
    description: 'Eject a user from the server without banning.',
    icon: UserMinus, color: 'text-warning-amber', defaultSeverity: 'medium',
    fields: [
      { key: 'userId', label: 'Discord ID or @user', type: 'text', required: true, placeholder: '123456789012345678' },
      { key: 'reason', label: 'Reason', type: 'textarea', required: true, placeholder: 'Describe the reason...' },
    ],
  },
  {
    type: 'timeout', label: 'Timeout',
    description: 'Temporarily silence a user.',
    icon: Clock, color: 'text-warning-amber', defaultSeverity: 'low',
    fields: [
      { key: 'userId', label: 'Discord ID or @user', type: 'text', required: true, placeholder: '123456789012345678' },
      { key: 'duration', label: 'Duration', type: 'select', required: true, options: ['60 seconds', '5 minutes', '10 minutes', '1 hour', '6 hours', '1 day', '7 days'] },
      { key: 'reason', label: 'Reason', type: 'textarea', required: true, placeholder: 'Describe the reason...' },
    ],
  },
  {
    type: 'warning', label: 'Warning',
    description: 'Issue a formal warning to a user.',
    icon: MessageSquareWarning, color: 'text-primary', defaultSeverity: 'low',
    fields: [
      { key: 'userId', label: 'Discord ID or @user', type: 'text', required: true, placeholder: '123456789012345678' },
      { key: 'reason', label: 'Reason', type: 'textarea', required: true, placeholder: 'Describe the warning...' },
    ],
  },
  {
    type: 'blacklist', label: 'Blacklist',
    description: 'Add a user or guild to the global blacklist.',
    icon: Shield, color: 'text-critical-red', defaultSeverity: 'critical',
    requiredPermission: 'blacklist',
    fields: [
      { key: 'targetId', label: 'Discord ID (user, guild, server or channel)', type: 'text', required: true, placeholder: '123456789012345678' },
      { key: 'scope', label: 'Scope', type: 'select', required: true, options: ['User', 'Guild', 'Server', 'Channel'] },
      { key: 'reason', label: 'Reason', type: 'textarea', required: true, placeholder: 'Justification for blacklist...' },
      { key: 'severity', label: 'Severity', type: 'select', required: true, options: ['Low', 'Medium', 'High', 'Critical'] },
    ],
  },
  {
    type: 'unblacklist', label: 'Remove Blacklist',
    description: 'Remove a target from the global blacklist.',
    icon: Trash2, color: 'text-warning-amber', defaultSeverity: 'low',
    requiredPermission: 'blacklist',
    fields: [
      { key: 'targetId', label: 'Discord ID (user, guild, server or channel)', type: 'text', required: true, placeholder: '123456789012345678' },
      { key: 'scope', label: 'Scope', type: 'select', required: true, options: ['User', 'Guild', 'Server', 'Channel'] },
      { key: 'reason', label: 'Reason', type: 'textarea', required: true, placeholder: 'Justification for blacklist removal...' },
    ],
  },
]

// ── Status badge ───────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    open:        { label: 'Open',        cls: 'bg-primary/20 text-primary border-primary/30' },
    in_progress: { label: 'In Progress', cls: 'bg-warning-amber/20 text-warning-amber border-warning-amber/30' },
    resolved:    { label: 'Resolved',    cls: 'bg-success-green/20 text-success-green border-success-green/30' },
    closed:      { label: 'Closed',      cls: 'bg-secondary text-muted-foreground border-border' },
  }
  const cfg = map[status] ?? map['open']
  return (
    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border', cfg.cls)}>
      {cfg.label}
    </span>
  )
}

// ── Moderator Search dropdown ──────────────────────────────────────────────────

interface ModSearchProps {
  value: ModeratorOption | null
  onChange: (mod: ModeratorOption | null) => void
  placeholder?: string
}

function ModeratorSearch({ value, onChange, placeholder = 'Search moderators...' }: ModSearchProps) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<ModeratorOption[]>([])
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef           = useRef<HTMLDivElement>(null)
  const debounceRef            = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const doSearch = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/moderators?q=${encodeURIComponent(q)}&limit=10`)
      const json = await res.json()
      setResults(json.data ?? [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value
    setQuery(q)
    setOpen(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(q), 200)
  }

  function handleFocus() {
    setOpen(true)
    if (results.length === 0) doSearch(query)
  }

  function handleSelect(mod: ModeratorOption) {
    onChange(mod)
    setQuery('')
    setOpen(false)
  }

  const roleLabel = (role: DashboardRole) => ROLE_CONFIG[role]?.label ?? role

  return (
    <div ref={containerRef} className="relative">
      {value ? (
        <div className="flex items-center gap-2 px-3 py-2 text-sm bg-secondary/50 border border-primary/40 rounded-md">
          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <User size={11} className="text-primary" />
          </div>
          <span className="flex-1 font-medium text-foreground">{value.username}</span>
          <span className="text-xs text-muted-foreground">{roleLabel(value.dashboard_role)}</span>
          {value.online && <span className="w-1.5 h-1.5 rounded-full bg-success-green shrink-0" title="Online" />}
          <button type="button" onClick={() => onChange(null)} className="p-0.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
            <X size={12} />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text" value={query} onChange={handleInput} onFocus={handleFocus}
            placeholder={placeholder}
            className="w-full pl-9 pr-4 py-2 text-sm bg-secondary/50 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin" />}
        </div>
      )}

      {open && !value && (
        <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-lg shadow-xl overflow-hidden max-h-52 overflow-y-auto">
          {loading && results.length === 0 ? (
            <div className="flex items-center justify-center py-6"><Loader2 size={16} className="text-muted-foreground animate-spin" /></div>
          ) : results.length === 0 ? (
            <div className="px-3 py-3 text-xs text-muted-foreground text-center">
              {query.length > 0 ? `No moderators found for "${query}"` : 'Start typing to search...'}
            </div>
          ) : (
            <ul>
              {results.map((mod) => (
                <li key={mod.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(mod)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm hover:bg-secondary/60 transition-colors text-left"
                  >
                    <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center shrink-0 relative">
                      {mod.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`https://cdn.discordapp.com/avatars/${mod.discord_id}/${mod.avatar}.webp?size=32`}
                          alt={mod.username}
                          className="w-full h-full rounded-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      ) : (
                        <User size={12} className="text-muted-foreground" />
                      )}
                      {mod.online && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-success-green border border-card" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{mod.username}</p>
                      {mod.global_name && mod.global_name !== mod.username && (
                        <p className="text-xs text-muted-foreground truncate">{mod.global_name}</p>
                      )}
                    </div>
                    <span className={cn(
                      'text-[10px] font-medium px-1.5 py-0.5 rounded shrink-0',
                      ROLE_CONFIG[mod.dashboard_role]?.bgColor ?? 'bg-secondary',
                      ROLE_CONFIG[mod.dashboard_role]?.color ?? 'text-muted-foreground',
                    )}>
                      {roleLabel(mod.dashboard_role)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// ── Constants ──────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 15

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function ActionsPage() {
  const session           = getClientSession()
  const canViewLogs       = session?.permissions.includes('view_logs') ?? false
  const canEdit           = session ? ['owner','administrator','head_moderator','senior_moderator','moderator'].includes(session.dashboardRole) : false
  const canDelete         = session ? ['owner','administrator','head_moderator'].includes(session.dashboardRole) : false

  // Form state
  const [selected, setSelected]       = useState<CommandDef | null>(null)
  const [formData, setFormData]       = useState<Record<string, string>>({})
  const [assignedMod, setAssignedMod] = useState<ModeratorOption | null>(null)
  const [confirming, setConfirming]   = useState(false)
  const [submitting, setSubmitting]   = useState(false)

  // Feedback
  const [successMsg, setSuccessMsg]   = useState<string | null>(null)
  const [errorMsg, setErrorMsg]       = useState<string | null>(null)

  // Logs list
  const [logs, setLogs]               = useState<ActionLogRow[]>([])
  const [logsTotal, setLogsTotal]     = useState(0)
  const [logsLoading, setLogsLoading] = useState(true)
  const [logsPage, setLogsPage]       = useState(1)
  const [logsSearch, setLogsSearch]   = useState('')
  const [logsFilter, setLogsFilter]   = useState<string>('all')

  // Edit modal
  const [editingLog, setEditingLog]   = useState<ActionLogRow | null>(null)
  const [editStatus, setEditStatus]   = useState('')
  const [editSaving, setEditSaving]   = useState(false)

  // ── Fetch logs ─────────────────────────────────────────────────────────────

  const fetchLogs = useCallback(async () => {
    if (!canViewLogs) { setLogsLoading(false); return }
    setLogsLoading(true)
    try {
      const params = new URLSearchParams({
        limit:  String(ITEMS_PER_PAGE),
        offset: String((logsPage - 1) * ITEMS_PER_PAGE),
      })
      if (logsFilter !== 'all') params.set('status', logsFilter)
      if (logsSearch.trim()) params.set('search', logsSearch.trim())
      const res = await fetch(`/api/action-logs?${params}`)
      if (!res.ok) throw new Error()
      const json = await res.json()
      setLogs(json.data ?? [])
      setLogsTotal(json.total ?? 0)
    } catch {
      // silent — keep existing data
    } finally {
      setLogsLoading(false)
    }
  }, [canViewLogs, logsPage, logsFilter, logsSearch])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  // ── Realtime ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!canViewLogs) return
    const channel = supabase
      .channel('action_logs_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'action_logs' }, () => { fetchLogs() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [canViewLogs, fetchLogs])

  // ── Helpers ────────────────────────────────────────────────────────────────

  function handleSelect(cmd: CommandDef) {
    setSelected(cmd); setFormData({}); setAssignedMod(null)
    setConfirming(false); setSuccessMsg(null); setErrorMsg(null)
  }

  function handleChange(key: string, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!confirming) { setConfirming(true); return }
    if (!selected || !session || submitting) return

    if (selected.requiredPermission && !session.permissions.includes(selected.requiredPermission as never)) {
      setErrorMsg('You do not have permission to perform this action.')
      setConfirming(false); return
    }
    if (!assignedMod) {
      setErrorMsg('Please select an assigned moderator.')
      setConfirming(false); return
    }

    setSubmitting(true); setSuccessMsg(null); setErrorMsg(null)

    try {
      const userId = formData['userId'] || formData['targetId'] || 'unknown'

      // Handle blacklist-specific DB writes
      if (selected.type === 'blacklist') {
        const { error } = await supabase.from('blacklist').insert({
          scope:             (formData['scope'] as string)?.toLowerCase() ?? 'user',
          target_id:         userId, target_username: userId,
          reason:            formData['reason'] ?? '',
          added_by_id:       session.discordId,
          added_by_username: session.username,
          expires_at:        null,
          severity:          (formData['severity'] ?? 'low').toLowerCase(),
          created_at:        new Date().toISOString(),
        })
        if (error) { setErrorMsg(`Blacklist failed: ${error.message}`); setSubmitting(false); setConfirming(false); return }
      }

      if (selected.type === 'unblacklist') {
        const scope = (formData['scope'] as string)?.toLowerCase() ?? 'user'
        const { data, error } = await supabase.from('blacklist').delete().select('*').eq('target_id', userId).eq('scope', scope)
        if (error) { setErrorMsg(`Remove blacklist failed: ${error.message}`); setSubmitting(false); setConfirming(false); return }
        if (!data?.length) { setErrorMsg('No blacklist entry found matching that target and scope.'); setSubmitting(false); setConfirming(false); return }
      }

      // Create Action Log (POST to API — handles audit + notification)
      const res = await fetch('/api/action-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type:           selected.type,
          action_description:    formData['reason'] ?? `${selected.label} applied`,
          severity:              selected.defaultSeverity,
          metadata:              { ...formData },
          target_id:             userId,
          target_username:       userId.length > 10 ? `User#${userId.slice(-4)}` : userId,
          assigned_mod_id:       assignedMod.discord_id,
          assigned_mod_username: assignedMod.username,
          assigned_mod_discord:  assignedMod.discord_id,
          creator_mod_id:        session.discordId,
          creator_mod_username:  session.username,
          creator_mod_discord:   session.discordId,
          creator_dashboard_role: session.dashboardRole,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setErrorMsg(body?.error ?? 'Failed to create Action Log.')
        setSubmitting(false); setConfirming(false); return
      }

      setSuccessMsg(`${selected.label} logged successfully. Assigned to ${assignedMod.username}.`)
      setConfirming(false); setSelected(null); setFormData({}); setAssignedMod(null)
      setLogsPage(1)
      setTimeout(() => setSuccessMsg(null), 5000)
    } catch {
      setErrorMsg('An unexpected error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Edit / Delete ──────────────────────────────────────────────────────────

  async function handleSaveEdit() {
    if (!editingLog || !session) return
    setEditSaving(true)
    try {
      const res = await fetch(`/api/action-logs/${editingLog.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: editStatus, editor_dashboard_role: session.dashboardRole, editor_mod_id: session.discordId, editor_mod_username: session.username }),
      })
      if (!res.ok) throw new Error()
      setEditingLog(null)
      fetchLogs()
    } catch { /* handled by UI */ } finally { setEditSaving(false) }
  }

  async function handleDelete(log: ActionLogRow) {
    if (!session || !confirm(`Delete Action Log #${log.id.slice(0, 8)}? This cannot be undone.`)) return
    try {
      await fetch(`/api/action-logs/${log.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleter_dashboard_role: session.dashboardRole, deleter_mod_id: session.discordId, deleter_mod_username: session.username }),
      })
      fetchLogs()
    } catch { /* silent */ }
  }

  const isValid     = selected ? selected.fields.filter((f) => f.required).every((f) => formData[f.key]?.trim()) : false
  const totalPages  = Math.max(1, Math.ceil(logsTotal / ITEMS_PER_PAGE))

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <Header title="Mod Actions" subtitle="Execute and log Discord bot commands" />

      <PageShell>
        {/* Banners */}
        {successMsg && (
          <div className="flex items-center gap-2.5 p-3 rounded-md bg-success-green/10 border border-success-green/30">
            <CheckCircle2 size={15} className="text-success-green shrink-0" />
            <p className="text-xs font-medium text-success-green flex-1">{successMsg}</p>
            <button onClick={() => setSuccessMsg(null)} className="text-success-green/60 hover:text-success-green"><X size={13} /></button>
          </div>
        )}
        {errorMsg && (
          <div className="flex items-center gap-2.5 p-3 rounded-md bg-critical-red/10 border border-critical-red/30">
            <XCircle size={15} className="text-critical-red shrink-0" />
            <p className="text-xs font-medium text-critical-red flex-1">{errorMsg}</p>
            <button onClick={() => setErrorMsg(null)} className="text-critical-red/60 hover:text-critical-red"><X size={13} /></button>
          </div>
        )}

        {/* Command + Form panel */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
          <Section title="Available Commands">
            <ul className="space-y-1">
              {commands.map((cmd) => {
                const isRestricted = !!cmd.requiredPermission && !session?.permissions.includes(cmd.requiredPermission as never)
                const CommandIcon  = cmd.icon
                return (
                  <li key={cmd.type}>
                    <button
                      type="button"
                      disabled={isRestricted}
                      title={isRestricted ? 'Insufficient permissions' : undefined}
                      onClick={() => handleSelect(cmd)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors text-left',
                        selected?.type === cmd.type
                          ? 'bg-primary/15 border border-primary/30 text-foreground'
                          : 'text-muted-foreground border border-transparent',
                        isRestricted ? 'opacity-50 cursor-not-allowed' : 'hover:bg-secondary/60 hover:text-foreground'
                      )}
                    >
                      <CommandIcon size={16} className={cmd.color} />
                      <div>
                        <p className="font-medium">{cmd.label}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{cmd.description}</p>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </Section>

          <Section title={selected ? (ACTION_TYPE_LABELS[selected.type] ?? selected.label) : 'Select a command'}>
            <div className="rounded-lg bg-card border border-border">
              {!selected ? (
                <EmptyState icon={Gavel} title="Select a command" description="Choose an action from the list on the left to configure and execute." />
              ) : (
                <div className="p-5 space-y-4">
                  <p className="text-sm text-muted-foreground">{selected.description}</p>

                  <div className="space-y-3">
                    {selected.fields.map((field) => (
                      <div key={field.key}>
                        <label className="block text-xs font-medium text-foreground mb-1">
                          {field.label}{field.required && <span className="text-critical-red ml-1">*</span>}
                        </label>
                        {field.type === 'textarea' ? (
                          <textarea value={formData[field.key] ?? ''} onChange={(e) => handleChange(field.key, e.target.value)} placeholder={field.placeholder} rows={3}
                            className="w-full px-3 py-2 text-sm bg-secondary/50 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none" />
                        ) : field.type === 'select' ? (
                          <select value={formData[field.key] ?? ''} onChange={(e) => handleChange(field.key, e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-secondary/50 border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40">
                            <option value="">Select...</option>
                            {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        ) : (
                          <input type="text" value={formData[field.key] ?? ''} onChange={(e) => handleChange(field.key, e.target.value)} placeholder={field.placeholder}
                            className="w-full px-3 py-2 text-sm bg-secondary/50 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40" />
                        )}
                      </div>
                    ))}

                    {/* Assigned Moderator — searchable */}
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        Assigned Moderator<span className="text-critical-red ml-1">*</span>
                      </label>
                      <ModeratorSearch value={assignedMod} onChange={setAssignedMod} placeholder="Type to search moderators..." />
                      <p className="text-[11px] text-muted-foreground mt-1">The moderator responsible for handling this action.</p>
                    </div>

                    {/* Creator info (read-only) */}
                    {session && (
                      <div className="rounded-md bg-secondary/30 border border-border px-3 py-2 space-y-0.5">
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Created By (you)</p>
                        <p className="text-xs text-foreground font-medium">{session.username}</p>
                        <p className="text-[11px] text-muted-foreground">ID: {session.discordId}</p>
                      </div>
                    )}
                  </div>

                  {confirming && (
                    <div className="flex items-start gap-2.5 p-3 rounded-md bg-warning-amber/10 border border-warning-amber/30">
                      <AlertTriangle size={15} className="text-warning-amber shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-warning-amber">Confirm action</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          This will permanently create an Action Log in Supabase and trigger a notification.
                          {assignedMod && ` Assigned to: ${assignedMod.username}.`}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={handleSubmit}
                      disabled={!isValid || !assignedMod || submitting}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
                        confirming
                          ? 'bg-critical-red/20 hover:bg-critical-red/30 text-critical-red border border-critical-red/30'
                          : 'bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30'
                      )}
                    >
                      {submitting && <Loader2 size={13} className="animate-spin" />}
                      {confirming ? 'Confirm & Create Log' : 'Prepare Action'}
                    </button>
                    {confirming && (
                      <button onClick={() => setConfirming(false)} disabled={submitting}
                        className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-40">
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Section>
        </div>

        {/* Action Logs table */}
        {canViewLogs && (
          <Section title="Action Logs" description="Persistent Supabase records — real-time updates enabled">
            <div className="flex flex-col sm:flex-row gap-3 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input type="text" placeholder="Search target, moderator, description..." value={logsSearch}
                  onChange={(e) => { setLogsSearch(e.target.value); setLogsPage(1) }}
                  className="w-full pl-9 pr-4 py-2 text-sm bg-secondary/50 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40" />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map((f) => (
                  <button key={f} onClick={() => { setLogsFilter(f); setLogsPage(1) }}
                    className={cn(
                      'px-3 py-2 rounded-md text-xs font-medium transition-colors',
                      logsFilter === f ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-secondary/60 text-muted-foreground hover:text-foreground border border-border'
                    )}>
                    {f === 'in_progress' ? 'In Progress' : f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
                <button onClick={fetchLogs} title="Refresh"
                  className="px-2 py-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-secondary border border-border transition-colors">
                  <RefreshCw size={13} className={logsLoading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            <div className="rounded-lg bg-card border border-border overflow-hidden">
              <div className="hidden md:grid grid-cols-[1fr_1.2fr_1.2fr_1fr_80px_100px] gap-3 px-4 py-2.5 border-b border-border bg-secondary/20 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                <span>Target</span><span>Assigned To</span><span>Created By</span><span>Type / Description</span><span>Status</span><span>Date</span>
              </div>

              {logsLoading ? (
                <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                  <Loader2 size={16} className="animate-spin" /><span className="text-xs">Loading...</span>
                </div>
              ) : logs.length === 0 ? (
                <EmptyState icon={ScrollText} title="No action logs found"
                  description={logsSearch || logsFilter !== 'all' ? 'No logs match the applied filters.' : 'Action logs will appear here once created.'} />
              ) : (
                <ul className="divide-y divide-border">
                  {logs.map((log) => (
                    <li key={log.id} className="group px-4 py-3 hover:bg-secondary/20 transition-colors">
                      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr_1.2fr_1fr_80px_100px] gap-2 md:gap-3 items-start md:items-center">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{log.target_username}</p>
                          <p className="text-[11px] text-muted-foreground font-mono truncate">{log.target_id}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{log.assigned_mod_username}</p>
                          {log.assigned_mod_discord && <p className="text-[11px] text-muted-foreground font-mono truncate">{log.assigned_mod_discord}</p>}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground truncate">{log.creator_mod_username}</p>
                          {log.creator_mod_discord && <p className="text-[11px] text-muted-foreground font-mono truncate">{log.creator_mod_discord}</p>}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-foreground capitalize">
                            {ACTION_TYPE_LABELS[log.action_type as ModerationActionType] ?? log.action_type}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">{log.action_description}</p>
                        </div>
                        <div><StatusBadge status={log.status} /></div>
                        <div className="flex items-center justify-between md:flex-col md:items-end gap-1">
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                            {new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            {' '}{new Date(log.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {canEdit && (
                              <button onClick={() => { setEditingLog(log); setEditStatus(log.status) }}
                                className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground" title="Edit status">
                                <Edit2 size={12} />
                              </button>
                            )}
                            {canDelete && (
                              <button onClick={() => handleDelete(log)}
                                className="p-1 rounded hover:bg-critical-red/10 transition-colors text-muted-foreground hover:text-critical-red" title="Delete">
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {logsTotal > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">{logsTotal} total entries</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setLogsPage((p) => Math.max(1, p - 1))} disabled={logsPage === 1}
                      className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground disabled:opacity-40"><ChevronLeft size={14} /></button>
                    <span className="text-xs text-muted-foreground">{logsPage} / {totalPages}</span>
                    <button onClick={() => setLogsPage((p) => Math.min(totalPages, p + 1))} disabled={logsPage === totalPages}
                      className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground disabled:opacity-40"><ChevronRight size={14} /></button>
                  </div>
                </div>
              )}
            </div>
          </Section>
        )}
      </PageShell>

      {/* Edit Status Modal */}
      {editingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl p-6 mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-foreground">Edit Action Log</h2>
              <button onClick={() => setEditingLog(null)} className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <div className="rounded-md bg-secondary/30 border border-border px-3 py-2 space-y-1 text-xs">
                <p><span className="text-muted-foreground">Log ID:</span> <span className="font-mono text-foreground">{editingLog.id.slice(0, 16)}...</span></p>
                <p><span className="text-muted-foreground">Type:</span> <span className="text-foreground capitalize">{ACTION_TYPE_LABELS[editingLog.action_type as ModerationActionType] ?? editingLog.action_type}</span></p>
                <p><span className="text-muted-foreground">Target:</span> <span className="text-foreground">{editingLog.target_username}</span></p>
                <p><span className="text-muted-foreground">Assigned to:</span> <span className="text-foreground">{editingLog.assigned_mod_username}</span></p>
                <p><span className="text-muted-foreground">Created by:</span> <span className="text-foreground">{editingLog.creator_mod_username}</span></p>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Status</label>
                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-secondary/50 border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40">
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-5">
              <button onClick={handleSaveEdit} disabled={editSaving}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 transition-colors disabled:opacity-40">
                {editSaving && <Loader2 size={13} className="animate-spin" />}
                Save Changes
              </button>
              <button onClick={() => setEditingLog(null)} className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
