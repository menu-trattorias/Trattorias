import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PublicMenu from './pages/PublicMenu';
import { getSupabase } from './lib/supabase';
import { verifyAdminSession, isUserAuthorizedAdmin } from './lib/auth';

const AdminLogin = React.lazy(() => import('./admin/AdminLogin'));
const AdminDashboard = React.lazy(() => import('./admin/AdminDashboard'));

// AdminGate strictly handles auth verification for admin routes only
const AdminGate = () => {
  const [adminUser, setAdminUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setIsAuthChecking(false);
      return;
    }

    let isMounted = true;

    // Verify session with Supabase Auth server for admin portal access
    verifyAdminSession()
      .then(({ user, isAuthorized }) => {
        if (isMounted) {
          setAdminUser(isAuthorized ? user : null);
          setIsAuthChecking(false);
        }
      })
      .catch((err) => {
        console.error('Admin session check failed:', err);
        if (isMounted) {
          setAdminUser(null);
          setIsAuthChecking(false);
        }
      });

    // Listen to Auth State changes for the admin portal
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        if (isMounted) setAdminUser(null);
      } else if (session?.user) {
        const authorized = isUserAuthorizedAdmin(session.user);
        if (authorized) {
          if (isMounted) setAdminUser(session.user);
        } else {
          await supabase.auth.signOut();
          if (isMounted) setAdminUser(null);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (isAuthChecking) {
    return (
      <div
        style={{
          display: 'flex',
          minHeight: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#F4F7F5'
        }}
      >
        <div style={{ textAlign: 'center', color: '#16391B' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
            Trattorias Admin Portal
          </div>
          <div style={{ fontSize: '13px', color: '#6B8B7B' }}>Verifying secure session...</div>
        </div>
      </div>
    );
  }

  return adminUser ? (
    <AdminDashboard user={adminUser} onLogout={() => setAdminUser(null)} />
  ) : (
    <AdminLogin onLoginSuccess={(user) => setAdminUser(user)} />
  );
};

export const App = () => {
  return (
    <Routes>
      <Route path="/" element={<PublicMenu />} />
      <Route
        path="/admin/*"
        element={
          <React.Suspense
            fallback={
              <div
                style={{
                  display: 'flex',
                  minHeight: '100vh',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#F4F7F5'
                }}
              >
                <div style={{ textAlign: 'center', color: '#16391B' }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
                    Trattorias Admin
                  </div>
                  <div style={{ fontSize: '13px', color: '#6B8B7B' }}>Loading portal...</div>
                </div>
              </div>
            }
          >
            <AdminGate />
          </React.Suspense>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
