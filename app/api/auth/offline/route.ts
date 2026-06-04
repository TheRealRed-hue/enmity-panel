import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const { discordId, username, dashboardRole } = await req.json()
    const admin = getSupabaseAdmin()

    // Mark as offline
    await admin
      .from('staff_members')
      .update({ online: false })
      .eq('discord_id', discordId)

    // Save logout log
    await admin
      .from('access_logs')
      .insert({
        discord_id: discordId,
        username: username ?? 'unknown',
        action: 'logout',
        dashboard_role: dashboardRole ?? 'unknown',
      })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}