import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

let lastCheck = 0

export async function POST() {
  // Only run once every 50 seconds regardless of how many users call it
  const now = Date.now()
  if (now - lastCheck < 50_000) {
    return NextResponse.json({ success: true, skipped: true })
  }
  lastCheck = now

  try {
    const admin = getSupabaseAdmin()
    const ninetySecondsAgo = new Date(now - 90_000).toISOString()

    const { data: offlineMembers } = await admin
      .from('staff_members')
      .select('discord_id, username, dashboard_role')
      .eq('online', true)
      .lt('last_seen', ninetySecondsAgo)

    if (offlineMembers && offlineMembers.length > 0) {
      await admin
        .from('staff_members')
        .update({ online: false })
        .lt('last_seen', ninetySecondsAgo)
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
