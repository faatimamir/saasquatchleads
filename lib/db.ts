import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'leads.db');

let db: Database.Database;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.exec(`
      CREATE TABLE IF NOT EXISTS saved_leads (
        id TEXT PRIMARY KEY,
        place_id TEXT UNIQUE NOT NULL,
        company_name TEXT NOT NULL,
        address TEXT,
        phone TEXT,
        website TEXT,
        industry TEXT,
        rating REAL,
        review_count INTEGER,
        maps_url TEXT,
        ai_score INTEGER,
        ai_score_reason TEXT,
        ai_fit_level TEXT,
        talking_points TEXT,
        status TEXT NOT NULL DEFAULT 'New',
        notes TEXT NOT NULL DEFAULT '',
        enriched_email TEXT NOT NULL DEFAULT '',
        saved_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // Migrate existing tables that don't have the new columns
    const cols = db.prepare("PRAGMA table_info(saved_leads)").all() as { name: string }[];
    const colNames = cols.map(c => c.name);
    if (!colNames.includes('status'))
      db.exec("ALTER TABLE saved_leads ADD COLUMN status TEXT NOT NULL DEFAULT 'New'");
    if (!colNames.includes('notes'))
      db.exec("ALTER TABLE saved_leads ADD COLUMN notes TEXT NOT NULL DEFAULT ''");
    if (!colNames.includes('enriched_email'))
      db.exec("ALTER TABLE saved_leads ADD COLUMN enriched_email TEXT NOT NULL DEFAULT ''");
    if (!colNames.includes('talking_points'))
      db.exec("ALTER TABLE saved_leads ADD COLUMN talking_points TEXT");
  }
  return db;
}

export function getAllLeads() {
  return getDb()
    .prepare('SELECT * FROM saved_leads ORDER BY saved_at DESC')
    .all();
}

export function saveLead(lead: {
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
}) {
  return getDb()
    .prepare(`
      INSERT OR IGNORE INTO saved_leads
        (id, place_id, company_name, address, phone, website, industry, rating, review_count, maps_url)
      VALUES
        (@id, @place_id, @company_name, @address, @phone, @website, @industry, @rating, @review_count, @maps_url)
    `)
    .run(lead);
}

export function deleteLead(id: string) {
  return getDb().prepare('DELETE FROM saved_leads WHERE id = ?').run(id);
}

export function updateLeadScore(
  id: string,
  score: number,
  reason: string,
  fit_level: string,
  talking_points?: string[]
) {
  return getDb()
    .prepare(
      'UPDATE saved_leads SET ai_score = ?, ai_score_reason = ?, ai_fit_level = ?, talking_points = ? WHERE id = ?'
    )
    .run(score, reason, fit_level, JSON.stringify(talking_points ?? []), id);
}

export function updateLeadStatus(id: string, status: string) {
  return getDb()
    .prepare('UPDATE saved_leads SET status = ? WHERE id = ?')
    .run(status, id);
}

export function updateLeadNotes(id: string, notes: string) {
  return getDb()
    .prepare('UPDATE saved_leads SET notes = ? WHERE id = ?')
    .run(notes, id);
}

export function updateLeadEnrichment(id: string, enriched_email: string) {
  return getDb()
    .prepare('UPDATE saved_leads SET enriched_email = ? WHERE id = ?')
    .run(enriched_email, id);
}

export function getLeadById(id: string) {
  return getDb()
    .prepare('SELECT * FROM saved_leads WHERE id = ?')
    .get(id);
}
