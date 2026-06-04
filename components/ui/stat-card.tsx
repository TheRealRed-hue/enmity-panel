import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number | null
  change?: { value: number; type: 'increase' | 'decrease' | 'neutral' }
  icon: LucideIcon
  variant?: 'default' | 'primary' | 'warning' | 'critical' | 'success'
  loading?: boolean
}

const variantStyles = {
  default: { card: 'border-border', icon: 'bg-secondary text-muted-foreground' },
  primary: { card: 'border-primary/20', icon: 'bg-primary/15 text-primary' },
  warning: { card: 'border-warning-amber/20', icon: 'bg-warning-amber/15 text-warning-amber' },
  critical: { card: 'border-critical-red/20', icon: 'bg-critical-red/15 text-critical-red' },
  success: { card: 'border-success-green/20', icon: 'bg-success-green/15 text-success-green' },
}

export function StatCard({ title, value, change, icon: Icon, variant = 'default', loading = false }: StatCardProps) {
  const styles = variantStyles[variant]

  return (
    <div className={cn('p-4 rounded-lg bg-card border', styles.card)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-medium truncate">{title}</p>

          {loading ? (
            <div className="mt-2 h-7 w-20 rounded bg-secondary animate-pulse" />
          ) : (
            <p className="mt-1.5 text-2xl font-semibold text-foreground tabular-nums">
              {value === null ? '—' : typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
            </p>
          )}

          {!loading && change && (
            <div className="mt-1.5 flex items-center gap-1">
              {change.type === 'increase' ? (
                <TrendingUp className="w-3.5 h-3.5 text-success-green" />
              ) : change.type === 'decrease' ? (
                <TrendingDown className="w-3.5 h-3.5 text-critical-red" />
              ) : null}
              <span
                className={cn(
                  'text-xs font-medium',
                  change.type === 'increase'
                    ? 'text-success-green'
                    : change.type === 'decrease'
                    ? 'text-critical-red'
                    : 'text-muted-foreground'
                )}
              >
                {change.value > 0 ? '+' : ''}{change.value}%
              </span>
              <span className="text-xs text-muted-foreground">sem. passada</span>
            </div>
          )}
        </div>

        <div className={cn('p-2 rounded-lg shrink-0', styles.icon)}>
          <Icon size={16} />
        </div>
      </div>
    </div>
  )
}
