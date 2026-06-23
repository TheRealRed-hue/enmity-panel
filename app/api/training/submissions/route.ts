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

// Submit evidence for a task
export async function POST(req: NextRequest) {
  const session = getSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { assignment_id, profile_id, action_log_ids, ticket_ids, screenshot_urls, links, notes } = body

  if (!assignment_id || !profile_id)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  const admin = getSupabaseAdmin()

  // Check profile is not locked
  const { data: profile } = await admin.from('training_profiles').select('training_status, trial_mod_discord_id').eq('id', profile_id).single()
  if (profile?.training_status === 'locked')
    return NextResponse.json({ error: 'Profile is locked' }, { status: 403 })
  if (profile?.trial_mod_discord_id !== session.discordId && !isAdmin(session.dashboardRole))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Insert submission
  const { data: submission, error: subErr } = await admin.from('task_submissions').insert({
    assignment_id,
    profile_id,
    action_log_ids: action_log_ids ?? [],
    ticket_ids: ticket_ids ?? [],
    screenshot_urls: screenshot_urls ?? [],
    links: links ?? [],
    notes: notes ?? '',
    submitted_at: new Date().toISOString(),
  }).select().single()

  if (subErr) return NextResponse.json({ error: subErr.message }, { status: 500 })

  // Update assignment status to submitted
  await admin.from('task_assignments').update({
    status: 'submitted',
    submitted_at: new Date().toISOString(),
  }).eq('id', assignment_id)

  return NextResponse.json(submission)
}

// Review a task submission (trainer/admin)
export async function PATCH(req: NextRequest) {
  const session = getSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { assignment_id, profile_id, action, feedback } = body

  if (!assignment_id || !action)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  if (!['approve', 'reject'].includes(action))
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  const admin = getSupabaseAdmin()

  // Verify reviewer is the assigned trainer or admin
  const { data: profile } = await admin.from('training_profiles').select('trainer_discord_id').eq('id', profile_id).single()
  const canReview = isAdmin(session.dashboardRole) || profile?.trainer_discord_id === session.discordId
  if (!canReview) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Get task xp
  const { data: assignment } = await admin
    .from('task_assignments')
    .select('task_id, training_tasks(xp_reward)')
    .eq('id', assignment_id)
    .single()

  const xpReward = action === 'approve' ? ((assignment as any)?.training_tasks?.xp_reward ?? 0) : 0

  const { data, error } = await admin.from('task_assignments').update({
    status: action === 'approve' ? 'approved' : 'rejected',
    reviewed_at: new Date().toISOString(),
    reviewer_discord_id: session.discordId,
    reviewer_feedback: feedback ?? null,
    xp_awarded: xpReward,
  }).eq('id', assignment_id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If approved, add XP to profile
  if (action === 'approve' && xpReward > 0) {
    const { data: prof } = await admin.from('training_profiles').select('xp_earned').eq('id', profile_id).single()
    await admin.from('training_profiles').update({
      xp_earned: (prof?.xp_earned ?? 0) + xpReward,
    }).eq('id', profile_id)
  }

  return NextResponse.json(data)
}

export async function GET(req: NextRequest) {
  const session = getSession(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const assignmentId = searchParams.get('assignment_id')
  const profileId = searchParams.get('profile_id')

  const admin = getSupabaseAdmin()
  let query = admin.from('task_submissions').select('*').order('submitted_at', { ascending: false })

  if (assignmentId) query = query.eq('assignment_id', assignmentId)
  if (profileId) query = query.eq('profile_id', profileId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
