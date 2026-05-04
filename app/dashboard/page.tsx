'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, RefreshCw, LayoutDashboard, FileSpreadsheet, Kanban, List, Upload, ChevronDown } from 'lucide-react';
import { SavedLead, PIPELINE_STATUSES, STATUS_COLORS, PipelineStatus } from '@/lib/types';
import LeadsTable from '@/components/LeadsTable';
import KanbanBoard from '@/components/KanbanBoard';
import InsightsCard from '@/components/InsightsCard';
import Papa from 'papaparse';

export default function DashboardPage() {
  const [leads, setLeads] = useState<SavedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [industryFilter, setIndustryFilter] = useState<string>('All');
  const [tierFilter, setTierFilter] = useState<string>('All');
  const [hasEmailFilter, setHasEmailFilter] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [crmDropdownOpen, setCrmDropdownOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const crmDropdownRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leads');
      const data = await res.json();
      setLeads(data.leads || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeads(); }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (crmDropdownRef.current && !crmDropdownRef.current.contains(e.target as Node)) {
        setCrmDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleDelete = async (id: string) => {
    await fetch('/api/leads', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setLeads((prev) => prev.filter((l) => l.id !== id));
  };

  const handleStatusChange = async (id: string, status: string) => {
    await fetch('/api/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, status: status as SavedLead['status'] } : l));
  };

  const handleNotesChange = async (id: string, notes: string) => {
    await fetch('/api/leads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, notes }),
    });
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, notes } : l));
  };

  const handleScoreComplete = (id: string, score: number, fitLevel: string, reason: string) => {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, ai_score: score, ai_fit_level: fitLevel, ai_score_reason: reason } : l
      )
    );
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/import', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) {
        setImportResult(`Error: ${data.error}`);
      } else {
        setImportResult(`Imported ${data.imported} leads successfully`);
        fetchLeads();
      }
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  const exportCSV = () => {
    if (leads.length === 0) return;
    const csv = Papa.unparse(
      leads.map((l) => ({
        Company: l.company_name,
        Address: l.address,
        Phone: l.phone,
        Website: l.website,
        Industry: l.industry,
        Rating: l.rating,
        Reviews: l.review_count,
        Status: l.status,
        'AI Score': l.ai_score ?? '',
        'Fit Level': l.ai_fit_level ?? '',
        'AI Reason': l.ai_score_reason ?? '',
        'Enriched Email': l.enriched_email ?? '',
        Notes: l.notes ?? '',
        'Maps URL': l.maps_url,
        'Saved At': l.saved_at,
      }))
    );
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pipeline-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCRM = async (format: 'salesforce' | 'hubspot' | 'crm-generic') => {
    if (leads.length === 0) return;
    setExporting(true);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, leadIds: leads.map(l => l.id) }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-export-${format}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const industries = ['All', ...Array.from(new Set(leads.map((l) => l.industry).filter(Boolean))).sort()];

  const filtered = leads.filter((l) => {
    const matchesText =
      !filter ||
      l.company_name.toLowerCase().includes(filter.toLowerCase()) ||
      l.industry.toLowerCase().includes(filter.toLowerCase()) ||
      l.address.toLowerCase().includes(filter.toLowerCase());
    const matchesStatus = statusFilter === 'All' || l.status === statusFilter;
    const matchesIndustry = industryFilter === 'All' || l.industry === industryFilter;
    const matchesTier = tierFilter === 'All' || l.lead_tier === tierFilter;
    const matchesEmail = !hasEmailFilter || !!l.enriched_email;
    return matchesText && matchesStatus && matchesIndustry && matchesTier && matchesEmail;
  });

  const scored = leads.filter((l) => l.ai_score != null);
  const avgScore =
    scored.length > 0
      ? (scored.reduce((acc, l) => acc + (l.ai_score ?? 0), 0) / scored.length).toFixed(1)
      : '—';

  const pipelineCounts = PIPELINE_STATUSES.reduce((acc, s) => {
    acc[s] = leads.filter((l) => l.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <LayoutDashboard className="w-7 h-7 text-emerald-400" />
            Lead Pipeline
          </h1>
          <p className="text-gray-400">Track, manage, and export your saved leads</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {/* View toggle */}
          <div className="flex items-center bg-gray-800 rounded-lg p-1 gap-1">
            <button onClick={() => setViewMode('list')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'list' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>
              <List className="w-4 h-4" />List
            </button>
            <button onClick={() => setViewMode('kanban')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'kanban' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}>
              <Kanban className="w-4 h-4" />Kanban
            </button>
          </div>

          <button onClick={fetchLeads} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors">
            <RefreshCw className="w-4 h-4" />Refresh
          </button>

          {/* Import */}
          <input ref={importInputRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          <button onClick={() => importInputRef.current?.click()} disabled={importing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 rounded-lg text-sm font-medium transition-colors">
            <Upload className="w-4 h-4" />{importing ? 'Importing...' : 'Import CSV'}
          </button>

          <button onClick={exportCSV} disabled={leads.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition-colors">
            <Download className="w-4 h-4" />CSV
          </button>

          {/* CRM Export — click-based dropdown */}
          <div className="relative" ref={crmDropdownRef}>
            <button
              onClick={() => setCrmDropdownOpen(!crmDropdownOpen)}
              disabled={leads.length === 0 || exporting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition-colors">
              <FileSpreadsheet className="w-4 h-4" />CRM Export<ChevronDown className="w-3.5 h-3.5" />
            </button>
            {crmDropdownOpen && (
              <div className="absolute right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 min-w-max">
                <button onClick={() => { exportCRM('salesforce'); setCrmDropdownOpen(false); }} className="block w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 rounded-t-lg">
                  Salesforce Format
                </button>
                <button onClick={() => { exportCRM('hubspot'); setCrmDropdownOpen(false); }} className="block w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700">
                  HubSpot Format
                </button>
                <button onClick={() => { exportCRM('crm-generic'); setCrmDropdownOpen(false); }} className="block w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 rounded-b-lg">
                  Generic CRM Format
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pipeline overview */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {PIPELINE_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(statusFilter === s ? 'All' : s)}
            className={`rounded-xl p-3 text-left border transition-colors ${statusFilter === s ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-gray-800 bg-gray-900 hover:border-gray-700'}`}
          >
            <p className="text-xl font-bold text-white">{pipelineCounts[s]}</p>
            <p className={`text-xs font-medium mt-0.5 ${STATUS_COLORS[s as PipelineStatus].split(' ')[1]}`}>{s}</p>
          </button>
        ))}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Saved', value: leads.length },
          { label: 'AI Scored', value: scored.length },
          { label: 'Avg AI Score', value: avgScore },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Import result toast */}
      {importResult && (
        <div className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium ${importResult.startsWith('Error') ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
          {importResult}
          <button onClick={() => setImportResult(null)} className="ml-4 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Insights */}
      <InsightsCard />

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex gap-3">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by company, industry, or location..."
            className="flex-1 bg-gray-900 border border-gray-800 text-white placeholder-gray-500 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
            className="bg-gray-900 border border-gray-800 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {industries.map((ind) => (
              <option key={ind} value={ind} className="bg-gray-900">{ind === 'All' ? 'All Industries' : ind}</option>
            ))}
          </select>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="bg-gray-900 border border-gray-800 text-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="All">All Tiers</option>
            <option value="Hot">🔥 Hot</option>
            <option value="Warm">🌡️ Warm</option>
            <option value="Cold">❄️ Cold</option>
          </select>
          <button
            onClick={() => setHasEmailFilter(!hasEmailFilter)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${hasEmailFilter ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'}`}
          >
            @ Has Email
          </button>
          {(statusFilter !== 'All' || industryFilter !== 'All' || tierFilter !== 'All' || hasEmailFilter || filter) && (
            <button
              onClick={() => { setStatusFilter('All'); setIndustryFilter('All'); setTierFilter('All'); setHasEmailFilter(false); setFilter(''); }}
              className="px-3 py-2 bg-gray-800 text-gray-400 hover:text-white rounded-lg text-sm transition-colors"
            >
              Clear all
            </button>
          )}
          <span className="text-xs text-gray-500 ml-auto">{filtered.length} of {leads.length} leads</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading pipeline...</div>
      ) : leads.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-gray-500 text-lg">No saved leads yet</p>
          <p className="text-gray-600 text-sm">Search for leads and click &quot;Save&quot; to add them here, or import a CSV above</p>
        </div>
      ) : viewMode === 'kanban' ? (
        <KanbanBoard
          leads={filtered}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      ) : (
        <LeadsTable
          leads={filtered}
          onDelete={handleDelete}
          onStatusChange={handleStatusChange}
          onNotesChange={handleNotesChange}
          onScoreComplete={handleScoreComplete}
          showSaveButton={false}
          showDeleteButton
          showPipelineControls
        />
      )}
    </div>
  );
}
