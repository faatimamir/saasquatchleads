export interface Lead {
  id: string;
  place_id: string;
  company_name: string;
  address: string;
  phone: string;
  website: string;
  industry: string;
  rating: number;
  review_count: number;
  maps_url: string;
}

export interface SavedLead extends Lead {
  saved_at: string;
  ai_score: number | null;
  ai_score_reason: string | null;
  ai_fit_level: string | null;
  talking_points: string | null;
  status: 'New' | 'Contacted' | 'Qualified' | 'Closed' | 'Not Interested';
  notes: string;
  enriched_email: string;
}

export interface SearchParams {
  query: string;
  location: string;
  maxResults?: number;
}

export interface AIScore {
  score: number;
  reason: string;
  fit_level: 'High' | 'Medium' | 'Low';
  talking_points: string[];
}

export interface EmailDraft {
  subject: string;
  body: string;
}

export const PIPELINE_STATUSES = [
  'New',
  'Contacted',
  'Qualified',
  'Closed',
  'Not Interested',
] as const;

export type PipelineStatus = typeof PIPELINE_STATUSES[number];

export const STATUS_COLORS: Record<PipelineStatus, string> = {
  New: 'bg-gray-700 text-gray-300',
  Contacted: 'bg-blue-500/20 text-blue-400',
  Qualified: 'bg-emerald-500/20 text-emerald-400',
  Closed: 'bg-purple-500/20 text-purple-400',
  'Not Interested': 'bg-red-500/20 text-red-400',
};
