import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch(process.env.BOT_API_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `info.${process.env.BOT_API_SECRET!}`
      }),
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Bot unavailable' }, { status: 502 })
    }

    const data = await res.json()

    // Save snapshot to Supabase for the growth chart
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL ? process.env.NEXTAUTH_URL ?? 'http://localhost:3000' : 'http://localhost:3000'}/api/snapshot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => {}) // don't fail if snapshot fails

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}