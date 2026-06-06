import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { discordId, username, action, dashboardRole } = await req.json()

    if (!discordId || !username || !action || !dashboardRole) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const { error } = await admin.from('access_logs').insert({
      discord_id: discordId,
      username,
      action,
      dashboard_role: dashboardRole,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: 'Unable to record log' }, { status: 500 })
  }
}
