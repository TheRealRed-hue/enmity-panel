import type { DashboardRole, ModerationActionType, Permission, SeverityLevel } from '@/types'

// ── Role Configuration ────────────────────────
// Maps dashboard roles to Discord role IDs — update these IDs to match your server
export const DISCORD_ROLE_IDS: Record<DashboardRole, string> = {
  owner:            '1417459599518339082',   
  administrator:    '1508839213489983620',   
  head_moderator:   '1422975310583959602',   
  senior_moderator: '1417451557288542309',   
  moderator:        '1417451557288542309',  
  trial_moderator:  '1417451557288542309',   
}

export const ROLE_CONFIG: Record<
  DashboardRole,
  { label: string; level: number; color: string; bgColor: string; permissions: Permission[] }
> = {
  owner: {
    label: 'Owner',
    level: 6,
    color: 'text-shrine-gold',
    bgColor: 'bg-shrine-gold/20',
    permissions: [
      'ban', 'unban', 'kick', 'timeout', 'warn', 'blacklist',
      'manage_team', 'view_logs', 'export_data', 'manage_settings',
      'view_analytics', 'manage_verification', 'execute_commands',
    ],
  },
  administrator: {
    label: 'Administrator',
    level: 5,
    color: 'text-critical-red',
    bgColor: 'bg-critical-red/20',
    permissions: [
      'ban', 'unban', 'kick', 'timeout', 'warn', 'blacklist',
      'manage_team', 'view_logs', 'export_data', 'manage_settings',
      'view_analytics', 'manage_verification', 'execute_commands',
    ],
  },
  head_moderator: {
    label: 'Head Moderator',
    level: 4,
    color: 'text-warning-amber',
    bgColor: 'bg-warning-amber/20',
    permissions: [
      'ban', 'unban', 'kick', 'timeout', 'warn', 'blacklist',
      'view_logs', 'export_data', 'view_analytics', 'manage_verification',
    ],
  },
  senior_moderator: {
    label: 'Senior Moderator',
    level: 3,
    color: 'text-primary',
    bgColor: 'bg-primary/20',
    permissions: ['ban', 'kick', 'timeout', 'warn', 'view_logs', 'view_analytics'],
  },
  moderator: {
    label: 'Moderator',
    level: 2,
    color: 'text-glow-teal',
    bgColor: 'bg-glow-teal/20',
    permissions: ['kick', 'timeout', 'warn', 'view_logs'],
  },
  trial_moderator: {
    label: 'Trial Moderator',
    level: 1,
    color: 'text-muted-foreground',
    bgColor: 'bg-secondary',
    permissions: ['timeout', 'warn', 'view_logs'],
  },
}

// ── Permission Labels ─────────────────────────

export const PERMISSION_LABELS: Record<Permission, string> = {
  ban: 'Ban Users',
  unban: 'Unban Users',
  kick: 'Kick Users',
  timeout: 'Apply Timeout',
  warn: 'Warn Users',
  blacklist: 'Manage Blacklist',
  manage_team: 'Manage Team',
  view_logs: 'View Logs',
  export_data: 'Export Data',
  manage_settings: 'Manage Settings',
  view_analytics: 'View Analytics',
  manage_verification: 'Manage Verification',
  execute_commands: 'Execute Bot Commands',
}

// ── Severity Configuration ────────────────────

export const SEVERITY_CONFIG: Record<
  SeverityLevel,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  low: {
    label: 'Low',
    color: 'text-success-green',
    bgColor: 'bg-success-green/20',
    borderColor: 'border-success-green/30',
  },
  medium: {
    label: 'Medium',
    color: 'text-warning-amber',
    bgColor: 'bg-warning-amber/20',
    borderColor: 'border-warning-amber/30',
  },
  high: {
    label: 'High',
    color: 'text-warning-amber',
    bgColor: 'bg-warning-amber/30',
    borderColor: 'border-warning-amber/40',
  },
  critical: {
    label: 'Critical',
    color: 'text-critical-red',
    bgColor: 'bg-critical-red/20',
    borderColor: 'border-critical-red/30',
  },
}

// ── Action Type Labels ────────────────────────

export const ACTION_TYPE_LABELS: Record<ModerationActionType, string> = {
  ban: 'Ban',
  unban: 'Unban',
  kick: 'Kick',
  timeout: 'Timeout',
  untimeout: 'Remove Timeout',
  warning: 'Warning',
  role_add: 'Role Added',
  role_remove: 'Role Removed',
  nickname: 'Nickname',
  blacklist: 'Blacklist',
  unblacklist: 'Remove Blacklist',
  verification: 'Verification',
  message_delete: 'Message Deleted',
  channel_lockdown: 'Channel Lockdown',
  staff_action: 'Staff Action',
}

// ── Navigation ────────────────────────────────

export const NAV_ITEMS = [
  { name: 'Overview', href: '/', icon: 'LayoutDashboard' },
  { name: 'Logs', href: '/logs', icon: 'ScrollText' },
  { name: 'Alerts', href: '/alerts', icon: 'Bell' },
  { name: 'Team', href: '/team', icon: 'Users' },
  { name: 'Mod Actions', href: '/actions', icon: 'Gavel' },
  { name: 'Verification', href: '/verification', icon: 'ShieldCheck' },
  { name: 'Blacklist', href: '/blacklist', icon: 'Ban' },
  { name: 'Analytics', href: '/analytics', icon: 'BarChart3' },
] as const
