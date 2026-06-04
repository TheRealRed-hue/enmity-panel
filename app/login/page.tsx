'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID ?? 'YOUR_CLIENT_ID'
const REDIRECT = process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI ?? 'http://localhost:3000/api/auth/discord-callback'

const OAUTH_URL =
  `https://discord.com/api/oauth2/authorize` +
  `?client_id=${CLIENT_ID}` +
  `&redirect_uri=${encodeURIComponent(REDIRECT)}` +
  `&response_type=code` +
  `&scope=identify%20guilds.members.read`

const errorMessages: Record<string, string> = {
  access_denied: 'Access was denied. Make sure to authorize the app.',
  not_in_server: 'You are not a member of the Enmity Exe server.',
  no_permission: 'Your account does not hold a recognized staff role in the server.',
  server_error: 'An unexpected error occurred. Please try again.',
}

function ToriiIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 80" className={className} fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M5 22 L95 22" strokeLinecap="round" />
      <path d="M10 30 L90 30" strokeLinecap="round" />
      <path d="M0 20 Q50 4 100 20" strokeLinecap="round" />
      <path d="M22 22 L22 80" strokeLinecap="round" />
      <path d="M78 22 L78 80" strokeLinecap="round" />
      <path d="M16 76 L28 76" strokeLinecap="round" />
      <path d="M72 76 L84 76" strokeLinecap="round" />
    </svg>
  )
}

function LoginContent() {
  const params = useSearchParams()
  const error = params.get('error')

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center border border-primary/20 mb-4">
            <ToriiIcon className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Enmity Exe Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Enmity Exe - Staff Portal</p>
        </div>

        {error && errorMessages[error] && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 text-center">
            {errorMessages[error]}
          </div>
        )}

        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Sign in with Discord</h2>
              <p className="text-xs text-muted-foreground mt-1">
              Access is restricted to staff members of the Enmity Exe server. Your permission level is automatically assigned based on your Discord roles.
            </p>
          </div>

          <a
            href={OAUTH_URL}
            className="flex items-center justify-center gap-2.5 w-full py-2.5 rounded-lg bg-[#5865F2] hover:bg-[#4752c4] transition-colors text-white text-sm font-medium"
          >
            <svg className="w-4 h-4" viewBox="0 0 127.14 96.36" fill="currentColor">
              <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
            </svg>
            Continue with Discord
          </a>

          <p className="text-[11px] text-muted-foreground text-center">
            Only users with a staff role in the Enmity Exe server will be granted access.
          </p>
        </div>

        <div className="p-3 rounded-lg bg-secondary/30 border border-border">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
            How role mapping works
          </p>
          <p className="text-xs text-muted-foreground">
            After you sign in, your Discord role IDs are checked against the map in{' '}
            <code className="text-primary text-[11px]">lib/constants.ts → DISCORD_ROLE_IDS</code>.
            The highest matching role determines your dashboard permissions.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}
