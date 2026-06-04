import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST() {
  try {
    const admin = getSupabaseAdmin()
    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString()

    // Get members who haven't sent a heartbeat in 1 minute
    const { data: offlineMembers } = await admin
      .from('staff_members')
      .select('discord_id, username, dashboard_role')
      .eq('online', true)
      .or(`last_seen.lt.${oneMinuteAgo},last_seen.is.null`)

    if (offlineMembers && offlineMembers.length > 0) {
      // Mark them offline
      await admin
        .from('staff_members')
        .update({ online: false })
        .or(`last_seen.lt.${oneMinuteAgo},last_seen.is.null`)
        .eq('online', true)

      // Log each one as logout
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