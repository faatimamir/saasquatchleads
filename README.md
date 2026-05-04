# SaaSQuatch Leads — AI-Powered B2B Lead Generation

A full-stack B2B lead generation and pipeline management tool built for the Caprae Capital interview challenge. Finds real local businesses, enriches them with contact data, scores them with AI, and manages them through a full sales pipeline — using **100% free APIs**.

## Live Demo

[saasquatchleads.vercel.app](https://saasquatchleads.vercel.app)

---

## Features

### Lead Discovery
- Search businesses by industry + location using **OpenStreetMap Overpass API** (free, no key required)
- 30+ supported business types (restaurants, dental offices, gyms, law firms, and more)
- Geocoding via **Nominatim** — converts city names to bounding boxes automatically
- Deduplicates results by name before display

### AI Lead Scoring
- **Groq API** with **Llama 3.3 70B** (free tier: 14,400 req/day) scores each lead 1–10
- Returns fit level (High / Medium / Low), reasoning, and 3 conversation talking points
- **Quality Score** (0–100) calculated from data completeness: phone, website, email, ratings
- **Lead Tier** classification:  Hot / Warm / Cold
- **Score All** — bulk score every visible lead in one click
- Supports custom **ICP (Ideal Customer Profile)** criteria to tailor scores
- 4 quick ICP templates: SMB Service, Professional Services, Healthcare, Home Services

### Email Enrichment
- **Enrich** button fetches the lead's website and contact pages
- Extracts real email addresses using regex + smart filtering (skips platform/hosting emails like wixpress, squarespace)
- Always checks `/contact`, `/contact-us`, `/about` pages — not just the homepage
- Ranks emails by domain match and contact prefix priority (contact@ > info@ > hello@)
- **Enrich All** — bulk enrich every lead with a website in one click

### Lead Pipeline Management
- 5-stage pipeline: **New → Contacted → Qualified → Closed → Not Interested**
- Inline status dropdown on each lead card
- Per-lead notes with inline editing
- Contact count tracking and last-contacted timestamps
- Duplicate detection using Levenshtein distance similarity (website 40pts, phone 40pts, name 20pts)

### Dashboard & Views
- **List view** — full lead cards with all actions
- **Kanban board** — visual pipeline columns, hover cards to quick-move between stages
- Pipeline overview cards — click any stage to filter instantly
- Summary stats: Total Saved, AI Scored, Avg AI Score
- **InsightsCard** — pipeline overview, Hot/Warm/Cold segmentation with progress bars, top industries, AI recommendations

### Filters
Dashboard-level:
- Text search (company, industry, location)
- Industry dropdown (auto-populated from your leads)
- Lead tier (Hot / Warm / Cold)


LeadsTable toolbar:
- Has Phone / Has Website toggles
- Minimum AI score (≥7, ≥8, ≥9)
- Lead tier
- Sort by: Name, Rating, AI Score

### Import & Export
- **CSV Import** — upload any CSV; auto-maps common column names (`company_name`, `company`, `phone`, `website`, `industry`, etc.)
- **CSV Export** — standard format with all fields including AI scores
- **CRM Export** — click-based dropdown with 3 formats:
  - **Salesforce** — uses custom field names (`AI_Score__c`, `Lead_Tier__c`, `Fit_Level__c`)
  - **HubSpot** — maps pipeline status to lifecycle stages (`lead`, `opportunity`, `customer`)
  - **Generic CRM** — adds letter grade (A/B/C/D) and "Next Action" recommendation

### AI Email Generation
- Generates personalized cold outreach emails per lead
- Based on company name, industry, location, rating, and enriched contact data

---

## Tech Stack

| Layer | Technology | Cost |
|---|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS | Free |
| Backend | Next.js API Routes | Free |
| Lead Data | OpenStreetMap Overpass API + Nominatim | Free |
| AI Scoring | Groq API — Llama 3.3 70B | Free (14,400 req/day) |
| Database | Neon Postgres (via `@vercel/postgres`) | Free tier |
| Export | PapaParse (CSV) | Free |
| Hosting | Vercel | Free tier |

---

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

Edit `.env.local`:

```env
# Groq API — sign up free at https://console.groq.com
GROQ_API_KEY=your_groq_api_key

# Neon Postgres — from Vercel Dashboard → Storage → your DB → .env.local tab
POSTGRES_URL=postgresql://...
POSTGRES_URL_NON_POOLING=postgresql://...
POSTGRES_PRISMA_URL=postgresql://...
POSTGRES_USER=...
POSTGRES_PASSWORD=...
POSTGRES_DATABASE=...
POSTGRES_HOST=...
```

**Groq API:** Free tier at [console.groq.com](https://console.groq.com) — supports Llama 3.3 70B with 14,400 requests/day.

**Neon Postgres:** Create a free database at [neon.tech](https://neon.tech) or provision via Vercel Storage. The table is created automatically on first run.

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Architecture

```
app/
  page.tsx                    # Search + discover leads
  dashboard/page.tsx          # Pipeline dashboard (list + kanban)
  api/
    search/route.ts           # Overpass API business search
    leads/route.ts            # CRUD — save, update, delete leads
    score/route.ts            # AI scoring via Groq Llama 3.3
    enrich/route.ts           # Email extraction from websites
    email/route.ts            # AI cold email generation
    analytics/route.ts        # Pipeline stats + recommendations
    deduplicate/route.ts      # Duplicate detection + merge
    export/route.ts           # Multi-format CRM CSV export
    import/route.ts           # CSV import with column auto-mapping

components/
  LeadsTable.tsx              # Main lead cards — score, enrich, email, pipeline
  KanbanBoard.tsx             # Visual pipeline board by status
  InsightsCard.tsx            # Analytics overview + segmentation
  ICPBuilder.tsx              # Ideal Customer Profile builder
  SearchForm.tsx              # Industry + location search form
  EmailModal.tsx              # AI email generation modal
  ScoreBadge.tsx              # Score + fit level badge
  Navbar.tsx

lib/
  db.ts                       # Neon Postgres queries (async, @vercel/postgres)
  types.ts                    # TypeScript interfaces + constants
```

---

## Lead Tier Segmentation

Every scored lead is classified into one of three tiers based on a weighted combination of AI score and Quality Score:

```text
Combined Score = (AI Score × 0.7) + (Quality Score / 10 × 0.3)

Hot   → Combined Score >= 7.5
Warm  → Combined Score >= 5.0
Cold  → Combined Score < 5.0
```

**AI Score** (1–10) — assigned by Groq Llama 3.3 based on business fundamentals, industry fit, and engagement potential.

**Quality Score** (0–100) — calculated from data completeness:

| Signal | Points |
| --- | --- |
| Has phone | 15 |
| Has website | 15 |
| Has enriched email | 15 |
| Has industry | 10 |
| Has address | 5 |
| Rating >= 4.5 | 10 |
| Review count > 20 | 10 |
| Own domain website (not Facebook/LinkedIn) | 10 |
| Phone length > 8 digits | 10 |

A lead needs both a high AI score and good data quality to become Hot. A lead scored 9/10 by AI but with no phone, website, or email will still be Warm due to low Quality Score.

---

## Key Design Decisions

**Free APIs only** — OpenStreetMap Overpass replaces paid Google Places; Groq replaces paid OpenAI/Anthropic. Total API cost: $0.

**Neon Postgres over SQLite** — Vercel serverless functions have an ephemeral filesystem; SQLite data would be lost on redeploy. Neon provides a persistent, free Postgres instance that works natively with `@vercel/postgres`.

**Quality Score** — Separate from AI score. Measures data completeness (phone, website, email, rating) on a 0–100 scale. Combined with AI score to determine lead tier, giving a more reliable signal than AI score alone.

**Email enrichment logic** — Always checks multiple contact pages in parallel, not just the homepage. Filters out platform emails (wixpress.com, squarespace.com, etc.) and ranks results by domain match.

---

## Deployment (Vercel)

1. Push to GitHub
2. Import repo in [vercel.com](https://vercel.com)
3. Add all environment variables in **Settings → Environment Variables**
4. Deploy — the database table is created automatically on first API call
