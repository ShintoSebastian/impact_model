import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { EmailLog } from '../types.ts';
import { 
  Mail, User, Clock, Search, Filter, CheckCircle2, AlertCircle, ArrowRight, 
  ShieldCheck, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, FileText, 
  Building2, Calendar, Sparkles
} from 'lucide-react';

interface EmailSimulatorProps {
  emailLogs: EmailLog[];
}

export const EmailSimulator: React.FC<EmailSimulatorProps> = ({ emailLogs }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(4);
  const [expandedEmails, setExpandedEmails] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedEmails(prev => ({ ...prev, [id]: !prev[id] }));
  };

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
    if (filterType === 'Reviewer Mailer') {
      return log.type === 'Reviewer Mailer' || log.subject.includes('Action Required: Review Opportunity');
    }
    if (filterType === 'Submitter Mailer') {
      return log.type === 'Submitter Mailer' || log.subject.includes('[IMPACT] Opportunity Update');
    }
    if (filterType === 'Lead Submitted') {
      return log.subject.includes('Received') || log.subject.includes('Submitted') || log.type === 'Reviewer Mailer';
    }
    if (filterType === 'Status Changed') {
      return log.subject.includes('Progress') || log.subject.includes('Moved to') || log.subject.includes('Stage') || log.type === 'Submitter Mailer';
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

  // Determines badge style based on email type or subject (muted neutral style)
  const getBadgeStyle = (log: EmailLog) => {
    if (log.type === 'Reviewer Mailer' || log.subject.includes('Action Required: Review Opportunity')) {
      return { label: 'Reviewer Mailer' };
    }
    if (log.type === 'Submitter Mailer' || log.subject.includes('[IMPACT] Opportunity Update')) {
      return { label: 'Submitter Mailer' };
    }
    if (log.subject.includes('Validated') || log.subject.includes('Approved')) {
      return { label: 'Validated & CRM Synced' };
    }
    if (log.subject.includes('Progress') || log.subject.includes('Moved')) {
      return { label: 'Stage Progression' };
    }
    if (log.subject.includes('Closed') || log.subject.includes('Rejected')) {
      return { label: 'Lead Closed' };
    }
    if (log.subject.includes('Clarification') || log.subject.includes('Needed')) {
      return { label: 'Clarification Needed' };
    }
    return { label: log.type || 'Notification' };
  };

  // Determines delivery status badge styling (clean subtle dot indicator)
  const getDeliveryBadge = (status?: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'SENT_TO_SMTP' || s === 'DELIVERED') {
      return { label: s === 'SENT_TO_SMTP' ? 'Sent to SMTP' : 'Delivered', bg: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-emerald-500' };
    }
    if (s === 'FAILED') {
      return { label: 'Failed', bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' };
    }
    if (s.includes('SIMULATED')) {
      return { label: 'Simulated', bg: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-400' };
    }
    if (s === 'QUEUED') {
      return { label: 'Queued', bg: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-amber-400' };
    }
    return { label: status || 'Queued', bg: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-400' };
  };

  // Parses email body into concise key data
  const parseEmailSummary = (log: EmailLog) => {
    const body = log.body || '';
    const isReviewer = log.type === 'Reviewer Mailer' || log.subject.includes('Action Required: Review Opportunity');
    const isSubmitter = log.type === 'Submitter Mailer' || log.subject.includes('[IMPACT] Opportunity Update');

    // Extract action deep link
    const urlMatch = body.match(/https?:\/\/[^\s]+/);
    const actionUrl = urlMatch ? urlMatch[0] : null;

    if (isReviewer) {
      const clientMatch = body.match(/• Client:\s*(.+)/) || body.match(/Client:\s*(.+)/);
      const oppMatch = body.match(/• Opportunity:\s*(.+)/) || body.match(/Opportunity:\s*(.+)/);
      const dueDateMatch = body.match(/• Review due date:\s*(.+)/) || body.match(/Review due date:\s*(.+)/);

      return {
        client: clientMatch ? clientMatch[1].trim() : null,
        opportunity: oppMatch ? oppMatch[1].trim() : null,
        dueDate: dueDateMatch ? dueDateMatch[1].trim() : null,
        status: null,
        comments: null,
        actionUrl,
        actionLabel: 'Assess & Review Lead'
      };
    }

    if (isSubmitter) {
      const statusMatch = log.subject.match(/\|\s*([^|]+)$/);
      const status = statusMatch ? statusMatch[1].trim() : null;
      const clientMatch = body.match(/Client:\s*(.+)/);
      const oppMatch = body.match(/Opportunity:\s*(.+)/);
      const commentsMatch = body.match(/Status Comments:\s*\n?"?([^"\n]+)"?/);

      return {
        client: clientMatch ? clientMatch[1].trim() : null,
        opportunity: oppMatch ? oppMatch[1].trim() : null,
        dueDate: null,
        status,
        comments: commentsMatch ? commentsMatch[1].trim() : null,
        actionUrl,
        actionLabel: 'View Lead Status'
      };
    }

    return {
      client: null,
      opportunity: null,
      dueDate: null,
      status: null,
      comments: null,
      actionUrl,
      actionLabel: 'View Lead'
    };
  };

  // Helper to render text with clickable URLs that open the exact lead
  const renderBodyWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        let relativePath: string | null = null;
        let targetHref = part;

        try {
          const parsed = new URL(part);
          if (parsed.pathname.startsWith('/status/') || parsed.pathname.startsWith('/review/')) {
            relativePath = parsed.pathname;
            targetHref = `${window.location.origin}${parsed.pathname}`;
          }
        } catch {}

        return (
          <a
            key={index}
            href={targetHref}
            onClick={(e) => {
              if (relativePath) {
                e.preventDefault();
                navigate(relativePath);
              }
            }}
            className="text-blue-600 hover:text-blue-800 underline font-semibold break-all cursor-pointer inline-flex items-center gap-1"
          >
            <span>{targetHref}</span>
          </a>
        );
      }
      return part;
    });
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
            placeholder="Search by recipient email, CC, subject, or Impact ID..."
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
            <option value="Reviewer Mailer">Reviewer Mailer</option>
            <option value="Submitter Mailer">Submitter Mailer</option>
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
        <div className="flex flex-col gap-3">
          {paginatedLogs.length === 0 ? (
            <div className="text-center py-16 px-4 text-slate-400 text-xs font-semibold">
              No email notification logs match your search.
            </div>
          ) : (
            paginatedLogs.map(log => {
              const badge = getBadgeStyle(log);
              const delivery = getDeliveryBadge(log.status);
              const summary = parseEmailSummary(log);
              const impactId = log.impactId || (log.subject.match(/IM-\d+-\d+/)?.[0]);
              const isExpanded = !!expandedEmails[log.id];

              return (
                <div 
                  key={log.id} 
                  className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:border-slate-300 transition-all flex flex-col gap-2.5"
                >
                  {/* Top Bar: Impact ID, Type, Timestamp, Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      {impactId && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {impactId}
                        </span>
                      )}
                      <span className="text-[11px] font-medium text-slate-500">
                        {badge.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-slate-400">
                        {new Date(log.timestamp).toLocaleDateString([], { day: 'numeric', month: 'short' })} at {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </span>
                      
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1.5 ${delivery.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${delivery.dot}`} />
                        {delivery.label}
                      </span>
                    </div>
                  </div>

                  {/* Subject Line */}
                  <div className="text-sm font-semibold text-slate-800 tracking-tight">
                    {log.subject}
                  </div>

                  {/* Concise Key Details Row (Clean subtle slate text) */}
                  {(summary.client || summary.opportunity || summary.status || summary.dueDate) && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                      {summary.client && (
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400">Client:</span>
                          <span className="font-medium text-slate-700">{summary.client}</span>
                        </div>
                      )}
                      {summary.opportunity && (
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400">Lead:</span>
                          <span className="font-medium text-slate-700">{summary.opportunity}</span>
                        </div>
                      )}
                      {summary.status && (
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400">Stage:</span>
                          <span className="font-semibold text-slate-800">{summary.status}</span>
                        </div>
                      )}
                      {summary.dueDate && (
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400">Due:</span>
                          <span className="font-semibold text-slate-800">{summary.dueDate}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Status Comments / Remarks (Clean minimal quote line) */}
                  {summary.comments && (
                    <div className="text-xs text-slate-600 bg-slate-50 border-l-2 border-slate-300 px-2.5 py-1.5 rounded-r text-left italic">
                      &ldquo;{summary.comments}&rdquo;
                    </div>
                  )}

                  {/* Real SMTP Error Notice ONLY when delivery actually failed */}
                  {log.status === 'FAILED' && log.errorMessage && (
                    <div className="flex items-start gap-2 text-xs bg-rose-50 border border-rose-200 rounded p-2 text-rose-800">
                      <AlertCircle size={14} className="text-rose-600 flex-shrink-0 mt-0.5" />
                      <span className="text-xs font-mono text-rose-700 break-all">{log.errorMessage}</span>
                    </div>
                  )}

                  {/* Action Bar: Direct Link & Expand Full Email Toggle */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                    {summary.actionUrl ? (
                      <button
                        onClick={() => {
                          const targetUrl = summary.actionUrl;
                          if (!targetUrl) return;
                          try {
                            const parsed = new URL(targetUrl);
                            if (parsed.pathname.startsWith('/status/') || parsed.pathname.startsWith('/review/')) {
                              navigate(parsed.pathname);
                              return;
                            }
                          } catch {}
                          window.open(targetUrl, '_blank');
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-brand-navy hover:underline cursor-pointer transition-colors"
                      >
                        <span>{summary.actionLabel || 'View Details'}</span>
                        <ArrowRight size={12} />
                      </button>
                    ) : <div />}

                    <button
                      onClick={() => toggleExpand(log.id)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-700 ml-auto cursor-pointer transition-colors py-0.5 px-1.5 rounded hover:bg-slate-100"
                    >
                      <FileText size={12} className="text-slate-400" />
                      <span>{isExpanded ? 'Hide Details' : 'View Full Email'}</span>
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  </div>

                  {/* Collapsible Verbatim Email Body & Recipients */}
                  {isExpanded && (
                    <div className="mt-1 pt-2 border-t border-slate-100 flex flex-col gap-2">
                      <div className="text-[11px] text-slate-600 flex flex-col gap-1 bg-slate-50 p-2.5 rounded border border-slate-200/70 font-mono">
                        <div><strong className="font-sans text-slate-700">To:</strong> {log.recipient}</div>
                        {log.cc && <div><strong className="font-sans text-slate-700">CC:</strong> {log.cc}</div>}
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs text-slate-600 font-mono whitespace-pre-wrap leading-relaxed shadow-inner">
                        {renderBodyWithLinks(log.body)}
                      </div>
                    </div>
                  )}
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


