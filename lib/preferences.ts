// User preference types, defaults and shared constants for the Settings page.

export const THEME_COLOR_VARS = [
  { key: 'primary', label: 'Primária' },
  { key: 'background', label: 'Fundo' },
  { key: 'foreground', label: 'Texto' },
  { key: 'card', label: 'Cards' },
  { key: 'secondary', label: 'Secundária' },
  { key: 'accent', label: 'Destaque (Accent)' },
  { key: 'border', label: 'Bordas' },
  { key: 'sidebar', label: 'Sidebar - Fundo' },
  { key: 'sidebar-accent', label: 'Sidebar - Destaque' },
] as const

export type ThemeColorKey = (typeof THEME_COLOR_VARS)[number]['key']

export type ThemeColors = Partial<Record<ThemeColorKey, string>>

export const FONT_OPTIONS = [
  { value: 'geist', label: 'Geist (padrão)', family: '"Geist", "Geist Fallback", system-ui, sans-serif', google: null },
  { value: 'inter', label: 'Inter', family: '"Inter", sans-serif', google: 'Inter:wght@300;400;500;600;700' },
  { value: 'roboto', label: 'Roboto', family: '"Roboto", sans-serif', google: 'Roboto:wght@300;400;500;700' },
  { value: 'poppins', label: 'Poppins', family: '"Poppins", sans-serif', google: 'Poppins:wght@300;400;500;600;700' },
  { value: 'jetbrains', label: 'JetBrains Mono', family: '"JetBrains Mono", monospace', google: 'JetBrains+Mono:wght@400;500;700' },
] as const

export type FontOption = (typeof FONT_OPTIONS)[number]['value']

export const FONT_SIZE_OPTIONS = [
  { value: 'sm', label: 'Pequena', rootPx: 14 },
  { value: 'md', label: 'Média (padrão)', rootPx: 16 },
  { value: 'lg', label: 'Grande', rootPx: 18 },
] as const

export type FontSizeOption = (typeof FONT_SIZE_OPTIONS)[number]['value']

export interface UserPreferences {
  theme_mode: 'dark' | 'light' | 'system'
  theme_colors: ThemeColors
  font_family: FontOption
  font_size: FontSizeOption
  notifications_enabled: boolean
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme_mode: 'dark',
  theme_colors: {},
  font_family: 'geist',
  font_size: 'md',
  notifications_enabled: true,
}

export function getFontOption(value: string) {
  return FONT_OPTIONS.find((f) => f.value === value) ?? FONT_OPTIONS[0]
}

export function getFontSizeOption(value: string) {
  return FONT_SIZE_OPTIONS.find((f) => f.value === value) ?? FONT_SIZE_OPTIONS[1]
}
