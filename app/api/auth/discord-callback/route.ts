import { NextRequest, NextResponse } from 'next/server'
import { ROLE_CONFIG } from '@/lib/constants'
import { getSupabaseAdmin } from '@/lib/supabase'
import type { DashboardRole } from '@/types'

const DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token'
const DISCORD_API = 'https://discord.com/api/v10'

const VALID_ROLES: DashboardRole[] = [
  'owner',
  'administrator',
  'head_moderator',
  'senior_moderator',
  'moderator',
  'trial_moderator',
]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=access_denied', req.url))
  }

  try {
    const tokenRes = await fetch(DISCORD_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI!,
      }),
    })

    if (!tokenRes.ok) throw new Error('token_exchange_failed')
    const tokens = await tokenRes.json()

    const userRes = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })

    if (!userRes.ok) throw new Error('user_fetch_failed')
    const user = await userRes.json()

    const bodyPayload = {
      message: `discordoauth.${user.id}.${process.env.BOT_API_SECRET!}`
    }
    console.log('Sending to bot:', JSON.stringify(bodyPayload))

    const botRes = await fetch(process.env.BOT_API_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload),
    })

    console.log('Bot status:', botRes.status)

    if (!botRes.ok) {
      console.log('Bot returned non-ok status:', botRes.status)
      return NextResponse.redirect(new URL('/login?error=not_in_server', req.url))
    }

    const botData = await botRes.json()
    console.log('Bot response:', botData)

    const dashboardRole = botData.message as DashboardRole

    if (!dashboardRole || !VALID_ROLES.includes(dashboardRole)) {
      console.log('No valid role found:', dashboardRole)
      return NextResponse.redirect(new URL('/login?error=no_permission', req.url))
    }

    const avatarUrl = user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
      : null

    // Save/update member in Supabase
    await getSupabaseAdmin()
      .from('staff_members')
      .upsert({
        discord_id: user.id,
        username: user.username,
        global_name: user.global_name ?? null,
        avatar: avatarUrl,
        dashboard_role: dashboardRole,
        permissions: ROLE_CONFIG[dashboardRole].permissions,
        status: 'active',
        online: true,
        last_login_at: new Date().toISOString(),
      }, { onConflict: 'discord_id' })

    const session = {
      discordId: user.id,
      username: user.username,
      globalName: user.global_name ?? null,
      avatar: avatarUrl,
      dashboardRole,
      permissions: ROLE_CONFIG[dashboardRole].permissions,
      issuedAt: Date.now(),
    }

    const response = NextResponse.redirect(new URL('/', req.url))
    response.cookies.set('session', JSON.stringify(session), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8,
      path: '/',
    })

    return response

  } catch (err) {
    console.error('[Discord OAuth]', err)
    return NextResponse.redirect(new URL('/login?error=server_error', req.url))
  }
}