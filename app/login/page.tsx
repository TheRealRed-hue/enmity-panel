'use client'

import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

import wawaLogo from '../../wawa.png'

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

function LoginContent() {
  const params = useSearchParams()
  const error = params.get('error')

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="aurora aurora-1" />
        <div className="aurora aurora-2" />
        <div className="fog-layer" />
        <div className="particle particle-1" />
        <div className="particle particle-2" />
        <div className="particle particle-3" />
        <div className="particle particle-4" />
      </div>

      <div className="login-shell">
        <div className="login-logo-block">
          <div className="login-emblem">
            <Image
              src={wawaLogo}
              alt="Wawa logo"
              className="login-emblem-icon"
              width={120}
              height={120}
            />
          </div>
          <div className="login-branding">
            <h1 className="login-heading">Enmity Exe Dashboard</h1>
            <p className="login-eyebrow">Staff Portal</p>
          </div>
        </div>

        <section className="login-panel">
          <div className="panel-header">
            <h2 className="panel-title">Sign in with Discord</h2>
            <p className="panel-copy">
              Authorized moderation staff may authenticate with Discord to continue.
            </p>
          </div>

          {error && errorMessages[error] && (
            <div className="panel-alert" role="alert">
              {errorMessages[error]}
            </div>
          )}

          <a href={OAUTH_URL} className="login-button">
            <span className="button-glow" aria-hidden="true" />
            <svg className="button-icon" viewBox="0 0 127.14 96.36" fill="currentColor" aria-hidden="true">
              <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
            </svg>
            <span className="button-text">Continue with Discord</span>
          </a>

          <p className="panel-footnote">
            Access is granted based on verified Enmity Exe moderation roles.
          </p>
        </section>
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
