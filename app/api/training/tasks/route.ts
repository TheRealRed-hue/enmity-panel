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

  const { searchParams } = new URL(req.url)
  const includeArchived = searchParams.get('archived') === 'true'

  const admin = getSupabaseAdmin()
  let query = admin.from('training_tasks').select('*').order('created_at', { ascending: false })
  if (!includeArchived) query = query.eq('archived', false)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const session = getSession(req)
  if (!session || !isAdmin(session.dashboardRole))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { title, description, category, difficulty, xp_reward, evidence_type, min_submissions } = body

  if (!title || !description || !category || !difficulty || !evidence_type)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { data, error } = await admin.from('training_tasks').insert({
    title, description, category, difficulty,
    xp_reward: xp_reward ?? 50,
    evidence_type,
    min_submissions: min_submissions ?? 1,
    created_by: session.discordId,
    archived: false,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const session = getSession(req)
  if (!session || !isAdmin(session.dashboardRole))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const admin = getSupabaseAdmin()
  const { data, error } = await admin.from('training_tasks').update(updates).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const session = getSession(req)
  if (!session || !isAdmin(session.dashboardRole))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const admin = getSupabaseAdmin()
  // Soft delete via archive
  const { error } = await admin.from('training_tasks').update({ archived: true }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
