import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const data = await req.json()
    const admin = getSupabaseAdmin()

    // Check if there's already a snapshot in the last hour
    const oneHourAgo = new Date()
    oneHourAgo.setHours(oneHourAgo.getHours() - 1)

    const { data: existing } = await admin
      .from('member_snapshots')
      .select('id')
      .gte('recorded_at', oneHourAgo.toISOString())
      .order('recorded_at', { ascending: false })
      .limit(1)

    if (existing && existing.length > 0) {
      // Update the existing snapshot from this hour
      await admin
        .from('member_snapshots')
        .update({
          total_members: data.total_members ?? 0,
          active_members: data.active_members ?? 0,
          joined_today: data.joined_today ?? 0,
          left_today: data.left_today ?? 0,
        })
        .eq('id', existing[0].id)
    } else {
      // Insert new snapshot for this hour
      await admin
        .from('member_snapshots')
        .insert({
          total_members: data.total_members ?? 0,
          active_members: data.active_members ?? 0,
          joined_today: data.joined_today ?? 0,
          left_today: data.left_today ?? 0,
        })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Snapshot]', err)
    return NextResponse.json({ error: 'Failed to save snapshot' }, { status: 500 })
  }
}