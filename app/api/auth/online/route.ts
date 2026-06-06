import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const { discordId, username, dashboardRole } = await req.json()
    const admin = getSupabaseAdmin()

    // Mark as online
    await admin
      .from('staff_members')
      .update({ online: true })
      .eq('discord_id', discordId)

    const { data: lastLog } = await admin
      .from('access_logs')
      .select('action')
      .eq('discord_id', discordId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!lastLog) {
      await admin
        .from('access_logs')
        .insert({
          discord_id: discordId,
          username: username ?? 'unknown',
          action: 'login',
          dashboard_role: dashboardRole ?? 'unknown',
        })
    } else if (lastLog.action === 'logout') {
      await admin
        .from('access_logs')
        .insert({
          discord_id: discordId,
          username: username ?? 'unknown',
          action: 'reconnect',
          dashboard_role: dashboardRole ?? 'unknown',
        })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}