import { useAuth } from '../hooks/useAuth';

export default function TierGate({ children, fallback }) {
  const { isPro, loading } = useAuth();
  if (loading) return null;
  if (!isPro) {
    return fallback || (
      <div className="relative overflow-hidden rounded-xl p-8 text-center flex flex-col items-center justify-center transition-all" 
           style={{ 
             background: 'rgba(17,17,32,0.8)', 
             backdropFilter: 'blur(20px)',
             border: '1px solid rgba(108,99,255,0.4)',
             boxShadow: '0 0 30px rgba(108,99,255,0.15)'
           }}>
        
        {/* Glow Effects */}
        <div style={{ position: 'absolute', top: '-50%', left: '50%', transform: 'translateX(-50%)', width: '150px', height: '150px', background: 'rgba(108,99,255,0.3)', filter: 'blur(60px)', borderRadius: '50%', pointerEvents: 'none' }}></div>
        
        <div className="text-4xl mb-4" style={{ filter: 'drop-shadow(0 0 10px rgba(108,99,255,0.5))' }}>🔒</div>
        <div className="font-black text-xl mb-2 text-[#F0F0FF] tracking-tight">Pro Feature</div>
        <div className="font-semibold text-sm mb-6 text-[#6B6B8A] max-w-sm">Upgrade to Sharpr Pro to unlock premium analytics, unlimited AI querying, and live edge detection.</div>
        <UpgradeButton />
      </div>
    );
  }
  return children;
}

export function UpgradeButton({ label = 'Upgrade to Pro — $19/mo' }) {
  async function handleUpgrade() {
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const { url } = await res.json();
      window.location.href = url;
    } catch (e) {
      alert('Could not start checkout. Try again.');
    }
  }
  return (
    <button
      onClick={handleUpgrade}
      className="text-sm font-black uppercase tracking-wider px-6 py-3 rounded-lg transition-all"
      style={{ background: '#6C63FF', color: '#F0F0FF', boxShadow: '0 0 20px rgba(108,99,255,0.4)' }}
      onMouseEnter={e => { e.currentTarget.style.background = '#8179ff'; e.currentTarget.style.boxShadow = '0 0 40px rgba(108,99,255,0.6)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = '#6C63FF'; e.currentTarget.style.boxShadow = '0 0 20px rgba(108,99,255,0.4)'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {label}
    </button>
  );
}
