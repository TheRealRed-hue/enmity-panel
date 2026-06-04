'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Header } from '@/components/header'
import { PageShell, Section } from '@/components/ui/page-shell'
import { EmptyState } from '@/components/ui/empty-state'
import { SeverityBadge } from '@/components/ui/severity-badge'
import {
  Ban,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Users,
  Server,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BlacklistEntry, BlacklistScope } from '@/types'

// ── Empty state — real data from PostgreSQL / Prisma ─────────────────────────

const entries: BlacklistEntry[] = []

const ITEMS_PER_PAGE = 25

const scopeLabels: Record<BlacklistScope, { label: string; icon: React.ElementType }> = {
  user: { label: 'User', icon: Users },
  guild: { label: 'Guild', icon: Server },
  server: { label: 'Server', icon: Server },
}

export default function BlacklistPage() {
  const [search, setSearch] = useState('')
  const [scopeFilter, setScopeFilter] = useState<BlacklistScope | 'all'>('all')
  const [page, setPage] = useState(1)

  const filtered = entries.filter((e) => {
    const matchesScope = scopeFilter === 'all' || e.scope === scopeFilter
    const matchesSearch =
      !search ||
      e.targetName.toLowerCase().includes(search.toLowerCase()) ||
      e.targetId.includes(search) ||
      e.reason.toLowerCase().includes(search.toLowerCase())
    return matchesScope && matchesSearch
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const counts = {
    user: entries.filter((e) => e.scope === 'user').length,
    guild: entries.filter((e) => e.scope === 'guild').length,
    server: entries.filter((e) => e.scope === 'server').length,
  }

  return (
    <DashboardLayout>
      <Header
        title="Blacklist"
        subtitle="Gerenciamento de usuários, guilds e servidores banidos"
        actions={
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-critical-red/20 hover:bg-critical-red/30 transition-colors text-critical-red border border-critical-red/30">
            <Plus size={13} />
            Adicionar
          </button>
        }
      />

      <PageShell>
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          {(
            [
              { scope: 'user', label: 'Usuários', color: 'text-critical-red', bg: 'bg-critical-red/10 border-critical-red/20' },
              { scope: 'guild', label: 'Guilds', color: 'text-warning-amber', bg: 'bg-warning-amber/10 border-warning-amber/20' },
              { scope: 'server', label: 'Servidores', color: 'text-muted-foreground', bg: 'bg-secondary border-border' },
            ] as const
          ).map((item) => (
            <div key={item.scope} className={cn('rounded-lg border p-3', item.bg)}>
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={cn('text-2xl font-semibold mt-1 tabular-nums', item.color)}>
                {counts[item.scope]}
              </p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <Section>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por nome, ID ou motivo..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-9 pr-4 py-2 text-sm bg-secondary/50 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>

            <div className="flex items-center gap-1 border border-border rounded-md p-1">
              {(['all', 'user', 'guild', 'server'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => { setScopeFilter(s); setPage(1) }}
                  className={cn(
                    'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                    scopeFilter === s
                      ? 'bg-primary/20 text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {s === 'all' ? 'Todos' : scopeLabels[s].label}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* Table */}
        <Section>
          <div className="rounded-lg bg-card border border-border overflow-hidden">
            <div className="hidden md:grid grid-cols-[2fr_1fr_2fr_1fr_1fr_100px] gap-4 px-4 py-2.5 border-b border-border bg-secondary/20 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <span>Alvo</span>
              <span>Tipo</span>
              <span>Motivo</span>
              <span>Adicionado por</span>
              <span>Severidade</span>
              <span>Data</span>
            </div>

            {paginated.length === 0 ? (
              <EmptyState
                icon={Ban}
                title="Blacklist vazia"
                description={
                  entries.length === 0
                    ? 'Os usuários, guilds e servidores banidos aparecerão aqui após integração com o banco de dados.'
                    : 'Nenhum registro corresponde aos filtros aplicados.'
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {paginated.map((entry) => (
                  <BlacklistRow key={entry.id} entry={entry} />
                ))}
              </ul>
            )}

            {filtered.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
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

function BlacklistRow({ entry }: { entry: BlacklistEntry }) {
  const scope = scopeLabels[entry.scope]

  return (
    <li className="grid grid-cols-1 md:grid-cols-[2fr_1fr_2fr_1fr_1fr_100px] gap-2 md:gap-4 px-4 py-3 text-sm hover:bg-secondary/20 transition-colors">
      <div>
        <p className="font-medium text-foreground truncate">{entry.targetName}</p>
        <p className="text-xs text-muted-foreground">{entry.targetId}</p>
      </div>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <scope.icon size={13} />
        <span>{scope.label}</span>
      </div>
      <div className="text-muted-foreground truncate">{entry.reason}</div>
      <div className="text-muted-foreground truncate">{entry.addedByUsername}</div>
      <SeverityBadge severity={entry.severity} />
      <div className="text-xs text-muted-foreground">
        {new Date(entry.createdAt).toLocaleDateString('pt-BR')}
      </div>
    </li>
  )
}
