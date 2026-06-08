import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import type { DashboardRole } from '@/types'

type Ctx = { params: { id: string } }

function canEditActionLogs(role: DashboardRole): boolean {
  return ['owner', 'administrator', 'head_moderator', 'senior_moderator', 'moderator'].includes(role)
}

function canDeleteActionLogs(role: DashboardRole): boolean {
  return ['owner', 'administrator', 'head_moderator'].includes(role)
}

// ── GET /api/action-logs/[id] ─────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('action_logs')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch action log' }, { status: 500 })
  }
}

// ── PATCH /api/action-logs/[id] ───────────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const body = await req.json()
    const { editor_dashboard_role, editor_mod_id, editor_mod_username, ...updates } = body

    if (!editor_dashboard_role || !canEditActionLogs(editor_dashboard_role as DashboardRole)) {
      return NextResponse.json({ error: 'Insufficient permissions to edit Action Logs' }, { status: 403 })
    }

    // Whitelist updatable fields
    const allowed = [
      'action_type', 'action_description', 'status', 'severity', 'metadata',
      'target_id', 'target_username', 'assigned_mod_id', 'assigned_mod_username',
      'assigned_mod_discord',
    ]
    const patch: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in updates) patch[key] = updates[key]
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('action_logs')
      .update(patch)
      .eq('id', params.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Audit log the edit
    await admin.from('access_logs').insert({
      discord_id:     editor_mod_id ?? 'unknown',
      username:       editor_mod_username ?? 'unknown',
      action:         'action_log_edited',
      dashboard_role: editor_dashboard_role,
      action_log_id:  params.id,
    }).then(({ error: e }) => {
      if (e) console.error('[action-logs PATCH] audit error:', e.message)
    })

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Failed to update action log' }, { status: 500 })
  }
}

// ── DELETE /api/action-logs/[id] ──────────────────────────────────────────────

export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const body = await req.json().catch(() => ({}))
    const { deleter_dashboard_role, deleter_mod_id, deleter_mod_username } = body

    if (!deleter_dashboard_role || !canDeleteActionLogs(deleter_dashboard_role as DashboardRole)) {
      return NextResponse.json({ error: 'Insufficient permissions to delete Action Logs' }, { status: 403 })
    }

    const admin = getSupabaseAdmin()
    const { error } = await admin
      .from('action_logs')
      .delete()
      .eq('id', params.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Audit log the deletion
    await admin.from('access_logs').insert({
      discord_id:     deleter_mod_id ?? 'unknown',
      username:       deleter_mod_username ?? 'unknown',
      action:         'action_log_deleted',
      dashboard_role: deleter_dashboard_role,
    }).then(({ error: e }) => {
      if (e) console.error('[action-logs DELETE] audit error:', e.message)
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete action log' }, { status: 500 })
  }
}
