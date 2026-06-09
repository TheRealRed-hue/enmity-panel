"use client"

import { useMemo, useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Header } from '@/components/header'
import { PageShell } from '@/components/ui/page-shell'
import ModerationLogCard from '@/components/ui/moderation-log-card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import {
  Search, Copy, Loader2, ScrollText, Plus, Pencil, Trash2,
  ChevronDown, ChevronUp, ShieldAlert, Users, CheckCircle2,
  Clock, FileText, Eye, AlertTriangle, Activity, BarChart3,
  X, ExternalLink, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { getClientSession } from '@/lib/session'

// ── Mock data ──────────────────────────────────────────────────────────────────

const MOCK_INFRACTIONS: Record<string, any[]> = {}

// ── Helpers ────────────────────────────────────────────────────────────────────

function rowToCase(row: any) {
  return {
    id:         row.id,
    caseId:     row.case_id,
    createdAt:  row.created_at,
    updatedAt:  row.updated_at,
    appealable: row.appealable,
    status:     row.status,
    moderator:  { discordId: row.moderator_discord_id, username: row.moderator_username, avatar: row.moderator_avatar },
    target:     { ingameName: row.target_ingame_name ?? row.target_roblox_id ?? 'Unknown', discordId: row.target_discord_id ?? '' },
    reason:     row.reason,
    conclusion: { type: row.punishment_type, text: row.punishment_text ?? row.punishment_type },
    modsInCharge: row.mods_in_charge ?? [],
    evidence:   row.evidence ?? [],
    metrics:    row.metrics ?? { riskLevel: 'LOW', previousInfractions: 0, relatedCases: 0, linkedAccounts: 0, blacklistMatches: 0 },
    timeline:   row.timeline ?? [],
    notes:      row.notes,
  }
}

function riskColor(level: string) {
  switch (level?.toUpperCase()) {
    case 'HIGH':     return 'text-critical-red bg-critical-red/10 border-critical-red/30'
    case 'MEDIUM':   return 'text-warning-amber bg-warning-amber/10 border-warning-amber/30'
    case 'LOW':      return 'text-success-green bg-success-green/10 border-success-green/30'
    default:         return 'text-muted-foreground bg-secondary border-border'
  }
}

function punishmentColor(type: string) {
  switch (type) {
    case 'Permanent Ban': case 'Blacklist': return 'bg-critical-red/15 text-critical-red border-critical-red/30'
    case 'Temporary Ban': return 'bg-warning-amber/15 text-warning-amber border-warning-amber/30'
    case 'Mute':          return 'bg-primary/15 text-primary border-primary/30'
    case 'Warning':       return 'bg-success-green/15 text-success-green border-success-green/30'
    default:              return 'bg-secondary text-muted-foreground border-border'
  }
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)   return 'just now'
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, title, value, sub, color = 'text-primary', loading,
}: {
  icon: React.ElementType; title: string; value: number | string
  sub?: string; color?: string; loading?: boolean
}) {
  return (
    <div className="rounded-lg border border-border p-4 bg-card flex items-start gap-3">
      <div className={cn('p-2 rounded-md bg-secondary/60', color.replace('text-', 'text-').replace('text-', ''))}>
        <Icon size={16} className={color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5">{loading ? <Loader2 size={16} className="animate-spin inline" /> : value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Case list item ─────────────────────────────────────────────────────────────

function CaseListItem({
  c, isSelected, onClick,
}: { c: any; isSelected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-2.5 rounded-lg transition-all border group',
        isSelected
          ? 'bg-primary/10 border-primary/30 shadow-sm'
          : 'hover:bg-secondary/40 border-transparent hover:border-border'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn('font-mono text-xs font-semibold', isSelected ? 'text-primary' : 'text-foreground')}>
          {c.caseId}
        </span>
        <span className={cn(
          'text-[10px] font-medium px-1.5 py-0.5 rounded border',
          c.status === 'Active'
            ? 'bg-success-green/10 text-success-green border-success-green/30'
            : 'bg-secondary text-muted-foreground border-border'
        )}>
          {c.status}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-1 truncate">{c.target?.ingameName}</p>
      <div className="flex items-center justify-between mt-1.5">
        <span className={cn('text-[10px] font-medium px-1 py-0.5 rounded border', punishmentColor(c.conclusion?.type))}>
          {c.conclusion?.type ?? '—'}
        </span>
        <span className="text-[10px] text-muted-foreground">{timeAgo(c.createdAt)}</span>
      </div>
    </button>
  )
}

// ── Timeline event ─────────────────────────────────────────────────────────────

function TimelineEvent({ text, ts, isLast }: { text: string; ts: string; isLast: boolean }) {
  const isEdit      = text.startsWith('[EDITED]')
  const isEvidence  = text.startsWith('[EVIDENCE]')
  const isDeleted   = text.startsWith('[DELETED]')

  const dotColor = isEdit ? 'bg-warning-amber' : isEvidence ? 'bg-primary' : isDeleted ? 'bg-critical-red' : 'bg-success-green'
  const clean = text.replace(/^\[(EDITED|EVIDENCE|DELETED)\]\s*/, '')
  const label = isEdit ? 'Edited' : isEvidence ? 'Evidence' : isDeleted ? 'Deleted' : 'Event'
  const labelColor = isEdit ? 'text-warning-amber' : isEvidence ? 'text-primary' : isDeleted ? 'text-critical-red' : 'text-success-green'

  return (
    <li className="relative pl-6">
      {!isLast && <div className="absolute left-[9px] top-4 bottom-0 w-px bg-border" />}
      <div className={cn('absolute left-0 top-1.5 w-[18px] h-[18px] rounded-full border-2 border-card flex items-center justify-center', dotColor)}>
        <div className="w-1.5 h-1.5 rounded-full bg-white/80" />
      </div>
      <div className="pb-4">
        <div className="flex items-center gap-2">
          <span className={cn('text-[10px] font-semibold uppercase tracking-wide', labelColor)}>{label}</span>
          <span className="text-[10px] text-muted-foreground">{new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <p className="text-xs text-foreground mt-0.5">{clean}</p>
      </div>
    </li>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AlertsPage() {
  const session = getClientSession()

  // Data
  const [cases, setCases]               = useState<any[]>([])
  const [loading, setLoading]           = useState(true)

  // UI state
  const [query, setQuery]               = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed'>('all')
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [isDetailsCollapsed, setIsDetailsCollapsed] = useState(false)

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen]     = useState(false)
  const [profileOpen, setProfileOpen]   = useState(false)

  // Misc
  const [copiedIdType, setCopiedIdType] = useState<'discord' | 'roblox' | null>(null)
  const [submitting, setSubmitting]     = useState(false)
  const [editData, setEditData]         = useState<Record<string, any>>({})

  // Form
  const emptyForm = {
    caseId: '', robloxUsername: '', robloxUserId: '', discordUsername: '',
    discordId: '', reason: '', punishmentType: 'Warning', duration: '',
    appealable: false, notes: '',
  }
  const [formData, setFormData] = useState(emptyForm)

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchCases = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('cases').select('*').order('created_at', { ascending: false })
      if (!error) setCases((data ?? []).map(rowToCase))
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchCases()
    const ch = supabase.channel('cases_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cases' }, fetchCases)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchCases])

  // ── Create ─────────────────────────────────────────────────────────────────

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)

    let caseId = formData.caseId?.trim()
    if (!caseId) {
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
      caseId = `#ACT-${random}`
    }

    if (cases.some((c) => c.caseId === caseId)) {
      alert(`Case ID "${caseId}" already exists.`)
      setSubmitting(false)
      return
    }

    const payload = {
      caseId,
      status: 'Active',
      appealable: formData.appealable,
      reason: formData.reason,
      punishmentType: formData.punishmentType,
      punishmentText: `${formData.punishmentType}${formData.duration ? ` - ${formData.duration}` : ''}`,
      duration: formData.duration || null,
      notes: formData.notes || null,
      target: { ingameName: formData.robloxUsername, discordId: formData.discordId, robloxId: formData.robloxUserId },
      moderator: { discordId: session?.discordId ?? '', username: session?.username ?? formData.discordUsername, avatar: session?.avatar ?? null },
      modsInCharge: [{ discordId: session?.discordId ?? '', username: session?.username ?? formData.discordUsername, avatar: session?.avatar ?? null }],
      evidence: [],
      metrics: { riskLevel: 'LOW', previousInfractions: 0, relatedCases: 0, linkedAccounts: 0, blacklistMatches: 0 },
      timeline: [{ ts: new Date().toISOString(), text: 'Case Created' }],
    }

    try {
      const res = await fetch('/api/cases', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) { const b = await res.json().catch(() => null); alert(b?.error ?? 'Failed to create.'); setSubmitting(false); return }
      setSelectedCaseId(caseId)
      setFormData(emptyForm)
      setIsCreateOpen(false)
      await fetchCases()
    } catch { alert('Unexpected error.') }
    setSubmitting(false)
  }

  // ── Edit ───────────────────────────────────────────────────────────────────

  const handleEditOpen = () => {
    if (!selected) return
    setEditData({
      reason: selected.reason,
      punishmentType: selected.conclusion.type,
      duration: selected.conclusion.text.split(' - ')[1] || '',
      status: selected.status,
      appealable: selected.appealable,
    })
    setIsEditOpen(true)
  }

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setEditData((prev) => ({ ...prev, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value }))
  }

  const handleEditSave = async () => {
    if (!selected) return
    const changes: string[] = []
    if (editData.reason !== selected.reason) changes.push(`Reason changed to "${editData.reason}"`)
    if (editData.punishmentType !== selected.conclusion.type) changes.push(`Punishment changed to ${editData.punishmentType}`)
    if (editData.status !== selected.status) changes.push(`Status changed to ${editData.status}`)
    if (editData.appealable !== selected.appealable) changes.push(`Appealable changed to ${editData.appealable ? 'Yes' : 'No'}`)

    const newTimeline = changes.length > 0
      ? [...selected.timeline, ...changes.map((text) => ({ ts: new Date().toISOString(), text: `[EDITED] ${text}` }))]
      : selected.timeline

    try {
      await fetch(`/api/cases/${selected.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: editData.reason,
          punishment_type: editData.punishmentType,
          punishment_text: `${editData.punishmentType}${editData.duration ? ` - ${editData.duration}` : ''}`,
          duration: editData.duration || null,
          status: editData.status,
          appealable: editData.appealable,
          timeline: newTimeline,
          moderator_discord_id: session?.discordId,
          moderator_username: session?.username,
          moderator_dashboard_role: session?.dashboardRole,
        }),
      })
      setIsEditOpen(false)
      await fetchCases()
    } catch { alert('Failed to update case.') }
  }

  // ── Evidence ───────────────────────────────────────────────────────────────

  const handleAddEvidence = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selected || !e.currentTarget.files) return
    const newEvidence = Array.from(e.currentTarget.files).map((file, idx) => ({
      id: `ev-${Date.now()}-${idx}`, url: URL.createObjectURL(file), label: file.name,
    }))
    const updatedEvidence = [...selected.evidence, ...newEvidence]
    const updatedTimeline = [...selected.timeline, { ts: new Date().toISOString(), text: `[EVIDENCE] ${newEvidence.length} file(s) uploaded` }]
    fetch(`/api/cases/${selected.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evidence: updatedEvidence, timeline: updatedTimeline }),
    }).then(() => fetchCases())
    e.currentTarget.value = ''
  }

  const handleDeleteEvidence = (evidenceId: string) => {
    if (!selected || !window.confirm('Delete this evidence?')) return
    const deleted = selected.evidence.find((ev: any) => ev.id === evidenceId)
    fetch(`/api/cases/${selected.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evidence: selected.evidence.filter((ev: any) => ev.id !== evidenceId),
        timeline: [...selected.timeline, { ts: new Date().toISOString(), text: `[DELETED] Evidence removed: ${deleted?.label ?? 'unknown'}` }],
      }),
    }).then(() => fetchCases())
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDeleteCase = async () => {
    if (!selected || !window.confirm(`Delete case "${selected.caseId}"? This cannot be undone.`)) return
    await fetch(`/api/cases/${selected.id}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moderator_discord_id: session?.discordId, moderator_username: session?.username, moderator_dashboard_role: session?.dashboardRole, case_id: selected.caseId }),
    })
    setSelectedCaseId(null)
    await fetchCases()
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const filtered = useMemo(() => cases.filter((c) => {
    const q = query.toLowerCase()
    const matchQ = q === '' || c.caseId.toLowerCase().includes(q) || c.target?.ingameName?.toLowerCase().includes(q)
    const matchS = statusFilter === 'all' || (statusFilter === 'active' ? c.status === 'Active' : c.status === 'Closed')
    return matchQ && matchS
  }), [cases, query, statusFilter])

  const selected        = cases.find((c) => c.caseId === selectedCaseId) ?? null
  const relatedCases    = selected ? cases.filter((c) => c.target?.discordId === selected.target?.discordId && c.caseId !== selected.caseId) : []

  // ── Input class helper ─────────────────────────────────────────────────────

  const input = "w-full mt-1 px-3 py-2 rounded-md border border-border bg-secondary/40 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      <Header
        title="Action Logs"
        subtitle="Investigation center for moderation actions"
        actions={
          <button onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus size={14} />
            New Action Log
          </button>
        }
      />

      <PageShell>
        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <StatCard icon={FileText}     title="Total Cases"     value={cases.length}                                         loading={loading} color="text-primary" />
          <StatCard icon={Activity}     title="Active Cases"    value={cases.filter((c) => c.status === 'Active').length}    loading={loading} color="text-success-green"   sub="currently open" />
          <StatCard icon={CheckCircle2} title="Closed Cases"    value={cases.filter((c) => c.status === 'Closed').length}    loading={loading} color="text-muted-foreground" />
          <StatCard icon={ShieldAlert}  title="High Risk"       value={cases.filter((c) => c.metrics?.riskLevel === 'HIGH').length} loading={loading} color="text-critical-red" sub="flagged cases" />
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-12 gap-4">

          {/* ── Left sidebar ── */}
          <aside className="col-span-12 lg:col-span-3 space-y-3">
            {/* Search + filter */}
            <div className="rounded-lg border border-border bg-card p-3 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={13} />
                <input
                  value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search cases or users..."
                  className="w-full pl-8 pr-3 py-1.5 bg-secondary/50 border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>
              <div className="flex gap-1.5">
                {(['all', 'active', 'closed'] as const).map((s) => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={cn('flex-1 py-1.5 text-xs rounded-md font-medium transition-colors border',
                      statusFilter === s ? 'bg-primary/15 text-primary border-primary/30' : 'text-muted-foreground border-border hover:text-foreground hover:bg-secondary/50')}>
                    {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary mini card */}
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5"><BarChart3 size={12} />Summary</p>
              <div className="space-y-1.5">
                {[
                  ['Total',          cases.length],
                  ['Active',         cases.filter((c) => c.status === 'Active').length],
                  ['Closed',         cases.filter((c) => c.status === 'Closed').length],
                  ['Appeal Pending', cases.filter((c) => c.appealable).length],
                ].map(([label, val]) => (
                  <div key={String(label)} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-semibold text-foreground">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Case list */}
            <div className="rounded-lg border border-border bg-card overflow-hidden">
              <div className="px-3 py-2 border-b border-border bg-secondary/20 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {filtered.length} {filtered.length === 1 ? 'case' : 'cases'}
                </span>
              </div>
              <div className="p-2 max-h-[55vh] overflow-y-auto space-y-1">
                {loading ? (
                  <div className="flex items-center justify-center py-8"><Loader2 size={16} className="animate-spin text-muted-foreground" /></div>
                ) : filtered.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-8">No cases found</div>
                ) : filtered.map((c) => (
                  <CaseListItem key={c.caseId} c={c} isSelected={selectedCaseId === c.caseId} onClick={() => setSelectedCaseId(c.caseId)} />
                ))}
              </div>
            </div>
          </aside>

          {/* ── Center panel ── */}
          <main className="col-span-12 lg:col-span-6 space-y-4">
            {selected ? (
              <>
                {/* Case header */}
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-mono text-base font-bold text-foreground">{selected.caseId}</h2>
                        <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full border',
                          selected.status === 'Active'
                            ? 'bg-success-green/10 text-success-green border-success-green/30'
                            : 'bg-secondary text-muted-foreground border-border')}>
                          {selected.status}
                        </span>
                        {selected.appealable && (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/30">
                            Appealable
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                        <Clock size={11} />
                        Created {new Date(selected.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => setIsDetailsCollapsed(!isDetailsCollapsed)}
                        className="p-2 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                        title={isDetailsCollapsed ? 'Show details' : 'Collapse details'}
                      >
                        {isDetailsCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
                      </button>
                      <button onClick={handleEditOpen} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary/80 hover:bg-secondary text-xs font-medium transition-colors">
                        <Pencil size={12} /> Edit
                      </button>
                      <button onClick={handleDeleteCase} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-critical-red/10 text-critical-red hover:bg-critical-red/20 border border-critical-red/20 text-xs font-medium transition-colors">
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </div>

                  {/* Punishment badge row */}
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-md border', punishmentColor(selected.conclusion.type))}>
                      {selected.conclusion.text}
                    </span>
                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded border', riskColor(selected.metrics?.riskLevel))}>
                      Risk: {selected.metrics?.riskLevel ?? 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Collapsible content */}
                {!isDetailsCollapsed && (
                  <>
                    <ModerationLogCard {...selected as any} />

                    {/* Evidence Gallery */}
                    <div className="rounded-lg border border-border bg-card overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/10">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Eye size={14} className="text-muted-foreground" /> Evidence Gallery
                          <span className="text-[11px] font-normal text-muted-foreground ml-1">({selected.evidence.length} file{selected.evidence.length !== 1 ? 's' : ''})</span>
                        </h4>
                        <label className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-primary/15 text-primary hover:bg-primary/25 border border-primary/30 cursor-pointer transition-colors">
                          <Plus size={11} /> Add Evidence
                          <input type="file" multiple accept="image/*,video/*,.pdf" onChange={handleAddEvidence} className="hidden" />
                        </label>
                      </div>
                      <div className="p-3">
                        {selected.evidence.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                            <Eye size={24} className="mb-2 opacity-30" />
                            <p className="text-xs">No evidence uploaded yet</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                            {selected.evidence.map((ev: any) => (
                              <div key={ev.id} className="group relative rounded-lg overflow-hidden border border-border bg-secondary/20">
                                <img src={ev.url} alt={ev.label} className="w-full h-28 object-cover" />
                                <div className="p-2 flex items-center justify-between gap-1">
                                  <p className="text-xs truncate flex-1 text-muted-foreground">{ev.label}</p>
                                  <button onClick={() => handleDeleteEvidence(ev.id)}
                                    className="p-1 rounded hover:bg-critical-red/20 text-critical-red opacity-0 group-hover:opacity-100 transition-all">
                                    <X size={10} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="rounded-lg border border-border bg-card overflow-hidden">
                      <div className="px-4 py-3 border-b border-border bg-secondary/10">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <Clock size={14} className="text-muted-foreground" /> Timeline
                        </h4>
                      </div>
                      <div className="p-4">
                        <ul className="space-y-0">
                          {selected.timeline.map((t: any, i: number) => (
                            <TimelineEvent key={`${t.ts}-${i}`} text={t.text} ts={t.ts} isLast={i === selected.timeline.length - 1} />
                          ))}
                        </ul>
                      </div>
                    </div>
                  </>
                )}

                {/* Edit modal */}
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto" aria-describedby={undefined}>
                    <DialogTitle>Edit Action Log — {selected.caseId}</DialogTitle>
                    <div className="space-y-4 pt-2">
                      <div>
                        <label className="text-xs font-medium text-foreground">Reason</label>
                        <textarea name="reason" value={editData.reason || ''} onChange={handleEditChange} rows={3} className={input} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-foreground">Punishment Type</label>
                          <select name="punishmentType" value={editData.punishmentType || 'Warning'} onChange={handleEditChange} className={input}>
                            <option>Warning</option><option>Mute</option><option>Temporary Ban</option><option>Permanent Ban</option><option>Blacklist</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-foreground">Duration</label>
                          <input type="text" name="duration" value={editData.duration || ''} onChange={handleEditChange} placeholder="e.g. 1 hour" className={input} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-foreground">Status</label>
                          <select name="status" value={editData.status || 'Active'} onChange={handleEditChange} className={input}>
                            <option>Active</option><option>Closed</option><option>Pending Review</option><option>Appealed</option>
                          </select>
                        </div>
                        <div className="flex items-end pb-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" name="appealable" checked={editData.appealable || false} onChange={handleEditChange} className="rounded" />
                            <span className="text-sm">Appealable</span>
                          </label>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <button onClick={() => setIsEditOpen(false)} className="px-3 py-2 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
                        <button onClick={handleEditSave} className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">Save Changes</button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-card/50 p-12 flex flex-col items-center justify-center text-center">
                <ScrollText size={32} className="text-muted-foreground/40 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">Select a case to view details</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Click on any case from the left panel</p>
                <button onClick={() => setIsCreateOpen(true)}
                  className="mt-4 flex items-center gap-2 px-3 py-2 rounded-md bg-primary/15 text-primary text-xs font-medium border border-primary/30 hover:bg-primary/20 transition-colors">
                  <Plus size={12} /> Create Action Log
                </button>
              </div>
            )}
          </main>

          {/* ── Right panel ── */}
          <aside className="col-span-12 lg:col-span-3 space-y-3">
            {/* Investigation metrics */}
            <div className="rounded-lg border border-border bg-card p-3">
              <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5 uppercase tracking-wide">
                <ShieldAlert size={12} /> Investigation Summary
              </h4>
              {selected ? (
                <div className="space-y-2">
                  {[
                    ['Risk Level', selected.metrics?.riskLevel ?? '—'],
                    ['Prev. Infractions', selected.metrics?.previousInfractions ?? 0],
                    ['Related Cases', selected.metrics?.relatedCases ?? 0],
                    ['Linked Accounts', selected.metrics?.linkedAccounts ?? 0],
                    ['Blacklist Matches', selected.metrics?.blacklistMatches ?? 0],
                  ].map(([label, val]) => (
                    <div key={String(label)} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{label}</span>
                      <span className={cn('font-semibold',
                        label === 'Risk Level' && String(val) === 'HIGH' ? 'text-critical-red' :
                        label === 'Risk Level' && String(val) === 'MEDIUM' ? 'text-warning-amber' :
                        label === 'Risk Level' ? 'text-success-green' : 'text-foreground'
                      )}>{val}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground/60 text-center py-3">No case selected</p>
              )}
            </div>

            {/* Moderators */}
            <div className="rounded-lg border border-border bg-card p-3">
              <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-1.5 uppercase tracking-wide">
                <Users size={12} /> Moderators in Charge
              </h4>
              <div className="space-y-2">
                {selected?.modsInCharge?.length > 0 ? selected.modsInCharge.map((m: any) => (
                  <div key={m.discordId} className="flex items-center gap-2.5 p-2 rounded-md bg-secondary/30 border border-border">
                    <Avatar className="size-7">
                      <AvatarFallback className="text-[10px]">{m.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">@{m.username}</p>
                      <p className="text-[10px] text-muted-foreground">Staff</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-xs text-muted-foreground/60 text-center py-2">No case selected</p>
                )}
              </div>
            </div>

            {/* Quick actions */}
            <div className="rounded-lg border border-border bg-card p-3">
              <h4 className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wide">Quick Actions</h4>
              <div className="space-y-1.5">
                {/* View Profile */}
                <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
                  <DialogTrigger asChild>
                    <button disabled={!selected}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium bg-secondary/40 hover:bg-secondary/70 text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed border border-transparent hover:border-border">
                      <span className="flex items-center gap-2"><Eye size={12} />View Profile</span>
                      <ChevronRight size={12} className="text-muted-foreground" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm" aria-describedby={undefined}>
                    <DialogTitle>User Profile</DialogTitle>
                    {selected ? (
                      <div className="space-y-4 pt-2">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-12"><AvatarFallback>{selected.target?.ingameName?.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                          <div>
                            <p className="font-semibold text-sm">{selected.target?.ingameName}</p>
                            <p className="text-xs text-muted-foreground">Discord: {selected.target?.discordId || '—'}</p>
                          </div>
                        </div>
                        <div className="border-t border-border pt-3">
                          <p className="text-xs font-semibold mb-2">Infractions</p>
                          {MOCK_INFRACTIONS[selected.target?.discordId]?.length > 0 ? (
                            <div className="rounded-md bg-secondary/20 p-2">
                              <p className="text-xs font-medium">{MOCK_INFRACTIONS[selected.target.discordId][0].type}</p>
                              <p className="text-xs mt-1">{MOCK_INFRACTIONS[selected.target.discordId][0].reason}</p>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No infractions on record</p>
                          )}
                        </div>
                      </div>
                    ) : <p className="text-sm text-muted-foreground">No case selected</p>}
                  </DialogContent>
                </Dialog>

                {/* Related cases */}
                <button disabled={!selected}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium bg-secondary/40 hover:bg-secondary/70 text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed border border-transparent hover:border-border">
                  <span className="flex items-center gap-2"><ExternalLink size={12} />Related Cases</span>
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-semibold', relatedCases.length > 0 ? 'bg-warning-amber/20 text-warning-amber' : 'bg-secondary text-muted-foreground')}>
                    {relatedCases.length}
                  </span>
                </button>

                {/* Copy ID dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button disabled={!selected}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium bg-secondary/40 hover:bg-secondary/70 text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed border border-transparent hover:border-border">
                      <span className="flex items-center gap-2"><Copy size={12} />Copy User ID</span>
                      <ChevronRight size={12} className="text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(selected?.target?.discordId || ''); setCopiedIdType('discord'); setTimeout(() => setCopiedIdType(null), 2000) }}>
                      <span className="flex-1 text-xs">Discord ID</span>
                      {copiedIdType === 'discord' && <span className="text-[10px] text-success-green font-semibold">Copied!</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(selected?.target?.ingameName || ''); setCopiedIdType('roblox'); setTimeout(() => setCopiedIdType(null), 2000) }}>
                      <span className="flex-1 text-xs">Roblox Username</span>
                      {copiedIdType === 'roblox' && <span className="text-[10px] text-success-green font-semibold">Copied!</span>}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </aside>
        </div>
      </PageShell>

      {/* ── Create Action Log modal ── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto" aria-describedby={undefined}>
          <DialogTitle>Create Action Log</DialogTitle>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground">Case ID <span className="text-muted-foreground font-normal">(auto if empty)</span></label>
                <input type="text" name="caseId" placeholder="#ACT-0003" value={formData.caseId} onChange={handleFormChange} className={input} />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Roblox User ID</label>
                <input type="text" name="robloxUserId" placeholder="1508950244057153600" value={formData.robloxUserId} onChange={handleFormChange} className={input} />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Roblox Username <span className="text-critical-red">*</span></label>
                <input type="text" name="robloxUsername" placeholder="spceko1" value={formData.robloxUsername} onChange={handleFormChange} required className={input} />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Discord ID</label>
                <input type="text" name="discordId" placeholder="1508950244057153600" value={formData.discordId} onChange={handleFormChange} className={input} />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-foreground">Discord Username</label>
                <input type="text" name="discordUsername" placeholder="ModeratorOne" value={formData.discordUsername} onChange={handleFormChange} className={input} />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Reason <span className="text-critical-red">*</span></label>
              <textarea name="reason" placeholder="NSFW Messages, Spamming, etc." value={formData.reason} onChange={handleFormChange} required rows={3} className={input} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground">Punishment Type</label>
                <select name="punishmentType" value={formData.punishmentType} onChange={handleFormChange} className={input}>
                  <option>Warning</option><option>Mute</option><option>Temporary Ban</option><option>Permanent Ban</option><option>Blacklist</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Duration</label>
                <input type="text" name="duration" placeholder="1 Hour" value={formData.duration} onChange={handleFormChange} className={input} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" name="appealable" checked={formData.appealable} onChange={handleFormChange} id="appealable" className="rounded" />
              <label htmlFor="appealable" className="text-sm">Appealable</label>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground">Notes</label>
              <textarea name="notes" placeholder="Additional notes..." value={formData.notes} onChange={handleFormChange} rows={2} className={input} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setIsCreateOpen(false)} className="px-3 py-2 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
              <button type="submit" disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                {submitting && <Loader2 size={13} className="animate-spin" />}
                Create Action Log
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
