import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const q = url.searchParams.get('q') ?? ''
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 10), 50)

    const admin = getSupabaseAdmin()

    let query = admin
      .from('staff_members')
      .select('id, discord_id, username, global_name, avatar, dashboard_role, online')
      .order('username', { ascending: true })
      .limit(limit)

    if (q.trim()) {
      query = query.or(`username.ilike.%${q}%,global_name.ilike.%${q}%,discord_id.ilike.%${q}%`)
    }

    const { data, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch moderators' }, { status: 500 })
  }
}