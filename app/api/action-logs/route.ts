import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { ROLE_CONFIG } from '@/lib/constants'
import type { DashboardRole } from '@/types'

// ── Permission check ──────────────────────────────────────────────────────────

const ACTION_LOG_ROLES: DashboardRole[] = [
  'owner', 'administrator', 'head_moderator', 'senior_moderator', 'moderator', 'trial_moderator',
]

function canManageActionLogs(role: DashboardRole): boolean {
  return ACTION_LOG_ROLES.includes(role)
}

// ── GET /api/action-logs ──────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const limit  = Math.min(Number(url.searchParams.get('limit')  ?? 50), 200)
    const offset = Number(url.searchParams.get('offset') ?? 0)
    const status = url.searchParams.get('status')
    const search = url.searchParams.get('search')
    const type   = url.searchParams.get('type')

    const admin = getSupabaseAdmin()

    let query = admin
      .from('action_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status && status !== 'all') query = query.eq('status', status)
    if (type   && type   !== 'all') query = query.eq('action_type', type)
    if (search) {
      query = query.or(
        `target_username.ilike.%${search}%,` +
        `target_id.ilike.%${search}%,` +
        `assigned_mod_username.ilike.%${search}%,` +
        `creator_mod_username.ilike.%${search}%,` +
        `action_description.ilike.%${search}%`
      )
    }

    const { data, error, count } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data: data ?? [], total: count ?? 0 })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch action logs' }, { status: 500 })
  }
}

// ── POST /api/action-logs ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      // Action info
      action_type,
      action_description,
      severity,
      metadata,

      // Target
      target_id,
      target_username,

      // Assigned mod
      assigned_mod_id,
      assigned_mod_username,
      assigned_mod_discord,

      // Creator mod (the currently logged-in user)
      creator_mod_id,
      creator_mod_username,
      creator_mod_discord,
      creator_dashboard_role,
    } = body

    // ── Validate required fields ──────────────────────────────────
    if (!action_type || !action_description || !target_id ||
        !assigned_mod_id || !creator_mod_id) {
      return NextResponse.json(
        { error: 'Missing required fields: action_type, action_description, target_id, assigned_mod_id, creator_mod_id' },
        { status: 400 }
      )
    }

    // ── Permission validation ─────────────────────────────────────
    if (!creator_dashboard_role || !canManageActionLogs(creator_dashboard_role as DashboardRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to create Action Logs' },
        { status: 403 }
      )
    }

    const admin = getSupabaseAdmin()

    // ── Insert action log ─────────────────────────────────────────
    const { data: actionLog, error: insertError } = await admin
      .from('action_logs')
      .insert({
        action_type,
        action_description,
        severity:              severity ?? 'low',
        metadata:              metadata ?? {},
        status:                'open',
        target_id,
        target_username:       target_username ?? target_id,
        assigned_mod_id,
        assigned_mod_username: assigned_mod_username ?? assigned_mod_id,
        assigned_mod_discord:  assigned_mod_discord ?? null,
        creator_mod_id,
        creator_mod_username:  creator_mod_username ?? creator_mod_id,
        creator_mod_discord:   creator_mod_discord ?? null,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    if (!actionLog || typeof actionLog.id === 'undefined') {
      return NextResponse.json({ error: 'Action Log insert did not return a created row' }, { status: 500 })
    }

    // ── Record in access_logs (audit trail) ───────────────────────
    await admin.from('access_logs').insert({
      discord_id:     creator_mod_id,
      username:       creator_mod_username ?? creator_mod_id,
      action:         'action_log_created',
      dashboard_role: creator_dashboard_role ?? 'moderator',
      action_log_id:  actionLog.id,
    }).then(({ error }) => {
      if (error) console.error('[action-logs] audit insert error:', error.message)
    })

    // ── Create notification ───────────────────────────────────────
    const notifBody = assigned_mod_id !== creator_mod_id
      ? `${creator_mod_username} created an Action Log assigned to ${assigned_mod_username}.`
      : `${creator_mod_username} created an Action Log.`

    await admin.from('notifications').insert({
      type:     'action_log_created',
      actor_id: creator_mod_id,
      payload: {
        title:          'New Action Log Created',
        message:        notifBody,
        action_log_id:  actionLog.id,
        action_type,
        target_id,
        target_username: target_username ?? target_id,
        assigned_mod_username,
        creator_mod_username,
      },
    }).then(({ error }) => {
      if (error) console.error('[action-logs] notification insert error:', error.message)
    })

    return NextResponse.json({ data: actionLog }, { status: 201 })
  } catch (err) {
    console.error('[action-logs] POST error:', err)
    return NextResponse.json({ error: 'Failed to create action log' }, { status: 500 })
  }
}
