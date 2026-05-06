import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import Logo from '../components/Logo';
import posthog from 'posthog-js';

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
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
      await signUp(email, password, displayName);
      posthog.capture('account_created', { tier: 'free' });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  const inp = { 
    background: 'rgba(10,10,15,0.6)', border: '1px solid rgba(108, 99, 255, 0.2)', color: '#F0F0FF', 
    borderRadius: '12px', padding: '12px 16px', fontSize: '14px', width: '100%', outline: 'none', transition: 'all 0.3s'
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: '#0A0A0F' }}>
      
      <style>{`
        @keyframes floatReg { 0% { transform: translate(0,0) scale(1); } 50% { transform: translate(-3vw,4vh) scale(1.1); } 100% { transform: translate(0,0) scale(1); } }
      `}</style>
      <div style={{ position: 'absolute', width: '70vw', height: '70vw', background: 'rgba(0,229,180,0.1)', filter: 'blur(140px)', borderRadius: '50%', animation: 'floatReg 30s infinite ease-in-out', pointerEvents: 'none' }}></div>

      <div className="w-full max-w-sm flex flex-col gap-6 relative z-10" style={{ animation: 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <div className="flex justify-center mb-4"><Logo size="lg" /></div>
        
        <div className="rounded-2xl p-8" style={{ background: 'rgba(17,17,32,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(108, 99, 255, 0.3)', boxShadow: '0 0 40px rgba(108, 99, 255, 0.1)' }}>
          <div className="text-xl font-black tracking-tight mb-2" style={{ color: '#F0F0FF' }}>Create account</div>
          <div className="text-sm mb-8 font-medium" style={{ color: '#6B6B8A' }}>Free to start. Upgrade when you're ready.</div>
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="text" placeholder="Display name (optional)" value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              style={inp}
              onFocus={e => { e.target.style.borderColor = '#6C63FF'; e.target.style.boxShadow = '0 0 15px rgba(108,99,255,0.2)'; e.target.style.background = 'rgba(17,17,32,0.9)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(108,99,255,0.2)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(10,10,15,0.6)'; }}
              maxLength={50}
            />
            <input
              type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)}
              style={inp}
              onFocus={e => { e.target.style.borderColor = '#6C63FF'; e.target.style.boxShadow = '0 0 15px rgba(108,99,255,0.2)'; e.target.style.background = 'rgba(17,17,32,0.9)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(108,99,255,0.2)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(10,10,15,0.6)'; }}
              required
            />
            <input
              type="password" placeholder="Password (min 8 chars)" value={password}
              onChange={e => setPassword(e.target.value)}
              style={inp}
              onFocus={e => { e.target.style.borderColor = '#6C63FF'; e.target.style.boxShadow = '0 0 15px rgba(108,99,255,0.2)'; e.target.style.background = 'rgba(17,17,32,0.9)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(108,99,255,0.2)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(10,10,15,0.6)'; }}
              required
            />
            
            {weakPw && <div className="text-xs font-bold" style={{ color: '#F59E0B', dropShadow: '0 0 5px rgba(245,158,11,0.5)' }}>Tip: add a number and special character</div>}
            {error && <div className="text-sm font-bold text-[#FF4560] drop-shadow-[0_0_8px_rgba(255,69,96,0.5)]">{error}</div>}
            
            <button
              type="submit" disabled={loading}
              className="mt-2 py-3.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all disabled:opacity-50"
              style={{ background: 'rgba(108,99,255,1)', color: '#F0F0FF', boxShadow: '0 0 20px rgba(108,99,255,0.3)' }}
              onMouseEnter={e => { if (!e.currentTarget.disabled){ e.currentTarget.style.background = '#8179ff'; e.currentTarget.style.boxShadow = '0 0 30px rgba(108,99,255,0.5)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
              onMouseLeave={e => { if (!e.currentTarget.disabled){ e.currentTarget.style.background = '#6C63FF'; e.currentTarget.style.boxShadow = '0 0 20px rgba(108,99,255,0.3)'; e.currentTarget.style.transform = 'translateY(0)'; } }}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
          
          <div className="text-xs mt-6 text-center font-semibold leading-relaxed" style={{ color: '#6B6B8A' }}>
            By signing up you agree to our <Link to="/terms" style={{ color: '#00E5B4', textDecoration: 'none' }}>Terms of Service</Link> and <Link to="/privacy" style={{ color: '#00E5B4', textDecoration: 'none' }}>Privacy Policy</Link>.
          </div>
          <div className="text-sm mt-4 text-center font-bold" style={{ color: '#6B6B8A' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#00E5B4', fontWeight: 900, textShadow: '0 0 10px rgba(0,229,180,0.3)' }}>Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
