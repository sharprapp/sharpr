import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import Logo from '../components/Logo';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const isUnconfirmed = error.toLowerCase().includes('not confirmed') || error.toLowerCase().includes('email not confirmed');

  async function handleResend() {
    setResendLoading(true);
    try {
      await supabase.auth.resend({ type: 'signup', email });
      setResendSent(true);
    } catch {}
    setResendLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email address'); return; }
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

  const inp = { 
    background: 'rgba(10,10,15,0.6)', border: '1px solid rgba(108, 99, 255, 0.2)', color: '#F0F0FF', 
    borderRadius: '12px', padding: '12px 16px', fontSize: '14px', width: '100%', outline: 'none', transition: 'all 0.3s'
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: '#0A0A0F' }}>
      
      <style>{`
        @keyframes floatLogin { 0% { transform: translate(0,0) scale(1); } 50% { transform: translate(2vw,-5vh) scale(1.05); } 100% { transform: translate(0,0) scale(1); } }
      `}</style>
      <div style={{ position: 'absolute', width: '60vw', height: '60vw', background: 'rgba(108,99,255,0.15)', filter: 'blur(120px)', borderRadius: '50%', animation: 'floatLogin 25s infinite ease-in-out', pointerEvents: 'none' }}></div>

      <div className="w-full max-w-sm flex flex-col gap-6 relative z-10" style={{ animation: 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}>
        <div className="flex justify-center mb-4"><Logo size="lg" /></div>
        
        <div className="rounded-2xl p-8" style={{ background: 'rgba(17,17,32,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(108, 99, 255, 0.3)', boxShadow: '0 0 40px rgba(108, 99, 255, 0.1)' }}>
          <div className="text-xl font-black tracking-tight mb-2" style={{ color: '#F0F0FF' }}>Sign in</div>
          <div className="text-sm mb-8 font-medium" style={{ color: '#6B6B8A' }}>Welcome back to your edge</div>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="email" placeholder="Email" value={email}
              onChange={e => setEmail(e.target.value)}
              style={inp}
              onFocus={e => { e.target.style.borderColor = '#6C63FF'; e.target.style.boxShadow = '0 0 15px rgba(108,99,255,0.2)'; e.target.style.background = 'rgba(17,17,32,0.9)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(108,99,255,0.2)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(10,10,15,0.6)'; }}
              required
            />
            <input
              type="password" placeholder="Password" value={password}
              onChange={e => setPassword(e.target.value)}
              style={inp}
              onFocus={e => { e.target.style.borderColor = '#6C63FF'; e.target.style.boxShadow = '0 0 15px rgba(108,99,255,0.2)'; e.target.style.background = 'rgba(17,17,32,0.9)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(108,99,255,0.2)'; e.target.style.boxShadow = 'none'; e.target.style.background = 'rgba(10,10,15,0.6)'; }}
              required
            />
            {error && (
              <div className="flex flex-col gap-2">
                <div className="text-sm font-bold text-[#FF4560] drop-shadow-[0_0_8px_rgba(255,69,96,0.5)]">{error}</div>
                {isUnconfirmed && !resendSent && (
                  <button type="button" onClick={handleResend} disabled={resendLoading}
                    className="text-xs font-bold underline text-left disabled:opacity-50"
                    style={{ color: '#00E5B4', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    {resendLoading ? 'Sending…' : 'Resend confirmation email →'}
                  </button>
                )}
                {resendSent && <div className="text-xs font-bold" style={{ color: '#00E5B4' }}>Confirmation email sent — check your inbox</div>}
              </div>
            )}
            
            <button
              type="submit" disabled={loading}
              className="mt-2 py-3.5 rounded-xl text-sm font-black uppercase tracking-wider transition-all disabled:opacity-50"
              style={{ background: 'rgba(108,99,255,1)', color: '#F0F0FF', boxShadow: '0 0 20px rgba(108,99,255,0.3)' }}
              onMouseEnter={e => { if (!e.currentTarget.disabled){ e.currentTarget.style.background = '#8179ff'; e.currentTarget.style.boxShadow = '0 0 30px rgba(108,99,255,0.5)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
              onMouseLeave={e => { if (!e.currentTarget.disabled){ e.currentTarget.style.background = '#6C63FF'; e.currentTarget.style.boxShadow = '0 0 20px rgba(108,99,255,0.3)'; e.currentTarget.style.transform = 'translateY(0)'; } }}
            >
              {loading ? 'Authenticating…' : 'Sign in'}
            </button>
          </form>
          
          <div className="text-sm mt-8 text-center font-bold" style={{ color: '#6B6B8A' }}>
            No account?{' '}
            <Link to="/register" style={{ color: '#00E5B4', fontWeight: 900, textShadow: '0 0 10px rgba(0,229,180,0.3)' }}>Sign up free</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
