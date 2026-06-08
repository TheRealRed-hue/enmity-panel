"use client"

import { useMemo, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Header } from '@/components/header'
import { PageShell, Section } from '@/components/ui/page-shell'
import ModerationLogCard from '@/components/ui/moderation-log-card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Search, Copy, AlertTriangle } from 'lucide-react'

// Mock data for demonstration — replace with API/fetch when ready
const MOCK_LOGS: any[] = []

// Mock blacklist data
const MOCK_BLACKLIST = [
  { targetId: '1508950244057153600', robloxId: '1508950244057153600', robloxUsername: 'spceko1', reason: 'Multiple infractions', dateAdded: '2026-05-15T10:30:00Z' },
]

// Mock infractions history
const MOCK_INFRACTIONS: Record<string, any[]> = {
  '1508950244057153600': [
    { id: '1', type: 'Warning', reason: 'Spamming', date: '2026-06-05T14:20:00Z', moderator: 'ModeratorOne' },
    { id: '2', type: 'Mute', reason: 'NSFW Messages', date: '2026-06-07T00:34:00Z', moderator: 'ModeratorOne' },
    { id: '3', type: 'Temporary Ban', reason: 'Harassment', date: '2026-06-03T18:45:00Z', moderator: 'Admin' },
  ],
}

function OverviewCard({ title, value, className }: { title: string; value: number | string; className?: string }) {
  return (
    <div className={`rounded-md border border-border p-3 bg-card ${className ?? ''}`}>
      <p className="text-xs text-muted-foreground">{title}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  )
}

export default function AlertsPage() {
  const [cases, setCases] = useState(MOCK_LOGS)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed'>('all')
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [copiedIdType, setCopiedIdType] = useState<'discord' | 'roblox' | null>(null)
  const [isDetailsCollapsed, setIsDetailsCollapsed] = useState(false)
  const [editData, setEditData] = useState<Record<string, any>>({})
  const [formData, setFormData] = useState({
    caseId: '',
    robloxUsername: '',
    robloxUserId: '',
    discordUsername: '',
    discordId: '',
    reason: '',
    punishmentType: 'Warning',
    duration: '',
    appealable: false,
    notes: '',
  })

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Generate unique case ID - use timestamp + random number to prevent duplicates
    let caseId = formData.caseId?.trim()
    if (!caseId) {
      const timestamp = Date.now().toString().slice(-4) // Last 4 digits of timestamp
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
      caseId = `#AUC-${random}`
    }
    
    // Validate uniqueness
    if (cases.some((c) => c.caseId === caseId)) {
      alert(`Case ID "${caseId}" already exists. Please use a different ID.`)
      return
    }
    
    // Create new case object
    const newCase = {
      caseId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      appealable: formData.appealable,
      status: 'Active',
      moderator: { discordId: formData.discordId, username: formData.discordUsername, avatar: null },
      target: { ingameName: formData.robloxUsername, discordId: formData.discordId },
      reason: formData.reason,
      conclusion: { type: formData.punishmentType, text: `${formData.punishmentType}${formData.duration ? ` - ${formData.duration}` : ''}` },
      modsInCharge: [{ discordId: formData.discordId, username: formData.discordUsername, avatar: null }],
      evidence: [],
      metrics: { riskLevel: 'LOW', previousInfractions: 0, relatedCases: 0, linkedAccounts: 0, blacklistMatches: 0 },
      timeline: [
        { ts: new Date().toISOString(), text: 'Case Created' },
      ],
    }

    // Add to local state (future: save to Supabase)
    setCases((prev) => [newCase, ...prev])
    setSelectedCaseId(newCase.caseId)
    
    // Reset form and close modal
    setFormData({
      caseId: '',
      robloxUsername: '',
      robloxUserId: '',
      discordUsername: '',
      discordId: '',
      reason: '',
      punishmentType: 'Warning',
      duration: '',
      appealable: false,
      notes: '',
    })
    setIsModalOpen(false)
    
    // Future: Send to bot API or Supabase
    console.log('New case created:', newCase)
  }

  const handleEditOpen = () => {
    if (selected) {
      setEditData({
        reason: selected.reason,
        punishmentType: selected.conclusion.type,
        duration: selected.conclusion.text.split(' - ')[1] || '',
        status: selected.status,
        appealable: selected.appealable,
      })
      setIsEditOpen(true)
    }
  }

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setEditData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleEditSave = () => {
    if (!selected || !editData) return

    const changes: string[] = []
    const updatedCase = { ...selected }

    // Track changes
    if (editData.reason !== selected.reason) {
      changes.push(`Reason changed from "${selected.reason}" to "${editData.reason}"`)
      updatedCase.reason = editData.reason
    }
    if (editData.punishmentType !== selected.conclusion.type) {
      changes.push(`Punishment changed from ${selected.conclusion.type} to ${editData.punishmentType}`)
      updatedCase.conclusion = { type: editData.punishmentType, text: `${editData.punishmentType}${editData.duration ? ` - ${editData.duration}` : ''}` }
    }
    if (editData.duration !== (selected.conclusion.text.split(' - ')[1] || '')) {
      changes.push(`Duration changed to ${editData.duration || 'None'}`)
    }
    if (editData.status !== selected.status) {
      changes.push(`Status changed from ${selected.status} to ${editData.status}`)
      updatedCase.status = editData.status
    }
    if (editData.appealable !== selected.appealable) {
      changes.push(`Appealable changed to ${editData.appealable ? 'Yes' : 'No'}`)
      updatedCase.appealable = editData.appealable
    }

    // Add timeline entries for each change
    if (changes.length > 0) {
      updatedCase.updatedAt = new Date().toISOString()
      updatedCase.timeline = [
        ...selected.timeline,
        ...changes.map((text) => ({
          ts: new Date().toISOString(),
          text: `[EDITED] ${text}`,
        })),
      ]

      // Update cases array
      setCases((prev) =>
        prev.map((c) => (c.caseId === selected.caseId ? updatedCase : c))
      )

      setIsEditOpen(false)
      console.log('Case updated:', updatedCase)
    }
  }

  const handleAddEvidence = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selected) return
    const files = e.currentTarget.files
    if (!files) return

    const newEvidence = Array.from(files).map((file, idx) => ({
      id: `ev-${Date.now()}-${idx}`,
      url: URL.createObjectURL(file), // Create preview URL
      label: file.name,
      uploadedAt: new Date().toISOString(),
    }))

    const updatedCase = {
      ...selected,
      evidence: [...selected.evidence, ...newEvidence],
      timeline: [
        ...selected.timeline,
        {
          ts: new Date().toISOString(),
          text: `[EVIDENCE] ${newEvidence.length} file(s) uploaded: ${newEvidence.map((e) => e.label).join(', ')}`,
        },
      ],
      updatedAt: new Date().toISOString(),
    }

    setCases((prev) =>
      prev.map((c) => (c.caseId === selected.caseId ? updatedCase : c))
    )

    // Reset input
    e.currentTarget.value = ''
  }

  const handleDeleteEvidence = (evidenceId: string) => {
    if (!selected) return
    
    if (!window.confirm('Are you sure you want to delete this evidence?')) return

    const deletedEvidence = selected.evidence.find((e: any) => e.id === evidenceId)
    const updatedCase = {
      ...selected,
      evidence: selected.evidence.filter((e: any) => e.id !== evidenceId),
      timeline: [
        ...selected.timeline,
        {
          ts: new Date().toISOString(),
          text: `[DELETED] Evidence removed: ${deletedEvidence?.label || 'unknown'}`,
        },
      ],
      updatedAt: new Date().toISOString(),
    }

    setCases((prev) =>
      prev.map((c) => (c.caseId === selected.caseId ? updatedCase : c))
    )

    console.log('Evidence deleted:', deletedEvidence)
  }

  const handleDeleteCase = () => {
    if (!selected) return

    if (!window.confirm(`Are you sure you want to DELETE the entire case "${selected.caseId}"? This action cannot be undone.`)) {
      return
    }

    setCases((prev) => prev.filter((c) => c.caseId !== selected.caseId))
    setSelectedCaseId(null)

    console.log('Case deleted:', selected.caseId)
  }

  const filtered = useMemo(() => {
    return cases.filter((c) => {
      const matchesQuery = query === '' || c.caseId.includes(query) || c.target.ingameName.toLowerCase().includes(query.toLowerCase())
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? c.status === 'Active' || c.status === 'active' : c.status === 'Closed' || c.status === 'closed')
      return matchesQuery && matchesStatus
    })
  }, [cases, query, statusFilter])

  const selected = cases.find((c) => c.caseId === selectedCaseId) || null

  return (
    <DashboardLayout>
      <Header title="Auction Logs" subtitle="Investigation center for auction moderation" />

      <PageShell>
        {/* Overview metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
          <OverviewCard title="Total Auction Cases" value={cases.length} />
          <OverviewCard title="Open Cases" value={cases.filter((c) => c.status === 'Active').length} />
          <OverviewCard title="Closed Cases" value={cases.filter((c) => c.status === 'Closed').length} />
          <OverviewCard title="Critical Cases" value={cases.filter((c) => c.metrics?.riskLevel === 'HIGH').length} />
        </div>

        {/* Add Auction Log Button - Always Visible */}
        <div className="mb-4">
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <button className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
                + Create Auction Log
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
              <DialogTitle>Create Auction Log</DialogTitle>
              <form onSubmit={handleSubmit} className="space-y-4">

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Case ID (auto-generated if empty)</label>
                    <input
                      type="text"
                      name="caseId"
                      placeholder="#AUC-0003"
                      value={formData.caseId}
                      onChange={handleFormChange}
                      className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Roblox User ID</label>
                    <input
                      type="text"
                      name="robloxUserId"
                      placeholder="1508950244057153600"
                      value={formData.robloxUserId}
                      onChange={handleFormChange}
                      className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Roblox Username</label>
                    <input
                      type="text"
                      name="robloxUsername"
                      placeholder="spceko1"
                      value={formData.robloxUsername}
                      onChange={handleFormChange}
                      required
                      className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Discord ID</label>
                    <input
                      type="text"
                      name="discordId"
                      placeholder="1508950244057153600"
                      value={formData.discordId}
                      onChange={handleFormChange}
                      className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="text-sm font-medium">Discord Username</label>
                    <input
                      type="text"
                      name="discordUsername"
                      placeholder="ModeratorOne"
                      value={formData.discordUsername}
                      onChange={handleFormChange}
                      className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Reason</label>
                  <textarea
                    name="reason"
                    placeholder="NSFW Messages, Spamming, etc."
                    value={formData.reason}
                    onChange={handleFormChange}
                    required
                    rows={3}
                    className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Punishment Type</label>
                    <select
                      name="punishmentType"
                      value={formData.punishmentType}
                      onChange={handleFormChange}
                      className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background text-sm"
                    >
                      <option>Warning</option>
                      <option>Mute</option>
                      <option>Temporary Ban</option>
                      <option>Permanent Ban</option>
                      <option>Blacklist</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Duration (e.g., 1 hour, 7 days)</label>
                    <input
                      type="text"
                      name="duration"
                      placeholder="1 Hour"
                      value={formData.duration}
                      onChange={handleFormChange}
                      className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="appealable"
                    checked={formData.appealable}
                    onChange={handleFormChange}
                    id="appealable"
                    className="rounded"
                  />
                  <label htmlFor="appealable" className="text-sm">
                    Appealable
                  </label>
                </div>

                <div>
                  <label className="text-sm font-medium">Notes</label>
                  <textarea
                    name="notes"
                    placeholder="Additional notes..."
                    value={formData.notes}
                    onChange={handleFormChange}
                    rows={2}
                    className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background text-sm"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3 py-2 rounded-md border border-border text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm"
                  >
                    Create Auction Log
                  </button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-12 gap-4">
          {/* Left sidebar */}
          <aside className="col-span-12 lg:col-span-3 xl:col-span-3 space-y-4">
            <div className="rounded-md border border-border p-3 bg-card">
              <p className="text-sm font-semibold">Auction Cases</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="text-right font-medium">{cases.length}</div>
                <div className="text-xs text-muted-foreground">Active</div>
                <div className="text-right font-medium">{cases.filter((c) => c.status === 'Active').length}</div>
                <div className="text-xs text-muted-foreground">Closed</div>
                <div className="text-right font-medium">{cases.filter((c) => c.status === 'Closed').length}</div>
                <div className="text-xs text-muted-foreground">Appeal Pending</div>
                <div className="text-right font-medium">{cases.filter((c) => c.appealable).length}</div>
              </div>
            </div>

            <div className="rounded-md border border-border p-3 bg-card">
              <div className="flex items-center gap-2">
                <Search className="text-muted-foreground" />
                <input
                  placeholder="Search cases or users"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-transparent outline-none text-sm"
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(['all', 'active', 'closed'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-2 py-1 text-xs rounded ${statusFilter === s ? 'bg-primary/20 text-primary' : 'text-muted-foreground border border-border'}`}>
                    {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-md border border-border p-2 bg-card max-h-[60vh] overflow-auto">
              <ul className="space-y-2">
                {filtered.map((c) => (
                  <li key={c.caseId}>
                    <button onClick={() => setSelectedCaseId(c.caseId)} className={`w-full text-left px-3 py-2 rounded-md ${selectedCaseId === c.caseId ? 'bg-secondary/60' : 'hover:bg-secondary/20'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="font-mono text-sm">{c.caseId}</div>
                          <div className="text-xs text-muted-foreground">{c.target.ingameName}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">{c.status}</div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Center panel */}
          <main className="col-span-12 lg:col-span-6 xl:col-span-6">
            {selected ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">{selected.caseId}</h2>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="default">{selected.status}</Badge>
                      <span className="text-xs text-muted-foreground">Appealable: {selected.appealable ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsDetailsCollapsed(!isDetailsCollapsed)}
                      className="px-3 py-2 rounded-md bg-secondary/80 hover:bg-secondary text-sm font-medium"
                      title={isDetailsCollapsed ? 'Show details' : 'Hide details'}
                    >
                      {isDetailsCollapsed ? '📂 Show' : '📋 Hide'}
                    </button>
                    <button
                      onClick={handleEditOpen}
                      className="px-3 py-2 rounded-md bg-secondary/80 hover:bg-secondary text-sm font-medium"
                    >
                      ✏️ Edit Case
                    </button>
                    <button
                      onClick={handleDeleteCase}
                      className="px-3 py-2 rounded-md bg-critical-red/20 text-critical-red hover:bg-critical-red/30 border border-critical-red/30 text-sm font-medium"
                    >
                      🗑️ Delete Case
                    </button>
                  </div>
                </div>

                {!isDetailsCollapsed && (
                  <>
                    <ModerationLogCard {...selected as any} />

                    {/* Evidence gallery */}
                    <section className="rounded-md border border-border p-3 bg-card">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold">Evidence Gallery</h4>
                        <label className="text-xs px-2 py-1 rounded-md bg-primary/20 text-primary cursor-pointer hover:bg-primary/30 transition">
                          + Add Evidence
                          <input
                            type="file"
                            multiple
                            accept="image/*,video/*,.pdf"
                            onChange={handleAddEvidence}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {selected.evidence.length === 0 && <div className="text-sm text-muted-foreground">No evidence uploaded</div>}
                        {selected.evidence.map((ev: any) => (
                          <div key={ev.id} className="rounded-md overflow-hidden border border-border bg-background group relative">
                            <img src={ev.url} alt={ev.label} className="w-full h-36 object-cover" />
                            <div className="p-2 flex items-center justify-between">
                              <div className="text-sm truncate flex-1">{ev.label}</div>
                              <button
                                onClick={() => handleDeleteEvidence(ev.id)}
                                title="Delete evidence"
                                className="ml-1 p-1 rounded hover:bg-critical-red/20 text-critical-red text-xs opacity-0 group-hover:opacity-100 transition"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Timeline */}
                    <section className="rounded-md border border-border p-3 bg-card">
                      <h4 className="text-sm font-semibold">Timeline</h4>
                      <div className="mt-3">
                        <ol className="border-l border-border ml-2 pl-4 space-y-3">
                          {selected.timeline.map((t: any) => (
                            <li key={t.ts} className="relative">
                              <div className="absolute -left-4 top-0 w-3 h-3 rounded-full bg-primary" />
                              <div className="text-xs text-muted-foreground">{new Date(t.ts).toLocaleString()}</div>
                              <div className="font-medium">{t.text}</div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </section>
                  </>
                )}

                {/* Edit Modal */}
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
                    <DialogTitle>Edit Auction Log: {selected.caseId}</DialogTitle>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Reason</label>
                        <textarea
                          name="reason"
                          placeholder="NSFW Messages, Spamming, etc."
                          value={editData.reason || ''}
                          onChange={handleEditChange}
                          rows={3}
                          className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium">Punishment Type</label>
                          <select
                            name="punishmentType"
                            value={editData.punishmentType || 'Warning'}
                            onChange={handleEditChange}
                            className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background text-sm"
                          >
                            <option>Warning</option>
                            <option>Mute</option>
                            <option>Temporary Ban</option>
                            <option>Permanent Ban</option>
                            <option>Blacklist</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Duration</label>
                          <input
                            type="text"
                            name="duration"
                            placeholder="e.g., 1 hour, 7 days"
                            value={editData.duration || ''}
                            onChange={handleEditChange}
                            className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium">Status</label>
                          <select
                            name="status"
                            value={editData.status || 'Active'}
                            onChange={handleEditChange}
                            className="w-full mt-1 px-3 py-2 rounded-md border border-border bg-background text-sm"
                          >
                            <option>Active</option>
                            <option>Closed</option>
                            <option>Pending Review</option>
                            <option>Appealed</option>
                          </select>
                        </div>
                        <div className="flex items-end">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              name="appealable"
                              checked={editData.appealable || false}
                              onChange={handleEditChange}
                              className="rounded"
                            />
                            <span className="text-sm font-medium">Appealable</span>
                          </label>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-4">
                        <button
                          onClick={() => setIsEditOpen(false)}
                          className="px-3 py-2 rounded-md border border-border text-sm"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleEditSave}
                          className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <div className="rounded-md border border-border p-6 bg-card">Select a case to view details</div>
            )}
          </main>

          {/* Right panel */}
          <aside className="col-span-12 lg:col-span-3 xl:col-span-3 space-y-4">
            <div className="rounded-md border border-border p-3 bg-card">
              <h4 className="text-sm font-semibold">Investigation Summary</h4>
              {selected ? (
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Risk Level</div>
                  <div className="font-medium">{selected.metrics?.riskLevel ?? '—'}</div>
                  <div className="text-muted-foreground">Previous Infractions</div>
                  <div className="font-medium">{selected.metrics?.previousInfractions ?? 0}</div>
                  <div className="text-muted-foreground">Related Cases</div>
                  <div className="font-medium">{selected.metrics?.relatedCases ?? 0}</div>
                  <div className="text-muted-foreground">Linked Accounts</div>
                  <div className="font-medium">{selected.metrics?.linkedAccounts ?? 0}</div>
                  <div className="text-muted-foreground">Blacklist Matches</div>
                  <div className="font-medium">{selected.metrics?.blacklistMatches ?? 0}</div>
                </div>
              ) : (
                <div className="mt-3 text-sm text-muted-foreground">No case selected</div>
              )}
            </div>

            <div className="rounded-md border border-border p-3 bg-card">
              <h4 className="text-sm font-semibold">Moderators</h4>
              <div className="mt-3 space-y-2">
                {selected?.modsInCharge?.map((m: any) => (
                  <div key={m.discordId} className="flex items-center gap-3">
                    <Avatar className="size-8">
                      <AvatarFallback>{m.username.slice(0,2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">@{m.username}</div>
                      <div className="text-xs text-muted-foreground">Administrator</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-md border border-border p-3 bg-card">
              <h4 className="text-sm font-semibold">Quick Actions</h4>
              <div className="mt-3 flex flex-col gap-2">
                {/* View Profile */}
                <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
                  <DialogTrigger asChild>
                    <button className="px-3 py-2 rounded-md text-sm bg-secondary/80 hover:bg-secondary text-left">View Profile</button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogTitle>User Profile</DialogTitle>
                    {selected ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-12">
                            <AvatarFallback>{selected.target.ingameName.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold">{selected.target.ingameName}</div>
                            <div className="text-xs text-muted-foreground">Discord: {selected.target.discordId}</div>
                          </div>
                        </div>
                        
                        <div className="border-t border-border pt-3">
                          <div className="text-sm font-semibold mb-2">Infractions</div>
                          <div className="space-y-2">
                            {MOCK_INFRACTIONS[selected.target.discordId]?.length > 0 ? (
                              <>
                                <div className="text-xs text-muted-foreground">Total: {MOCK_INFRACTIONS[selected.target.discordId].length}</div>
                                <div className="rounded-md bg-secondary/20 p-2">
                                  <div className="text-xs font-medium">{MOCK_INFRACTIONS[selected.target.discordId][0].type}</div>
                                  <div className="text-xs mt-1">{MOCK_INFRACTIONS[selected.target.discordId][0].reason}</div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    {new Date(MOCK_INFRACTIONS[selected.target.discordId][0].date).toLocaleString()}
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="text-xs text-muted-foreground">No infractions</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No case selected</div>
                    )}
                  </DialogContent>
                </Dialog>

                {/* View Blacklist Record - Only show if blacklist match exists */}
                {selected && MOCK_BLACKLIST.some((bl) => bl.targetId === selected.target.discordId) && (
                  <button className="px-3 py-2 rounded-md text-sm bg-critical-red/20 text-critical-red border border-critical-red/30 hover:bg-critical-red/30 text-left flex items-center gap-2">
                    <AlertTriangle className="size-4" />
                    View Blacklist Record
                  </button>
                )}

                {/* View Related Cases */}
                <button className="px-3 py-2 rounded-md text-sm bg-secondary/80 hover:bg-secondary text-left">
                  View Related Cases ({selected ? cases.filter((c) => c.target.discordId === selected.target.discordId && c.caseId !== selected.caseId).length : 0})
                </button>

                {/* Copy User ID with dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="px-3 py-2 rounded-md text-sm bg-secondary/80 hover:bg-secondary text-left flex items-center gap-2">
                      <Copy className="size-4" />
                      Copy User ID
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        navigator.clipboard.writeText(selected?.target.discordId || '')
                        setCopiedIdType('discord')
                        setTimeout(() => setCopiedIdType(null), 2000)
                      }}
                      className="flex items-center gap-2"
                    >
                      <div className="flex-1">Discord ID</div>
                      {copiedIdType === 'discord' && <span className="text-xs text-green-500">✓</span>}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        navigator.clipboard.writeText(selected?.target.ingameName || '')
                        setCopiedIdType('roblox')
                        setTimeout(() => setCopiedIdType(null), 2000)
                      }}
                      className="flex items-center gap-2"
                    >
                      <div className="flex-1">Roblox Username</div>
                      {copiedIdType === 'roblox' && <span className="text-xs text-green-500">✓</span>}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </aside>
        </div>
      </PageShell>
    </DashboardLayout>
  )
}
