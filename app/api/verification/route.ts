/**
 * Place at: app/api/verification/roblox/route.ts
 *
 * Resolves a Discord user → Roblox profile via Rover, then enriches with:
 *   - Avatar headshot
 *   - Account age (Roblox + Discord)
 *   - Friend count
 *   - Deepwoken badge ownership (configurable list below)
 *
 * Required env vars:
 *   ROVER_API_KEY        Your Rover bot API key (Settings → API Keys)
 *   ROBLOX_COOKIE        .ROBLOSECURITY cookie (optional, enables private data)
 *   NEXT_PUBLIC_GUILD_ID Discord guild ID used by Rover
 */

import { NextRequest, NextResponse } from 'next/server'

// ─── Deepwoken badge IDs to verify ───────────────────────────────────────────
// Add or remove badge IDs from this list to customise what gets checked.
export const DEEPWOKEN_BADGE_IDS: number[] = [
  2124445880, // You Have Awoken
  2124731695, // Layer 2 Cleared
  2124994003, // Bell Ringer
  2125003241, // Chime of Conflict
  2127891023, // Trial of One
  // ← add more here
]

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RobloxProfileData {
  robloxId: number
  robloxUsername: string
  robloxDisplayName: string
  robloxCreatedAt: string
  robloxAccountAgeDays: number
  avatarUrl: string | null
  friendCount: number
  discordCreatedAt: string
  discordAccountAgeDays: number
  ownedBadgeIds: number[]
  missingBadgeIds: number[]
  badgeDetails: Record<number, {
    name: string
    owned: boolean
    awardedDate?: string
  }>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROVER = 'https://registry.rover.link/api'
const RBX_USERS = 'https://users.roblox.com'
const RBX_BADGES = 'https://badges.roblox.com'
const RBX_FRIENDS = 'https://friends.roblox.com'
const RBX_THUMBS = 'https://thumbnails.roblox.com'

function roverHeaders() {
  return { Authorization: `Basic ${process.env.ROVER_API_KEY ?? ''}` }
}

function robloxHeaders(): Record<string, string> {
  const h: Record<string, string> = {}
  if (process.env.ROBLOX_COOKIE) h['Cookie'] = `.ROBLOSECURITY=${process.env.ROBLOX_COOKIE}`
  return h
}

async function getJson<T>(url: string, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(url, { headers, next: { revalidate: 60 } })
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json() as Promise<T>
}

function snowflakeToISO(id: string): string {
  return new Date(Number(BigInt(id) >> 22n) + 1_420_070_400_000).toISOString()
}

function ageDays(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const discordId = searchParams.get('discordId')
  const guildId = searchParams.get('guildId') ?? process.env.NEXT_PUBLIC_GUILD_ID

  if (!discordId || !guildId) {
    return NextResponse.json({ error: 'discordId and guildId are required.' }, { status: 400 })
  }

  try {
    // 1 ── Resolve via Rover
    const rover = await getJson<{ robloxId: number }>(
      `${ROVER}/guilds/${guildId}/discord-to-roblox/${discordId}`,
      roverHeaders()
    )
    const robloxId = rover.robloxId

    // 2 ── Roblox profile, avatar, friends in parallel
    const [profile, avatarRes, friendsRes] = await Promise.allSettled([
      getJson<{ id: number; name: string; displayName: string; created: string }>(
        `${RBX_USERS}/v1/users/${robloxId}`,
        robloxHeaders()
      ),
      getJson<{ data: { imageUrl: string; state: string }[] }>(
        `${RBX_THUMBS}/v1/users/avatar-headshot?userIds=${robloxId}&size=150x150&format=Png`,
        robloxHeaders()
      ),
      getJson<{ count: number }>(
        `${RBX_FRIENDS}/v1/users/${robloxId}/friends/count`,
        robloxHeaders()
      ),
    ])

    if (profile.status === 'rejected') throw profile.reason

    const { name, displayName, created } = profile.value
    const avatarUrl =
      avatarRes.status === 'fulfilled' && avatarRes.value.data?.[0]?.state === 'Completed'
        ? avatarRes.value.data[0].imageUrl
        : null
    const friendCount = friendsRes.status === 'fulfilled' ? (friendsRes.value.count ?? 0) : 0

    // 3 ── Badge ownership (batch max 100 per request)
    const ownedBadgeIds: number[] = []
    const missingBadgeIds: number[] = []
    const badgeDetails: RobloxProfileData['badgeDetails'] = {}

    if (DEEPWOKEN_BADGE_IDS.length > 0) {
      const chunks: number[][] = []
      for (let i = 0; i < DEEPWOKEN_BADGE_IDS.length; i += 100) {
        chunks.push(DEEPWOKEN_BADGE_IDS.slice(i, i + 100))
      }

      const [badgeNamesResults, ...awardedChunks] = await Promise.allSettled([
        Promise.allSettled(
          DEEPWOKEN_BADGE_IDS.map((id) =>
            getJson<{ id: number; name: string }>(`${RBX_BADGES}/v1/badges/${id}`, robloxHeaders())
          )
        ),
        ...chunks.map((chunk) =>
          getJson<{ data: { badgeId: number; awardedDate: string }[] }>(
            `${RBX_BADGES}/v1/users/${robloxId}/badges/awarded-dates?badgeIds=${chunk.join(',')}`,
            robloxHeaders()
          )
        ),
      ])

      const awardedMap: Record<number, string> = {}
      for (const chunk of awardedChunks) {
        if (chunk.status === 'fulfilled') {
          for (const entry of chunk.value.data ?? []) {
            awardedMap[entry.badgeId] = entry.awardedDate
          }
        }
      }

      const nameResults =
        badgeNamesResults.status === 'fulfilled' ? badgeNamesResults.value : []

      for (let i = 0; i < DEEPWOKEN_BADGE_IDS.length; i++) {
        const id = DEEPWOKEN_BADGE_IDS[i]
        const nameResult = nameResults[i]
        const name = nameResult?.status === 'fulfilled' ? nameResult.value.name : `Badge ${id}`
        const owned = id in awardedMap

        badgeDetails[id] = { name, owned, ...(owned ? { awardedDate: awardedMap[id] } : {}) }
        if (owned) ownedBadgeIds.push(id)
        else missingBadgeIds.push(id)
      }
    }

    // 4 ── Discord account age from snowflake
    const discordCreatedAt = snowflakeToISO(discordId)

    const result: RobloxProfileData = {
      robloxId,
      robloxUsername: name,
      robloxDisplayName: displayName,
      robloxCreatedAt: created,
      robloxAccountAgeDays: ageDays(created),
      avatarUrl,
      friendCount,
      discordCreatedAt,
      discordAccountAgeDays: ageDays(discordCreatedAt),
      ownedBadgeIds,
      missingBadgeIds,
      badgeDetails,
    }

    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[api/verification/roblox]', msg)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}