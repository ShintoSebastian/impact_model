import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { ROLE_MAP } from '../mockData.ts';
import type { Employee } from '../mockData.ts';
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
}

export function DashboardLayout({
  unreadCount,
  notifications,
  markAllAsRead,
  loggedInUser,
  currentUserRole,
  handleLogout
}: DashboardLayoutProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const currentPath = location.pathname;

  return (
    <div className="flex flex-col min-h-screen bg-brand-bg font-sans">
      
      {/* Horizontal Navy Header Navigation */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-brand-navy border-b border-slate-800 z-[1000] flex items-center justify-between px-6">
         <div className="flex items-center gap-4">
            <div onClick={() => navigate(currentUserRole === 'reviewer' ? '/reviewer' : '/home')} className="cursor-pointer flex items-center gap-3">
              {/* High-clarity cropped sphere icon from nest_logo.png */}
              <div className="bg-white rounded-full w-[52px] h-[30px] relative overflow-hidden flex items-center justify-center shadow-sm flex-shrink-0">
                <img 
                  src={nestLogo} 
                  alt="NeST Logo" 
                  className="absolute max-w-none block" 
                  style={{ left: '3px', top: '-3px', height: '36px', width: 'auto' }}
                />
              </div>
              
              {/* White-inverted "NeST DIGITAL" text cropped from nest_logo.png */}
              <div className="w-[38px] h-[30px] overflow-hidden relative brightness-0 invert ml-0.5 flex-shrink-0">
                <img 
                  src={nestLogo} 
                  alt="NeST Digital Text" 
                  className="absolute max-w-none block" 
                  style={{ left: '-42px', top: '-1px', height: '32px', width: 'auto' }}
                />
              </div>

              <div className="w-[1px] h-6 bg-white/20 mx-1.5" />
              
              <div className="flex flex-col font-sans tracking-wide">
                <span className="font-extrabold text-[12px] text-slate-200 tracking-wider">
                  {currentUserRole === 'reviewer' ? 'REVIEWER PORTAL' : 'EMPLOYEE PORTAL'}
                </span>
              </div>
            </div>
        </div>

        {/* Center horizontal nav links */}
        <nav className="hidden md:flex items-center gap-2">
          {currentUserRole !== 'reviewer' && (
            <>
              <button 
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${
                  currentPath === '/home' ? 'text-white bg-white/10 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
                onClick={() => navigate('/home')}
              >
                <span>HOME</span>
              </button>

              <button 
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${
                  currentPath === '/submit' ? 'text-white bg-white/10 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
                onClick={() => navigate('/submit')}
              >
                <FilePlus2 size={13} />
                <span>SUBMIT LEAD</span>
              </button>
            </>
          )}

          <button 
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${
              currentPath === '/outbox' ? 'text-white bg-white/10 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
            onClick={() => navigate('/outbox')}
          >
            <Mail size={13} />
            <span>OUTBOX LOGS</span>
          </button>

          {/* Dev Simulators / Review Board accessible to Reviewer / Admin */}
          {(currentUserRole === 'reviewer' || currentUserRole === 'System Auditor') && (
            <>
              <button 
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${
                  currentPath === '/reviewer' ? 'text-white bg-white/10 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
                onClick={() => navigate('/reviewer')}
              >
                <Landmark size={13} />
                <span>REVIEW BOARD</span>
              </button>

              <button 
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${
                  currentPath === '/crm' ? 'text-white bg-white/10 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
                onClick={() => navigate('/crm')}
              >
                <RefreshCcw size={13} />
                <span>CRM SYNC SIM</span>
              </button>
            </>
          )}

          {currentUserRole === 'System Auditor' && (
            <button 
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all border-none cursor-pointer ${
                currentPath === '/db' ? 'text-white bg-white/10 shadow-sm' : 'text-slate-300 hover:text-white hover:bg-white/5'
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
            className="text-slate-300 hover:text-white relative bg-transparent border-none cursor-pointer p-1.5 rounded-lg hover:bg-white/10 transition-all duration-200" 
            onClick={() => setShowNotifications(!showNotifications)}
            title="System Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-brand-red text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center border border-brand-navy animate-pulse">
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

          {/* User Badge */}
          {loggedInUser && (
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 pl-2 pr-3 py-1 rounded-full text-xs text-white transition-all duration-200 hover:bg-white/10 cursor-pointer">
              <div className="w-6 h-6 rounded-full bg-brand-red text-white flex items-center justify-center font-black text-[10px] ring-2 ring-red-400 ring-offset-2 ring-offset-brand-navy">
                {loggedInUser.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </div>
              <div className="hidden lg:flex flex-col text-[10px] leading-tight">
                <span className="font-bold">{loggedInUser.name.split(' (')[0]}</span>
                <span className="text-slate-300 text-[8px] font-semibold">
                  {ROLE_MAP[loggedInUser.email.toLowerCase()]?.designation || (currentUserRole === 'reviewer' ? 'Reviewer' : currentUserRole === 'employee' ? 'Employee' : currentUserRole.split(' ')[0])}
                </span>
              </div>
            </div>
          )}

          <button 
            onClick={handleLogout}
            className="text-slate-300 hover:text-white flex items-center gap-1 text-[11px] font-bold bg-transparent border-none cursor-pointer transition-all"
            title="Log Out"
          >
            <LogOut size={13} />
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

            {/* Quick Start Steps */}
            <div className="flex flex-col gap-4 text-xs text-slate-600 leading-relaxed">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col gap-2">
                <span className="text-[10px] font-bold text-brand-navy tracking-wider uppercase block">🚀 Quick Start Checklist</span>
                <ul className="list-disc pl-4 flex flex-col gap-1.5 font-medium text-slate-600">
                  <li><strong>Submit a Lead:</strong> Click "+ New Lead" or "+ New Submission" to open the form. Fill out the client's name and details.</li>
                  <li><strong>Track Progress:</strong> Click any lead in your opportunity list. The <strong>Lead Lifecycle Tracker</strong> stepper will load to show exactly where it is.</li>
                  <li><strong>Address Requests:</strong> If a manager changes status to <em>Clarification Requested</em>, open the row and reply to their query.</li>
                </ul>
              </div>

              {/* Stepper Stage Explanations */}
              <div className="flex flex-col gap-2.5">
                <span className="text-[10px] font-bold text-brand-navy tracking-wider uppercase block border-b border-slate-50 pb-1">📈 Stepper Stages Explained</span>
                <div className="flex flex-col gap-3 pl-1">
                  <div>
                    <strong className="text-brand-navy">1. Lead Registered:</strong> 
                    <p className="text-[11px] text-slate-400 mt-0.5">Your lead has been captured in the system.</p>
                  </div>
                  <div>
                    <strong className="text-brand-navy">2. Accepted:</strong> 
                    <p className="text-[11px] text-slate-400 mt-0.5">Your manager is currently auditing the details.</p>
                  </div>
                  <div>
                    <strong className="text-brand-navy">3. Opportunity Registered:</strong> 
                    <p className="text-[11px] text-slate-400 mt-0.5">Approved by the BU Head and synced to the CRM.</p>
                  </div>
                  <div>
                    <strong className="text-brand-navy">4. Proposal:</strong> 
                    <p className="text-[11px] text-slate-400 mt-0.5">A formal request/proposal has been sent to the client.</p>
                  </div>
                  <div>
                    <strong className="text-brand-navy">5. Negotiation:</strong> 
                    <p className="text-[11px] text-slate-400 mt-0.5">Commercials and contract terms are being finalized.</p>
                  </div>
                  <div>
                    <strong className="text-brand-navy">6. Converted Won:</strong> 
                    <p className="text-[11px] text-slate-400 mt-0.5">The deal is successfully closed and conversion complete!</p>
                  </div>
                </div>
              </div>

              {/* SLA Policies */}
              <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 flex flex-col gap-1.5 text-amber-800">
                <span className="text-[10px] font-bold tracking-wider uppercase block">⚠️ SLA compliance policy</span>
                <p className="text-[11px] leading-normal font-medium">
                  Reviewers have exactly <strong>2 working days</strong> from submission to validate your lead. Any item exceeding this shows a <span className="text-brand-red font-bold">⚠️ Overdue</span> badge to notify stakeholders.
                </p>
              </div>

            </div>

            {/* Close button inside panel */}
            <button 
              onClick={() => setShowHelp(false)}
              className="mt-auto py-2.5 w-full bg-brand-navy hover:bg-[#121E52] text-white text-xs font-bold rounded-lg transition-all cursor-pointer border-none"
            >
              Got it, close guide
            </button>

          </div>
        </div>
      )}
    </div>
  );
}
