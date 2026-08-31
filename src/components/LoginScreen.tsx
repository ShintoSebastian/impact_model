import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Loader2 } from 'lucide-react';

// Import corporate branding assets
import nestLogo from '../assets/nest_logo.png';
import nestIcon from '../assets/nest_icon.png';

export function LoginScreen() {
  const {
    isConnecting, connectingMsg,
    executeSsoFlow, loginUsername, setLoginUsername,
    loginPassword, setLoginPassword,
    loginError, setLoginError
  } = useAuth();

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
    </div>
  );
}
