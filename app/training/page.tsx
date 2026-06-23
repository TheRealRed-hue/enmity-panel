'use client'

import { useState, useEffect, useCallback } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Header } from '@/components/header'
import { PageShell, Section } from '@/components/ui/page-shell'
import { EmptyState } from '@/components/ui/empty-state'
import {
  GraduationCap, Plus, X, ChevronDown, Star, Shield, Users,
  CheckCircle2, XCircle, Clock, AlertCircle, Lock, Unlock,
  FileText, Image, Link2, Hash, StickyNote, Loader2,
  BarChart3, TrendingUp, Award, Target, BookOpen, Edit2,
  Trash2, Eye, Send, RefreshCw, ChevronRight, UserCheck,
  ClipboardList, Zap, Flag
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { getClientSession } from '@/lib/session'
import type { DashboardRole } from '@/types'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import {
  getLevelFromXP,
  type TrainingTask, type TrainingProfile, type TaskAssignment,
  type TaskSubmission, type TaskDifficulty, type EvidenceType,
  type TaskStatus, type Recommendation,
} from '@/types/training'

// ── Helpers ───────────────────────────────────────────────────────────────────

function isAdmin(role: DashboardRole) {
  return role === 'owner' || role === 'administrator'
}

const DIFFICULTY_CONFIG: Record<TaskDifficulty, { label: string; color: string; bg: string }> = {
  easy:   { label: 'Easy',   color: 'text-success-green',  bg: 'bg-success-green/15' },
  medium: { label: 'Medium', color: 'text-warning-amber',  bg: 'bg-warning-amber/15' },
  hard:   { label: 'Hard',   color: 'text-critical-red',   bg: 'bg-critical-red/15'  },
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; icon: React.ElementType }> = {
  not_started:  { label: 'Not Started',  color: 'text-muted-foreground', icon: Clock         },
  submitted:    { label: 'Submitted',    color: 'text-warning-amber',    icon: Send          },
  under_review: { label: 'Under Review', color: 'text-primary',          icon: Eye           },
  approved:     { label: 'Approved',     color: 'text-success-green',    icon: CheckCircle2  },
  rejected:     { label: 'Rejected',     color: 'text-critical-red',     icon: XCircle       },
}

const EVIDENCE_LABELS: Record<EvidenceType, string> = {
  action_logs: 'Action Logs',
  ticket_ids:  'Ticket IDs',
  screenshots: 'Screenshots',
  links:       'Links',
  notes:       'Notes',
  any:         'Any Evidence',
}

const RECOMMENDATION_CONFIG: Record<Recommendation, { label: string; color: string; bg: string }> = {
  promote:          { label: 'Promote',          color: 'text-success-green', bg: 'bg-success-green/15' },
  extend_training:  { label: 'Extend Training',  color: 'text-warning-amber', bg: 'bg-warning-amber/15' },
  deny_promotion:   { label: 'Deny Promotion',   color: 'text-critical-red',  bg: 'bg-critical-red/15'  },
}

function XPBar({ xp }: { xp: number }) {
  const info = getLevelFromXP(xp)
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">Level {info.level}</span>
        <span className="text-muted-foreground">
          {info.next ? `${info.current} / ${info.next} XP` : 'Max Level'}
        </span>
      </div>
      <div className="h-2 rounded-full bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700"
          style={{ width: `${info.progress}%` }}
        />
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color?: string
}) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
      <div className={cn('w-9 h-9 rounded-md flex items-center justify-center shrink-0', color ?? 'bg-primary/15')}>
        <Icon size={16} className={color ? 'text-white' : 'text-primary'} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold text-foreground">{value}</p>
      </div>
    </div>
  )
}

// ── Tab type ──────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'tasks' | 'assignments' | 'my_training' | 'reports'

// ── Main Component ────────────────────────────────────────────────────────────

export default function TrainingPage() {
  const [session, setSession] = useState<ReturnType<typeof getClientSession>>(null)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [profiles, setProfiles] = useState<TrainingProfile[]>([])
  const [tasks, setTasks] = useState<TrainingTask[]>([])
  const [myProfile, setMyProfile] = useState<TrainingProfile | null>(null)
  const [myAssignments, setMyAssignments] = useState<(TaskAssignment & { training_tasks: TrainingTask })[]>([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [showCreateProfile, setShowCreateProfile] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState<TaskAssignment & { training_tasks: TrainingTask } | null>(null)
  const [showReviewModal, setShowReviewModal] = useState<{ assignment: TaskAssignment & { training_tasks: TrainingTask }; profile: TrainingProfile } | null>(null)
  const [showLockModal, setShowLockModal] = useState<TrainingProfile | null>(null)
  const [showReportModal, setShowReportModal] = useState<TrainingProfile | null>(null)
  const [selectedProfile, setSelectedProfile] = useState<TrainingProfile | null>(null)

  useEffect(() => {
    const s = getClientSession()
    setSession(s)
    if (s) {
      const role = s.dashboardRole as DashboardRole
      if (role === 'trial_moderator') setActiveTab('my_training')
      else setActiveTab('overview')
    }
  }, [])

  const load = useCallback(async () => {
    if (!session) return
    setLoading(true)
    const role = session.dashboardRole as DashboardRole

    const [tasksRes, profilesRes] = await Promise.all([
      fetch('/api/training/tasks'),
      fetch('/api/training/profiles'),
    ])

    if (tasksRes.ok) setTasks(await tasksRes.json())

    if (profilesRes.ok) {
      const data = await profilesRes.json()
      setProfiles(data)
    }

    if (role === 'trial_moderator') {
      const myRes = await fetch('/api/training/profiles?mine=true')
      if (myRes.ok) {
        const data = await myRes.json()
        setMyProfile(data)
        setMyAssignments(data?.task_assignments ?? [])
      }
    }

    setLoading(false)
  }, [session])

  useEffect(() => { load() }, [load])

  const role = session?.dashboardRole as DashboardRole | undefined
  const admin = role ? isAdmin(role) : false
  const isTrainer = !admin && role !== 'trial_moderator'
  const isTrialMod = role === 'trial_moderator'

  // ── Tab nav ────────────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string; icon: React.ElementType; hidden?: boolean }[] = [
    { id: 'overview',     label: 'Overview',     icon: BarChart3,     hidden: isTrialMod },
    { id: 'tasks',        label: 'Task Library',  icon: BookOpen,      hidden: isTrialMod && !admin },
    { id: 'assignments',  label: 'Assignments',   icon: Users,         hidden: isTrialMod },
    { id: 'my_training',  label: 'My Training',   icon: GraduationCap, hidden: !isTrialMod },
    { id: 'reports',      label: 'Reports',       icon: FileText,      hidden: isTrialMod },
  ].filter(t => !t.hidden)

  return (
    <DashboardLayout>
      <div className="flex flex-col min-h-screen">
        <Header title="Training Portal" />
        <PageShell>
          {/* Tab Navigation */}
          <div className="flex items-center gap-1 border-b border-border pb-0 mb-6 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <tab.icon size={15} />
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-primary" size={28} />
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <OverviewTab profiles={profiles} tasks={tasks} />
              )}
              {activeTab === 'tasks' && (
                <TasksTab
                  tasks={tasks}
                  profiles={profiles}
                  admin={admin}
                  selectedProfile={selectedProfile}
                  onSelectProfile={(p) => setSelectedProfile(p)}
                  onAdd={() => setShowCreateTask(true)}
                  onArchive={async (id) => {
                    await fetch(`/api/training/tasks?id=${id}`, { method: 'DELETE' })
                    load()
                  }}
                  session={session}
                  onRefresh={load}
                />
              )}
              {activeTab === 'assignments' && (
                <AssignmentsTab
                  profiles={profiles}
                  admin={admin}
                  onAdd={() => setShowCreateProfile(true)}
                  onSelectProfile={(p) => setSelectedProfile(p)}
                  onLock={(p) => setShowLockModal(p)}
                  onUnlock={async (p) => {
                    await fetch('/api/training/profiles', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id: p.id, action: 'unlock' }),
                    })
                    load()
                  }}
                  onViewReport={(p) => setShowReportModal(p)}
                  session={session}
                  onRefresh={load}
                />
              )}
              {activeTab === 'my_training' && (
                <MyTrainingTab
                  profile={myProfile}
                  assignments={myAssignments}
                  onSubmit={(a) => setShowSubmitModal(a)}
                  onRefresh={load}
                />
              )}
              {activeTab === 'reports' && (
                <ReportsTab
                  profiles={profiles}
                  onView={(p) => setShowReportModal(p)}
                />
              )}
            </>
          )}
        </PageShell>
      </div>

      {/* Modals */}
      {showCreateTask && (
        <CreateTaskModal
          onClose={() => setShowCreateTask(false)}
          onCreated={() => { setShowCreateTask(false); load() }}
        />
      )}
      {showCreateProfile && (
        <CreateProfileModal
          onClose={() => setShowCreateProfile(false)}
          onCreated={() => { setShowCreateProfile(false); load() }}
        />
      )}
      {showSubmitModal && (
        <SubmitTaskModal
          assignment={showSubmitModal}
          onClose={() => setShowSubmitModal(null)}
          onSubmitted={() => { setShowSubmitModal(null); load() }}
        />
      )}
      {showLockModal && (
        <LockProfileModal
          profile={showLockModal}
          onClose={() => setShowLockModal(null)}
          onLocked={() => { setShowLockModal(null); load() }}
        />
      )}
      {showReportModal && (
        <ReportModal
          profile={showReportModal}
          profiles={profiles}
          onClose={() => setShowReportModal(null)}
          onUpdate={load}
          admin={admin}
          session={session}
        />
      )}
      {selectedProfile && (
        <ProfileDetailModal
          profile={selectedProfile}
          onClose={() => setSelectedProfile(null)}
          onReview={(a) => {
            setSelectedProfile(null)
            setShowReviewModal({ assignment: a, profile: selectedProfile })
          }}
          admin={admin}
          session={session}
        />
      )}
      {showReviewModal && (
        <ReviewModal
          assignment={showReviewModal.assignment}
          profile={showReviewModal.profile}
          onClose={() => setShowReviewModal(null)}
          onReviewed={() => { setShowReviewModal(null); load() }}
        />
      )}
    </DashboardLayout>
  )
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ profiles, tasks }: { profiles: TrainingProfile[]; tasks: TrainingTask[] }) {
  const active = profiles.filter(p => p.training_status === 'active').length
  const completed = profiles.filter(p => p.training_status === 'locked').length
  const total = profiles.length

  const avgCompletion = profiles.length > 0
    ? Math.round(profiles.reduce((sum, p) => {
        const arr = (p as any).task_assignments ?? []
        const approved = arr.filter((a: any) => a.status === 'approved').length
        const pct = arr.length > 0 ? (approved / arr.length) * 100 : 0
        return sum + pct
      }, 0) / profiles.length)
    : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}       label="Total Trainees"      value={total}          color="bg-primary/20" />
        <StatCard icon={TrendingUp}  label="Active Training"     value={active}         color="bg-success-green/20" />
        <StatCard icon={CheckCircle2} label="Completed"          value={completed}      color="bg-warning-amber/20" />
        <StatCard icon={Target}      label="Avg Completion"      value={`${avgCompletion}%`} color="bg-glow-teal/20" />
      </div>

      <Section title="Active Trainees">
        {profiles.filter(p => p.training_status === 'active').length === 0 ? (
          <EmptyState icon={Users} title="No active trainees" description="Assign a trial moderator to begin training." />
        ) : (
          <div className="grid gap-3">
            {profiles.filter(p => p.training_status === 'active').map(p => {
              const arr = (p as any).task_assignments ?? []
              const approved = arr.filter((a: any) => a.status === 'approved').length
              const pct = arr.length > 0 ? Math.round((approved / arr.length) * 100) : 0
              const lvl = getLevelFromXP(p.xp_earned)
              return (
                <div key={p.id} className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-primary">{p.trial_mod_username.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.trial_mod_username}</p>
                    <p className="text-xs text-muted-foreground">Trainer: {p.trainer_username ?? 'Unassigned'}</p>
                  </div>
                  <div className="hidden sm:block w-32">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Lv {lvl.level}</span>
                      <span className="text-muted-foreground">{p.xp_earned} XP</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${lvl.progress}%` }} />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-foreground">{pct}%</p>
                    <p className="text-xs text-muted-foreground">{approved}/{arr.length} tasks</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Section>

      <Section title="Task Library Summary">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {tasks.slice(0, 6).map(task => {
            const diff = DIFFICULTY_CONFIG[task.difficulty]
            return (
              <div key={task.id} className="bg-card border border-border rounded-lg p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-medium text-foreground line-clamp-1">{task.title}</p>
                  <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0', diff.color, diff.bg)}>{diff.label}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{task.category}</span>
                  <span className="text-xs font-medium text-shrine-gold">+{task.xp_reward} XP</span>
                </div>
              </div>
            )
          })}
        </div>
      </Section>
    </div>
  )
}

// ── Tasks Tab ─────────────────────────────────────────────────────────────────

function TasksTab({ tasks, profiles, admin, selectedProfile, onSelectProfile, onAdd, onArchive, session, onRefresh }: {
  tasks: TrainingTask[]
  profiles: TrainingProfile[]
  admin: boolean
  selectedProfile: TrainingProfile | null
  onSelectProfile: (p: TrainingProfile) => void
  onAdd: () => void
  onArchive: (id: string) => void
  session: ReturnType<typeof getClientSession>
  onRefresh: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <p className="text-sm text-muted-foreground">{tasks.length} tasks in library</p>
          {profiles.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Trainee:</span>
              <Select value={selectedProfile?.id ?? ''} onValueChange={(value) => {
                const profile = profiles.find(p => p.id === value)
                if (profile) onSelectProfile(profile)
              }}>
                <SelectTrigger className="min-w-[180px]">
                  {selectedProfile ? selectedProfile.trial_mod_username : 'Select trainee'}
                </SelectTrigger>
                <SelectContent>
                  {profiles.map(profile => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.trial_mod_username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        {admin && (
          <button onClick={onAdd} className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus size={14} /> New Task
          </button>
        )}
      </div>

      {tasks.length === 0 ? (
        <EmptyState icon={BookOpen} title="No tasks yet" description="Create training tasks for trial moderators." />
      ) : (
        <div className="grid gap-3">
          {tasks.map(task => {
            const diff = DIFFICULTY_CONFIG[task.difficulty]
            return (
              <div key={task.id} className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="text-sm font-semibold text-foreground">{task.title}</h3>
                      <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', diff.color, diff.bg)}>{diff.label}</span>
                      <span className="text-[10px] bg-secondary text-muted-foreground px-1.5 py-0.5 rounded">{task.category}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{task.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Zap size={11} className="text-shrine-gold" />{task.xp_reward} XP</span>
                      <span>Evidence: {EVIDENCE_LABELS[task.evidence_type]}</span>
                      <span>Min. {task.min_submissions} submission{task.min_submissions !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedProfile ? (
                      (() => {
                        const assignment = (selectedProfile as any).task_assignments?.find((a: any) => a.task_id === task.id)
                        const canComplete = admin || selectedProfile.trainer_discord_id === session?.discordId
                        if (assignment && canComplete) {
                          return (
                            <button
                              onClick={async () => {
                                await fetch('/api/training/submissions', {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ assignment_id: assignment.id, profile_id: selectedProfile.id, action: 'approve', feedback: '' }),
                                })
                                await onRefresh()
                              }}
                              className="px-2 py-1 text-xs rounded bg-success-green/10 text-success-green hover:bg-success-green/15 transition-colors"
                            >
                              Complete
                            </button>
                          )
                        }
                        if (assignment && !canComplete) {
                          return <span className="text-xs text-muted-foreground">Assigned (no permission)</span>
                        }
                        return <span className="text-xs text-muted-foreground">Not assigned</span>
                      })()
                    ) : (
                      <span className="text-xs text-muted-foreground">Select a trainee to complete tasks</span>
                    )}
                    {admin && (
                      <button
                        onClick={() => onArchive(task.id)}
                        className="p-1.5 rounded hover:bg-critical-red/15 text-muted-foreground hover:text-critical-red transition-colors shrink-0"
                        title="Archive task"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Assignments Tab ───────────────────────────────────────────────────────────

function AssignmentsTab({ profiles, admin, onAdd, onSelectProfile, onLock, onUnlock, onViewReport, session, onRefresh }: {
  profiles: TrainingProfile[]
  admin: boolean
  onAdd: () => void
  onSelectProfile: (p: TrainingProfile) => void
  onLock: (p: TrainingProfile) => void
  onUnlock: (p: TrainingProfile) => void
  onViewReport: (p: TrainingProfile) => void
  session: ReturnType<typeof getClientSession>
  onRefresh: () => void
}) {
  const [showOnlyMine, setShowOnlyMine] = useState(false)

  const list = showOnlyMine ? profiles.filter(p => p.trainer_discord_id === session?.discordId) : profiles

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">{profiles.length} trainees total</p>
          <button
            onClick={() => setShowOnlyMine(s => !s)}
            className={cn('px-2 py-1 rounded text-xs transition-colors', showOnlyMine ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground')}
          >
            {showOnlyMine ? 'Mostrar todos' : 'Só meus trainees'}
          </button>
        </div>
        {admin && (
          <button onClick={onAdd} className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus size={14} /> Assign Trainee
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <EmptyState icon={Users} title="No trainees assigned" description="Assign a trial moderator to start their training." />
      ) : (
        <div className="grid gap-3">
          {list.map(p => {
            const arr = (p as any).task_assignments ?? []
            const approved = arr.filter((a: any) => a.status === 'approved').length
            const pending = arr.filter((a: any) => ['submitted', 'under_review'].includes(a.status)).length
            const pct = arr.length > 0 ? Math.round((approved / arr.length) * 100) : 0
            const lvl = getLevelFromXP(p.xp_earned)
            const isLocked = p.training_status === 'locked'
            const canLock = admin || p.trainer_discord_id === session?.discordId

            return (
              <div key={p.id} className={cn('bg-card border rounded-lg p-4', isLocked ? 'border-warning-amber/30' : 'border-border')}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">{p.trial_mod_username.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-sm font-semibold text-foreground">{p.trial_mod_username}</span>
                      {isLocked && <span className="flex items-center gap-1 text-[10px] text-warning-amber bg-warning-amber/15 px-1.5 py-0.5 rounded"><Lock size={9} /> Locked</span>}
                      {pending > 0 && <span className="text-[10px] text-primary bg-primary/15 px-1.5 py-0.5 rounded">{pending} pending review</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">Trainer: {p.trainer_username ?? 'Unassigned'} · Lv {lvl.level} · {p.xp_earned} XP</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{approved}/{arr.length}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onSelectProfile(p)}
                      className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      title="View details"
                    >
                      <Eye size={14} />
                    </button>
                    {isLocked ? (
                      <>
                        <button onClick={() => onViewReport(p)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="View report">
                          <FileText size={14} />
                        </button>
                        {admin && (
                          <button onClick={() => onUnlock(p)} className="p-1.5 rounded hover:bg-success-green/15 text-muted-foreground hover:text-success-green transition-colors" title="Unlock profile">
                            <Unlock size={14} />
                          </button>
                        )}
                      </>
                    ) : (
                      canLock && (
                        <button onClick={() => onLock(p)} className="p-1.5 rounded hover:bg-warning-amber/15 text-muted-foreground hover:text-warning-amber transition-colors" title="Complete training">
                          <Lock size={14} />
                        </button>
                      )
                    )}
                  </div>
                </div>

                {canLock && arr.filter((a: any) => a.status !== 'approved').length > 0 && (
                  <div className="mt-3 w-full">
                    <p className="text-xs text-muted-foreground mb-2">Pending tasks</p>
                    <div className="space-y-2">
                      {arr.filter((a: any) => a.status !== 'approved').map((a: any) => (
                        <div key={a.id} className="flex items-center justify-between gap-2 bg-secondary/30 p-2 rounded">
                          <div className="text-sm text-foreground truncate">{a.training_tasks?.title}</div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => {
                                await fetch('/api/training/submissions', {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ assignment_id: a.id, profile_id: p.id, action: 'approve', feedback: '' }),
                                })
                                await onRefresh()
                              }}
                              className="px-2 py-1 text-xs rounded bg-success-green/10 text-success-green hover:bg-success-green/15 transition-colors"
                            >
                              Complete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── My Training Tab ───────────────────────────────────────────────────────────

function MyTrainingTab({ profile, assignments, onSubmit, onRefresh }: {
  profile: TrainingProfile | null
  assignments: (TaskAssignment & { training_tasks: TrainingTask })[]
  onSubmit: (a: TaskAssignment & { training_tasks: TrainingTask }) => void
  onRefresh: () => void
}) {
  if (!profile) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="No training assigned"
        description="You haven't been assigned to a training program yet. Contact an administrator."
      />
    )
  }

  const lvl = getLevelFromXP(profile.xp_earned)
  const approved = assignments.filter(a => a.status === 'approved').length
  const rejected = assignments.filter(a => a.status === 'rejected').length
  const pending = assignments.filter(a => ['submitted', 'under_review'].includes(a.status)).length
  const total = assignments.length
  const approvalRate = (approved + rejected) > 0 ? Math.round((approved / (approved + rejected)) * 100) : 0
  const isLocked = profile.training_status === 'locked'

  return (
    <div className="space-y-6">
      {isLocked && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-warning-amber/10 border border-warning-amber/30 text-warning-amber text-sm">
          <Lock size={15} />
          Your training profile has been locked by your trainer. No further submissions are accepted.
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
            <span className="text-base font-bold text-primary">{profile.trial_mod_username.slice(0, 2).toUpperCase()}</span>
          </div>
          <div>
            <h2 className="font-semibold text-foreground">{profile.trial_mod_username}</h2>
            <p className="text-sm text-muted-foreground">Trainer: {profile.trainer_username ?? 'Unassigned'}</p>
          </div>
          <div className="ml-auto text-right">
            <div className="flex items-center gap-1 justify-end">
              <Award size={14} className="text-shrine-gold" />
              <span className="text-lg font-bold text-foreground">{profile.xp_earned} XP</span>
            </div>
            <p className="text-xs text-muted-foreground">Level {lvl.level}</p>
          </div>
        </div>
        <XPBar xp={profile.xp_earned} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="text-center">
            <p className="text-lg font-bold text-success-green">{approved}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-warning-amber">{pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-critical-red">{rejected}</p>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-primary">{approvalRate}%</p>
            <p className="text-xs text-muted-foreground">Approval Rate</p>
          </div>
        </div>
      </div>

      {/* Task List */}
      <Section title="Training Tasks">
        {assignments.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No tasks assigned" description="Tasks will appear here once assigned." />
        ) : (
          <div className="grid gap-3">
            {assignments.map(a => {
              const task = a.training_tasks
              if (!task) return null
              const status = STATUS_CONFIG[a.status]
              const diff = DIFFICULTY_CONFIG[task.difficulty]
              const canSubmit = !isLocked && (a.status === 'not_started' || a.status === 'rejected')

              return (
                <div key={a.id} className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn('mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0', status.color)}>
                      <status.icon size={12} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-sm font-medium text-foreground">{task.title}</span>
                        <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', diff.color, diff.bg)}>{diff.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1 line-clamp-2">{task.description}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className={status.color}>{status.label}</span>
                        <span className="flex items-center gap-1"><Zap size={10} className="text-shrine-gold" />{task.xp_reward} XP</span>
                      </div>
                      {a.reviewer_feedback && (
                        <div className={cn('mt-2 p-2 rounded text-xs', a.status === 'rejected' ? 'bg-critical-red/10 text-critical-red' : 'bg-success-green/10 text-success-green')}>
                          <span className="font-medium">Feedback: </span>{a.reviewer_feedback}
                        </div>
                      )}
                    </div>
                    {canSubmit && (
                      <button
                        onClick={() => onSubmit(a)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shrink-0"
                      >
                        <Send size={11} /> Submit
                      </button>
                    )}
                    {a.status === 'approved' && (
                      <span className="flex items-center gap-1 text-xs text-success-green shrink-0">
                        <CheckCircle2 size={13} /> +{a.xp_awarded} XP
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Section>
    </div>
  )
}

// ── Reports Tab ───────────────────────────────────────────────────────────────

function ReportsTab({ profiles, onView }: { profiles: TrainingProfile[]; onView: (p: TrainingProfile) => void }) {
  const locked = profiles.filter(p => p.training_status === 'locked')

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{locked.length} completed training{locked.length !== 1 ? 's' : ''}</p>
      {locked.length === 0 ? (
        <EmptyState icon={FileText} title="No completed trainings" description="Profiles will appear here once training is locked." />
      ) : (
        <div className="grid gap-3">
          {locked.map(p => {
            const rec = p.recommendation ? RECOMMENDATION_CONFIG[p.recommendation] : null
            return (
              <div key={p.id} className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">{p.trial_mod_username.slice(0, 2).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{p.trial_mod_username}</p>
                  <p className="text-xs text-muted-foreground">Trainer: {p.trainer_username ?? 'N/A'} · {p.xp_earned} XP · Lv {getLevelFromXP(p.xp_earned).level}</p>
                </div>
                {rec && (
                  <span className={cn('text-xs font-semibold px-2 py-1 rounded hidden sm:block', rec.color, rec.bg)}>{rec.label}</span>
                )}
                <button
                  onClick={() => onView(p)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/80 transition-colors shrink-0"
                >
                  <Eye size={11} /> View Report
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Create Task Modal ─────────────────────────────────────────────────────────

function CreateTaskModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    title: '', description: '', category: '', difficulty: 'easy' as TaskDifficulty,
    xp_reward: 50, evidence_type: 'any' as EvidenceType, min_submissions: 1,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!form.title || !form.description || !form.category) {
      setError('Title, description and category are required.')
      return
    }
    setLoading(true)
    const res = await fetch('/api/training/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setLoading(false)
    if (!res.ok) { setError((await res.json()).error); return }
    onCreated()
  }

  return (
    <Modal title="Create Training Task" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Title">
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="e.g. Perform 3 moderation actions" />
        </Field>
        <Field label="Description">
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={3}
            className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            placeholder="Describe what the trial moderator needs to do..." />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="e.g. Moderation" />
          </Field>
          <Field label="Difficulty">
            <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value as TaskDifficulty }))}
              className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="XP Reward">
            <input type="number" value={form.xp_reward} onChange={e => setForm(f => ({ ...f, xp_reward: Number(e.target.value) }))}
              className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </Field>
          <Field label="Min. Submissions">
            <input type="number" min={1} value={form.min_submissions} onChange={e => setForm(f => ({ ...f, min_submissions: Number(e.target.value) }))}
              className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
          </Field>
        </div>
        <Field label="Evidence Type">
          <select value={form.evidence_type} onChange={e => setForm(f => ({ ...f, evidence_type: e.target.value as EvidenceType }))}
            className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
            {Object.entries(EVIDENCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        {error && <p className="text-xs text-critical-red">{error}</p>}
        <ModalActions onClose={onClose} onConfirm={handleSubmit} loading={loading} confirmLabel="Create Task" />
      </div>
    </Modal>
  )
}

// ── Create Profile Modal ──────────────────────────────────────────────────────

function CreateProfileModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    trial_mod_discord_id: '', trial_mod_username: '',
    trainer_discord_id: '', trainer_username: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Load staff members for trainer selector
  const [staff, setStaff] = useState<{ discord_id: string; username: string; dashboard_role: string }[]>([])
  useEffect(() => {
    supabase.from('staff_members').select('discord_id, username, dashboard_role').then(({ data }) => {
      if (data) setStaff(data)
    })
  }, [])

  async function handleSubmit() {
    if (!form.trial_mod_discord_id || !form.trial_mod_username) {
      setError('Trial Moderator Discord ID and username are required.')
      return
    }
    setLoading(true)
    const res = await fetch('/api/training/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setLoading(false)
    if (!res.ok) { setError((await res.json()).error); return }
    onCreated()
  }

  return (
    <Modal title="Assign Trainee" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Trial Moderator Discord ID">
          <input value={form.trial_mod_discord_id} onChange={e => setForm(f => ({ ...f, trial_mod_discord_id: e.target.value }))}
            className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="123456789012345678" />
        </Field>
        <Field label="Trial Moderator Username">
          <input value={form.trial_mod_username} onChange={e => setForm(f => ({ ...f, trial_mod_username: e.target.value }))}
            className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="username" />
        </Field>
        <Field label="Assign Trainer (optional)">
          <select
            value={form.trainer_discord_id}
            onChange={e => {
              const s = staff.find(m => m.discord_id === e.target.value)
              setForm(f => ({ ...f, trainer_discord_id: e.target.value, trainer_username: s?.username ?? '' }))
            }}
            className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">No trainer assigned</option>
            {staff.map(m => <option key={m.discord_id} value={m.discord_id}>{m.username} ({m.dashboard_role.replace('_', ' ')})</option>)}
          </select>
        </Field>
        {error && <p className="text-xs text-critical-red">{error}</p>}
        <ModalActions onClose={onClose} onConfirm={handleSubmit} loading={loading} confirmLabel="Assign Trainee" />
      </div>
    </Modal>
  )
}

// ── Submit Task Modal ─────────────────────────────────────────────────────────

function SubmitTaskModal({ assignment, onClose, onSubmitted }: {
  assignment: TaskAssignment & { training_tasks: TrainingTask }
  onClose: () => void
  onSubmitted: () => void
}) {
  const task = assignment.training_tasks
  const [form, setForm] = useState({
    action_log_ids: '', ticket_ids: '', screenshot_urls: '', links: '', notes: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function parseList(s: string) { return s.split('\n').map(x => x.trim()).filter(Boolean) }

  async function handleSubmit() {
    setLoading(true)
    const res = await fetch('/api/training/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assignment_id: assignment.id,
        profile_id: assignment.profile_id,
        action_log_ids: parseList(form.action_log_ids),
        ticket_ids: parseList(form.ticket_ids),
        screenshot_urls: parseList(form.screenshot_urls),
        links: parseList(form.links),
        notes: form.notes,
      }),
    })
    setLoading(false)
    if (!res.ok) { setError((await res.json()).error); return }
    onSubmitted()
  }

  return (
    <Modal title={`Submit: ${task?.title}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="p-3 rounded-lg bg-secondary/60 text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">{task?.description}</p>
          <p>Required evidence: <span className="text-primary">{EVIDENCE_LABELS[task?.evidence_type]}</span> · Min. {task?.min_submissions} submission(s)</p>
        </div>
        <Field label="Action Log IDs (one per line)">
          <textarea value={form.action_log_ids} onChange={e => setForm(f => ({ ...f, action_log_ids: e.target.value }))}
            rows={2} placeholder="log-123&#10;log-456"
            className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none font-mono" />
        </Field>
        <Field label="Ticket IDs (one per line)">
          <textarea value={form.ticket_ids} onChange={e => setForm(f => ({ ...f, ticket_ids: e.target.value }))}
            rows={2} placeholder="ticket-001&#10;ticket-002"
            className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none font-mono" />
        </Field>
        <Field label="Screenshot URLs (one per line)">
          <textarea value={form.screenshot_urls} onChange={e => setForm(f => ({ ...f, screenshot_urls: e.target.value }))}
            rows={2} placeholder="https://..."
            className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
        </Field>
        <Field label="Links (one per line)">
          <textarea value={form.links} onChange={e => setForm(f => ({ ...f, links: e.target.value }))}
            rows={2} placeholder="https://..."
            className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
        </Field>
        <Field label="Notes">
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={3} placeholder="Additional context about your submission..."
            className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
        </Field>
        {error && <p className="text-xs text-critical-red">{error}</p>}
        <ModalActions onClose={onClose} onConfirm={handleSubmit} loading={loading} confirmLabel="Submit Evidence" confirmColor="bg-primary" />
      </div>
    </Modal>
  )
}

// ── Profile Detail Modal ──────────────────────────────────────────────────────

function ProfileDetailModal({ profile, onClose, onReview, admin, session }: {
  profile: TrainingProfile
  onClose: () => void
  onReview: (a: TaskAssignment & { training_tasks: TrainingTask }) => void
  admin: boolean
  session: ReturnType<typeof getClientSession>
}) {
  const [assignments, setAssignments] = useState<(TaskAssignment & { training_tasks: TrainingTask })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch full assignments for this profile
    supabase
      .from('task_assignments')
      .select('*, training_tasks(*)')
      .eq('profile_id', profile.id)
      .then(({ data }) => {
        setAssignments((data as any) ?? [])
        setLoading(false)
      })
  }, [profile.id])

  async function reloadAssignments() {
    setLoading(true)
    const { data } = await supabase.from('task_assignments').select('*, training_tasks(*)').eq('profile_id', profile.id)
    setAssignments((data as any) ?? [])
    setLoading(false)
  }

  const canReview = admin || profile.trainer_discord_id === session?.discordId
  const reviewable = assignments.filter(a => ['submitted', 'under_review'].includes(a.status))

  return (
    <Modal title={`${profile.trial_mod_username}'s Training`} onClose={onClose} wide>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" size={24} /></div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={Award} label="XP Earned" value={profile.xp_earned} />
            <StatCard icon={Star} label="Level" value={getLevelFromXP(profile.xp_earned).level} />
            <StatCard icon={CheckCircle2} label="Approved" value={assignments.filter(a => a.status === 'approved').length} />
            <StatCard icon={Clock} label="Pending" value={assignments.filter(a => ['submitted', 'under_review'].includes(a.status)).length} />
          </div>

          {reviewable.length > 0 && canReview && (
            <div>
              <p className="text-xs font-semibold text-warning-amber mb-2 uppercase tracking-wide">Pending Review ({reviewable.length})</p>
              <div className="space-y-2">
                {reviewable.map(a => (
                  <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg bg-warning-amber/10 border border-warning-amber/20">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{a.training_tasks?.title}</p>
                      <p className="text-xs text-muted-foreground">Submitted {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <button
                      onClick={() => onReview(a)}
                      className="px-2.5 py-1.5 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors shrink-0"
                    >
                      Review
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">All Tasks</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {assignments.map(a => {
                const status = STATUS_CONFIG[a.status]
                return (
                  <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/40">
                    <status.icon size={13} className={status.color} />
                    <span className="text-sm text-foreground flex-1 truncate">{a.training_tasks?.title}</span>
                    <span className={cn('text-xs', status.color)}>{status.label}</span>
                    {a.status === 'approved' && <span className="text-xs text-shrine-gold">+{a.xp_awarded}</span>}
                    {canReview && a.status !== 'approved' && (
                      <button
                        onClick={async () => {
                          // quick approve without opening review modal
                          await fetch('/api/training/submissions', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ assignment_id: a.id, profile_id: profile.id, action: 'approve', feedback: '' }),
                          })
                          await reloadAssignments()
                        }}
                        className="ml-2 px-2 py-1 text-xs rounded bg-success-green/10 text-success-green hover:bg-success-green/15 transition-colors"
                        title="Mark complete"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ── Review Modal ──────────────────────────────────────────────────────────────

function ReviewModal({ assignment, profile, onClose, onReviewed }: {
  assignment: TaskAssignment & { training_tasks: TrainingTask }
  profile: TrainingProfile
  onClose: () => void
  onReviewed: () => void
}) {
  const [submissions, setSubmissions] = useState<TaskSubmission[]>([])
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)
  const [subLoading, setSubLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/training/submissions?assignment_id=${assignment.id}`)
      .then(r => r.json())
      .then(d => { setSubmissions(d); setSubLoading(false) })
  }, [assignment.id])

  async function review(action: 'approve' | 'reject') {
    setLoading(true)
    await fetch('/api/training/submissions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignment_id: assignment.id, profile_id: profile.id, action, feedback }),
    })
    setLoading(false)
    onReviewed()
  }

  const task = assignment.training_tasks

  return (
    <Modal title={`Review: ${task?.title}`} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="p-3 rounded-lg bg-secondary/60 text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">{task?.description}</p>
          <p>Submitted by <span className="text-foreground">{profile.trial_mod_username}</span> · +{task?.xp_reward} XP on approval</p>
        </div>

        {subLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="animate-spin text-primary" size={20} /></div>
        ) : submissions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No submission data found.</p>
        ) : submissions.map(sub => (
          <div key={sub.id} className="space-y-2">
            {sub.action_log_ids.length > 0 && (
              <EvidenceBlock icon={Hash} label="Action Log IDs" items={sub.action_log_ids} />
            )}
            {sub.ticket_ids.length > 0 && (
              <EvidenceBlock icon={Hash} label="Ticket IDs" items={sub.ticket_ids} />
            )}
            {sub.screenshot_urls.length > 0 && (
              <EvidenceBlock icon={Image} label="Screenshots" items={sub.screenshot_urls} isLink />
            )}
            {sub.links.length > 0 && (
              <EvidenceBlock icon={Link2} label="Links" items={sub.links} isLink />
            )}
            {sub.notes && (
              <div className="p-3 rounded-lg bg-secondary/50">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Notes</p>
                <p className="text-sm text-foreground">{sub.notes}</p>
              </div>
            )}
          </div>
        ))}

        <Field label="Reviewer Feedback">
          <textarea value={feedback} onChange={e => setFeedback(e.target.value)}
            rows={3} placeholder="Leave feedback for the trial moderator..."
            className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
        </Field>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground text-sm hover:bg-secondary/80 transition-colors">Cancel</button>
          <button onClick={() => review('reject')} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-critical-red/20 text-critical-red text-sm font-medium hover:bg-critical-red/30 transition-colors disabled:opacity-50">
            <XCircle size={13} /> Reject
          </button>
          <button onClick={() => review('approve')} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-success-green/20 text-success-green text-sm font-medium hover:bg-success-green/30 transition-colors disabled:opacity-50">
            {loading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />} Approve
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Lock Profile Modal ────────────────────────────────────────────────────────

function LockProfileModal({ profile, onClose, onLocked }: {
  profile: TrainingProfile; onClose: () => void; onLocked: () => void
}) {
  const [recommendation, setRecommendation] = useState<Recommendation>('promote')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLock() {
    setLoading(true)
    const s = getClientSession()
    await fetch('/api/training/profiles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: profile.id,
        action: 'lock',
        recommendation,
        trainer_notes: notes,
        training_status: 'locked',
        completed_at: new Date().toISOString(),
        trainer_discord_id: s?.discordId ?? null,
        trainer_username: s?.username ?? null,
      }),
    })
    setLoading(false)
    onLocked()
  }

  return (
    <Modal title="Complete Training" onClose={onClose}>
      <div className="space-y-3">
        <div className="p-3 rounded-lg bg-warning-amber/10 border border-warning-amber/20 text-sm text-warning-amber">
          <div className="flex items-center gap-2 mb-1"><AlertCircle size={14} /><span className="font-medium">This will lock {profile.trial_mod_username}'s profile</span></div>
          <p className="text-xs opacity-80">No further task submissions will be accepted. Only an Administrator can unlock the profile.</p>
        </div>
        <Field label="Final Recommendation">
          <select value={recommendation} onChange={e => setRecommendation(e.target.value as Recommendation)}
            className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
            <option value="promote">Promote</option>
            <option value="extend_training">Extend Training</option>
            <option value="deny_promotion">Deny Promotion</option>
          </select>
        </Field>
        <Field label="Trainer Notes">
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            rows={4} placeholder="Final evaluation notes..."
            className="w-full bg-secondary border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
        </Field>
        <ModalActions onClose={onClose} onConfirm={handleLock} loading={loading}
          confirmLabel="Lock & Complete Training" confirmColor="bg-warning-amber text-black hover:bg-warning-amber/80" />
      </div>
    </Modal>
  )
}

// ── Report Modal ──────────────────────────────────────────────────────────────

function ReportModal({ profile, profiles, onClose, onUpdate, admin, session }: {
  profile: TrainingProfile
  profiles: TrainingProfile[]
  onClose: () => void
  onUpdate: () => void
  admin: boolean
  session: ReturnType<typeof getClientSession>
}) {
  const [assignments, setAssignments] = useState<(TaskAssignment & { training_tasks: TrainingTask })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('task_assignments').select('*, training_tasks(*)').eq('profile_id', profile.id)
      .then(({ data }) => { setAssignments((data as any) ?? []); setLoading(false) })
  }, [profile.id])

  const lvl = getLevelFromXP(profile.xp_earned)
  const approved = assignments.filter(a => a.status === 'approved').length
  const rejected = assignments.filter(a => a.status === 'rejected').length
  const rec = profile.recommendation ? RECOMMENDATION_CONFIG[profile.recommendation] : null

  const startDate = new Date(profile.started_at)
  const endDate = profile.locked_at ? new Date(profile.locked_at) : new Date()
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <Modal title="Final Training Report" onClose={onClose} wide>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" size={24} /></div>
      ) : (
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/40 border border-border">
            <div className="w-12 h-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
              <span className="text-base font-bold text-primary">{profile.trial_mod_username.slice(0, 2).toUpperCase()}</span>
            </div>
            <div className="flex-1">
              <p className="font-bold text-foreground">{profile.trial_mod_username}</p>
              <p className="text-sm text-muted-foreground">Trainer: {profile.trainer_username ?? 'N/A'} · {days} day{days !== 1 ? 's' : ''} training</p>
            </div>
            {rec && (
              <span className={cn('text-sm font-bold px-3 py-1.5 rounded-lg', rec.color, rec.bg)}>{rec.label}</span>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={Award}       label="XP Earned"   value={profile.xp_earned} />
            <StatCard icon={Star}        label="Final Level"  value={`Level ${lvl.level}`} />
            <StatCard icon={CheckCircle2} label="Approved"   value={approved} />
            <StatCard icon={XCircle}     label="Rejected"    value={rejected} />
          </div>

          {/* XP Progress */}
          <div className="p-3 rounded-lg bg-secondary/40 border border-border">
            <XPBar xp={profile.xp_earned} />
          </div>

          {/* Task Breakdown */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Task Results</p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {assignments.map(a => {
                const status = STATUS_CONFIG[a.status]
                return (
                  <div key={a.id} className="flex items-center gap-2 p-2 rounded bg-secondary/40 text-xs">
                    <status.icon size={11} className={status.color} />
                    <span className="flex-1 truncate text-foreground">{a.training_tasks?.title}</span>
                    <span className={status.color}>{status.label}</span>
                    {a.xp_awarded > 0 && <span className="text-shrine-gold">+{a.xp_awarded} XP</span>}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Trainer Notes */}
          {profile.trainer_notes && (
            <div className="p-3 rounded-lg bg-secondary/40 border border-border">
              <p className="text-xs font-semibold text-muted-foreground mb-1">Trainer Notes</p>
              <p className="text-sm text-foreground">{profile.trainer_notes}</p>
            </div>
          )}

          {/* Admin Promotion Actions */}
          {admin && profile.training_status === 'locked' && (
            <div className="flex gap-2 pt-1 border-t border-border">
              <p className="text-xs text-muted-foreground flex-1 self-center">Admin decision:</p>
              <button
                onClick={async () => {
                  await fetch('/api/training/profiles', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: profile.id, recommendation: 'deny_promotion' }),
                  })
                  onUpdate(); onClose()
                }}
                className="px-3 py-1.5 rounded text-xs font-medium bg-critical-red/15 text-critical-red hover:bg-critical-red/25 transition-colors"
              >Deny</button>
              <button
                onClick={async () => {
                  await fetch('/api/training/profiles', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: profile.id, recommendation: 'extend_training' }),
                  })
                  onUpdate(); onClose()
                }}
                className="px-3 py-1.5 rounded text-xs font-medium bg-warning-amber/15 text-warning-amber hover:bg-warning-amber/25 transition-colors"
              >Extend</button>
              <button
                onClick={async () => {
                  await fetch('/api/training/profiles', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: profile.id, recommendation: 'promote' }),
                  })
                  onUpdate(); onClose()
                }}
                className="px-3 py-1.5 rounded text-xs font-medium bg-success-green/15 text-success-green hover:bg-success-green/25 transition-colors"
              >Approve Promotion</button>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

// ── Shared UI Components ──────────────────────────────────────────────────────

function Modal({ title, onClose, children, wide }: {
  title: string; onClose: () => void; children: React.ReactNode; wide?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className={cn('bg-card border border-border rounded-xl shadow-2xl w-full max-h-[90vh] overflow-y-auto', wide ? 'max-w-2xl' : 'max-w-md')}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="font-semibold text-foreground">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}

function ModalActions({ onClose, onConfirm, loading, confirmLabel, confirmColor }: {
  onClose: () => void; onConfirm: () => void; loading: boolean; confirmLabel: string; confirmColor?: string
}) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button onClick={onClose} className="px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground text-sm hover:bg-secondary/80 transition-colors">Cancel</button>
      <button onClick={onConfirm} disabled={loading}
        className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50',
          confirmColor ?? 'bg-primary text-primary-foreground hover:bg-primary/90')}>
        {loading && <Loader2 size={12} className="animate-spin" />}
        {confirmLabel}
      </button>
    </div>
  )
}

function EvidenceBlock({ icon: Icon, label, items, isLink }: {
  icon: React.ElementType; label: string; items: string[]; isLink?: boolean
}) {
  return (
    <div className="p-3 rounded-lg bg-secondary/50">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={12} className="text-primary" />
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      </div>
      <div className="space-y-1">
        {items.map((item, i) => (
          isLink ? (
            <a key={i} href={item} target="_blank" rel="noopener noreferrer"
              className="block text-xs text-primary hover:underline truncate">{item}</a>
          ) : (
            <p key={i} className="text-xs font-mono text-foreground bg-secondary/80 px-2 py-1 rounded">{item}</p>
          )
        ))}
      </div>
    </div>
  )
}
