import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { MOCK_EMPLOYEES, ROLE_MAP } from '../mockData.ts';
import type { Employee } from '../mockData.ts';
import { Loader2 } from 'lucide-react';

// Import corporate branding assets
import nestLogo from '../assets/nest_logo.png';
import nestIcon from '../assets/nest_icon.png';

export function LoginScreen() {
  const {
    loginStep, setLoginStep, loginOtp, setLoginOtp, otpError, setOtpError,
    tempTargetUser, setTempTargetUser, isConnecting, connectingMsg,
    showSandbox, setShowSandbox, executeSsoFlow, loginEmail, setLoginEmail,
    loginError, setLoginError
  } = useAuth();

  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(30);
  const [isVerified, setIsVerified] = useState(false);

  // Sync otpValues to global loginOtp state
  useEffect(() => {
    setLoginOtp(otpValues.join(''));
  }, [otpValues, setLoginOtp]);

  // Countdown timer for resend OTP
  useEffect(() => {
    if (loginStep === 'otp') {
      setCountdown(30);
      const interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [loginStep]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const email = loginEmail.toLowerCase().trim();
    let user = MOCK_EMPLOYEES.find(emp => emp.email.toLowerCase() === email);
    
    if (!user && ROLE_MAP[email]) {
      const mapping = ROLE_MAP[email];
      user = {
        employeeId: mapping.role === 'reviewer' ? 'ND-29999' : 'ND-19999',
        name: email.split('@')[0].split('.').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
        email: email,
        businessUnit: 'Digital Transformation Unit (DTU)',
        reportingManager: 'Arun Kumar (arun.kumar@nestdigital.com)',
        projectManager: 'Kiran Joseph (kiran.j@nestdigital.com)',
        buHead: 'Suresh Nair (suresh.n@nestdigital.com)',
        hrbp: 'Deepa Menon (deepa.m@nestdigital.com)',
        salesPerson: 'Jacob Varghese (jacob.varghese@nestdigital.com)'
      };
    }

    if (user) {
      setLoginError('');
      setTempTargetUser(user);
      setOtpValues(['', '', '', '', '', '']);
      setLoginOtp('');
      setOtpError('');
      setLoginStep('otp');
    } else {
      setLoginError('Corporate email account not recognized. Try: shinto.s@nestdigital.com, arun.kumar@nestdigital.com, or admin@nestdigital.com');
    }
  };

  const handleQuickLogin = (user: Employee) => {
    setLoginEmail(user.email);
    setTempTargetUser(user);
    setOtpValues(['', '', '', '', '', '']);
    setLoginOtp('');
    setOtpError('');
    setLoginStep('otp');
  };

  const handleOtpVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otpValues.join('');
    if (fullOtp === '123456') {
      setOtpError('');
      setIsVerified(true);
      setTimeout(() => {
        if (tempTargetUser) {
          executeSsoFlow(tempTargetUser);
        }
        setIsVerified(false);
      }, 1500);
    } else {
      setOtpError('Incorrect code. Use 123456.');
    }
  };

  const handleOtpChange = (val: string, index: number) => {
    if (/\D/.test(val)) return; // Only allow numbers
    const newOtpValues = [...otpValues];
    newOtpValues[index] = val;
    setOtpValues(newOtpValues);

    // Auto-focus next box
    if (val !== '' && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace' && otpValues[index] === '' && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const getRole = (user: Employee) => {
    if (user.employeeId === 'ND-99999') return 'System Auditor';
    if (user.employeeId.startsWith('ND-2') || user.employeeId.startsWith('ND-3')) return 'Delivery Head / Sales';
    return 'Submitter (Employee)';
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
        
        {/* Verification Success Animation Overlay */}
        {isVerified && (
          <div className="absolute inset-0 bg-white/95 z-20 flex flex-col items-center justify-center gap-4 rounded-xl animate-fadeIn">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-500 border border-emerald-200 flex items-center justify-center rounded-full text-xl font-bold animate-bounce shadow-sm">
              ✓
            </div>
            <div className="text-sm font-extrabold text-slate-800">✅ Verified! Redirecting...</div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">SSO Access Granted</div>
          </div>
        )}

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
          <>
            {loginStep === 'email' ? (
              <form onSubmit={handleLogin} className="flex flex-col flex-grow">
                <h3 className="text-lg font-extrabold text-slate-800 mb-1">Sign in</h3>
                <p className="text-slate-400 text-xs mb-5 font-semibold">Verify email credentials via SSO</p>

                <div className="flex flex-col gap-1.5 mb-6">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Work Email</label>
                  <input
                    type="email"
                    className="w-full border-b border-slate-300 focus:border-brand-navy outline-none py-2 text-xs transition-all bg-transparent"
                    placeholder="employee.name@nestdigital.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                  {loginError && (
                    <span className="text-[10px] text-red-600 font-semibold mt-1">⚠️ {loginError}</span>
                  )}
                </div>

                <div className="flex flex-col gap-4 mt-auto">
                  <button 
                    type="submit" 
                    className="w-full py-3 bg-brand-navy hover:bg-[#121c4a] text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
                  >
                    <span>Next</span>
                    <span>➔</span>
                  </button>

                  <button 
                    type="button" 
                    onClick={() => setShowSandbox(!showSandbox)}
                    className="text-[11px] font-extrabold text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer self-center mt-1"
                  >
                    SSO Quick Sandbox Panel {showSandbox ? '▲' : '▼'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleOtpVerify} className="flex flex-col flex-grow">
                <h3 className="text-lg font-extrabold text-slate-800 mb-1">Enter verification code</h3>
                <p className="text-slate-400 text-xs mb-5 font-semibold leading-relaxed">
                  A 6-digit code was sent to <strong className="text-slate-600 font-bold">{tempTargetUser?.email}</strong>
                </p>

                {/* OTP Digits Row */}
                <div className="flex justify-between gap-2 mb-6">
                  {otpValues.map((val, idx) => (
                    <input
                      key={idx}
                      id={`otp-input-${idx}`}
                      type="text"
                      maxLength={1}
                      pattern="[0-9]*"
                      inputMode="numeric"
                      className={`w-11 h-12 text-center text-lg font-black rounded-lg border-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-navy transition-all ${
                        otpError 
                          ? 'border-red-500 ring-red-200' 
                          : 'border-slate-200 focus:border-brand-navy'
                      }`}
                      value={val}
                      onChange={(e) => handleOtpChange(e.target.value, idx)}
                      onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                      required
                      autoFocus={idx === 0}
                    />
                  ))}
                </div>

                {otpError && (
                  <div className="text-[10px] text-red-600 font-semibold mb-5">
                    ⚠️ {otpError}
                  </div>
                )}

                {/* Countdown & Navigation Actions */}
                <div className="flex justify-between items-center mb-6">
                  {countdown > 0 ? (
                    <span className="text-[11px] text-slate-400 font-bold">Resend in 0:{countdown.toString().padStart(2, '0')}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setCountdown(30);
                        alert('Demo Mode: Verification code has been re-sent!');
                      }}
                      className="text-[11px] text-blue-600 hover:underline font-extrabold bg-transparent border-none cursor-pointer"
                    >
                      Resend OTP
                    </button>
                  )}
                  
                  <button
                    type="button"
                    onClick={() => setLoginStep('email')}
                    className="text-[11px] text-slate-400 hover:text-brand-navy font-bold bg-transparent border-none cursor-pointer"
                  >
                    ← Change email
                  </button>
                </div>

                <button 
                  type="submit" 
                  className="w-full py-3 bg-brand-navy hover:bg-[#121c4a] text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm mt-auto"
                >
                  Verify
                </button>
              </form>
            )}

            {/* Sandbox panel list */}
            {showSandbox && (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <span className="text-[9px] font-bold text-slate-400 uppercase block mb-2 tracking-wider">Sandbox Profiles</span>
                <div className="flex flex-col gap-1.5">
                  {MOCK_EMPLOYEES.map(emp => (
                    <button
                      key={emp.employeeId}
                      onClick={() => handleQuickLogin(emp)}
                      className="text-left p-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
                    >
                      {emp.name} ({getRole(emp).split(' ')[0]})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="text-center text-[10px] text-slate-400 font-semibold mt-6 pt-3 border-t border-slate-50">
          🔒 Secured by Microsoft Entra ID Single Sign-On
        </div>

      </div>
    </div>
  );
}
