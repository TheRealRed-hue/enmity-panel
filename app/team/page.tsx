'use client'

import { useState, useEffect, useRef } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Header } from '@/components/header'
import { PageShell, Section } from '@/components/ui/page-shell'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Users, Search, UserPlus, CheckCircle, XCircle,
  MoreVertical, X, AlertCircle, Wifi, WifiOff, Pause,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROLE_CONFIG, PERMISSION_LABELS } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import { getClientSession } from '@/lib/session'
import type { Permission, DashboardRole } from '@/types'

const allPermissions = Object.keys(PERMISSION_LABELS) as Permission[]
const allRoles = Object.keys(ROLE_CONFIG) as DashboardRole[]

interface StaffRow {
  id: string
  discord_id: string
  username: string
  global_name: string | null
  avatar: string | null
  dashboard_role: DashboardRole
  permissions: string[]
  status: string
  online: boolean
  last_login_at: string | null
  actions_this_week: number
  total_actions: number
  created_at: string
}

interface AddMemberModalProps {
  onClose: () => void
  onAdd: () => void
}

function AddMemberModal({ onClose, onAdd }: AddMemberModalProps) {
  const [discordId, setDiscordId] = useState('')
  const [username, setUsername] = useState('')
  const [role, setRole] = useState<DashboardRole>('trial_moderator')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleAdd() {
    if (!discordId.trim() || !username.trim()) {
      setError('Discord ID and username are required.')
      return
    }
    if (!/^\d{17,20}$/.test(discordId.trim())) {
      setError('Discord ID must be a valid snowflake (17–20 digits).')
      return
    }
    setError('')
    setLoading(true)

    const { error: dbError } = await supabase
      .from('staff_members')
      .upsert({
        discord_id: discordId.trim(),
        username: username.trim(),
        dashboard_role: role,
        permissions: ROLE_CONFIG[role].permissions,
        status: 'active',
        online: false,
      }, { onConflict: 'discord_id' })

    setLoading(false)

    if (dbError) {
      setError(dbError.message)
      return
    }

    onAdd()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card border border-border rounded-xl shadow-2xl p-6 mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-foreground">Add Team Member</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Discord ID <span className="text-critical-red">*</span>
            </label>
            <input
              type="text"
              value={discordId}
              onChange={(e) => setDiscordId(e.target.value)}
              placeholder="e.g. 123456789012345678"
              className="w-full px-3 py-2 text-sm bg-secondary/50 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Username <span className="text-critical-red">*</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. moderator_name"
              className="w-full px-3 py-2 text-sm bg-secondary/50 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Dashboard Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as DashboardRole)}
              className="w-full px-3 py-2 text-sm bg-secondary/50 border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            >
              {allRoles.map((r) => (
                <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-md bg-critical-red/10 border border-critical-red/20">
              <AlertCircle size={13} className="text-critical-red shrink-0" />
              <p className="text-xs text-critical-red">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={handleAdd}
              disabled={loading}
              className="flex-1 py-2 rounded-md text-sm font-medium bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 transition-colors disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Member'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TeamPage() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<DashboardRole | 'all'>('all')
  const [activeTab, setActiveTab] = useState<'members' | 'permissions'>('members')
  const [team, setTeam] = useState<StaffRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  async function fetchTeam() {
    const { data } = await supabase
      .from('staff_members')
      .select('*')
      .order('created_at', { ascending: false })
    setTeam(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchTeam()

    const channel = supabase
      .channel('staff_members')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_members' }, () => {
        fetchTeam()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const filtered = team.filter((m) => {
    const matchesRole = roleFilter === 'all' || m.dashboard_role === roleFilter
    const matchesSearch =
      !search ||
      m.username.toLowerCase().includes(search.toLowerCase()) ||
      m.discord_id.includes(search)
    return matchesRole && matchesSearch
  })

  const onlineCount = team.filter((m) => m.online).length

  return (
    <DashboardLayout>
      <Header
        title="Team"
        subtitle="Staff management and permissions (RBAC)"
        actions={
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-primary/20 hover:bg-primary/30 transition-colors text-primary border border-primary/30"
          >
            <UserPlus size={13} />
            Add Member
          </button>
        }
      />

      {showAddModal && (
        <AddMemberModal
          onClose={() => setShowAddModal(false)}
          onAdd={fetchTeam}
        />
      )}

      <PageShell>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-card border border-border">
            <Users size={14} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Total:</span>
            <span className="text-xs font-semibold text-foreground">{team.length}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-card border border-border">
            <Wifi size={14} className="text-success-green" />
            <span className="text-xs text-muted-foreground">Online:</span>
            <span className="text-xs font-semibold text-success-green">{onlineCount}</span>
          </div>
        </div>

        <div className="flex gap-1 border-b border-border">
          {(['members', 'permissions'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-2 text-sm font-medium transition-colors -mb-px border-b-2',
                activeTab === tab
                  ? 'text-foreground border-primary'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              )}
            >
              {tab === 'members' ? 'Members' : 'Permission Matrix'}
            </button>
          ))}
        </div>

        {activeTab === 'members' && (
          <>
            <Section>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by name or Discord ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-sm bg-secondary/50 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as DashboardRole | 'all')}
                  className="px-3 py-2 text-sm bg-secondary/50 border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                >
                  <option value="all">All roles</option>
                  {allRoles.map((r) => (
                    <option key={r} value={r}>{ROLE_CONFIG[r].label}</option>
                  ))}
                </select>
              </div>
            </Section>

            <Section>
              <div className="rounded-lg bg-card border border-border">
                <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_48px] gap-4 px-4 py-2.5 border-b border-border bg-secondary/20 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  <span>Member</span>
                  <span>Role</span>
                  <span>Status</span>
                  <span>Last Login</span>
                  <span>Actions (week)</span>
                  <span />
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-xs text-muted-foreground">Loading...</p>
                  </div>
                ) : filtered.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="No members found"
                    description={
                      team.length === 0
                        ? 'Members will appear here automatically after they sign in with Discord.'
                        : 'No member matches the current search.'
                    }
                  />
                ) : (
                  <ul className="divide-y divide-border">
                    {filtered.map((member) => (
                      <MemberRow key={member.id} member={member} onRefresh={fetchTeam} />
                    ))}
                  </ul>
                )}
              </div>
            </Section>
          </>
        )}

        {activeTab === 'permissions' && (
          <Section title="RBAC Permission Matrix">
            <div className="rounded-lg bg-card border border-border overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/20">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Permission
                    </th>
                    {allRoles.map((role) => (
                      <th key={role} className="px-3 py-3 text-xs font-medium text-center">
                        <span className={cn('font-semibold', ROLE_CONFIG[role].color)}>
                          {ROLE_CONFIG[role].label}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {allPermissions.map((perm) => (
                    <tr key={perm} className="hover:bg-secondary/10 transition-colors">
                      <td className="px-4 py-2.5 text-muted-foreground">{PERMISSION_LABELS[perm]}</td>
                      {allRoles.map((role) => {
                        const has = ROLE_CONFIG[role].permissions.includes(perm)
                        return (
                          <td key={role} className="px-3 py-2.5 text-center">
                            {has ? (
                              <CheckCircle size={14} className="inline text-success-green" />
                            ) : (
                              <XCircle size={14} className="inline text-muted-foreground/30" />
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        )}
      </PageShell>
    </DashboardLayout>
  )
}

function MemberRow({ member, onRefresh }: { member: StaffRow; onRefresh: () => void }) {
  const role = ROLE_CONFIG[member.dashboard_role as DashboardRole] ?? ROLE_CONFIG.moderator
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  async function handleSuspend() {
    const newStatus = member.status === 'suspended' ? 'active' : 'suspended'

    await supabase
      .from('staff_members')
      .update({ status: newStatus })
      .eq('id', member.id)

    // If we're suspending the user, also mark them offline and record a logout
    if (newStatus === 'suspended') {
      try {
        const session = getClientSession()
        await fetch('/api/auth/offline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            discordId: member.discord_id,
            username: member.username,
            dashboardRole: member.dashboard_role,
            actorDiscordId: session?.discordId ?? null,
            actorUsername: session?.username ?? null,
          }),
        })
      } catch (err) {
        // ignore failures — UI will refresh anyway
      }
    }

    setMenuOpen(false)
    onRefresh()
  }

  async function handleRemove() {
    await supabase
      .from('staff_members')
      .delete()
      .eq('id', member.id)
    setMenuOpen(false)
    onRefresh()
  }

  return (
    <li className="grid grid-cols-1 md:grid-cols-[2fr_1.5fr_1fr_1fr_1fr_48px] gap-2 md:gap-4 px-4 py-3 hover:bg-secondary/20 transition-colors items-center">
      <div className="flex items-center gap-2.5">
        <div className="relative shrink-0">
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center overflow-hidden">
            {member.avatar ? (
              <img src={member.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-semibold text-primary">
                {member.username.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <span className={cn(
            'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card',
            member.online ? 'bg-success-green' : 'bg-muted-foreground/40'
          )} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{member.username}</p>
          <p className="text-xs text-muted-foreground">{member.discord_id}</p>
        </div>
      </div>

      <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium w-fit', role.bgColor, role.color)}>
        {role.label}
      </span>

      <div className="flex items-center gap-1.5">
        {member.online ? (
          <><Wifi size={13} className="text-success-green" /><span className="text-xs text-success-green">Online</span></>
        ) : (
          <><WifiOff size={13} className="text-muted-foreground/50" /><span className="text-xs text-muted-foreground">Offline</span></>
        )}
      </div>

      <span className="text-xs text-muted-foreground">
        {member.last_login_at
          ? new Date(member.last_login_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
          : '—'}
      </span>

      <span className="text-sm font-medium text-foreground tabular-nums">
        {member.actions_this_week}
      </span>

      <div className="relative" ref={menuRef}>
        <button
          onClick={(e) => {
            e.stopPropagation()
            setMenuOpen((v) => !v)
          }}
          className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
        >
          <MoreVertical size={14} className="pointer-events-none" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-8 w-48 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
            <ul className="py-1">
              <li>
                <button
                  onClick={handleSuspend}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-warning-amber hover:bg-secondary transition-colors"
                >
                  <Pause size={13} />
                  {member.status === 'suspended' ? 'Unsuspend' : 'Suspend'}
                </button>
              </li>
              <li className="border-t border-border">
                <button
                  onClick={handleRemove}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-critical-red hover:bg-secondary transition-colors"
                >
                  <X size={13} />
                  Remove
                </button>
              </li>
            </ul>
          </div>
        )}
      </div>
    </li>
  )
}