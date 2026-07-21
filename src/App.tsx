import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import type { Submission, EmailLog, Employee } from './types.ts';

// Context
import { AuthProvider, useAuth } from './context/AuthContext.tsx';

// Page Components
import { LoginScreen } from './components/LoginScreen.tsx';
import { DashboardLayout } from './components/DashboardLayout.tsx';
import { HomeView } from './components/HomeView.tsx';
import { EmployeePortal } from './components/EmployeePortal.tsx';
import { StakeholderDashboard } from './components/StakeholderDashboard.tsx';
import { EmailSimulator } from './components/EmailSimulator.tsx';
import { DbViewer } from './components/DbViewer.tsx';

// Re-export useAuth for any component that imported it from App.tsx
export { useAuth } from './context/AuthContext.tsx';

// ----------------------------------------------------
// ROUTE GUARDS
// ----------------------------------------------------

// Protected Route component redirecting to /login if unauthenticated
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { loggedInUser } = useAuth();
  const location = useLocation();

  if (!loggedInUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// Component to handle redirect from root `/` — all users go to /home
function RootRedirect() {
  const { loggedInUser } = useAuth();
  if (!loggedInUser) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to="/home" replace />;
}

// ----------------------------------------------------
// APP ENTRY POINT
// ----------------------------------------------------
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

// ----------------------------------------------------
// APP CONTENT — State Management & Route Tree
// ----------------------------------------------------
function AppContent() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [reviewSubmissions, setReviewSubmissions] = useState<Submission[]>([]);
  const [reviewCount, setReviewCount] = useState<number>(0);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [notifications, setNotifications] = useState<{ id: string; message: string; timestamp: string; read: boolean }[]>([]);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const { loggedInUser, handleLogout } = useAuth();
  const navigate = useNavigate();

  // Helper for authorized fetches
  const fetchWithAuth = async (url: string, options: any = {}) => {
    const token = sessionStorage.getItem('impact_token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    };
    try {
      const response = await fetch(url, { ...options, headers });
      if (response.status === 401 || response.status === 403) {
        handleLogout();
        throw new Error('Session expired');
      }
      return response;
    } catch (error) {
      console.error(`fetchWithAuth error on ${url}:`, error);
      throw error;
    }
  };

  // Load initial data from SQLite Express Backend
  useEffect(() => {
    if (!loggedInUser) {
      setSubmissions([]);
      setReviewSubmissions([]);
      setReviewCount(0);
      setEmailLogs([]);
      setNotifications([]);
      return;
    }

    const loadBackendData = async () => {
      try {
        const [subRes, reviewSubRes, reviewCountRes, notifRes, emailRes] = await Promise.all([
          fetchWithAuth('http://localhost:5000/api/submissions'),
          fetchWithAuth('http://localhost:5000/api/submissions?mode=review'),
          fetchWithAuth('http://localhost:5000/api/submissions/review-count'),
          fetchWithAuth('http://localhost:5000/api/notifications'),
          fetchWithAuth('http://localhost:5000/api/email-logs')
        ]);

        if (subRes.ok) {
          const subs = await subRes.json();
          setSubmissions(subs);
        }
        if (reviewSubRes.ok) {
          const revSubs = await reviewSubRes.json();
          setReviewSubmissions(revSubs);
        }
        if (reviewCountRes.ok) {
          const data = await reviewCountRes.json();
          setReviewCount(data.count);
        }
        if (notifRes.ok) {
          const notifs = await notifRes.json();
          setNotifications(notifs);
        }
        if (emailRes.ok) {
          const emails = await emailRes.json();
          setEmailLogs(emails);
        }
      } catch (err) {
        console.error('Failed to retrieve data from database server:', err);
      }
    };

    loadBackendData();
  }, [loggedInUser]);

  const addSubmission = async (sub: Submission): Promise<boolean> => {
    try {
      const res = await fetchWithAuth('http://localhost:5000/api/submissions', {
        method: 'POST',
        body: JSON.stringify(sub)
      });
      if (res.ok) {
        const savedSub = await res.json();
        setSubmissions(prev => [savedSub, ...prev]);

        // Refresh notifications
        const notifRes = await fetchWithAuth('http://localhost:5000/api/notifications');
        if (notifRes.ok) {
          const notifs = await notifRes.json();
          setNotifications(notifs);
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('addSubmission error:', err);
      return false;
    }
  };

  const addNotification = (message: string) => {
    setNotifications(prev => [
      {
        id: `notif-${Math.random().toString(36).substr(2, 9)}`,
        message,
        timestamp: new Date().toISOString(),
        read: false
      },
      ...prev
    ]);
  };

  const updateSubmission = async (id: string, updatedFields: Partial<Submission>, changedBy?: string) => {
    try {
      const res = await fetchWithAuth(`http://localhost:5000/api/submissions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...updatedFields, changedBy })
      });
      if (res.ok) {
        const updated = await res.json();
        setSubmissions(prev => prev.map(sub => sub.intelligenceId === id ? updated : sub));

        // Refresh notifications
        const notifRes = await fetchWithAuth('http://localhost:5000/api/notifications');
        if (notifRes.ok) {
          const notifs = await notifRes.json();
          setNotifications(notifs);
        }
      }
    } catch (err) {
      console.error('updateSubmission error:', err);
    }
  };

  const logEmails = async (newEmails: EmailLog[]) => {
    try {
      for (const email of newEmails) {
        await fetchWithAuth('http://localhost:5000/api/email-logs', {
          method: 'POST',
          body: JSON.stringify(email)
        });
      }
      
      const emailRes = await fetchWithAuth('http://localhost:5000/api/email-logs');
      if (emailRes.ok) {
        const data = await emailRes.json();
        setEmailLogs(data);
      }
    } catch (err) {
      console.error('logEmails error:', err);
    }
  };

  const resetDb = () => {
    sessionStorage.removeItem('impact_token');
    sessionStorage.removeItem('impact_user');
    setSubmissions([]);
    setEmailLogs([]);
    setNotifications([]);
    setSelectedSubId(null);
    setShowModal(false);
    navigate('/login');
  };

  const getRole = (user: Employee) => {
    // Role is now provided by the backend API
    return (user as any).role || 'employee';
  };

  const currentUserRole = loggedInUser ? getRole(loggedInUser) : 'Submitter (Employee)';
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <DashboardLayout 
              unreadCount={unreadCount} 
              notifications={notifications} 
              markAllAsRead={markAllAsRead} 
              loggedInUser={loggedInUser} 
              currentUserRole={currentUserRole}
              handleLogout={handleLogout}
              reviewCount={reviewCount}
            />
          </ProtectedRoute>
        }
      >
        <Route index element={<RootRedirect />} />
        <Route 
          path="home" 
          element={
            <HomeView 
              submissions={submissions}
              selectedSubId={selectedSubId}
              setSelectedSubId={setSelectedSubId}
              showModal={showModal}
              setShowModal={setShowModal}
              loggedInUser={loggedInUser!}
              currentUserRole={currentUserRole}
              notifications={notifications}
              markAllAsRead={markAllAsRead}
              resetDb={resetDb}
              navigate={navigate}
              updateSubmission={updateSubmission}
              logEmails={logEmails}
              addNotification={addNotification}
            />
          } 
        />
        <Route 
          path="submit" 
          element={
            <EmployeePortal 
              submissions={submissions}
              addSubmission={addSubmission}
              logEmails={logEmails}
              loggedInUser={loggedInUser!}
              navigate={navigate}
            />
          } 
        />
        <Route path="outbox" element={<EmailSimulator emailLogs={emailLogs} />} />
        <Route 
          path="reviewer" 
          element={
            <ProtectedRoute>
              <StakeholderDashboard 
                submissions={reviewSubmissions}
                updateSubmission={updateSubmission}
                logEmails={logEmails}
                currentUserRole={currentUserRole}
                loggedInUser={loggedInUser!}
                addNotification={addNotification}
              />
            </ProtectedRoute>
          } 
        />
        <Route path="db" element={<DbViewer submissions={submissions} resetDb={resetDb} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
