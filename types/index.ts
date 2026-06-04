// ─────────────────────────────────────────────
//  Core Domain Types
//  Ready for Discord Bot API + PostgreSQL/Prisma
// ─────────────────────────────────────────────

// ── Enums ────────────────────────────────────

export type SeverityLevel = 'low' | 'medium' | 'high' | 'critical'
export type AlertStatus = 'active' | 'acknowledged' | 'resolved'
export type MemberStatus = 'active' | 'suspended' | 'inactive'
export type BlacklistScope = 'user' | 'guild' | 'server'
export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'expired'
export type ModerationActionType =
  | 'ban'
  | 'unban'
  | 'kick'
  | 'timeout'
  | 'untimeout'
  | 'warning'
  | 'role_add'
  | 'role_remove'
  | 'nickname'
  | 'blacklist'
  | 'unblacklist'
  | 'verification'
  | 'message_delete'
  | 'channel_lockdown'
  | 'staff_action'

export type DashboardRole =
  | 'owner'
  | 'administrator'
  | 'head_moderator'
  | 'senior_moderator'
  | 'moderator'
  | 'trial_moderator'

export type Permission =
  | 'ban'
  | 'unban'
  | 'kick'
  | 'timeout'
  | 'warn'
  | 'blacklist'
  | 'manage_team'
  | 'view_logs'
  | 'export_data'
  | 'manage_settings'
  | 'view_analytics'
  | 'manage_verification'
  | 'execute_commands'

// ── User & Guild ──────────────────────────────

export interface DiscordUser {
  id: string
  username: string
  discriminator: string
  globalName: string | null
  avatar: string | null
  bot: boolean
  createdAt: string
}

export interface GuildMember extends DiscordUser {
  nickname: string | null
  roles: string[]
  joinedAt: string
  premiumSince: string | null
  pending: boolean
  communicationDisabledUntil: string | null
}

export interface Guild {
  id: string
  name: string
  icon: string | null
  ownerId: string
  memberCount: number
  region: string | null
  createdAt: string
}

// ── Staff & RBAC ──────────────────────────────

export interface StaffMember {
  id: string
  discordId: string
  username: string
  globalName: string | null
  avatar: string | null
  dashboardRole: DashboardRole
  permissions: Permission[]
  status: MemberStatus
  hiredAt: string
  lastLoginAt: string | null
  lastActivityAt: string | null
  actionsThisWeek: number
  totalActions: number
  notes: string | null
}

export interface RolePermissionMatrix {
  role: DashboardRole
  label: string
  level: number
  permissions: Permission[]
  color: string
}

// ── Moderation ────────────────────────────────

export interface ModerationLog {
  id: string
  type: ModerationActionType
  targetId: string
  targetUsername: string
  moderatorId: string
  moderatorUsername: string
  reason: string
  severity: SeverityLevel
  duration: number | null      // seconds; null = permanent
  expiresAt: string | null
  metadata: Record<string, unknown>
  guildId: string
  channelId: string | null
  messageId: string | null
  createdAt: string
}

export interface ModerationAction {
  id: string
  type: ModerationActionType
  targetId: string
  targetUsername: string
  payload: Record<string, unknown>
  confirmedBy: string | null
  executedAt: string | null
  status: 'pending' | 'confirmed' | 'executed' | 'failed' | 'cancelled'
  error: string | null
  createdAt: string
}

// ── Blacklist ─────────────────────────────────

export interface BlacklistEntry {
  id: string
  scope: BlacklistScope
  targetId: string
  targetName: string
  reason: string
  addedBy: string
  addedByUsername: string
  permanent: boolean
  expiresAt: string | null
  evidence: string[]
  relatedEntries: string[]
  severity: SeverityLevel
  createdAt: string
  updatedAt: string
}

// ── Alerts & Notifications ────────────────────

export interface Alert {
  id: string
  title: string
  description: string
  severity: SeverityLevel
  status: AlertStatus
  source: string
  actionRequired: boolean
  escalatedTo: DashboardRole[]
  triggeredBy: string | null
  resolvedBy: string | null
  resolvedAt: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

export interface Notification {
  id: string
  recipientId: string
  title: string
  body: string
  type: 'info' | 'warning' | 'error' | 'success'
  read: boolean
  actionUrl: string | null
  createdAt: string
}

// ── Verification ──────────────────────────────

export interface VerificationRecord {
  id: string
  userId: string
  username: string
  guildId: string
  status: VerificationStatus
  method: 'captcha' | 'reaction' | 'manual' | 'oauth2'
  submittedAt: string
  reviewedBy: string | null
  reviewedAt: string | null
  ipAddress: string | null
  notes: string | null
  failureReason: string | null
}

// ── Analytics ─────────────────────────────────

export interface AnalyticsDataPoint {
  date: string
  value: number
  label: string
}

export interface AnalyticsSeries {
  id: string
  name: string
  data: AnalyticsDataPoint[]
  color: string
}

export interface DashboardStats {
  totalMembers: number | null
  activeMembers: number | null
  newMembersToday: number | null
  leftToday: number | null
  blacklistedUsers: number | null
  blacklistedGuilds: number | null
  pendingReports: number | null
  activeAlerts: number | null
  registeredBots: number | null
  weeklyJoins: number | null
  pendingVerifications: number | null
  avgOnlineTime: string | null
  updatedAt: string | null
}

// ── API Response Wrappers ─────────────────────

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data: T | null
  error: string | null
  message: string | null
}

// ── WebSocket Events ──────────────────────────

export interface WsEvent<T = unknown> {
  type: string
  payload: T
  timestamp: string
}

export type WsEventType =
  | 'mod_action'
  | 'alert_created'
  | 'alert_resolved'
  | 'member_join'
  | 'member_leave'
  | 'blacklist_add'
  | 'verification_update'
  | 'staff_status_change'
