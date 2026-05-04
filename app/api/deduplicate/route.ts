import { NextRequest, NextResponse } from 'next/server';
import { findDuplicates, markAsDuplicate, getAllLeads } from '@/lib/db';

function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  if (longer.length === 0) return 1;
  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function getEditDistance(s1: string, s2: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

function computeSimilarity(target: any, dup: any): number {
  let score = 0;
  if (target.website && dup.website === target.website) score += 40;
  else if (target.website && dup.website)
    score += stringSimilarity(target.website, dup.website) * 30;
  if (target.phone && dup.phone === target.phone) score += 40;
  else if (target.phone && dup.phone)
    score += stringSimilarity(target.phone, dup.phone) * 30;
  score += stringSimilarity(target.company_name, dup.company_name) * 20;
  return Math.min(100, score);
}

export async function POST(req: NextRequest) {
  const { leadId, autoMerge } = await req.json();
  try {
    const allLeads = await getAllLeads();
    const targetLead = allLeads.find((l: any) => l.id === leadId);
    if (!targetLead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });

    const candidates = await findDuplicates({
      company_name: (targetLead as any).company_name,
      website: (targetLead as any).website,
      phone: (targetLead as any).phone,
    });

    const scoredDuplicates = candidates
      .filter((d: any) => d.id !== leadId && !d.duplicate_of)
      .map((d: any) => ({ ...d, similarity_score: computeSimilarity(targetLead, d) }))
      .filter((d: any) => d.similarity_score >= 60)
      .sort((a: any, b: any) => b.similarity_score - a.similarity_score);

    if (autoMerge && scoredDuplicates.length > 0) {
      await Promise.all(scoredDuplicates.map((d: any) => markAsDuplicate(d.id, leadId)));
      return NextResponse.json({
        success: true,
        merged: scoredDuplicates.length,
        duplicates: scoredDuplicates.map((d: any) => ({
          id: d.id,
          company_name: d.company_name,
          similarity_score: d.similarity_score,
          reason: d.similarity_score > 90 ? 'Exact match' : 'High similarity',
        })),
      });
    }

    return NextResponse.json({
      duplicates: scoredDuplicates.map((d: any) => ({
        id: d.id,
        company_name: d.company_name,
        website: d.website,
        phone: d.phone,
        similarity_score: d.similarity_score,
        status: d.status,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const allLeads = await getAllLeads();
    let mergeCount = 0;

    for (const lead of allLeads as any[]) {
      if (lead.duplicate_of) continue;
      const candidates = await findDuplicates({
        company_name: lead.company_name,
        website: lead.website,
        phone: lead.phone,
      });
      for (const dup of candidates as any[]) {
        if (dup.id === lead.id || dup.duplicate_of) continue;
        const score = computeSimilarity(lead, dup);
        if (score >= 80) {
          await markAsDuplicate(dup.id, lead.id);
          mergeCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      duplicatesMerged: mergeCount,
      totalLeads: allLeads.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
