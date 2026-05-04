'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, MapPin, Building2, Loader2 } from 'lucide-react';

interface SearchFormProps {
  onSearch: (query: string, location: string, maxResults: number) => void;
  loading: boolean;
}

interface LocationSuggestion {
  display_name: string;
  place_id: string;
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
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchSuggestions = (value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&limit=6&addressdetails=1&featuretype=city`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        // Prefer city/town/state/county results and format cleanly
        const seen = new Set<string>();
        const filtered: LocationSuggestion[] = [];
        for (const item of data) {
          const addr = item.address || {};
          const city = addr.city || addr.town || addr.village || addr.county || addr.state_district || '';
          const state = addr.state || '';
          const country = addr.country_code?.toUpperCase() || '';
          const label = [city, state, country].filter(Boolean).join(', ') || item.display_name.split(',').slice(0, 2).join(',').trim();
          if (!seen.has(label)) {
            seen.add(label);
            filtered.push({ display_name: label, place_id: item.place_id });
          }
          if (filtered.length >= 5) break;
        }
        setSuggestions(filtered);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 300);
  };

  const handleLocationChange = (value: string) => {
    setLocation(value);
    fetchSuggestions(value);
    setShowSuggestions(true);
  };

  const selectSuggestion = (suggestion: LocationSuggestion) => {
    setLocation(suggestion.display_name);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
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

        <div className="space-y-1.5" ref={wrapperRef}>
          <label className="text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <MapPin className="w-3 h-3" /> Location
          </label>
          <div className="relative">
            <input
              type="text"
              value={location}
              onChange={(e) => handleLocationChange(e.target.value)}
              onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
              placeholder="e.g. New York, NY or Chicago"
              className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              required
              autoComplete="off"
            />
            {loadingSuggestions && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
              </div>
            )}
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute z-30 left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
                {suggestions.map((s) => (
                  <li key={s.place_id}>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-2 transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                      {s.display_name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
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
