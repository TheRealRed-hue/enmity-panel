import type { ElementType } from 'react'
import {
  Clock,
  ArrowRight,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  UserCheck,
  Sparkles,
} from 'lucide-react'
import type {
  VerificationFailureReason,
  VerificationFriend,
  VerificationIssueStatus,
  VerificationRequest,
  VerificationActivityEvent,
} from '@/types'

export const statusConfig: Record<VerificationIssueStatus, {
  label: string
  badge: string
  icon: React.ElementType
}> = {
  waiting_for_roblox: {
    label: 'Waiting for Roblox Verification',
    badge: 'bg-warning-amber/10 text-warning-amber',
    icon: Clock,
  },
  verification_in_progress: {
    label: 'Verification In Progress',
    badge: 'bg-sky-500/10 text-sky-400',
    icon: ArrowRight,
  },
  verification_completed: {
    label: 'Verification Completed',
    badge: 'bg-success-green/10 text-success-green',
    icon: CheckCircle2,
  },
  verification_failed: {
    label: 'Verification Failed',
    badge: 'bg-critical-red/10 text-critical-red',
    icon: XCircle,
  },
  pending_moderator_review: {
    label: 'Pending Moderator Review',
    badge: 'bg-warning-amber/10 text-warning-amber',
    icon: ShieldAlert,
  },
  approved: {
    label: 'Approved',
    badge: 'bg-success-green/10 text-success-green',
    icon: UserCheck,
  },
  denied: {
    label: 'Denied',
    badge: 'bg-critical-red/10 text-critical-red',
    icon: XCircle,
  },
  manually_verified: {
    label: 'Manually Verified',
    badge: 'bg-primary/10 text-primary',
    icon: Sparkles,
  },
}

export const failureReasonConfig: Record<VerificationFailureReason, { label: string; description: string }> = {
  has_no_deepwoken_badges: {
    label: 'Has No Deepwoken Badges',
    description: 'The Roblox profile shows no Deepwoken badge history.',
  },
  recent_deepwoken_badge: {
    label: 'Last Deepwoken Badge Less Than 7 Days Ago',
    description: 'The Deepwoken badge was earned too recently.',
  },
  new_discord_account: {
    label: 'New Discord Account Detected',
    description: 'The Discord account age is low and may be suspicious.',
  },
  new_roblox_account: {
    label: 'New Roblox Account Detected',
    description: 'The Roblox account was created recently.',
  },
  no_verified_email: {
    label: 'No Verified Email Linked To Roblox',
    description: 'No verified email address is linked to the Roblox account.',
  },
  no_verified_phone: {
    label: 'No Verified Phone Number Linked To Roblox',
    description: 'No verified phone number is linked to the Roblox account.',
  },
}

export const mockVerificationRequests: VerificationRequest[] = [
  {
    id: 'request-001',
    discordUsername: 'NightShade#4421',
    discordId: '864201237954821120',
    ticketId: 'TKT-4792',
    ticketCreatedAt: '2026-06-05T18:32:00.000Z',
    status: 'pending_moderator_review',
    robloxUsername: 'Blade_Sentinel',
    robloxId: '734982719',
    robloxDisplayName: 'Blade Sentinel',
    robloxAccountAge: '2 years, 4 months',
    robloxVerifiedAt: '2026-06-05T18:35:00.000Z',
    failureReasons: ['no_verified_email', 'new_roblox_account'],
    friendAnalysis: {
      hasBlacklistedFriends: true,
      blacklistedFriendsCount: 3,
      blacklistedFriends: [
        {
          id: '834912089',
          username: 'ShadowWarden',
          robloxId: '934712012',
          blacklistReason: 'Multiple badge bans and suspicious trade activity',
          moderator: 'AlyxModerator',
          addedAt: '2026-06-01T11:12:00.000Z',
          evidenceUrl: 'https://example.com/evidence/shadowwarden',
        },
        {
          id: '812309127',
          username: 'VoidReaper',
          robloxId: '708123019',
          blacklistReason: 'Confirmed ban for exploit sharing',
          moderator: 'GhostGuard',
          addedAt: '2026-05-29T15:32:00.000Z',
          evidenceUrl: 'https://example.com/evidence/voidreaper',
        },
        {
          id: '802127431',
          username: 'AbyssFury',
          robloxId: '701287341',
          blacklistReason: 'Deepwoken badge manipulation',
          moderator: 'Helix',
          addedAt: '2026-05-25T08:20:00.000Z',
          evidenceUrl: 'https://example.com/evidence/abyssfury',
        },
      ],
    },
    riskScore: { value: 82 },
    activity: [
      {
        id: 'activity-001',
        title: 'Ticket created',
        description: 'A Verify Issues ticket was opened in Discord.',
        timestamp: '2026-06-05T18:32:00.000Z',
        type: 'bot',
      },
      {
        id: 'activity-002',
        title: 'Roblox scan started',
        description: 'The verification bot began collecting Roblox profile data.',
        timestamp: '2026-06-05T18:33:10.000Z',
        type: 'bot',
      },
      {
        id: 'activity-003',
        title: 'Failure reasons detected',
        description: 'Missing verified email and short account age were flagged.',
        timestamp: '2026-06-05T18:35:40.000Z',
        type: 'bot',
      },
      {
        id: 'activity-004',
        title: 'Friend scan completed',
        description: 'Blacklisted friends were found in the social graph.',
        timestamp: '2026-06-05T18:36:20.000Z',
        type: 'bot',
      },
      {
        id: 'activity-005',
        title: 'Moderator review required',
        description: 'The request was escalated for manual verification.',
        timestamp: '2026-06-05T18:37:00.000Z',
        type: 'system',
      },
    ],
    lastUpdated: '2026-06-05T18:37:12.000Z',
  },
  {
    id: 'request-002',
    discordUsername: 'AzureGaze#0510',
    discordId: '978345120453218560',
    ticketId: 'TKT-4793',
    ticketCreatedAt: '2026-06-05T19:14:00.000Z',
    status: 'verification_in_progress',
    robloxUsername: 'AquaRanger',
    robloxId: '814721309',
    robloxDisplayName: 'Aqua Ranger',
    robloxAccountAge: '5 years, 11 months',
    robloxVerifiedAt: '2026-06-05T19:15:42.000Z',
    failureReasons: [],
    friendAnalysis: {
      hasBlacklistedFriends: false,
      blacklistedFriendsCount: 0,
      blacklistedFriends: [],
    },
    riskScore: { value: 38 },
    activity: [
      {
        id: 'activity-011',
        title: 'Ticket created',
        description: 'A Verify Issues ticket was opened in Discord.',
        timestamp: '2026-06-05T19:14:00.000Z',
        type: 'bot',
      },
      {
        id: 'activity-012',
        title: 'Roblox scan started',
        description: 'The bot retrieved Roblox profile details.',
        timestamp: '2026-06-05T19:15:00.000Z',
        type: 'bot',
      },
      {
        id: 'activity-013',
        title: 'Review in progress',
        description: 'The verification flow is still running and waiting for final results.',
        timestamp: '2026-06-05T19:16:10.000Z',
        type: 'system',
      },
    ],
    lastUpdated: '2026-06-05T19:16:30.000Z',
  },
  {
    id: 'request-003',
    discordUsername: 'EchoShade#7382',
    discordId: '941207348129047552',
    ticketId: 'TKT-4794',
    ticketCreatedAt: '2026-06-05T17:05:00.000Z',
    status: 'verification_failed',
    robloxUsername: 'Scarlet_Fang',
    robloxId: '716482391',
    robloxDisplayName: 'Scarlet Fang',
    robloxAccountAge: '4 months',
    robloxVerifiedAt: '2026-06-05T17:06:05.000Z',
    failureReasons: ['has_no_deepwoken_badges', 'no_verified_phone'],
    friendAnalysis: {
      hasBlacklistedFriends: false,
      blacklistedFriendsCount: 0,
      blacklistedFriends: [],
    },
    riskScore: { value: 93 },
    activity: [
      {
        id: 'activity-021',
        title: 'Ticket created',
        description: 'A Verify Issues ticket was opened in Discord.',
        timestamp: '2026-06-05T17:05:00.000Z',
        type: 'bot',
      },
      {
        id: 'activity-022',
        title: 'Verification failed',
        description: 'The verification bot detected critical failure reasons.',
        timestamp: '2026-06-05T17:07:30.000Z',
        type: 'bot',
      },
    ],
    lastUpdated: '2026-06-05T17:07:30.000Z',
  },
]

export function getVerificationCounts(requests: VerificationRequest[]) {
  return requests.reduce(
    (acc, request) => {
      acc[request.status] = (acc[request.status] ?? 0) + 1
      return acc
    },
    {} as Record<VerificationIssueStatus, number>
  )
}

export function filterVerificationRecords(
  requests: VerificationRequest[],
  search: string,
  statusFilter: VerificationIssueStatus | 'all'
) {
  const normalizedSearch = search.trim().toLowerCase()

  return requests.filter((request) => {
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter
    const matchesSearch =
      !normalizedSearch ||
      request.discordUsername.toLowerCase().includes(normalizedSearch) ||
      request.discordId.includes(normalizedSearch) ||
      request.ticketId.toLowerCase().includes(normalizedSearch) ||
      request.robloxUsername.toLowerCase().includes(normalizedSearch)

    return matchesStatus && matchesSearch
  })
}

export function getRiskLevel(score: number) {
  if (score <= 24) {
    return { label: 'Low', badge: 'bg-success-green/10 text-success-green' }
  }

  if (score <= 49) {
    return { label: 'Moderate', badge: 'bg-warning-amber/10 text-warning-amber' }
  }

  if (score <= 74) {
    return { label: 'High', badge: 'bg-orange-500/10 text-orange-400' }
  }

  return { label: 'Critical', badge: 'bg-critical-red/10 text-critical-red' }
}

export async function loadMockVerificationRequests(delay = 450) {
  return new Promise<VerificationRequest[]>((resolve) => {
    setTimeout(() => resolve(mockVerificationRequests), delay)
  })
}
