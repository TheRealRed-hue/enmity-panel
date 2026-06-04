'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Header } from '@/components/header'
import { PageShell, Section } from '@/components/ui/page-shell'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Users, UserPlus, UserMinus, Activity,
  BarChart3, ScrollText, Ticket,
} from 'lucide-react'
import { subscribeStats, type ServerStats } from '@/lib/server-stats'

export default function OverviewPage() {
  const [stats, setStats] = useState<ServerStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeStats((s) => {
      setStats(s)
      setLoading(false)
    })
    return unsub
  }, [])

  return (
    <DashboardLayout>
      <Header
        title="Overview"
        subtitle="Moderation Dashboard — Enmity Exe"
      />

      <PageShell>
        {/* Members */}
        <Section title="Members">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              title="Total Members"
              value={loading ? null : stats?.total_members ?? 0}
              icon={Users}
              variant="primary"
            />
            <StatCard
              title="Active Members"
              value={loading ? null : stats?.active_members ?? 0}
              icon={Activity}
              variant="success"
            />
            <StatCard
              title="Joined Today"
              value={loading ? null : stats?.joined_today ?? 0}
              icon={UserPlus}
            />
            <StatCard
              title="Left Today"
              value={loading ? null : stats?.left_today ?? 0}
              icon={UserMinus}
            />
          </div>
        </Section>

        {/* Support */}
        <Section title="Support">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              title="Open Tickets"
              value={loading ? null : stats?.tickets ?? 0}
              icon={Ticket}
              variant="warning"
            />
          </div>
        </Section>

        {/* Last updated */}
        {stats?.updatedAt && (
          <p className="text-[11px] text-muted-foreground">
            Last updated: {new Date(stats.updatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            {' '}— updates every 10 seconds
          </p>
        )}

        {/* Charts placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Section title="Member Growth">
            <div className="rounded-lg bg-card border border-border">
              <EmptyState
                icon={BarChart3}
                title="Waiting for data"
                description="Connect historical data to display the growth chart."
              />
            </div>
          </Section>

          <Section title="Recent Activity">
            <div className="rounded-lg bg-card border border-border">
              <EmptyState
                icon={ScrollText}
                title="No recent activity"
                description="Moderation actions will appear here in real time."
              />
            </div>
          </Section>
        </div>
      </PageShell>
    </DashboardLayout>
  )
}
