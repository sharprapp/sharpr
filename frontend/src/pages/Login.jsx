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

  const inp = { background: '#0a0f1e', border: '1px solid #1e2a4a', color: '#F5F5FA', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', width: '100%', outline: 'none' };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#080810' }}>
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex justify-center">
          <Logo size="lg" />
        </div>
        <div className="rounded-2xl p-8" style={{ background: '#0f1729', border: '1px solid #1e2a4a' }}>
          <div className="text-lg font-semibold mb-1" style={{ color: '#F5F5FA' }}>Sign in</div>
          <div className="text-sm mb-6" style={{ color: '#64748b' }}>Welcome back to Sharpr</div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)}
              style={inp}
              onFocus={e => e.target.style.borderColor = '#2563EB'}
              onBlur={e => e.target.style.borderColor = '#1e2a4a'}
              required
            />
            <input
              type="password" placeholder="Password" value={password}
              onChange={e => setPassword(e.target.value)}
              style={inp}
              onFocus={e => e.target.style.borderColor = '#2563EB'}
              onBlur={e => e.target.style.borderColor = '#1e2a4a'}
              required
            />
            {error && <div className="text-sm text-red-400">{error}</div>}
            <button
              type="submit" disabled={loading}
              className="py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
              style={{ background: '#2563EB', color: '#fff' }}
              onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = '#1d4ed8'; }}
              onMouseLeave={e => e.currentTarget.style.background = '#2563EB'}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <div className="text-sm mt-4 text-center" style={{ color: '#64748b' }}>
            No account?{' '}
            <Link to="/register" style={{ color: '#2563EB', fontWeight: 600 }}>Sign up free</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
