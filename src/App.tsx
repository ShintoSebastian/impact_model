import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { INITIAL_SUBMISSIONS, INITIAL_NOTIFICATIONS, INITIAL_EMAIL_LOGS, getRoleByEmail } from './mockData.ts';
import type { Submission, EmailLog, Employee } from './mockData.ts';

// Context
import { AuthProvider, useAuth } from './context/AuthContext.tsx';

// Page Components
import { LoginScreen } from './components/LoginScreen.tsx';
import { DashboardLayout } from './components/DashboardLayout.tsx';
import { HomeView } from './components/HomeView.tsx';
import { EmployeePortal } from './components/EmployeePortal.tsx';
import { StakeholderDashboard } from './components/StakeholderDashboard.tsx';
import { CrmSimulator } from './components/CrmSimulator.tsx';
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

// Route guard for employees only
function EmployeeRoute({ children }: { children: React.ReactNode }) {
  const { loggedInUser } = useAuth();
  const location = useLocation();

  if (!loggedInUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const role = getRoleByEmail(loggedInUser.email);
  if (role !== 'employee') {
    return <Navigate to="/reviewer" replace />;
  }

  return <>{children}</>;
}

// Route guard for reviewers only
function ReviewerRoute({ children }: { children: React.ReactNode }) {
  const { loggedInUser } = useAuth();
  const location = useLocation();

  if (!loggedInUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const role = getRoleByEmail(loggedInUser.email);
  if (role !== 'reviewer') {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
}

// Component to handle dynamic redirect from root `/` based on role
function RootRedirect() {
  const { loggedInUser } = useAuth();
  if (!loggedInUser) {
    return <Navigate to="/login" replace />;
  }

  const role = getRoleByEmail(loggedInUser.email);
  if (role === 'reviewer') {
    return <Navigate to="/reviewer" replace />;
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
  const [submissions, setSubmissions] = useState<Submission[]>(() => {
    const saved = localStorage.getItem('impact_submissions');
    return saved ? JSON.parse(saved) : INITIAL_SUBMISSIONS;
  });

  const [emailLogs, setEmailLogs] = useState<EmailLog[]>(() => {
    const saved = localStorage.getItem('impact_email_logs');
    return saved ? JSON.parse(saved) : INITIAL_EMAIL_LOGS;
  });

  const [notifications, setNotifications] = useState<{ id: string; message: string; timestamp: string; read: boolean }[]>(() => {
    const saved = localStorage.getItem('impact_notifications');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const { loggedInUser, handleLogout } = useAuth();
  const navigate = useNavigate();

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('impact_submissions', JSON.stringify(submissions));
  }, [submissions]);

  useEffect(() => {
    localStorage.setItem('impact_email_logs', JSON.stringify(emailLogs));
  }, [emailLogs]);

  useEffect(() => {
    localStorage.setItem('impact_notifications', JSON.stringify(notifications));
  }, [notifications]);

  const addSubmission = (sub: Submission) => {
    setSubmissions(prev => [sub, ...prev]);
    setNotifications(prev => [
      {
        id: `notif-${Math.random().toString(36).substr(2, 9)}`,
        message: `New submission ${sub.intelligenceId} registered`,
        timestamp: new Date().toISOString(),
        read: false
      },
      ...prev
    ]);
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

  const updateSubmission = (id: string, updatedFields: Partial<Submission>, changedBy?: string) => {
    setSubmissions(prev => prev.map(sub => {
      if (sub.intelligenceId === id) {
        const now = new Date().toISOString();
        // Append to statusHistory if status changed
        let newHistory = sub.statusHistory || [];
        if (updatedFields.status && updatedFields.status !== sub.status) {
          newHistory = [...newHistory, {
            status: updatedFields.status,
            changedBy: changedBy || loggedInUser?.name || 'System',
            timestamp: now,
            comment: updatedFields.reason || undefined
          }];
        }
        const merged = { ...sub, ...updatedFields, updatedAt: now, statusHistory: newHistory } as Submission;
        if (updatedFields.status && updatedFields.status !== sub.status) {
          let msg = `${id} status changed to ${updatedFields.status}`;
          if (updatedFields.status === 'Validated') {
            msg = `${id} has been Validated`;
          } else if (['Opportunity Registered', 'Proposal', 'Negotiation', 'Closed - Converted'].includes(updatedFields.status)) {
            const stepName = updatedFields.status === 'Closed - Converted' ? 'Converted Won' : updatedFields.status;
            msg = `${id} moved to ${stepName} stage`;
          }
          setNotifications(prev => [
            {
              id: `notif-${Math.random().toString(36).substr(2, 9)}`,
              message: msg,
              timestamp: now,
              read: false
            },
            ...prev
          ]);
        }
        return merged;
      }
      return sub;
    }));
  };

  const logEmails = (newEmails: EmailLog[]) => {
    setEmailLogs(prev => [...prev, ...newEmails]);
  };

  const resetDb = () => {
    localStorage.removeItem('impact_submissions');
    localStorage.removeItem('impact_email_logs');
    localStorage.removeItem('impact_notifications');
    setSubmissions(INITIAL_SUBMISSIONS);
    setEmailLogs([]);
    setNotifications(INITIAL_NOTIFICATIONS);
    setSelectedSubId(null);
    setShowModal(false);
    const role = loggedInUser ? getRoleByEmail(loggedInUser.email) : 'employee';
    navigate(role === 'reviewer' ? '/reviewer' : '/home');
  };

  const getRole = (user: Employee) => {
    const role = getRoleByEmail(user.email);
    if (role === 'reviewer') return 'reviewer';
    if (user.employeeId === 'ND-99999') return 'System Auditor';
    if (user.employeeId.startsWith('ND-2') || user.employeeId.startsWith('ND-3')) return 'reviewer';
    return 'employee';
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
            />
          </ProtectedRoute>
        }
      >
        <Route index element={<RootRedirect />} />
        <Route 
          path="home" 
          element={
            <EmployeeRoute>
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
            </EmployeeRoute>
          } 
        />
        <Route 
          path="submit" 
          element={
            <EmployeeRoute>
              <EmployeePortal 
                submissions={submissions}
                addSubmission={addSubmission}
                logEmails={logEmails}
                loggedInUser={loggedInUser!}
                navigate={navigate}
              />
            </EmployeeRoute>
          } 
        />
        <Route path="outbox" element={<EmailSimulator emailLogs={emailLogs} />} />
        <Route 
          path="reviewer" 
          element={
            <ReviewerRoute>
              <StakeholderDashboard 
                submissions={submissions}
                updateSubmission={updateSubmission}
                logEmails={logEmails}
                currentUserRole={currentUserRole}
                loggedInUser={loggedInUser!}
                addNotification={addNotification}
              />
            </ReviewerRoute>
          } 
        />
        <Route 
          path="crm" 
          element={
            <CrmSimulator 
              submissions={submissions}
              updateSubmission={updateSubmission}
              logEmails={logEmails}
            />
          } 
        />
        <Route path="db" element={<DbViewer submissions={submissions} resetDb={resetDb} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
