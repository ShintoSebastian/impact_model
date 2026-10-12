import React, { useState, createContext, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Employee } from '../types.ts';
import { API_BASE_URL } from '../utils.ts';

// Auth Context Types

interface AuthContextType {
  loggedInUser: Employee | null;
  isConnecting: boolean;
  setIsConnecting: (val: boolean) => void;
  connectingMsg: string;
  setConnectingMsg: (msg: string) => void;
  showSandbox: boolean;
  setShowSandbox: (val: boolean) => void;
  executeSsoFlow: (username: string, password?: string) => void;
  handleLogout: () => void;
  loginUsername: string;
  setLoginUsername: (username: string) => void;
  loginPassword: string;
  setLoginPassword: (password: string) => void;
  loginError: string;
  setLoginError: (err: string) => void;
  syncProfile: () => Promise<Employee | null>;
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
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const navigate = useNavigate();

  const executeLogin = async (username: string, password?: string) => {
    setIsConnecting(true);
    setConnectingMsg('Authenticating...');
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
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

      // Check if user was trying to access a deep link before redirecting to login
      const pendingRedirect = sessionStorage.getItem('impact_redirect_after_login');
      if (pendingRedirect) {
        sessionStorage.removeItem('impact_redirect_after_login');
        navigate(pendingRedirect);
      } else {
        navigate('/home');
      }
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

  const syncProfile = async (): Promise<Employee | null> => {
    const token = sessionStorage.getItem('impact_token');
    if (!token) return null;

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/sync-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          sessionStorage.setItem('impact_user', JSON.stringify(data.user));
          setLoggedInUser(data.user);
          return data.user;
        }
      }
    } catch (err) {
      console.error('Failed to sync profile from HRMS API:', err);
    }
    return null;
  };

  // Automatically refresh profile and Project Manager details from HRMS on startup in background
  React.useEffect(() => {
    const token = sessionStorage.getItem('impact_token');
    if (token) {
      syncProfile();
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      loggedInUser, isConnecting, setIsConnecting, connectingMsg, setConnectingMsg,
      showSandbox, setShowSandbox, executeSsoFlow: executeLogin, handleLogout, loginUsername, setLoginUsername, loginPassword, setLoginPassword, loginError, setLoginError,
      syncProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}
