'use client';

import { SavedLead, PIPELINE_STATUSES, STATUS_COLORS, PipelineStatus } from '@/lib/types';
import ScoreBadge from './ScoreBadge';
import { Phone, Globe, AtSign, Star, Trash2, ChevronRight } from 'lucide-react';

interface KanbanBoardProps {
  leads: SavedLead[];
  onStatusChange?: (id: string, status: string) => void;
  onDelete?: (id: string) => void;
}

const COLUMN_ACCENT: Record<PipelineStatus, string> = {
  New: 'border-t-gray-500',
  Contacted: 'border-t-blue-500',
  Qualified: 'border-t-emerald-500',
  Closed: 'border-t-purple-500',
  'Not Interested': 'border-t-red-500',
};

const NEXT_STATUS: Record<PipelineStatus, PipelineStatus | null> = {
  New: 'Contacted',
  Contacted: 'Qualified',
  Qualified: 'Closed',
  Closed: null,
  'Not Interested': null,
};

export default function KanbanBoard({ leads, onStatusChange, onDelete }: KanbanBoardProps) {
  const columns = PIPELINE_STATUSES.map((status) => ({
    status: status as PipelineStatus,
    leads: leads.filter((l) => (l.status || 'New') === status),
  }));

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 min-h-[400px]">
      {columns.map(({ status, leads: colLeads }) => {
        const textColor = STATUS_COLORS[status].split(' ')[1];
        const next = NEXT_STATUS[status];
        return (
          <div key={status} className="flex-shrink-0 w-64">
            <div className={`bg-gray-900 border border-gray-800 border-t-2 ${COLUMN_ACCENT[status]} rounded-xl p-3`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-semibold ${textColor}`}>{status}</h3>
                <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full font-medium">{colLeads.length}</span>
              </div>

              <div className="space-y-2">
                {colLeads.map((lead) => (
                  <div key={lead.id} className="bg-gray-950 border border-gray-800 rounded-lg p-3 hover:border-gray-700 transition-colors group">
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <p className="text-sm font-medium text-white leading-tight line-clamp-2">{lead.company_name}</p>
                      {lead.ai_score && (
                        <ScoreBadge score={lead.ai_score} fitLevel={lead.ai_fit_level || ''} size="sm" />
                      )}
                    </div>

                    {lead.industry && (
                      <p className="text-xs text-gray-500 capitalize mb-2">{lead.industry}</p>
                    )}

                    <div className="space-y-1 text-xs text-gray-500">
                      {lead.phone && (
                        <a href={`tel:${lead.phone}`} className="flex items-center gap-1 hover:text-gray-300 transition-colors">
                          <Phone className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{lead.phone}</span>
                        </a>
                      )}
                      {lead.website && (
                        <a href={lead.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-blue-400 transition-colors">
                          <Globe className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{lead.website.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</span>
                        </a>
                      )}
                      {lead.enriched_email && (
                        <a href={`mailto:${lead.enriched_email}`} className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors">
                          <AtSign className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{lead.enriched_email}</span>
                        </a>
                      )}
                    </div>

                    {lead.lead_tier && (
                      <div className={`mt-2 inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                        lead.lead_tier === 'Hot' ? 'bg-red-500/20 text-red-400' :
                        lead.lead_tier === 'Warm' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {lead.lead_tier === 'Hot' ? '' : lead.lead_tier === 'Warm' ? '' : ''} {lead.lead_tier}
                      </div>
                    )}

                    {lead.rating > 0 && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-yellow-400">
                        <Star className="w-3 h-3 fill-current" />
                        {lead.rating.toFixed(1)}
                        <span className="text-gray-600">({lead.review_count})</span>
                      </div>
                    )}

                    <div className="mt-2 pt-2 border-t border-gray-800 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {next && (
                        <button
                          onClick={() => onStatusChange?.(lead.id, next)}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded transition-colors flex-1"
                        >
                          <ChevronRight className="w-3 h-3" />
                          {next}
                        </button>
                      )}
                      <select
                        value={lead.status || 'New'}
                        onChange={(e) => onStatusChange?.(lead.id, e.target.value)}
                        className="text-xs bg-gray-800 text-gray-400 border-0 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                      >
                        {PIPELINE_STATUSES.map((s) => (
                          <option key={s} value={s} className="bg-gray-900">{s}</option>
                        ))}
                      </select>
                      {onDelete && (
                        <button
                          onClick={() => onDelete(lead.id)}
                          className="p-1 text-gray-600 hover:text-red-400 transition-colors rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {colLeads.length === 0 && (
                  <div className="text-center py-8 text-gray-700 text-xs border border-dashed border-gray-800 rounded-lg">
                    No leads
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
