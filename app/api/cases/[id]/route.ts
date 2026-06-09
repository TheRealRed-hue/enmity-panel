import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

type Ctx = { params: { id: string } }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const body = await req.json()
    const admin = getSupabaseAdmin()

    const allowedFields = [
      'status', 'appealable', 'reason', 'punishment_type', 'punishment_text',
      'duration', 'notes', 'target_ingame_name', 'target_discord_id', 'target_roblox_id',
      'moderator_discord_id', 'moderator_username', 'moderator_avatar', 'mods_in_charge',
      'evidence', 'timeline', 'metrics',
    ]

    const patchData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) patchData[field] = body[field]
    }

    if (Object.keys(patchData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Use UUID (id) instead of case_id to avoid # in URL issues
    const { data, error } = await admin
      .from('cases')
      .update({ ...patchData, updated_at: new Date().toISOString() })
      .eq('id', params.id)
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
      .eq('id', params.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete case' }, { status: 500 })
  }
}