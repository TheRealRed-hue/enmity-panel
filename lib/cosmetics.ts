/**
 * Place at: lib/cosmetics.ts
 *
 * Catalog of avatar frames and name effects available for profile
 * customization. Pure CSS — no external assets.
 *
 * `className` values are defined in app/cosmetics.css.
 *
 * Until Supabase is wired up (staff_members.avatar_frame /
 * staff_members.name_effect), components keep the selected id in local
 * state. Persisting + reading these ids on the Team page is a follow-up.
 */

export type AvatarFrameId = 'none' | 'solid' | 'gradient-spin' | 'glow' | 'angular'
export type NameEffectId = 'none' | 'gradient' | 'gradient-animated' | 'glow' | 'shimmer'

export interface AvatarFrameOption {
  id: AvatarFrameId
  label: string
  className: string
}

export interface NameEffectOption {
  id: NameEffectId
  label: string
  className: string
}

export const AVATAR_FRAMES: AvatarFrameOption[] = [
  { id: 'none', label: 'None', className: '' },
  { id: 'solid', label: 'Solid Ring', className: 'frame-solid' },
  { id: 'gradient-spin', label: 'Aurora Spin', className: 'frame-gradient-spin' },
  { id: 'glow', label: 'Pulse Glow', className: 'frame-glow' },
  { id: 'angular', label: 'Angular Cut', className: 'frame-angular' },
]

export const NAME_EFFECTS: NameEffectOption[] = [
  { id: 'none', label: 'None', className: '' },
  { id: 'gradient', label: 'Gradient', className: 'name-gradient' },
  { id: 'gradient-animated', label: 'Aurora Flow', className: 'name-gradient-animated' },
  { id: 'glow', label: 'Neon Glow', className: 'name-glow' },
  { id: 'shimmer', label: 'Shimmer', className: 'name-shimmer' },
]

export function getFrameClass(id: string | null | undefined): string {
  return AVATAR_FRAMES.find((f) => f.id === id)?.className ?? ''
}

export function getNameEffectClass(id: string | null | undefined): string {
  return NAME_EFFECTS.find((e) => e.id === id)?.className ?? ''
}