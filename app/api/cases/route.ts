import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const status = url.searchParams.get('status')
    const search = url.searchParams.get('search')

    const admin = getSupabaseAdmin()
    let query = admin
      .from('cases')
      .select('*')
      .order('created_at', { ascending: false })

    if (status && status !== 'all') query = query.eq('status', status)
    if (search) {
      query = query.or(
        `case_id.ilike.%${search}%,` +
        `target_ingame_name.ilike.%${search}%,` +
        `target_discord_id.ilike.%${search}%,` +
        `moderator_username.ilike.%${search}%,` +
        `reason.ilike.%${search}%`
      )
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch cases' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const admin = getSupabaseAdmin()

    // Insert case
    const { data, error } = await admin
      .from('cases')
      .insert({
        case_id:              body.caseId,
        status:               body.status ?? 'Active',
        appealable:           body.appealable ?? false,
        reason:               body.reason,
        punishment_type:      body.punishmentType,
        punishment_text:      body.punishmentText ?? body.punishmentType,
        duration:             body.duration ?? null,
        notes:                body.notes ?? null,
        target_ingame_name:   body.target?.ingameName ?? null,
        target_discord_id:    body.target?.discordId ?? null,
        target_roblox_id:     body.target?.robloxId ?? null,
        moderator_discord_id: body.moderator?.discordId,
        moderator_username:   body.moderator?.username,
        moderator_avatar:     body.moderator?.avatar ?? null,
        mods_in_charge:       body.modsInCharge ?? [],
        evidence:             body.evidence ?? [],
        timeline:             body.timeline ?? [],
        metrics:              body.metrics ?? {},
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Register in access_logs (shows in Logs page)
    await admin.from('access_logs').insert({
      discord_id:     body.moderator?.discordId ?? 'unknown',
      username:       body.moderator?.username ?? 'unknown',
      action:         'auction_log_created',
      dashboard_role: body.moderator?.dashboardRole ?? 'moderator',
    }).then(({ error: e }) => {
      if (e) console.error('[cases POST] access_log error:', e.message)
    })

    // Create notification (shows in bell icon)
    await admin.from('notifications').insert({
      type:     'action_log_created',
      actor_id: body.moderator?.discordId ?? 'unknown',
      payload: {
        title:   'New Auction Log Created',
        message: `${body.moderator?.username ?? 'Someone'} created auction log ${body.caseId} for ${body.target?.ingameName ?? 'unknown'}.`,
        case_id: data.id,
        caseId:  body.caseId,
      },
    }).then(({ error: e }) => {
      if (e) console.error('[cases POST] notification error:', e.message)
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create case' }, { status: 500 })
  }
}