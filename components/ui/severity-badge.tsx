import { cn } from '@/lib/utils'
import { SEVERITY_CONFIG } from '@/lib/constants'
import type { SeverityLevel } from '@/types'

interface SeverityBadgeProps {
  severity: SeverityLevel
  className?: string
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  const config = SEVERITY_CONFIG[severity]
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
        config.bgColor,
        config.color,
        config.borderColor,
        className
      )}
    >
      {config.label}
    </span>
  )
}
