import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  try {
    const { discordId } = await req.json()
    await getSupabaseAdmin()
      .from('staff_members')
      .update({ online: true })
      .eq('discord_id', discordId)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}