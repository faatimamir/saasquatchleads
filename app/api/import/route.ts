import { NextRequest, NextResponse } from 'next/server';
import { saveLead, getAllLeads } from '@/lib/db';

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function normalizeUrl(url: string): string {
  if (!url) return '';
  return url.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').trim();
}

function normalizePhone(phone: string): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

function normalizeKey(k: string): string {
  return k.toLowerCase().trim().replace(/[\s\-\/]+/g, '_').replace(/[^a-z0-9_]/g, '');
}

function pick(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    const val = row[k] || row[normalizeKey(k)];
    if (val) return val;
  }
  return '';
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return NextResponse.json({ error: 'CSV needs a header row and at least one data row' }, { status: 400 });

    const rawHeaders = parseCSVLine(lines[0]);
    const headers = rawHeaders.map(normalizeKey);

    // Load existing leads once to check for duplicates
    const existingLeads = await getAllLeads() as any[];
    const existingWebsites = new Set(existingLeads.map((l) => normalizeUrl(l.website)).filter(Boolean));
    const existingPhones = new Set(existingLeads.map((l) => normalizePhone(l.phone)).filter(Boolean));
    const existingNames = new Set(existingLeads.map((l) => l.company_name.toLowerCase().trim()));

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || ''; });

        const companyName = pick(row, 'company_name', 'company', 'name', 'account_name', 'business_name', 'organisation');
        if (!companyName) continue;

        const phone = pick(row, 'phone', 'company_phone', 'telephone', 'mobile', 'phone_number');
        const website = pick(row, 'website', 'url', 'web', 'domain', 'homepage');

        // Skip if website URL, phone, or exact name already exists
        const normWebsite = normalizeUrl(website);
        const normPhone = normalizePhone(phone);
        if (
          (normWebsite && existingWebsites.has(normWebsite)) ||
          (normPhone && existingPhones.has(normPhone)) ||
          existingNames.has(companyName.toLowerCase().trim())
        ) {
          skipped++;
          continue;
        }

        const lead = {
          id: `import_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`,
          place_id: `import_${Date.now()}_${i}`,
          company_name: companyName,
          address: pick(row, 'address', 'location', 'street', 'full_address'),
          phone,
          website,
          industry: pick(row, 'industry', 'sector', 'type', 'category', 'business_type'),
          rating: parseFloat(pick(row, 'rating', 'score', 'stars') || '0') || 0,
          review_count: parseInt(pick(row, 'review_count', 'reviews', 'review_count') || '0') || 0,
          maps_url: pick(row, 'maps_url', 'google_maps', 'map_url', 'maps_link'),
        };

        await saveLead(lead);
        // Track newly imported leads to catch within-file duplicates too
        if (normWebsite) existingWebsites.add(normWebsite);
        if (normPhone) existingPhones.add(normPhone);
        existingNames.add(companyName.toLowerCase().trim());
        imported++;
      } catch (e: any) {
        errors.push(`Row ${i + 1}: ${e.message}`);
      }
    }

    return NextResponse.json({ imported, skipped, total: lines.length - 1, errors: errors.slice(0, 5) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
