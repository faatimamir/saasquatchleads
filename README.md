# SaaSQuatch Leads — AI-Powered B2B Lead Generation

A full-stack lead generation tool built for the Caprae Capital interview challenge. Enhances the SaaSQuatch Leads concept with **AI lead scoring** and **AI email generation** powered by Claude.

## Features

- **Lead Discovery** — Search businesses by industry + location via Google Places API
- **AI Lead Scoring** — Claude scores each lead 1–10 with fit level (High/Medium/Low), reasoning, and talking points
- **AI Email Generator** — Claude writes personalized cold outreach emails per lead
- **Lead Dashboard** — Save, filter, and manage leads with persistent SQLite storage
- **CSV Export** — Download leads (with AI scores) as CSV

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Next.js API Routes (Node.js runtime) |
| AI | Anthropic Claude (`claude-haiku-4-5`) |
| Lead Data | Google Places API (New) |
| Database | SQLite via `better-sqlite3` |
| Export | PapaParse (CSV) |
| Hosting | Vercel (serverless) |

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd saasquatchleads
npm install
```

### 2. Configure environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your keys:

```env
GOOGLE_PLACES_API_KEY=your_google_key
ANTHROPIC_API_KEY=your_anthropic_key
```

**Google Places API:** Enable "Places API (New)" at [Google Cloud Console](https://console.cloud.google.com/)

**Anthropic API:** Get your key at [console.anthropic.com](https://console.anthropic.com/)

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Architecture

```text
app/
  page.tsx              # Search page
  dashboard/page.tsx    # Saved leads dashboard
  api/
    search/route.ts     # Google Places search
    leads/route.ts      # CRUD for saved leads (SQLite)
    score/route.ts      # AI lead scoring (Claude)
    email/route.ts      # AI email generation (Claude)
components/
  Navbar.tsx
  SearchForm.tsx
  LeadsTable.tsx        # Main leads display with AI actions
  EmailModal.tsx        # Email generation modal
  ScoreBadge.tsx
lib/
  db.ts                 # SQLite queries
  types.ts              # TypeScript interfaces
```

## AI Features

### Lead Scoring

Click **Score** on any lead — Claude analyzes the business and returns:

- Score (1–10)
- Fit level (High / Medium / Low)
- 2-3 sentence reasoning
- 3 conversation talking points

You can optionally describe your Ideal Customer Profile (ICP) to get tailored scores.

### Email Generation

Click **Email** on any lead — Claude writes a personalized cold email based on:

- Business name, industry, location, and Google rating
- Your name, company, and value proposition

## Deployment

Deploy to Vercel with one click. Add environment variables in the Vercel dashboard.
SQLite writes to `leads.db` at the project root — for production, swap `better-sqlite3` for a hosted DB (PlanetScale, Supabase, etc.).
