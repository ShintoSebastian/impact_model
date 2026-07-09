import React, { useState } from 'react';
import type { Employee, Submission } from '../mockData.ts';
import { generateIntelligenceId, triggerMailer } from '../utils.ts';
import { Shield, Sparkles, Send, PhoneCall, ArrowLeft, Mail } from 'lucide-react';

interface EmployeePortalProps {
  submissions: Submission[];
  addSubmission: (sub: Submission) => void;
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
    
    const newSubmission: Submission = {
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
      status: 'Under Review',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reportingManager: loggedInUser.reportingManager,
      projectManager: loggedInUser.projectManager || 'Kiran Joseph (kiran.j@nestdigital.com)',
      buHead: loggedInUser.buHead || 'Suresh Nair (suresh.n@nestdigital.com)',
      hrbp: loggedInUser.hrbp || 'Deepa Menon (deepa.m@nestdigital.com)',
      salesPerson: loggedInUser.salesPerson || 'Jacob Varghese (jacob.varghese@nestdigital.com)',
      statusHistory: [
        { status: 'Under Review', changedBy: 'System', timestamp: new Date().toISOString(), comment: 'Submission recorded' }
      ]
    };

    // Save submission
    addSubmission(newSubmission);

    // Trigger acknowledgement and alert emails
    const ackEmails = triggerMailer('submission_ack', newSubmission);
    const alertEmails = triggerMailer('stakeholder_alert', newSubmission);
    logEmails([...ackEmails, ...alertEmails]);

    // Redirect to home dashboard
    navigate('/home');
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
        
        {/* Read-Only HRMS Profile Block */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-[10px] font-bold text-brand-navy tracking-wider uppercase mb-4">
            <Shield size={16} className="text-brand-navy" />
            🛡 HRMS PROFILE SYNC (READ-ONLY)
          </div>
          
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
              <strong className="text-slate-700 font-extrabold">{loggedInUser.reportingManager}</strong>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Business Unit Head</span>
              <strong className="text-slate-700 font-extrabold">{loggedInUser.buHead || 'Suresh Nair (suresh.n@nestdigital.com)'}</strong>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Project Manager</span>
              <strong className="text-slate-700 font-extrabold">{loggedInUser.projectManager || 'Kiran Joseph (kiran.j@nestdigital.com)'}</strong>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">HR Partner</span>
              <strong className="text-slate-700 font-extrabold">{loggedInUser.hrbp || 'Deepa Menon (deepa.m@nestdigital.com)'}</strong>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Sales Person Assigned</span>
              <strong className="text-slate-700 font-extrabold">{loggedInUser.salesPerson || 'Jacob Varghese (jacob.varghese@nestdigital.com)'}</strong>
            </div>
          </div>
        </div>

        {/* Client Name Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Client / Account Name</label>
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
          {errors.clientName && <span className="text-[10px] text-red-600 font-bold mt-1">⚠️ {errors.clientName}</span>}
        </div>

        {/* Opportunity Title Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Opportunity Title</label>
          <input 
            type="text" 
            className={`w-full px-3.5 py-2.5 rounded-lg border text-xs transition-all placeholder:text-slate-400 focus:outline-none focus:ring-1 ${
              errors.shortDesc 
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                : 'border-slate-200 focus:border-brand-navy focus:ring-brand-navy/20'
            }`}
            placeholder="Brief summary of the sales lead or tech opportunity" 
            value={shortDesc}
            onChange={(e) => setShortDesc(e.target.value)}
          />
          {errors.shortDesc && <span className="text-[10px] text-red-600 font-bold mt-1">⚠️ {errors.shortDesc}</span>}
        </div>

        {/* Opportunity Details textarea */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Opportunity Details</label>
          <textarea 
            rows={5} 
            className={`w-full px-3.5 py-2.5 rounded-lg border text-xs transition-all placeholder:text-slate-400 font-sans resize-vertical focus:outline-none focus:ring-1 ${
              errors.detailedDesc 
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
                : 'border-slate-200 focus:border-brand-navy focus:ring-brand-navy/20'
            }`}
            placeholder="Provide context, technology stack requirements, budget indications, or timeline parameters..." 
            value={detailedDesc}
            onChange={(e) => setDetailedDesc(e.target.value)}
          />
          {errors.detailedDesc && <span className="text-[10px] text-red-600 font-bold mt-1">⚠️ {errors.detailedDesc}</span>}
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
            <span>✦ Policy note: Acknowledgment within 2 working days.</span>
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
    </div>
  );
};
