import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(req: NextRequest) {
  const { lead, senderName, senderCompany, value_prop } = await req.json();

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 });
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = `You are an expert cold email copywriter for B2B sales. Write a concise, personalized cold email.

Recipient Business:
- Company: ${lead.company_name}
- Industry: ${lead.industry}
- Location: ${lead.address}

Sender:
- Name: ${senderName || 'Alex'}
- Company: ${senderCompany || 'Your Company'}
- Value Proposition: ${value_prop || 'We help businesses grow through better lead generation'}

Rules:
- Subject line under 50 characters, intriguing but not clickbait
- Body: 3-4 short paragraphs, conversational, not salesy
- Reference something specific about their business or industry
- End with a low-friction CTA (15-min call)
- Do NOT use "I hope this email finds you well"

Respond with ONLY valid JSON, no markdown:
{
  "subject": "<email subject>",
  "body": "<full email body, use \\n\\n for paragraphs>"
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 600,
      temperature: 0.7,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = completion.choices[0].message.content || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    const result = JSON.parse(jsonMatch[0]);

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
