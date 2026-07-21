import React, { useState } from 'react';
import type { EmailLog } from '../types.ts';
import { Mail, User, Clock, Search, Filter } from 'lucide-react';

interface EmailSimulatorProps {
  emailLogs: EmailLog[];
}

export const EmailSimulator: React.FC<EmailSimulatorProps> = ({ emailLogs }) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');

  // Filter logic
  const filteredLogs = emailLogs.filter(log => {
    const matchesSearch = 
      log.recipient.toLowerCase().includes(search.toLowerCase()) || 
      log.subject.toLowerCase().includes(search.toLowerCase()) || 
      log.body.toLowerCase().includes(search.toLowerCase());
      
    if (!matchesSearch) return false;
    
    if (filterType === 'All') return true;
    if (filterType === 'Lead Submitted') {
      return log.subject.includes('Submission Acknowledgment') || log.subject.includes('ACTION REQUIRED');
    }
    if (filterType === 'Status Changed') {
      return log.subject.includes('Progression Alert') || log.subject.includes('moved to');
    }
    if (filterType === 'Validated') {
      return log.subject.includes('Validated');
    }
    if (filterType === 'Rejected') {
      return log.subject.includes('Closed - Not Valid');
    }
    return true;
  });

  // Parses email body paragraph into a structured list of labeled rows
  const parseEmailBody = (body: string) => {
    const lines = body.split('\n');
    const structuredLines: { label: string; value: string }[] = [];
    let greeting = '';
    let signature = '';

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Extract greeting (Dear Name)
      if (trimmed.startsWith('Dear ')) {
        greeting = trimmed;
        return;
      }

      // Extract signature
      if (trimmed.startsWith('Best regards,') || trimmed.startsWith('IMPACT Portal') || trimmed.startsWith('IMPACT Integration')) {
        signature += (signature ? ' ' : '') + trimmed;
        return;
      }

      // Extract key-value lines
      if (trimmed.startsWith('-') || trimmed.includes(':')) {
        const cleanLine = trimmed.replace(/^-\s*/, '');
        const colonIndex = cleanLine.indexOf(':');
        if (colonIndex > 0) {
          const label = cleanLine.substring(0, colonIndex).trim();
          const value = cleanLine.substring(colonIndex + 1).trim();
          structuredLines.push({ label, value });
          return;
        }
      }
    });

    return { greeting, structuredLines, signature };
  };

  return (
    <div className="w-full">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-brand-navy tracking-tight">Email Notification Log</h1>
        <p className="text-xs text-slate-500 mt-1">
          Automated emails sent to contributors and managers on lead status changes.
        </p>
      </div>

      {/* Search & Filter Top Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="relative flex-1">
          <input 
            type="text"
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-brand-navy placeholder:text-slate-400"
            placeholder="Search by recipient name or Intelligence ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        <div className="relative w-full sm:w-56">
          <select
            className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-brand-navy bg-white appearance-none cursor-pointer text-slate-700 font-bold"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="All">All Types</option>
            <option value="Lead Submitted">Lead Submitted</option>
            <option value="Status Changed">Status Changed</option>
            <option value="Validated">Validated</option>
            <option value="Rejected">Rejected</option>
          </select>
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
        </div>
      </div>

      {/* Outbox Listing Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col gap-5">
        <h2 className="text-sm font-extrabold text-brand-navy flex items-center gap-2 uppercase tracking-wider border-b border-slate-50 pb-4">
          <Mail size={18} className="text-brand-red" />
          Sent Email History
          <span className="ml-1.5 px-2 py-0.5 rounded-full bg-red-50 text-brand-red text-xs font-black border border-red-100">
            {filteredLogs.length}
          </span>
        </h2>

        {/* Email Cards Stack */}
        <div className="flex flex-col gap-4">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-16 px-4 text-slate-400 text-xs font-semibold">
              No simulated emails match the search query or status filter.
            </div>
          ) : (
            filteredLogs.slice().reverse().map(log => {
              const { greeting, structuredLines, signature } = parseEmailBody(log.body);
              return (
                <div 
                  key={log.id} 
                  className="bg-white rounded-xl border border-slate-100 border-l-4 border-brand-red p-5 shadow-sm flex flex-col gap-3.5 hover:border-l-[#a10e20] transition-colors"
                >
                  {/* Top Row Meta */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-50 pb-3">
                    <div className="flex items-center gap-1.5 font-bold text-slate-700">
                      <User size={13} className="text-slate-400" />
                      <span>Sent To: <strong className="text-slate-800 font-extrabold">{log.recipient}</strong></span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-[11px] text-slate-400 font-semibold">
                        <Clock size={12} className="text-slate-300" />
                        <span>Time Sent: {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                      </div>
                      
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700">
                        ✅ Delivered
                      </span>
                    </div>
                  </div>

                  {/* Subject Line */}
                  <div className="font-extrabold text-xs text-slate-800 tracking-tight">
                    Subject: {log.subject}
                  </div>

                  {/* Structured Body rendering */}
                  <div className="flex flex-col gap-3">
                    {greeting && (
                      <div className="text-xs font-semibold text-slate-500 italic">
                        {greeting}
                      </div>
                    )}

                    {structuredLines.length > 0 ? (
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col gap-2 font-mono text-[10px] text-slate-600">
                        {structuredLines.map((line, i) => (
                          <div key={i} className="flex justify-between border-b border-slate-100/50 pb-1.5 last:border-none last:pb-0">
                            <span className="text-slate-400 font-bold uppercase tracking-wider">{line.label}:</span>
                            <span className="text-slate-700 font-extrabold text-right">{line.value}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      // Fallback paragraph render if no key-value formatting matched
                      <div className="text-xs font-mono p-3 bg-slate-50 border border-slate-100 rounded-lg text-slate-600 whitespace-pre-wrap leading-relaxed">
                        {log.body}
                      </div>
                    )}

                    {signature && (
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {signature}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
