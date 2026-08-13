import React, { useState } from 'react';
import type { Employee, Submission } from '../types.ts';
import { generateIntelligenceId } from '../utils.ts';
import { Shield, Sparkles, Send, PhoneCall, ArrowLeft, Mail, ChevronDown, ChevronUp } from 'lucide-react';

interface EmployeePortalProps {
  submissions: Submission[];
  addSubmission: (sub: Submission) => Promise<boolean> | void;
  logEmails: (emails: any[]) => void;
  loggedInUser: Employee;
  navigate: (path: string) => void;
}

export const EmployeePortal: React.FC<EmployeePortalProps> = ({ 
  submissions, 
  addSubmission, 
  logEmails, 
  loggedInUser,
  navigate
}) => {
  const [shortDesc, setShortDesc] = useState('');
  const [detailedDesc, setDetailedDesc] = useState('');
  const [hasContact, setHasContact] = useState<boolean | null>(null);
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [clientName, setClientName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);

  const [submittedData, setSubmittedData] = useState<Submission | null>(null);
  const [showConfirmPrompt, setShowConfirmPrompt] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState<Submission | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear errors
    const newErrors: Record<string, string> = {};

    // Validate inputs
    if (!clientName.trim()) newErrors.clientName = 'Client / Account Name is required';
    if (!shortDesc.trim()) newErrors.shortDesc = 'Short Description is required';
    if (!detailedDesc.trim()) newErrors.detailedDesc = 'Detailed Description is required';
    if (hasContact === null) newErrors.hasContact = 'Please specify if you have direct contact details';
    
    if (hasContact === true) {
      if (!contactPhone.trim()) {
        newErrors.contactPhone = 'Client contact phone number is required';
      }
      if (!contactEmail.trim()) {
        newErrors.contactEmail = 'Client contact email address is required';
      } else if (!/\S+@\S+\.\S+/.test(contactEmail)) {
        newErrors.contactEmail = 'Please enter a valid email address';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    // Auto-generate Intelligence ID (e.g. IM-YYYYMMDD-00X)
    const generatedId = generateIntelligenceId(submissions);
    
    const newSub: Submission = {
      intelligenceId: generatedId,
      employeeId: loggedInUser.employeeId,
      employeeName: loggedInUser.name,
      businessUnit: loggedInUser.businessUnit,
      shortDesc: shortDesc.trim(),
      detailedDesc: detailedDesc.trim(),
      hasContact: !!hasContact,
      contactPhone: hasContact ? contactPhone.trim() : undefined,
      contactEmail: hasContact ? contactEmail.trim() : undefined,
      clientName: clientName.trim(),
      status: 'Opportunity Registered',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reportingManager: loggedInUser.reportingManager || 'Not Specified',
      projectManager: loggedInUser.projectManager || 'Not Specified',
      buHead: loggedInUser.buHead || 'Not Specified',
      hrbp: loggedInUser.hrbp || 'Not Specified',
      salesPerson: loggedInUser.salesPerson || 'Not Specified',
      statusHistory: [
        { status: 'Opportunity Registered', changedBy: 'System', timestamp: new Date().toISOString(), comment: 'Submission recorded' }
      ]
    };

    setPendingSubmission(newSub);
    setShowConfirmPrompt(true);
  };

  const handleConfirmFinalSubmit = async () => {
    if (!pendingSubmission) return;
    setShowConfirmPrompt(false);

    const success = await addSubmission(pendingSubmission);
    if (success !== false) {
      setSubmittedData(pendingSubmission);
      setPendingSubmission(null);
    } else {
      setErrors({ submit: 'Failed to submit opportunity. Please check if the server is running and try again.' });
    }
  };

  return (
    <div className="max-w-3xl mx-auto w-full">
      {/* Page Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-navy tracking-tight">Capture Opportunity</h1>
          <p className="text-xs text-slate-500 mt-1">
            Submit client lead intelligence to activate the stakeholder review workflow.
          </p>
        </div>
        <button 
          onClick={() => navigate('/home')}
          className="flex items-center gap-1.5 text-xs font-bold text-brand-navy hover:underline bg-transparent border-none cursor-pointer transition-all"
        >
          <ArrowLeft size={14} />
          Back to Dashboard
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col gap-6">
        {errors.submit && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg text-sm font-bold border border-red-200">
            {errors.submit}
          </div>
        )}
        
        {/* Read-Only HRMS Profile Dropdown Card */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-xl overflow-hidden shadow-sm transition-all">
          <button
            type="button"
            onClick={() => setIsProfileExpanded(!isProfileExpanded)}
            className="w-full p-4 flex items-center justify-between bg-slate-100/80 hover:bg-slate-100 text-brand-navy font-bold text-xs transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2 text-[10px] font-extrabold tracking-wider uppercase text-slate-700">
              <Shield size={16} className="text-brand-navy" />
              <span>HRMS PROFILE SYNC (READ-ONLY)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-slate-200/80 text-slate-600 px-2 py-0.5 rounded-full font-mono font-bold">
                {isProfileExpanded ? 'Collapse' : 'Expand Details'}
              </span>
              {isProfileExpanded ? <ChevronUp size={16} className="text-slate-600" /> : <ChevronDown size={16} className="text-slate-600" />}
            </div>
          </button>

          {isProfileExpanded && (
            <div className="p-5 border-t border-slate-200/60 bg-slate-50/50 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Employee Name</span>
                  <strong className="text-slate-700 font-extrabold">{loggedInUser.name}</strong>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Employee ID</span>
                  <strong className="text-slate-700 font-extrabold">{loggedInUser.employeeId}</strong>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Business Unit</span>
                  <strong className="text-slate-700 font-extrabold">{loggedInUser.businessUnit}</strong>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Reporting Manager</span>
                  <strong className="text-slate-700 font-extrabold">{loggedInUser.reportingManager || 'Not Specified'}</strong>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Business Unit Head</span>
                  <strong className="text-slate-700 font-extrabold">{loggedInUser.buHead || 'Not Specified'}</strong>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Project Manager</span>
                  <strong className="text-slate-700 font-extrabold">{loggedInUser.projectManager || 'Not Specified'}</strong>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">HR Partner</span>
                  <strong className="text-slate-700 font-extrabold">{loggedInUser.hrbp || 'Not Specified'}</strong>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Sales Person Assigned</span>
                  <strong className="text-slate-700 font-extrabold">{loggedInUser.salesPerson || 'Not Specified'}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Client Name Input */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Client / Account Name *</label>
            <span className="text-[10px] text-slate-400 font-medium">Company or Client name</span>
          </div>
          <input 
            type="text" 
            className={`w-full px-3.5 py-2.5 rounded-lg border text-xs transition-all placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
              errors.clientName 
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                : 'border-slate-200 focus:border-brand-navy focus:ring-brand-navy/20'
            }`}
            placeholder="e.g. Apex Retail Corp, Horizon Mutual Bank" 
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
          <span className="text-[10px] text-slate-400 font-normal">Enter the organization or company you have identified this business opportunity with.</span>
          {errors.clientName && <span className="text-[10px] text-red-600 font-bold mt-0.5">⚠️ {errors.clientName}</span>}
        </div>

        {/* Opportunity Title Input */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Opportunity Title *</label>
            <span className="text-[10px] text-slate-400 font-medium">Short 1-line summary</span>
          </div>
          <input 
            type="text" 
            className={`w-full px-3.5 py-2.5 rounded-lg border text-xs transition-all placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
              errors.shortDesc 
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                : 'border-slate-200 focus:border-brand-navy focus:ring-brand-navy/20'
            }`}
            placeholder="e.g. Cloud Migration & Application Modernization for Retail Division" 
            value={shortDesc}
            onChange={(e) => setShortDesc(e.target.value)}
          />
          <span className="text-[10px] text-slate-400 font-normal">Provide a concise, clear title describing what the client needs.</span>
          {errors.shortDesc && <span className="text-[10px] text-red-600 font-bold mt-0.5">⚠️ {errors.shortDesc}</span>}
        </div>

        {/* Opportunity Details textarea */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Opportunity Details & Background *</label>
            <span className="text-[10px] text-slate-400 font-medium">Detailed context</span>
          </div>
          <textarea 
            rows={4} 
            className={`w-full px-3.5 py-2.5 rounded-lg border text-xs transition-all placeholder:text-slate-400 font-sans resize-vertical focus:outline-none focus:ring-1 ${
              errors.detailedDesc 
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                : 'border-slate-200 focus:border-brand-navy focus:ring-brand-navy/20'
            }`}
            placeholder="Describe the opportunity context, tech requirements, potential deal size, or project timeline..." 
            value={detailedDesc}
            onChange={(e) => setDetailedDesc(e.target.value)}
          />
          <span className="text-[10px] text-slate-400 font-normal">Include any helpful details like expected scope, technologies requested, or target timeline.</span>
          {errors.detailedDesc && <span className="text-[10px] text-red-600 font-bold mt-0.5">⚠️ {errors.detailedDesc}</span>}
        </div>

        {/* Contact Details Toggle */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Do you have direct contact details for this lead?
          </label>
          <div className="flex gap-3">
            <button 
              type="button" 
              onClick={() => setHasContact(true)}
              className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-xs border text-center transition-all cursor-pointer ${
                hasContact === true 
                  ? 'border-brand-navy bg-brand-navy text-white shadow-sm' 
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              Yes
            </button>
            <button 
              type="button" 
              onClick={() => {
                setHasContact(false);
                setContactPhone('');
              }}
              className={`flex-1 py-2.5 px-4 rounded-lg font-bold text-xs border text-center transition-all cursor-pointer ${
                hasContact === false 
                  ? 'border-brand-navy bg-brand-navy text-white shadow-sm' 
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              No
            </button>
          </div>
          {errors.hasContact && <span className="text-[10px] text-red-600 font-bold mt-1">⚠️ {errors.hasContact}</span>}
        </div>

        {/* Contact Details Input */}
        {hasContact && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
            
            {/* Phone Number Field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Client Contact Phone Number
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-lg border text-xs transition-all focus:outline-none focus:ring-1 ${
                    errors.contactPhone 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                      : 'border-slate-200 focus:border-brand-navy focus:ring-brand-navy/20'
                  }`}
                  placeholder="+91 XXXXX XXXXX" 
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
                <PhoneCall size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
              {errors.contactPhone && <span className="text-[10px] text-red-600 font-bold mt-1">⚠️ {errors.contactPhone}</span>}
            </div>

            {/* Email Address Field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Client Contact Email Address
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-lg border text-xs transition-all focus:outline-none focus:ring-1 ${
                    errors.contactEmail 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                      : 'border-slate-200 focus:border-brand-navy focus:ring-brand-navy/20'
                  }`}
                  placeholder="client.contact@domain.com" 
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
              {errors.contactEmail && <span className="text-[10px] text-red-600 font-bold mt-1">⚠️ {errors.contactEmail}</span>}
            </div>

          </div>
        )}

        {/* Bottom Bar */}
        <div className="flex flex-wrap gap-4 items-center justify-between border-t border-slate-100 pt-5">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
            <Sparkles size={14} className="text-brand-navy" />
            <span>✦ Policy note: Acknowledgment within 7 working days.</span>
          </div>

          <button 
            type="submit" 
            className="bg-brand-red hover:bg-[#a10e20] text-white border-none font-bold text-xs px-6 py-3 rounded-lg flex items-center gap-2 cursor-pointer transition-all shadow-sm"
          >
            <Send size={13} />
            Submit Opportunity
          </button>
        </div>

      </form>

      {/* Pre-Submission Confirmation Dialog (Yes / No Prompt) */}
      {showConfirmPrompt && pendingSubmission && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 flex flex-col gap-5 text-center animate-scaleUp relative">
            
            {/* Warning Question Mark Icon */}
            <div className="w-14 h-14 rounded-full bg-brand-red/10 text-brand-red flex items-center justify-center mx-auto ring-8 ring-rose-50">
              <Send size={26} />
            </div>

            <div>
              <h3 className="text-lg font-extrabold text-brand-navy tracking-tight">Confirm Opportunity Submission?</h3>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Are you sure you want to submit this opportunity lead to the review workflow?
              </p>
            </div>

            {/* Opportunity Brief Box */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col gap-2 text-left text-xs">
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Client / Account:</span>
                <span className="font-extrabold text-slate-800">{pendingSubmission.clientName}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1.5">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Short Title:</span>
                <span className="font-bold text-slate-700 truncate max-w-[200px]">{pendingSubmission.shortDesc}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Submitter:</span>
                <span className="font-semibold text-slate-700">{pendingSubmission.employeeName} ({pendingSubmission.employeeId})</span>
              </div>
            </div>

            {/* Yes / No Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowConfirmPrompt(false)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer border-none"
              >
                ✕ No, Edit Details
              </button>

              <button
                onClick={handleConfirmFinalSubmit}
                className="py-2.5 px-4 bg-brand-navy hover:bg-[#121E52] text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer border-none flex items-center justify-center gap-1.5"
              >
                ✓ Yes, Submit Lead
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Confirmation Modal Popup (Success Modal) */}
      {submittedData && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 flex flex-col gap-5 text-center animate-scaleUp relative">
            
            {/* Success Icon Badge */}
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-50">
              <Sparkles size={32} />
            </div>

            {/* Modal Title */}
            <div>
              <h2 className="text-xl font-extrabold text-brand-navy tracking-tight">Opportunity Submitted!</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Your opportunity lead has been registered and assigned an Intelligence ID.
              </p>
            </div>

            {/* Submission Summary Card */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col gap-2.5 text-left text-xs">
              <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Intelligence ID:</span>
                <span className="font-mono font-extrabold text-brand-navy bg-slate-200/80 px-2 py-0.5 rounded text-xs">{submittedData.intelligenceId}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Client Name:</span>
                <span className="font-extrabold text-slate-800">{submittedData.clientName}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Current Stage:</span>
                <span className="font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px]">Stage 1: Opportunity Registered (10%)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold uppercase text-[10px]">SLA Target:</span>
                <span className="font-bold text-amber-700">2 Working Days for Validation</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic">
              Automated confirmation emails have been sent to you and all mapped stakeholders.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => navigate('/home')}
                className="w-full py-3 bg-brand-navy hover:bg-[#121E52] text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer border-none"
              >
                Go to Dashboard & Track Lead
              </button>

              <button
                onClick={() => {
                  setSubmittedData(null);
                  setShortDesc('');
                  setDetailedDesc('');
                  setHasContact(null);
                  setContactPhone('');
                  setContactEmail('');
                  setClientName('');
                }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer border-none"
              >
                + Submit Another Opportunity
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
