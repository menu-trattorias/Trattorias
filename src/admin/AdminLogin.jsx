import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSupabase } from '../lib/supabase';
import { isUserAuthorizedAdmin } from '../lib/auth';
import './admin.css';

export const AdminLogin = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setIsLoading(true);

    const supabase = getSupabase();
    if (!supabase) {
      setError('System connection is not initialized. Please verify configuration.');
      setIsLoading(false);
      return;
    }

    try {
      // Sign in existing Admin
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (signInErr) throw signInErr;

      if (!data?.session || !data?.user) {
        throw new Error('Authentication did not return a valid session.');
      }

      // Check if user account has admin privileges
      const isAuthorized = isUserAuthorizedAdmin(data.user);
      if (!isAuthorized) {
        await supabase.auth.signOut();
        throw new Error('Access denied: This account does not have administrator privileges.');
      }

      onLoginSuccess(data.user);
      navigate('/admin');
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed. Please check your email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="admin-login-wrap"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        boxSizing: 'border-box',
        background: '#F4F7F5'
      }}
    >
      <div
        className="admin-login-card"
        style={{
          width: '100%',
          maxWidth: '440px',
          margin: '0 auto',
          background: '#ffffff',
          borderRadius: '24px',
          padding: '36px 30px',
          boxShadow: '0 10px 30px rgba(22, 57, 27, 0.08)',
          border: '1px solid #E2ECE5',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#D8E8DE',
              color: '#16391B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}
          >
            <ShieldCheck size={28} />
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#16391B', margin: '0 0 6px' }}>
            Trattorias Admin Portal
          </h1>
          <p style={{ fontSize: '13px', color: '#6B8B7B', margin: 0 }}>
            Enter your credentials to access the management dashboard
          </p>
        </div>

        {error && (
          <div
            style={{
              background: '#fef2f2',
              color: '#991b1b',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '13px',
              marginBottom: '18px',
              border: '1px solid #fee2e2'
            }}
          >
            {error}
          </div>
        )}

        {successMsg && (
          <div
            style={{
              background: '#f0fdf4',
              color: '#166534',
              padding: '10px 14px',
              borderRadius: '10px',
              fontSize: '13px',
              marginBottom: '18px',
              border: '1px solid #dcfce7'
            }}
          >
            {successMsg}
          </div>
        )}

        <form onSubmit={handleAuth}>
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: '#11231B',
                marginBottom: '6px'
              }}
            >
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={18}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#6B8B7B'
                }}
              />
              <input
                type="email"
                required
                placeholder="admin@trattorias.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  borderRadius: '10px',
                  border: '1px solid #C7D9CF',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  background: '#F9FBFA'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: '#11231B',
                marginBottom: '6px'
              }}
            >
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={18}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#6B8B7B'
                }}
              />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  borderRadius: '10px',
                  border: '1px solid #C7D9CF',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none',
                  background: '#F9FBFA'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              background: '#16391B',
              color: '#ffffff',
              border: 'none',
              fontSize: '14px',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(22, 57, 27, 0.2)',
              opacity: isLoading ? 0.8 : 1,
              transition: 'background 0.2s ease'
            }}
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <LogIn size={18} /> Sign In
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
