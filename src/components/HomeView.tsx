import React from 'react';
import type { Submission, Employee, EmailLog } from '../types.ts';
import { ROLE_MAP } from '../types.ts';
import { Database, RefreshCcw, ShieldCheck, Shield, Sparkles, Mail, PhoneCall, Clock, Download, Loader2, ClipboardList, Check, Target, FileText, Handshake, Trophy } from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import cityBg from '../assets/city_bg.jpg';

// Steps for the Lead Lifecycle Tracker
const LIFECYCLE_STEPS = [
  "Opportunity Registered",
  "Accepted",
  "Lead Registered",
  "Accepted ", // Space to ensure uniqueness if needed
  "Proposal",
  "Negotiation",
  "Deal Won"
];

// Helper to determine stepper status
const getStepStatus = (sub: Submission, stepIndex: number): 'completed' | 'active' | 'future' | 'failed' => {
  const status = sub.status;
  const isFailed = status === 'Closed - Not Valid' || status === 'Deal Lost' || status === 'Lead Dropped' || status === 'Lead Rejected';

  // Map current status to the stepper index (0-6)
  let currentStageIndex = -1;
  if (status === 'Clarification Requested') currentStageIndex = 0; // maintain stage 0 as active
  else if (status === 'Opportunity Registered') currentStageIndex = 0;
  else if (status === 'Validated') currentStageIndex = 1;
  else if (status === 'Closed - Not Valid') currentStageIndex = 1; // Failed at "Accepted" (Review)
  else if (status === 'Lead Registered') currentStageIndex = 2;
  else if (status === 'Lead Accepted') currentStageIndex = 3;
  else if (status === 'Lead Rejected') currentStageIndex = 3; // Failed at "Lead Accepted"
  else if (status === 'Lead Dropped') currentStageIndex = 4; // Passed "Lead Accepted", failed at Proposal
  else if (status === 'Proposal') currentStageIndex = 4;
  else if (status === 'Negotiation') currentStageIndex = 5;
  else if (status === 'Deal Lost') currentStageIndex = 6; // Passed "Negotiation", failed at Converted Won
  else if (status === 'Deal Won') currentStageIndex = 6;

  if (stepIndex < currentStageIndex) {
    return 'completed';
  }

  if (stepIndex === currentStageIndex) {
    if (isFailed) return 'failed';
    if (status === 'Deal Won') return 'completed';
    return 'active';
  }

  return 'future';
};

// Check if a review submission exceeds the 7 working days SLA
const isOverdue = (createdAtStr: string, status: string): boolean => {
  if (status !== 'Opportunity Registered') return false;
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
  return count > 7;
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
  
  const [isDownloadingExcel, setIsDownloadingExcel] = React.useState(false);
  const [isDownloadingPDF, setIsDownloadingPDF] = React.useState(false);

  const handleDownloadExcel = () => {
    setIsDownloadingExcel(true);
    setTimeout(() => {
      exportToExcel(mySubmissions, 'Submitter_Opportunities');
      setIsDownloadingExcel(false);
    }, 800);
  };

  const handleDownloadPDF = () => {
    setIsDownloadingPDF(true);
    setTimeout(() => {
      exportToPDF(mySubmissions, [
        { header: 'ID', dataKey: 'intelligenceId' },
        { header: 'Client Name', dataKey: 'clientName' },
        { header: 'Opportunity Title', dataKey: 'shortDesc' },
        { header: 'Status', dataKey: 'status' },
        { header: 'Sales Stage', dataKey: 'salesStage' }
      ], 'Submitter_Opportunities');
      setIsDownloadingPDF(false);
    }, 800);
  };
  const [isProfileExpanded, setIsProfileExpanded] = React.useState(false);

  React.useEffect(() => {
    if (!showModal) {
      setReplyText('');
      setReplyError('');
      setIsProfileExpanded(false);
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
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 5;

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Filtered and sorted user submissions (latest first for easy tracking)
  const mySubmissions = rawMySubmissions
    .filter(s => {
      if (statusFilter === 'All') return true;
      if (statusFilter === 'Under Review') return s.status === 'Opportunity Registered';
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
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Statistics calculation for Welcome Card Banner
  const overdueReviewCount = rawMySubmissions.filter(s => s.status === 'Opportunity Registered' && isOverdue(s.createdAt, s.status)).length;
  const crmSyncPendingCount = rawMySubmissions.filter(s => !s.crmLeadId).length;
  const activeProposalsCount = rawMySubmissions.filter(s => s.status === 'Opportunity Registered' || s.status === 'Proposal' || s.status === 'Negotiation').length;
  const winRatioText = (() => {
    const closedLeads = rawMySubmissions.filter(s => s.status.startsWith('Closed') || s.status === 'Lead Dropped');
    if (closedLeads.length === 0) return '100%';
    const wonLeads = closedLeads.filter(s => s.status === 'Deal Won').length;
    return `${((wonLeads / closedLeads.length) * 100).toFixed(0)}%`;
  })();

  // Statistics calculation for Stat Cards Row
  const totalLeadsCount = rawMySubmissions.length;
  const underReviewTotal = rawMySubmissions.filter(s => s.status === 'Opportunity Registered').length;
  const crmSyncedCount = rawMySubmissions.filter(s => !!s.crmLeadId).length;
  const convertedTotal = rawMySubmissions.filter(s => s.status === 'Deal Won').length;
  const unreadCount = notifications.filter(n => !n.read).length;

  const currentSelectedSub = mySubmissions.find(s => s.intelligenceId === selectedSubId) || null;

  return (
    <>
      {/* Welcome Card Banner (Matches Screenshot) */}
      <div className="relative rounded-2xl shadow-2xl mb-6 overflow-hidden bg-[#0B112B]">
        
        {/* Top half: City Image */}
        <div className="h-[220px] w-full relative">
          <img src={cityBg} alt="City Skyline" className="w-full h-full object-cover object-center opacity-100" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B112B] to-transparent opacity-80" />
        </div>

        {/* Content Container (Pushed up to overlap image) */}
        <div className="relative z-10 px-8 pb-8 md:px-10 md:pb-10 -mt-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            
            {/* Left Column: Employee Profile */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              
              {/* Header: Avatar + Name/Role */}
              <div className="flex flex-row items-center gap-6">
                <div className="w-[100px] h-[100px] rounded-2xl bg-[#3B82F6] text-white font-black text-4xl flex items-center justify-center relative flex-shrink-0 shadow-lg">
                {loggedInUser.name.charAt(0)}{loggedInUser.name.split(' ')[1]?.charAt(0) || ''}
                <div className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-emerald-500 border-2 border-[#0B112B] rounded-full"></div>
              </div>
              
              <div className="flex flex-col">
                <h2 className="text-[28px] font-bold text-white tracking-tight leading-tight">
                  {loggedInUser.name.split(' (')[0]}.
                </h2>
                <span className="text-[13px] text-blue-300 font-semibold mt-1">
                  {loggedInUser.designation || ROLE_MAP[loggedInUser.email.toLowerCase()]?.designation || 'Tech Lead'} · {loggedInUser.businessUnit}
                </span>
              </div>
            </div>

            {/* Employee Details Grid */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-5 bg-transparent border border-slate-700/50 rounded-xl p-5">
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Employee ID</span>
                <span className="text-white font-bold font-mono text-[13px]">{loggedInUser.employeeId}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Corporate Email</span>
                <a href={`mailto:${loggedInUser.email}`} className="text-blue-300 font-bold hover:text-blue-200 transition-colors truncate text-[13px]">{loggedInUser.email}</a>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Job Role</span>
                <span className="text-white font-semibold text-[13px]">{loggedInUser.jobRole || 'Not Specified'}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Phone Number</span>
                <span className="text-white font-semibold text-[13px]">{loggedInUser.phoneNumber || 'Not Specified'}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Reporting Manager</span>
                <span className="text-white font-semibold text-[13px]">{loggedInUser.reportingManager}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Project Manager</span>
                <span className="text-white font-semibold text-[13px]">{loggedInUser.projectManager || 'Kiran Joseph (kiran.j@nestdigital.com)'}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">BU Head</span>
                <span className="text-white font-semibold text-[13px]">{loggedInUser.buHead || 'Suresh Nair (suresh.n@nestdigital.com)'}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">HR Business Partner</span>
                <span className="text-white font-semibold text-[13px]">{loggedInUser.hrbp || 'Not Specified'}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sales Person</span>
                <span className="text-white font-semibold text-[13px]">{loggedInUser.salesPerson || 'Jacob Varghese (jacob.varghese@nestdigital.com)'}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Actions & Stats */}
          <div className="lg:col-span-5 flex flex-col gap-6 mt-2">
            
            {/* Action Buttons */}
            <div className="flex gap-4">
              <button 
                onClick={() => navigate('/submit')}
                className="flex-1 py-3.5 px-5 rounded-xl bg-[#DC2626] hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                📄 Submit New Lead
              </button>
              <button 
                onClick={() => navigate('/outbox')}
                className="flex-1 py-3.5 px-5 rounded-xl bg-[#1E293B] hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                📧 Outbox Logs
              </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-transparent border border-slate-700/50 rounded-xl p-4 flex flex-col gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Review Overdue</span>
                <span className="text-xl font-bold text-red-500">{overdueReviewCount}</span>
              </div>
              <div className="bg-transparent border border-slate-700/50 rounded-xl p-4 flex flex-col gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Awaiting CRM Sync</span>
                <span className="text-xl font-bold text-blue-400">{crmSyncPendingCount}</span>
              </div>
              <div className="bg-transparent border border-slate-700/50 rounded-xl p-4 flex flex-col gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Active Proposals</span>
                <span className="text-xl font-bold text-amber-400">{activeProposalsCount}</span>
              </div>
              <div className="bg-transparent border border-slate-700/50 rounded-xl p-4 flex flex-col gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Win Ratio</span>
                <span className="text-xl font-bold text-emerald-400">{winRatioText}</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>

      {/* Stats Cards Row (Matches Screenshot) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up animation-delay-200 mb-6">
        
        {/* Total Leads Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between border-l-4 border-l-blue-500 relative">
          <div className="absolute top-4 right-4 text-slate-300 border border-slate-100 rounded-lg p-1.5 bg-slate-50">
            <Database size={16} />
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Leads</span>
          <span className="text-4xl font-extrabold text-brand-navy leading-none mt-2 mb-2">{totalLeadsCount}</span>
          <span className="text-[10px] font-bold text-blue-600 tracking-wide">+12% MoM</span>
        </div>

        {/* Under Review Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between border-l-4 border-l-brand-red relative">
          <div className="absolute top-4 right-4 text-slate-300 border border-slate-100 rounded-lg p-1.5 bg-slate-50">
            <Shield size={16} />
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Opportunity Registered</span>
          <span className="text-4xl font-extrabold text-brand-navy leading-none mt-2 mb-2">{underReviewTotal}</span>
          <span className="text-[10px] font-bold text-brand-red tracking-wide">{overdueReviewCount} overdue</span>
        </div>

        {/* CRM Synced Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between border-l-4 border-l-orange-500 relative">
          <div className="absolute top-4 right-4 text-slate-300 border border-slate-100 rounded-lg p-1.5 bg-slate-50">
            <RefreshCcw size={16} />
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">CRM Synced</span>
          <span className="text-4xl font-extrabold text-brand-navy leading-none mt-2 mb-2">{crmSyncedCount}</span>
          <span className="text-[10px] font-bold text-orange-500 tracking-wide">100% sync rate</span>
        </div>

        {/* Converted Won Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between border-l-4 border-l-emerald-500 relative">
          <div className="absolute top-4 right-4 text-slate-300 border border-slate-100 rounded-lg p-1.5 bg-slate-50">
            <ShieldCheck size={16} />
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Converted Won</span>
          <span className="text-4xl font-extrabold text-brand-navy leading-none mt-2 mb-2">{convertedTotal}</span>
          <span className="text-[10px] font-bold text-emerald-600 tracking-wide">Won Ratio: {winRatioText}</span>
        </div>
      </div>

      {/* Lead Lifecycle Tracker (Matches Screenshot) */}
      <div className="bg-white rounded-xl border border-black p-8 shadow-sm transition-all duration-300 mb-6">
        <div className="flex justify-between items-end mb-6">
          <div className="flex flex-col gap-1">
            <h3 className="text-xs font-extrabold text-brand-navy uppercase tracking-widest flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-red"></span>
              LEAD LIFECYCLE TRACKING
            </h3>
            <div className="mt-3">
              <select 
                className="text-xs font-bold border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 text-slate-700 focus:outline-none focus:border-brand-navy cursor-pointer transition-colors hover:border-slate-300 w-80 max-w-full"
                value={selectedSubId || ''}
                onChange={(e) => setSelectedSubId(e.target.value)}
              >
                <option value="" disabled>Select an opportunity to track...</option>
                {mySubmissions.map(sub => (
                  <option key={sub.intelligenceId} value={sub.intelligenceId}>
                    {sub.intelligenceId} — {sub.clientName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {selectedSubId ? (
            <span className="text-[11px] font-semibold text-slate-400">
              {(() => {
                const sub = mySubmissions.find(s => s.intelligenceId === selectedSubId);
                if (!sub) return '0%';
                if (sub.status.startsWith('Closed')) return '100% Complete';
                if (sub.status === 'Negotiation') return '85% Complete';
                if (sub.status === 'Proposal') return '70% Complete';
                if (sub.status === 'Lead Accepted') return '55% Complete';
                if (sub.status === 'Lead Registered') return '40% Complete';
                if (sub.status === 'Validated') return '25% Complete';
                if (sub.status === 'Opportunity Registered') return '10% Complete';
                return '0% Complete';
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
                <div className="flex items-center justify-between w-full relative px-6 mt-12 mb-8">
                  {LIFECYCLE_STEPS.map((step, idx) => {
                    const status = getStepStatus(selectedSub, idx);
                    let circleMarkup;

                    // Icon selection logic
                    const StepIcon = (() => {
                      if (idx === 6 && (status === 'completed' || status === 'active')) {
                        return Check; // Convert to tick icon when reaching final step
                      }
                      switch (idx) {
                        case 0: return Target; // Opportunity
                        case 1: return Check;  // Accepted
                        case 2: return ClipboardList; // Lead Registered
                        case 3: return Check;  // Accepted
                        case 4: return FileText; // Proposal
                        case 5: return Handshake; // Negotiation
                        case 6: return Trophy; // Converted Won (Fallback if not active/completed)
                        default: return Check;
                      }
                    })();

                    if (status === 'completed' || status === 'active') {
                      circleMarkup = (
                        <div className="relative flex items-center justify-center z-10">
                          {status === 'active' && <div className="absolute w-16 h-16 rounded-full bg-emerald-500/30 animate-pulse" />}
                          <div className="relative w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-[0_4px_16px_rgba(5,150,105,0.4)] ring-4 ring-emerald-50">
                            <StepIcon size={20} strokeWidth={2.5} />
                          </div>
                        </div>
                      );
                    } else if (status === 'failed') {
                      circleMarkup = (
                        <div className="relative flex items-center justify-center z-10">
                          <div className="w-12 h-12 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-[0_4px_16px_rgba(225,29,72,0.4)] ring-4 ring-rose-50">
                            <span className="text-xl font-bold">✕</span>
                          </div>
                        </div>
                      );
                    } else {
                      circleMarkup = (
                        <div className="w-12 h-12 rounded-full border-2 border-slate-100 bg-white text-slate-300 flex items-center justify-center z-10">
                          <StepIcon size={20} strokeWidth={2} />
                        </div>
                      );
                    }

                    const isLast = idx === LIFECYCLE_STEPS.length - 1;
                    const nextStatus = isLast ? null : getStepStatus(selectedSub, idx + 1);
                    
                    let lineStyle = 'bg-slate-100/60';
                    if (status === 'completed' && nextStatus === 'completed') {
                      lineStyle = 'bg-emerald-600';
                    } else if (status === 'completed' && nextStatus === 'failed') {
                      lineStyle = 'bg-rose-500';
                    } else if (status === 'completed' && nextStatus === 'active') {
                      lineStyle = 'bg-emerald-600'; // If the current is completed, and next is active, line between them is green
                    } else if (status === 'active' && nextStatus !== 'failed') {
                      lineStyle = 'bg-orange-400 animate-pulse'; // progressing line
                    }

                    return (
                      <React.Fragment key={idx}>
                        <div className="flex flex-col items-center gap-4 relative w-12">
                          {circleMarkup}
                          <span className={`text-[10px] font-bold text-center w-28 absolute top-16 leading-tight ${
                            (status === 'completed' || status === 'active') ? 'text-slate-600' : (status === 'failed' ? 'text-rose-600' : 'text-slate-400')
                          }`}>
                            {status === 'failed' ? (
                              step === 'Deal Won' ? 'Deal Lost' :
                              step.includes('Accepted') ? 'Rejected' : 'Dropped'
                            ) : step}
                          </span>
                        </div>
                        {!isLast && (
                          status === 'active' && nextStatus !== 'failed' ? (
                            <div className="flex-1 h-[2px] -mt-6 mx-2 flex">
                              <div className="w-1/2 h-full bg-orange-400 animate-pulse" />
                              <div className="w-1/2 h-full bg-slate-100/60" />
                            </div>
                          ) : (
                            <div className={`flex-1 h-[2px] -mt-6 mx-2 ${lineStyle}`} />
                          )
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Review Deadline Warning Chip */}
                <div className="flex items-center gap-2 mt-20 px-4 py-2 rounded-lg bg-amber-50 text-amber-700 text-[10px] font-bold self-start max-w-fit border border-amber-100">
                  <span className="text-xs">⚠️</span>
                  <span>Acknowledgment due within 7 working days — Review Deadline active</span>
                </div>
              </>
            );
          })()
        ) : (
          <div className="text-center py-12 text-slate-400 text-xs font-bold border border-dashed border-gray-200 rounded-xl bg-slate-50/50">
            Select an opportunity from the dropdown above to view its lifecycle.
          </div>
        )}
      </div>

      {/* Full-width Submissions Table */}
      <div className="flex flex-col gap-6 min-w-0 animate-fade-in-up animation-delay-300">
        <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black p-8 overflow-x-auto scrollbar-thin scrollbar-thumb-brand-navy scrollbar-track-gray-50">

          {/* Table Header Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <h3 className="text-sm font-extrabold text-brand-navy tracking-widest uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              OPPORTUNITY REQUESTS
            </h3>

            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                <input
                  type="text"
                  placeholder="Search leads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200/60 rounded-lg text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all w-48 font-medium"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200/60 rounded-lg text-sm outline-none focus:border-blue-400 cursor-pointer text-gray-600 font-bold"
              >
                <option value="All">All Status</option>
                <option value="Under Review">Pending Review</option>
                <option value="Clarification Requested">More Info Needed</option>
                <option value="Validated">Validated</option>
                <option value="Active">Active Pipeline</option>
                <option value="Closed">Closed / Terminal</option>
              </select>
              <div className="flex items-center gap-2 mr-2">
                <button
                  onClick={handleDownloadExcel}
                  disabled={isDownloadingExcel}
                  className="px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-lg shadow-sm hover:bg-emerald-100 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-70 disabled:cursor-wait"
                  title="Export to Excel"
                >
                  {isDownloadingExcel ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  <span className="text-xs font-bold">{isDownloadingExcel ? 'Downloading...' : 'Excel'}</span>
                </button>
                <button
                  onClick={handleDownloadPDF}
                  disabled={isDownloadingPDF}
                  className="px-3 py-2 bg-rose-50 text-rose-700 border border-rose-200/60 rounded-lg shadow-sm hover:bg-rose-100 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-70 disabled:cursor-wait"
                  title="Export to PDF"
                >
                  {isDownloadingPDF ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  <span className="text-xs font-bold">{isDownloadingPDF ? 'Downloading...' : 'PDF'}</span>
                </button>
              </div>
              <button 
                onClick={() => navigate('/submit')}
                className="px-4 py-2 bg-brand-navy text-white text-sm font-bold rounded-lg shadow-sm hover:brightness-110 transition-all cursor-pointer border-none"
              >
                + New Lead
              </button>
            </div>
          </div>

          <table className="w-full border-collapse text-left table-auto" style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif" }}>
            <thead>
              <tr className="bg-brand-red text-white font-extrabold uppercase tracking-wider text-[11px] whitespace-nowrap">
                <th className="px-3.5 py-3.5 rounded-tl-xl">Impact ID</th>
                <th className="px-3 py-3.5">Client Name</th>
                <th className="px-3 py-3.5">Opportunity Title</th>
                <th className="px-3 py-3.5">Status</th>
                <th className="px-3 py-3.5">Sales System Sync</th>
                <th className="px-3 py-3.5">Submitted Date</th>
                <th className="px-3 py-3.5">Sales Stage</th>
                <th className="px-3 py-3.5 rounded-tr-xl">Action</th>
              </tr>
            </thead>
            <tbody className="font-semibold text-[13px]">
              {mySubmissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-gray-400 font-medium text-sm">
                    No submissions registered yet.
                  </td>
                </tr>
              ) : (
                mySubmissions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((sub, idx) => {
                  const isSubOverdue = isOverdue(sub.createdAt, sub.status);
                  const isSelected = selectedSubId === sub.intelligenceId;
                  const isClosed = sub.status.startsWith('Closed');

                  // Map status badge text and colors
                  let statusLabel: string = sub.status;
                  let statusBadgeStyles = 'text-gray-500';

                  if (sub.status === 'Opportunity Registered') {
                    statusLabel = 'Pending Review';
                    statusBadgeStyles = 'text-amber-600';
                  } else if (sub.status === 'Clarification Requested') {
                    statusLabel = 'More Info Needed';
                    statusBadgeStyles = 'text-purple-600';
                  } else if (sub.status === 'Validated') {
                    statusLabel = 'Validated';
                    statusBadgeStyles = 'text-emerald-600';
                  } else if (sub.status === 'Closed - Not Valid') {
                    statusLabel = 'Rejected';
                    statusBadgeStyles = 'text-rose-600';
                  } else if (sub.status === 'Deal Won') {
                    statusLabel = 'Deal Won';
                    statusBadgeStyles = 'text-emerald-600 bg-emerald-50';
                  } else if (sub.status === 'Deal Lost') {
                    statusLabel = 'Deal Lost';
                    statusBadgeStyles = 'text-rose-600 bg-rose-50';
                  } else if (sub.status === 'Lead Dropped') {
                    statusLabel = 'Dropped';
                    statusBadgeStyles = 'text-slate-500 bg-slate-100';
                  } else if (sub.status === 'Lead Rejected') {
                    statusLabel = 'Rejected';
                    statusBadgeStyles = 'text-rose-600 bg-rose-50';
                  } else if (isClosed) {
                    statusLabel = 'Closed';
                    statusBadgeStyles = 'text-slate-500';
                  } else {
                    statusLabel = 'Sent to Sales Team';
                    statusBadgeStyles = 'text-blue-600';
                  }

                  return (
                    <tr
                      key={sub.intelligenceId}
                      onClick={() => setSelectedSubId(sub.intelligenceId)}
                      className={`cursor-pointer transition-all duration-200 border-b border-gray-100/80 group relative
                        ${isSelected 
                          ? 'bg-blue-50/50' 
                          : idx % 2 === 1 
                            ? 'bg-[#F4F6FA]/80 hover:bg-[#EAEDF2]' 
                            : 'bg-white hover:bg-slate-50/60'
                        }
                      `}
                    >
                      <td className="px-3.5 py-3.5 font-bold font-mono text-brand-navy relative whitespace-nowrap">
                        {isSelected && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-500" />}
                        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="inline-flex px-2 py-0.5 font-mono text-[13px] font-bold bg-slate-50 border border-slate-200/50 text-brand-navy rounded-md">
                          {sub.intelligenceId}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 font-extrabold text-slate-900 text-[14px] whitespace-normal max-w-[120px] break-words">{sub.clientName}</td>
                      <td className="px-3 py-3.5 text-slate-600 font-medium text-[13px] whitespace-normal max-w-[180px] break-words">{sub.shortDesc}</td>

                      <td className="px-3 py-3.5 whitespace-nowrap">
                        <span className={`text-[11px] font-extrabold uppercase tracking-wider ${statusBadgeStyles}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        {sub.crmLeadId ? (
                          <div className="inline-flex items-center gap-1.5 text-emerald-600 text-[11px] font-bold uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Synced
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                            Awaiting Review
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-3.5 text-slate-700 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-slate-800 text-[13px]">{new Date(sub.createdAt).toLocaleDateString()}</span>
                          <span className="text-[11px] text-slate-500 font-semibold">{new Date(sub.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                        </div>
                        {isSubOverdue && (
                          <span className="mt-1 inline-flex items-center gap-1 bg-brand-red/10 text-brand-red border border-red-200/30 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm" title="Overdue SLA">
                            ⚠️ Overdue
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3.5 whitespace-nowrap">
                        {sub.status === 'Opportunity Registered' || sub.status.startsWith('Closed') ? (
                          <span className="text-slate-400 italic font-normal text-[13px] whitespace-nowrap">N/A</span>
                        ) : (
                          <span className="font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/50 text-[11px] uppercase whitespace-nowrap">{sub.status}</span>
                        )}
                      </td>
                      <td className="px-3.5 py-3.5 whitespace-nowrap">
                        <div className="relative inline-block">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSubId(sub.intelligenceId);
                              setShowModal(true);
                            }}
                            className="px-3.5 py-1 bg-brand-navy hover:bg-brand-navy/90 text-white font-bold text-[12px] rounded-lg transition-all cursor-pointer shadow-sm active:scale-95"
                          >
                            View
                          </button>
                          {sub.status === 'Clarification Requested' && (
                            <span className="absolute -top-1.5 -right-1.5 bg-green-500 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center border-2 border-white animate-bounce shadow-sm" title="Action required">
                              1
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {mySubmissions.length > itemsPerPage && (
            <div className="flex items-center justify-between border-t border-slate-200 mt-6 pt-4 px-2">
              <div className="text-xs text-slate-500 font-medium">
                Showing <span className="font-bold text-brand-navy">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-brand-navy">{Math.min(currentPage * itemsPerPage, mySubmissions.length)}</span> of <span className="font-bold text-brand-navy">{mySubmissions.length}</span> results
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.ceil(mySubmissions.length / itemsPerPage) }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i + 1)}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${currentPage === i + 1 ? 'bg-brand-navy text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(mySubmissions.length / itemsPerPage), p + 1))}
                  disabled={currentPage === Math.ceil(mySubmissions.length / itemsPerPage)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Employee Opportunity Detail / Clarification Modal */}
      {showModal && currentSelectedSub && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl flex flex-col border border-slate-100 overflow-hidden my-8 animate-fadeIn max-h-[80vh]">

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
            <div className="p-6 overflow-y-auto flex flex-col gap-5 max-h-[calc(80vh-100px)]">

              {/* SECTION 3 — SLA Status Banner */}
              {(() => {
                const isSubOverdue = isOverdue(currentSelectedSub.createdAt, currentSelectedSub.status);
                const isUnderReview = currentSelectedSub.status === 'Opportunity Registered' || currentSelectedSub.status === 'Clarification Requested';
                
                if (isUnderReview) {
                  if (isSubOverdue) {
                    const createdDate = new Date(currentSelectedSub.createdAt);
                    const currentDate = new Date("2026-07-01T12:19:57+05:30");
                    const diffTime = Math.max(0, currentDate.getTime() - createdDate.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return (
                      <div className="bg-[#FEF3C7] border border-amber-200 text-amber-800 p-3.5 rounded-xl flex items-center gap-2 text-xs font-bold shadow-sm">
                        <span className="text-sm">⚠️</span>
                        <span>Acknowledgment overdue — submission pending review for {diffDays} days. Immediate action required.</span>
                      </div>
                    );
                  } else {
                    const dueDate = new Date(new Date(currentSelectedSub.createdAt).getTime() + 7 * 24 * 60 * 60 * 1000);
                    return (
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl flex items-center gap-2 text-xs font-bold shadow-sm">
                        <span>🟢</span>
                        <span>Within SLA — acknowledgment due by {dueDate.toLocaleDateString([], { day: 'numeric', month: 'numeric', year: 'numeric' })}</span>
                      </div>
                    );
                  }
                } else {
                  const reviewDate = currentSelectedSub.updatedAt ? new Date(currentSelectedSub.updatedAt) : new Date();
                  return (
                    <div className="bg-slate-100 border border-slate-200 text-slate-600 p-3.5 rounded-xl flex items-center gap-2 text-xs font-bold shadow-sm">
                      <span>✅</span>
                      <span>SLA met — reviewed on {reviewDate.toLocaleDateString([], { day: 'numeric', month: 'numeric', year: 'numeric' })}</span>
                    </div>
                  );
                }
              })()}

              {/* SECTION 1 — Submission Overview */}
              <div className="bg-[#F5F6FA] border border-slate-150 rounded-xl p-5 flex flex-col gap-4">
                <span className="text-[10px] font-bold text-brand-navy tracking-wider uppercase block">
                  SUBMISSION OVERVIEW
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Impact ID</span>
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

                  {/* Contact Info */}
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

                  {/* ADDED SUBMITTER DETAILS */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Submitted By</span>
                    <strong className="text-slate-700 font-bold">Shinto Sebastian (ND-10042)</strong>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Submitted On</span>
                    <strong className="text-slate-700 font-bold">
                      {new Date(currentSelectedSub.createdAt).toLocaleDateString([], { day: 'numeric', month: 'numeric', year: 'numeric' })} at {new Date(currentSelectedSub.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                    </strong>
                  </div>
                </div>
              </div>

              {/* SECTION 2 — Submitter Profile (collapsible) */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <button
                  onClick={() => setIsProfileExpanded(!isProfileExpanded)}
                  className="w-full px-5 py-3 bg-[#F8FAFC] hover:bg-slate-100/70 flex justify-between items-center text-xs font-bold text-brand-navy border-none transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2 text-brand-navy">
                    <span>👤</span> Submitter Profile {isProfileExpanded ? '▲' : '▼'}
                  </span>
                </button>
                {isProfileExpanded && (
                  <div className="p-5 border-t border-slate-100 bg-white grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Business Unit</span>
                      <strong className="text-slate-700 font-semibold">Digital Transformation Unit (DTU)</strong>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Reporting Manager</span>
                      <strong className="text-slate-700 font-semibold">Arun Kumar (arun.k@nestdigital.com)</strong>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Project Manager</span>
                      <strong className="text-slate-700 font-semibold">Kiran Joseph (kiran.j@nestdigital.com)</strong>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">BU Head</span>
                      <strong className="text-slate-700 font-semibold">Suresh Nair (suresh.n@nestdigital.com)</strong>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">HRBP</span>
                      <strong className="text-slate-700 font-semibold">Deepa Menon (deepa.m@nestdigital.com)</strong>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Sales Person</span>
                      <strong className="text-slate-700 font-semibold">Jacob Varghese (jacob.v@nestdigital.com)</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 4 — CRM Information */}
              {['Sent to Sales Team', 'CRM Synced', 'Lead Registered', 'Lead Accepted', 'Opportunity Registered', 'Proposal', 'Negotiation', 'Deal Won'].includes(currentSelectedSub.status) && (
                <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm flex flex-col gap-4">
                  <span className="text-[10px] font-extrabold text-brand-navy tracking-wider uppercase block">
                    🔗 CRM INTEGRATION DETAILS
                  </span>
                  {currentSelectedSub.crmLeadId ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">CRM Reference ID</span>
                        <div>
                          <span className="font-mono bg-blue-50 text-brand-navy border border-blue-100 px-2 py-0.5 rounded text-[10.5px] font-bold">
                            {currentSelectedSub.crmLeadId}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">CRM Stage</span>
                        <div>
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-500/10 text-blue-700 border border-blue-200/30 uppercase tracking-wide">
                            {currentSelectedSub.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Sync Status</span>
                        <div className="flex items-center gap-1.5 font-bold text-emerald-600">
                          <span>🟢</span> Synced with Dynamics 365
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Last Synced</span>
                        <strong className="text-slate-700 font-medium">{new Date(currentSelectedSub.updatedAt).toLocaleString()}</strong>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">CRM Reference ID</span>
                        <span className="text-slate-400 italic">Not Assigned</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">CRM Stage</span>
                        <span className="text-slate-400 italic">Pending Sync</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Sync Status</span>
                        <div className="flex items-center gap-1.5 font-bold text-rose-500">
                          <span>🔴</span> Sync Pending
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Last Synced</span>
                        <span className="text-slate-400 italic">N/A</span>
                      </div>
                      <div className="md:col-span-2 mt-2 bg-slate-50 border border-slate-200/50 p-3 rounded-lg text-slate-500 italic">
                        CRM record not yet created — awaiting validation
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 5 — Clarification / Rejection / Review Info Section */}
              {(() => {
                const status = currentSelectedSub.status as string;
                const reviewerName = "Arun Kumar (Delivery Head)";
                const updateDate = currentSelectedSub.updatedAt ? new Date(currentSelectedSub.updatedAt).toLocaleDateString([], { day: 'numeric', month: 'numeric', year: 'numeric' }) : 'N/A';

                if (status === 'Clarification Requested' || status === 'More Info Needed') {
                  return (
                    <div className="bg-[#FEF9C3] border border-yellow-300 rounded-xl p-5 flex flex-col gap-4">
                      <div className="flex items-center justify-between text-yellow-800 font-extrabold text-[10px] tracking-wider uppercase">
                        <span className="flex items-center gap-1.5">
                          <span>💬</span> CLARIFICATION REQUESTED
                        </span>
                        <span className="text-[9px] text-yellow-700 font-mono font-medium">
                          Sent: {currentSelectedSub.updatedAt ? new Date(currentSelectedSub.updatedAt).toLocaleString() : 'N/A'}
                        </span>
                      </div>

                      <div className="text-xs text-slate-700 italic bg-white p-3 rounded-lg border border-yellow-200/65 leading-relaxed">
                        Message from <span className="font-bold text-slate-800">{reviewerName}</span>: "{currentSelectedSub.reason || 'Please provide more details regarding client contacts and budget.'}"
                      </div>

                      <form onSubmit={(e) => { e.preventDefault(); handleSendReply(currentSelectedSub); }} className="flex flex-col gap-3">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Your Response
                        </label>
                        <textarea
                          rows={3}
                          className={`w-full px-3.5 py-2.5 rounded-lg border text-xs transition-all focus:outline-none focus:ring-1 font-sans ${replyError
                              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                              : 'border-slate-200 focus:border-yellow-500 focus:ring-yellow-500/20'
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
                          className="self-end px-5 py-2.5 bg-brand-navy hover:bg-brand-navy/90 disabled:bg-slate-400 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer transition-all border-none"
                        >
                          {isSubmittingReply ? 'Sending Response...' : 'Send Response'}
                        </button>
                      </form>
                    </div>
                  );
                }

                if (status === 'Closed - Not Valid' || status === 'Deal Lost' || status === 'Lead Dropped') {
                  return (
                    <div className="bg-[#FEE2E2] border border-red-200 rounded-xl p-5 flex flex-col gap-3">
                      <span className="text-[10px] font-extrabold text-red-700 tracking-wider uppercase block">
                        ❌ REJECTION / CLOSURE REASON
                      </span>
                      <p className="text-[11px] text-slate-500 font-semibold">
                        Reviewed by: <span className="font-bold text-slate-700">{reviewerName}</span> on {updateDate}
                      </p>
                      <div className="bg-white border-l-4 border-red-500 p-3 rounded-r-lg text-xs text-slate-700 font-medium italic border border-slate-100 border-l-none">
                        "{currentSelectedSub.reason || 'This lead does not meet minimum budget threshold criteria.'}"
                      </div>
                    </div>
                  );
                }

                if (status === 'Opportunity Registered' || status === 'Pending Review') {
                  return (
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs font-medium text-blue-700 flex items-center gap-2">
                      <span>⏳</span>
                      <span>This submission is currently under review. You will be notified once a decision is made.</span>
                    </div>
                  );
                }

                return null;
              })()}

              {/* SECTION 6 — Status History & Audit Log */}
              <div className="border border-slate-150 rounded-xl p-5 flex flex-col gap-4 bg-[#F8FAFC]/50">
                <span className="text-[10px] font-extrabold text-brand-navy tracking-wider uppercase block">
                  STATUS HISTORY & AUDIT LOG
                </span>

                <div className="relative pl-6 flex flex-col gap-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200/80">
                  {/* First entry: always Submitted by Shinto Sebastian */}
                  {(() => {
                    const firstDate = new Date(currentSelectedSub.createdAt);
                    const formattedDate = firstDate.toLocaleDateString([], { day: 'numeric', month: 'numeric', year: 'numeric' });
                    const formattedTime = firstDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

                    return (
                      <div className="flex justify-between items-start gap-4 text-xs relative">
                        {/* Dot container */}
                        <div className="absolute -left-[20px] top-0.5 w-[10px] h-[10px] rounded-full bg-slate-400 border-2 border-white ring-2 ring-slate-100 flex-shrink-0" />
                        <div>
                          <strong className="text-slate-800 font-extrabold text-[13px] block">Submitted</strong>
                          <span className="text-slate-400 font-semibold text-[11px]">
                            by Shinto Sebastian (Employee)
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-bold whitespace-nowrap">
                          {formattedDate} at {formattedTime}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Dynamic entries based on actual statusHistory */}
                  {currentSelectedSub.statusHistory && currentSelectedSub.statusHistory.filter(hist => hist.status !== 'Opportunity Registered' || hist.changedBy !== 'System').map((hist, idx) => {
                    // Dot helper
                    const getDotStyle = (st: string) => {
                      if (['Validated', 'Lead Registered', 'Lead Accepted', 'Opportunity Registered', 'Proposal', 'Negotiation', 'Deal Won', 'CRM Synced', 'Synced'].includes(st)) {
                        return { bg: 'bg-emerald-500', icon: '✓' };
                      }
                      if (['Closed - Not Valid', 'Deal Lost', 'Lead Dropped'].includes(st)) {
                        return { bg: 'bg-rose-500', icon: '✕' };
                      }
                      if (['Clarification Requested', 'More Info Needed'].includes(st)) {
                        return { bg: 'bg-amber-500', icon: '💬' };
                      }
                      return { bg: 'bg-slate-400', icon: '●' };
                    };
                    
                    const getRole = (name: string) => {
                      if (name.includes("Shinto")) return "Employee";
                      if (name.includes("Arun")) return "Delivery Head";
                      if (name.includes("Kiran")) return "Project Manager";
                      if (name.includes("Suresh")) return "BU Head";
                      if (name.includes("Deepa")) return "HRBP";
                      if (name.includes("Jacob")) return "Sales Person";
                      return "Reviewer";
                    };

                    const style = getDotStyle(hist.status);
                    const role = getRole(hist.changedBy);
                    const formattedDate = new Date(hist.timestamp).toLocaleDateString([], { day: 'numeric', month: 'numeric', year: 'numeric' });
                    const formattedTime = new Date(hist.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

                    return (
                      <div key={idx} className="flex justify-between items-start gap-4 text-xs relative">
                        {/* Dot container */}
                        <div className={`absolute -left-[21px] top-0.5 w-[12px] h-[12px] rounded-full ${style.bg} border-2 border-white ring-2 ring-slate-100 flex items-center justify-center text-white text-[7px] font-bold flex-shrink-0`} title={hist.status}>
                          {style.icon === '●' ? '' : style.icon}
                        </div>
                        <div>
                          <strong className="text-slate-800 font-extrabold text-[13px] block">{hist.status}</strong>
                          <span className="text-slate-400 font-semibold text-[11px]">
                            by {hist.changedBy} ({role})
                          </span>
                          {hist.comment && (
                            <div className="mt-1 bg-white p-2.5 rounded border border-slate-200/40 text-[10.5px] text-slate-500 italic max-w-md">
                              "{hist.comment}"
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 font-bold whitespace-nowrap">
                          {formattedDate} at {formattedTime}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}
    </>
  );
}
