'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, AlertCircle, Zap, Target } from 'lucide-react';

interface Analytics {
  overview: {
    totalLeads: number;
    avgScore: string;
    avgQualityScore: string;
    contactRate: string;
    contacted: number;
  };
  
  segmentation: {
    hot: { count: number; percentage: string; avgScore: string };
    warm: { count: number; percentage: string; avgScore: string };
    cold: { count: number; percentage: string; avgScore: string };
  };
  byStatus: Record<string, number>;
  topIndustries: Array<{ industry: string; count: number }>;
  recommendations: Array<{ priority: 'high' | 'medium' | 'low'; message: string }>;
}

export default function InsightsCard() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch('/api/analytics');
        const data = await res.json();
        if (data.error) {
          setError(data.error);
        } else if (data.overview) {
          setAnalytics(data);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) return <div className="text-center py-4 text-gray-500 text-sm">Loading insights...</div>;
  if (error) return <div className="text-center py-4 text-gray-500 text-sm">Insights will appear once leads are saved and scored.</div>;
  if (!analytics) return null;

  const { overview, segmentation, recommendations, topIndustries } = analytics;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {/* Overview */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-xl p-4">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          Pipeline Overview
        </h3>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">Total Leads</span>
            <span className="text-white font-medium">{overview.totalLeads}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Avg AI Score</span>
            <span className="text-purple-400 font-medium">{overview.avgScore}/10</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Avg Quality Score</span>
            <span className="text-cyan-400 font-medium">{overview.avgQualityScore}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Contact Rate</span>
            <span className="text-emerald-400 font-medium">{overview.contactRate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Contacted</span>
            <span className="text-blue-400 font-medium">{overview.contacted}</span>
          </div>
        </div>
      </div>

      {/* Segmentation */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-xl p-4">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <Target className="w-4 h-4 text-red-400" />
          Lead Segmentation
        </h3>
        <div className="space-y-3 text-xs">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-400">Hot Leads</span>
              <span className="text-red-400 font-medium">{segmentation.hot.count} ({segmentation.hot.percentage})</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-1.5">
              <div className="bg-red-500 h-1.5 rounded-full" style={{width: segmentation.hot.percentage}}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-400">Warm Leads</span>
              <span className="text-yellow-400 font-medium">{segmentation.warm.count} ({segmentation.warm.percentage})</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-1.5">
              <div className="bg-yellow-500 h-1.5 rounded-full" style={{width: segmentation.warm.percentage}}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-400">Cold Leads</span>
              <span className="text-blue-400 font-medium">{segmentation.cold.count} ({segmentation.cold.percentage})</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-1.5">
              <div className="bg-blue-500 h-1.5 rounded-full" style={{width: segmentation.cold.percentage}}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Industries */}
      {topIndustries.length > 0 && (
        <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-3">Top Industries</h3>
          <div className="space-y-2 text-xs">
            {topIndustries.map((ind, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-gray-400">{ind.industry}</span>
                <span className="text-emerald-400 font-medium">{ind.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            Recommendations
          </h3>
          <div className="space-y-2 text-xs">
            {recommendations.slice(0, 2).map((rec, i) => (
              <div key={i} className="flex gap-2 items-start p-2 bg-gray-800/50 rounded-lg border-l-2 border-yellow-500">
                <AlertCircle className="w-3 h-3 text-yellow-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-300">{rec.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
