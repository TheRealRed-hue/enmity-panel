# Deepwoken Dashboard — Setup Guide

## Quick Start

```bash
npm install
npm run dev
```

---

## Discord OAuth2 Setup

### 1. Create a Discord Application
1. Go to https://discord.com/developers/applications
2. Click **New Application** → give it a name
3. Go to **OAuth2 → General**:
   - Add redirect: `http://localhost:3000/api/auth/discord-callback`
   - Copy your **Client ID** and **Client Secret**
4. Go to **Bot** → **Add Bot** → copy the **Bot Token**

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` and fill in the values:

```env
DISCORD_CLIENT_ID=123456789          # From your Discord app
DISCORD_CLIENT_SECRET=abc...         # From your Discord app
DISCORD_REDIRECT_URI=http://localhost:3000/api/auth/discord-callback
DISCORD_GUILD_ID=987654321           # Your server ID (right-click server → Copy ID)
DISCORD_BOT_TOKEN=Bot_Token_Here     # From your Discord bot
SESSION_SECRET=random_32_char_string # Run: openssl rand -hex 32
NEXT_PUBLIC_DISCORD_CLIENT_ID=123456789
NEXT_PUBLIC_DISCORD_REDIRECT_URI=http://localhost:3000/api/auth/discord-callback
```

### 3. Map Your Discord Roles to Dashboard Roles
Edit `lib/constants.ts` → `DISCORD_ROLE_IDS`:

```ts
export const DISCORD_ROLE_IDS: Record<DashboardRole, string> = {
  owner:            '111111111111111111',  // Right-click role → Copy ID
  administrator:    '222222222222222222',
  head_moderator:   '333333333333333333',
  senior_moderator: '444444444444444444',
  moderator:        '555555555555555555',
  trial_moderator:  '666666666666666666',
}
```

> **Note:** To copy Role IDs, enable Developer Mode in Discord (User Settings → Advanced → Developer Mode), then right-click a role.

### 4. Invite the Bot to Your Server
The bot needs to be in the server so it can check member roles.

Bot permissions needed: **Server Members Intent** (enabled in Bot settings)

---

## How Authentication Works

```
User clicks "Sign in with Discord"
       ↓
Redirected to Discord OAuth2 (scope: identify + guilds.members.read)
       ↓
Discord redirects to /api/auth/discord-callback?code=...
       ↓
Server exchanges code for access token
       ↓
Server fetches user's guild member data (roles) using the Bot Token
       ↓
Highest matching role in DISCORD_ROLE_IDS → DashboardRole
       ↓
Session cookie set → redirected to /
```

If the user is **not in the server** or **has no staff role**, they are redirected to `/login` with an error message.

---

## Production Checklist

- [ ] Replace the plain JSON session cookie with a **signed + encrypted** cookie using [`iron-session`](https://github.com/vvo/iron-session) or [`jose`](https://github.com/panva/jose)
- [ ] Add the production redirect URI to your Discord app's OAuth2 settings
- [ ] Set all environment variables in your hosting provider
- [ ] Add a **middleware** (`middleware.ts`) to protect all routes except `/login`
- [ ] Connect the real Discord Bot API + PostgreSQL for live data
