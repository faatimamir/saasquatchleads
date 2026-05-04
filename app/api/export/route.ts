import { NextRequest, NextResponse } from 'next/server';
import { getAllLeads } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { format = 'csv', leadIds, filterTier } = await req.json();
  try {
    let leads = (await getAllLeads()).filter((l: any) => !l.duplicate_of);

    if (leadIds && Array.isArray(leadIds)) {
      leads = leads.filter((l: any) => leadIds.includes(l.id));
    }
    if (filterTier) {
      leads = leads.filter((l: any) => l.lead_tier === filterTier);
    }
    if (leads.length === 0) {
      return NextResponse.json({ error: 'No leads to export' }, { status: 400 });
    }

    let csv = '';
    if (format === 'salesforce') csv = exportSalesforceFormat(leads);
    else if (format === 'hubspot') csv = exportHubSpotFormat(leads);
    else if (format === 'crm-generic') csv = exportGenericCRMFormat(leads);
    else csv = exportStandardFormat(leads);

    const timestamp = new Date().toISOString().split('T')[0];
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv;charset=utf-8',
        'Content-Disposition': `attachment; filename="leads-${format}-${timestamp}.csv"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function escapeCsv(str: string): string {
  if (!str) return '';
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function mapScoreToGrade(score: number | null): string {
  if (!score) return '';
  if (score >= 9) return 'A';
  if (score >= 7) return 'B';
  if (score >= 5) return 'C';
  return 'D';
}

function mapStatusToHubSpotLifecycle(status: string): string {
  const m: Record<string, string> = {
    New: 'lead',
    Contacted: 'marketingqualifiedlead',
    Qualified: 'opportunity',
    Closed: 'customer',
    'Not Interested': 'disqualifiedlead',
  };
  return m[status] || 'lead';
}

function getNextAction(lead: any): string {
  if (!lead.contact_count) return 'Initial Outreach';
  if (lead.contact_count === 1) return 'Follow-up Call';
  if (lead.contact_count === 2) return 'Schedule Demo';
  return 'Close or Re-engage';
}

function exportStandardFormat(leads: any[]): string {
  const headers = ['Company Name','Contact Email','Phone','Website','Address','Industry','Rating','Review Count','Status','AI Score','Fit Level','Lead Tier','Quality Score','Contact Count','Notes','Last Contacted'];
  const rows = leads.map(l => [escapeCsv(l.company_name),escapeCsv(l.enriched_email||''),escapeCsv(l.phone||''),escapeCsv(l.website||''),escapeCsv(l.address||''),escapeCsv(l.industry||''),l.rating||'',l.review_count||'',l.status||'New',l.ai_score||'',l.ai_fit_level||'',l.lead_tier||'Warm',l.quality_score?Number(l.quality_score).toFixed(1):'',l.contact_count||'0',escapeCsv(l.notes||''),l.last_contacted||'']);
  return [headers,...rows].map(r=>r.join(',')).join('\n');
}

function exportHubSpotFormat(leads: any[]): string {
  const headers = ['Company','Email','Phone','Website','Industry','Custom AI Score','Custom Fit Level','Custom Lead Tier','Custom Quality Score','Lifecyclestage','Notes'];
  const rows = leads.map(l => [escapeCsv(l.company_name),escapeCsv(l.enriched_email||''),escapeCsv(l.phone||''),escapeCsv(l.website||''),escapeCsv(l.industry||''),l.ai_score||'',l.ai_fit_level||'',l.lead_tier||'Warm',l.quality_score?Number(l.quality_score).toFixed(1):'',mapStatusToHubSpotLifecycle(l.status),escapeCsv(`${l.ai_score_reason||''} | ${l.notes||''}`)]);
  return [headers,...rows].map(r=>r.join(',')).join('\n');
}

function exportSalesforceFormat(leads: any[]): string {
  const headers = ['Account Name','Email','Phone','Website','Industry','Rating__c','Review_Count__c','AI_Score__c','Fit_Level__c','Lead_Tier__c','Quality_Score__c','Status','Description'];
  const rows = leads.map(l => [escapeCsv(l.company_name),escapeCsv(l.enriched_email||''),escapeCsv(l.phone||''),escapeCsv(l.website||''),escapeCsv(l.industry||''),l.rating||'',l.review_count||'',l.ai_score||'',l.ai_fit_level||'',l.lead_tier||'Warm',l.quality_score?Number(l.quality_score).toFixed(1):'',l.status||'New',escapeCsv(`${l.ai_score_reason||''} | ${l.notes||''}`)]);
  return [headers,...rows].map(r=>r.join(',')).join('\n');
}

function exportGenericCRMFormat(leads: any[]): string {
  const headers = ['Company Name','Email','Phone','Website','Industry','Source','Lead Score','Lead Grade','Lead Status','Quality Score','Next Action','Notes'];
  const rows = leads.map(l => [escapeCsv(l.company_name),escapeCsv(l.enriched_email||''),escapeCsv(l.phone||''),escapeCsv(l.website||''),escapeCsv(l.industry||''),'SaaSQuatch Leads',l.ai_score||'',mapScoreToGrade(l.ai_score),l.status||'New',l.quality_score?Number(l.quality_score).toFixed(1):'',getNextAction(l),escapeCsv(`${l.ai_score_reason||''} | ${l.notes||''}`)]);
  return [headers,...rows].map(r=>r.join(',')).join('\n');
}
