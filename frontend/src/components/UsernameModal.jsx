import { useState } from 'react';
import api from '../lib/api';

export default function UsernameModal({ onComplete, onClose }) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/api/auth/set-username', { username: username.trim() });
      onComplete(username.trim());
    } catch (err) {
      setError(err.response?.data?.error || 'Username already taken or invalid.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-[#0A0A0F]/80 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className="relative w-full max-w-md bg-[#111120]/90 backdrop-blur-3xl border border-[rgba(0,229,180,0.2)] rounded-[32px] p-10 shadow-[0_30px_80px_rgba(0,0,0,0.7)] animate-in zoom-in-95 duration-500"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#00E5B4]/10 flex items-center justify-center text-3xl border border-[#00E5B4]/20 shadow-[0_0_20px_rgba(0,229,180,0.1)] mx-auto mb-6">
            🆔
          </div>
          <h2 className="text-2xl font-black text-[#F0F0FF] tracking-tight uppercase">Terminal Identity</h2>
          <p className="text-[10px] font-black text-[#4E4E63] uppercase tracking-[0.4em] mt-2 leading-tight">Claim your sharpr handle</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="text-[10px] font-black text-[#6B6B8A] uppercase tracking-[0.2em] mb-2 block">Username Handle</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4E4E63] font-black mt-0.5">@</span>
              <input 
                autoFocus
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="sharpr_player"
                className="w-full pl-10 pr-4 py-4 rounded-xl bg-black/40 border border-white/5 outline-none text-[#F0F0FF] font-bold text-lg focus:border-[#00E5B4] focus:ring-1 focus:ring-[#00E5B4]/20 transition-all placeholder:text-[#2a3a5a]"
              />
            </div>
            {error && <p className="mt-3 text-[10px] font-black text-[#FF4560] uppercase tracking-widest text-center">{error}</p>}
          </div>

          <div className="flex flex-col gap-4">
            <button 
              disabled={loading || !username.trim()}
              className="w-full py-4 rounded-xl bg-[#00E5B4] text-black font-black text-sm tracking-[0.3em] shadow-[0_0_25px_rgba(0,229,180,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all uppercase disabled:opacity-30 disabled:hover:scale-100"
            >
              {loading ? 'CALIBRATING...' : 'ESTABLISH IDENTITY'}
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="text-[10px] font-black text-[#4E4E63] uppercase tracking-[0.3em] hover:text-[#6B6B8A] transition-colors"
            >
              Skip identification
            </button>
          </div>
        </form>

        <div className="mt-10 pt-6 border-t border-white/5 flex flex-col items-center gap-2">
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => <div key={i} className="w-1 h-3 rounded-full bg-[#00E5B4]/20" />)}
          </div>
          <span className="text-[9px] font-black uppercase tracking-[0.4em] text-[#2a3a5a]">Identity verification active</span>
        </div>
      </div>
    </div>
  );
}
