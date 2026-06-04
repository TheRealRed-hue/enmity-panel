'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Header } from '@/components/header'
import { PageShell, Section } from '@/components/ui/page-shell'
import { cn } from '@/lib/utils'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

// ── Mock data — replace with real API fetches ─────────────────────────────────

function generateMemberGrowth(days: number) {
  let members = 1200
  return Array.from({ length: days }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (days - 1 - i))
    members += Math.floor(Math.random() * 15) - 3
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      members,
      joins: Math.floor(Math.random() * 20) + 2,
      leaves: Math.floor(Math.random() * 8),
    }
  })
}

function generateModActions(days: number) {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (days - 1 - i))
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      bans: Math.floor(Math.random() * 5),
      kicks: Math.floor(Math.random() * 8),
      timeouts: Math.floor(Math.random() * 12),
      warnings: Math.floor(Math.random() * 15),
    }
  })
}

const staffActivity = [
  { name: 'Owner', actions: 42, color: '#c8a84b' },
  { name: 'Admin', actions: 87, color: '#e05151' },
  { name: 'Head Mod', actions: 134, color: '#d97706' },
  { name: 'Sr. Mod', actions: 198, color: '#7c6ef7' },
  { name: 'Moderator', actions: 243, color: '#2dd4bf' },
  { name: 'Trial Mod', actions: 89, color: '#6b7280' },
]

const verificationStats = [
  { name: 'Approved', value: 342, color: '#22c55e' },
  { name: 'Rejected', value: 48, color: '#e05151' },
  { name: 'Pending', value: 23, color: '#d97706' },
  { name: 'Expired', value: 15, color: '#6b7280' },
]

const ranges = [
  { key: '7d', label: '7 days', days: 7 },
  { key: '30d', label: '30 days', days: 30 },
  { key: '90d', label: '90 days', days: 90 },
] as const

type Range = typeof ranges[number]['key']

const tooltipStyle = {
  backgroundColor: '#0d1424',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '6px',
  color: '#e2e8f0',
  fontSize: '12px',
}

export default function AnalyticsPage() {
  const [range, setRange] = useState<Range>('7d')
  const days = ranges.find((r) => r.key === range)!.days

  const memberData = generateMemberGrowth(days)
  const modData = generateModActions(days)

  // Thin out ticks for large ranges
  const tickInterval = days <= 7 ? 0 : days <= 30 ? 3 : 13

  return (
    <DashboardLayout>
      <Header
        title="Analytics"
        subtitle="Server metrics and trends"
      />

      <PageShell>
        {/* Date range selector */}
        <Section>
          <div className="flex items-center gap-2">
            {ranges.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={cn(
                  'px-3 py-1.5 text-xs rounded-md border transition-colors',
                  range === r.key
                    ? 'bg-primary/20 text-primary border-primary/30'
                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </Section>

        {/* Charts grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Member Growth */}
          <Section title="Member Growth">
            <div className="rounded-lg bg-card border border-border p-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={memberData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} interval={tickInterval} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} width={45} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="members" stroke="#7c6ef7" strokeWidth={2} dot={false} name="Total Members" />
                  <Line type="monotone" dataKey="joins" stroke="#22c55e" strokeWidth={1.5} dot={false} name="Joins" />
                  <Line type="monotone" dataKey="leaves" stroke="#e05151" strokeWidth={1.5} dot={false} name="Leaves" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Section>

          {/* Moderation Actions */}
          <Section title="Moderation Actions">
            <div className="rounded-lg bg-card border border-border p-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 10 }} interval={tickInterval} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} width={30} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="bans" stackId="a" fill="#e05151" name="Bans" />
                  <Bar dataKey="kicks" stackId="a" fill="#d97706" name="Kicks" />
                  <Bar dataKey="timeouts" stackId="a" fill="#7c6ef7" name="Timeouts" />
                  <Bar dataKey="warnings" stackId="a" fill="#2dd4bf" name="Warnings" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>

          {/* Staff Activity */}
          <Section title="Staff Activity">
            <div className="rounded-lg bg-card border border-border p-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={staffActivity} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" tick={{ fill: '#9ca3af', fontSize: 11 }} width={70} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="actions" name="Actions" radius={[0, 4, 4, 0]}>
                    {staffActivity.map((entry, index) => (
                      <Cell key={index} fill={entry.color} fillOpacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>

          {/* Verification breakdown */}
          <Section title="Verification Breakdown">
            <div className="rounded-lg bg-card border border-border p-4 h-64 flex items-center gap-6">
              <ResponsiveContainer width="55%" height="100%">
                <PieChart>
                  <Pie
                    data={verificationStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {verificationStats.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2.5">
                {verificationStats.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                      <span className="text-xs text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-foreground tabular-nums">{item.value}</span>
                  </div>
                ))}
                <div className="pt-1 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Total</span>
                  <span className="text-xs font-bold text-foreground">
                    {verificationStats.reduce((s, i) => s + i.value, 0)}
                  </span>
                </div>
              </div>
            </div>
          </Section>
        </div>

        {/* Integration note */}
        <Section>
          <div className="rounded-lg bg-secondary/30 border border-border p-5">
            <h3 className="text-sm font-semibold text-foreground mb-2">Analytics Integration</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The charts above currently show mock data. Connect these services to show real data:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { label: 'Discord Bot API', desc: 'Real-time member and moderation events' },
                { label: 'PostgreSQL + Prisma', desc: 'Persistent history of actions and metrics' },
                { label: 'WebSocket', desc: 'Live updates without page refresh' },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-md bg-background border border-border">
                  <p className="text-xs font-semibold text-primary">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>
      </PageShell>
    </DashboardLayout>
  )
}
