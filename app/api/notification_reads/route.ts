import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { notification_id, user_id } = body

    if (!notification_id || !user_id) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const { error } = await admin.from('notification_reads').insert([
      {
        notification_id,
        user_id,
      },
    ])

    if (error) {
      // ignore duplicate primary key (already seen)
      if (error.code === '23505') {
        return NextResponse.json({ ok: true })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: 'Unable to mark as read' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const user_id = url.searchParams.get('user_id')
    if (!user_id) return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
    const list = url.searchParams.get('list') === 'true'

    const admin = getSupabaseAdmin()
    if (list) {
      const { data: reads, error } = await admin.from('notification_reads').select('*').eq('user_id', user_id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json(reads ?? [])
    }

    const [{ data: notifications }, { data: reads, error: readsError }] = await Promise.all([
      admin.from('notifications').select('id'),
      admin.from('notification_reads').select('notification_id').eq('user_id', user_id),
    ])

    if (readsError) return NextResponse.json({ error: readsError.message }, { status: 500 })

    const readSet = new Set((reads ?? []).map((r: any) => r.notification_id))
    const count = (notifications ?? []).filter((n: any) => !readSet.has(n.id)).length

    return NextResponse.json({ count })
  } catch (err) {
    return NextResponse.json({ error: 'Unable to fetch unread count' }, { status: 500 })
  }
}
