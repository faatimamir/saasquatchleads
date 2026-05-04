'use client';

import { useState } from 'react';
import { X, Mail, Loader2, Copy, CheckCheck } from 'lucide-react';
import { Lead, SavedLead } from '@/lib/types';

interface EmailModalProps {
  lead: Lead | SavedLead;
  onClose: () => void;
}

export default function EmailModal({ lead, onClose }: EmailModalProps) {
  const [senderName, setSenderName] = useState('');
  const [senderCompany, setSenderCompany] = useState('');
  const [valueProp, setValueProp] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState<{ subject: string; body: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const generateEmail = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead,
          senderName,
          senderCompany,
          value_prop: valueProp,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setEmail(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!email) return;
    navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Mail className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold">AI Email Generator</h2>
              <p className="text-gray-400 text-xs">{lead.company_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!email ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Your Name</label>
                  <input
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Alex Johnson"
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Your Company</label>
                  <input
                    value={senderCompany}
                    onChange={(e) => setSenderCompany(e.target.value)}
                    placeholder="Acme Corp"
                    className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Value Proposition</label>
                <textarea
                  value={valueProp}
                  onChange={(e) => setValueProp(e.target.value)}
                  placeholder="e.g. We help service businesses automate their lead follow-up, saving 10+ hours/week"
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
              )}

              <button
                onClick={generateEmail}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-500 hover:bg-blue-400 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-lg transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating email...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Generate Email
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                <div className="border-b border-gray-700 pb-3">
                  <span className="text-xs text-gray-400">Subject</span>
                  <p className="text-white font-medium mt-1">{email.subject}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-400">Body</span>
                  <p className="text-gray-200 text-sm mt-1 whitespace-pre-wrap leading-relaxed">
                    {email.body}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={copyToClipboard}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  {copied ? (
                    <><CheckCheck className="w-4 h-4 text-emerald-400" /> Copied!</>
                  ) : (
                    <><Copy className="w-4 h-4" /> Copy Email</>
                  )}
                </button>
                <button
                  onClick={() => setEmail(null)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors text-sm font-medium"
                >
                  Regenerate
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
