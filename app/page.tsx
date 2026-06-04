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
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

export default function OverviewPage() {
  const [stats, setStats] = useState<ServerStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [snapshots, setSnapshots] = useState<any[] | null>(null)
  const [loadingSnapshots, setLoadingSnapshots] = useState(true)

  useEffect(() => {
    const unsub = subscribeStats((s) => {
      setStats(s)
      setLoading(false)
    })
    return unsub
  }, [])

  useEffect(() => {
    let mounted = true
    async function fetchSnapshots() {
      setLoadingSnapshots(true)
      try {
        const res = await fetch('/api/member-snapshots')
        if (!res.ok) throw new Error('failed')
        const data = await res.json()
        if (!mounted) return
        // map recorded_at -> formatted date
        const mapped = (data ?? []).map((r: any) => ({
          ...r,
          date: new Date(r.recorded_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' }),
        }))
        setSnapshots(mapped)
      } catch (err) {
        setSnapshots([])
      } finally {
        setLoadingSnapshots(false)
      }
    }

    fetchSnapshots()
    return () => { mounted = false }
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
            <div className="rounded-lg bg-card border border-border p-4 h-64">
              {loadingSnapshots || !snapshots ? (
                <div className="flex items-center justify-center h-full">
                  <EmptyState
                    icon={BarChart3}
                    title={loadingSnapshots ? 'Loading...' : 'Waiting for data'}
                    description="Connect historical data to display the growth chart."
                  />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={snapshots}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} width={45} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="total_members" stroke="#7c6ef7" strokeWidth={2} dot={false} name="Total Members" />
                    <Line type="monotone" dataKey="joined_today" stroke="#22c55e" strokeWidth={1.5} dot={false} name="Joins (hour)" />
                    <Line type="monotone" dataKey="left_today" stroke="#e05151" strokeWidth={1.5} dot={false} name="Leaves (hour)" />
                  </LineChart>
                </ResponsiveContainer>
              )}
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
