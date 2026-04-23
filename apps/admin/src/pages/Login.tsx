import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setAdminToken } from '../lib/api';

export function LoginPage() {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = token.trim();
    if (!trimmed) return;
    const expected = import.meta.env.VITE_ADMIN_SECRET;
    if (expected && trimmed !== expected) {
      setError('Invalid admin token.');
      return;
    }
    setAdminToken(trimmed);
    navigate('/dashboard', { replace: true });
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0D0D0D',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <form
        onSubmit={handleSubmit}
        style={{
          width: 360,
          backgroundColor: '#1A1A1A',
          border: '1px solid #2A2A2A',
          borderRadius: 16,
          padding: 32,
        }}
      >
        <div style={{ color: '#D4A853', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
          Muzgram Admin
        </div>
        <div style={{ color: '#606060', fontSize: 13, marginBottom: 28 }}>
          Enter your admin token to continue.
        </div>

        <label style={{ display: 'block', color: '#A0A0A0', fontSize: 12, marginBottom: 6 }}>
          Admin Token
        </label>
        <input
          type="password"
          autoFocus
          value={token}
          onChange={(e) => { setToken(e.target.value); setError(''); }}
          placeholder="••••••••••••"
          style={{
            width: '100%',
            padding: '10px 12px',
            backgroundColor: '#111',
            border: `1px solid ${error ? '#E74C3C' : '#2A2A2A'}`,
            borderRadius: 8,
            color: '#F5F5F5',
            fontSize: 14,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {error && (
          <div style={{ color: '#E74C3C', fontSize: 12, marginTop: 6 }}>{error}</div>
        )}

        <button
          type="submit"
          disabled={!token.trim()}
          style={{
            marginTop: 20,
            width: '100%',
            padding: '11px',
            backgroundColor: token.trim() ? '#D4A853' : '#2A2A2A',
            color: token.trim() ? '#0D0D0D' : '#606060',
            border: 'none',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 14,
            cursor: token.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          Sign In
        </button>
      </form>
    </div>
  );
}
