import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { DEFAULT_PREFERENCES } from '@/lib/preferences'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const discordId = url.searchParams.get('discord_id')

    if (!discordId) {
      return NextResponse.json({ error: 'Missing discord_id' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('user_preferences')
      .select('*')
      .eq('discord_id', discordId)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    if (!data) {
      return NextResponse.json({ ...DEFAULT_PREFERENCES, discord_id: discordId })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Unable to fetch preferences' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { discord_id, theme_mode, theme_colors, font_family, font_size, notifications_enabled } = body

    if (!discord_id) {
      return NextResponse.json({ error: 'Missing discord_id' }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    const { data, error } = await admin
      .from('user_preferences')
      .upsert(
        {
          discord_id,
          theme_mode,
          theme_colors,
          font_family,
          font_size,
          notifications_enabled,
        },
        { onConflict: 'discord_id' }
      )
      .select()
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Unable to save preferences' }, { status: 500 })
  }
}
