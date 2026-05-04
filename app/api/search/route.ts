import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { Lead } from '@/lib/types';

function generateId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

const TAG_MAP: Record<string, string[][]> = {
  restaurant: [['amenity', 'restaurant'], ['amenity', 'fast_food']],
  restaurants: [['amenity', 'restaurant'], ['amenity', 'fast_food']],
  cafe: [['amenity', 'cafe']],
  bar: [['amenity', 'bar'], ['amenity', 'pub']],
  'law firm': [['office', 'lawyer']],
  'law firms': [['office', 'lawyer']],
  lawyer: [['office', 'lawyer']],
  dental: [['amenity', 'dentist']],
  dentist: [['amenity', 'dentist']],
  'dental offices': [['amenity', 'dentist']],
  gym: [['leisure', 'fitness_centre']],
  'gyms and fitness': [['leisure', 'fitness_centre']],
  fitness: [['leisure', 'fitness_centre']],
  'auto repair': [['shop', 'car_repair']],
  mechanic: [['shop', 'car_repair']],
  plumber: [['shop', 'plumber']],
  plumbers: [['shop', 'plumber']],
  accounting: [['office', 'accountant']],
  'accounting firms': [['office', 'accountant']],
  accountant: [['office', 'accountant']],
  hotel: [['tourism', 'hotel']],
  hotels: [['tourism', 'hotel']],
  clinic: [['amenity', 'clinic']],
  'medical clinics': [['amenity', 'clinic'], ['amenity', 'doctors']],
  pharmacy: [['amenity', 'pharmacy']],
  bank: [['amenity', 'bank']],
  school: [['amenity', 'school']],
  supermarket: [['shop', 'supermarket']],
  'marketing agencies': [['office', 'marketing']],
  marketing: [['office', 'marketing']],
  'it services': [['office', 'it']],
  'construction companies': [['craft', 'construction']],
  construction: [['craft', 'construction']],
  'financial advisors': [['office', 'financial']],
  'real estate': [['office', 'estate_agent']],
  'real estate agencies': [['office', 'estate_agent']],
  bakery: [['shop', 'bakery']],
  electrician: [['craft', 'electrician']],
  electricians: [['craft', 'electrician']],
  hairdresser: [['shop', 'hairdresser']],
  salon: [['shop', 'hairdresser'], ['shop', 'beauty']],
  veterinary: [['amenity', 'veterinary']],
};

function buildOverpassQuery(tags: string[][], lat: number, lon: number, radius: number): string {
  const parts = tags.map(([key, val]) => {
    const nodeQuery = `node["${key}"="${val}"](around:${radius},${lat},${lon});`;
    const wayQuery = `way["${key}"="${val}"](around:${radius},${lat},${lon});`;
    return `${nodeQuery}\n  ${wayQuery}`;
  });
  return `[out:json][timeout:25];\n(\n  ${parts.join('\n  ')}\n);\nout body center;`;
}

function buildAddress(tags: Record<string, string>): string {
  return [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:city'],
    tags['addr:state'],
    tags['addr:postcode'],
  ]
    .filter(Boolean)
    .join(', ');
}

async function geocodeLocation(location: string): Promise<{ lat: number; lon: number } | null> {
  const res = await axios.get('https://nominatim.openstreetmap.org/search', {
    params: { q: location, format: 'json', limit: 1 },
    headers: { 'User-Agent': 'SaaSQuatchLeads/1.0' },
  });
  if (res.data.length === 0) return null;
  return { lat: parseFloat(res.data[0].lat), lon: parseFloat(res.data[0].lon) };
}

export async function POST(req: NextRequest) {
  const { query, location, maxResults = 20 } = await req.json();

  if (!query || !location) {
    return NextResponse.json({ error: 'query and location are required' }, { status: 400 });
  }

  try {
    const coords = await geocodeLocation(location);
    if (!coords) {
      return NextResponse.json({ error: `Could not find location: "${location}"` }, { status: 400 });
    }

    const queryLower = query.toLowerCase().trim();
    const tags = TAG_MAP[queryLower];

    if (!tags) {
      return NextResponse.json(
        {
          error: `Unsupported search term: "${query}". Try: restaurants, law firms, dental offices, gyms, auto repair, plumbers, accounting firms, hotels, medical clinics, real estate agencies, marketing agencies, IT services, construction companies, or financial advisors.`,
        },
        { status: 400 }
      );
    }

    const overpassQuery = buildOverpassQuery(tags, coords.lat, coords.lon, 5000);

    const OVERPASS_MIRRORS = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
      'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
    ];

    let overpassRes: any = null;
    let lastErr = '';
    for (const mirror of OVERPASS_MIRRORS) {
      try {
        overpassRes = await axios.get(mirror, {
          params: { data: overpassQuery },
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'SaaSQuatchLeads/1.0 (https://github.com/saasquatchleads)',
          },
          timeout: 20000,
        });
        break;
      } catch (e: any) {
        lastErr = e?.response?.data || e.message;
      }
    }
    if (!overpassRes) throw new Error(`Overpass API unavailable: ${lastErr}`);

    const elements: any[] = overpassRes.data.elements || [];

    const seen = new Set<string>();
    const leads: Lead[] = [];

    for (const el of elements) {
      if (leads.length >= maxResults) break;
      const tags = el.tags || {};
      const name = tags.name;
      if (!name || seen.has(name.toLowerCase())) continue;
      seen.add(name.toLowerCase());

      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;

      leads.push({
        id: generateId(),
        place_id: `osm_${el.type}_${el.id}`,
        company_name: name,
        address: buildAddress(tags),
        phone: tags.phone || tags['contact:phone'] || tags['contact:mobile'] || '',
        website: tags.website || tags['contact:website'] || tags['url'] || '',
        industry: query,
        rating: 0,
        review_count: 0,
        maps_url: lat && lon
          ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`
          : `https://www.openstreetmap.org/${el.type}/${el.id}`,
      });
    }

    return NextResponse.json({ leads, total: leads.length });
  } catch (err: any) {
    const msg = err?.response?.data || err.message;
    return NextResponse.json({ error: String(msg) }, { status: 500 });
  }
}
