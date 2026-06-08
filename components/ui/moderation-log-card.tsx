'use client'

import Link from 'next/link'
import Image from 'next/image'
import * as React from 'react'
import { ImageIcon, Clock, User, FileSearch } from 'lucide-react'

import { Avatar, AvatarImage, AvatarFallback } from './avatar'
import { Badge } from './badge'
import { Dialog, DialogContent, DialogTrigger } from './dialog'
import { cn } from '@/lib/utils'

type Moderator = {
  discordId: string
  username: string
  avatar?: string | null
}

type Evidence = {
  id: string
  url: string
  label?: string
}

type ConclusionType =
  | 'Warning'
  | 'Mute'
  | 'Temporary Ban'
  | 'Permanent Ban'
  | 'Blacklist'
  | 'Appeal Accepted'
  | 'Appeal Denied'

export interface ModerationLogCardProps {
  caseId: string
  createdAt: string | number | Date
  updatedAt?: string | number | Date
  appealable?: boolean
  status?: 'Active' | 'Closed'
  moderator: Moderator
  postedAt?: string | number | Date
  target: { ingameName: string; discordId: string }
  reason: string
  conclusion: { type: ConclusionType; text: string }
  modsInCharge?: Moderator[]
  evidence?: Evidence[]
}

function actionVariant(type: ConclusionType) {
  switch (type) {
    case 'Permanent Ban':
    case 'Blacklist':
      return 'destructive'
    case 'Warning':
      return 'secondary'
    case 'Appeal Accepted':
      return 'default'
    case 'Appeal Denied':
      return 'outline'
    default:
      return 'default'
  }
}

export function ModerationLogCard({
  caseId,
  createdAt,
  updatedAt,
  appealable = false,
  status = 'Active',
  moderator,
  postedAt,
  target,
  reason,
  conclusion,
  modsInCharge = [],
  evidence = [],
}: ModerationLogCardProps) {
  const created = typeof createdAt === 'string' || typeof createdAt === 'number' ? new Date(createdAt) : createdAt
  const updated = updatedAt ? (typeof updatedAt === 'string' || typeof updatedAt === 'number' ? new Date(updatedAt) : updatedAt) : null

  function formatDate(d?: Date | null) {
    if (!d) return '—'
    try {
      // Deterministic UTC format to avoid server/client Intl differences
      const Y = d.getUTCFullYear()
      const M = String(d.getUTCMonth() + 1).padStart(2, '0')
      const D = String(d.getUTCDate()).padStart(2, '0')
      const h = String(d.getUTCHours()).padStart(2, '0')
      const m = String(d.getUTCMinutes()).padStart(2, '0')
      const s = String(d.getUTCSeconds()).padStart(2, '0')
      return `${Y}-${M}-${D} ${h}:${m}:${s} UTC`
    } catch {
      return d.toString()
    }
  }

  return (
    <article className="max-w-3xl w-full rounded-lg border border-border bg-card p-4 shadow-sm">
      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold">Action Log</h3>
          <div className="mt-2 flex items-center gap-3">
            <Avatar className="size-8">
              {moderator.avatar ? (
                <AvatarImage src={moderator.avatar} alt={moderator.username} />
              ) : (
                <AvatarFallback>{moderator.username.slice(0, 2).toUpperCase()}</AvatarFallback>
              )}
            </Avatar>
              <div className="flex flex-col text-[13px]">
              <div className="flex items-center gap-2">
                <Link href={`/profile/${moderator.discordId}`} className="font-medium hover:underline">
                  @{moderator.username}
                </Link>
                <Badge variant="outline" className="text-xs">Moderator</Badge>
              </div>
              <time className="text-muted-foreground text-xs">{formatDate(postedAt ? new Date(postedAt) : created)}</time>
            </div>
          </div>
        </div>

        <div className="text-right text-xs text-muted-foreground">
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs">Case ID:</span>
            <span className="font-mono text-sm">{caseId}</span>
          </div>
          <div className="mt-2">
            <span className={cn('inline-flex items-center gap-2 px-2 py-1 rounded-md', status === 'Closed' ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary')}> 
              <Clock size={14} /> {status}
            </span>
          </div>
        </div>
      </header>

      <div className="mt-4 space-y-4">
        {/* Section 1: Target */}
        <section>
          <h4 className="text-xs font-semibold text-muted-foreground">Ingame User & Discord ID</h4>
          <div className="mt-2 text-sm font-medium">{target.ingameName} <span className="text-muted-foreground">| {target.discordId}</span></div>
        </section>

        {/* Section 2: Reason */}
        <section>
          <h4 className="text-xs font-semibold text-muted-foreground">Reason for Ban</h4>
          <div className="mt-2 rounded-md border border-border bg-accent/5 p-3 text-sm">
            <div className="flex items-start gap-2">
              <FileSearch className="text-muted-foreground" />
              <div>{reason}</div>
            </div>
          </div>
        </section>

        {/* Section 3: Conclusion */}
        <section>
          <h4 className="text-xs font-semibold text-muted-foreground">Conclusion</h4>
          <div className="mt-2">
            <Badge variant={actionVariant(conclusion.type)}>{conclusion.text}</Badge>
          </div>
        </section>

        {/* Section 4: Mods In Charge */}
        <section>
          <h4 className="text-xs font-semibold text-muted-foreground">Mods In Charge</h4>
          <div className="mt-2 flex items-center gap-3">
            {modsInCharge.length === 0 && <div className="text-sm text-muted-foreground">No additional mods listed</div>}
            {modsInCharge.map((m) => (
              <Link key={m.discordId} href={`/profile/${m.discordId}`} className="flex items-center gap-2 hover:underline">
                <Avatar className="size-8">
                  {m.avatar ? <AvatarImage src={m.avatar} alt={m.username} /> : <AvatarFallback>{m.username.slice(0,2).toUpperCase()}</AvatarFallback>}
                </Avatar>
                <span className="text-sm">@{m.username}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Section 5: Evidence */}
        <section>
          <h4 className="text-xs font-semibold text-muted-foreground">Evidence</h4>
          <div className="mt-2 grid grid-cols-3 gap-3">
            {evidence.length === 0 && <div className="text-sm text-muted-foreground">No evidence attached</div>}
            {evidence.map((ev) => (
              <Dialog key={ev.id}>
                <DialogTrigger asChild>
                  <button className="group relative overflow-hidden rounded-md border border-border bg-background/50 p-1">
                    <div className="aspect-video w-full bg-muted/20 flex items-center justify-center text-muted-foreground">
                      <ImageIcon />
                    </div>
                    <img src={ev.url} alt={ev.label ?? ev.id} className="mt-2 h-28 w-full object-cover rounded-md" />
                    <div className="absolute left-2 bottom-2 rounded-md bg-black/40 px-2 py-0.5 text-xs text-white opacity-90">{ev.label ?? 'Evidence'}</div>
                  </button>
                </DialogTrigger>

                <DialogContent className="max-w-4xl">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">{ev.label ?? 'Evidence'}</h3>
                      <a href={ev.url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">Open original</a>
                    </div>
                    <div className="w-full max-h-[70vh] overflow-hidden rounded-md">
                      <img src={ev.url} alt={ev.label ?? ev.id} className="w-full h-full object-contain" />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            ))}
          </div>
        </section>

        {/* Metadata */}
        <section className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
          <div>Created At: <span className="text-foreground">{formatDate(created)}</span></div>
          <div>Last Updated: <span className="text-foreground">{updated ? formatDate(updated) : '—'}</span></div>
          <div>Appealable: <span className="text-foreground">{appealable ? 'Yes' : 'No'}</span></div>
          <div>Status: <span className="text-foreground">{status}</span></div>
        </section>
      </div>
    </article>
  )
}

export default ModerationLogCard
