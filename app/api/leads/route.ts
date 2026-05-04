import { NextRequest, NextResponse } from 'next/server';
import { getAllLeads, saveLead, deleteLead, updateLeadStatus, updateLeadNotes, findDuplicates } from '@/lib/db';

export async function GET() {
  try {
    const leads = await getAllLeads();
    return NextResponse.json({ leads });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const lead = await req.json();
    // Check for duplicates by website, phone, or name before saving
    const dupes = await findDuplicates({
      company_name: lead.company_name,
      website: lead.website || '',
      phone: lead.phone || '',
    });
    const isDuplicate = dupes.some((d: any) => d.id !== lead.id);
    if (isDuplicate) {
      return NextResponse.json({ success: true, isDuplicate: true });
    }
    await saveLead(lead);
    return NextResponse.json({ success: true, isDuplicate: false });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, status, notes } = await req.json();
    if (status !== undefined) await updateLeadStatus(id, status);
    if (notes !== undefined) await updateLeadNotes(id, notes);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    await deleteLead(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
