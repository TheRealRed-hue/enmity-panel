import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { verifySessionToken } from '@/lib/session-token'

function getSession(req: NextRequest) {
  const cookie = req.cookies.get('session')?.value
  if (!cookie) return null
  try { return verifySessionToken(cookie) } catch { return null }
}

function isAdmin(role: string) {
  return role === 'owner' || role === 'administrator'
}

export async function GET(req: NextRequest) {
  const session = getSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdmin()
  const { searchParams } = new URL(req.url)
  const myProfile = searchParams.get('mine') === 'true'

  if (myProfile) {
    const { data, error } = await admin
      .from('training_profiles')
      .select('*, task_assignments(*, training_tasks(*))')
      .eq('trial_mod_discord_id', session.discordId)
      .single()
    if (error && error.code !== 'PGRST116') return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data ?? null)
  }

  // Admins see all, trainers see their assigned trials
  let query = admin.from('training_profiles').select('*, task_assignments(*, training_tasks(*))').order('created_at', { ascending: false })

  if (!isAdmin(session.dashboardRole)) {
    // Trainer: only see their assignments
    query = query.eq('trainer_discord_id', session.discordId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = getSession(req)
  if (!session || !isAdmin(session.dashboardRole))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { trial_mod_discord_id, trial_mod_username, trial_mod_avatar, trainer_discord_id, trainer_username } = body

  if (!trial_mod_discord_id || !trial_mod_username)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  const admin = getSupabaseAdmin()

  // Create profile
  const { data: profile, error: profileErr } = await admin.from('training_profiles').insert({
    trial_mod_discord_id,
    trial_mod_username,
    trial_mod_avatar: trial_mod_avatar ?? null,
    trainer_discord_id: trainer_discord_id ?? null,
    trainer_username: trainer_username ?? null,
    training_status: 'active',
    xp_earned: 0,
    started_at: new Date().toISOString(),
  }).select().single()

  if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 })

  // Auto-assign all active tasks
  const { data: tasks } = await admin.from('training_tasks').select('id').eq('archived', false)
  if (tasks && tasks.length > 0) {
    await admin.from('task_assignments').insert(
      tasks.map((t: { id: string }) => ({
        profile_id: profile.id,
        task_id: t.id,
        status: 'not_started',
        xp_awarded: 0,
      }))
    )
  }

  return NextResponse.json(profile)
}

export async function PATCH(req: NextRequest) {
  const session = getSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, action, ...updates } = body
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const admin = getSupabaseAdmin()

  // Lock profile (trainer only)
  if (action === 'lock') {
    const { data: profile } = await admin.from('training_profiles').select('trainer_discord_id').eq('id', id).single()
    const canLock = isAdmin(session.dashboardRole) || profile?.trainer_discord_id === session.discordId
    if (!canLock) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { data, error } = await admin.from('training_profiles').update({
      training_status: 'locked',
      locked_at: new Date().toISOString(),
      ...updates,
    }).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // Unlock (admin only)
  if (action === 'unlock') {
    if (!isAdmin(session.dashboardRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const { data, error } = await admin.from('training_profiles').update({
      training_status: 'active',
      locked_at: null,
    }).eq('id', id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // Admin general update
  if (!isAdmin(session.dashboardRole)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { data, error } = await admin.from('training_profiles').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
