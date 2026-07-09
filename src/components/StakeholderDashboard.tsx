import React, { useState, useEffect } from 'react';
import type { Submission, EmailLog, Employee } from '../mockData.ts';
import { triggerMailer, formatDateTime } from '../utils.ts';
import { 
  Eye, CheckCircle2, XCircle, AlertTriangle, Clock, Building, Landmark, RefreshCcw, 
  User, Database, Mail, ArrowRight, Shield, MessageSquare, Search
} from 'lucide-react';
import { ROLE_MAP } from '../mockData.ts';

interface StakeholderDashboardProps {
  submissions: Submission[];
  updateSubmission: (id: string, updatedFields: Partial<Submission>) => void;
  logEmails: (emails: EmailLog[]) => void;
  currentUserRole: string;
  loggedInUser: Employee;
  addNotification: (message: string) => void;
}

interface ToastInfo {
  type: 'success' | 'error' | 'info';
  message: string;
  reviewerName: string;
  timestamp: string;
}

export const StakeholderDashboard: React.FC<StakeholderDashboardProps> = ({ 
  submissions, 
  updateSubmission, 
  logEmails,
  currentUserRole,
  loggedInUser,
  addNotification
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  
  // Rejection sub-flow states
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Clarification sub-flow states
  const [showClarifyForm, setShowClarifyForm] = useState(false);
  const [clarifyComment, setClarifyComment] = useState('');

  // Submitter profile collapsible state
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<ToastInfo | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const triggerToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({
      type,
      message,
      reviewerName: loggedInUser?.name || 'Arun Kumar',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    });
  };

  // Helper to extract email address from hierarchical contact string (e.g. "Arun Kumar (arun.kumar@...)" -> "arun.kumar@...")
  const extractEmail = (contactStr: string): string => {
    if (!contactStr) return 'alerts@nestdigital.com';
    const match = contactStr.match(/\(([^)]+)\)/);
    return match ? match[1] : 'alerts@nestdigital.com';
  };

  // Helper to collect all stakeholder emails plus submitter email
  const getRecipientsList = (sub: Submission): string[] => {
    const employeeEmail = sub.employeeId === 'ND-10042' ? 'shinto.s@nestdigital.com' : `${sub.employeeId.toLowerCase()}@nestdigital.com`;
    return [
      employeeEmail,
      extractEmail(sub.reportingManager),
      extractEmail(sub.projectManager),
      extractEmail(sub.buHead),
      extractEmail(sub.hrbp),
      extractEmail(sub.salesPerson)
    ].filter(email => email !== '');
  };

  // SLA Working Days Calculation (older than 2 working days from baseline/today = Overdue)
  const getWorkingDaysDiff = (startDateStr: string): number => {
    const start = new Date(startDateStr);
    const end = new Date(); // current local time
    let workingDays = 0;
    const temp = new Date(start.getTime());
    while (temp < end) {
      temp.setDate(temp.getDate() + 1);
      const day = temp.getDay();
      if (day !== 0 && day !== 6) {
        workingDays++;
      }
    }
    return workingDays;
  };

  const getSlaStatus = (sub: Submission) => {
    const workingDays = getWorkingDaysDiff(sub.createdAt);
    // Force overdue status for specific seeded demo lead
    const isOverdue = workingDays > 2 || sub.intelligenceId === 'IM-20260701-001';
    const daysOverdue = workingDays > 2 ? workingDays - 2 : (sub.intelligenceId === 'IM-20260701-001' ? 1 : 0);
    return {
      isOverdue,
      daysOverdue,
      badgeText: isOverdue ? 'Overdue' : 'Within SLA',
      daysCount: workingDays
    };
  };

  // Dynamic Metrics calculations
  const pendingSubmissions = submissions.filter(s => s.status === 'Under Review' || s.status === 'Clarification Requested');
  const reviewedSubmissions = submissions.filter(s => s.status !== 'Under Review' && s.status !== 'Clarification Requested');

  const pendingCount = pendingSubmissions.length;
  const validatedCount = reviewedSubmissions.filter(s => s.status === 'Validated' || s.status.startsWith('Lead') || s.status === 'Opportunity Registered' || s.status === 'Proposal' || s.status === 'Negotiation' || s.status === 'Closed - Converted').length;
  const rejectedCount = reviewedSubmissions.filter(s => s.status === 'Closed - Not Valid' || s.status === 'Closed - Dropped' || s.status === 'Lead Dropped').length;
  const totalReviewed = validatedCount + rejectedCount;

  // Filter and sort Pending Action list
  const filteredPending = pendingSubmissions.filter(sub => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return sub.intelligenceId.toLowerCase().includes(query) ||
           sub.employeeName.toLowerCase().includes(query) ||
           sub.clientName.toLowerCase().includes(query) ||
           sub.shortDesc.toLowerCase().includes(query);
  });

  const sortedPending = [...filteredPending].sort((a, b) => {
    const slaA = getSlaStatus(a).isOverdue ? 1 : 0;
    const slaB = getSlaStatus(b).isOverdue ? 1 : 0;
    return slaB - slaA; // Overdue items sorted to top
  });

  // Filter and sort Reviewed list
  const sortedReviewed = [...reviewedSubmissions].sort((a, b) => {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  // 1. Validate decision workflow
  const handleValidate = (sub: Submission) => {
    const crmId = `CRM-LEAD-${Math.floor(10000 + Math.random() * 90000)}`;
    const updatedFields: Partial<Submission> = {
      status: 'Validated',
      crmLeadId: crmId,
      updatedAt: new Date().toISOString()
    };

    updateSubmission(sub.intelligenceId, updatedFields);
    setSelectedSub(null);

    // Auto prepending CRM logs simulation after 1.5 seconds to advance CRM stage
    setTimeout(() => {
      updateSubmission(sub.intelligenceId, {
        status: 'Lead Registered',
        updatedAt: new Date().toISOString()
      });
    }, 1500);

    // Generate Auto Outbox Log Entries for each stakeholder
    const recipients = getRecipientsList(sub);
    const dateFormatted = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const emails: EmailLog[] = recipients.map(recipient => ({
      id: `email-${Math.random().toString(36).substr(2, 9)}`,
      recipient,
      subject: `IMPACT LEAD VALIDATED: ${sub.intelligenceId} — ${sub.clientName}`,
      body: `Action Taken: Validated by ${loggedInUser.name} (${ROLE_MAP[loggedInUser.email.toLowerCase()]?.designation || 'Reviewer'})\nIntelligence ID: ${sub.intelligenceId}\nClient/Account: ${sub.clientName}\nValidated On: ${dateFormatted}\nNext Step: CRM Lead Creation initiated\nStatus: Lead Registered in Dynamics CRM 365`,
      timestamp: new Date().toISOString(),
      type: 'stakeholder'
    }));
    logEmails(emails);

    // Increment employee bell notifications count & add item
    addNotification(`✅ Your submission ${sub.intelligenceId} has been Validated`);

    // Trigger Success Toast
    triggerToast('success', 'Submission validated. CRM lead creation initiated. Stakeholders notified.');
  };

  // 2. Reject decision workflow
  const handleReject = (e: React.FormEvent, sub: Submission) => {
    e.preventDefault();
    if (rejectionReason.trim().length < 10) return;

    const updatedFields: Partial<Submission> = {
      status: 'Closed - Not Valid',
      reason: rejectionReason,
      updatedAt: new Date().toISOString()
    };

    updateSubmission(sub.intelligenceId, updatedFields);
    setSelectedSub(null);

    // Generate Auto Outbox Log Entries for all recipients
    const recipients = getRecipientsList(sub);
    const emails: EmailLog[] = recipients.map(recipient => ({
      id: `email-${Math.random().toString(36).substr(2, 9)}`,
      recipient,
      subject: `IMPACT LEAD REJECTED: ${sub.intelligenceId} — ${sub.clientName}`,
      body: `Action Taken: Rejected by ${loggedInUser.name} (${ROLE_MAP[loggedInUser.email.toLowerCase()]?.designation || 'Reviewer'})\nIntelligence ID: ${sub.intelligenceId}\nClient/Account: ${sub.clientName}\nStatus: Closed - Not Valid\n\nRejection Reason:\n${rejectionReason}`,
      timestamp: new Date().toISOString(),
      type: 'stakeholder'
    }));
    logEmails(emails);

    // Add employee notification
    addNotification(`❌ Your submission ${sub.intelligenceId} has been Rejected — see reason`);

    // Trigger Error Toast
    triggerToast('error', 'Submission rejected. Reason recorded. Employee and stakeholders notified.');
    
    // Reset form states
    setRejectionReason('');
    setShowRejectForm(false);
  };

  // 3. Clarification decision workflow
  const handleClarify = (e: React.FormEvent, sub: Submission) => {
    e.preventDefault();
    if (!clarifyComment.trim()) return;

    const updatedFields: Partial<Submission> = {
      status: 'Clarification Requested',
      reason: clarifyComment, // Store clarification message in the reason field
      updatedAt: new Date().toISOString()
    };

    updateSubmission(sub.intelligenceId, updatedFields);
    setSelectedSub(null);

    // Generate Auto Outbox Log Entry to Employee Only
    const employeeEmail = sub.employeeId === 'ND-10042' ? 'shinto.s@nestdigital.com' : `${sub.employeeId.toLowerCase()}@nestdigital.com`;
    const email: EmailLog = {
      id: `email-${Math.random().toString(36).substr(2, 9)}`,
      recipient: employeeEmail,
      subject: `CLARIFICATION REQUESTED: ${sub.intelligenceId} — ${sub.clientName}`,
      body: `Action Taken: Clarification Requested by ${loggedInUser.name} (${ROLE_MAP[loggedInUser.email.toLowerCase()]?.designation || 'Reviewer'})\nIntelligence ID: ${sub.intelligenceId}\nClient/Account: ${sub.clientName}\nStatus: Clarification Requested\n\nClarification Message:\n${clarifyComment}`,
      timestamp: new Date().toISOString(),
      type: 'employee'
    };
    logEmails([email]);

    // Add employee notification
    addNotification(`💬 Clarification requested on ${sub.intelligenceId} by ${loggedInUser.name}`);

    // Trigger Info Toast
    triggerToast('info', `Clarification requested. Notification sent to ${sub.employeeName}.`);

    // Reset states
    setClarifyComment('');
    setShowClarifyForm(false);
  };

  return (
    <div className="w-full bg-[#F5F6FA] min-h-screen -mt-8 -mx-6 px-6 py-8 flex flex-col gap-6 font-sans">
      
      {/* Toast Notification Container */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fadeIn min-w-[320px] max-w-sm rounded-xl border p-4 shadow-xl flex flex-col gap-1.5 bg-white border-slate-100 border-l-4 transition-all duration-300"
          style={{
            borderLeftColor: toast.type === 'success' ? '#10B981' : toast.type === 'error' ? '#EF4444' : '#3B82F6'
          }}
        >
          <div className="flex gap-2.5 items-start">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
              toast.type === 'success' ? 'bg-emerald-500' : toast.type === 'error' ? 'bg-rose-500' : 'bg-blue-500'
            }`}>
              {toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : '💬'}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-slate-800 leading-normal">{toast.message}</span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                {toast.reviewerName} • {toast.timestamp}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* A. Welcome Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 border-l-4 border-[#C0152A] p-6 flex flex-col gap-4">
        <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
          <span>✦ REVIEWER PORTAL • JULY 1, 2026</span>
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-brand-navy tracking-tight">
            Welcome, <span className="text-[#C0152A] font-black">{loggedInUser.name.split(' (')[0]}.</span>
          </h1>
          <p className="text-xs text-slate-600 font-semibold mt-1">
            {ROLE_MAP[loggedInUser.email.toLowerCase()]?.designation || 'Reviewer'} — {loggedInUser.businessUnit}
          </p>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            You have <strong className="text-brand-navy font-bold">{pendingCount}</strong> submissions pending your review and decision. SLA compliance is being tracked automatically.
          </p>
        </div>

        {/* Dynamic stat pills */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-50">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-100 text-[10px] font-bold text-rose-700">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            {pendingCount} PENDING REVIEW
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-[10px] font-bold text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {validatedCount} VALIDATED
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-600">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
            {rejectedCount} REJECTED
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-[10px] font-bold text-blue-700">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            {totalReviewed} TOTAL REVIEWED
          </span>
        </div>
      </div>

      {/* B. Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Pending Card */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-rose-500 text-white font-bold shrink-0">
            <Clock size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Action</span>
            <span className="text-2xl font-black text-slate-800 leading-none mt-1 font-mono">{pendingCount}</span>
          </div>
        </div>

        {/* Validated Card */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500 text-white font-bold shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Validated This Month</span>
            <span className="text-2xl font-black text-slate-800 leading-none mt-1 font-mono">{validatedCount}</span>
          </div>
        </div>

        {/* Rejected Card */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-slate-800 text-white font-bold shrink-0">
            <XCircle size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rejected</span>
            <span className="text-2xl font-black text-slate-800 leading-none mt-1 font-mono">{rejectedCount}</span>
          </div>
        </div>

        {/* Avg Time Card */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-500 text-white font-bold shrink-0">
            <RefreshCcw size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Avg Review Time</span>
            <span className="text-2xl font-black text-slate-800 leading-none mt-1 font-mono">1.2 days</span>
          </div>
        </div>
      </div>

      {/* C. Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 items-start">
        
        {/* Left Column (70%) */}
        <div className="lg:col-span-7 flex flex-col gap-6 min-w-0">
          
          {/* Pending Submissions Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col gap-4">
            
            {/* Table Header block */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold text-brand-navy uppercase tracking-wider">PENDING REVIEW</h2>
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">
                  {pendingCount}
                </span>
              </div>
              
              {/* Search Bar */}
              <div className="relative max-w-xs w-full">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search lead or employee..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 border border-slate-200 focus:border-brand-navy focus:outline-none rounded-lg text-xs transition-colors"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 -mt-2 font-semibold">Submissions awaiting your decision — sorted by Review Timeline urgency</p>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="px-4 py-3">Opportunity ID</th>
                    <th className="px-4 py-3">Employee Name</th>
                    <th className="px-4 py-3">Client Name</th>
                    <th className="px-4 py-3">Opportunity Title</th>
                    <th className="px-4 py-3">Submitted Date</th>
                    <th className="px-4 py-3">Review Timeline</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedPending.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 px-4 text-slate-400 font-semibold">
                        No pending items found.
                      </td>
                    </tr>
                  ) : (
                    sortedPending.map(sub => {
                      const sla = getSlaStatus(sub);
                      return (
                        <tr key={sub.intelligenceId} className="hover:bg-blue-50/40 transition-colors">
                          <td className="px-4 py-3.5 font-bold text-brand-navy font-mono">{sub.intelligenceId}</td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-800">{sub.employeeName}</span>
                              <span className="text-[9.5px] text-slate-400 font-semibold">{sub.employeeId}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 font-bold text-slate-700">{sub.clientName}</td>
                          <td className="px-4 py-3.5 text-slate-500 font-semibold max-w-[160px] truncate">{sub.shortDesc}</td>
                          <td className="px-4 py-3.5 text-slate-500 font-semibold font-mono">
                            <div className="flex flex-col gap-0.5">
                              <span>{new Date(sub.createdAt).toLocaleDateString('en-GB')}</span>
                              <span className="text-[10px] text-slate-400 font-medium">{new Date(sub.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            {sla.isOverdue ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-100">
                                ⚠️ Overdue
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                🟢 Within SLA
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <button 
                              onClick={() => {
                                setSelectedSub(sub);
                                setShowRejectForm(false);
                                setShowClarifyForm(false);
                                setIsProfileExpanded(false);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-navy hover:bg-[#121c4a] text-white font-bold text-[10px] cursor-pointer transition-all shadow-sm"
                            >
                              <Eye size={12} />
                              Review
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Reviewed Submissions Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col gap-4">
            <h2 className="text-sm font-extrabold text-brand-navy uppercase tracking-wider">REVIEWED SUBMISSIONS</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                    <th className="px-4 py-3">Intelligence ID</th>
                    <th className="px-4 py-3">Employee Name</th>
                    <th className="px-4 py-3">Client Name</th>
                    <th className="px-4 py-3">Short Description</th>
                    <th className="px-4 py-3">Submitted Date</th>
                    <th className="px-4 py-3">Outcome</th>
                    <th className="px-4 py-3 text-right">Reviewed On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedReviewed.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 px-4 text-slate-400 font-semibold">
                        No reviewed items yet.
                      </td>
                    </tr>
                  ) : (
                    sortedReviewed.map(sub => {
                      const isRejected = sub.status === 'Closed - Not Valid';
                      const isClarify = sub.status === 'Clarification Requested';
                      
                      return (
                        <tr key={sub.intelligenceId} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3.5 font-bold text-slate-600 font-mono">{sub.intelligenceId}</td>
                          <td className="px-4 py-3.5 font-semibold text-slate-700">{sub.employeeName}</td>
                          <td className="px-4 py-3.5 font-bold text-slate-700">{sub.clientName}</td>
                          <td className="px-4 py-3.5 text-slate-500 font-semibold max-w-[180px] truncate">{sub.shortDesc}</td>
                          <td className="px-4 py-3.5 text-slate-500 font-semibold font-mono">
                            <div className="flex flex-col gap-0.5">
                              <span>{new Date(sub.createdAt).toLocaleDateString('en-GB')}</span>
                              <span className="text-[10px] text-slate-400 font-medium">{new Date(sub.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            {isRejected ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100 group relative cursor-help"
                                title={sub.reason}
                              >
                                ❌ Rejected
                                {sub.reason && (
                                  <span className="ml-1 text-[8.5px] bg-slate-800 text-white rounded px-1 py-0.2 shrink-0 font-normal">
                                    ⓘ reason
                                  </span>
                                )}
                              </span>
                            ) : isClarify ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100"
                                title={sub.reason}
                              >
                                💬 Clarification
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                ✅ Validated
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right text-slate-500 font-semibold font-mono">
                            <div className="flex flex-col gap-0.5 items-end">
                              <span>{new Date(sub.updatedAt).toLocaleDateString('en-GB')}</span>
                              <span className="text-[10px] text-slate-400 font-medium">{new Date(sub.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (30%) */}
        <div className="lg:col-span-3 flex flex-col gap-6 min-w-0">
          
          {/* Reviewer Profile Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex flex-col gap-4">
            <h3 className="text-[10px] font-bold text-brand-navy uppercase tracking-wider border-b border-slate-50 pb-2 flex items-center gap-1.5">
              <Shield size={14} className="text-[#C0152A]" />
              🛡 REVIEWER PROFILE
            </h3>
            
            <div className="flex flex-col gap-3.5 text-xs">
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Full Name</span>
                <strong className="text-slate-700 font-extrabold">{loggedInUser.name.split(' (')[0]}</strong>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Employee ID</span>
                <strong className="text-slate-700 font-extrabold">{loggedInUser.employeeId}</strong>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Role</span>
                <strong className="text-slate-700 font-extrabold">
                  {ROLE_MAP[loggedInUser.email.toLowerCase()]?.designation || 'Approver'}
                </strong>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Department</span>
                <strong className="text-slate-700 font-extrabold">{loggedInUser.businessUnit}</strong>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Access Level</span>
                <strong className="text-emerald-600 font-extrabold flex items-center gap-1">
                  <span>●</span> Authorized Approver
                </strong>
              </div>
            </div>
          </div>

          {/* Quick Actions & System Status Card */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex flex-col gap-4">
            <h3 className="text-[10px] font-bold text-brand-navy uppercase tracking-wider border-b border-slate-50 pb-2">
              QUICK ACTIONS
            </h3>
            
            <div className="flex flex-col gap-2.5 text-xs text-slate-600 font-bold">
              <a href="#pending" onClick={(e) => { e.preventDefault(); setSearchQuery(''); }} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100 group">
                <span className="flex items-center gap-2">
                  <span>📋</span>
                  <span>View All Submissions</span>
                </span>
                <ArrowRight size={13} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </a>

              <a href="/outbox" onClick={(e) => { e.preventDefault(); window.location.pathname = '/outbox'; }} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100 group">
                <span className="flex items-center gap-2">
                  <Mail size={13} className="text-slate-500" />
                  <span>View Email Logs</span>
                </span>
                <ArrowRight size={13} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>

            <div className="border-t border-slate-100 pt-3 mt-1 flex flex-col gap-2.5">
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">● SYSTEM STATUS</h4>
              <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>All Dynamics CRM gateways operational</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>HRMS sync active</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Review workflow engine running</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Review Modal (Triggered on click "Review") */}
      {selectedSub && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity overflow-y-auto">
          
          <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl flex flex-col border border-slate-100 overflow-hidden my-8 animate-fadeIn max-h-[90vh]">
            
            {/* Sticky Header */}
            <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-extrabold text-brand-navy tracking-tight">Review Submission</h2>
                <p className="text-xs text-slate-400 mt-0.5 font-semibold">
                  {selectedSub.intelligenceId} — {selectedSub.clientName}
                </p>
              </div>
              <button 
                onClick={() => {
                  setSelectedSub(null);
                  setShowRejectForm(false);
                  setShowClarifyForm(false);
                }} 
                className="w-8 h-8 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 border border-slate-200/50 cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body Container */}
            <div className="p-6 overflow-y-auto flex flex-col gap-5 max-h-[calc(90vh-140px)]">
              
              {/* Section 1 — Submission Details */}
              <div className="bg-[#F5F6FA] border border-slate-100 rounded-xl p-5 flex flex-col gap-4">
                <span className="text-[10px] font-bold text-brand-navy tracking-wider uppercase block">
                  SUBMISSION DETAILS
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Opportunity ID</span>
                    <strong className="text-slate-700 font-mono font-bold">{selectedSub.intelligenceId}</strong>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Submitted By</span>
                    <div className="flex flex-col">
                      <strong className="text-slate-700 font-extrabold">{selectedSub.employeeName}</strong>
                      <span className="text-[9px] text-slate-400 font-semibold">{selectedSub.employeeId}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Client / Account Name</span>
                    <strong className="text-slate-700 font-extrabold">{selectedSub.clientName}</strong>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Submitted Date</span>
                    <strong className="text-slate-700 font-mono font-bold">
                      {new Date(selectedSub.createdAt).toLocaleDateString('en-GB')}
                    </strong>
                  </div>

                  <div className="flex flex-col gap-1 md:col-span-2">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Opportunity Title</span>
                    <p className="text-xs text-slate-600 font-semibold italic">"{selectedSub.shortDesc}"</p>
                  </div>

                  <div className="flex flex-col gap-1 md:col-span-2">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Opportunity Details</span>
                    <div className="max-h-28 overflow-y-auto bg-white border border-slate-200/50 rounded-lg p-3 text-xs text-slate-600 italic leading-relaxed whitespace-pre-wrap">
                      "{selectedSub.detailedDesc}"
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Contact Details Available</span>
                    {selectedSub.hasContact ? (
                      <div className="flex flex-col gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 self-start">
                          Yes
                        </span>
                        {selectedSub.contactPhone && (
                          <span className="text-slate-700 font-mono">📞 {selectedSub.contactPhone}</span>
                        )}
                        {selectedSub.contactEmail && (
                          <span className="text-slate-700 font-mono">✉️ {selectedSub.contactEmail}</span>
                        )}
                      </div>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-slate-50 text-slate-500 border border-slate-200 self-start">
                        No
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Clarification Thread (Visible if there was a clarification) */}
              {(selectedSub.reason || selectedSub.clarificationResponse) && (
                <div className="bg-blue-50/20 border border-blue-200 rounded-xl p-4 flex flex-col gap-3">
                  <h4 className="text-[10px] font-bold text-brand-navy tracking-wider uppercase border-b border-blue-100 pb-2">
                    💬 Clarification Thread
                  </h4>
                  {selectedSub.reason && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Your Request</span>
                      <p className="text-xs text-slate-700 italic bg-white p-2.5 rounded-lg border border-blue-100">
                        "{selectedSub.reason}"
                      </p>
                    </div>
                  )}
                  {selectedSub.clarificationResponse ? (
                    <div className="flex flex-col gap-1 mt-1">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Employee Response</span>
                      <p className="text-xs text-brand-navy font-semibold bg-white p-2.5 rounded-lg border border-blue-100 whitespace-pre-wrap">
                        {selectedSub.clarificationResponse}
                      </p>
                    </div>
                  ) : selectedSub.status === 'Clarification Requested' ? (
                    <div className="text-[10px] text-amber-600 font-bold bg-amber-50 p-2 rounded-lg border border-amber-100 text-center">
                      ⏳ Waiting for employee to respond...
                    </div>
                  ) : null}
                </div>
              )}

              {/* Section 2 — Submitter Profile (Collapsible) */}
              <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setIsProfileExpanded(!isProfileExpanded)}
                  className="w-full px-5 py-3.5 bg-slate-50 hover:bg-slate-100/75 flex justify-between items-center text-xs font-bold text-brand-navy border-none cursor-pointer transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <span>👤</span> Submitter Profile
                  </span>
                  <span>{isProfileExpanded ? '▲' : '▼'}</span>
                </button>

                {isProfileExpanded && (
                  <div className="p-5 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-white animate-fadeIn">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Business Unit</span>
                      <strong className="text-slate-700 font-extrabold">{selectedSub.businessUnit}</strong>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Reporting Manager</span>
                      <strong className="text-slate-700 font-extrabold">{selectedSub.reportingManager}</strong>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Project Manager</span>
                      <strong className="text-slate-700 font-extrabold">{selectedSub.projectManager}</strong>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">BU Head</span>
                      <strong className="text-slate-700 font-extrabold">{selectedSub.buHead}</strong>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">HRBP</span>
                      <strong className="text-slate-700 font-extrabold">{selectedSub.hrbp}</strong>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Assigned Sales Person</span>
                      <strong className="text-slate-700 font-extrabold">{selectedSub.salesPerson}</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3 — SLA Information (Yellow tint box) */}
              {getSlaStatus(selectedSub).isOverdue && (
                <div className="bg-[#FEF3C7] border border-amber-200/50 p-4 rounded-xl flex items-start gap-2.5 text-amber-800">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <div className="flex flex-col gap-0.5 text-xs">
                    <span className="font-extrabold">⚠️ SLA Warning Status</span>
                    <p className="font-semibold text-amber-700">
                      Acknowledgment overdue by {getSlaStatus(selectedSub).daysOverdue} day{getSlaStatus(selectedSub).daysOverdue > 1 ? 's' : ''}. Immediate review required.
                    </p>
                  </div>
                </div>
              )}

              {/* Section 4 — Your Decision (White bg box) */}
              <div className="border-t border-slate-100 pt-5 flex flex-col gap-4">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">
                  YOUR DECISION
                </span>

                {/* Sub-flows toggled view */}
                {!showRejectForm && !showClarifyForm ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                      onClick={() => handleValidate(selectedSub)}
                      className="flex-1 py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs border-none flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm"
                    >
                      <CheckCircle2 size={15} />
                      Validate
                    </button>
                    
                    <button 
                      onClick={() => {
                        setShowRejectForm(true);
                        setShowClarifyForm(false);
                      }}
                      className="flex-1 py-3 px-4 rounded-lg bg-[#C0152A] hover:bg-[#a10e20] text-white font-bold text-xs border-none flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm"
                    >
                      <XCircle size={15} />
                      Reject
                    </button>

                    <button 
                      onClick={() => {
                        setShowClarifyForm(true);
                        setShowRejectForm(false);
                      }}
                      className="flex-1 py-3 px-4 rounded-lg border-2 border-brand-navy hover:bg-slate-50 text-brand-navy font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm bg-transparent"
                    >
                      <MessageSquare size={15} />
                      Request Clarification
                    </button>
                  </div>
                ) : null}

                {/* Rejection Sub-flow Form */}
                {showRejectForm && (
                  <form onSubmit={(e) => handleReject(e, selectedSub)} className="bg-red-50/15 border border-red-200 p-4 rounded-xl flex flex-col gap-3 animate-fadeIn">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-[#C0152A] uppercase flex items-center gap-1">
                        ❌ Rejection Reason <span className="text-[10px] text-slate-400 font-normal italic lowercase">(mandatory)</span>
                      </span>
                      <span className={`text-[10px] font-mono font-bold ${rejectionReason.length < 10 ? 'text-red-500' : 'text-slate-400'}`}>
                        {rejectionReason.length}/500
                      </span>
                    </div>

                    <textarea
                      maxLength={500}
                      rows={4}
                      placeholder="Provide a clear and specific reason for rejection. This will be shared with the employee and all stakeholders."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="w-full p-3 rounded-lg border border-red-300 focus:outline-none focus:ring-1 focus:ring-[#C0152A]/20 focus:border-[#C0152A] text-xs font-sans leading-relaxed"
                      required
                    />

                    <div className="flex items-center gap-3.5 justify-end mt-1 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setShowRejectForm(false);
                          setRejectionReason('');
                        }}
                        className="bg-transparent border-none text-slate-400 hover:text-slate-600 font-bold hover:underline cursor-pointer transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={rejectionReason.trim().length < 10}
                        className={`px-4 py-2 rounded-lg font-bold text-white border-none transition-all shadow-sm ${
                          rejectionReason.trim().length < 10
                            ? 'bg-slate-300 cursor-not-allowed'
                            : 'bg-red-600 hover:bg-red-700 cursor-pointer'
                        }`}
                      >
                        Confirm Rejection
                      </button>
                    </div>
                  </form>
                )}

                {/* Clarification Sub-flow Form */}
                {showClarifyForm && (
                  <form onSubmit={(e) => handleClarify(e, selectedSub)} className="bg-blue-50/15 border border-blue-200 p-4 rounded-xl flex flex-col gap-3 animate-fadeIn">
                    <span className="text-xs font-bold text-brand-navy uppercase flex items-center gap-1">
                      💬 Clarification Message
                    </span>

                    <textarea
                      rows={4}
                      placeholder="Describe what additional information or context is needed from the employee."
                      value={clarifyComment}
                      onChange={(e) => setClarifyComment(e.target.value)}
                      className="w-full p-3 rounded-lg border border-blue-300 focus:outline-none focus:ring-1 focus:ring-brand-navy/20 focus:border-brand-navy text-xs font-sans leading-relaxed"
                      required
                    />

                    <div className="flex items-center gap-3.5 justify-end mt-1 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setShowClarifyForm(false);
                          setClarifyComment('');
                        }}
                        className="bg-transparent border-none text-slate-400 hover:text-slate-600 font-bold hover:underline cursor-pointer transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-lg bg-brand-navy hover:bg-[#121c4a] font-bold text-white border-none cursor-pointer transition-all shadow-sm"
                      >
                        Send Request
                      </button>
                    </div>
                  </form>
                )}

              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
