// ─────────────────────────────────────────────
//  Training Portal Types
// ─────────────────────────────────────────────

export type TaskStatus = 'not_started' | 'submitted' | 'under_review' | 'approved' | 'rejected'
export type TaskDifficulty = 'easy' | 'medium' | 'hard'
export type EvidenceType = 'action_logs' | 'ticket_ids' | 'screenshots' | 'links' | 'notes' | 'any'
export type TrainingStatus = 'active' | 'completed' | 'locked'
export type Recommendation = 'promote' | 'extend_training' | 'deny_promotion'

// Discord role ID for Mod Trainer
export const MOD_TRAINER_ROLE_ID = '1519064942668677200'

// XP thresholds per level
export function getLevelFromXP(xp: number): { level: number; current: number; next: number | null; progress: number } {
  let level = 1
  let xpNeeded = 100
  let remainingXP = xp

  while (remainingXP >= xpNeeded) {
    remainingXP -= xpNeeded
    level += 1
    xpNeeded += 50
  }

  const progress = xpNeeded > 0 ? Math.round((remainingXP / xpNeeded) * 100) : 100
  return {
    level,
    current: remainingXP,
    next: xpNeeded,
    progress,
  }
}

// ── Supabase Row Types ────────────────────────

export interface TrainingTask {
  id: string
  title: string
  description: string
  category: string
  difficulty: TaskDifficulty
  xp_reward: number
  evidence_type: EvidenceType
  min_submissions: number
  created_by: string
  created_at: string
  archived: boolean
}

export interface TrainingProfile {
  id: string
  trial_mod_discord_id: string
  trial_mod_username: string
  trial_mod_avatar: string | null
  trainer_discord_id: string | null
  trainer_username: string | null
  training_status: TrainingStatus
  xp_earned: number
  started_at: string
  completed_at: string | null
  locked_at: string | null
  recommendation: Recommendation | null
  trainer_notes: string | null
  created_at: string
}

export interface TaskAssignment {
  id: string
  profile_id: string
  task_id: string
  status: TaskStatus
  submitted_at: string | null
  reviewed_at: string | null
  reviewer_discord_id: string | null
  reviewer_feedback: string | null
  xp_awarded: number
  task?: TrainingTask
}

export interface TaskSubmission {
  id: string
  assignment_id: string
  profile_id: string
  action_log_ids: string[]
  ticket_ids: string[]
  screenshot_urls: string[]
  links: string[]
  notes: string
  submitted_at: string
}
