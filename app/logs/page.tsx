'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Header } from '@/components/header'
import { PageShell, Section } from '@/components/ui/page-shell'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Search,
  Download,
  ScrollText,
  LogIn,
  LogOut,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Shield,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

interface AccessLog {
  id: string
  discord_id: string
  username: string
  action: string
  dashboard_role: string
  created_at: string
}

const ITEMS_PER_PAGE = 20

export default function LogsPage() {
  const [logs, setLogs] = useState<AccessLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'login' | 'logout' | 'reconnect' | 'blacklist' | 'unblacklist'>('all')
  const [page, setPage] = useState(1)

  useEffect(() => {
    async function fetchLogs() {
      const { data } = await supabase
        .from('access_logs')
        .select('*')
        .order('created_at', { ascending: false })
      setLogs(data ?? [])
      setLoading(false)
    }

    fetchLogs()

    const channel = supabase
      .channel('access_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'access_logs' }, () => {
        fetchLogs()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const filtered = logs.filter((log) => {
    const matchesFilter = filter === 'all' || log.action === filter
    const matchesSearch =
      !search ||
      log.username.toLowerCase().includes(search.toLowerCase()) ||
      log.discord_id.includes(search)
    return matchesFilter && matchesSearch
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const filterLabels = {
    all: 'All',
    login: 'Logins',
    logout: 'Logouts',
    reconnect: 'Reconnects',
    blacklist: 'Blacklist',
    unblacklist: 'Remove Blacklist',
  }

  return (
    <DashboardLayout>
      <Header
        title="Logs"
        subtitle="Dashboard access history"
        actions={
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-secondary hover:bg-secondary/80 transition-colors text-muted-foreground hover:text-foreground border border-border">
            <Download size={13} />
            Export
          </button>
        }
      />

      <PageShell>
        <Section>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by username or Discord ID..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-9 pr-4 py-2 text-sm bg-secondary/50 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>

            <div className="flex gap-1.5">
              {(['all', 'login', 'logout', 'reconnect', 'blacklist', 'unblacklist'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => { setFilter(f); setPage(1) }}
                  className={cn(
                    'px-3 py-2 rounded-md text-xs font-medium transition-colors',
                    filter === f
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'bg-secondary/60 text-muted-foreground hover:text-foreground border border-border'
                  )}
                >
                  {filterLabels[f]}
                </button>
              ))}
            </div>
          </div>
        </Section>

        <Section>
          <div className="rounded-lg bg-card border border-border overflow-hidden">
            <div className="hidden md:grid grid-cols-[2fr_1.5fr_1fr_1.5fr] gap-4 px-4 py-2.5 border-b border-border bg-secondary/20 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <span>User</span>
              <span>Role</span>
              <span>Action</span>
              <span>Date</span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-xs text-muted-foreground">Loading...</p>
              </div>
            ) : paginated.length === 0 ? (
              <EmptyState
                icon={ScrollText}
                title="No logs found"
                description={
                  logs.length === 0
                    ? 'Access logs will appear here when staff members sign in.'
                    : 'No logs match the applied filters.'
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {paginated.map((log) => (
                  <li key={log.id} className="grid grid-cols-1 md:grid-cols-[2fr_1.5fr_1fr_1.5fr] gap-2 md:gap-4 px-4 py-3 hover:bg-secondary/20 transition-colors items-center">
                    <div>
                      <p className="text-sm font-medium text-foreground">{log.username}</p>
                      <p className="text-xs text-muted-foreground">{log.discord_id}</p>
                    </div>

                    <span className="text-xs text-muted-foreground capitalize">
                      {log.dashboard_role.replace(/_/g, ' ')}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {log.action === 'login' ? (
                        <>
                          <LogIn size={13} className="text-success-green" />
                          <span className="text-xs text-success-green font-medium">Login</span>
                        </>
                      ) : log.action === 'reconnect' ? (
                        <>
                          <RefreshCw size={13} className="text-primary" />
                          <span className="text-xs text-primary font-medium">Reconnect</span>
                        </>
                      ) : log.action === 'logout' ? (
                        <>
                          <LogOut size={13} className="text-warning-amber" />
                          <span className="text-xs text-warning-amber font-medium">Logout</span>
                        </>
                      ) : log.action === 'blacklist' ? (
                        <>
                          <Shield size={13} className="text-critical-red" />
                          <span className="text-xs text-critical-red font-medium">Blacklist</span>
                        </>
                      ) : log.action === 'unblacklist' ? (
                        <>
                          <Trash2 size={13} className="text-warning-amber" />
                          <span className="text-xs text-warning-amber font-medium">Remove Blacklist</span>
                        </>
                      ) : (
                        <>
                          <ScrollText size={13} className="text-muted-foreground" />
                          <span className="text-xs text-muted-foreground font-medium">{log.action}</span>
                        </>
                      )}
                    </div>

                    <span className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {filtered.length > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  {filtered.length} entries
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground disabled:opacity-40"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground disabled:opacity-40"
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