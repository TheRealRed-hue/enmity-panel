import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  // Only allow Vercel cron calls
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const admin = getSupabaseAdmin()
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString()

    const { data: offlineMembers } = await admin
      .from('staff_members')
      .select('discord_id, username, dashboard_role')
      .eq('online', true)
      .lt('last_seen', oneMinuteAgo)

    if (offlineMembers && offlineMembers.length > 0) {
      await admin
        .from('staff_members')
        .update({ online: false })
        .lt('last_seen', oneMinuteAgo)
        .eq('online', true)

      await admin
        .from('access_logs')
        .insert(
          offlineMembers.map((m) => ({
            discord_id: m.discord_id,
            username: m.username,
            action: 'logout',
            dashboard_role: m.dashboard_role,
          }))
        )
    }

    return NextResponse.json({ success: true, marked_offline: offlineMembers?.length ?? 0 })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}