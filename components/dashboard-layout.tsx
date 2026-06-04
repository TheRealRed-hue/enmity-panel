import { ReactNode } from 'react'
import { Sidebar } from './sidebar'

interface DashboardLayoutProps {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Subtle ambient gradient — no animations */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, oklch(0.25 0.04 200 / 0.18) 0%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <Sidebar />

      <main className="pl-60 min-h-screen relative z-10 transition-[padding] duration-300">
        {children}
      </main>
    </div>
  )
}
