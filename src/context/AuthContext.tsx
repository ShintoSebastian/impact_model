import React, { useState, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Employee } from '../types.ts';

// Auth Context Types
export interface AuthContextType {
  loggedInUser: Employee | null;
  isConnecting: boolean;
  setIsConnecting: (val: boolean) => void;
  connectingMsg: string;
  setConnectingMsg: (msg: string) => void;
  showSandbox: boolean;
  setShowSandbox: (val: boolean) => void;
  executeSsoFlow: (username: string) => void;
  handleLogout: () => void;
  loginUsername: string;
  setLoginUsername: (username: string) => void;
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
  const [loggedInUser, setLoggedInUser] = useState<Employee | null>(() => {
    const saved = sessionStorage.getItem('impact_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectingMsg, setConnectingMsg] = useState('');
  const [showSandbox, setShowSandbox] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginError, setLoginError] = useState('');

  const navigate = useNavigate();

  const executeSsoFlow = async (username: string) => {
    setIsConnecting(true);
    setConnectingMsg('Authenticating with Microsoft Entra ID...');
    
    // Simulate SSO loading screen delays for premium UX
    await new Promise(resolve => setTimeout(resolve, 600));
    setConnectingMsg('Verifying HRMS mapping...');
    await new Promise(resolve => setTimeout(resolve, 800));
    setConnectingMsg('Provisioning secure session...');
    await new Promise(resolve => setTimeout(resolve, 600));

    try {
      const res = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Authentication failed');
      }

      const data = await res.json();
      sessionStorage.setItem('impact_token', data.token);
      sessionStorage.setItem('impact_user', JSON.stringify(data.user));

      setLoggedInUser(data.user);
      setIsConnecting(false);
      setConnectingMsg('');
      setLoginError('');

      navigate('/home');
    } catch (err: any) {
      console.error('SSO Flow Error:', err);
      setIsConnecting(false);
      setConnectingMsg('');
      setLoginError(err.message || 'Failed to authenticate with database backend. Verify server is running.');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('impact_token');
    sessionStorage.removeItem('impact_user');
    setLoggedInUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{
      loggedInUser, isConnecting, setIsConnecting, connectingMsg, setConnectingMsg,
      showSandbox, setShowSandbox, executeSsoFlow, handleLogout, loginUsername, setLoginUsername, loginError, setLoginError
    }}>
      {children}
    </AuthContext.Provider>
  );
}
