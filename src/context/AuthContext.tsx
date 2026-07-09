import React, { useState, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Employee } from '../mockData.ts';
import { MOCK_EMPLOYEES, getRoleByEmail, ROLE_MAP } from '../mockData.ts';

// Auth Context Types
export interface AuthContextType {
  loggedInUser: Employee | null;
  loginStep: 'email' | 'otp';
  setLoginStep: (step: 'email' | 'otp') => void;
  loginOtp: string;
  setLoginOtp: (val: string) => void;
  otpError: string;
  setOtpError: (val: string) => void;
  tempTargetUser: Employee | null;
  setTempTargetUser: (user: Employee | null) => void;
  isConnecting: boolean;
  setIsConnecting: (val: boolean) => void;
  connectingMsg: string;
  setConnectingMsg: (msg: string) => void;
  showSandbox: boolean;
  setShowSandbox: (val: boolean) => void;
  executeSsoFlow: (user: Employee) => void;
  handleLogout: () => void;
  loginEmail: string;
  setLoginEmail: (email: string) => void;
  loginError: string;
  setLoginError: (err: string) => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

// AuthProvider wraps all authentication contexts
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loggedInUser, setLoggedInUser] = useState<Employee | null>(null);
  const [loginStep, setLoginStep] = useState<'email' | 'otp'>('email');
  const [loginOtp, setLoginOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [tempTargetUser, setTempTargetUser] = useState<Employee | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingMsg, setConnectingMsg] = useState('');
  const [showSandbox, setShowSandbox] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginError, setLoginError] = useState('');

  const navigate = useNavigate();

  const executeSsoFlow = (user: Employee) => {
    setIsConnecting(true);
    setConnectingMsg('Authenticating with Microsoft Entra ID...');
    setTimeout(() => {
      setConnectingMsg('Verifying HRMS mapping...');
      setTimeout(() => {
        setConnectingMsg('Provisioning secure session...');
        setTimeout(() => {
          setLoggedInUser(user);
          setIsConnecting(false);
          setLoginStep('email');
          setLoginOtp('');
          setConnectingMsg('');
          const role = getRoleByEmail(user.email);
          navigate(role === 'reviewer' ? '/reviewer' : '/home');
        }, 600);
      }, 800);
    }, 600);
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    setLoginStep('email');
    setLoginOtp('');
    setTempTargetUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{
      loggedInUser, loginStep, setLoginStep, loginOtp, setLoginOtp, otpError, setOtpError,
      tempTargetUser, setTempTargetUser, isConnecting, setIsConnecting, connectingMsg, setConnectingMsg,
      showSandbox, setShowSandbox, executeSsoFlow, handleLogout, loginEmail, setLoginEmail, loginError, setLoginError
    }}>
      {children}
    </AuthContext.Provider>
  );
}
