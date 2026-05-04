'use client';

import { useState } from 'react';
import {
  Star, Phone, Globe, MapPin, Bookmark, BookmarkCheck,
  Sparkles, Mail, Loader2, ChevronDown, ChevronUp,
  ExternalLink, Zap, ArrowUpDown, Filter, AtSign, RefreshCw,
  TrendingUp, Copy, AlertCircle
} from 'lucide-react';
import { Lead, SavedLead, PIPELINE_STATUSES, STATUS_COLORS, PipelineStatus } from '@/lib/types';
import ScoreBadge from './ScoreBadge';
import EmailModal from './EmailModal';

interface LeadsTableProps {
  leads: (Lead | SavedLead)[];
  savedIds?: Set<string>;
  onSave?: (lead: Lead) => void;
  onDelete?: (id: string) => void;
  onStatusChange?: (id: string, status: string) => void;
  onNotesChange?: (id: string, notes: string) => void;
  showSaveButton?: boolean;
  showDeleteButton?: boolean;
  showPipelineControls?: boolean;
  icpCriteria?: string;
  onScoreComplete?: (id: string, score: number, fitLevel: string, reason: string) => void;
}

type SortKey = 'name' | 'rating' | 'score' | 'none';

export default function LeadsTable({
  leads,
  savedIds = new Set(),
  onSave,
  onDelete,
  onStatusChange,
  onNotesChange,
  showSaveButton = true,
  showDeleteButton = false,
  showPipelineControls = false,
  icpCriteria = '',
  onScoreComplete,
}: LeadsTableProps) {
  const [scoringId, setScoringId] = useState<string | null>(null);
  const [scoringAll, setScoringAll] = useState(false);
  const [scores, setScores] = useState<Record<string, any>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [emailLead, setEmailLead] = useState<Lead | SavedLead | null>(null);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const [enriched, setEnriched] = useState<Record<string, { emails: string[]; phones: string[] }>>({});
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('none');
  const [filterHasPhone, setFilterHasPhone] = useState(false);
  const [filterHasWebsite, setFilterHasWebsite] = useState(false);
  const [filterMinScore, setFilterMinScore] = useState(0);
  const [filterTier, setFilterTier] = useState<'All' | 'Hot' | 'Warm' | 'Cold'>('All');
  const [deduplicating, setDeduplicating] = useState<string | null>(null);
  const [checkingDuplicates, setCheckingDuplicates] = useState<Record<string, boolean>>({});

  const scoreLeadWithAI = async (lead: Lead | SavedLead) => {
    setScoringId(lead.id);
    try {
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead, criteria: icpCriteria }),
      });
      const data = await res.json();
      if (!data.error) {
        setScores((prev) => ({ ...prev, [lead.id]: data }));
        setExpandedId(lead.id);
        onScoreComplete?.(lead.id, data.score, data.fit_level, data.reason);
      }
    } finally {
      setScoringId(null);
    }
  };

  const scoreAll = async () => {
    setScoringAll(true);
    for (const lead of visibleLeads) {
      if (!getScore(lead)) {
        await scoreLeadWithAI(lead);
      }
    }
    setScoringAll(false);
  };

  const enrichLead = async (lead: Lead | SavedLead) => {
    if (!lead.website) return;
    setEnrichingId(lead.id);
    try {
      const res = await fetch('/api/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: lead.website, id: 'saved_at' in lead ? lead.id : undefined }),
      });
      const data = await res.json();
      if (!data.error) {
        setEnriched((prev) => ({ ...prev, [lead.id]: data }));
        setExpandedId(lead.id);
      }
    } finally {
      setEnrichingId(null);
    }
  };

  const checkForDuplicates = async (lead: Lead | SavedLead) => {
    setCheckingDuplicates(prev => ({ ...prev, [lead.id]: true }));
    try {
      const res = await fetch('/api/deduplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id }),
      });
      const data = await res.json();
      if (!data.error && data.duplicates?.length > 0) {
        setExpandedId(lead.id);
      }
    } finally {
      setCheckingDuplicates(prev => ({ ...prev, [lead.id]: false }));
    }
  };

  const getScore = (lead: Lead | SavedLead) => {
    if (scores[lead.id]) return scores[lead.id];
    if ('ai_score' in lead && lead.ai_score) {
      return {
        score: lead.ai_score,
        reason: lead.ai_score_reason,
        fit_level: lead.ai_fit_level,
        talking_points: lead.talking_points ? JSON.parse(lead.talking_points) : [],
      };
    }
    return null;
  };

  const getEnriched = (lead: Lead | SavedLead) => {
    if (enriched[lead.id]) return enriched[lead.id];
    if ('enriched_email' in lead && lead.enriched_email) {
      return { emails: [lead.enriched_email], phones: [] };
    }
    return null;
  };

  // Filter
  let visibleLeads = leads.filter((l) => {
    if (filterHasPhone && !l.phone) return false;
    if (filterHasWebsite && !l.website) return false;
    if (filterMinScore > 0) {
      const s = getScore(l);
      if (!s || s.score < filterMinScore) return false;
    }
    if (filterTier !== 'All') {
      const tier = 'lead_tier' in l ? (l as SavedLead).lead_tier : undefined;
      if (tier !== filterTier) return false;
    }
    return true;
  });

  // Sort
  if (sortKey === 'name') {
    visibleLeads = [...visibleLeads].sort((a, b) => a.company_name.localeCompare(b.company_name));
  } else if (sortKey === 'rating') {
    visibleLeads = [...visibleLeads].sort((a, b) => b.rating - a.rating);
  } else if (sortKey === 'score') {
    visibleLeads = [...visibleLeads].sort((a, b) => (getScore(b)?.score ?? 0) - (getScore(a)?.score ?? 0));
  }

  if (leads.length === 0) {
    return <div className="text-center py-16 text-gray-500">No leads found.</div>;
  }

  return (
    <>
      {emailLead && <EmailModal lead={emailLead} onClose={() => setEmailLead(null)} />}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4 p-3 bg-gray-900 border border-gray-800 rounded-xl">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Filter className="w-3.5 h-3.5" />
          <button
            onClick={() => setFilterHasPhone(!filterHasPhone)}
            className={`px-2.5 py-1 rounded-md transition-colors ${filterHasPhone ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 hover:text-white'}`}
          >
            Has Phone
          </button>
          <button
            onClick={() => setFilterHasWebsite(!filterHasWebsite)}
            className={`px-2.5 py-1 rounded-md transition-colors ${filterHasWebsite ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 hover:text-white'}`}
          >
            Has Website
          </button>
          <select
            value={filterMinScore}
            onChange={(e) => setFilterMinScore(Number(e.target.value))}
            className="bg-gray-800 text-gray-300 rounded-md px-2 py-1 text-xs border border-gray-700 focus:outline-none"
          >
            <option value={0}>Any Score</option>
            <option value={7}>Score ≥ 7</option>
            <option value={8}>Score ≥ 8</option>
            <option value={9}>Score ≥ 9</option>
          </select>
          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value as 'All' | 'Hot' | 'Warm' | 'Cold')}
            className="bg-gray-800 text-gray-300 rounded-md px-2 py-1 text-xs border border-gray-700 focus:outline-none"
          >
            <option value="All">All Tiers</option>
            <option value="Hot">🔥 Hot Leads</option>
            <option value="Warm">🌡️ Warm Leads</option>
            <option value="Cold">❄️ Cold Leads</option>
          </select>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-400 ml-auto">
          <ArrowUpDown className="w-3.5 h-3.5" />
          {(['none', 'name', 'rating', 'score'] as SortKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setSortKey(k)}
              className={`px-2.5 py-1 rounded-md capitalize transition-colors ${sortKey === k ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 hover:text-white'}`}
            >
              {k === 'none' ? 'Default' : k}
            </button>
          ))}
        </div>

        <button
          onClick={scoreAll}
          disabled={scoringAll}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
        >
          {scoringAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
          Score All
        </button>
      </div>

      <p className="text-xs text-gray-500 mb-3">{visibleLeads.length} of {leads.length} leads</p>

      <div className="space-y-3">
        {visibleLeads.map((lead) => {
          const score = getScore(lead);
          const enrichedData = getEnriched(lead);
          const isExpanded = expandedId === lead.id;
          const isSaved = savedIds.has(lead.place_id);
          const savedLead = lead as SavedLead;

          return (
            <div
              key={lead.id}
              className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-white font-semibold truncate">{lead.company_name}</h3>
                      {score && <ScoreBadge score={score.score} fitLevel={score.fit_level} size="sm" />}
                      {score?.quality_score !== undefined && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded-full text-xs font-medium">
                          <TrendingUp className="w-3 h-3" />
                          Quality: {score.quality_score.toFixed(0)}
                        </div>
                      )}
                      {score?.tier && (
                        <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          score.tier === 'Hot' ? 'bg-red-500/20 text-red-400' :
                          score.tier === 'Warm' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {score.tier === 'Hot' ? '🔥' : score.tier === 'Warm' ? '🌡️' : '❄️'} {score.tier}
                        </div>
                      )}
                      {showPipelineControls && savedLead.status && (
                        <select
                          value={savedLead.status}
                          onChange={(e) => onStatusChange?.(lead.id, e.target.value)}
                          className={`text-xs px-2 py-0.5 rounded-full border-0 font-medium cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500 ${STATUS_COLORS[savedLead.status as PipelineStatus] || 'bg-gray-700 text-gray-300'}`}
                        >
                          {PIPELINE_STATUSES.map((s) => (
                            <option key={s} value={s} className="bg-gray-900 text-white">{s}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                      {lead.address && (
                        <span className="flex items-center gap-1 text-gray-400 text-xs">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate max-w-xs">{lead.address}</span>
                        </span>
                      )}
                      {lead.phone && (
                        <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-gray-400 hover:text-emerald-400 text-xs transition-colors">
                          <Phone className="w-3 h-3" />{lead.phone}
                        </a>
                      )}
                      {lead.website && (
                        <a href={lead.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-gray-400 hover:text-blue-400 text-xs transition-colors">
                          <Globe className="w-3 h-3" />
                          {lead.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                      {enrichedData?.emails[0] && (
                        <a href={`mailto:${enrichedData.emails[0]}`} className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 text-xs transition-colors font-medium">
                          <AtSign className="w-3 h-3" />{enrichedData.emails[0]}
                        </a>
                      )}
                    </div>

                    <div className="mt-2 flex items-center gap-3">
                      {lead.rating > 0 && (
                        <span className="flex items-center gap-1 text-yellow-400 text-xs">
                          <Star className="w-3 h-3 fill-current" />
                          {lead.rating.toFixed(1)}
                          <span className="text-gray-500">({lead.review_count})</span>
                        </span>
                      )}
                      <span className="text-xs text-gray-500 capitalize">{lead.industry}</span>
                      {lead.maps_url && (
                        <a href={lead.maps_url} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-500 hover:text-blue-400 transition-colors">
                          View on Map
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                    <button onClick={() => scoreLeadWithAI(lead)} disabled={scoringId === lead.id || scoringAll}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50">
                      {scoringId === lead.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      Score
                    </button>

                    {lead.website && (
                      <button onClick={() => enrichLead(lead)} disabled={enrichingId === lead.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50">
                        {enrichingId === lead.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <AtSign className="w-3 h-3" />}
                        Enrich
                      </button>
                    )}

                    {showPipelineControls && (
                      <button onClick={() => checkForDuplicates(lead)} disabled={checkingDuplicates[lead.id]}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg text-xs font-medium transition-colors disabled:opacity-50">
                        {checkingDuplicates[lead.id] ? <Loader2 className="w-3 h-3 animate-spin" /> : <Copy className="w-3 h-3" />}
                        Check Duplicates
                      </button>
                    )}

                    <button onClick={() => setEmailLead(lead)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs font-medium transition-colors">
                      <Mail className="w-3 h-3" />Email
                    </button>

                    {showSaveButton && onSave && (
                      <button onClick={() => !isSaved && onSave(lead as Lead)} disabled={isSaved}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isSaved ? 'bg-emerald-500/20 text-emerald-400 cursor-default' : 'bg-gray-800 hover:bg-gray-700 text-gray-400'}`}>
                        {isSaved ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />}
                        {isSaved ? 'Saved' : 'Save'}
                      </button>
                    )}

                    {showDeleteButton && onDelete && (
                      <button onClick={() => onDelete(lead.id)}
                        className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs font-medium transition-colors">
                        Remove
                      </button>
                    )}

                    {(score || enrichedData || showPipelineControls) && (
                      <button onClick={() => setExpandedId(isExpanded ? null : lead.id)}
                        className="text-gray-400 hover:text-white transition-colors p-1">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-800 px-5 py-4 bg-gray-950/50 space-y-4">
                  {score && (
                    <div>
                      <p className="text-xs text-gray-400 font-medium mb-1">AI Analysis</p>
                      <p className="text-sm text-gray-300 leading-relaxed">{score.reason}</p>
                      {score.talking_points?.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-400 font-medium mb-1.5">Talking Points</p>
                          <ul className="space-y-1">
                            {score.talking_points.map((pt: string, i: number) => (
                              <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                                <span className="text-emerald-500 mt-0.5">•</span>{pt}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {enrichedData && enrichedData.emails.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 font-medium mb-1.5">Enriched Contacts</p>
                      <div className="flex flex-wrap gap-2">
                        {enrichedData.emails.map((e) => (
                          <a key={e} href={`mailto:${e}`} className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-md text-xs hover:bg-emerald-500/20 transition-colors">
                            <AtSign className="w-3 h-3" />{e}
                          </a>
                        ))}
                        {enrichedData.phones.map((p) => (
                          <a key={p} href={`tel:${p}`} className="flex items-center gap-1 px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-md text-xs hover:bg-blue-500/20 transition-colors">
                            <Phone className="w-3 h-3" />{p}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {showPipelineControls && (
                    <div>
                      <p className="text-xs text-gray-400 font-medium mb-1.5">Notes</p>
                      {editingNotes === lead.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={noteDraft}
                            onChange={(e) => setNoteDraft(e.target.value)}
                            rows={3}
                            className="w-full bg-gray-800 border border-gray-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                            placeholder="Add notes about this lead..."
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => { onNotesChange?.(lead.id, noteDraft); setEditingNotes(null); }}
                              className="px-3 py-1 bg-emerald-500 text-white text-xs rounded-md font-medium"
                            >Save</button>
                            <button onClick={() => setEditingNotes(null)} className="px-3 py-1 bg-gray-700 text-gray-300 text-xs rounded-md">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setNoteDraft(savedLead.notes || ''); setEditingNotes(lead.id); }}
                          className="text-xs text-gray-400 hover:text-white transition-colors"
                        >
                          {savedLead.notes ? savedLead.notes : '+ Add note'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
