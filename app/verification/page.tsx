'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Header } from '@/components/header'
import { PageShell, Section } from '@/components/ui/page-shell'
import { EmptyState } from '@/components/ui/empty-state'
import {
  ShieldCheck,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VerificationRecord, VerificationStatus } from '@/types'

// ── Empty state — real data from PostgreSQL / Prisma ─────────────────────────

const records: VerificationRecord[] = []

const ITEMS_PER_PAGE = 20

const statusConfig: Record<
  VerificationStatus,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  pending: { label: 'Pending', color: 'text-warning-amber', bg: 'bg-warning-amber/20', icon: Clock },
  approved: { label: 'Approved', color: 'text-success-green', bg: 'bg-success-green/20', icon: CheckCircle },
  rejected: { label: 'Rejected', color: 'text-critical-red', bg: 'bg-critical-red/20', icon: XCircle },
  expired: { label: 'Expired', color: 'text-muted-foreground', bg: 'bg-secondary', icon: Clock },
}

export default function VerificationPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<VerificationStatus | 'all'>('all')
  const [page, setPage] = useState(1)

  const filtered = records.filter((r) => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter
    const matchesSearch =
      !search ||
      r.username.toLowerCase().includes(search.toLowerCase()) ||
      r.userId.includes(search)
    return matchesStatus && matchesSearch
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const counts = {
    pending: records.filter((r) => r.status === 'pending').length,
    approved: records.filter((r) => r.status === 'approved').length,
    rejected: records.filter((r) => r.status === 'rejected').length,
    expired: records.filter((r) => r.status === 'expired').length,
  }

  return (
    <DashboardLayout>
      <Header
        title="Verification"
        subtitle="Fluxo de verificação de membros do servidor"
      />

      <PageShell>
        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(Object.entries(statusConfig) as [VerificationStatus, typeof statusConfig[VerificationStatus]][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => { setStatusFilter(statusFilter === key ? 'all' : key); setPage(1) }}
              className={cn(
                'text-left rounded-lg border p-3 transition-colors',
                statusFilter === key ? `${cfg.bg} border-current opacity-100` : 'bg-card border-border hover:bg-secondary/30'
              )}
            >
              <p className="text-xs text-muted-foreground">{cfg.label}</p>
              <p className={cn('text-2xl font-semibold mt-1 tabular-nums', cfg.color)}>{counts[key]}</p>
            </button>
          ))}
        </div>

        {/* Search */}
        <Section>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por usuário ou Discord ID..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="w-full pl-9 pr-4 py-2 text-sm bg-secondary/50 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>

            {statusFilter !== 'all' && (
              <button
                onClick={() => setStatusFilter('all')}
                className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground border border-border rounded-md hover:bg-secondary transition-colors"
              >
                Limpar filtro
              </button>
            )}
          </div>
        </Section>

        {/* Table */}
        <Section>
          <div className="rounded-lg bg-card border border-border overflow-hidden">
            <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_120px] gap-4 px-4 py-2.5 border-b border-border bg-secondary/20 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              <span>Usuário</span>
              <span>Status</span>
              <span>Método</span>
              <span>Revisado por</span>
              <span>Data</span>
            </div>

            {paginated.length === 0 ? (
              <EmptyState
                icon={ShieldCheck}
                title="Nenhum registro de verificação"
                description={
                  records.length === 0
                    ? 'Os registros de verificação de membros aparecerão aqui após a integração com o bot.'
                    : 'Nenhum registro corresponde aos filtros aplicados.'
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {paginated.map((record) => (
                  <VerificationRow key={record.id} record={record} />
                ))}
              </ul>
            )}

            {filtered.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <span className="text-xs text-muted-foreground">{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground disabled:opacity-40 disabled:cursor-not-allowed"><ChevronLeft size={14} /></button>
                  <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground disabled:opacity-40 disabled:cursor-not-allowed"><ChevronRight size={14} /></button>
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* Workflow info */}
        <Section title="Fluxo de Verification" description="Arquitetura do sistema de verificação">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { step: '1', label: 'Entrada no Servidor', desc: 'Membro recebe cargo não-verificado e acesso limitado' },
              { step: '2', label: 'Iniciação', desc: 'Bot envia CAPTCHA, reação ou prompt de verificação' },
              { step: '3', label: 'Revisão', desc: 'Auto-aprovação ou revisão manual por moderador' },
              { step: '4', label: 'Liberação', desc: 'Cargo verificado atribuído e acesso completo liberado' },
            ].map((item) => (
              <div key={item.step} className="p-3 rounded-lg bg-secondary/30 border border-border">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                  <span className="text-xs font-bold text-primary">{item.step}</span>
                </div>
                <p className="text-xs font-semibold text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </Section>
      </PageShell>
    </DashboardLayout>
  )
}

function VerificationRow({ record }: { record: VerificationRecord }) {
  const cfg = statusConfig[record.status]
  return (
    <li className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_120px] gap-2 md:gap-4 px-4 py-3 text-sm hover:bg-secondary/20 transition-colors">
      <div>
        <p className="font-medium text-foreground truncate">{record.username}</p>
        <p className="text-xs text-muted-foreground">{record.userId}</p>
      </div>
      <div>
        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium', cfg.bg, cfg.color)}>
          <cfg.icon size={11} />
          {cfg.label}
        </span>
      </div>
      <div className="text-muted-foreground capitalize">{record.method}</div>
      <div className="text-muted-foreground">{record.reviewedBy ?? '—'}</div>
      <div className="text-xs text-muted-foreground">
        {new Date(record.submittedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
      </div>
    </li>
  )
}
