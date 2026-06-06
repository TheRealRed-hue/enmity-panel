import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const sessionCookie = req.cookies.get('session')?.value
  if (sessionCookie) {
    try {
      const session = JSON.parse(decodeURIComponent(sessionCookie))
      const admin = getSupabaseAdmin()
      await admin
        .from('staff_members')
        .update({ online: false })
        .eq('discord_id', session.discordId)

      await admin
        .from('access_logs')
        .insert({
          discord_id: session.discordId,
          username: session.username ?? 'unknown',
          action: 'logout',
          dashboard_role: session.dashboardRole ?? 'unknown',
        })
    } catch {}
  }

  const res = NextResponse.redirect(new URL('/login', req.url))
  res.cookies.delete('session')
  return res
}