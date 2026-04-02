import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Logo from '../components/Logo';
import posthog from 'posthog-js';

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const weakPw = password.length >= 8 && (!/\d/.test(password) || !/[^a-zA-Z0-9]/.test(password) || /^\d+$/.test(password) || !/[a-zA-Z]/.test(password));

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setError(''); setLoading(true);
    try {
      await signUp(email, password);
      posthog.capture('account_created', { tier: 'free' });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  const inp = { background: '#111118', border: '1px solid #1E1E2E', color: '#F0F0FF', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', width: '100%', outline: 'none' };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#080810' }}>
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>
        <div className="rounded-2xl p-8" style={{ background: '#111118', border: '1px solid #1E1E2E' }}>
          <div className="text-lg font-semibold mb-1" style={{ color: '#F0F0FF' }}>Create account</div>
          <div className="text-sm mb-6" style={{ color: '#6B6B8A' }}>Free to start — upgrade anytime</div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)}
              style={inp}
              onFocus={e => e.target.style.borderColor = '#6C63FF'}
              onBlur={e => e.target.style.borderColor = '#1E1E2E'}
              required
            />
            <input
              type="password" placeholder="Password (min 8 chars)" value={password}
              onChange={e => setPassword(e.target.value)}
              style={inp}
              onFocus={e => e.target.style.borderColor = '#6C63FF'}
              onBlur={e => e.target.style.borderColor = '#1E1E2E'}
              required
            />
            {weakPw && <div className="text-xs" style={{ color: '#f59e0b' }}>Tip: add a number and special character for a stronger password</div>}
            {error && <div className="text-sm text-red-400">{error}</div>}
            <button
              type="submit" disabled={loading}
              className="py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              style={{ background: '#6C63FF', color: '#fff' }}
              onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = '#1d4ed8'; }}
              onMouseLeave={e => e.currentTarget.style.background = '#6C63FF'}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
          <div className="text-xs mt-3 text-center" style={{ color: '#6B6B8A' }}>
            By signing up you agree to our <Link to="/terms" style={{ color: '#6C63FF', textDecoration: 'none' }}>Terms of Service</Link> and <Link to="/privacy" style={{ color: '#6C63FF', textDecoration: 'none' }}>Privacy Policy</Link>.
          </div>
          <div className="text-sm mt-3 text-center" style={{ color: '#6B6B8A' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#6C63FF', fontWeight: 800, letterSpacing: '-0.02em' }}>Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
