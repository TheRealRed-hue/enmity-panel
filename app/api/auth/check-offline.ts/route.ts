import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST() {
  try {
    const admin = getSupabaseAdmin()
    const twoMinutesAgo = new Date(Date.now() - 120_000).toISOString()

    const { data: offlineMembers } = await admin
      .from('staff_members')
      .select('discord_id, username, dashboard_role')
      .eq('online', true)
      .lt('last_seen', twoMinutesAgo)

    if (offlineMembers && offlineMembers.length > 0) {
      await admin
        .from('staff_members')
        .update({ online: false })
        .lt('last_seen', twoMinutesAgo)
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