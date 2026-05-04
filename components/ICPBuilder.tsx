'use client';

import { useState, useEffect } from 'react';
import { Target, ChevronDown, ChevronUp, Save } from 'lucide-react';

interface ICPBuilderProps {
  onChange: (criteria: string) => void;
}

const ICP_TEMPLATES = [
  { label: 'SMB Service Business', value: 'Small to mid-size service business with 5-50 employees, B2B focus, local market, likely under-digitized and open to automation tools' },
  { label: 'Professional Services', value: 'Professional services firm (legal, accounting, consulting) with 10-100 employees, established client base, looking to scale or improve operations' },
  { label: 'Healthcare / Dental', value: 'Healthcare or dental practice with multiple practitioners, local or regional, needs patient acquisition and operational efficiency' },
  { label: 'Home Services', value: 'Home services contractor (plumbing, HVAC, electrical) with 5-30 employees, local market, recurring revenue potential' },
];

export default function ICPBuilder({ onChange }: ICPBuilderProps) {
  const [open, setOpen] = useState(false);
  const [criteria, setCriteria] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('icp_criteria');
    if (stored) { setCriteria(stored); onChange(stored); }
  }, []);

  const save = () => {
    localStorage.setItem('icp_criteria', criteria);
    onChange(criteria);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const applyTemplate = (val: string) => {
    setCriteria(val);
    onChange(val);
    localStorage.setItem('icp_criteria', val);
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-orange-500/20 rounded-lg flex items-center justify-center">
            <Target className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div>
            <span className="text-sm font-semibold text-white">Ideal Customer Profile (ICP)</span>
            <span className="text-xs text-gray-400 ml-2">
              {criteria ? '✓ Configured — AI scoring uses your ICP' : 'Optional — improves AI scoring accuracy'}
            </span>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {open && (
        <div className="border-t border-gray-800 p-4 space-y-4">
          <div>
            <p className="text-xs text-gray-400 mb-2">Quick templates:</p>
            <div className="flex flex-wrap gap-2">
              {ICP_TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  onClick={() => applyTemplate(t.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${criteria === t.value ? 'border-orange-500/50 bg-orange-500/10 text-orange-400' : 'border-gray-700 bg-gray-800 text-gray-300 hover:text-white'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1.5">Or describe your ideal customer:</label>
            <textarea
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              rows={3}
              placeholder="e.g. B2B service businesses with 10-50 employees, established for 3+ years, local market focus, likely underserved by technology..."
              className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
            />
          </div>

          <button
            onClick={save}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-lg text-sm font-medium transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            {saved ? 'Saved!' : 'Save ICP'}
          </button>
        </div>
      )}
    </div>
  );
}
