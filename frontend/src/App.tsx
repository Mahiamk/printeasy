import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { PrintScreen } from './pages/PrintScreen';
import { PrintingCodePage } from './pages/PrintingCodePage';
import { Settings } from './pages/Settings';
import { SuperadminDashboard } from './pages/SuperadminDashboard';
import { VerifyEmail } from './pages/VerifyEmail';
import { LinkDevice } from './pages/LinkDevice';
import { Spinner } from '@phosphor-icons/react';
import { Analytics } from '@vercel/analytics/react';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-app)',
        }}
      >
        <Spinner size={36} className="animate-spin" color="var(--accent-sage)" />
      </div>
    );
  }

  if (!user && !localStorage.getItem('printeasy_token')) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const SuperadminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-app)',
        }}
      >
        <Spinner size={36} className="animate-spin" color="var(--accent-sage)" />
      </div>
    );
  }

  if (!user && !localStorage.getItem('printeasy_token')) {
    return <Navigate to="/login" replace />;
  }

  if (user && !user.is_superadmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <DataProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />
            <Route path="/verify" element={<VerifyEmail />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/print/:id"
              element={
                <ProtectedRoute>
                  <PrintScreen />
                </ProtectedRoute>
              }
            />
            <Route
              path="/code"
              element={
                <ProtectedRoute>
                  <PrintingCodePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route path="/link-device" element={<LinkDevice />} />
            <Route
              path="/admin"
              element={
                <SuperadminRoute>
                  <SuperadminDashboard />
                </SuperadminRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Analytics />
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
  );
};

export default App;
