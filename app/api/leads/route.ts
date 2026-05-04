import { NextRequest, NextResponse } from 'next/server';
import { getAllLeads, saveLead, deleteLead, updateLeadStatus, updateLeadNotes } from '@/lib/db';

export async function GET() {
  try {
    const leads = getAllLeads();
    return NextResponse.json({ leads });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const lead = await req.json();
    saveLead(lead);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, status, notes } = await req.json();
    if (status !== undefined) updateLeadStatus(id, status);
    if (notes !== undefined) updateLeadNotes(id, notes);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    deleteLead(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
