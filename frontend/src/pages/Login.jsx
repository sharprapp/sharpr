import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Logo from '../components/Logo';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Please enter a valid email address'); return; }
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
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
          <div className="text-lg font-semibold mb-1" style={{ color: '#F0F0FF' }}>Sign in</div>
          <div className="text-sm mb-6" style={{ color: '#6B6B8A' }}>Welcome back to Sharpr</div>
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
              type="password" placeholder="Password" value={password}
              onChange={e => setPassword(e.target.value)}
              style={inp}
              onFocus={e => e.target.style.borderColor = '#6C63FF'}
              onBlur={e => e.target.style.borderColor = '#1E1E2E'}
              required
            />
            {error && <div className="text-sm text-red-400">{error}</div>}
            <button
              type="submit" disabled={loading}
              className="py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              style={{ background: '#6C63FF', color: '#fff' }}
              onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = '#1d4ed8'; }}
              onMouseLeave={e => e.currentTarget.style.background = '#6C63FF'}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <div className="text-sm mt-4 text-center" style={{ color: '#6B6B8A' }}>
            No account?{' '}
            <Link to="/register" style={{ color: '#6C63FF', fontWeight: 800, letterSpacing: '-0.02em' }}>Sign up free</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
