import { NextResponse } from 'next/server'
import { mockVerificationRequests } from '@/lib/verification'

export async function GET() {
  return NextResponse.json(mockVerificationRequests)
}
