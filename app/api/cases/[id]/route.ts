import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

type Ctx = { params: { id: string } }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const body = await req.json()
    const admin = getSupabaseAdmin()

    const { data, error } = await admin
      .from('cases')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('case_id', params.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Failed to update case' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const admin = getSupabaseAdmin()
    const { error } = await admin
      .from('cases')
      .delete()
      .eq('case_id', params.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete case' }, { status: 500 })
  }
}