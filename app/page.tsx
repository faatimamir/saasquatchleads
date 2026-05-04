'use client';

import { useState } from 'react';
import { Download, TrendingUp, Users, Target, AtSign } from 'lucide-react';
import SearchForm from '@/components/SearchForm';
import LeadsTable from '@/components/LeadsTable';
import ICPBuilder from '@/components/ICPBuilder';
import { Lead } from '@/lib/types';
import Papa from 'papaparse';

export default function HomePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [lastQuery, setLastQuery] = useState('');
  const [icpCriteria, setIcpCriteria] = useState('');

  const handleSearch = async (query: string, location: string, maxResults: number) => {
    setLoading(true);
    setError('');
    setLeads([]);
    setLastQuery(`${query} in ${location}`);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, location, maxResults }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setLeads(data.leads);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (lead: Lead) => {
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      });
      setSavedIds((prev) => new Set([...prev, lead.place_id]));
    } catch { /* silent */ }
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
        'Maps URL': l.maps_url,
      }))
    );
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${lastQuery.replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const withPhone = leads.filter((l) => l.phone).length;
  const withWebsite = leads.filter((l) => l.website).length;
  const withEmail = leads.filter((l) => l.website).length; // proxy: enrichable

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-white">Find B2B Leads</h1>
        <p className="text-gray-400">Discover businesses, score them with AI, and generate personalized outreach in seconds.</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <SearchForm onSearch={handleSearch} loading={loading} />
      </div>

      <ICPBuilder onChange={setIcpCriteria} />

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">{error}</div>
      )}

      {leads.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Leads Found', value: leads.length, icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
              { label: 'With Phone', value: withPhone, icon: Target, color: 'text-blue-400', bg: 'bg-blue-500/20' },
              { label: 'With Website', value: withWebsite, icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/20' },
              { label: 'Enrichable', value: withEmail, icon: AtSign, color: 'text-orange-400', bg: 'bg-orange-500/20' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3">
                <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{value}</p>
                  <p className="text-xs text-gray-400">{label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Results for &quot;{lastQuery}&quot;
            </h2>
            <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition-colors">
              <Download className="w-4 h-4" />Export CSV
            </button>
          </div>

          <LeadsTable
            leads={leads}
            savedIds={savedIds}
            onSave={handleSave}
            showSaveButton
            icpCriteria={icpCriteria}
          />
        </>
      )}

      {!loading && leads.length === 0 && !error && (
        <div className="text-center py-20 space-y-4">
          <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto">
            <Target className="w-8 h-8 text-gray-600" />
          </div>
          <p className="text-gray-500 text-lg">Enter a business type and location to start finding leads</p>
          <p className="text-gray-600 text-sm">Powered by OpenStreetMap + Groq AI (Llama 3.3)</p>
        </div>
      )}
    </div>
  );
}
