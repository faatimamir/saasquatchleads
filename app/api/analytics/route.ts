import { NextResponse } from 'next/server';
import { getAnalytics, getLeadsByTier, getAllLeads } from '@/lib/db';

export async function GET() {
  try {
    const [analytics, hotLeads, warmLeads, coldLeads, allLeads] = await Promise.all([
      getAnalytics(),
      getLeadsByTier('Hot'),
      getLeadsByTier('Warm'),
      getLeadsByTier('Cold'),
      getAllLeads(),
    ]);

    const activeLeads = allLeads.filter((l: any) => !l.duplicate_of);
    const avgQualityScore =
      activeLeads.reduce((sum: number, l: any) => sum + (l.quality_score || 0), 0) /
      Math.max(activeLeads.length, 1);
    const contactRate =
      analytics.total > 0
        ? ((analytics.contacted / analytics.total) * 100).toFixed(1)
        : '0';

    const industryBreakdown: Record<string, number> = {};
    activeLeads.forEach((lead: any) => {
      const key = lead.industry || 'Unknown';
      industryBreakdown[key] = (industryBreakdown[key] || 0) + 1;
    });

    return NextResponse.json({
      overview: {
        totalLeads: analytics.total,
        avgScore: Number(analytics.avgScore).toFixed(1),
        avgQualityScore: avgQualityScore.toFixed(1),
        contactRate: contactRate + '%',
        contacted: analytics.contacted,
      },
      segmentation: {
        hot: {
          count: hotLeads.length,
          percentage: ((hotLeads.length / Math.max(analytics.total, 1)) * 100).toFixed(1) + '%',
          avgScore:
            hotLeads.length > 0
              ? (hotLeads.reduce((s: number, l: any) => s + (l.ai_score || 0), 0) / hotLeads.length).toFixed(1)
              : 0,
        },
        warm: {
          count: warmLeads.length,
          percentage: ((warmLeads.length / Math.max(analytics.total, 1)) * 100).toFixed(1) + '%',
          avgScore:
            warmLeads.length > 0
              ? (warmLeads.reduce((s: number, l: any) => s + (l.ai_score || 0), 0) / warmLeads.length).toFixed(1)
              : 0,
        },
        cold: {
          count: coldLeads.length,
          percentage: ((coldLeads.length / Math.max(analytics.total, 1)) * 100).toFixed(1) + '%',
          avgScore:
            coldLeads.length > 0
              ? (coldLeads.reduce((s: number, l: any) => s + (l.ai_score || 0), 0) / coldLeads.length).toFixed(1)
              : 0,
        },
      },
      byStatus: analytics.byStatus,
      topIndustries: Object.entries(industryBreakdown)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([industry, count]) => ({ industry, count })),
      recommendations: generateRecommendations(hotLeads, warmLeads, coldLeads, analytics),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function generateRecommendations(
  hotLeads: any[],
  warmLeads: any[],
  coldLeads: any[],
  analytics: any
) {
  const recommendations = [];

  if (hotLeads.length === 0) {
    recommendations.push({
      priority: 'high',
      message: 'No hot leads yet. Run AI scoring on your warm leads to identify high-potential prospects.',
    });
  } else if (hotLeads.length < 5) {
    recommendations.push({
      priority: 'medium',
      message: `Only ${hotLeads.length} hot lead${hotLeads.length === 1 ? '' : 's'}. Reach out to top warm leads to grow your pipeline.`,
    });
  }

  if (analytics.contacted < Math.min(hotLeads.length, 3)) {
    recommendations.push({
      priority: 'high',
      message: "You have hot leads that haven't been contacted yet. Start outreach to convert opportunities.",
    });
  }

  if (coldLeads.length > analytics.total * 0.5) {
    recommendations.push({
      priority: 'medium',
      message: 'Over 50% of leads are cold. Refine your ICP or enrich data to improve scoring.',
    });
  }

  if (!recommendations.length) {
    recommendations.push({
      priority: 'low',
      message: 'Great job! Your pipeline looks healthy. Keep reaching out to hot leads.',
    });
  }

  return recommendations;
}
