import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import { Loader2 } from 'lucide-react';

// Import corporate branding assets
import nestLogo from '../assets/nest_logo.png';
import nestIcon from '../assets/nest_icon.png';

export function LoginScreen() {
  const [showHelp, setShowHelp] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const {
    loggedInUser,
    isConnecting, connectingMsg,
    executeSsoFlow, loginUsername, setLoginUsername,
    loginPassword, setLoginPassword,
    loginError, setLoginError
  } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const redirectTarget = params.get('redirect');
    if (redirectTarget) {
      sessionStorage.setItem('impact_redirect_after_login', redirectTarget);
      if (loggedInUser) {
        sessionStorage.removeItem('impact_redirect_after_login');
        navigate(redirectTarget, { replace: true });
      }
    } else if (loggedInUser) {
      navigate('/home', { replace: true });
    }
  }, [location.search, loggedInUser, navigate]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const username = loginUsername.trim();

    if (!username) {
      setLoginError('Please enter your corporate username.');
      return;
    }
    if (!loginPassword) {
      setLoginError('Please enter your password.');
      return;
    }

    setLoginError('');
    executeSsoFlow(username, loginPassword);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-slate-50 font-sans">
      
      {/* Subtle NeST Watermark Pattern */}
      <div 
        className="absolute inset-0 bg-repeat bg-center opacity-[0.06] -z-10"
        style={{
          backgroundImage: `url(${nestIcon})`,
          backgroundSize: '120px'
        }}
      />

      <div className="w-full max-w-md bg-white rounded-xl shadow-lg border border-slate-100 p-8 flex flex-col relative min-h-[460px]">
        
        {/* Corporate branding logo header */}
        <div className="flex justify-start mb-6">
          <img src={nestLogo} alt="NeST Digital Logo" className="h-10 w-auto object-contain" />
        </div>

        <h2 className="text-brand-navy text-[17px] font-black uppercase tracking-wider mb-1">
          IMPACT OPPORTUNITY PORTAL
        </h2>
        <p className="text-xs text-slate-400 mb-6 font-semibold">to continue to IMPACT Lead Portal</p>

        {isConnecting ? (
          <div className="flex flex-col items-center justify-center flex-grow gap-5 py-8">
            <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">{connectingMsg}</div>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="flex flex-col flex-grow">
            <h3 className="text-lg font-extrabold text-slate-800 mb-1">Sign in</h3>
            <p className="text-slate-400 text-xs mb-5 font-semibold">Verify identity via Corporate Directory</p>

            <div className="flex flex-col gap-1.5 mb-6">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Username</label>
              <input
                type="text"
                className="w-full border-b border-slate-300 focus:border-brand-navy outline-none py-2 text-xs transition-all bg-transparent"
                placeholder="e.g., employee.name"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                required
              />
              {loginError && (
                <span className="text-[10px] text-red-600 font-semibold mt-1">⚠️ {loginError}</span>
              )}
            </div>

            <div className="flex flex-col gap-1.5 mb-6">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Password</label>
              <input
                type="password"
                className="w-full border-b border-slate-300 focus:border-brand-navy outline-none py-2 text-xs transition-all bg-transparent"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-4 mt-auto">
              <button 
                type="submit" 
                className="w-full py-3 bg-brand-navy hover:bg-[#121c4a] text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
              >
                <span>Login</span>
                <span>➔</span>
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="text-center text-[10px] text-slate-400 font-semibold mt-6 pt-3 border-t border-slate-50">
          🔒 Secured by Corporate Active Directory
        </div>

      </div>

      {/* Help Button */}
      <div className="absolute bottom-[120px] right-[80px]">
        <button
          onClick={() => setShowHelp(true)}
          className="flex items-center gap-2 bg-brand-navy hover:bg-[#121E52] text-white text-sm font-semibold px-5 py-3 rounded-full shadow-lg hover:scale-105 active:scale-95 cursor-pointer transition-all border border-slate-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
          <span>Need help? Click here for guidance</span>
        </button>
      </div>

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

            <div className="flex flex-col gap-5 text-xs text-slate-600 leading-relaxed">

              {/* Video Guidelines */}
              <div className="flex flex-col gap-2 w-full">
                <span className="text-[10px] font-extrabold text-brand-navy tracking-wider uppercase block">🎥 Video Guidelines</span>
                <div className="relative w-full rounded-xl overflow-hidden border border-slate-200/80 bg-slate-100 shadow-sm aspect-video flex items-center justify-center">
                  <video
                    className="absolute inset-0 w-full h-full object-cover"
                    controls
                    autoPlay
                    muted
                    poster="https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1000&auto=format&fit=crop"
                  >
                    <source src="/Impact Model Demo V3.0.mp4" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>

              {/* Submitter Guide */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col gap-2">
                <span className="text-[10px] font-extrabold text-brand-navy tracking-wider uppercase block">🚀 Submitter Guide Checklist</span>
                <ul className="list-disc pl-4 flex flex-col gap-1.5 font-medium text-slate-600">
                  <li><strong>Submit a Lead:</strong> Click <strong>"+ Submit Lead"</strong> to register a lead with client details and project scope.</li>
                  <li><strong>Track Progress:</strong> View your lead card to monitor the <strong>4-Stage Lead Lifecycle Stepper</strong> in real-time.</li>
                  <li><strong>Outbox Logs:</strong> Check the <strong>Outbox Logs</strong> tab to see all automated email alerts sent.</li>
                  <li><strong>Clarifications:</strong> If a manager requests information, open your lead row and submit your response.</li>
                </ul>
              </div>

              {/* 4-Stage Lifecycle */}
              <div className="flex flex-col gap-2.5">
                <span className="text-[10px] font-extrabold text-brand-navy tracking-wider uppercase block border-b border-slate-100 pb-1">📈 4-Stage Lead Lifecycle Stepper</span>
                <div className="flex flex-col gap-2.5 pl-1">
                  <div>
                    <strong className="text-brand-navy font-bold">1. Lead Registered (10%):</strong>
                    <p className="text-[11px] text-slate-500 mt-0.5">Lead submitted on portal by employee and under review.</p>
                  </div>
                  <div>
                    <strong className="text-brand-navy font-bold">2. Opportunity Accepted (40%):</strong>
                    <p className="text-[11px] text-slate-500 mt-0.5">Approved by Reviewer and synced with the CRM system.</p>
                  </div>
                  <div>
                    <strong className="text-brand-navy font-bold">3. Proposal (55%):</strong>
                    <p className="text-[11px] text-slate-500 mt-0.5">Opportunity is moving through various proposal &amp; negotiation stages.</p>
                  </div>
                  <div>
                    <strong className="text-brand-navy font-bold">4. Deal Won (100% 🏆):</strong>
                    <p className="text-[11px] text-slate-500 mt-0.5">Opportunity successfully closed &amp; deal won!</p>
                  </div>
                </div>

                <span className="text-[10px] font-extrabold text-brand-navy tracking-wider uppercase block border-b border-slate-100 pb-1 mt-2">🛑 Other Statuses</span>
                <div className="flex flex-col gap-2.5 pl-1">
                  <div>
                    <strong className="text-brand-red font-bold">Deal Lost / Rejected (100%):</strong>
                    <p className="text-[11px] text-slate-500 mt-0.5">Opportunity was dropped, rejected, or lost to competition.</p>
                  </div>
                  <div>
                    <strong className="text-amber-600 font-bold">On Hold:</strong>
                    <p className="text-[11px] text-slate-500 mt-0.5">Opportunity tracking is temporarily suspended.</p>
                  </div>
                </div>
              </div>

              {/* SLA Policy */}
              <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-4 flex flex-col gap-1.5 text-amber-900">
                <span className="text-[10px] font-extrabold tracking-wider uppercase block">⚠️ SLA Compliance Policy</span>
                <p className="text-[11px] leading-normal font-medium">
                  Reviewers have <strong>7 working days</strong> from submission to acknowledge and validate your lead. Any item exceeding this shows a <span className="text-brand-red font-bold">⚠️ Overdue</span> SLA warning badge.
                </p>
              </div>

            </div>

            {/* Close button */}
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
