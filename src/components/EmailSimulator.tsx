import React, { useState, useEffect } from 'react';
import type { EmailLog } from '../types.ts';
import { Mail, User, Clock, Search, Filter, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, ChevronLeft, ChevronRight } from 'lucide-react';

interface EmailSimulatorProps {
  emailLogs: EmailLog[];
}

export const EmailSimulator: React.FC<EmailSimulatorProps> = ({ emailLogs }) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(4);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterType, itemsPerPage]);

  // Filter logic
  const filteredLogs = emailLogs.filter(log => {
    const matchesSearch = 
      log.recipient.toLowerCase().includes(search.toLowerCase()) || 
      log.subject.toLowerCase().includes(search.toLowerCase()) || 
      log.body.toLowerCase().includes(search.toLowerCase());
      
    if (!matchesSearch) return false;
    
    if (filterType === 'All') return true;
    if (filterType === 'Lead Submitted') {
      return log.subject.includes('Received') || log.subject.includes('Submitted');
    }
    if (filterType === 'Status Changed') {
      return log.subject.includes('Progress') || log.subject.includes('Moved to') || log.subject.includes('Stage');
    }
    if (filterType === 'Validated') {
      return log.subject.includes('Validated') || log.subject.includes('Approved');
    }
    if (filterType === 'Rejected') {
      return log.subject.includes('Closed') || log.subject.includes('Rejected');
    }
    return true;
  });

  // Pagination calculation
  const totalItems = filteredLogs.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  // Determines badge style based on email subject
  const getBadgeStyle = (subject: string) => {
    if (subject.includes('Validated') || subject.includes('Approved')) {
      return { label: 'Validated & CRM Synced', bg: 'bg-emerald-500/10 text-emerald-600 border-emerald-200', icon: ShieldCheck };
    }
    if (subject.includes('Progress') || subject.includes('Moved')) {
      return { label: 'CRM Stage Progression', bg: 'bg-blue-500/10 text-blue-600 border-blue-200', icon: ArrowRight };
    }
    if (subject.includes('Closed') || subject.includes('Rejected')) {
      return { label: 'Lead Closed', bg: 'bg-rose-500/10 text-rose-600 border-rose-200', icon: AlertCircle };
    }
    if (subject.includes('Clarification') || subject.includes('Needed')) {
      return { label: 'Clarification Needed', bg: 'bg-amber-500/10 text-amber-600 border-amber-200', icon: AlertCircle };
    }
    return { label: 'Submission Receipt', bg: 'bg-slate-500/10 text-slate-600 border-slate-200', icon: CheckCircle2 };
  };

  return (
    <div className="w-full">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-brand-navy tracking-tight flex items-center gap-2">
          <Mail className="text-brand-red" size={24} />
          Outbox Notification Logs
        </h1>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          Real-time log of automated corporate email notifications sent to submitters and stakeholders.
        </p>
      </div>

      {/* Search & Filter Top Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <input 
            type="text"
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-brand-navy placeholder:text-slate-400 font-medium"
            placeholder="Search by recipient email, subject, or Intelligence ID..."
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
            <option value="All">All Email Types</option>
            <option value="Lead Submitted">Submission Receipts</option>
            <option value="Validated">Validated & Approved</option>
            <option value="Status Changed">CRM Stage Updates</option>
            <option value="Rejected">Closed / Rejected</option>
          </select>
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
        </div>
      </div>

      {/* Outbox Listing Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <h2 className="text-sm font-extrabold text-brand-navy flex items-center gap-2 uppercase tracking-wider">
            <span>Sent Email Notifications</span>
            <span className="ml-1.5 px-2.5 py-0.5 rounded-full bg-red-50 text-brand-red text-xs font-black border border-red-100">
              {totalItems}
            </span>
          </h2>

          {/* Items Per Page Selector */}
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
            <span>Show per page:</span>
            <select
              className="px-2 py-1 border border-slate-200 rounded-md bg-white text-xs font-bold text-slate-700 focus:outline-none focus:border-brand-navy cursor-pointer"
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
            >
              <option value={4}>4 emails</option>
              <option value={8}>8 emails</option>
              <option value={12}>12 emails</option>
              <option value={20}>20 emails</option>
            </select>
          </div>
        </div>

        {/* Email Cards List */}
        <div className="flex flex-col gap-4">
          {paginatedLogs.length === 0 ? (
            <div className="text-center py-16 px-4 text-slate-400 text-xs font-semibold">
              No email notification logs match your search.
            </div>
          ) : (
            paginatedLogs.map(log => {
              const badge = getBadgeStyle(log.subject);
              const BadgeIcon = badge.icon;

              return (
                <div 
                  key={log.id} 
                  className="bg-slate-50/50 hover:bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm transition-all flex flex-col gap-3.5 hover:shadow-md"
                >
                  {/* Top Bar Meta */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-200/60 pb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold border flex items-center gap-1.5 ${badge.bg}`}>
                        <BadgeIcon size={12} />
                        {badge.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                        <Clock size={13} className="text-slate-400" />
                        <span>{new Date(log.timestamp).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })} at {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                      </div>
                      
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 size={11} /> Delivered
                      </span>
                    </div>
                  </div>

                  {/* Recipient Row */}
                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200/80">
                    <User size={14} className="text-slate-400 flex-shrink-0" />
                    <span className="font-bold text-slate-500">To:</span>
                    <span className="font-extrabold text-slate-800 break-all">{log.recipient}</span>
                  </div>

                  {/* Subject Line */}
                  <div className="text-sm font-extrabold text-brand-navy tracking-tight">
                    {log.subject}
                  </div>

                  {/* Email Body Card */}
                  <div className="bg-white border border-slate-200/80 rounded-xl p-4 text-xs text-slate-700 font-medium whitespace-pre-wrap leading-relaxed shadow-inner">
                    {log.body}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Footer Controls */}
        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 text-xs font-medium text-slate-500">
            <div>
              Showing <span className="font-bold text-slate-800">{startIndex + 1}</span> to{' '}
              <span className="font-bold text-slate-800">{endIndex}</span> of{' '}
              <span className="font-bold text-slate-800">{totalItems}</span> emails
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={validCurrentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-bold transition-colors cursor-pointer"
              >
                <ChevronLeft size={14} /> Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      pageNum === validCurrentPage
                        ? 'bg-brand-navy text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={validCurrentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 font-bold transition-colors cursor-pointer"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


