import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const body = await req.json()
    const admin = getSupabaseAdmin()

    const { moderator_discord_id, moderator_username, moderator_dashboard_role, ...fields } = body

    const allowedFields = [
      'status', 'appealable', 'reason', 'punishment_type', 'punishment_text',
      'duration', 'notes', 'target_ingame_name', 'target_discord_id', 'target_roblox_id',
      'moderator_discord_id', 'moderator_username', 'moderator_avatar', 'mods_in_charge',
      'evidence', 'timeline', 'metrics',
    ]

    const patchData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in fields) patchData[field] = fields[field]
    }

    if (Object.keys(patchData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await admin
      .from('cases')
      .update({ ...patchData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Register in access_logs
    await admin.from('access_logs').insert({
      discord_id:     moderator_discord_id ?? 'unknown',
      username:       moderator_username ?? 'unknown',
      action:         'auction_log_edited',
      dashboard_role: moderator_dashboard_role ?? 'moderator',
    }).then(({ error: e }) => {
      if (e) console.error('[cases PATCH] access_log error:', e.message)
    })

    // Create notification
    await admin.from('notifications').insert({
      type:     'action_log_created',
      actor_id: moderator_discord_id ?? 'unknown',
      payload: {
        title:   'Auction Log Updated',
        message: `${moderator_username ?? 'Someone'} edited auction log.`,
        case_id: id,
      },
    }).then(({ error: e }) => {
      if (e) console.error('[cases PATCH] notification error:', e.message)
    })

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Failed to update case' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const { moderator_discord_id, moderator_username, moderator_dashboard_role, case_id } = body
    const admin = getSupabaseAdmin()

    const { error } = await admin
      .from('cases')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Register in access_logs
    await admin.from('access_logs').insert({
      discord_id:     moderator_discord_id ?? 'unknown',
      username:       moderator_username ?? 'unknown',
      action:         'auction_log_deleted',
      dashboard_role: moderator_dashboard_role ?? 'moderator',
    }).then(({ error: e }) => {
      if (e) console.error('[cases DELETE] access_log error:', e.message)
    })

    // Create notification
    await admin.from('notifications').insert({
      type:     'action_log_created',
      actor_id: moderator_discord_id ?? 'unknown',
      payload: {
        title:   'Auction Log Deleted',
        message: `${moderator_username ?? 'Someone'} deleted auction log ${case_id ?? id}.`,
        case_id: id,
      },
    }).then(({ error: e }) => {
      if (e) console.error('[cases DELETE] notification error:', e.message)
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete case' }, { status: 500 })
  }
}