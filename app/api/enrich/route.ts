import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { updateLeadEnrichment } from '@/lib/db';

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;

function extractEmails(html: string): string[] {
  const raw = html.match(EMAIL_RE) || [];
  return [...new Set(raw)].filter(
    (e) => !e.includes('.png') && !e.includes('.jpg') && !e.includes('.js') && !e.includes('.css')
  );
}

function extractPhones(html: string): string[] {
  const raw = html.match(PHONE_RE) || [];
  return [...new Set(raw)].slice(0, 3);
}

export async function POST(req: NextRequest) {
  const { website, id } = await req.json();

  if (!website) {
    return NextResponse.json({ error: 'website is required' }, { status: 400 });
  }

  try {
    const url = website.startsWith('http') ? website : `https://${website}`;
    const res = await axios.get(url, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SaaSQuatchLeads/1.0)',
        'Accept': 'text/html',
      },
      maxRedirects: 3,
    });

    const html: string = res.data || '';
    const emails = extractEmails(html);
    const phones = extractPhones(html);

    // Also check /contact page if no emails found on homepage
    let contactEmails: string[] = [];
    if (emails.length === 0) {
      try {
        const base = new URL(url).origin;
        const contactRes = await axios.get(`${base}/contact`, {
          timeout: 5000,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SaaSQuatchLeads/1.0)' },
          maxRedirects: 2,
        });
        contactEmails = extractEmails(contactRes.data || '');
      } catch {
        // contact page doesn't exist — that's fine
      }
    }

    const allEmails = [...new Set([...emails, ...contactEmails])].slice(0, 5);
    const primaryEmail = allEmails[0] || '';

    if (id && primaryEmail) {
      updateLeadEnrichment(id, primaryEmail);
    }

    return NextResponse.json({ emails: allEmails, phones, primary_email: primaryEmail });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
