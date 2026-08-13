import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { ROLE_MAP } from '../types.ts';
import type { Employee } from '../types.ts';
import { FilePlus2, Landmark, RefreshCcw, Mail, Database, LogOut, Bell, HelpCircle } from 'lucide-react';

// Import corporate branding assets
import nestLogo from '../assets/nest_logo.png';

// ----------------------------------------------------
// PORTAL CONTAINER & NAVBAR LAYOUT
// ----------------------------------------------------
export interface DashboardLayoutProps {
  unreadCount: number;
  notifications: any[];
  markAllAsRead: () => void;
  loggedInUser: Employee | null;
  currentUserRole: string;
  handleLogout: () => void;
  reviewCount: number;
}

export function DashboardLayout({
  unreadCount,
  notifications,
  markAllAsRead,
  loggedInUser,
  currentUserRole,
  handleLogout,
  reviewCount
}: DashboardLayoutProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname;
  const isOnReviewBoard = currentPath === '/reviewer';
  const hasReviewAccess = reviewCount > 0;

  return (
    <div className="flex flex-col min-h-screen bg-brand-bg font-sans">
      
      {/* Horizontal Light Header Navigation */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-[1000] flex items-center justify-between px-6 shadow-sm">
         <div className="flex items-center gap-4">
            <div onClick={() => navigate('/home')} className="cursor-pointer flex items-center gap-3">
              {/* High-clarity cropped sphere icon from nest_logo.png */}
              <div className="bg-white rounded-full w-[52px] h-[30px] relative overflow-hidden flex items-center justify-center flex-shrink-0">
                <img 
                  src={nestLogo} 
                  alt="NeST Logo" 
                  className="absolute max-w-none block" 
                  style={{ left: '3px', top: '-3px', height: '36px', width: 'auto' }}
                />
              </div>
              
              {/* NeST DIGITAL text cropped from nest_logo.png */}
              <div className="w-[38px] h-[30px] overflow-hidden relative ml-0.5 flex-shrink-0">
                <img 
                  src={nestLogo} 
                  alt="NeST Digital Text" 
                  className="absolute max-w-none block" 
                  style={{ left: '-42px', top: '-1px', height: '32px', width: 'auto' }}
                />
              </div>

              <div className="w-[1px] h-6 bg-slate-200 mx-1.5" />
              
              <div className="flex flex-col font-sans tracking-wide">
                <span className="font-extrabold text-[12px] text-brand-navy tracking-wider">
                  {isOnReviewBoard ? 'REVIEW BOARD' : 'IMPACT PORTAL'}
                </span>
              </div>
            </div>
        </div>

        {/* Center horizontal nav links */}
        <nav className="hidden md:flex items-center gap-2">
          <button 
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${
              currentPath === '/home' ? 'text-brand-navy bg-slate-100 shadow-sm' : 'text-slate-600 hover:text-brand-navy hover:bg-slate-50'
            }`}
            onClick={() => navigate('/home')}
          >
            <span>HOME</span>
          </button>

          <button 
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${
              currentPath === '/submit' ? 'text-brand-navy bg-slate-100 shadow-sm' : 'text-slate-600 hover:text-brand-navy hover:bg-slate-50'
            }`}
            onClick={() => navigate('/submit')}
          >
            <FilePlus2 size={13} />
            <span>SUBMIT LEAD</span>
          </button>

          <button 
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${
              currentPath === '/outbox' ? 'text-brand-navy bg-slate-100 shadow-sm' : 'text-slate-600 hover:text-brand-navy hover:bg-slate-50'
            }`}
            onClick={() => navigate('/outbox')}
          >
            <Mail size={13} />
            <span>OUTBOX LOGS</span>
          </button>

          {/* Review Board — visible to all, enabled only when user has submissions assigned */}
          <button 
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all border-none ${
              !hasReviewAccess 
                ? 'text-slate-300 cursor-not-allowed opacity-50' 
                : currentPath === '/reviewer' 
                  ? 'text-brand-navy bg-slate-100 shadow-sm cursor-pointer' 
                  : 'text-slate-600 hover:text-brand-navy hover:bg-slate-50 cursor-pointer'
            }`}
            onClick={() => hasReviewAccess && navigate('/reviewer')}
            disabled={!hasReviewAccess}
            title={hasReviewAccess ? 'Review employee submissions' : 'No submissions assigned to you yet'}
          >
            <Landmark size={13} />
            <span>REVIEW BOARD</span>
            {hasReviewAccess && reviewCount > 0 && (
              <span className="bg-brand-red text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center ml-0.5">
                {reviewCount}
              </span>
            )}
          </button>

          {currentUserRole === 'System Auditor' && (
            <button 
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${
                currentPath === '/db' ? 'text-brand-navy bg-slate-100 shadow-sm' : 'text-slate-600 hover:text-brand-navy hover:bg-slate-50'
              }`}
              onClick={() => navigate('/db')}
            >
              <Database size={13} />
              <span>DB HUB</span>
            </button>
          )}
        </nav>

        {/* Right side notification + profile badge */}
        <div className="flex items-center gap-4 relative">
          <button 
            className="text-slate-600 hover:text-brand-navy relative bg-transparent border-none cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 transition-all duration-200" 
            onClick={() => setShowNotifications(!showNotifications)}
            title="System Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-brand-red text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center border border-white animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute top-12 right-0 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-[1010] text-slate-800 overflow-hidden animate-fadeIn">
              <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100 bg-slate-50">
                <span className="font-bold text-xs text-brand-navy">Recent Alerts</span>
                <button 
                  onClick={markAllAsRead}
                  className="bg-transparent border-none text-brand-red hover:underline text-[10px] font-bold cursor-pointer"
                >
                  Mark all as read
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs font-medium">
                    No alerts.
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div key={notif.id} className={`p-4 flex gap-3 items-start transition-colors ${notif.read ? 'bg-white' : 'bg-red-50/5'}`}>
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${notif.read ? 'bg-slate-300' : 'bg-brand-red'}`} />
                      <div className="flex flex-col gap-0.5">
                        <span className={`text-xs text-slate-700 leading-normal ${notif.read ? 'font-medium' : 'font-bold'}`}>
                          {notif.message}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* User Profile Role Indicator & Badge */}
          {loggedInUser && (
            <div className={`flex items-center gap-2 border pl-1 pr-3 py-1 rounded-full text-xs transition-all duration-200 cursor-pointer bg-slate-50 border-slate-200 hover:bg-slate-100`}>
              <div className={`w-7 h-7 rounded-full text-white flex items-center justify-center font-black text-[11px] ${
                currentUserRole === 'reviewer' ? 'bg-rose-600' : 'bg-[#DC2626]'
              }`}>
                {loggedInUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
              <div className="hidden lg:flex flex-col leading-tight">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-[11px] text-brand-navy">{loggedInUser.name.split(' (')[0]}</span>
                </div>
                <span className="text-slate-500 text-[9px] font-semibold truncate max-w-[120px]">
                  {loggedInUser.designation || ROLE_MAP[loggedInUser.email.toLowerCase()]?.designation || (currentUserRole === 'reviewer' ? 'Review Board' : 'Employee')}
                </span>
              </div>
            </div>
          )}

          <button 
            onClick={handleLogout}
            className="text-slate-600 hover:text-brand-navy flex items-center gap-1 text-[11px] font-bold bg-transparent border-none cursor-pointer transition-all ml-1"
            title="Log Out"
          >
            <LogOut size={14} />
            <span>Exit</span>
          </button>
        </div>
      </header>

      {/* Nested Page Container */}
      <main className="flex-1 mt-16 px-6 py-8 max-w-7xl w-full mx-auto flex flex-col gap-6">
        <Outlet />
      </main>

      {/* Floating "?" Help Center Button */}
      <button 
        onClick={() => setShowHelp(true)}
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-brand-navy hover:bg-[#121E52] text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 cursor-pointer z-[999] transition-all border border-slate-700"
        title="Impact Help Center & Guide"
      >
        <HelpCircle size={22} />
      </button>

      {/* Slide-over Help Drawer */}
      {showHelp && (
        <div className="fixed inset-0 z-[2000] flex justify-end bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 flex flex-col gap-6 relative overflow-y-auto animate-slideInRight">
            
            {/* Drawer Header */}
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">💡</span>
                <div>
                  <h3 className="text-sm font-extrabold text-brand-navy tracking-tight uppercase">IMPACT Quick Guide</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">How to use the portal effectively</p>
                </div>
              </div>
              <button 
                onClick={() => setShowHelp(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 border border-slate-200/50 cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Quick Start Steps based on User Role */}
            <div className="flex flex-col gap-5 text-xs text-slate-600 leading-relaxed">
              
              {loggedInUser?.role === 'reviewer' ? (
                // Reviewer / Manager Help Content
                <>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col gap-2">
                    <span className="text-[10px] font-extrabold text-brand-navy tracking-wider uppercase block">📋 Reviewer Guide Checklist</span>
                    <ul className="list-disc pl-4 flex flex-col gap-1.5 font-medium text-slate-600">
                      <li><strong>Review Submissions:</strong> Access assigned opportunity leads requiring validation on the <strong>Review Board</strong>.</li>
                      <li><strong>Validate & Push to CRM:</strong> Clicking <strong>Validate & Approve</strong> approves the lead and automatically pushes it to the live CRM API (port 8089) with a generated <code>crmOpportunityId</code>.</li>
                      <li><strong>Request Clarification:</strong> Send a query back to the submitter if more info is needed before approval.</li>
                      <li><strong>Mandatory Comments:</strong> Rejection or closure reasons are mandatory when closing a lead.</li>
                    </ul>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <span className="text-[10px] font-extrabold text-brand-navy tracking-wider uppercase block border-b border-slate-100 pb-1">⚙️ Reviewer Action Workflows</span>
                    <div className="flex flex-col gap-3 pl-1">
                      <div>
                        <strong className="text-brand-navy font-bold">Validate & Approve:</strong> 
                        <p className="text-[11px] text-slate-500 mt-0.5">Approves the submission and syncs it directly to Dynamics 365 CRM, creating the CRM Lead Reference ID.</p>
                      </div>
                      <div>
                        <strong className="text-brand-navy font-bold">Request Clarification:</strong> 
                        <p className="text-[11px] text-slate-500 mt-0.5">Sends a query notification email to the submitter to provide additional details.</p>
                      </div>
                      <div>
                        <strong className="text-brand-navy font-bold">Reject / Close:</strong> 
                        <p className="text-[11px] text-slate-500 mt-0.5">Closes the lead immediately and logs an email alert to the submitter and all stakeholders.</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                // Employee / Submitter Help Content
                <>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col gap-2">
                    <span className="text-[10px] font-extrabold text-brand-navy tracking-wider uppercase block">🚀 Submitter Guide Checklist</span>
                    <ul className="list-disc pl-4 flex flex-col gap-1.5 font-medium text-slate-600">
                      <li><strong>Submit a Lead:</strong> Click <strong>"+ Submit Lead"</strong> to register an opportunity with client details and project scope.</li>
                      <li><strong>Track Progress:</strong> View your opportunity card to monitor the <strong>7-Stage Lead Lifecycle Stepper</strong> in real-time.</li>
                      <li><strong>Outbox Logs:</strong> Check the <strong>Outbox Logs</strong> tab to see all automated email alerts sent to managers and stakeholders.</li>
                      <li><strong>Clarifications:</strong> If a manager requests information, open your opportunity row and submit your response.</li>
                    </ul>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <span className="text-[10px] font-extrabold text-brand-navy tracking-wider uppercase block border-b border-slate-100 pb-1">📈 7-Stage Lead Lifecycle Stepper</span>
                    <div className="flex flex-col gap-2.5 pl-1">
                      <div>
                        <strong className="text-brand-navy font-bold">1. Opportunity Registered (10%):</strong> 
                        <p className="text-[11px] text-slate-500 mt-0.5">Opportunity submitted on portal by employee.</p>
                      </div>
                      <div>
                        <strong className="text-brand-navy font-bold">2. Validated (25%):</strong> 
                        <p className="text-[11px] text-slate-500 mt-0.5">Approved by Reviewer on the Review Board.</p>
                      </div>
                      <div>
                        <strong className="text-brand-navy font-bold">3. Lead Registered (40%):</strong> 
                        <p className="text-[11px] text-slate-500 mt-0.5">Pushed to CRM API & assigned a CRM Reference ID.</p>
                      </div>
                      <div>
                        <strong className="text-brand-navy font-bold">4. Lead Accepted (55%):</strong> 
                        <p className="text-[11px] text-slate-500 mt-0.5">Accepted by the Sales team in the CRM.</p>
                      </div>
                      <div>
                        <strong className="text-brand-navy font-bold">5. Proposal (70%):</strong> 
                        <p className="text-[11px] text-slate-500 mt-0.5">Formal proposal submitted to the client.</p>
                      </div>
                      <div>
                        <strong className="text-brand-navy font-bold">6. Negotiation (85%):</strong> 
                        <p className="text-[11px] text-slate-500 mt-0.5">Commercial proposal & contract terms under negotiation.</p>
                      </div>
                      <div>
                        <strong className="text-brand-navy font-bold">7. Deal Won (100% 🏆):</strong> 
                        <p className="text-[11px] text-slate-500 mt-0.5">Opportunity successfully closed & deal won!</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* SLA Policies */}
              <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-4 flex flex-col gap-1.5 text-amber-900">
                <span className="text-[10px] font-extrabold tracking-wider uppercase block">⚠️ SLA Compliance Policy</span>
                <p className="text-[11px] leading-normal font-medium">
                  Reviewers have <strong>2 working days</strong> from submission to acknowledge and validate your lead. Any item exceeding this shows a <span className="text-brand-red font-bold">⚠️ Overdue</span> SLA warning badge.
                </p>
              </div>

            </div>

            {/* Close button inside panel */}
            <button 
              onClick={() => setShowHelp(false)}
              className="mt-6 py-2.5 w-full bg-brand-navy hover:bg-[#121E52] text-white text-xs font-bold rounded-lg transition-all cursor-pointer border-none"
            >
              Got it, close guide
            </button>

          </div>
        </div>
      )}
    </div>
  );
}
