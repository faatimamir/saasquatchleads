import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { updateLeadScore } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { lead, criteria } = await req.json();

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 });
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = `You are a B2B sales intelligence expert. Analyze this business lead and score it for outreach potential.

Lead Information:
- Company: ${lead.company_name}
- Industry: ${lead.industry}
- Address: ${lead.address}
- Phone: ${lead.phone || 'Not available'}
- Website: ${lead.website || 'Not available'}

${criteria ? `Ideal Customer Profile: ${criteria}` : 'Use general B2B lead scoring criteria.'}

Respond with ONLY valid JSON, no markdown, no explanation:
{
  "score": <integer 1-10>,
  "fit_level": "<High|Medium|Low>",
  "reason": "<2-3 sentence explanation>",
  "talking_points": ["<point 1>", "<point 2>", "<point 3>"]
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 400,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = completion.choices[0].message.content || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    const result = JSON.parse(jsonMatch[0]);

    if (lead.id) {
      updateLeadScore(lead.id, result.score, result.reason, result.fit_level);
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
