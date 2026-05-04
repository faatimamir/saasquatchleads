import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { updateLeadEnrichment } from '@/lib/db';

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
const PHONE_RE = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;

const PLATFORM_EMAIL_DOMAINS = [
  'wixpress.com', 'squarespace.com', 'shopify.com', 'weebly.com',
  'godaddy.com', 'wordpress.com', 'mailchimp.com', 'sentry.io',
  'google.com', 'amazonaws.com', 'cloudflare.com', 'example.com',
  'sentry-next.wixpress.com', 'hubspot.com', 'zendesk.com',
];

function extractEmails(html: string, siteDomain?: string): string[] {
  const raw = html.match(EMAIL_RE) || [];
  return [...new Set(raw)].filter((e) => {
    if (e.includes('.png') || e.includes('.jpg') || e.includes('.js') || e.includes('.css') || e.includes('.svg')) return false;
    const domain = e.split('@')[1]?.toLowerCase() || '';
    if (PLATFORM_EMAIL_DOMAINS.some((d) => domain.includes(d))) return false;
    // prefer emails on the same domain or generic contact addresses
    return true;
  });
}

function rankEmails(emails: string[], siteDomain: string): string[] {
  const domainBase = siteDomain.replace(/^www\./, '').toLowerCase();
  return [...emails].sort((a, b) => {
    const aOnSite = a.includes(domainBase) ? 0 : 1;
    const bOnSite = b.includes(domainBase) ? 0 : 1;
    if (aOnSite !== bOnSite) return aOnSite - bOnSite;
    const priority = ['contact@', 'info@', 'hello@', 'support@', 'sales@'];
    const aP = priority.findIndex((p) => a.startsWith(p));
    const bP = priority.findIndex((p) => b.startsWith(p));
    return (aP === -1 ? 99 : aP) - (bP === -1 ? 99 : bP);
  });
}

function extractPhones(html: string): string[] {
  const raw = html.match(PHONE_RE) || [];
  return [...new Set(raw)].slice(0, 3);
}

async function fetchHtml(url: string, timeout = 8000): Promise<string> {
  const res = await axios.get(url, {
    timeout,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    maxRedirects: 4,
  });
  return res.data || '';
}

export async function POST(req: NextRequest) {
  const { website, id } = await req.json();

  if (!website) {
    return NextResponse.json({ error: 'website is required' }, { status: 400 });
  }

  try {
    const url = website.startsWith('http') ? website : `https://${website}`;
    const base = new URL(url).origin;
    const siteDomain = new URL(url).hostname;

    const homepageHtml = await fetchHtml(url).catch(() => '');
    const phones = extractPhones(homepageHtml);

    // Always check contact pages — don't skip based on homepage emails
    const contactPaths = ['/contact', '/contact-us', '/about', '/about-us'];
    const contactHtmlParts = await Promise.allSettled(
      contactPaths.map((p) => fetchHtml(`${base}${p}`, 5000))
    );

    const allHtml = [homepageHtml, ...contactHtmlParts.map((r) => (r.status === 'fulfilled' ? r.value : ''))].join(' ');
    const rawEmails = extractEmails(allHtml, siteDomain);
    const allEmails = rankEmails(rawEmails, siteDomain).slice(0, 5);
    const primaryEmail = allEmails[0] || '';

    if (id && primaryEmail) {
      await updateLeadEnrichment(id, primaryEmail);
    }

    return NextResponse.json({ emails: allEmails, phones, primary_email: primaryEmail });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
