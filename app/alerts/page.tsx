'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Header } from '@/components/header'
import { PageShell, Section } from '@/components/ui/page-shell'
import { EmptyState } from '@/components/ui/empty-state'
import { SeverityBadge } from '@/components/ui/severity-badge'
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  X,
  Filter,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Alert, AlertStatus, SeverityLevel } from '@/types'

// ── Empty state — real data from WebSocket / API ──────────────────────────────

const alerts: Alert[] = []

const statusLabels: Record<AlertStatus, { label: string; color: string }> = {
  active: { label: 'Active', color: 'text-critical-red' },
  acknowledged: { label: 'Acknowledged', color: 'text-warning-amber' },
  resolved: { label: 'Resolved', color: 'text-success-green' },
}

type FilterSeverity = 'all' | SeverityLevel
type FilterStatus = 'all' | AlertStatus

export default function AlertsPage() {
  const [severityFilter, setSeverityFilter] = useState<FilterSeverity>('all')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('active')

  const filtered = alerts.filter((a) => {
    const matchesSeverity = severityFilter === 'all' || a.severity === severityFilter
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter
    return matchesSeverity && matchesStatus
  })

  const activeCount = alerts.filter((a) => a.status === 'active').length
  const criticalCount = alerts.filter((a) => a.severity === 'critical' && a.status === 'active').length

  return (
    <DashboardLayout>
      <Header
        title="Alerts"
        subtitle="Real-time incident monitoring"
      />

      <PageShell>
        {/* Summary row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(
            [
              { label: 'Active Alerts', value: activeCount, color: 'text-critical-red', bg: 'bg-critical-red/10 border-critical-red/20' },
              { label: 'Critical', value: criticalCount, color: 'text-critical-red', bg: 'bg-critical-red/10 border-critical-red/20' },
              { label: 'Acknowledged', value: alerts.filter((a) => a.status === 'acknowledged').length, color: 'text-warning-amber', bg: 'bg-warning-amber/10 border-warning-amber/20' },
              { label: 'Resolved Today', value: 0, color: 'text-success-green', bg: 'bg-success-green/10 border-success-green/20' },
            ] as const
          ).map((item) => (
            <div key={item.label} className={cn('rounded-lg border p-3', item.bg)}>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={cn('text-2xl font-semibold mt-1', item.color)}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <Section>
          <div className="flex flex-wrap gap-2">
            {/* Status filter */}
            <div className="flex items-center gap-1 border border-border rounded-md p-1">
              {(['all', 'active', 'acknowledged', 'resolved'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                    statusFilter === s
                      ? 'bg-primary/20 text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {s === 'all' ? 'All' : statusLabels[s].label}
                </button>
              ))}
            </div>

            {/* Severity filter */}
            <div className="flex items-center gap-1 border border-border rounded-md p-1">
              {(['all', 'critical', 'high', 'medium', 'low'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSeverityFilter(s)}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                    severityFilter === s
                      ? 'bg-primary/20 text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* Alert list */}
        <Section>
          <div className="rounded-lg bg-card border border-border overflow-hidden">
            {filtered.length === 0 ? (
              <EmptyState
                icon={Bell}
                title={alerts.length === 0 ? 'No alerts' : 'No alerts found'}
                description={
                  alerts.length === 0
                    ? 'The alerts feed is currently empty. All systems are operational.'
                    : 'No alerts match the applied filters.'
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {filtered.map((alert) => (
                  <AlertRow key={alert.id} alert={alert} />
                ))}
              </ul>
            )}
          </div>
        </Section>
      </PageShell>
    </DashboardLayout>
  )
}

function AlertRow({ alert }: { alert: Alert }) {
  const status = statusLabels[alert.status]

  return (
    <li className="p-4 hover:bg-secondary/20 transition-colors">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          {alert.severity === 'critical' || alert.severity === 'high' ? (
            <AlertTriangle size={16} className="text-critical-red" />
          ) : (
            <Bell size={16} className="text-warning-amber" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground">{alert.title}</p>
            <SeverityBadge severity={alert.severity} />
            <span className={cn('text-xs font-medium', status.color)}>{status.label}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{alert.description}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-muted-foreground">{alert.source}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(alert.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
            </span>
            {alert.actionRequired && (
              <span className="text-xs font-medium text-warning-amber">Action required</span>
            )}
          </div>
        </div>

        {alert.status === 'active' && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              title="Acknowledge"
              className="p-1.5 rounded hover:bg-warning-amber/20 text-muted-foreground hover:text-warning-amber transition-colors"
            >
              <CheckCircle size={14} />
            </button>
            <button
              title="Resolve"
              className="p-1.5 rounded hover:bg-success-green/20 text-muted-foreground hover:text-success-green transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </li>
  )
}
