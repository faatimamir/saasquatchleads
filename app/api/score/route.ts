import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { updateLeadScore, updateQualityScore, updateLeadTier } from '@/lib/db';

// Calculate quality score based on data completeness and validity
function calculateQualityScore(lead: any): number {
  let score = 0;
  const maxScore = 100;
  
  // Data completeness (60 points)
  if (lead.phone) score += 15;
  if (lead.website) score += 15;
  if (lead.enriched_email) score += 15;
  if (lead.industry) score += 10;
  if (lead.address) score += 5;
  
  // Social signals (20 points)
  if (lead.rating && lead.rating >= 4.5) score += 10;
  if (lead.review_count && lead.review_count > 20) score += 10;
  
  // Business signals (20 points)
  if (lead.website && lead.website.includes('.')) {
    const domain = lead.website.split('/')[2] || '';
    if (!domain.includes('facebook') && !domain.includes('linkedin')) score += 10;
  }
  if (lead.phone && lead.phone.length > 8) score += 10;
  
  return Math.min(score, maxScore);
}

// Determine lead tier based on AI score and quality
function determineTier(aiScore: number, qualityScore: number): 'Hot' | 'Warm' | 'Cold' {
  const combinedScore = (aiScore * 0.7) + (qualityScore * 0.3);
  if (combinedScore >= 7.5) return 'Hot';
  if (combinedScore >= 5) return 'Warm';
  return 'Cold';
}

export async function POST(req: NextRequest) {
  const { lead, criteria } = await req.json();

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 });
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  // Calculate quality score first
  const qualityScore = calculateQualityScore(lead);

  const prompt = `You are a B2B sales intelligence expert. Analyze this business lead and score it for outreach potential.

Lead Information:
- Company: ${lead.company_name}
- Industry: ${lead.industry}
- Address: ${lead.address}
- Phone: ${lead.phone || 'Not available'}
- Website: ${lead.website || 'Not available'}
- Rating: ${lead.rating ? lead.rating + '/5' : 'Not available'}
- Reviews: ${lead.review_count || 0}
- Data Quality: ${qualityScore.toFixed(1)}/100

${criteria ? `Ideal Customer Profile: ${criteria}` : 'Use general B2B lead scoring criteria.'}

Consider:
1. Business fundamentals (size, growth indicators, reviews)
2. Contact accessibility (phone, website, email availability)
3. Industry fit
4. Engagement potential

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
      const tier = determineTier(result.score, qualityScore);
      await Promise.all([
        updateLeadScore(lead.id, result.score, result.reason, result.fit_level, result.talking_points),
        updateQualityScore(lead.id, qualityScore),
        updateLeadTier(lead.id, tier),
      ]);
    }

    return NextResponse.json({
      ...result,
      quality_score: qualityScore,
      tier: determineTier(result.score, qualityScore),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
