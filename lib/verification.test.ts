import assert from 'assert'
import type { VerificationIssueStatus, VerificationRequest } from '@/types'
import { filterVerificationRecords, getVerificationCounts } from './verification'

const sampleRequests: VerificationRequest[] = [
  {
    id: 'request-1',
    discordUsername: 'NightShade#4421',
    discordId: '864201237954821120',
    ticketId: 'TKT-4792',
    ticketCreatedAt: '2026-06-06T12:00:00Z',
    status: 'pending_moderator_review',
    robloxUsername: 'Blade_Sentinel',
    robloxId: '734982719',
    robloxDisplayName: 'Blade Sentinel',
    robloxAccountAge: '2 years, 4 months',
    robloxVerifiedAt: '2026-06-06T12:05:00Z',
    failureReasons: ['no_verified_email'],
    friendAnalysis: {
      hasBlacklistedFriends: false,
      blacklistedFriendsCount: 0,
      blacklistedFriends: [],
    },
    riskScore: { value: 65 },
    activity: [],
    lastUpdated: '2026-06-06T12:05:00Z',
  },
  {
    id: 'request-2',
    discordUsername: 'AzureGaze#0510',
    discordId: '978345120453218560',
    ticketId: 'TKT-4793',
    ticketCreatedAt: '2026-06-06T12:15:00Z',
    status: 'approved',
    robloxUsername: 'AquaRanger',
    robloxId: '814721309',
    robloxDisplayName: 'Aqua Ranger',
    robloxAccountAge: '5 years, 11 months',
    robloxVerifiedAt: '2026-06-06T12:20:00Z',
    failureReasons: [],
    friendAnalysis: {
      hasBlacklistedFriends: false,
      blacklistedFriendsCount: 0,
      blacklistedFriends: [],
    },
    riskScore: { value: 22 },
    activity: [],
    lastUpdated: '2026-06-06T12:20:00Z',
  },
]

assert.deepStrictEqual(getVerificationCounts(sampleRequests), {
  pending_moderator_review: 1,
  approved: 1,
})

assert.strictEqual(filterVerificationRecords(sampleRequests, 'nightshade', 'all').length, 1)
assert.strictEqual(filterVerificationRecords(sampleRequests, '978345120453218560', 'all').length, 1)
assert.strictEqual(filterVerificationRecords(sampleRequests, '', 'approved').length, 1)
assert.strictEqual(filterVerificationRecords(sampleRequests, '', 'denied' as VerificationIssueStatus).length, 0)

console.log('Verification helper tests passed.')
