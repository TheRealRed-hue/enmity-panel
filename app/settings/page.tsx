'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/dashboard-layout'
import { PageShell, Section } from '@/components/ui/page-shell'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { getClientSession, type SessionUser } from '@/lib/session'
import {
  DEFAULT_PREFERENCES, FONT_OPTIONS, FONT_SIZE_OPTIONS, THEME_COLOR_VARS,
  type UserPreferences, type ThemeColorKey,
} from '@/lib/preferences'
import { applyPreferences, fetchPreferences, savePreferences, setNotificationsEnabled } from '@/components/preferences-provider'
import { Palette, Type, Bell, RotateCcw, Save, Loader2 } from 'lucide-react'

// Reads the *currently rendered* value of a CSS custom property,
// converted to a hex string so it can seed an <input type="color">.
function readCssVarAsHex(key: string): string {
  if (typeof window === 'undefined') return '#000000'
  const value = getComputedStyle(document.documentElement).getPropertyValue(`--${key}`).trim()
  if (!value) return '#000000'

  // If it's already a hex value, use it directly
  if (value.startsWith('#')) return value

  // Otherwise let the browser convert oklch()/rgb()/etc. to rgb for us
  try {
    const probe = document.createElement('div')
    probe.style.color = value
    probe.style.display = 'none'
    document.body.appendChild(probe)
    const rgb = getComputedStyle(probe).color
    document.body.removeChild(probe)

    const match = rgb.match(/\d+(\.\d+)?/g)
    if (!match) return '#000000'
    const [r, g, b] = match.map((n) => Math.max(0, Math.min(255, Math.round(Number(n)))))
    return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`
  } catch {
    return '#000000'
  }
}

export default function SettingsPage() {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFERENCES)
  const [colorSeeds, setColorSeeds] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const sessionUser = getClientSession()
    setUser(sessionUser)
    if (!sessionUser) {
      setLoading(false)
      return
    }

    fetchPreferences(sessionUser.discordId).then((loaded) => {
      setPrefs(loaded)
      // Seed the color pickers with current computed values, overridden
      // by anything the user already customized.
      const seeds: Record<string, string> = {}
      for (const { key } of THEME_COLOR_VARS) {
        seeds[key] = loaded.theme_colors[key as ThemeColorKey] ?? readCssVarAsHex(key)
      }
      setColorSeeds(seeds)
      setLoading(false)
    })
  }, [])

  function updateColor(key: ThemeColorKey, value: string) {
    setColorSeeds((prev) => ({ ...prev, [key]: value }))
    setPrefs((prev) => ({
      ...prev,
      theme_colors: { ...prev.theme_colors, [key]: value },
    }))
  }

  function resetColors() {
    setPrefs((prev) => ({ ...prev, theme_colors: {} }))
    const seeds: Record<string, string> = {}
    for (const { key } of THEME_COLOR_VARS) {
      seeds[key] = readCssVarAsHex(key)
    }
    // Wait a tick so removing overrides restores the original computed colors
    applyPreferences({ ...prefs, theme_colors: {} })
    setTimeout(() => {
      for (const { key } of THEME_COLOR_VARS) {
        seeds[key] = readCssVarAsHex(key)
      }
      setColorSeeds(seeds)
    }, 0)
  }

  async function handleSave() {
    if (!user) return
    setSaving(true)
    setSaved(false)
    try {
      await savePreferences(user.discordId, prefs)
      applyPreferences(prefs)
      setNotificationsEnabled(prefs.notifications_enabled)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      // no-op — keep it simple, button text reverts on its own
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <PageShell>
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading preferences...
          </div>
        </PageShell>
      </DashboardLayout>
    )
  }

  if (!user) {
    return (
      <DashboardLayout>
        <PageShell>
          <div className="text-center py-24 text-muted-foreground text-sm">
            Sign in to access settings.
          </div>
        </PageShell>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <PageShell>
        <div>
          <h1 className="text-lg font-semibold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Customize the dashboard appearance. These preferences are saved to
            your account and applied whenever you sign in.
          </p>
        </div>

        {/* Theme customization */}
        <Section
          title="Theme"
          description="Adjust the dashboard primary colors"
          actions={
            <Button variant="outline" size="sm" onClick={resetColors}>
              <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
              Reset to default
            </Button>
          }
        >
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-4 text-sm font-medium text-foreground">
              <Palette className="w-4 h-4 text-primary" />
              Colors
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {THEME_COLOR_VARS.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between gap-3 rounded-md border border-border bg-secondary/30 px-3 py-2.5">
                  <Label htmlFor={`color-${key}`} className="text-xs text-foreground">
                    {label}
                  </Label>
                  <div className="flex items-center gap-2">
                    <input
                      id={`color-${key}`}
                      type="color"
                      value={colorSeeds[key] ?? '#000000'}
                      onChange={(e) => updateColor(key as ThemeColorKey, e.target.value)}
                      className="h-7 w-10 rounded cursor-pointer border border-border bg-transparent p-0.5"
                    />
                    <span className="text-[11px] text-muted-foreground font-mono w-16 truncate">
                      {colorSeeds[key]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Font customization */}
        <Section title="Font" description="Choose the font family and text size">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-4 text-sm font-medium text-foreground">
              <Type className="w-4 h-4 text-primary" />
              Text
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Font family</Label>
                <Select
                  value={prefs.font_family}
                  onValueChange={(value) => setPrefs((prev) => ({ ...prev, font_family: value as UserPreferences['font_family'] }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione a fonte" />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_OPTIONS.map((font) => (
                      <SelectItem key={font.value} value={font.value}>
                        {font.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Font size</Label>
                <Select
                  value={prefs.font_size}
                  onValueChange={(value) => setPrefs((prev) => ({ ...prev, font_size: value as UserPreferences['font_size'] }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o tamanho" />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size.value} value={size.value}>
                        {size.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </Section>

        {/* Notifications */}
        <Section title="Notifications" description="Control alerts inside the dashboard">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Bell className="w-4 h-4 text-primary" />
                Dashboard notifications
              </div>
              <Switch
                checked={prefs.notifications_enabled}
                onCheckedChange={(checked) => setPrefs((prev) => ({ ...prev, notifications_enabled: checked }))}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              When disabled, the notification bell and dashboard alerts are hidden for you.
            </p>
          </div>
        </Section>

        {/* Save */}
        <div className="flex items-center gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save changes
          </Button>
          {saved && <span className="text-xs text-success-green">Preferences saved!</span>}
        </div>
      </PageShell>
    </DashboardLayout>
  )
}
