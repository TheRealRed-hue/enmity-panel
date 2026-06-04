'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Header } from '@/components/header'
import { PageShell, Section } from '@/components/ui/page-shell'
import { EmptyState } from '@/components/ui/empty-state'
import { SeverityBadge } from '@/components/ui/severity-badge'
import {
  Search,
  Filter,
  Download,
  Ban,
  UserMinus,
  Clock,
  MessageSquareWarning,
  Shield,
  Hash,
  Trash2,
  UserCog,
  ChevronLeft,
  ChevronRight,
  ScrollText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ACTION_TYPE_LABELS } from '@/lib/constants'
import type { ModerationActionType, ModerationLog } from '@/types'

type FilterType = 'all' | ModerationActionType

interface FilterOption {
  value: FilterType
  label: string
  icon: React.ElementType
}

const filterOptions: FilterOption[] = [
  { value: 'all', label: 'All', icon: Filter },
  { value: 'ban', label: 'Bans', icon: Ban },
  { value: 'kick', label: 'Kicks', icon: UserMinus },
  { value: 'timeout', label: 'Timeouts', icon: Clock },
  { value: 'warning', label: 'Warnings', icon: MessageSquareWarning },
  { value: 'role_add', label: 'Roles', icon: UserCog },
  { value: 'nickname', label: 'Nicknames', icon: Hash },
  { value: 'blacklist', label: 'Blacklist', icon: Shield },
  { value: 'message_delete', label: 'Messages', icon: Trash2 },
]

const logs: ModerationLog[] = []
const ITEMS_PER_PAGE = 20

export default function LogsPage() {
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [page, setPage] = useState(1)

  const filtered = logs.filter((log) => {
    const matchesType = activeFilter === 'all' || log.type === activeFilter
    const matchesSearch =
      !search ||
      log.targetUsername.toLowerCase().includes(search.toLowerCase()) ||
      log.moderatorUsername.toLowerCase().includes(search.toLowerCase()) ||
      log.reason.toLowerCase().includes(search.toLowerCase())
    return matchesType && matchesSearch
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  return (
    <DashboardLayout>
      <Header
        title="Moderation Logs"
        subtitle="Full history of server moderation actions"
        actions={
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-secondary hover:bg-secondary/80 transition-colors text-muted-foreground hover:text-foreground border border-border">
            <Download size={13} />
            Export
          </button>
        }
      />

      <PageShell>
        <Section>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by user, moderator, or reason..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-9 pr-4 py-2 text-sm bg-secondary/50 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {filterOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setActiveFilter(opt.value); setPage(1) }}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                    activeFilter === opt.value
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'bg-secondary/60 text-muted-foreground hover:text-foreground border border-border'
                  )}
                >
                  <opt.icon size={12} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </Section>

        <Section>
          <div className="rounded-lg bg-card border border-border overflow-hidden">
            <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_2fr_1fr_100px] gap-4 px-4 py-2.5 border-b border-border bg-secondary/20 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <span>Target User</span>
              <span>Moderator</span>
              <span>Type</span>
              <span>Reason</span>
              <span>Severity</span>
              <span>Date</span>
            </div>

            {paginated.length === 0 ? (
              <EmptyState
                icon={ScrollText}
                title="No logs found"
                description={
                  logs.length === 0
                    ? 'Moderation logs will appear here after Discord Bot integration.'
                    : 'No logs match the applied filters.'
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {paginated.map((log) => (
                  <LogRow key={log.id} log={log} />
                ))}
              </ul>
            )}

            {filtered.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  {filtered.length} result{filtered.length !== 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-xs text-muted-foreground">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </Section>
      </PageShell>
    </DashboardLayout>
  )
}

function LogRow({ log }: { log: ModerationLog }) {
  return (
    <li className="grid grid-cols-1 md:grid-cols-[2fr_1.5fr_1fr_2fr_1fr_100px] gap-2 md:gap-4 px-4 py-3 text-sm hover:bg-secondary/20 transition-colors">
      <div>
        <p className="font-medium text-foreground truncate">{log.targetUsername}</p>
        <p className="text-xs text-muted-foreground">{log.targetId}</p>
      </div>
      <div className="text-muted-foreground truncate">{log.moderatorUsername}</div>
      <div className="text-foreground font-medium">
        {ACTION_TYPE_LABELS[log.type] ?? log.type}
      </div>
      <div className="text-muted-foreground truncate">{log.reason}</div>
      <SeverityBadge severity={log.severity} />
      <div className="text-xs text-muted-foreground">
        {new Date(log.createdAt).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' })}
      </div>
    </li>
  )
}
