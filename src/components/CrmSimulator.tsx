import React, { useState } from 'react';
import type { Submission, EmailLog } from '../mockData.ts';
import { triggerMailer } from '../utils.ts';
import { RefreshCw, ArrowRight, Building2, ClipboardCheck } from 'lucide-react';

interface CrmSimulatorProps {
  submissions: Submission[];
  updateSubmission: (id: string, updatedFields: Partial<Submission>) => void;
  logEmails: (emails: EmailLog[]) => void;
}

export const CrmSimulator: React.FC<CrmSimulatorProps> = ({ 
  submissions, 
  updateSubmission, 
  logEmails 
}) => {
  const [activeTab, setActiveTab] = useState<'pipeline' | 'mapping'>('pipeline');
  const [selectedLead, setSelectedLead] = useState<Submission | null>(null);
  const [dropReason, setDropReason] = useState('');
  const [showDropForm, setShowDropForm] = useState(false);

  // Get only submissions that have been validated and routed to CRM
  const crmLeads = submissions.filter(sub => 
    sub.status !== 'Under Review' && sub.status !== 'Closed - Not Valid'
  );

  const handleStageChange = (lead: Submission, newStage: Submission['status']) => {
    if (newStage === 'Closed - Dropped') {
      setShowDropForm(true);
      return;
    }

    const oldStatus = lead.status;
    const updatedFields: Partial<Submission> = {
      status: newStage,
      updatedAt: new Date().toISOString()
    };

    updateSubmission(lead.intelligenceId, updatedFields);
    if (selectedLead?.intelligenceId === lead.intelligenceId) {
      setSelectedLead({ ...lead, ...updatedFields } as Submission);
    }

    // Trigger CRM progression emails
    const stageEmails = triggerMailer('crm_progression', { ...lead, ...updatedFields } as Submission, {
      oldStatus
    });
    logEmails(stageEmails);
  };

  const handleDropSubmit = (e: React.FormEvent, lead: Submission) => {
    e.preventDefault();
    if (!dropReason.trim()) return;

    const updatedFields: Partial<Submission> = {
      status: 'Closed - Dropped',
      reason: dropReason,
      updatedAt: new Date().toISOString()
    };

    updateSubmission(lead.intelligenceId, updatedFields);
    setSelectedLead({ ...lead, ...updatedFields } as Submission);

    // Trigger emails
    const dropEmails = triggerMailer('validation_rejection', { ...lead, ...updatedFields } as Submission, {
      reason: dropReason
    });
    logEmails(dropEmails);

    // Reset drop inputs
    setDropReason('');
    setShowDropForm(false);
  };

  return (
    <div className="w-full">
      {/* Page Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-navy tracking-tight">CRM System Simulator</h1>
          <p className="text-xs text-slate-500 mt-1">Simulate Microsoft Dynamics / Salesforce synchronization. Progress lead cycles and push state changes.</p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${
              activeTab === 'pipeline' 
                ? 'bg-brand-navy text-white shadow-sm' 
                : 'text-slate-600 hover:text-brand-navy bg-transparent'
            }`}
          >
            Leads Pipeline
          </button>
          <button
            onClick={() => setActiveTab('mapping')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${
              activeTab === 'mapping' 
                ? 'bg-brand-navy text-white shadow-sm' 
                : 'text-slate-600 hover:text-brand-navy bg-transparent'
            }`}
          >
            Integration Field Map
          </button>
        </div>
      </div>

      {activeTab === 'pipeline' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* CRM Leads Queue */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 lg:col-span-7">
            <h2 className="text-sm font-extrabold text-brand-navy mb-4 flex items-center gap-2 uppercase tracking-wider">
              <Building2 size={18} className="text-blue-600" />
              Active CRM Roster ({crmLeads.length})
            </h2>
            
            <div className="flex flex-col gap-3">
              {crmLeads.length === 0 ? (
                <div className="text-center py-16 px-4 text-slate-400 text-xs font-semibold">
                  No leads currently synced. Validate an opportunity in the Review Dashboard to push records here.
                </div>
              ) : (
                crmLeads.map(lead => {
                  const isSelected = selectedLead?.intelligenceId === lead.intelligenceId;
                  let borderCol = 'border-l-blue-600';
                  if (lead.status === 'Closed - Dropped') borderCol = 'border-l-rose-500';
                  if (lead.status === 'Closed - Converted') borderCol = 'border-l-emerald-500';

                  return (
                    <div 
                      key={lead.intelligenceId} 
                      className={`p-4 rounded-xl border border-slate-100 border-l-4 ${borderCol} transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-50/15 shadow-sm shadow-blue-100 border-blue-200' 
                          : 'bg-white hover:bg-slate-50/50'
                      }`}
                      onClick={() => {
                        setSelectedLead(lead);
                        setShowDropForm(false);
                      }}
                    >
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mb-2">
                        <span className="text-blue-600 tracking-wider uppercase">{lead.intelligenceId}</span>
                        <span className="font-mono">{lead.crmLeadId}</span>
                      </div>
                      <div className="font-bold text-slate-800 text-sm mb-1">{lead.clientName}</div>
                      <div className="text-xs text-slate-500 mb-3 line-clamp-1">{lead.shortDesc}</div>
                      
                      <div className="flex justify-between items-center text-[11px] border-t border-slate-100/50 pt-2">
                        <span className="text-slate-400">Contributor: <strong className="text-slate-600 font-semibold">{lead.employeeName}</strong></span>
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-50 border border-slate-100 text-slate-600">{lead.status}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* CRM Stage Transition Controller */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 lg:col-span-5">
            <h2 className="text-sm font-extrabold text-brand-navy mb-4 flex items-center gap-2 uppercase tracking-wider">
              <RefreshCw size={18} className="text-emerald-500" />
              CRM Status Controller
            </h2>

            {selectedLead ? (
              <div className="flex flex-col gap-5">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Client Account</span>
                  <div className="text-base font-extrabold text-slate-800">{selectedLead.clientName}</div>
                  <span className="text-xs text-slate-500 block mt-0.5 font-mono">CRM Reference: {selectedLead.crmLeadId}</span>
                </div>

                <div className="flex flex-col gap-3">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Advance CRM Stage</span>
                  
                  {selectedLead.status === 'Closed - Dropped' || selectedLead.status === 'Closed - Converted' ? (
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-xs text-slate-500 leading-relaxed font-semibold">
                      This CRM record has reached a terminal status: <strong className="text-slate-700">{selectedLead.status}</strong>. Its lifecycle is complete.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      
                      {/* Validate -> Register */}
                      {selectedLead.status === 'Validated' && (
                        <button 
                          className="w-full inline-flex justify-between items-center px-4 py-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-bold text-xs cursor-pointer transition-all shadow-sm"
                          onClick={() => handleStageChange(selectedLead, 'Lead Registered')}
                        >
                          <span>Initialize Integration (Sync)</span>
                          <ArrowRight size={15} className="text-slate-400" />
                        </button>
                      )}

                      {/* Register -> Accept */}
                      {selectedLead.status === 'Lead Registered' && (
                        <button 
                          className="w-full inline-flex justify-between items-center px-4 py-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-bold text-xs cursor-pointer transition-all shadow-sm"
                          onClick={() => handleStageChange(selectedLead, 'Lead Accepted')}
                        >
                          <span>Accept Lead in CRM</span>
                          <ArrowRight size={15} className="text-slate-400" />
                        </button>
                      )}

                      {/* Accept → Opportunity Registered */}
                      {selectedLead.status === 'Lead Accepted' && (
                        <button 
                          className="w-full inline-flex justify-between items-center px-4 py-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-bold text-xs cursor-pointer transition-all shadow-sm"
                          onClick={() => handleStageChange(selectedLead, 'Opportunity Registered')}
                        >
                          <span>Register as Opportunity</span>
                          <ArrowRight size={15} className="text-slate-400" />
                        </button>
                      )}

                      {/* Opportunity Registered → Proposal */}
                      {selectedLead.status === 'Opportunity Registered' && (
                        <button 
                          className="w-full inline-flex justify-between items-center px-4 py-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-bold text-xs cursor-pointer transition-all shadow-sm"
                          onClick={() => handleStageChange(selectedLead, 'Proposal')}
                        >
                          <span>Move to Proposal (RFQ/RFP)</span>
                          <ArrowRight size={15} className="text-slate-400" />
                        </button>
                      )}

                      {/* Proposal -> Negotiation */}
                      {selectedLead.status === 'Proposal' && (
                        <button 
                          className="w-full inline-flex justify-between items-center px-4 py-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-bold text-xs cursor-pointer transition-all shadow-sm"
                          onClick={() => handleStageChange(selectedLead, 'Negotiation')}
                        >
                          <span>Move to Negotiation</span>
                          <ArrowRight size={15} className="text-slate-400" />
                        </button>
                      )}

                      {/* Convert / Drop */}
                      <div className="flex gap-2.5 mt-2">
                        <button 
                          className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs border-none cursor-pointer transition-all shadow-sm"
                          onClick={() => handleStageChange(selectedLead, 'Closed - Converted')}
                        >
                          ✓ Convert (Won)
                        </button>
                        
                        {!showDropForm && (
                          <button 
                            className="flex-1 py-2.5 rounded-lg bg-brand-red hover:bg-[#a10e20] text-white font-bold text-xs border-none cursor-pointer transition-all shadow-sm"
                            onClick={() => setShowDropForm(true)}
                          >
                            ✗ Drop (Lost)
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Drop Reason Form */}
                {showDropForm && (
                  <form onSubmit={(e) => handleDropSubmit(e, selectedLead)} className="border border-red-200 bg-red-50/10 p-4 rounded-xl flex flex-col gap-3 animate-fadeIn">
                    <label className="text-[10px] font-bold text-brand-red uppercase tracking-wider">Reason for Dropping Lead</label>
                    <textarea 
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 focus:border-brand-red focus:ring-1 focus:ring-brand-red/20 focus:outline-none text-xs transition-all font-sans"
                      rows={2} 
                      placeholder="Why was this lead dropped? (Budget, competition, no client response, etc.)"
                      value={dropReason}
                      onChange={(e) => setDropReason(e.target.value)}
                      required
                    />
                    <div className="flex gap-2 justify-end">
                      <button type="button" className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer transition-all" onClick={() => setShowDropForm(false)}>Cancel</button>
                      <button type="submit" className="px-3 py-1.5 rounded-lg bg-brand-red hover:bg-[#a10e20] text-white font-bold text-xs border-none cursor-pointer transition-all">Confirm Drop</button>
                    </div>
                  </form>
                )}

                {/* Integration Info Box */}
                <div className="border-t border-slate-100 pt-4 text-[10px] text-slate-400 leading-relaxed font-semibold">
                  Changing the status here simulates real-time webhook sync updates from Microsoft Dynamics back into the portal database, which immediately triggers stakeholder email flows.
                </div>
              </div>
            ) : (
              <div className="text-center py-20 px-4 text-slate-400 text-xs font-semibold">
                Select a lead from the active queue to control CRM status transitions.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Integration Fields Mapping View */
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <h2 className="text-sm font-extrabold text-brand-navy mb-4 flex items-center gap-2 uppercase tracking-wider">
            <ClipboardCheck size={18} className="text-brand-red" />
            Portal-to-CRM API Data Mapping Schema
          </h2>

          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="px-5 py-3">IMPACT Lead Source Parameter</th>
                  <th className="px-5 py-3">CRM Integration Endpoint Map</th>
                  <th className="px-5 py-3">Payload Example Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                <tr>
                  <td className="px-5 py-3.5 font-bold text-brand-red">Opportunity ID</td>
                  <td className="px-5 py-3.5">`leadsourcecode` (IMPACT)</td>
                  <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">"IMP-2026-001"</td>
                </tr>
                <tr>
                  <td className="px-5 py-3.5 font-bold text-slate-800">Employee Name / ID</td>
                  <td className="px-5 py-3.5">`contributor_id_text` (Contributor Name)</td>
                  <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">"Shinto Sebastian (ND-10042)"</td>
                </tr>
                <tr>
                  <td className="px-5 py-3.5 font-bold text-slate-800">Client Name</td>
                  <td className="px-5 py-3.5">`companyname` (Account Target)</td>
                  <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">"Apex Retail Solutions Inc."</td>
                </tr>
                <tr>
                  <td className="px-5 py-3.5 font-bold text-slate-800">Opportunity Capture Details</td>
                  <td className="px-5 py-3.5">`description` (Lead Description)</td>
                  <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">"Enterprise Cloud Migration - Client ERP..."</td>
                </tr>
                <tr>
                  <td className="px-5 py-3.5 font-bold text-slate-800">Sales Person Assigned</td>
                  <td className="px-5 py-3.5">`ownerid` (CRM Lead Owner)</td>
                  <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">"Jacob Varghese (Sales Executive)"</td>
                </tr>
                <tr>
                  <td className="px-5 py-3.5 font-bold text-slate-800">Contact Details (if applicable)</td>
                  <td className="px-5 py-3.5">`telephone1` / `emailaddress1`</td>
                  <td className="px-5 py-3.5 font-mono text-[11px] text-slate-500">"+91 9876543210"</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
