import { sql } from '@vercel/postgres';

export async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS saved_leads (
      id TEXT PRIMARY KEY,
      place_id TEXT UNIQUE NOT NULL,
      company_name TEXT NOT NULL,
      address TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      website TEXT DEFAULT '',
      industry TEXT DEFAULT '',
      rating REAL DEFAULT 0,
      review_count INTEGER DEFAULT 0,
      maps_url TEXT DEFAULT '',
      ai_score INTEGER,
      ai_score_reason TEXT,
      ai_fit_level TEXT,
      talking_points TEXT,
      status TEXT NOT NULL DEFAULT 'New',
      notes TEXT NOT NULL DEFAULT '',
      enriched_email TEXT NOT NULL DEFAULT '',
      lead_tier TEXT DEFAULT 'Warm',
      duplicate_of TEXT,
      last_contacted TEXT,
      contact_count INTEGER DEFAULT 0,
      quality_score REAL DEFAULT 0,
      search_location TEXT DEFAULT '',
      saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  // Add column to existing tables that predate this field
  await sql`ALTER TABLE saved_leads ADD COLUMN IF NOT EXISTS search_location TEXT DEFAULT ''`;
}

export async function getAllLeads() {
  await initDb();
  const { rows } = await sql`SELECT * FROM saved_leads ORDER BY saved_at DESC`;
  return rows;
}

export async function saveLead(lead: {
  id: string;
  place_id: string;
  company_name: string;
  address: string;
  phone: string;
  website: string;
  industry: string;
  rating: number;
  review_count: number;
  maps_url: string;
  search_location?: string;
}) {
  await initDb();
  await sql`
    INSERT INTO saved_leads
      (id, place_id, company_name, address, phone, website, industry, rating, review_count, maps_url, search_location)
    VALUES
      (${lead.id}, ${lead.place_id}, ${lead.company_name}, ${lead.address},
       ${lead.phone}, ${lead.website}, ${lead.industry}, ${lead.rating},
       ${lead.review_count}, ${lead.maps_url}, ${lead.search_location || ''})
    ON CONFLICT (place_id) DO NOTHING
  `;
}

export async function deleteLead(id: string) {
  await sql`DELETE FROM saved_leads WHERE id = ${id}`;
}

export async function updateLeadScore(
  id: string,
  score: number,
  reason: string,
  fit_level: string,
  talking_points?: string[]
) {
  await sql`
    UPDATE saved_leads
    SET ai_score = ${score},
        ai_score_reason = ${reason},
        ai_fit_level = ${fit_level},
        talking_points = ${JSON.stringify(talking_points ?? [])}
    WHERE id = ${id}
  `;
}

export async function updateLeadStatus(id: string, status: string) {
  await sql`UPDATE saved_leads SET status = ${status} WHERE id = ${id}`;
}

export async function updateLeadNotes(id: string, notes: string) {
  await sql`UPDATE saved_leads SET notes = ${notes} WHERE id = ${id}`;
}

export async function updateLeadEnrichment(id: string, enriched_email: string) {
  await sql`UPDATE saved_leads SET enriched_email = ${enriched_email} WHERE id = ${id}`;
}

export async function updateLeadTier(id: string, tier: 'Hot' | 'Warm' | 'Cold') {
  await sql`UPDATE saved_leads SET lead_tier = ${tier} WHERE id = ${id}`;
}

export async function updateQualityScore(id: string, score: number) {
  await sql`UPDATE saved_leads SET quality_score = ${score} WHERE id = ${id}`;
}

export async function recordContact(id: string) {
  await sql`
    UPDATE saved_leads
    SET contact_count = contact_count + 1, last_contacted = NOW()
    WHERE id = ${id}
  `;
}

export async function markAsDuplicate(id: string, duplicateOf: string) {
  await sql`UPDATE saved_leads SET duplicate_of = ${duplicateOf} WHERE id = ${id}`;
}

export async function getLeadsByTier(tier: 'Hot' | 'Warm' | 'Cold') {
  const { rows } = await sql`
    SELECT * FROM saved_leads
    WHERE lead_tier = ${tier} AND duplicate_of IS NULL
    ORDER BY ai_score DESC NULLS LAST
  `;
  return rows;
}

export async function getLeadById(id: string) {
  const { rows } = await sql`SELECT * FROM saved_leads WHERE id = ${id}`;
  return rows[0] ?? null;
}

export async function findDuplicates(lead: { company_name: string; website: string; phone: string }) {
  const { rows } = await sql`
    SELECT * FROM saved_leads
    WHERE duplicate_of IS NULL AND (
      LOWER(company_name) = LOWER(${lead.company_name}) OR
      (website = ${lead.website} AND website != '') OR
      (phone = ${lead.phone} AND phone != '')
    )
    LIMIT 5
  `;
  return rows;
}

export async function getAnalytics() {
  const [total, byTier, byStatus, avgScore, contacted] = await Promise.all([
    sql`SELECT COUNT(*) as count FROM saved_leads WHERE duplicate_of IS NULL`,
    sql`SELECT lead_tier, COUNT(*) as count FROM saved_leads WHERE duplicate_of IS NULL GROUP BY lead_tier`,
    sql`SELECT status, COUNT(*) as count FROM saved_leads WHERE duplicate_of IS NULL GROUP BY status`,
    sql`SELECT AVG(ai_score) as avg_score FROM saved_leads WHERE ai_score IS NOT NULL AND duplicate_of IS NULL`,
    sql`SELECT COUNT(*) as count FROM saved_leads WHERE status = 'Contacted' AND duplicate_of IS NULL`,
  ]);

  return {
    total: Number(total.rows[0].count),
    byTier: Object.fromEntries(byTier.rows.map((r) => [r.lead_tier, Number(r.count)])),
    byStatus: Object.fromEntries(byStatus.rows.map((r) => [r.status, Number(r.count)])),
    avgScore: avgScore.rows[0].avg_score || 0,
    contacted: Number(contacted.rows[0].count),
  };
}
