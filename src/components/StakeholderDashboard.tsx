import React, { useState, useEffect } from 'react';
import type { Submission, EmailLog, Employee } from '../types.ts';
import { triggerMailer, formatDateTime } from '../utils.ts';
import { 
  Eye, CheckCircle2, XCircle, AlertTriangle, Clock, Building, Landmark, RefreshCcw, 
  User, Database, Mail, ArrowRight, Shield, MessageSquare, Search, Download, Loader2,
  Award, Trophy, Star, Gift, Sparkles, ClipboardList, Check, Target, FileText, Handshake, ChevronUp, ChevronDown
} from 'lucide-react';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { ROLE_MAP } from '../types.ts';

// Steps for the Lead Lifecycle Tracker
const LIFECYCLE_STEPS = [
  "Opportunity Registered",
  "Accepted",
  "Lead Registered",
  "Accepted ", // Space to ensure uniqueness
  "Proposal",
  "Negotiation",
  "Deal Won"
];

// Helper to determine stepper status
const getStepStatus = (sub: Submission, stepIndex: number): 'completed' | 'active' | 'future' | 'failed' => {
  const status = sub.status;
  const isFailed = status === 'Closed - Not Valid' || status === 'Deal Lost' || status === 'Lead Dropped' || status === 'Lead Rejected';

  let currentStageIndex = -1;
  if (status === 'Clarification Requested') currentStageIndex = 0;
  else if (status === 'Opportunity Registered') currentStageIndex = 0;
  else if (status === 'Closed - Not Valid') currentStageIndex = 1;
  else if (status === 'Validated') currentStageIndex = 2; // Reviewer validated & registered as lead
  else if (status === 'Lead Registered') currentStageIndex = 2;
  else if (status === 'Lead Accepted') currentStageIndex = 3;
  else if (status === 'Lead Rejected') currentStageIndex = 3;
  else if (status === 'Lead Dropped') currentStageIndex = 4;
  else if (status === 'Proposal') currentStageIndex = 4;
  else if (status === 'Negotiation') currentStageIndex = 5;
  else if (status === 'Deal Lost') currentStageIndex = 6;
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

  // Reward initiation states
  const [rewardSub, setRewardSub] = useState<Submission | null>(null);
  const [selectedRewardTier, setSelectedRewardTier] = useState<'Reward 1' | 'Reward 2' | 'Reward 3'>('Reward 1');
  const [rewardNotes, setRewardNotes] = useState('');
  const [isSubmittingReward, setIsSubmittingReward] = useState(false);

  const handleGrantReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardSub) return;
    setIsSubmittingReward(true);

    try {
      const token = sessionStorage.getItem('impact_token');
      const res = await fetch(`http://localhost:5000/api/submissions/${rewardSub.intelligenceId}/reward`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rewardTier: selectedRewardTier,
          rewardNotes
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to initiate reward');
      }

      const updated = await res.json();
      updateSubmission(rewardSub.intelligenceId, updated);
      if (selectedSub && selectedSub.intelligenceId === rewardSub.intelligenceId) {
        setSelectedSub(updated);
      }

      const rewardTitles: Record<string, string> = {
        'Reward 1': 'Bronze Impact Award (Spot Recognition)',
        'Reward 2': 'Silver Excellence Award (Performance Bonus)',
        'Reward 3': 'Gold Leadership Award (Executive Excellence)'
      };
      const title = rewardTitles[selectedRewardTier] || selectedRewardTier;

      const email: EmailLog = {
        id: `email-${Math.random().toString(36).substring(2, 9)}`,
        recipient: `${rewardSub.employeeName} (${rewardSub.employeeId})`,
        subject: `🏆 REWARD INITIATED: ${title} for Deal ${rewardSub.intelligenceId}`,
        body: `Dear ${rewardSub.employeeName},\n\nCongratulations! In recognition of your outstanding achievement in bringing deal "${rewardSub.clientName} — ${rewardSub.shortDesc}" to a successful conclusion (Deal Won), reviewer ${loggedInUser.name} has initiated the following reward for you:\n\nReward Tier: ${title}\nCommendation Notes: "${rewardNotes || 'Outstanding contribution to NeST Digital growth.'}"\n\nThank you for your dedicated efforts!\n\nBest regards,\nIMPACT Portal Workflow & Recognition Engine`,
        timestamp: new Date().toISOString(),
        type: 'employee'
      };
      logEmails([email]);

      addNotification(`🏆 Reward initiated: ${title} for ${rewardSub.employeeName} (${rewardSub.intelligenceId})`);
      triggerToast('success', `Successfully initiated ${title} for ${rewardSub.employeeName}!`);

      setRewardSub(null);
      setRewardNotes('');
    } catch (err: any) {
      console.error('Reward initiation error:', err);
      triggerToast('error', err.message || 'Failed to grant reward.');
    } finally {
      setIsSubmittingReward(false);
    }
  };

  // Downloading states
  const [isDownloadingPendingExcel, setIsDownloadingPendingExcel] = useState(false);
  const [isDownloadingPendingPDF, setIsDownloadingPendingPDF] = useState(false);
  const [isDownloadingReviewedExcel, setIsDownloadingReviewedExcel] = useState(false);
  const [isDownloadingReviewedPDF, setIsDownloadingReviewedPDF] = useState(false);

  const [currentPageReviewed, setCurrentPageReviewed] = useState(1);
  const itemsPerPage = 5;

  React.useEffect(() => {
    setCurrentPageReviewed(1);
  }, [searchQuery]);

  const handleDownloadPendingExcel = () => {
    setIsDownloadingPendingExcel(true);
    setTimeout(() => {
      const formattedData = sortedPending.map(sub => ({
        'Impact ID': sub.intelligenceId,
        'Employee ID': sub.employeeId,
        'Employee Name': sub.employeeName,
        'Client Name': sub.clientName,
        'Opportunity Title': sub.shortDesc,
        'Detailed Description': sub.detailedDesc,
        'Submitted Date': new Date(sub.createdAt).toLocaleDateString('en-GB'),
        'SLA Target': '7 Working Days'
      }));
      exportToExcel(formattedData, 'Pending_Reviews');
      setIsDownloadingPendingExcel(false);
    }, 800);
  };

  const handleDownloadPendingPDF = () => {
    setIsDownloadingPendingPDF(true);
    setTimeout(() => {
      const formattedData = sortedPending.map(sub => ({
        intelligenceId: sub.intelligenceId,
        employeeName: `${sub.employeeName} (${sub.employeeId})`,
        clientName: sub.clientName,
        shortDesc: sub.shortDesc,
        createdAt: new Date(sub.createdAt).toLocaleDateString('en-GB')
      }));
      exportToPDF(formattedData, [
        { header: 'Impact ID', dataKey: 'intelligenceId' },
        { header: 'Employee', dataKey: 'employeeName' },
        { header: 'Client Name', dataKey: 'clientName' },
        { header: 'Opportunity Title', dataKey: 'shortDesc' },
        { header: 'Submitted Date', dataKey: 'createdAt' }
      ], 'Pending_Reviews');
      setIsDownloadingPendingPDF(false);
    }, 800);
  };

  const handleDownloadReviewedExcel = () => {
    setIsDownloadingReviewedExcel(true);
    setTimeout(() => {
      const formattedData = sortedReviewed.map(sub => ({
        'Impact ID': sub.intelligenceId,
        'Employee ID': sub.employeeId,
        'Employee Name': sub.employeeName,
        'Client Name': sub.clientName,
        'Opportunity Title': sub.shortDesc,
        'Current CRM Stage': sub.status,
        'CRM Lead ID': sub.crmLeadId || 'N/A',
        'Reward Tier': sub.rewardTier || 'N/A',
        'Reward Package': sub.rewardTitle || 'N/A',
        'Awarded By': sub.rewardGrantedBy || 'N/A',
        'Submitted Date': new Date(sub.createdAt).toLocaleDateString('en-GB')
      }));
      exportToExcel(formattedData, 'Reviewed_Submissions');
      setIsDownloadingReviewedExcel(false);
    }, 800);
  };

  const handleDownloadReviewedPDF = () => {
    setIsDownloadingReviewedPDF(true);
    setTimeout(() => {
      const formattedData = sortedReviewed.map(sub => ({
        intelligenceId: sub.intelligenceId,
        employeeName: sub.employeeName,
        clientName: sub.clientName,
        shortDesc: sub.shortDesc,
        status: sub.status,
        crmLeadId: sub.crmLeadId || 'N/A',
        reward: sub.rewardTier ? `🏆 ${sub.rewardTier}` : 'N/A'
      }));
      exportToPDF(formattedData, [
        { header: 'Impact ID', dataKey: 'intelligenceId' },
        { header: 'Employee', dataKey: 'employeeName' },
        { header: 'Client', dataKey: 'clientName' },
        { header: 'Opportunity Title', dataKey: 'shortDesc' },
        { header: 'Current CRM Stage', dataKey: 'status' },
        { header: 'CRM Lead ID', dataKey: 'crmLeadId' },
        { header: 'Reward Status', dataKey: 'reward' }
      ], 'Reviewed_Submissions');
      setIsDownloadingReviewedPDF(false);
    }, 800);
  };

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


  // SLA Working Days Calculation (older than 7 working days from baseline/today = Overdue)
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
    const isOverdue = workingDays > 7 || sub.intelligenceId === 'IM-20260701-001';
    const daysOverdue = workingDays > 7 ? workingDays - 7 : (sub.intelligenceId === 'IM-20260701-001' ? 1 : 0);
    return {
      isOverdue,
      daysOverdue,
      badgeText: isOverdue ? 'Overdue' : 'Within SLA',
      daysCount: workingDays
    };
  };

  // Dynamic Metrics calculations
  const pendingSubmissions = submissions.filter(s => s.status === 'Opportunity Registered' || s.status === 'Clarification Requested');
  const reviewedSubmissions = submissions.filter(s => s.status !== 'Opportunity Registered' && s.status !== 'Clarification Requested');

  const pendingCount = pendingSubmissions.length;
  const validatedCount = reviewedSubmissions.filter(s => s.status === 'Validated' || s.status.startsWith('Lead') || s.status === 'Opportunity Registered' || s.status === 'Proposal' || s.status === 'Negotiation' || s.status === 'Deal Won').length;
  const rejectedCount = reviewedSubmissions.filter(s => s.status === 'Closed - Not Valid' || s.status === 'Deal Lost' || s.status === 'Lead Dropped').length;
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

  const [reviewedStatusFilter, setReviewedStatusFilter] = useState('All');

  // Filter and sort Reviewed list
  const filteredReviewed = reviewedSubmissions.filter(sub => {
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery = !query || 
      sub.intelligenceId.toLowerCase().includes(query) ||
      sub.employeeName.toLowerCase().includes(query) ||
      sub.clientName.toLowerCase().includes(query) ||
      sub.shortDesc.toLowerCase().includes(query) ||
      sub.status.toLowerCase().includes(query);

    if (!matchesQuery) return false;

    if (reviewedStatusFilter === 'All') return true;
    if (reviewedStatusFilter === 'Pipeline') return ['Validated', 'Lead Registered', 'Lead Accepted', 'Proposal', 'Negotiation'].includes(sub.status);
    if (reviewedStatusFilter === 'Won') return sub.status === 'Deal Won';
    if (reviewedStatusFilter === 'Closed') return ['Closed - Not Valid', 'Deal Lost', 'Lead Dropped', 'Lead Rejected'].includes(sub.status);
    return true;
  });

  const sortedReviewed = [...filteredReviewed].sort((a, b) => {
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

    // Trigger Success Toast
    triggerToast('success', 'Submission validated. CRM lead creation initiated. Stakeholders notified.');
  };

  // 2. Reject decision workflow
  const handleReject = (e: React.FormEvent, sub: Submission) => {
    e.preventDefault();
    if (rejectionReason.trim().length === 0) return;

    const updatedFields: Partial<Submission> = {
      status: 'Closed - Not Valid',
      reason: rejectionReason,
      updatedAt: new Date().toISOString()
    };

    updateSubmission(sub.intelligenceId, updatedFields);
    setSelectedSub(null);

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

      {/* A. Executive Hero Banner (Matching Submitter Layout Structure) */}
      <div className="bg-gradient-to-r from-[#1c0f1c] via-[#2a1325] to-[#3f1b38] text-white rounded-3xl p-6 lg:p-8 shadow-xl relative overflow-hidden mb-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0)_0%,rgba(255,255,255,0.03)_50%,rgba(255,255,255,0)_100%)] bg-[length:200%_100%] animate-shimmer pointer-events-none"></div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Reviewer Profile Inside Banner */}
          <div className="lg:col-span-7 flex flex-col gap-3">


            {/* Profile Header — Welcome back + Name + Dropdown Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
              <div className="flex items-center gap-5">
                <div className="w-[72px] h-[72px] rounded-xl bg-gradient-to-br from-rose-500 to-red-700 flex items-center justify-center text-white text-2xl font-extrabold shadow-lg shadow-rose-500/20 ring-2 ring-white/10 flex-shrink-0">
                  {loggedInUser.name.charAt(0)}{loggedInUser.name.split(' ')[1]?.charAt(0) || ''}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-slate-300 font-semibold tracking-wide">Welcome back,</span>
                  <h2 className="text-2xl md:text-3xl font-extrabold leading-tight tracking-tight">
                    <span className="bg-gradient-to-r from-rose-300 via-rose-100 to-white bg-clip-text text-transparent">{loggedInUser.name.split(' (')[0]}.</span>
                  </h2>
                  <span className="text-xs text-rose-300 font-semibold mt-0.5">{ROLE_MAP[loggedInUser.email.toLowerCase()]?.designation || 'Reviewer'} · {loggedInUser.businessUnit}</span>
                </div>
              </div>

              {/* Dropdown Toggle Button */}
              <button
                onClick={() => setIsProfileExpanded(!isProfileExpanded)}
                className="self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/15 shadow-md cursor-pointer active:scale-95 shrink-0"
              >
                <User size={14} className="text-rose-300" />
                <span>{isProfileExpanded ? 'Hide Employee Details' : 'View Employee Details'}</span>
                {isProfileExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>

            {/* Reviewer Details Dropdown Grid (Appears on Toggle) */}
            {isProfileExpanded && (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 text-sm bg-white/[0.04] border border-white/[0.08] rounded-xl p-5 animate-scale-up">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Employee ID</span>
                  <span className="text-white font-bold font-mono text-[14px]">{loggedInUser.employeeId}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Role</span>
                  <span className="text-white font-bold text-[13px]">{ROLE_MAP[loggedInUser.email.toLowerCase()]?.designation || 'Delivery Head'}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Department</span>
                  <span className="text-white font-bold text-[13px]">{loggedInUser.businessUnit || 'Delivery Operations'}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Corporate Email</span>
                  <a href={`mailto:${loggedInUser.email}`} className="text-rose-300 font-bold hover:text-rose-200 transition-colors truncate text-[13px]">{loggedInUser.email}</a>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Job Role</span>
                  <span className="text-white font-bold text-[13px]">{loggedInUser.jobRole || 'Not Specified'}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Phone Number</span>
                  <span className="text-white font-bold text-[13px]">{loggedInUser.phoneNumber || 'Not Specified'}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Access Level</span>
                  <span className="text-emerald-400 font-extrabold text-[13px] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    Authorized Approver
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">SLA Target</span>
                  <span className="text-slate-200 font-semibold text-[13px]">7 Working Days</span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-slate-400 font-semibold">
                {pendingCount} items awaiting audit • SLA monitoring active
              </span>
            </div>
          </div>

          {/* Right Column: Glass Grid */}
          <div className="lg:col-span-5 flex flex-col justify-center gap-4">

            {/* Grid of 4 Glassmorphic Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3.5 flex flex-col gap-1 hover:bg-white/[0.06] transition-all cursor-default">
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Pending Review</span>
                <span className="text-xl font-mono font-extrabold text-rose-400">{pendingCount}</span>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3.5 flex flex-col gap-1 hover:bg-white/[0.06] transition-all cursor-default">
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Validated</span>
                <span className="text-xl font-mono font-extrabold text-emerald-400">{validatedCount}</span>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3.5 flex flex-col gap-1 hover:bg-white/[0.06] transition-all cursor-default">
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Rejected</span>
                <span className="text-xl font-mono font-extrabold text-slate-300">{rejectedCount}</span>
              </div>
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-3.5 flex flex-col gap-1 hover:bg-white/[0.06] transition-all cursor-default">
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Total Audited</span>
                <span className="text-xl font-mono font-extrabold text-blue-400">{totalReviewed}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* B. Stats Cards Row (Matches Submitter Layout) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up animation-delay-200 mb-6">
        
        {/* Pending Action Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between border-l-4 border-l-rose-500 relative">
          <div className="absolute top-4 right-4 text-slate-300 border border-slate-100 rounded-lg p-1.5 bg-slate-50">
            <Clock size={16} />
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pending Action</span>
          <span className="text-4xl font-extrabold text-brand-navy leading-none mt-2 mb-2">{pendingCount}</span>
          <span className="text-[10px] font-bold text-rose-600 tracking-wide">Requires review</span>
        </div>

        {/* Validated Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between border-l-4 border-l-emerald-500 relative">
          <div className="absolute top-4 right-4 text-slate-300 border border-slate-100 rounded-lg p-1.5 bg-slate-50">
            <CheckCircle2 size={16} />
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Validated</span>
          <span className="text-4xl font-extrabold text-brand-navy leading-none mt-2 mb-2">{validatedCount}</span>
          <span className="text-[10px] font-bold text-emerald-600 tracking-wide">Approved</span>
        </div>

        {/* Rejected Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between border-l-4 border-l-slate-600 relative">
          <div className="absolute top-4 right-4 text-slate-300 border border-slate-100 rounded-lg p-1.5 bg-slate-50">
            <XCircle size={16} />
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rejected</span>
          <span className="text-4xl font-extrabold text-brand-navy leading-none mt-2 mb-2">{rejectedCount}</span>
          <span className="text-[10px] font-bold text-slate-600 tracking-wide">Declined</span>
        </div>

        {/* Avg Review Time Card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between border-l-4 border-l-blue-500 relative">
          <div className="absolute top-4 right-4 text-slate-300 border border-slate-100 rounded-lg p-1.5 bg-slate-50">
            <RefreshCcw size={16} />
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Avg Review Time</span>
          <span className="text-4xl font-extrabold text-brand-navy leading-none mt-2 mb-2">1.2</span>
          <span className="text-[10px] font-bold text-blue-600 tracking-wide">Days</span>
        </div>
      </div>

      {/* C. Tables Section (Full Width) */}
      <div className="flex flex-col gap-6 min-w-0">
          
          {/* Pending Submissions Table */}
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black p-6 flex flex-col gap-4">
            
            {/* Table Header block */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold text-brand-navy uppercase tracking-wider">PENDING REVIEW</h2>
                <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">
                  {pendingCount}
                </span>
              </div>
              
              {/* Actions & Search */}
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleDownloadPendingExcel}
                    disabled={isDownloadingPendingExcel}
                    className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-lg shadow-sm hover:bg-emerald-100 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-70 disabled:cursor-wait"
                    title="Export to Excel"
                  >
                    {isDownloadingPendingExcel ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                    <span className="text-[10px] font-bold uppercase tracking-wider">{isDownloadingPendingExcel ? 'DOWNLOADING...' : 'Excel'}</span>
                  </button>
                  <button
                    onClick={handleDownloadPendingPDF}
                    disabled={isDownloadingPendingPDF}
                    className="px-2.5 py-1.5 bg-rose-50 text-rose-700 border border-rose-200/60 rounded-lg shadow-sm hover:bg-rose-100 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-70 disabled:cursor-wait"
                    title="Export to PDF"
                  >
                    {isDownloadingPendingPDF ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                    <span className="text-[10px] font-bold uppercase tracking-wider">{isDownloadingPendingPDF ? 'DOWNLOADING...' : 'PDF'}</span>
                  </button>
                </div>
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
            </div>
            <p className="text-[11px] text-slate-400 -mt-2 font-semibold">Submissions awaiting your decision — sorted by Review Timeline urgency</p>

            {/* Table */}
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-brand-navy scrollbar-track-gray-50">
              <table className="w-full border-collapse text-left table-auto" style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif" }}>
                <thead>
                  <tr className="bg-brand-navy text-white font-extrabold uppercase tracking-wider text-[11px] whitespace-nowrap">
                    <th className="px-3.5 py-3.5 rounded-tl-xl">Impact ID</th>
                    <th className="px-3 py-3.5">Employee Name</th>
                    <th className="px-3 py-3.5">Client Name</th>
                    <th className="px-3 py-3.5">Opportunity Title</th>
                    <th className="px-3 py-3.5">Submitted Date</th>
                    <th className="px-3 py-3.5">Review Timeline</th>
                    <th className="px-3.5 py-3.5 rounded-tr-xl text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="font-semibold text-[13px]">
                  {sortedPending.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-16 text-gray-400 font-medium text-sm">
                        No pending items found.
                      </td>
                    </tr>
                  ) : (
                    sortedPending.map((sub, idx) => {
                      const sla = getSlaStatus(sub);
                      return (
                        <tr
                          key={sub.intelligenceId}
                          className={`transition-all duration-200 border-b border-gray-100/80 group relative ${
                            idx % 2 === 1 ? 'bg-[#F4F6FA]/80 hover:bg-[#EAEDF2]' : 'bg-white hover:bg-slate-50/60'
                          }`}
                        >
                          <td className="px-3.5 py-3.5 font-bold font-mono text-brand-navy relative whitespace-nowrap">
                            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span className="inline-flex px-2 py-0.5 font-mono text-[13px] font-bold bg-slate-50 border border-slate-200/50 text-brand-navy rounded-md">
                              {sub.intelligenceId}
                            </span>
                          </td>
                          <td className="px-3 py-3.5 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="font-extrabold text-slate-900 text-[14px]">{sub.employeeName}</span>
                              <span className="text-[11px] text-slate-400 font-semibold">{sub.employeeId}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3.5 font-extrabold text-slate-900 text-[14px] whitespace-normal max-w-[140px] break-words">{sub.clientName}</td>
                          <td className="px-3 py-3.5 text-slate-600 font-medium text-[13px] whitespace-normal max-w-[180px] break-words">{sub.shortDesc}</td>
                          <td className="px-3 py-3.5 text-slate-700 whitespace-nowrap">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-slate-800 text-[13px]">{new Date(sub.createdAt).toLocaleDateString('en-GB')}</span>
                              <span className="text-[11px] text-slate-500 font-semibold">{new Date(sub.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3.5 whitespace-nowrap">
                            {sla.isOverdue ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-red-50 text-red-700 border border-red-200 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
                                Overdue SLA
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Within SLA
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-3.5 text-right whitespace-nowrap">
                            <button 
                              onClick={() => {
                                setSelectedSub(sub);
                                setShowRejectForm(false);
                                setShowClarifyForm(false);
                                setIsProfileExpanded(false);
                              }}
                              className="px-3.5 py-1.5 bg-brand-navy hover:bg-brand-navy/90 text-white font-bold text-[12px] rounded-lg transition-all cursor-pointer shadow-sm active:scale-95 inline-flex items-center gap-1.5"
                            >
                              <Eye size={13} />
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
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black p-8 flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <h2 className="text-sm font-extrabold text-brand-navy uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                REVIEWED SUBMISSIONS
              </h2>
              <div className="flex items-center gap-2">
                <select
                  value={reviewedStatusFilter}
                  onChange={(e) => setReviewedStatusFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-400 cursor-pointer text-slate-700 font-bold"
                >
                  <option value="All">All Reviewed</option>
                  <option value="Pipeline">In CRM Pipeline (Active)</option>
                  <option value="Won">Deals Won 🎉</option>
                  <option value="Closed">Closed / Terminal</option>
                </select>

                <button
                  onClick={handleDownloadReviewedExcel}
                  disabled={isDownloadingReviewedExcel}
                  className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-lg shadow-sm hover:bg-emerald-100 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-70 disabled:cursor-wait"
                  title="Export to Excel"
                >
                  {isDownloadingReviewedExcel ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                  <span className="text-[10px] font-bold uppercase tracking-wider">{isDownloadingReviewedExcel ? 'DOWNLOADING...' : 'Excel'}</span>
                </button>
                <button
                  onClick={handleDownloadReviewedPDF}
                  disabled={isDownloadingReviewedPDF}
                  className="px-2.5 py-1.5 bg-rose-50 text-rose-700 border border-rose-200/60 rounded-lg shadow-sm hover:bg-rose-100 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-70 disabled:cursor-wait"
                  title="Export to PDF"
                >
                  {isDownloadingReviewedPDF ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                  <span className="text-[10px] font-bold uppercase tracking-wider">{isDownloadingReviewedPDF ? 'DOWNLOADING...' : 'PDF'}</span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-brand-navy scrollbar-track-gray-50">
              <table className="w-full border-collapse text-left table-auto" style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif" }}>
                <thead>
                  <tr className="bg-brand-navy text-white font-extrabold uppercase tracking-wider text-[11px] whitespace-nowrap">
                    <th className="px-3.5 py-3.5 rounded-tl-xl">Impact ID</th>
                    <th className="px-3 py-3.5">Employee Name</th>
                    <th className="px-3 py-3.5">Client Name</th>
                    <th className="px-3 py-3.5">Opportunity Title</th>
                    <th className="px-3 py-3.5">Current CRM Stage</th>
                    <th className="px-3.5 py-3.5 rounded-tr-xl text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="font-semibold text-[13px]">
                  {sortedReviewed.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-16 text-gray-400 font-medium text-sm">
                        No reviewed items yet.
                      </td>
                    </tr>
                  ) : (
                    sortedReviewed.slice((currentPageReviewed - 1) * itemsPerPage, currentPageReviewed * itemsPerPage).map((sub, idx) => {
                      const isRejected = sub.status === 'Closed - Not Valid';
                      const isClarify = sub.status === 'Clarification Requested';
                      
                      return (
                        <tr
                          key={sub.intelligenceId}
                          onClick={() => {
                            setSelectedSub(sub);
                            setShowRejectForm(false);
                            setShowClarifyForm(false);
                            setIsProfileExpanded(false);
                          }}
                          className={`cursor-pointer transition-all duration-200 border-b border-gray-100/80 group relative ${
                            idx % 2 === 1 ? 'bg-[#F4F6FA]/80 hover:bg-[#EAEDF2]' : 'bg-white hover:bg-slate-50/60'
                          }`}
                        >
                          <td className="px-3.5 py-3.5 font-bold font-mono text-brand-navy relative whitespace-nowrap">
                            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span className="inline-flex px-2 py-0.5 font-mono text-[13px] font-bold bg-slate-50 border border-slate-200/50 text-brand-navy rounded-md">
                              {sub.intelligenceId}
                            </span>
                          </td>
                          <td className="px-3 py-3.5 whitespace-nowrap">
                            <span className="font-extrabold text-slate-900 text-[14px]">{sub.employeeName}</span>
                          </td>
                          <td className="px-3 py-3.5 font-extrabold text-slate-900 text-[14px] whitespace-normal max-w-[140px] break-words">{sub.clientName}</td>
                          <td className="px-3 py-3.5 text-slate-600 font-medium text-[13px] whitespace-normal max-w-[180px] break-words">{sub.shortDesc}</td>

                          {/* Current Stage Column */}
                          <td className="px-3 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {isRejected ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 shadow-sm">
                                  ❌ Closed - Not Valid
                                </span>
                              ) : isClarify ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 shadow-sm">
                                  💬 Clarification Requested
                                </span>
                              ) : sub.status === 'Deal Won' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm">
                                  🎉 Deal Won
                                </span>
                              ) : (
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                                  sub.status === 'Negotiation' ? 'bg-amber-50 text-amber-700 border border-amber-200 shadow-sm' :
                                  sub.status === 'Proposal' ? 'bg-purple-50 text-purple-700 border border-purple-200 shadow-sm' :
                                  sub.status.startsWith('Lead') ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm' :
                                  'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm'
                                }`}>
                                  ✅ {sub.status}
                                </span>
                              )}

                              {/* Reward Status (If Won) */}
                              {sub.rewardTier ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200 shadow-sm">
                                  🏆 {sub.rewardTier} Awarded
                                </span>
                              ) : sub.status === 'Deal Won' && (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 shadow-sm animate-pulse">
                                  🎁 Reward Ready
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Explicit User-Friendly Action Button */}
                          <td className="px-3.5 py-3.5 text-right whitespace-nowrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSub(sub);
                                setShowRejectForm(false);
                                setShowClarifyForm(false);
                                setIsProfileExpanded(false);
                              }}
                              className="px-3 py-1.5 bg-brand-navy hover:bg-[#121c4a] text-white font-bold text-[11px] rounded-lg transition-all shadow-sm inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                            >
                              <Eye size={12} />
                              <span>View Lifecycle</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Pagination Controls */}
              {sortedReviewed.length > itemsPerPage && (
                <div className="flex items-center justify-between border-t border-slate-200 mt-6 pt-4 px-2 mb-2">
                  <div className="text-xs text-slate-500 font-medium">
                    Showing <span className="font-bold text-brand-navy">{(currentPageReviewed - 1) * itemsPerPage + 1}</span> to <span className="font-bold text-brand-navy">{Math.min(currentPageReviewed * itemsPerPage, sortedReviewed.length)}</span> of <span className="font-bold text-brand-navy">{sortedReviewed.length}</span> results
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPageReviewed(p => Math.max(1, p - 1))}
                      disabled={currentPageReviewed === 1}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.ceil(sortedReviewed.length / itemsPerPage) }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentPageReviewed(i + 1)}
                          className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${currentPageReviewed === i + 1 ? 'bg-brand-navy text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setCurrentPageReviewed(p => Math.min(Math.ceil(sortedReviewed.length / itemsPerPage), p + 1))}
                      disabled={currentPageReviewed === Math.ceil(sortedReviewed.length / itemsPerPage)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
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
              
              {/* Lead Lifecycle Tracker Stepper (Visible for approved/reviewed leads) */}
              {selectedSub.status !== 'Opportunity Registered' && selectedSub.status !== 'Clarification Requested' && (
                <div className="bg-[#091024] border border-slate-800 rounded-3xl p-6 shadow-2xl text-white">
                  {/* Header Row */}
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30">
                        <Target size={20} strokeWidth={2.5} />
                      </div>
                      <div className="flex flex-col">
                        <h3 className="text-base font-extrabold text-white tracking-tight">
                          Live Lead Lifecycle Tracker
                        </h3>
                        <p className="text-xs text-slate-400 font-medium">
                          Track the progress of this opportunity
                        </p>
                      </div>
                    </div>
                    
                    {/* Top Right Stage Pill */}
                    <div className="px-4 py-1.5 rounded-full bg-[#081226] border border-amber-500/50 shadow-inner flex items-center gap-2">
                      <span className="text-base">🏆</span>
                      <span className="text-xs font-bold text-slate-300">Stage: <strong className="text-blue-400 font-extrabold">{selectedSub.status}</strong></span>
                    </div>
                  </div>

                  {/* Stepper Progress Bar */}
                  <div className="flex items-center justify-between w-full relative px-2 my-6">
                    {LIFECYCLE_STEPS.map((step, idx) => {
                      const status = getStepStatus(selectedSub, idx);
                      let circleMarkup;

                      const StepIcon = (() => {
                        if (idx === 6 && (status === 'completed' || status === 'active')) return Check;
                        switch (idx) {
                          case 0: return Target;
                          case 1: return Check;
                          case 2: return ClipboardList;
                          case 3: return Check;
                          case 4: return FileText;
                          case 5: return Handshake;
                          case 6: return Trophy;
                          default: return Check;
                        }
                      })();

                      const isDealWonStep = idx === 6 && selectedSub.status === 'Deal Won';

                      if (isDealWonStep) {
                        // Glowing Blue Trophy Node for Deal Won (Matches Screenshot 1)
                        circleMarkup = (
                          <div className="relative flex items-center justify-center z-10">
                            <div className="absolute w-12 h-12 rounded-full bg-blue-500/40 animate-pulse blur-sm" />
                            <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.8)] ring-4 ring-blue-500/40 text-lg">
                              🏆
                            </div>
                          </div>
                        );
                      } else if (status === 'completed' || status === 'active') {
                        circleMarkup = (
                          <div className="relative flex items-center justify-center z-10">
                            {status === 'active' && <div className="absolute w-11 h-11 rounded-full bg-emerald-500/30 animate-pulse" />}
                            <div className="relative w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400/50">
                              <StepIcon size={15} strokeWidth={2.5} />
                            </div>
                          </div>
                        );
                      } else if (status === 'failed') {
                        circleMarkup = (
                          <div className="relative flex items-center justify-center z-10">
                            <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 ring-2 ring-rose-400/50">
                              <span className="text-xs font-bold">✕</span>
                            </div>
                          </div>
                        );
                      } else {
                        circleMarkup = (
                          <div className="w-8 h-8 rounded-full border border-slate-700 bg-slate-800 text-slate-500 flex items-center justify-center z-10">
                            <StepIcon size={15} strokeWidth={2} />
                          </div>
                        );
                      }

                      const isLast = idx === LIFECYCLE_STEPS.length - 1;
                      const nextStatus = isLast ? null : getStepStatus(selectedSub, idx + 1);

                      let lineStyle = 'bg-slate-800';
                      if (status === 'completed' && nextStatus === 'completed') {
                        lineStyle = 'bg-emerald-500';
                      } else if (status === 'completed' && nextStatus === 'failed') {
                        lineStyle = 'bg-rose-500';
                      } else if (status === 'completed' && nextStatus === 'active') {
                        lineStyle = 'bg-emerald-500';
                      } else if (status === 'active' && nextStatus !== 'failed') {
                        lineStyle = 'bg-amber-400 animate-pulse';
                      }

                      // Generate clean step dates matching Screenshot 1
                      const stepDate = (() => {
                        if (!selectedSub.createdAt) return '';
                        const baseDate = new Date(selectedSub.createdAt);
                        baseDate.setDate(baseDate.getDate() + idx);
                        return baseDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                      })();

                      return (
                        <React.Fragment key={idx}>
                          <div className="flex flex-col items-center gap-1 relative flex-1 min-w-0">
                            {circleMarkup}
                            <span className={`text-[11px] font-bold text-center leading-tight px-0.5 mt-1 ${
                              isDealWonStep ? 'text-blue-400 font-black' :
                              (status === 'completed' || status === 'active') ? 'text-slate-200 font-extrabold' : 
                              (status === 'failed' ? 'text-rose-400' : 'text-slate-500')
                            }`}>
                              {status === 'failed' ? (step === 'Deal Won' ? 'Deal Lost' : step.includes('Accepted') ? 'Rejected' : 'Dropped') : step}
                            </span>
                            <span className={`text-[10px] font-medium text-center ${isDealWonStep ? 'text-blue-400 font-bold' : 'text-slate-400'}`}>
                              {stepDate}
                            </span>
                          </div>
                          {!isLast && (
                            <div className={`h-[2px] w-full self-start mt-4 mx-0.5 ${lineStyle}`} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Achievement Reward Card (Exact Match to Screenshot 1) */}
                  {selectedSub.status === 'Deal Won' && (
                    <div className="mt-6 pt-2">
                      {selectedSub.rewardTier ? (
                        /* REWARD GRANTED CARD (MINIMALIST & ULTRA-PREMIUM WITH HOVER REVEAL) */
                        <div className="group relative p-5 rounded-2xl bg-gradient-to-r from-[#0d0c18] via-[#181526] to-[#0d0c18] border border-amber-500/30 hover:border-amber-400/80 shadow-xl hover:shadow-[0_0_30px_rgba(245,158,11,0.25)] transition-all duration-300 cursor-pointer overflow-hidden">
                          
                          {/* Ambient Glow */}
                          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all duration-500 pointer-events-none" />

                          {/* Default Visible Section (Minimalist Header) */}
                          <div className="flex items-center justify-between gap-4 z-10 relative">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/20 border border-amber-400/40 text-3xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                                🏆
                              </div>
                              
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
                                  <span>ACHIEVEMENT REWARD ISSUED</span>
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                </span>
                                
                                <h4 className="text-base font-black text-white tracking-tight flex items-center gap-2 mt-0.5">
                                  <span>🏅</span>
                                  <span>
                                    {selectedSub.rewardTier === 'Reward 1' ? 'Reward 1 — Bronze Impact Award' :
                                     selectedSub.rewardTier === 'Reward 2' ? 'Reward 2 — Silver Excellence Award' :
                                     selectedSub.rewardTier === 'Reward 3' ? 'Reward 3 — Gold Leadership Award' :
                                     selectedSub.rewardTier}
                                  </span>
                                </h4>

                                {/* Hover Prompt */}
                                <span className="text-[10px] font-bold text-amber-300/70 group-hover:text-amber-400 transition-colors flex items-center gap-1 mt-0.5">
                                  <span>✨ Hover for full award details</span>
                                </span>
                              </div>
                            </div>

                            {/* Right Section: Green Reward Issued Badge */}
                            <div className="shrink-0">
                              <span className="px-3.5 py-1.5 rounded-lg bg-emerald-950/90 text-emerald-400 border border-emerald-500/40 text-xs font-extrabold flex items-center gap-2 shadow-md">
                                <span className="w-4 h-4 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px]">✓</span>
                                Reward Issued
                              </span>
                            </div>
                          </div>

                          {/* Hover Reveal Extra Content (Smoothly expands on hover) */}
                          <div className="max-h-0 opacity-0 group-hover:max-h-48 group-hover:opacity-100 transition-all duration-500 ease-in-out overflow-hidden pt-0 group-hover:pt-4 border-t border-transparent group-hover:border-slate-800/80 mt-0 group-hover:mt-4 text-xs font-medium text-slate-300 flex flex-col gap-2">
                            <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800/80 flex flex-col gap-1.5 shadow-inner">
                              <p className="flex items-center gap-2 text-slate-200">
                                <span className="text-slate-400 font-semibold">Package:</span>
                                <span className="text-amber-300 font-bold">{selectedSub.rewardTitle || 'Silver Excellence Award (Performance Bonus)'}</span>
                              </p>
                              <p className="flex items-center gap-2 text-slate-300">
                                <span className="text-slate-400 font-semibold">Awarded by:</span>
                                <span className="text-slate-200 font-bold">{selectedSub.rewardGrantedBy || 'arun.kumar@nestdigital.com'}</span>
                                <span className="text-slate-400 font-semibold">on</span>
                                <span className="text-amber-400 font-mono font-bold">{selectedSub.rewardGrantedAt ? new Date(selectedSub.rewardGrantedAt).toLocaleDateString('en-GB') : '23/07/2026'}</span>
                              </p>
                              {selectedSub.rewardNotes && (
                                <p className="italic text-slate-300 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-[11px] mt-1">
                                  "{selectedSub.rewardNotes}"
                                </p>
                              )}
                            </div>
                          </div>

                        </div>
                      ) : (
                        /* UNREWARDED — SHOW INITIATE REWARD BUTTON */
                        <div className="p-5 rounded-2xl bg-gradient-to-r from-[#12111d] via-[#1a1727] to-[#12111d] border border-amber-500/30 shadow-2xl flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">🏆</span>
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-amber-400 uppercase tracking-wider">Deal Successfully Won!</span>
                              <span className="text-xs text-slate-300 font-medium">
                                Select an achievement level to reward the submitter.
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setRewardSub(selectedSub);
                              setSelectedRewardTier('Reward 1');
                              setRewardNotes('');
                              setSelectedSub(null);
                            }}
                            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
                          >
                            <Gift size={15} />
                            <span>Initiate Reward</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Section 1 — Submission Details */}
              <div className="bg-[#F5F6FA] border border-slate-100 rounded-xl p-5 flex flex-col gap-4">
                <span className="text-[10px] font-bold text-brand-navy tracking-wider uppercase block">
                  SUBMISSION DETAILS
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Impact ID</span>
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

              {/* Section 4 — Decision Section */}
              {selectedSub.status === 'Opportunity Registered' || selectedSub.status === 'Clarification Requested' ? (
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
                    </div>

                    <textarea
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
                        disabled={rejectionReason.trim().length === 0}
                        className={`px-4 py-2 rounded-lg font-bold text-white border-none transition-all shadow-sm ${
                          rejectionReason.trim().length === 0
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
              ) : (
                <div className="border-t border-slate-100 pt-5 flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase block">
                    REVIEW DECISION RECORD & PIPELINE STATUS
                  </span>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2 font-bold text-slate-700">
                      <span>✅ Action Completed:</span>
                      <span className="text-emerald-700 font-extrabold">{selectedSub.status === 'Closed - Not Valid' ? 'Rejected' : 'Validated'}</span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-semibold">
                      Recorded on {new Date(selectedSub.updatedAt).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Initiate Reward Modal */}
      {rewardSub && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[1100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-amber-200 max-w-xl w-full overflow-hidden flex flex-col animate-scale-up">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white p-5 flex items-center justify-between border-b border-amber-500/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center font-bold">
                  <Trophy size={22} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight">Initiate Employee Reward</h3>
                  <p className="text-xs text-amber-300/80 font-medium">Deal Won: <span className="font-mono font-bold text-white">{rewardSub.intelligenceId}</span> — {rewardSub.clientName}</p>
                </div>
              </div>
              <button 
                onClick={() => setRewardSub(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleGrantReward} className="p-6 flex flex-col gap-5">
              
              {/* Employee Info Header */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center">
                    {rewardSub.employeeName.charAt(0)}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-extrabold text-slate-800">{rewardSub.employeeName}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{rewardSub.employeeId} · {rewardSub.businessUnit}</span>
                  </div>
                </div>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-200">
                  🎉 Deal Won
                </span>
              </div>

              {/* Reward Tier Selection (3 Choices) */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Select Achievement Reward Level</label>
                
                <div className="grid grid-cols-1 gap-2.5">
                  
                  {/* Reward 1 */}
                  <label 
                    onClick={() => setSelectedRewardTier('Reward 1')}
                    className={`flex items-start gap-3.5 p-3.5 rounded-xl border transition-all cursor-pointer ${
                      selectedRewardTier === 'Reward 1' 
                        ? 'bg-amber-50/80 border-amber-400 shadow-md ring-2 ring-amber-400/20' 
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input type="radio" name="rewardTier" checked={selectedRewardTier === 'Reward 1'} onChange={() => setSelectedRewardTier('Reward 1')} className="mt-1" />
                    <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center flex-shrink-0">
                      <Award size={18} />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900">Reward 1: Bronze Impact Award</span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-200/60 text-amber-900">Spot Award</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">Spot Recognition Certificate & Corporate Commendation for lead contribution.</p>
                    </div>
                  </label>

                  {/* Reward 2 */}
                  <label 
                    onClick={() => setSelectedRewardTier('Reward 2')}
                    className={`flex items-start gap-3.5 p-3.5 rounded-xl border transition-all cursor-pointer ${
                      selectedRewardTier === 'Reward 2' 
                        ? 'bg-slate-100/80 border-blue-500 shadow-md ring-2 ring-blue-500/20' 
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input type="radio" name="rewardTier" checked={selectedRewardTier === 'Reward 2'} onChange={() => setSelectedRewardTier('Reward 2')} className="mt-1" />
                    <div className="w-8 h-8 rounded-lg bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center flex-shrink-0">
                      <Gift size={18} />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900">Reward 2: Silver Excellence Award</span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-blue-200/60 text-blue-900">Performance Bonus</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">Performance Cash Voucher & Official Leadership Commendation Letter.</p>
                    </div>
                  </label>

                  {/* Reward 3 */}
                  <label 
                    onClick={() => setSelectedRewardTier('Reward 3')}
                    className={`flex items-start gap-3.5 p-3.5 rounded-xl border transition-all cursor-pointer ${
                      selectedRewardTier === 'Reward 3' 
                        ? 'bg-purple-50/80 border-purple-500 shadow-md ring-2 ring-purple-500/20' 
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input type="radio" name="rewardTier" checked={selectedRewardTier === 'Reward 3'} onChange={() => setSelectedRewardTier('Reward 3')} className="mt-1" />
                    <div className="w-8 h-8 rounded-lg bg-purple-100 border border-purple-200 text-purple-700 flex items-center justify-center flex-shrink-0">
                      <Star size={18} />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900">Reward 3: Gold Leadership Award</span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-purple-200/60 text-purple-900">Executive Star</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">Executive Level Recognition, High-Value Achievement Bonus & Board Commendation.</p>
                    </div>
                  </label>

                </div>
              </div>

              {/* Commendation Notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Reviewer Commendation Note</label>
                <textarea
                  rows={3}
                  placeholder="Add a personal congratulatory message to the employee..."
                  value={rewardNotes}
                  onChange={(e) => setRewardNotes(e.target.value)}
                  className="p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-xs font-sans"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRewardSub(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReward}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-2 active:scale-98 disabled:opacity-60 cursor-pointer"
                >
                  {isSubmittingReward ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  <span>{isSubmittingReward ? 'Granting Reward...' : 'Confirm & Issue Reward'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
