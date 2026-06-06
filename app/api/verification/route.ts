import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    { error: 'Verification API placeholder - use /api/verification/issues for mock verification data.' },
    { status: 501 }
  )
}
