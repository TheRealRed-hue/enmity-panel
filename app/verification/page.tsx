'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  XCircle,
  AlertTriangle,
} from 'lucide-react'

import { DashboardLayout } from '@/components/dashboard-layout'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageShell } from '@/components/ui/page-shell'
import { cn } from '@/lib/utils'
import {
  failureReasonConfig,
  loadMockVerificationRequests,
  getRiskLevel,
} from '@/lib/verification'
import type {
  VerificationIssueStatus,
  VerificationRequest,
} from '@/types'

const statusOptions: Array<VerificationIssueStatus | 'all'> = [
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

const statusLabels: Record<VerificationIssueStatus | 'all', string> = {
  all: 'All requests',
  waiting_for_roblox: 'Waiting for Roblox',
  verification_in_progress: 'In progress',
  verification_completed: 'Completed',
  pending_moderator_review: 'Review pending',
  verification_failed: 'Failed',
  approved: 'Approved',
  denied: 'Denied',
  manually_verified: 'Manually verified',
}

const statusSummary = [
  { key: 'waiting_for_roblox', label: 'Waiting', icon: Clock, color: 'bg-sky-500/10 text-sky-400' },
  { key: 'verification_in_progress', label: 'In progress', icon: ArrowRight, color: 'bg-amber-500/10 text-amber-400' },
  { key: 'pending_moderator_review', label: 'Manual review', icon: ShieldCheck, color: 'bg-warning-amber/10 text-warning-amber' },
  { key: 'verification_failed', label: 'Failed', icon: AlertTriangle, color: 'bg-critical-red/10 text-critical-red' },
]

function queryMatches(request: VerificationRequest, search: string) {
  const normalized = search.toLowerCase()
  return (
    request.discordUsername.toLowerCase().includes(normalized) ||
    request.discordId.includes(normalized) ||
    request.ticketId.toLowerCase().includes(normalized) ||
    request.robloxUsername.toLowerCase().includes(normalized)
  )
}

export default function VerificationPage() {
  const [requests, setRequests] = useState<VerificationRequest[]>([])
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<VerificationIssueStatus | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [friendModalOpen, setFriendModalOpen] = useState(false)

  const loadRequests = async () => {
    setIsLoading(true)
    setFetchError(null)

    try {
      const data = await loadMockVerificationRequests()
      setRequests(data)
      setSelectedRequestId((current) => current ?? data?.[0]?.id ?? null)
    } catch {
      setFetchError('Unable to load verification issues.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()
    const interval = window.setInterval(loadRequests, 15000)
    return () => window.clearInterval(interval)
  }, [])

  const filteredRequests = useMemo(() => {
    const base = statusFilter === 'all' ? requests : requests.filter((request) => request.status === statusFilter)
    if (!searchQuery.trim()) return base
    return base.filter((request) => queryMatches(request, searchQuery))
  }, [requests, searchQuery, statusFilter])

  const selectedRequest = useMemo(() => {
    const explicit = requests.find((request) => request.id === selectedRequestId)
    return explicit ?? filteredRequests[0] ?? null
  }, [requests, filteredRequests, selectedRequestId])

  useEffect(() => {
    if (!selectedRequestId && filteredRequests.length) {
      setSelectedRequestId(filteredRequests[0].id)
    }
  }, [filteredRequests, selectedRequestId])

  const counts = useMemo(
    () =>
      requests.reduce((acc, request) => {
        acc[request.status] = (acc[request.status] ?? 0) + 1
        return acc
      }, {} as Record<VerificationIssueStatus, number>),
    [requests]
  )

  const handleModerationAction = (action: 'approved' | 'denied' | 'manually_verified') => {
    if (!selectedRequest) return

    const updatedRequest: VerificationRequest = {
      ...selectedRequest,
      status: action,
      lastUpdated: new Date().toISOString(),
      activity: [
        ...selectedRequest.activity,
        {
          id: `moderator-${Date.now()}`,
          title:
            action === 'approved'
              ? 'Request approved'
              : action === 'denied'
              ? 'Request denied'
              : 'Marked as manually verified',
          description:
            action === 'approved'
              ? 'A moderator approved this verification request.'
              : action === 'denied'
              ? 'A moderator denied this verification request.'
              : 'A moderator confirmed this verification manually.',
          timestamp: new Date().toISOString(),
          type: 'moderator',
        },
      ],
    }

    setRequests((current) => current.map((request) => (request.id === selectedRequest.id ? updatedRequest : request)))
    setSelectedRequestId(selectedRequest.id)
  }

  return (
    <DashboardLayout>
      <PageShell className="space-y-8">
        <Header
          title="Verify Issues"
          subtitle="Review mock verification tickets and audit Roblox identity signals before taking action."
        />

        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <section className="space-y-6">
            <div className="rounded-3xl border border-border bg-card p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Verification queue</p>
                  <h2 className="text-2xl font-semibold">Live issues</h2>
                </div>
                <Button variant="secondary" size="sm" onClick={loadRequests}>
                  <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
                </Button>
              </div>

              <div className="mt-6 space-y-4">
                <div className="relative rounded-2xl border border-border bg-transparent px-4 py-3">
                  <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value)
                    }}
                    placeholder="Search Discord, ticket, or Roblox"
                    className="w-full bg-transparent pl-10 text-sm text-white outline-none placeholder:text-muted-foreground"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setStatusFilter(option)}
                      className={cn(
                        'rounded-full px-4 py-2 text-sm font-medium transition',
                        statusFilter === option
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-slate-950/80 text-muted-foreground hover:bg-slate-900'
                      )}
                    >
                      {statusLabels[option]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold">Open tickets</h3>
                  <p className="text-sm text-muted-foreground">Select a request to inspect its Roblox proof and current risk profile.</p>
                </div>
                <div className="rounded-3xl bg-slate-950 px-3 py-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {filteredRequests.length} visible
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, index) => <SkeletonRow key={index} />)
                ) : fetchError ? (
                  <EmptyState title="Unable to load verification issues" description={fetchError} />
                ) : !filteredRequests.length ? (
                  <EmptyState title="No matching tickets" description="Try a different filter or clear your search." />
                ) : (
                  <div className="space-y-3">
                    {filteredRequests.map((request) => (
                      <button
                        key={request.id}
                        type="button"
                        onClick={() => setSelectedRequestId(request.id)}
                        className={cn(
                          'w-full rounded-3xl border px-4 py-4 text-left transition',
                          selectedRequest?.id === request.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-card hover:border-primary/60 hover:bg-slate-950'
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-white">{request.discordUsername}</p>
                            <p className="text-sm text-muted-foreground">{request.ticketId}</p>
                          </div>
                          <span className="rounded-full bg-slate-950 px-3 py-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                            {statusLabels[request.status]}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">Roblox: {request.robloxUsername}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                {statusSummary.map((summary) => {
                  const count = counts[summary.key as VerificationIssueStatus] ?? 0
                  const Icon = summary.icon
                  return (
                    <div key={summary.key} className="rounded-3xl border border-border bg-slate-950/80 p-4">
                      <div className="flex items-center gap-3">
                        <span className={cn('inline-flex h-10 w-10 items-center justify-center rounded-2xl', summary.color)}>
                          <Icon className="h-5 w-5" />
                        </span>
                        <div>
                          <p className="text-sm text-muted-foreground">{summary.label}</p>
                          <p className="text-2xl font-semibold">{count}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-3xl border border-border bg-card p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Request details</p>
                  <h2 className="text-2xl font-semibold">Review panel</h2>
                </div>
                <div className="rounded-3xl bg-slate-950 px-3 py-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  Demo mode
                </div>
              </div>

              {!selectedRequest ? (
                <div className="mt-8 rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  Choose a ticket from the queue to view its verification summary.
                </div>
              ) : (
                <div className="mt-8 space-y-6">
                  <div className="grid gap-4 xl:grid-cols-[1fr_220px]">
                    <div className="rounded-3xl border border-border bg-background p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Discord identity</p>
                          <p className="text-xl font-semibold text-white">{selectedRequest.discordUsername}</p>
                          <p className="text-sm text-muted-foreground">{selectedRequest.discordId}</p>
                        </div>
                        <span className="rounded-full bg-slate-950 px-3 py-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          {selectedRequest.ticketId}
                        </span>
                      </div>
                      <div className="mt-5 grid gap-3 rounded-3xl bg-slate-950/80 p-4 text-sm text-muted-foreground">
                        <div className="flex items-center justify-between">
                          <span>Opened</span>
                          <span>{new Date(selectedRequest.ticketCreatedAt).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Updated</span>
                          <span>{new Date(selectedRequest.lastUpdated).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Status</span>
                          <span className="text-white">{statusLabels[selectedRequest.status]}</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-border bg-background p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Roblox profile</p>
                          <p className="text-lg font-semibold text-white">{selectedRequest.robloxDisplayName}</p>
                        </div>
                        <span className="rounded-full bg-slate-950 px-3 py-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                          {selectedRequest.robloxUsername}
                        </span>
                      </div>
                      <div className="mt-5 grid gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center justify-between">
                          <span>Account age</span>
                          <span>{selectedRequest.robloxAccountAge}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Verified</span>
                          <span>{new Date(selectedRequest.robloxVerifiedAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
                    <div className="rounded-3xl border border-border bg-background p-5">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-muted-foreground">Verification risk</p>
                        <div className={cn('rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em]', getRiskLevel(selectedRequest.riskScore.value).badge)}>
                          {getRiskLevel(selectedRequest.riskScore.value).label}
                        </div>
                      </div>
                      <div className="mt-5 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-3xl font-semibold text-white">{selectedRequest.riskScore.value}</p>
                          <p className="text-sm text-muted-foreground">Risk score from mock evaluation logic.</p>
                        </div>
                        <div className="rounded-3xl bg-slate-950 px-4 py-2 text-sm text-muted-foreground">
                          {selectedRequest.riskScore.value}%
                        </div>
                      </div>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500"
                          style={{ width: `${selectedRequest.riskScore.value}%` }}
                        />
                      </div>
                    </div>

                    <div className="rounded-3xl border border-border bg-background p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Friend audit</p>
                          <p className="text-lg font-semibold text-white">{selectedRequest.friendAnalysis.blacklistedFriendsCount} flagged</p>
                        </div>
                        <Users className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="mt-4 text-sm leading-6 text-muted-foreground">
                        Connections to blacklisted Roblox accounts are shown in the modal so you can evaluate risk before a decision.
                      </p>
                      <Button className="mt-5 w-full" variant="outline" onClick={() => setFriendModalOpen(true)}>
                        View friend analysis
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[1fr_220px]">
                    <div className="rounded-3xl border border-border bg-background p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Failure reasons</p>
                          <p className="text-base font-semibold text-white">{selectedRequest.failureReasons.length} found</p>
                        </div>
                        <span className="rounded-full bg-rose-500/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-rose-400">
                          {selectedRequest.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="mt-4 space-y-3">
                        {selectedRequest.failureReasons.length ? (
                          selectedRequest.failureReasons.map((reason) => (
                            <div key={reason} className="rounded-3xl border border-border bg-slate-950/80 p-4">
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-medium text-white">{failureReasonConfig[reason].label}</span>
                                <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{reason.replace(/_/g, ' ')}</span>
                              </div>
                              <p className="mt-2 text-sm text-muted-foreground">{failureReasonConfig[reason].description}</p>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-3xl border border-border bg-slate-950/80 p-4 text-sm text-muted-foreground">
                            No verification failures were detected for this request.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 rounded-3xl border border-border bg-background p-5">
                      <p className="text-sm text-muted-foreground">Moderator actions</p>
                      <Button onClick={() => handleModerationAction('approved')}>
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Approve request
                      </Button>
                      <Button variant="destructive" onClick={() => handleModerationAction('denied')}>
                        <XCircle className="mr-2 h-4 w-4" /> Deny request
                      </Button>
                      <Button variant="secondary" onClick={() => handleModerationAction('manually_verified')}>
                        <Sparkles className="mr-2 h-4 w-4" /> Mark manually verified
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-border bg-background p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Activity timeline</p>
                        <p className="text-base font-semibold text-white">Request history</p>
                      </div>
                      <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Mock events</span>
                    </div>
                    <div className="mt-4 space-y-3">
                      {selectedRequest.activity.map((event) => (
                        <div key={event.id} className="rounded-3xl border border-border bg-slate-950/80 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium text-white">{event.title}</p>
                            <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">{event.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </PageShell>

      {friendModalOpen && selectedRequest ? (
        <FriendModal request={selectedRequest} onClose={() => setFriendModalOpen(false)} />
      ) : null}
    </DashboardLayout>
  )
}

function SkeletonRow() {
  return <div className="h-20 animate-pulse rounded-3xl bg-slate-900/60" />
}

function FriendModal({
  request,
  onClose,
}: {
  request: VerificationRequest
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-3xl rounded-3xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Friend analysis</p>
            <h3 className="text-2xl font-semibold">Blacklisted friend connections</h3>
          </div>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="mt-6 space-y-4">
          {request.friendAnalysis.blacklistedFriends.length ? (
            request.friendAnalysis.blacklistedFriends.map((friend) => (
              <div key={friend.id} className="rounded-3xl border border-border bg-background p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{friend.username}</p>
                    <p className="text-lg font-semibold text-white">{friend.robloxId}</p>
                  </div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>Added by {friend.moderator}</p>
                    <p>{new Date(friend.addedAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{friend.blacklistReason}</p>
                <a className="text-sm text-primary hover:underline" href={friend.evidenceUrl} target="_blank" rel="noreferrer">
                  View evidence
                </a>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-border bg-slate-950/80 p-6 text-center text-sm text-muted-foreground">
              No flagged friends were detected for this request.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
