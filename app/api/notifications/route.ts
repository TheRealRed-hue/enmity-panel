import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type, actor_id, payload } = body

    if (!type) return NextResponse.json({ error: 'Missing type' }, { status: 400 })

    const admin = getSupabaseAdmin()
    const { data, error } = await admin.from('notifications').insert([
      {
        type,
        actor_id: actor_id ?? null,
        payload: payload ?? {},
      },
    ])

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data?.[0] ?? null)
  } catch (err) {
    return NextResponse.json({ error: 'Unable to create notification' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const limit = Number(url.searchParams.get('limit') ?? 50)

    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data ?? [])
  } catch (err) {
    return NextResponse.json({ error: 'Unable to fetch notifications' }, { status: 500 })
  }
}
