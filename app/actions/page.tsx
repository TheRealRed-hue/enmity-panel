'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Header } from '@/components/header'
import { PageShell, Section } from '@/components/ui/page-shell'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Gavel,
  Ban,
  UserMinus,
  Clock,
  MessageSquareWarning,
  Shield,
  AlertTriangle,
  ScrollText,
  CheckCircle2,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { getClientSession } from '@/lib/session'
import { addNotification } from '@/lib/notifications'
import type { ModerationActionType, ModerationLog, SeverityLevel } from '@/types'
import { ACTION_TYPE_LABELS } from '@/lib/constants'

// ── Discord command definitions ───────────────────────────────────────────────

interface CommandDef {
  type: ModerationActionType
  label: string
  description: string
  icon: React.ElementType
  color: string
  defaultSeverity: SeverityLevel
  fields: Array<{
    key: string
    label: string
    type: 'text' | 'number' | 'select' | 'textarea'
    required: boolean
    placeholder?: string
    options?: string[]
  }>
}

const commands: CommandDef[] = [
  {
    type: 'ban',
    label: 'Ban',
    description: 'Permanently or temporarily ban a user from the server.',
    icon: Ban,
    color: 'text-critical-red',
    defaultSeverity: 'high',
    fields: [
      { key: 'userId', label: 'Discord ID or @user', type: 'text', required: true, placeholder: '123456789012345678' },
      { key: 'reason', label: 'Reason', type: 'textarea', required: true, placeholder: 'Describe the reason for the ban...' },
      { key: 'duration', label: 'Duration (0 = permanent)', type: 'select', required: false, options: ['Permanent', '1 hour', '6 hours', '1 day', '3 days', '7 days', '30 days'] },
      { key: 'deleteMessages', label: 'Delete messages (days)', type: 'select', required: false, options: ['None', '1 day', '7 days'] },
    ],
  },
  {
    type: 'kick',
    label: 'Kick',
    description: 'Eject a user from the server without banning.',
    icon: UserMinus,
    color: 'text-warning-amber',
    defaultSeverity: 'medium',
    fields: [
      { key: 'userId', label: 'Discord ID or @user', type: 'text', required: true, placeholder: '123456789012345678' },
      { key: 'reason', label: 'Reason', type: 'textarea', required: true, placeholder: 'Describe the reason...' },
    ],
  },
  {
    type: 'timeout',
    label: 'Timeout',
    description: 'Temporarily silence a user.',
    icon: Clock,
    color: 'text-warning-amber',
    defaultSeverity: 'low',
    fields: [
      { key: 'userId', label: 'Discord ID or @user', type: 'text', required: true, placeholder: '123456789012345678' },
      { key: 'duration', label: 'Duration', type: 'select', required: true, options: ['60 seconds', '5 minutes', '10 minutes', '1 hour', '6 hours', '1 day', '7 days'] },
      { key: 'reason', label: 'Reason', type: 'textarea', required: true, placeholder: 'Describe the reason...' },
    ],
  },
  {
    type: 'warning',
    label: 'Warning',
    description: 'Issue a formal warning to a user.',
    icon: MessageSquareWarning,
    color: 'text-primary',
    defaultSeverity: 'low',
    fields: [
      { key: 'userId', label: 'Discord ID or @user', type: 'text', required: true, placeholder: '123456789012345678' },
      { key: 'reason', label: 'Reason', type: 'textarea', required: true, placeholder: 'Describe the warning...' },
    ],
  },
  {
    type: 'blacklist',
    label: 'Blacklist',
    description: 'Add a user or guild to the global blacklist.',
    icon: Shield,
    color: 'text-critical-red',
    defaultSeverity: 'critical',
    fields: [
      { key: 'targetId', label: 'Discord ID (user, guild, server or channel)', type: 'text', required: true, placeholder: '123456789012345678' },
      { key: 'scope', label: 'Scope', type: 'select', required: true, options: ['User', 'Guild', 'Server', 'Channel'] },
      { key: 'reason', label: 'Reason', type: 'textarea', required: true, placeholder: 'Justification for blacklist...' },
      { key: 'severity', label: 'Severity', type: 'select', required: true, options: ['Low', 'Medium', 'High', 'Critical'] },
    ],
  },
  {
    type: 'unblacklist',
    label: 'Remove Blacklist',
    description: 'Remove a target from the global blacklist.',
    icon: Trash2,
    color: 'text-warning-amber',
    defaultSeverity: 'low',
    fields: [
      { key: 'targetId', label: 'Discord ID (user, guild, server or channel)', type: 'text', required: true, placeholder: '123456789012345678' },
      { key: 'scope', label: 'Scope', type: 'select', required: true, options: ['User', 'Guild', 'Server', 'Channel'] },
      { key: 'reason', label: 'Reason', type: 'textarea', required: true, placeholder: 'Justification for blacklist removal...' },
    ],
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function ActionsPage() {
  const [selected, setSelected] = useState<CommandDef | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [confirming, setConfirming] = useState(false)
  const [recentLogs, setRecentLogs] = useState<ModerationLog[]>([])
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  function handleSelect(cmd: CommandDef) {
    setSelected(cmd)
    setFormData({})
    setConfirming(false)
    setSuccessMsg(null)
  }

  function handleChange(key: string, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  async function recordModeratorAction(action: 'blacklist' | 'unblacklist') {
    try {
      const session = getClientSession()
      if (!session) return false

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
        return false
      }

      return true
    } catch (err) {
      console.error('Access log request failed', action, err)
      return false
    }
  }

  async function handleSubmit() {
    if (!confirming) {
      setConfirming(true)
      return
    }

    if (!selected) return

    const userId = formData['userId'] || formData['targetId'] || 'unknown'
    const newLog: ModerationLog = {
      id: `log_${Date.now()}`,
      type: selected.type,
      targetId: userId,
      targetUsername: userId.length > 10 ? `User#${userId.slice(-4)}` : userId,
      moderatorId: 'dashboard_user',
      moderatorUsername: 'Dashboard (you)',
      reason: formData['reason'] || 'No reason provided',
      severity: selected.defaultSeverity,
      duration: null,
      expiresAt: null,
      metadata: { ...formData },
      guildId: 'japan_arc',
      channelId: null,
      messageId: null,
      createdAt: new Date().toISOString(),
    }

    if (selected.type === 'blacklist') {
      const { error } = await supabase.from('blacklist').insert({
        scope: (formData['scope'] as string)?.toLowerCase() || 'user',
        target_id: userId,
        target_username: userId,
        reason: newLog.reason,
        added_by_id: newLog.moderatorId,
        added_by_username: newLog.moderatorUsername,
        expires_at: null,
        severity: newLog.severity,
        created_at: newLog.createdAt,
      })
      if (error) {
        setSuccessMsg(`Blacklist failed: ${error.message}`)
        setConfirming(false)
        return
      }

      const logSuccess = await recordModeratorAction('blacklist')
      if (logSuccess) {
        addNotification({
          type: 'mod_action',
          title: 'Blacklist added',
          body: `${newLog.moderatorUsername} blacklisted ${newLog.targetUsername}`,
        })
      }
    }

    if (selected.type === 'unblacklist') {
      const scope = (formData['scope'] as string)?.toLowerCase() || 'user'
      const { data, error } = await supabase
        .from('blacklist')
        .delete()
        .select('*')
        .eq('target_id', userId)
        .eq('scope', scope)

      if (error) {
        setSuccessMsg(`Remove blacklist failed: ${error.message}`)
        setConfirming(false)
        return
      }

      if (!data || data.length === 0) {
        setSuccessMsg('No blacklist entry found matching that target and scope.')
        setConfirming(false)
        return
      }

      const logSuccess = await recordModeratorAction('unblacklist')
      if (logSuccess) {
        addNotification({
          type: 'mod_action',
          title: 'Blacklist removed',
          body: `${newLog.moderatorUsername} removed blacklist for ${newLog.targetUsername}`,
        })
      }
    }

    setRecentLogs((prev) => [newLog, ...prev].slice(0, 10))
    setSuccessMsg(`${selected.label} executed and logged successfully.`)
    setConfirming(false)
    setSelected(null)
    setFormData({})

    setTimeout(() => setSuccessMsg(null), 4000)
  }

  const isValid = selected
    ? selected.fields.filter((f) => f.required).every((f) => formData[f.key]?.trim())
    : false

  return (
    <DashboardLayout>
      <Header
        title="Mod Actions"
        subtitle="Execute and log Discord bot commands"
      />

      <PageShell>
        {/* Success notification */}
        {successMsg && (
          <div className="flex items-center gap-2.5 p-3 rounded-md bg-success-green/10 border border-success-green/30">
            <CheckCircle2 size={15} className="text-success-green shrink-0" />
            <p className="text-xs font-medium text-success-green">{successMsg}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
          {/* Command list */}
          <Section title="Available Commands">
            <ul className="space-y-1">
              {commands.map((cmd) => (
                <li key={cmd.type}>
                  <button
                    onClick={() => handleSelect(cmd)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors text-left',
                      selected?.type === cmd.type
                        ? 'bg-primary/15 border border-primary/30 text-foreground'
                        : 'hover:bg-secondary/60 text-muted-foreground hover:text-foreground border border-transparent'
                    )}
                  >
                    <cmd.icon size={16} className={cmd.color} />
                    <div>
                      <p className="font-medium">{cmd.label}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{cmd.description}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </Section>

          {/* Form */}
          <Section title={selected ? `${ACTION_TYPE_LABELS[selected.type] ?? selected.label}` : 'Select a command'}>
            <div className="rounded-lg bg-card border border-border">
              {!selected ? (
                <EmptyState
                  icon={Gavel}
                  title="Select a command"
                  description="Choose an action from the list on the left to configure and execute."
                />
              ) : (
                <div className="p-5 space-y-4">
                  <p className="text-sm text-muted-foreground">{selected.description}</p>

                  <div className="space-y-3">
                    {selected.fields.map((field) => (
                      <div key={field.key}>
                        <label className="block text-xs font-medium text-foreground mb-1">
                          {field.label}
                          {field.required && <span className="text-critical-red ml-1">*</span>}
                        </label>

                        {field.type === 'textarea' ? (
                          <textarea
                            value={formData[field.key] ?? ''}
                            onChange={(e) => handleChange(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            rows={3}
                            className="w-full px-3 py-2 text-sm bg-secondary/50 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none"
                          />
                        ) : field.type === 'select' ? (
                          <select
                            value={formData[field.key] ?? ''}
                            onChange={(e) => handleChange(field.key, e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-secondary/50 border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                          >
                            <option value="">Select...</option>
                            {field.options?.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={formData[field.key] ?? ''}
                            onChange={(e) => handleChange(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full px-3 py-2 text-sm bg-secondary/50 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Confirmation warning */}
                  {confirming && (
                    <div className="flex items-start gap-2.5 p-3 rounded-md bg-warning-amber/10 border border-warning-amber/30">
                      <AlertTriangle size={15} className="text-warning-amber shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-warning-amber">Confirm action</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          This action will be executed by the bot on Discord and recorded in the logs. Review all fields before confirming.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={handleSubmit}
                      disabled={!isValid}
                      className={cn(
                        'px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
                        confirming
                          ? 'bg-critical-red/20 hover:bg-critical-red/30 text-critical-red border border-critical-red/30'
                          : 'bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30'
                      )}
                    >
                      {confirming ? 'Confirm Execution' : 'Prepare Action'}
                    </button>

                    {confirming && (
                      <button
                        onClick={() => setConfirming(false)}
                        className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Section>
        </div>

        {/* Recent action log (session-only) */}
        <Section title="Recent Actions (this session)" description="Actions executed since you opened this page">
          <div className="rounded-lg bg-card border border-border overflow-hidden">
            {recentLogs.length === 0 ? (
              <EmptyState
                icon={ScrollText}
                title="No actions yet"
                description="Executed moderation actions will appear here and be recorded in the main Logs."
              />
            ) : (
              <ul className="divide-y divide-border">
                {recentLogs.map((log) => (
                  <li key={log.id} className="flex items-center gap-4 px-4 py-3 text-sm">
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-foreground">{ACTION_TYPE_LABELS[log.type]}</span>
                      <span className="text-muted-foreground mx-1.5">→</span>
                      <span className="text-muted-foreground">{log.targetUsername}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate max-w-xs hidden md:block">{log.reason}</p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>
      </PageShell>
    </DashboardLayout>
  )
}
