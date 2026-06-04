import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('member_snapshots')
      .select('id,recorded_at,total_members,active_members,joined_today,left_today')
      .order('recorded_at', { ascending: true })
      .limit(90)

    if (error) {
      console.error('[member-snapshots] supabase error', error)
      return NextResponse.json({ error: 'Failed to fetch snapshots' }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('[member-snapshots]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
