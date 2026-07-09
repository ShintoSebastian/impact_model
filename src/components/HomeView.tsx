import React from 'react';
import type { Submission, Employee, EmailLog } from '../mockData.ts';
import { ROLE_MAP } from '../mockData.ts';
import { Database, RefreshCcw, ShieldCheck, Shield, Sparkles, Mail, PhoneCall, Clock } from 'lucide-react';

// Steps for the Lead Lifecycle Tracker
const LIFECYCLE_STEPS = [
  "Lead Registered",
  "Accepted",
  "Opportunity Registered",
  "Proposal",
  "Negotiation",
  "Converted Won"
];

// Helper to determine stepper status
const getStepStatus = (sub: Submission, stepIndex: number): 'completed' | 'active' | 'future' | 'failed' => {
  const status = sub.status;
  const isFailed = status === 'Closed - Not Valid' || status === 'Closed - Dropped' || status === 'Lead Dropped';
  
  // Map current status to the stepper index (0-5)
  let currentStageIndex = -1;
  if (status === 'Under Review' || status === 'Clarification Requested') currentStageIndex = -1; // before stepper
  else if (status === 'Validated' || status === 'Lead Registered') currentStageIndex = 0;
  else if (status === 'Lead Accepted') currentStageIndex = 1;
  else if (status === 'Opportunity Registered') currentStageIndex = 2;
  else if (status === 'Proposal') currentStageIndex = 3;
  else if (status === 'Negotiation') currentStageIndex = 4;
  else if (status === 'Closed - Converted') currentStageIndex = 5;
  else if (isFailed) currentStageIndex = 0; // show failure at first step
  
  if (stepIndex < currentStageIndex) {
    return 'completed';
  }
  
  if (stepIndex === currentStageIndex) {
    if (isFailed) return 'failed';
    if (status === 'Closed - Converted') return 'completed';
    return 'active';
  }
  
  return 'future';
};

// Check if a review submission exceeds the 2 working days SLA
const isOverdue = (createdAtStr: string, status: string): boolean => {
  if (status !== 'Under Review') return false;
  const createdDate = new Date(createdAtStr);
  const currentDate = new Date("2026-07-01T12:19:57+05:30"); // Base baseline time
  
  let count = 0;
  const tempDate = new Date(createdDate.getTime());
  while (tempDate < currentDate) {
    tempDate.setDate(tempDate.getDate() + 1);
    const day = tempDate.getDay();
    if (day !== 0 && day !== 6) { // Exclude weekends
      count++;
    }
  }
  return count > 2;
};

// ----------------------------------------------------
// HOME PAGE VIEW COMPONENT
// ----------------------------------------------------
export interface HomeViewProps {
  submissions: Submission[];
  selectedSubId: string | null;
  setSelectedSubId: (id: string | null) => void;
  showModal: boolean;
  setShowModal: (val: boolean) => void;
  loggedInUser: Employee;
  currentUserRole: string;
  notifications: any[];
  markAllAsRead: () => void;
  resetDb: () => void;
  navigate: (path: string) => void;
  updateSubmission: (id: string, updatedFields: Partial<Submission>) => void;
  logEmails: (emails: EmailLog[]) => void;
  addNotification: (message: string) => void;
}

export function HomeView({
  submissions,
  selectedSubId,
  setSelectedSubId,
  showModal,
  setShowModal,
  loggedInUser,
  currentUserRole,
  resetDb,
  navigate,
  updateSubmission,
  logEmails,
  addNotification,
  notifications
}: HomeViewProps) {

  const [replyText, setReplyText] = React.useState('');
  const [replyError, setReplyError] = React.useState('');
  const [isSubmittingReply, setIsSubmittingReply] = React.useState(false);

  React.useEffect(() => {
    if (!showModal) {
      setReplyText('');
      setReplyError('');
    }
  }, [showModal]);

  const handleSendReply = (sub: Submission) => {
    if (!replyText.trim()) {
      setReplyError('Response message is required.');
      return;
    }
    setIsSubmittingReply(true);

    const updatedFields: Partial<Submission> = {
      status: 'Under Review',
      clarificationResponse: replyText,
      updatedAt: new Date().toISOString()
    };

    updateSubmission(sub.intelligenceId, updatedFields);

    // Simulate sending email to the Reviewer
    const reviewerEmail = 'arun.kumar@nestdigital.com';
    const email: EmailLog = {
      id: `email-${Math.random().toString(36).substr(2, 9)}`,
      recipient: `Arun Kumar (${reviewerEmail})`,
      subject: `CLARIFICATION RESPONDED: ${sub.intelligenceId} — ${sub.clientName}`,
      body: `Dear Arun Kumar,\n\nEmployee ${loggedInUser.name} has responded to your clarification request for opportunity ${sub.intelligenceId}.\n\nYour Clarification Request:\n"${sub.reason}"\n\nEmployee Response:\n"${replyText}"\n\nBest regards,\nIMPACT Portal Workflow Engine`,
      timestamp: new Date().toISOString(),
      type: 'stakeholder'
    };
    logEmails([email]);

    addNotification(`✉️ Clarification reply submitted for ${sub.intelligenceId} by ${loggedInUser.name}`);

    // Wait a brief moment to show loader state, then close modal
    setTimeout(() => {
      setIsSubmittingReply(false);
      setShowModal(false);
    }, 600);
  };

  // All user submissions (unfiltered for statistics)
  const rawMySubmissions = submissions.filter(s => s.employeeId === loggedInUser.employeeId);

  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('All');

  // Filtered user submissions (for table render)
  const mySubmissions = rawMySubmissions
    .filter(s => {
      if (statusFilter === 'All') return true;
      if (statusFilter === 'Under Review') return s.status === 'Under Review';
      if (statusFilter === 'Clarification Requested') return s.status === 'Clarification Requested';
      if (statusFilter === 'Validated') return s.status === 'Validated';
      if (statusFilter === 'Active') return ['Lead Registered', 'Lead Accepted', 'Opportunity Registered', 'Proposal', 'Negotiation'].includes(s.status);
      if (statusFilter === 'Closed') return s.status.startsWith('Closed') || s.status === 'Lead Dropped';
      return true;
    })
    .filter(s => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return s.intelligenceId.toLowerCase().includes(q) ||
             s.clientName.toLowerCase().includes(q) ||
             s.shortDesc.toLowerCase().includes(q) ||
             s.status.toLowerCase().includes(q);
    });

  // Statistics calculation for Welcome Card Banner
  const overdueReviewCount = rawMySubmissions.filter(s => s.status === 'Under Review' && isOverdue(s.createdAt, s.status)).length;
  const crmSyncPendingCount = rawMySubmissions.filter(s => !s.crmLeadId).length;
  const activeProposalsCount = rawMySubmissions.filter(s => s.status === 'Opportunity Registered' || s.status === 'Proposal' || s.status === 'Negotiation').length;
  const winRatioText = (() => {
    const closedLeads = rawMySubmissions.filter(s => s.status.startsWith('Closed') || s.status === 'Lead Dropped');
    if (closedLeads.length === 0) return '100%';
    const wonLeads = closedLeads.filter(s => s.status === 'Closed - Converted').length;
    return `${((wonLeads / closedLeads.length) * 100).toFixed(0)}%`;
  })();

  // Statistics calculation for Stat Cards Row
  const totalLeadsCount = rawMySubmissions.length;
  const underReviewTotal = rawMySubmissions.filter(s => s.status === 'Under Review').length;
  const crmSyncedCount = rawMySubmissions.filter(s => !!s.crmLeadId).length;
  const convertedTotal = rawMySubmissions.filter(s => s.status === 'Closed - Converted').length;
  const unreadCount = notifications.filter(n => !n.read).length;

  const currentSelectedSub = mySubmissions.find(s => s.intelligenceId === selectedSubId) || null;

  return (
    <>
      {/* Welcome Card Banner (SaaS 2025 Redesign) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#121E52] via-[#0A102F] to-[#05081E] p-8 md:p-10 shadow-2xl border border-slate-800/80 animate-fade-in-up mb-6">
        {/* Animated gradient shimmer and faint grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0)_0%,rgba(255,255,255,0.03)_50%,rgba(255,255,255,0)_100%)] bg-[length:200%_100%] animate-shimmer pointer-events-none"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xNSkiLz48L3N2Zz4=')] opacity-[0.04] pointer-events-none"></div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Greeting & Summary */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
              <span>✦ IMPACT PORTAL • JULY 1, 2026</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-none text-white">
              Welcome back,<br />
              <span className="bg-gradient-to-r from-blue-400 via-blue-200 to-white bg-clip-text text-transparent">{loggedInUser.name.split(' (')[0]}.</span>
            </h1>
            <p className="text-sm text-slate-300 max-w-md font-medium leading-relaxed">
              Track client lead intelligence, sync with CRM pipelines, and manage validation workflows seamlessly.
            </p>
            <div className="flex items-center gap-3 mt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Active & Synced
              </span>
              <span className="text-xs text-slate-400 font-semibold">
                {unreadCount} alerts pending • {overdueReviewCount} overdue SLA
              </span>
            </div>
          </div>

          {/* Right Column: Actions & Glass Grid */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex gap-3">
              <button 
                onClick={() => navigate('/submit')}
                className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-brand-red to-red-700 text-white font-bold text-xs shadow-lg shadow-red-950/20 hover:shadow-red-950/40 hover:scale-[1.02] active:scale-98 transition-all duration-200 flex items-center justify-center gap-2 border border-red-500/20 cursor-pointer"
              >
                📄 Submit New Lead
              </button>
              <button 
                onClick={() => navigate('/outbox')}
                className="flex-1 py-3 px-5 rounded-xl bg-white/[0.03] text-white font-bold text-xs border border-white/[0.08] hover:bg-white/[0.08] hover:scale-[1.02] active:scale-98 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                📧 Outbox Logs
              </button>
            </div>

            {/* Grid of 4 Glassmorphic Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 flex flex-col gap-1 hover:bg-white/[0.04] transition-all cursor-default" title="Leads under review that have exceeded the 2 working days manager SLA threshold">
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Review Overdue</span>
                <span className="text-lg font-mono font-extrabold text-brand-red">{overdueReviewCount}</span>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 flex flex-col gap-1 hover:bg-white/[0.04] transition-all cursor-default" title="Your submitted opportunities that have not yet been validated and synced to Dynamics CRM">
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Awaiting CRM Sync</span>
                <span className="text-lg font-mono font-extrabold text-blue-400">{crmSyncPendingCount}</span>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 flex flex-col gap-1 hover:bg-white/[0.04] transition-all cursor-default" title="Opportunities currently in the Proposal or Negotiation stage in Dynamics CRM">
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Active Proposals</span>
                <span className="text-lg font-mono font-extrabold text-amber-400">{activeProposalsCount}</span>
              </div>
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-3 flex flex-col gap-1 hover:bg-white/[0.04] transition-all cursor-default" title="Percentage of your closed submissions that successfully converted into won opportunities">
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Win Ratio</span>
                <span className="text-lg font-mono font-extrabold text-emerald-400">{winRatioText}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lead Lifecycle Tracker (SaaS Modern) */}
      <div className="bg-gradient-to-b from-white to-slate-50/30 rounded-2xl border border-gray-100 p-8 shadow-sm transition-all duration-300 hover:shadow-md relative overflow-hidden animate-fade-in-up animation-delay-100 mb-6">
        <div className="flex justify-between items-end mb-8">
          <h3 className="text-xs font-bold text-brand-navy uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            LEAD LIFECYCLE TRACKING
          </h3>
          {selectedSubId ? (
            <span className="text-xs font-semibold text-slate-400">
              {(() => {
                const sub = mySubmissions.find(s => s.intelligenceId === selectedSubId);
                if (!sub) return '0%';
                if (sub.status.startsWith('Closed')) return '100% Complete';
                if (sub.status === 'Negotiation') return '80% Complete';
                if (sub.status === 'Proposal') return '60% Complete';
                if (sub.status === 'Lead Registered' || sub.status === 'Lead Accepted') return '40% Complete';
                if (sub.status === 'Validated') return '20% Complete';
                return '10% Complete';
              })()}
            </span>
          ) : null}
        </div>

        {selectedSubId ? (
          (() => {
            const selectedSub = mySubmissions.find(s => s.intelligenceId === selectedSubId);
            if (!selectedSub) return null;
            return (
              <>
                <p className="text-[11px] text-slate-400 -mt-5 mb-8">
                  Showing status for <strong className="text-slate-700 font-extrabold">{selectedSub.intelligenceId}</strong> ({selectedSub.clientName})
                </p>
                <div className="flex items-center justify-between w-full relative px-2 mb-4">
                  {LIFECYCLE_STEPS.map((step, idx) => {
                    const status = getStepStatus(selectedSub, idx);
                    let circleMarkup;

                    if (status === 'completed') {
                      circleMarkup = (
                        <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-bold border border-blue-100 shadow-sm z-10">
                          ✓
                        </div>
                      );
                    } else if (status === 'active') {
                      circleMarkup = (
                        <div className="relative flex items-center justify-center z-10">
                          <div className="absolute w-12 h-12 rounded-full bg-blue-500/10 animate-ping" />
                          <div className="relative w-10 h-10 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shadow-[0_4px_12px_rgba(37,99,235,0.3)] ring-2 ring-white">
                            {idx + 1}
                          </div>
                        </div>
                      );
                    } else if (status === 'failed') {
                      circleMarkup = (
                        <div className="w-9 h-9 rounded-full bg-red-50 text-brand-red flex items-center justify-center text-sm font-bold border border-red-100 shadow-sm z-10">
                          ✗
                        </div>
                      );
                    } else {
                      circleMarkup = (
                        <div className="w-9 h-9 rounded-full border border-gray-200 bg-white text-gray-400 flex items-center justify-center text-xs font-semibold z-10">
                          {idx + 1}
                        </div>
                      );
                    }
                    
                    const isLast = idx === LIFECYCLE_STEPS.length - 1;
                    const nextStatus = isLast ? null : getStepStatus(selectedSub, idx + 1);
                    const lineStyle = status === 'completed' && nextStatus !== 'future' 
                      ? 'bg-blue-200' 
                      : 'bg-gray-100';

                    return (
                      <React.Fragment key={step}>
                        <div className="flex flex-col items-center gap-4 relative">
                          {circleMarkup}
                          <span className="text-[10px] font-bold text-slate-500 text-center w-20 absolute top-12 leading-tight">
                            {step}
                          </span>
                        </div>
                        {!isLast && (
                          <div className={`flex-1 h-[2px] mx-2 -mt-8 ${lineStyle}`} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Review Deadline Warning Chip */}
                <div className="flex items-center gap-2 mt-16 px-3.5 py-2 rounded-full bg-amber-500/5 border border-amber-500/10 text-amber-700 text-[10px] font-semibold self-start max-w-fit shadow-sm">
                  <span className="text-xs">⚠️</span>
                  <span>Acknowledgment due within 2 working days — Review Deadline active</span>
                </div>
              </>
            );
          })()
        ) : (
          <div className="text-center py-12 text-slate-400 text-xs font-bold border border-dashed border-gray-200 rounded-xl bg-slate-50/50">
            Select a submission row below to view its lifecycle.
          </div>
        )}
      </div>

      {/* Stats Cards Row (SaaS Modern) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up animation-delay-200 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-blue-500/30 transition-all duration-300 flex items-center gap-4 cursor-pointer group">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 text-white font-bold shadow-md shadow-blue-500/10 group-hover:scale-105 transition-transform">
            <Database size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Leads</span>
            <span className="text-2xl font-extrabold text-brand-navy leading-none mt-1">{totalLeadsCount}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-red-500/30 transition-all duration-300 flex items-center gap-4 cursor-pointer group">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-red-500 to-red-600 text-white font-bold shadow-md shadow-red-500/10 group-hover:scale-105 transition-transform">
            <Shield size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Under Review</span>
            <span className="text-2xl font-extrabold text-brand-navy leading-none mt-1">{underReviewTotal}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-orange-500/30 transition-all duration-300 flex items-center gap-4 cursor-pointer group">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-orange-400 to-orange-500 text-white font-bold shadow-md shadow-orange-500/10 group-hover:scale-105 transition-transform">
            <RefreshCcw size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">CRM Synced</span>
            <span className="text-2xl font-extrabold text-brand-navy leading-none mt-1">{crmSyncedCount}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:border-emerald-500/30 transition-all duration-300 flex items-center gap-4 cursor-pointer group">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-600 text-white font-bold shadow-md shadow-emerald-500/10 group-hover:scale-105 transition-transform">
            <ShieldCheck size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Converted Won</span>
            <span className="text-2xl font-extrabold text-brand-navy leading-none mt-1">{convertedTotal}</span>
          </div>
        </div>
      </div>

{/* Two-column layout 70/30 */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">

        {/* Left Column: Submissions Table */}
        <div className="lg:col-span-7 flex flex-col gap-6 min-w-0 animate-fade-in-up animation-delay-300">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm overflow-x-auto scrollbar-thin scrollbar-thumb-brand-navy scrollbar-track-gray-50">
            
            {/* Table Header Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h3 className="text-xs font-bold text-brand-navy tracking-widest uppercase flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                OPPORTUNITY REQUESTS
              </h3>
              
              <div className="flex items-center gap-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
                  <input 
                    type="text" 
                    placeholder="Search leads..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-4 py-1.5 bg-slate-50 border border-slate-200/60 rounded-lg text-xs outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all w-40" 
                  />
                </div>
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200/60 rounded-lg text-xs outline-none focus:border-blue-400 cursor-pointer text-gray-500 font-bold"
                >
                  <option value="All">All Status</option>
                  <option value="Under Review">Pending Review</option>
                  <option value="Clarification Requested">More Info Needed</option>
                  <option value="Validated">Validated</option>
                  <option value="Active">Active Pipeline</option>
                  <option value="Closed">Closed / Terminal</option>
                </select>
                <button 
                  onClick={() => navigate('/submit')}
                  className="px-3.5 py-1.5 bg-brand-red text-white text-xs font-bold rounded-lg shadow-sm hover:brightness-110 transition-all cursor-pointer border-none"
                >
                  + New Lead
                </button>
              </div>
            </div>

            <table className="w-full border-collapse text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/50 border-b border-gray-100 text-slate-400 font-bold uppercase tracking-wider text-[9px]">
                  <th className="px-5 py-3 rounded-tl-xl">Opportunity ID</th>
                  <th className="px-5 py-3">Client Name</th>
                  <th className="px-5 py-3">Opportunity Title</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Sales System Sync</th>
                  <th className="px-5 py-3">Submitted Date</th>
                  <th className="px-5 py-3">Sales Stage</th>
                  <th className="px-5 py-3 rounded-tr-xl">Action</th>
                </tr>
              </thead>
              <tbody className="font-semibold text-slate-600">
                {mySubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-gray-400 font-medium">
                      No submissions registered yet.
                    </td>
                  </tr>
                ) : (
                  mySubmissions.map(sub => {
                    const isSubOverdue = isOverdue(sub.createdAt, sub.status);
                    const isSelected = selectedSubId === sub.intelligenceId;
                    const isClosed = sub.status.startsWith('Closed');

                    // Map status badge text and colors
                    let statusLabel: string = sub.status;
                    let statusBadgeStyles = 'bg-gray-50 text-gray-500 border border-gray-200/50';

                    if (sub.status === 'Under Review') {
                      statusLabel = 'Pending Review';
                      statusBadgeStyles = 'bg-amber-500/10 text-amber-700 border border-amber-500/20';
                    } else if (sub.status === 'Clarification Requested') {
                      statusLabel = 'More Info Needed';
                      statusBadgeStyles = 'bg-purple-500/10 text-purple-700 border border-purple-500/20';
                    } else if (sub.status === 'Validated') {
                      statusLabel = 'Validated';
                      statusBadgeStyles = 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20';
                    } else if (sub.status === 'Closed - Not Valid') {
                      statusLabel = 'Not Validated';
                      statusBadgeStyles = 'bg-rose-500/10 text-rose-700 border border-rose-500/20';
                    } else if (isClosed) {
                      statusLabel = 'Closed';
                      statusBadgeStyles = 'bg-slate-100 text-slate-500 border border-slate-200/40';
                    } else {
                      statusLabel = 'Sent to Sales Team';
                      statusBadgeStyles = 'bg-blue-500/10 text-blue-700 border border-blue-500/20';
                    }

                    return (
                      <tr
                        key={sub.intelligenceId}
                        onClick={() => setSelectedSubId(sub.intelligenceId)}
                        className={`cursor-pointer transition-all duration-200 border-b border-gray-100/50 group relative
                          ${isClosed ? 'opacity-75 bg-slate-50/40' : 'bg-white'} 
                          ${isSelected ? 'bg-blue-50/20' : 'hover:bg-slate-50/40'}
                        `}
                      >
                        <td className="px-5 py-3.5 font-bold font-mono text-brand-navy relative">
                          {isSelected && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-500" />}
                          <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <span className="inline-flex px-2 py-0.5 font-mono text-[10.5px] font-semibold bg-slate-50 border border-slate-200/50 text-slate-600 rounded-md">
                            {sub.intelligenceId}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 font-bold text-slate-800 text-[11.5px]">{sub.clientName}</td>
                        <td className="px-5 py-3.5 text-slate-400 max-w-[200px] truncate">{sub.shortDesc}</td>
                        
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider ${statusBadgeStyles}`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {sub.crmLeadId ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 text-[9px] font-bold uppercase tracking-wider">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Synced
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-400 border border-slate-200/50 text-[9px] font-bold uppercase tracking-wider">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                              Awaiting Review
                            </div>
                          )}
                        </td>
                        
                        <td className="px-5 py-3.5 text-slate-500">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-slate-700">{new Date(sub.createdAt).toLocaleDateString()}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{new Date(sub.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                          </div>
                          {isSubOverdue && (
                            <span className="mt-1 inline-flex items-center gap-1 bg-brand-red/10 text-brand-red border border-red-200/30 px-1.5 py-0.5 rounded-full text-[8px] font-bold shadow-sm" title="Overdue SLA">
                              ⚠️ Overdue
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {sub.status === 'Under Review' || sub.status.startsWith('Closed') ? (
                            <span className="text-slate-300 italic font-normal">N/A</span>
                          ) : (
                            <span className="font-bold text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/50 text-[10px] uppercase">{sub.status}</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Avoid double selecting row
                              setSelectedSubId(sub.intelligenceId);
                              setShowModal(true);
                            }}
                            className="px-3.5 py-1 bg-white hover:bg-slate-50 border border-slate-200/80 text-brand-navy font-bold text-[10px] rounded-lg transition-all cursor-pointer shadow-sm hover:border-brand-navy/30 active:scale-95"
                          >
                            View
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

        {/* Right Column: Sidebar HRMS & Quick Ops */}
        <div className="lg:col-span-3 flex flex-col gap-6 animate-fade-in-up animation-delay-400">
          
          {/* HRMS Profile Sync Card */}
          <div className="bg-gradient-to-b from-white to-slate-50/50 rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
            <h3 className="text-[10px] font-bold text-brand-navy uppercase tracking-widest mb-5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">🛡</span>
                <span>HRMS PROFILE</span>
              </div>
              <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-[8px] border border-green-100/50">
                <span className="w-1 h-1 rounded-full bg-green-500 animate-pulse"></span>
                SYNCED
              </div>
            </h3>

            <div className="flex flex-col text-[11px] leading-normal divide-y divide-gray-100/60">
              <div className="py-2.5 flex justify-between items-center">
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Employee ID</span>
                <strong className="text-slate-700 font-bold">{loggedInUser.employeeId}</strong>
              </div>
              <div className="py-2.5 flex justify-between items-center">
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Full Name</span>
                <strong className="text-slate-700 font-bold">{loggedInUser.name}</strong>
              </div>
              <div className="py-2.5 flex justify-between items-center">
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Designation</span>
                <strong className="text-slate-700 font-bold">
                  {loggedInUser.designation || ROLE_MAP[loggedInUser.email.toLowerCase()]?.designation || "Tech Lead"}
                </strong>
              </div>
              <div className="py-2.5 flex justify-between items-center">
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Business Unit</span>
                <strong className="text-slate-700 font-bold truncate max-w-[130px]" title={loggedInUser.businessUnit}>{loggedInUser.businessUnit.split(' (')[0]}</strong>
              </div>
              <div className="py-2.5 flex flex-col gap-0.5">
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Reporting Manager</span>
                <strong className="text-slate-700 font-bold leading-tight break-all">{loggedInUser.reportingManager}</strong>
              </div>
              <div className="py-2.5 flex flex-col gap-0.5">
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Project Manager</span>
                <strong className="text-slate-700 font-bold leading-tight break-all">{loggedInUser.projectManager || 'Kiran Joseph (kiran.j@nestdigital.com)'}</strong>
              </div>
              <div className="py-2.5 flex flex-col gap-0.5">
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">BU Head</span>
                <strong className="text-slate-700 font-bold leading-tight break-all">{loggedInUser.buHead || 'Suresh Nair (suresh.n@nestdigital.com)'}</strong>
              </div>
              <div className="py-2.5 flex flex-col gap-0.5">
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">HRBP</span>
                <strong className="text-slate-700 font-bold leading-tight break-all">{loggedInUser.hrbp || 'Deepa Menon (deepa.m@nestdigital.com)'}</strong>
              </div>
              <div className="py-2.5 flex flex-col gap-0.5">
                <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Sales Person</span>
                <strong className="text-slate-700 font-bold leading-tight break-all">{loggedInUser.salesPerson || 'Jacob Varghese (jacob.varghese@nestdigital.com)'}</strong>
              </div>
            </div>
          </div>

          {/* Quick Operations Panel */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h3 className="text-[10px] font-bold text-brand-navy uppercase tracking-widest mb-5 flex items-center gap-1.5">
              <span className="text-brand-red">⚡</span>
              <span>QUICK OPERATIONS</span>
            </h3>

            <div className="flex flex-col gap-1 text-[11px] font-bold text-slate-500">
              <button 
                onClick={() => navigate('/submit')}
                className="group flex items-center justify-between px-2.5 py-2 rounded-lg border-none bg-transparent hover:bg-slate-50 text-slate-600 hover:text-slate-800 cursor-pointer transition-all w-full"
              >
                <div className="flex items-center gap-2 font-semibold">
                  <span>📝</span>
                  New Opportunity Entry
                </div>
                <span className="text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-transform">→</span>
              </button>

              <button 
                className="group flex items-center justify-between px-2.5 py-2 rounded-lg border-none bg-transparent hover:bg-slate-50 text-slate-600 hover:text-slate-800 cursor-pointer transition-all w-full"
              >
                <div className="flex items-center gap-2 font-semibold">
                  <span>📥</span>
                  View Pending Approvals
                </div>
                <span className="text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-transform">→</span>
              </button>

              <button 
                className="group flex items-center justify-between px-2.5 py-2 rounded-lg border-none bg-transparent hover:bg-slate-50 text-slate-600 hover:text-slate-800 cursor-pointer transition-all w-full"
              >
                <div className="flex items-center gap-2 font-semibold">
                  <span>📊</span>
                  Generate Monthly Report
                </div>
                <span className="text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-transform">→</span>
              </button>
            </div>
            
            <div className="mt-5 pt-4 border-t border-gray-100/60">
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider block mb-2.5">System Status</span>
              <div className="flex flex-col gap-2 text-[10px] text-slate-400 font-medium">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    CRM Gateway
                  </span>
                  <span className="text-emerald-500 font-bold">ACTIVE</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Mail Server
                  </span>
                  <span className="text-emerald-500 font-bold">ACTIVE</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Database Sync
                  </span>
                  <span className="text-emerald-500 font-bold">ACTIVE</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 2. Employee Opportunity Detail / Clarification Modal */}
      {showModal && currentSelectedSub && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl flex flex-col border border-slate-100 overflow-hidden my-8 animate-fadeIn max-h-[90vh]">
            
            {/* Sticky Header */}
            <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-extrabold text-brand-navy tracking-tight">Opportunity Request Details</h2>
                <p className="text-xs text-slate-400 mt-0.5 font-semibold">
                  {currentSelectedSub.intelligenceId} — {currentSelectedSub.clientName}
                </p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 border border-slate-200/50 cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto flex flex-col gap-5 max-h-[calc(90vh-140px)]">
              
              {/* Submission Overview */}
              <div className="bg-[#F5F6FA] border border-slate-100 rounded-xl p-5 flex flex-col gap-4">
                <span className="text-[10px] font-bold text-brand-navy tracking-wider uppercase block">
                  SUBMISSION OVERVIEW
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Opportunity ID</span>
                    <strong className="text-slate-700 font-mono font-bold">{currentSelectedSub.intelligenceId}</strong>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Client / Account Name</span>
                    <strong className="text-slate-700 font-extrabold">{currentSelectedSub.clientName}</strong>
                  </div>

                  <div className="flex flex-col gap-1 md:col-span-2">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Opportunity Title</span>
                    <p className="text-xs text-slate-600 font-semibold italic">"{currentSelectedSub.shortDesc}"</p>
                  </div>

                  <div className="flex flex-col gap-1 md:col-span-2">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Opportunity Details</span>
                    <div className="max-h-28 overflow-y-auto bg-white border border-slate-200/50 rounded-lg p-3 text-xs text-slate-600 italic leading-relaxed whitespace-pre-wrap">
                      "{currentSelectedSub.detailedDesc}"
                    </div>
                  </div>

                  {/* Contact Info (Separated!) */}
                  <div className="flex flex-col gap-1 md:col-span-2">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Contact Details</span>
                    {currentSelectedSub.hasContact ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-white border border-slate-200/40 p-3 rounded-lg">
                        <div className="flex items-center gap-2">
                          <PhoneCall size={14} className="text-slate-400" />
                          <div className="flex flex-col">
                            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Phone</span>
                            <span className="text-slate-700 font-mono font-bold">{currentSelectedSub.contactPhone || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail size={14} className="text-slate-400" />
                          <div className="flex flex-col">
                            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Email</span>
                            <span className="text-slate-700 font-mono font-bold">{currentSelectedSub.contactEmail || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-slate-50 text-slate-500 border border-slate-200 self-start">
                        No Direct Contacts Provided
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status History Logs */}
              <div className="border border-slate-100 rounded-xl p-5 flex flex-col gap-3">
                <span className="text-[10px] font-bold text-brand-navy tracking-wider uppercase block">
                  STATUS HISTORY & AUDIT LOG
                </span>
                <div className="flex flex-col gap-3">
                  {currentSelectedSub.statusHistory && currentSelectedSub.statusHistory.length > 0 ? (
                    currentSelectedSub.statusHistory.map((hist, idx) => (
                      <div key={idx} className="flex gap-3 text-xs">
                        <div className="flex flex-col items-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-blue-600 mt-1.5 flex-shrink-0" />
                          {idx !== currentSelectedSub.statusHistory.length - 1 && (
                            <div className="w-[1px] flex-1 bg-slate-200 my-1" />
                          )}
                        </div>
                        <div className="flex-1 pb-1">
                          <div className="flex justify-between items-center mb-0.5">
                            <strong className="text-slate-700 font-bold">{hist.status}</strong>
                            <span className="text-[9px] text-slate-400 font-mono">{new Date(hist.timestamp).toLocaleString()}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            Updated by: <span className="font-semibold text-slate-600">{hist.changedBy}</span>
                          </div>
                          {hist.comment && (
                            <div className="mt-1 bg-slate-50 p-2 rounded text-[10px] text-slate-500 italic border border-slate-100">
                              "{hist.comment}"
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-slate-400 text-xs font-semibold">
                      No status history available.
                    </div>
                  )}
                </div>
              </div>

              {/* Clarification Reply Section */}
              {currentSelectedSub.status === 'Clarification Requested' && (
                <div className="bg-purple-50/20 border border-purple-200 rounded-xl p-5 flex flex-col gap-4">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-purple-700 tracking-wider uppercase">
                    <span>💬</span>
                    <span>Reviewer Clarification Request</span>
                  </div>
                  
                  <div className="text-xs text-slate-700 italic bg-white p-3 rounded-lg border border-purple-100">
                    "{currentSelectedSub.reason}"
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); handleSendReply(currentSelectedSub); }} className="flex flex-col gap-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Your Response
                    </label>
                    <textarea
                      rows={3}
                      className={`w-full px-3.5 py-2.5 rounded-lg border text-xs transition-all focus:outline-none focus:ring-1 font-sans ${
                        replyError 
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                          : 'border-slate-200 focus:border-purple-500 focus:ring-purple-500/20'
                      }`}
                      placeholder="Type your response here to clarify the requested details..."
                      value={replyText}
                      onChange={(e) => {
                        setReplyText(e.target.value);
                        if (e.target.value.trim()) setReplyError('');
                      }}
                    />
                    {replyError && (
                      <span className="text-[10px] text-red-600 font-bold mt-1">⚠️ {replyError}</span>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmittingReply}
                      className="self-end px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer transition-all border-none"
                    >
                      {isSubmittingReply ? 'Sending Response...' : 'Submit Response'}
                    </button>
                  </form>
                </div>
              )}

            </div>

          </div>
        </div>
      )}
    </>
  );
}
