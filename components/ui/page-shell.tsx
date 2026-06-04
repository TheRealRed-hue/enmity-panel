import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageShellProps {
  children: ReactNode
  className?: string
}

export function PageShell({ children, className }: PageShellProps) {
  return (
    <div className={cn('p-6 space-y-5', className)}>
      {children}
    </div>
  )
}

interface SectionProps {
  title?: string
  description?: string
  children: ReactNode
  actions?: ReactNode
  className?: string
}

export function Section({ title, description, children, actions, className }: SectionProps) {
  return (
    <div className={className}>
      {(title || actions) && (
        <div className="flex items-center justify-between mb-3">
          <div>
            {title && <h2 className="text-sm font-semibold text-foreground">{title}</h2>}
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
