import { useAuth } from '../hooks/useAuth';

// Wrap any Pro-only UI element with this component
// <TierGate> ... pro content ... </TierGate>
export default function TierGate({ children, fallback }) {
  const { isPro, loading } = useAuth();
  if (loading) return null;
  if (!isPro) {
    return fallback || (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <div className="font-medium mb-1">Pro feature</div>
        <div className="text-amber-700 mb-3">Upgrade to Sharpr Pro to unlock this.</div>
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
      className="bg-black text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors"
    >
      {label}
    </button>
  );
}
