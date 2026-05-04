'use client';

import { useState } from 'react';
import { Search, MapPin, Building2, Loader2 } from 'lucide-react';

interface SearchFormProps {
  onSearch: (query: string, location: string, maxResults: number) => void;
  loading: boolean;
}

const INDUSTRIES = [
  'restaurants',
  'law firms',
  'dental offices',
  'real estate agencies',
  'accounting firms',
  'gyms and fitness',
  'auto repair shops',
  'plumbers',
  'marketing agencies',
  'IT services',
  'construction companies',
  'medical clinics',
  'hotels',
  'retail stores',
  'financial advisors',
];

export default function SearchForm({ onSearch, loading }: SearchFormProps) {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [maxResults, setMaxResults] = useState(20);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && location.trim()) {
      onSearch(query.trim(), location.trim(), maxResults);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-3 h-3" /> Industry / Business Type
          </label>
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. law firms, dental offices"
              list="industry-suggestions"
              className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              required
            />
            <datalist id="industry-suggestions">
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-3 h-3" /> Location
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. New York, NY or Chicago"
            className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            required
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-gray-400">Results:</label>
          {[10, 15, 20].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setMaxResults(n)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                maxResults === n
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={loading || !query.trim() || !location.trim()}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-lg transition-all text-sm"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Find Leads
            </>
          )}
        </button>
      </div>
    </form>
  );
}
