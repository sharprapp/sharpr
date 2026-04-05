import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../lib/api';
import { useAuth } from '../hooks/useAuth';

const CHANNELS = [
  { id: 'trading',    label: 'Trading Floor',  icon: '📈', color: '#6C63FF' },
  { id: 'polymarket', label: 'Predictions',   icon: '🎯', color: '#00E5B4' },
  { id: 'betting',    label: 'Sports Book',   icon: '🏈', color: '#FF4560' },
  { id: 'news',       label: 'Intel Feed',     icon: '📰', color: '#F0F0FF' },
];

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)   return 'Just Now';
  if (s < 3600)  return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  return Math.floor(s / 86400) + 'd';
}

function VerifiedBadge() {
  return (
    <span title="Institutional Member" className="inline-flex items-center justify-center w-3 h-3 rounded-full ml-1 bg-[#6C63FF] shadow-[0_0_10px_rgba(108,99,255,0.4)]">
      <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </span>
  );
}

function PostCard({ post, onUpvote, onReport, upvoted }) {
  const [expanded, setExpanded]     = useState(false);
  const [replies, setReplies]       = useState([]);
  const [replyText, setReplyText]   = useState('');
  const [replyName, setReplyName]   = useState(() => localStorage.getItem('chat_name') || '');
  const [sending, setSending]       = useState(false);
  const { user } = useAuth();

  async function loadReplies() {
    if (!expanded) {
      const { data } = await api.get(`/api/community/posts/${post.id}`).catch(() => ({ data: null }));
      if (data?.replies) setReplies(data.replies);
    }
    setExpanded(e => !e);
  }

  async function sendReply() {
    if (!replyText.trim() || !replyName.trim()) return;
    setSending(true);
    try {
      const { data } = await api.post(`/api/community/posts/${post.id}/reply`, {
        display_name: replyName,
        content: replyText,
      });
      setReplies(r => [...r, data]);
      setReplyText('');
      localStorage.setItem('chat_name', replyName);
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to post reply');
    }
    setSending(false);
  }

  return (
    <div className="group rounded-[24px] p-6 bg-[#111120]/60 backdrop-blur-md border border-white/5 hover:border-[#6C63FF]/30 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center font-black text-[#6C63FF] text-sm shadow-inner group-hover:bg-[#6C63FF]/10 transition-colors">
            {post.display_name[0].toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black text-[#F0F0FF] tracking-tight">{post.display_name}</span>
              {post.user_id && <VerifiedBadge />}
            </div>
            <div className="text-[10px] font-black text-[#4E4E63] uppercase tracking-widest">{timeAgo(post.created_at)}</div>
          </div>
        </div>
        <div className="px-3 py-1 rounded-lg bg-black/40 border border-white/5 text-[9px] font-black text-[#6B6B8A] uppercase tracking-[0.2em]">#{post.channel}</div>
      </div>

      <p className="mt-4 text-sm text-[#8899bb] leading-relaxed whitespace-pre-wrap font-medium">{post.content}</p>

      <div className="mt-6 flex items-center gap-6">
        <button 
          onClick={() => onUpvote(post.id)} 
          disabled={upvoted}
          className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${upvoted ? 'text-[#00E5B4]' : 'text-[#4E4E63] hover:text-[#6C63FF]'}`}
        >
          <span className="text-lg leading-none">{upvoted ? '▲' : '△'}</span>
          <span>{post.upvotes} UPVOTES</span>
        </button>
        <button 
          onClick={loadReplies}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#4E4E63] hover:text-[#F0F0FF] transition-all"
        >
          <span className="text-lg leading-none">💬</span>
          <span>{post.reply_count} INTELLIGENCE</span>
        </button>
      </div>

      {expanded && (
        <div className="mt-6 pt-6 border-t border-white/5 space-y-4 animate-in slide-in-from-top-2">
          {replies.map(r => (
            <div key={r.id} className="flex gap-3 bg-black/20 p-4 rounded-2xl border border-white/5">
              <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center text-xs font-black text-[#6B6B8A]">{r.display_name[0].toUpperCase()}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-black text-[#F0F0FF]">{r.display_name}</span>
                  {r.user_id && <VerifiedBadge />}
                  <span className="text-[9px] font-black text-[#2a3a5a] uppercase">{timeAgo(r.created_at)}</span>
                </div>
                <p className="text-xs text-[#6B6B8A] leading-relaxed">{r.content}</p>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <input 
              value={replyText} 
              onChange={e => setReplyText(e.target.value)}
              placeholder="Deploy response..."
              className="flex-1 bg-black/40 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-[#F0F0FF] outline-none focus:border-[#6C63FF] transition-all" 
            />
            <button 
              onClick={sendReply} 
              disabled={sending || !replyText.trim()}
              className="px-6 py-2.5 rounded-xl bg-[#6C63FF] text-white text-xs font-black uppercase tracking-widest disabled:opacity-30"
            >
              {sending ? '...' : 'SEND'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LeaderboardRow({ u, i, followed, toggleFollow }) {
  const isFirst = u.rank === 1;
  const isSecond = u.rank === 2;
  const isThird = u.rank === 3;

  return (
    <div className={`group flex items-center gap-4 p-4 rounded-xl transition-all ${isFirst ? 'bg-[#ffc107]/5 border border-[#ffc107]/20 shadow-[0_0_30px_rgba(255,193,7,0.05)]' : 'bg-black/20 border border-white/5 hover:bg-black/30'}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-transform group-hover:scale-110 ${isFirst ? 'bg-[#ffc107] text-black shadow-[0_0_20px_rgba(255,193,7,0.4)]' : isSecond ? 'bg-[#E5E7EB] text-black shadow-[0_0_15px_rgba(229,231,235,0.3)]' : isThird ? 'bg-[#CD7F32] text-white shadow-[0_0_15px_rgba(205,127,50,0.3)]' : 'bg-black/40 text-[#4E4E63]'}`}>
        {u.rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-[#F0F0FF] truncate">{u.username}</span>
          <VerifiedBadge />
        </div>
        <div className="text-[10px] font-black text-[#4E4E63] uppercase tracking-widest">{u.sport} · {u.wins}W-{u.losses}L</div>
      </div>
      <div className="text-right">
        <div className={`text-sm font-black ${u.pnl >= 0 ? 'text-[#00E5B4]' : 'text-[#FF4560]'}`}>{u.pnl >= 0 ? '+' : ''}${u.pnl.toLocaleString()}</div>
        <div className="text-[10px] font-black text-[#2a3a5a] uppercase">{u.wr}% WIN RATE</div>
      </div>
      <button 
        onClick={() => toggleFollow(u.username)}
        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border ${followed.has(u.username) ? 'bg-[#6C63FF]/10 border-[#6C63FF] text-[#6C63FF]' : 'bg-transparent border-white/10 text-[#4E4E63] hover:border-[#6C63FF] hover:text-[#F0F0FF]'}`}
      >
        {followed.has(u.username) ? 'FOLLOWING' : '+ FOLLOW'}
      </button>
    </div>
  );
}

export default function CommunityTab() {
  const { user } = useAuth();
  const [commTab, setCommTab]   = useState('feed');
  const [channel, setChannel]   = useState('trading');
  const [posts, setPosts]       = useState([]);
  const [trending, setTrending] = useState([]);
  const [leaders, setLeaders]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [sort, setSort]         = useState('new');
  const [page, setPage]         = useState(0);
  const [hasMore, setHasMore]   = useState(true);
  const [content, setContent]   = useState('');
  const [displayName, setDisplayName] = useState(() => localStorage.getItem('chat_name') || '');
  const [posting, setPosting]   = useState(false);
  
  const [followed, setFollowed] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('followed_users') || '[]')); } catch { return new Set(); }
  });

  const loadPosts = useCallback(async (reset = false) => {
    const nextPage = reset ? 0 : page;
    setLoading(true);
    try {
      const { data } = await api.get(`/api/community/posts?channel=${channel}&sort=${sort}&page=${nextPage}`);
      setPosts(prev => reset ? data : [...prev, ...data]);
      setHasMore(data.length === 25);
      if (!reset) setPage(p => p + 1);
    } catch {}
    setLoading(false);
  }, [channel, sort, page]);

  useEffect(() => {
    api.get('/api/community/trending').then(r => setTrending(r.data)).catch(() => {});
    api.get('/api/community/leaderboard?period=month').then(r => setLeaders(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    setPage(0); setHasMore(true);
    loadPosts(true);
  }, [channel, sort]);

  async function submitPost() {
    const name = user ? displayName || user.email?.split('@')[0] : displayName;
    if (!name?.trim()) return alert('Identity profile incomplete');
    if (!content.trim()) return alert('Payload empty');
    setPosting(true);
    try {
      const { data } = await api.post('/api/community/posts', {
        channel, display_name: name, content, device_id: 'terminal',
      });
      setPosts(prev => [data, ...prev]);
      setContent('');
      localStorage.setItem('chat_name', name);
    } catch (e) {
      alert(e.response?.data?.error || 'Transmission failed');
    }
    setPosting(false);
  }

  function handleUpvote(postId) {
    api.post(`/api/community/posts/${postId}/upvote`).catch(() => {});
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, upvotes: p.upvotes + 1 } : p));
  }

  function toggleFollow(username) {
    const next = new Set(followed);
    if (next.has(username)) next.delete(username); else next.add(username);
    setFollowed(next);
    localStorage.setItem('followed_users', JSON.stringify([...next]));
  }

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-8 pb-32">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 p-10 glass-card rounded-[32px] overflow-hidden relative">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#6C63FF]/5 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="relative z-10">
          <h1 className="text-4xl font-black text-[#F0F0FF] tracking-tighter mb-2">SHARPR PULSE</h1>
          <p className="text-[10px] font-black text-[#6B6B8A] uppercase tracking-[0.5em] leading-tight">Global Trade Floor & Intelligence Relay</p>
        </div>
        <div className="flex gap-2 p-1.5 bg-black/40 rounded-2xl border border-white/5 relative z-10 backdrop-blur-xl">
          {[
            { id: 'feed', label: 'COMMUNITY FEED', icon: '💬' },
            { id: 'leaderboard', label: 'LEADERBOARD', icon: '🏆' }
          ].map(t => (
            <button key={t.id} onClick={() => setCommTab(t.id)}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${commTab === t.id ? 'bg-[#6C63FF] text-white shadow-[0_0_20px_rgba(108,99,255,0.3)]' : 'text-[#6B6B8A] hover:text-[#F0F0FF]'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* SIDEBAR TABS (L) */}
        <aside className="lg:col-span-3 flex flex-col gap-4">
          <div className="p-6 glass-card rounded-[24px] space-y-2">
            <div className="text-[10px] font-black text-[#4E4E63] uppercase tracking-[0.4em] mb-4">Relay Channels</div>
            {CHANNELS.map(c => (
              <button 
                key={c.id} 
                onClick={() => { setChannel(c.id); setCommTab('feed'); }}
                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group ${channel === c.id ? 'bg-[#6C63FF]/10 border border-[#6C63FF]/30' : 'bg-transparent border border-transparent hover:bg-white/5'}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-xl transition-transform duration-300 ${channel === c.id ? 'scale-110' : 'group-hover:scale-110'}`}>{c.icon}</span>
                  <span className={`text-[11px] font-black uppercase tracking-widest ${channel === c.id ? 'text-[#F0F0FF]' : 'text-[#6B6B8A]'}`}>{c.label}</span>
                </div>
                {channel === c.id && <div className="w-1.5 h-1.5 rounded-full bg-[#6C63FF] animate-pulse" />}
              </button>
            ))}
          </div>

          <div className="p-6 glass-card rounded-[24px]">
            <div className="text-[10px] font-black text-[#4E4E63] uppercase tracking-[0.4em] mb-4">Trending Intelligence</div>
            <div className="space-y-4">
              {trending.slice(0, 5).map((p, i) => (
                <div key={p.id} className="group cursor-pointer">
                  <p className="text-xs font-bold text-[#F0F0FF] line-clamp-2 leading-snug group-hover:text-[#6C63FF] transition-colors">{p.content}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9px] font-black text-[#2a3a5a] uppercase">{p.display_name}</span>
                    <span className="text-[9px] font-black text-[#00E5B4] uppercase">▲ {p.upvotes}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* MAIN FEED (C) */}
        <main className="lg:col-span-6 flex flex-col gap-6">
          {commTab === 'feed' ? (
            <>
              {/* COMPOSER */}
              <div className="p-6 glass-card rounded-[24px] border-[#6C63FF]/20 relative">
                <div className="absolute top-0 right-10 w-20 h-px bg-gradient-to-r from-transparent via-[#6C63FF]/40 to-transparent" />
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#6C63FF] shadow-[0_0_8px_rgba(108,99,255,0.5)]" />
                      <span className="text-[10px] font-black text-[#6B6B8A] uppercase tracking-widest">Encrypted Transmission</span>
                    </div>
                    <span className="text-[9px] font-black text-[#2a3a5a] uppercase">Protocol: v2.4</span>
                  </div>
                  
                  {!user && (
                    <input 
                      value={displayName} 
                      onChange={e => setDisplayName(e.target.value)}
                      placeholder="Operator Display Name..."
                      className="bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-sm text-[#F0F0FF] font-bold outline-none focus:border-[#6C63FF] transition-all placeholder:text-[#2a3a5a]" 
                    />
                  )}
                  
                  <textarea 
                    value={content} 
                    onChange={e => setContent(e.target.value)}
                    placeholder={`Broadcast intelligence to ${CHANNELS.find(c => c.id === channel)?.label}...`}
                    className="w-full bg-black/40 border border-white/5 rounded-2xl px-6 py-5 text-sm text-[#F0F0FF] font-medium min-h-[140px] outline-none focus:border-[#6C63FF] transition-all resize-none placeholder:text-[#2a3a5a]"
                  />
                  
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-[10px] font-black text-[#4E4E63] uppercase tracking-[0.2em]">{content.length} / 1000 Bytes</div>
                    <button 
                      onClick={submitPost} 
                      disabled={posting || !content.trim()}
                      className="px-10 py-4 rounded-xl bg-[#6C63FF] text-white font-black text-[10px] uppercase tracking-[0.4em] shadow-[0_0_30px_rgba(108,99,255,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30"
                    >
                      {posting ? 'COMMITTING...' : 'BROADCAST IQ'}
                    </button>
                  </div>
                </div>
              </div>

              {/* SORTING */}
              <div className="flex items-center justify-between px-2 text-[10px] font-black uppercase tracking-[0.5em] text-[#4E4E63]">
                <div className="flex gap-8">
                  {['new', 'top'].map(s => (
                    <button key={s} onClick={() => setSort(s)} className={`transition-all ${sort === s ? 'text-[#F0F0FF] translate-y-[-2px]' : 'hover:text-[#6B6B8A]'}`}>
                      {s === 'new' ? 'Latest Arrivals' : 'High Performance'}
                    </button>
                  ))}
                </div>
                <div>{posts.length} ACTIVE SIGNALS</div>
              </div>

              {/* FEED LIST */}
              <div className="flex flex-col gap-4">
                {posts.map(post => <PostCard key={post.id} post={post} onUpvote={handleUpvote} upvoted={false} />)}
                {hasMore && (
                  <button onClick={() => loadPosts(false)} className="w-full py-6 rounded-[24px] bg-black/20 border border-white/5 text-[10px] font-black text-[#6B6B8A] uppercase tracking-[0.6em] hover:bg-white/5 transition-all">LOAD ADDITIONAL STREAMS</button>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-4 animate-in slide-in-from-right-8 duration-500">
              <div className="text-[10px] font-black text-[#6C63FF] uppercase tracking-[0.5em] mb-4">Institutional Alpha Leaders</div>
              {leaders.map(u => <LeaderboardRow key={u.username} u={u} followed={followed} toggleFollow={toggleFollow} />)}
            </div>
          )}
        </main>

        {/* RIGHT PANEL (R) */}
        <aside className="lg:col-span-3 flex flex-col gap-6">
          <div className="p-8 glass-card rounded-[32px] bg-gradient-to-br from-[#111120] to-[#0A0A0F] border-[#00E5B4]/20 relative overflow-hidden">
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-[#00E5B4]/10 blur-[40px] rounded-full translate-x-1/2 translate-y-1/2" />
            <div className="text-[10px] font-black text-[#6B6B8A] uppercase tracking-[0.4em] mb-6">Social Calibration</div>
            <div className="flex flex-col gap-4">
               <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#F0F0FF]">FOLLOWING</span>
                <span className="text-xs font-black text-[#6C63FF]">{followed.size}</span>
               </div>
               <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#F0F0FF]">UPVOTES SENT</span>
                <span className="text-xs font-black text-[#00E5B4]">814</span>
               </div>
               <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#F0F0FF]">VERIFIED RANK</span>
                <span className="text-xs font-black text-[#FF4560]">MASTER</span>
               </div>
            </div>
            <button className="w-full mt-8 py-4 rounded-2xl bg-white text-black font-black text-[10px] uppercase tracking-[0.3em] hover:scale-[1.02] transition-transform">UPGRADE IDENTITY</button>
          </div>

          <div className="p-8 glass-card rounded-[32px] border-[#6C63FF]/20">
            <div className="text-[10px] font-black text-[#6B6B8A] uppercase tracking-[0.4em] mb-6">Terminal Protocol</div>
            <div className="space-y-4 text-[11px] font-bold text-[#4E4E63] uppercase tracking-tight">
              <div className="flex gap-3"><span className="text-[#6C63FF]">01</span> No financial solicitation</div>
              <div className="flex gap-3"><span className="text-[#6C63FF]">02</span> Institutional respect required</div>
              <div className="flex gap-3"><span className="text-[#6C63FF]">03</span> Ideas only — Not advice</div>
              <div className="flex gap-3"><span className="text-[#6C63FF]">04</span> Verified status = Proof of Work</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
