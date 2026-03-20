import { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { useAuth } from '../hooks/useAuth';

const CHANNELS = [
  { id: 'trading',    label: 'Trading Chat',    icon: '📈' },
  { id: 'polymarket', label: 'Polymarket Chat',  icon: '🎯' },
  { id: 'betting',    label: 'Betting Chat',     icon: '🏈' },
  { id: 'news',       label: 'News Chat',        icon: '📰' },
];

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)   return 'just now';
  if (s < 3600)  return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

function VerifiedBadge() {
  return (
    <span title="Verified member" className="inline-flex items-center justify-center w-4 h-4 rounded-full ml-1 shrink-0" style={{background: '#2563EB'}}>
      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
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
  const [reported, setReported]     = useState(false);
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

  async function report() {
    if (reported) return;
    await api.post(`/api/community/posts/${post.id}/report`, { reason: 'inappropriate' }).catch(() => {});
    setReported(true);
  }

  return (
    <div className="rounded-2xl p-5 transition-all"
      style={{background: '#0f1729', border: '1px solid #1e2a4a'}}
      onMouseEnter={e => e.currentTarget.style.borderColor='rgba(37,99,235,0.3)'}
      onMouseLeave={e => e.currentTarget.style.borderColor='#1e2a4a'}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
            style={{background: '#1e2a4a', color: '#60a5fa'}}>
            {post.display_name[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold truncate" style={{color: '#F5F5FA'}}>{post.display_name}</span>
              {post.user_id && <VerifiedBadge />}
            </div>
            <div className="text-xs" style={{color: '#64748b'}}>{timeAgo(post.created_at)}</div>
          </div>
        </div>
        <button onClick={report} title="Report post"
          className="text-xs shrink-0 transition-colors"
          style={{color: reported ? '#f87171' : '#334155'}}>
          {reported ? '⚑ Reported' : '⚑'}
        </button>
      </div>

      {/* Content */}
      <p className="text-sm leading-relaxed mb-4 whitespace-pre-wrap" style={{color: '#cbd5e1'}}>{post.content}</p>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button onClick={() => onUpvote(post.id)} disabled={upvoted}
          className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
          style={{color: upvoted ? '#22c55e' : '#64748b'}}>
          <span className="text-base leading-none">{upvoted ? '▲' : '△'}</span>
          <span>{post.upvotes}</span>
        </button>
        <button onClick={loadReplies}
          className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
          style={{color: '#64748b'}}
          onMouseEnter={e => e.currentTarget.style.color='#60a5fa'}
          onMouseLeave={e => e.currentTarget.style.color='#64748b'}>
          <span className="text-base leading-none">💬</span>
          <span>{post.reply_count} {post.reply_count === 1 ? 'reply' : 'replies'}</span>
        </button>
      </div>

      {/* Reply thread */}
      {expanded && (
        <div className="mt-4 pt-4" style={{borderTop: '1px solid #1e2a4a'}}>
          {replies.length > 0 && (
            <div className="flex flex-col gap-3 mb-4">
              {replies.map(r => (
                <div key={r.id} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                    style={{background: '#1e2a4a', color: '#94A3B8'}}>
                    {r.display_name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-semibold" style={{color: '#F5F5FA'}}>{r.display_name}</span>
                      {r.user_id && <VerifiedBadge />}
                      <span className="text-xs" style={{color: '#64748b'}}>{timeAgo(r.created_at)}</span>
                    </div>
                    <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{color: '#94A3B8'}}>{r.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          {replies.length === 0 && (
            <p className="text-xs mb-3" style={{color: '#64748b'}}>No replies yet — be the first</p>
          )}
          <div className="flex flex-col gap-2">
            {!user && (
              <input value={replyName} onChange={e => setReplyName(e.target.value)}
                placeholder="Your name" maxLength={30}
                className="rounded-xl px-3.5 py-2 text-xs outline-none transition-colors"
                style={{background: '#0a0f1e', border: '1px solid #1e2a4a', color: '#F5F5FA'}}
                onFocus={e => e.target.style.borderColor='#2563EB'}
                onBlur={e => e.target.style.borderColor='#1e2a4a'} />
            )}
            <div className="flex gap-2">
              <input value={replyText} onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendReply()}
                placeholder="Write a reply…" maxLength={500}
                className="flex-1 rounded-xl px-3.5 py-2 text-xs outline-none transition-colors"
                style={{background: '#0a0f1e', border: '1px solid #1e2a4a', color: '#F5F5FA'}}
                onFocus={e => e.target.style.borderColor='#2563EB'}
                onBlur={e => e.target.style.borderColor='#1e2a4a'} />
              <button onClick={sendReply} disabled={sending || !replyText.trim()}
                className="rounded-xl px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-40"
                style={{background: '#2563EB', color: '#fff'}}
                onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background='#1d4ed8'; }}
                onMouseLeave={e => e.currentTarget.style.background='#2563EB'}>
                {sending ? '…' : 'Reply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TrendingStrip({ posts }) {
  if (!posts.length) return null;
  return (
    <div className="rounded-2xl p-4" style={{background: '#0f1729', border: '1px solid #1e2a4a'}}>
      <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{color: '#94A3B8'}}>🔥 Trending today</div>
      <div className="flex flex-col gap-2">
        {posts.map((p, i) => (
          <div key={p.id} className="flex items-start gap-2.5">
            <span className="text-xs font-bold w-4 shrink-0 mt-0.5" style={{color: '#334155'}}>{i + 1}</span>
            <div className="min-w-0">
              <p className="text-xs font-medium leading-snug line-clamp-2" style={{color: '#cbd5e1'}}>{p.content}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs" style={{color: '#64748b'}}>{p.display_name}</span>
                {p.user_id && <VerifiedBadge />}
                <span className="text-xs font-semibold text-green-500">▲ {p.upvotes}</span>
                <span className="text-xs capitalize" style={{color: '#334155'}}>{p.channel}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VerifiedUsersPanel({ onClose }) {
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/community/verified-users')
      .then(r => { setUsers(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="rounded-2xl overflow-hidden" style={{background: '#0f1729', border: '1px solid #1e2a4a'}}>
      <div className="flex items-center justify-between px-5 py-4" style={{borderBottom: '1px solid #1e2a4a'}}>
        <div className="text-xs font-semibold uppercase tracking-wider" style={{color: '#94A3B8'}}>✓ Verified members</div>
        <button onClick={onClose} className="text-lg transition-colors" style={{color: '#64748b'}}
          onMouseEnter={e => e.currentTarget.style.color='#F5F5FA'}
          onMouseLeave={e => e.currentTarget.style.color='#64748b'}>×</button>
      </div>
      {loading ? (
        <div className="px-5 py-8 text-center text-sm" style={{color: '#94A3B8'}}>Loading…</div>
      ) : users.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm" style={{color: '#94A3B8'}}>No members yet</div>
      ) : (
        <div>
          {users.map((u, idx) => (
            <div key={u.id} className="flex items-center justify-between px-5 py-3.5"
              style={{borderBottom: idx < users.length - 1 ? '1px solid #1e2a4a' : 'none'}}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{background: 'rgba(37,99,235,0.2)', color: '#60a5fa'}}>
                  {u.username[0].toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold" style={{color: '#F5F5FA'}}>{u.username}</span>
                    <VerifiedBadge />
                  </div>
                  <div className="text-xs" style={{color: '#64748b'}}>
                    Joined {new Date(u.joinDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold" style={{color: '#F5F5FA'}}>{u.postCount}</div>
                <div className="text-xs" style={{color: '#64748b'}}>posts</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   LEADERBOARD PANEL
───────────────────────────────────────── */
const MOCK_LEADERS = [
  { rank:1, username:'SharpBettor', sport:'NFL', wins:42, losses:18, pnl:3840, wr:70, badge:'🏆', bestBet:'Chiefs -3.5 (+$420)' },
  { rank:2, username:'PolyKing',    sport:'Crypto', wins:31, losses:14, pnl:2210, wr:69, badge:'🥈', bestBet:'BTC above 100k (+$880)' },
  { rank:3, username:'MNQTrader',   sport:'Day Trading', wins:88, losses:44, pnl:1975, wr:67, badge:'🥉', bestBet:'NQ breakout (+$520)' },
  { rank:4, username:'ValueHunter', sport:'NBA', wins:29, losses:17, pnl:1620, wr:63, badge:null, bestBet:'Lakers +7.5 (+$350)' },
  { rank:5, username:'EdgeFinder',  sport:'Soccer', wins:19, losses:12, pnl:1140, wr:61, badge:null, bestBet:'Man City ML (+$290)' },
  { rank:6, username:'KellyStaker', sport:'MLB', wins:23, losses:16, pnl:890,  wr:59, badge:null, bestBet:'Dodgers ML (+$210)' },
  { rank:7, username:'GapTrader',   sport:'Day Trading', wins:55, losses:39, pnl:740, wr:59, badge:null, bestBet:'NVDA gap fill (+$180)' },
  { rank:8, username:'UFCSharp',    sport:'UFC', wins:16, losses:12, pnl:610,  wr:57, badge:null, bestBet:'Oliveira sub (+$340)' },
];

function LeaderboardPanel() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod]   = useState('month');
  const [followed, setFollowed] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('followed_users') || '[]')); } catch { return new Set(); }
  });

  useEffect(() => {
    setLoading(true);
    api.get(`/api/community/leaderboard?period=${period}`)
      .then(r => { setLeaders(r.data); setLoading(false); })
      .catch(() => { setLeaders(MOCK_LEADERS); setLoading(false); });
  }, [period]);

  function toggleFollow(username) {
    const next = new Set(followed);
    if (next.has(username)) next.delete(username); else next.add(username);
    setFollowed(next);
    localStorage.setItem('followed_users', JSON.stringify([...next]));
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-bold" style={{color: '#F5F5FA'}}>🏆 Leaderboard</div>
          <div className="text-xs mt-0.5" style={{color: '#64748b'}}>Top performers with public journals enabled</div>
        </div>
        <div className="flex gap-1 p-1 rounded-xl" style={{background: '#0a0f1e'}}>
          {['week','month','all'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
              style={period===p ? {background: '#2563EB', color: '#fff'} : {color: '#94A3B8'}}>
              {p === 'all' ? 'All time' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 podium */}
      {!loading && leaders.length >= 3 && (
        <div className="grid grid-cols-3 gap-4">
          {[leaders[1], leaders[0], leaders[2]].map((u, i) => {
            const heights = ['h-28', 'h-36', 'h-24'];
            const isFirst = i === 1;
            return (
              <div key={u.username} className="flex flex-col items-center gap-2">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${isFirst ? 'ring-2 ring-yellow-400' : ''}`}
                  style={{background: isFirst ? 'rgba(234,179,8,0.2)' : '#1e2a4a', color: isFirst ? '#fbbf24' : '#94A3B8'}}>
                  {u.username[0].toUpperCase()}
                </div>
                <div className="text-xs font-semibold text-center" style={{color: '#F5F5FA'}}>{u.badge || '#'+u.rank}</div>
                <div className="text-xs text-center" style={{color: '#64748b'}}>{u.username}</div>
                <div className={`w-full rounded-t-2xl ${heights[i]} flex flex-col items-center justify-end pb-4 gap-1`}
                  style={{background: isFirst ? 'rgba(234,179,8,0.08)' : '#0f1729', border: `1px solid ${isFirst ? 'rgba(234,179,8,0.3)' : '#1e2a4a'}`}}>
                  <div className="text-base font-bold" style={{color: '#22c55e'}}>+${u.pnl.toLocaleString()}</div>
                  <div className="text-xs" style={{color: '#64748b'}}>{u.wr}% WR</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full leaderboard table */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="rounded-2xl p-4 skeleton" style={{height: 64}} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{background: '#0f1729', border: '1px solid #1e2a4a'}}>
          <table className="w-full" style={{fontSize: 13, borderCollapse: 'collapse'}}>
            <thead>
              <tr style={{background: '#0a0f1e', borderBottom: '1px solid #1e2a4a'}}>
                {['Rank','Trader','Sport','Record','Win Rate','P&L','Best bet',''].map(h => (
                  <th key={h} style={{padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leaders.map((u, i) => (
                <tr key={u.username} style={{borderBottom: i < leaders.length - 1 ? '1px solid rgba(30,42,74,0.6)' : 'none'}}
                  onMouseEnter={e => e.currentTarget.style.background='rgba(30,42,74,0.3)'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <td style={{padding: '12px 14px', fontWeight: 700, color: u.rank <= 3 ? '#fbbf24' : '#64748b'}}>
                    {u.badge || '#'+u.rank}
                  </td>
                  <td style={{padding: '12px 14px'}}>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{background: '#1e2a4a', color: '#60a5fa'}}>{u.username[0].toUpperCase()}</div>
                      <span style={{color: '#F5F5FA', fontWeight: 600}}>{u.username}</span>
                    </div>
                  </td>
                  <td style={{padding: '12px 14px', color: '#94A3B8'}}>{u.sport}</td>
                  <td style={{padding: '12px 14px', color: '#94A3B8'}}>{u.wins}W–{u.losses}L</td>
                  <td style={{padding: '12px 14px'}}>
                    <span style={{color: u.wr >= 60 ? '#22c55e' : u.wr >= 50 ? '#f59e0b' : '#ef4444', fontWeight: 700}}>{u.wr}%</span>
                  </td>
                  <td style={{padding: '12px 14px', fontWeight: 700, color: u.pnl >= 0 ? '#22c55e' : '#ef4444'}}>
                    {u.pnl >= 0 ? '+' : ''}${u.pnl.toLocaleString()}
                  </td>
                  <td style={{padding: '12px 14px', color: '#64748b', fontSize: 12, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                    {u.bestBet}
                  </td>
                  <td style={{padding: '12px 14px'}}>
                    <button onClick={() => toggleFollow(u.username)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                      style={followed.has(u.username)
                        ? {background: 'rgba(37,99,235,0.2)', color: '#60a5fa', border: '1px solid rgba(37,99,235,0.3)'}
                        : {background: 'transparent', color: '#475569', border: '1px solid #1e2a4a'}}
                      onMouseEnter={e => { if (!followed.has(u.username)) { e.currentTarget.style.borderColor='#2563EB'; e.currentTarget.style.color='#F5F5FA'; } }}
                      onMouseLeave={e => { if (!followed.has(u.username)) { e.currentTarget.style.borderColor='#1e2a4a'; e.currentTarget.style.color='#475569'; } }}>
                      {followed.has(u.username) ? '✓ Following' : '+ Follow'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {followed.size > 0 && (
        <div className="rounded-2xl p-4" style={{background: '#0f1729', border: '1px solid #1e2a4a'}}>
          <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{color: '#94A3B8'}}>Following ({followed.size})</div>
          <div className="flex flex-wrap gap-2">
            {[...followed].map(u => (
              <span key={u} className="text-xs px-3 py-1.5 rounded-full flex items-center gap-1.5"
                style={{background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.25)', color: '#60a5fa'}}>
                {u}
                <button onClick={() => toggleFollow(u)} style={{color: '#475569', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, lineHeight: 1}}
                  onMouseEnter={e => e.currentTarget.style.color='#ef4444'}
                  onMouseLeave={e => e.currentTarget.style.color='#475569'}>✕</button>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-center" style={{color: '#334155'}}>
        Only users who have enabled "Make journal public" in Settings appear here.
      </div>
    </div>
  );
}

export default function CommunityTab() {
  const { user } = useAuth();
  const [commTab, setCommTab]   = useState('feed');
  const [channel, setChannel]   = useState('trading');
  const [posts, setPosts]       = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [sort, setSort]         = useState('new');
  const [page, setPage]         = useState(0);
  const [hasMore, setHasMore]   = useState(true);
  const [showVerified, setShowVerified] = useState(false);

  const [content, setContent]         = useState('');
  const [displayName, setDisplayName] = useState(() => localStorage.getItem('chat_name') || '');
  const [posting, setPosting]         = useState(false);

  const [deviceId] = useState(() => {
    let id = localStorage.getItem('device_id');
    if (!id) { id = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('device_id', id); }
    return id;
  });
  const [upvoted, setUpvoted] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('upvoted_posts') || '[]')); } catch { return new Set(); }
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
  }, []);

  useEffect(() => {
    setPage(0); setHasMore(true);
    loadPosts(true);
  }, [channel, sort]);

  useEffect(() => {
    const interval = setInterval(() => loadPosts(true), 30000);
    return () => clearInterval(interval);
  }, [channel, sort]);

  async function submitPost() {
    const name = user ? displayName || user.email?.split('@')[0] : displayName;
    if (!name?.trim()) return alert('Enter your display name');
    if (!content.trim()) return alert('Write something first');
    setPosting(true);
    try {
      const { data } = await api.post('/api/community/posts', {
        channel, display_name: name, content, device_id: deviceId,
      });
      setPosts(prev => [data, ...prev]);
      setContent('');
      localStorage.setItem('chat_name', name);
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to post');
    }
    setPosting(false);
  }

  async function handleUpvote(postId) {
    if (upvoted.has(postId)) return;
    await api.post(`/api/community/posts/${postId}/upvote`).catch(() => {});
    const next = new Set([...upvoted, postId]);
    setUpvoted(next);
    localStorage.setItem('upvoted_posts', JSON.stringify([...next]));
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, upvotes: p.upvotes + 1 } : p));
  }

  const activeName = user ? (displayName || user.email?.split('@')[0] || '') : displayName;

  return (
    <div className="flex flex-col gap-5">
      {/* First post incentive */}
      {posts.length === 0 || !posts.some(p => p.user_id) ? (
        <div style={{
          background: 'rgba(79,142,247,0.06)', border: '1px solid rgba(79,142,247,0.2)',
          borderRadius: 16, padding: '16px 20px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{ fontSize: 20 }}>{'\u2728'}</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#7aaff8' }}>Share your first trade idea and get verified</div>
            <div style={{ fontSize: 11, color: '#4a5a7a', marginTop: 2 }}>Verified members get a blue badge next to their name</div>
          </div>
        </div>
      ) : null}

      {/* Most liked today */}
      {posts.length > 0 && (() => {
        const topPost = [...posts].sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0))[0];
        if (!topPost || (topPost.upvotes || 0) < 1) return null;
        return (
          <div style={{
            background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.3)',
            borderRadius: 16, padding: 20, marginBottom: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 14 }}>{'\u{1F31F}'}</span>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#fbbf24' }}>Most liked today</span>
            </div>
            <p style={{ fontSize: 14, color: '#F5F5FA', margin: 0, lineHeight: 1.5 }}>{topPost.content}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, fontSize: 12, color: '#475569' }}>
              <span style={{ fontWeight: 600, color: '#94A3B8' }}>{topPost.display_name}</span>
              <span>{'\u25B2'} {topPost.upvotes || 0}</span>
            </div>
          </div>
        );
      })()}

      {/* Top-level tabs: Feed vs Leaderboard */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{background: '#0a0f1e'}}>
        {[{id:'feed',label:'💬 Community Feed'},{id:'leaderboard',label:'🏆 Leaderboard'}].map(t => (
          <button key={t.id} onClick={() => setCommTab(t.id)}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={commTab===t.id ? {background: '#2563EB', color: '#fff'} : {color: '#94A3B8'}}>
            {t.label}
          </button>
        ))}
      </div>

      {commTab === 'leaderboard' && <LeaderboardPanel />}

      {commTab === 'feed' && (
      <div className="flex gap-6">
      {/* Main feed */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        {/* Channel tabs */}
        <div className="flex gap-1 p-1 rounded-2xl overflow-x-auto" style={{background: '#0a0f1e'}}>
          {CHANNELS.map(c => (
            <button key={c.id} onClick={() => setChannel(c.id)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all"
              style={channel === c.id
                ? {background: '#2563EB', color: '#fff'}
                : {color: '#94A3B8'}}
              onMouseEnter={e => { if (channel !== c.id) e.currentTarget.style.color='#F5F5FA'; }}
              onMouseLeave={e => { if (channel !== c.id) e.currentTarget.style.color='#94A3B8'; }}>
              <span>{c.icon}</span> {c.label}
            </button>
          ))}
        </div>

        {/* Trending (mobile only) */}
        <div className="lg:hidden">
          <TrendingStrip posts={trending} />
        </div>

        {/* Post composer */}
        <div className="rounded-2xl p-5" style={{background: '#0f1729', border: '1px solid #1e2a4a'}}>
          {!user && (
            <div className="mb-3">
              <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                placeholder="Your display name (required)" maxLength={30}
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
                style={{background: '#0a0f1e', border: '1px solid #1e2a4a', color: '#F5F5FA'}}
                onFocus={e => e.target.style.borderColor='#2563EB'}
                onBlur={e => e.target.style.borderColor='#1e2a4a'} />
            </div>
          )}
          {user && !displayName && (
            <div className="mb-3">
              <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                placeholder={`Display name (default: ${user.email?.split('@')[0]})`} maxLength={30}
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
                style={{background: '#0a0f1e', border: '1px solid #1e2a4a', color: '#F5F5FA'}}
                onFocus={e => e.target.style.borderColor='#2563EB'}
                onBlur={e => e.target.style.borderColor='#1e2a4a'} />
            </div>
          )}
          <textarea value={content} onChange={e => setContent(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && e.metaKey && submitPost()}
            placeholder="What's on your mind? Share a trade idea, market take, or betting angle…"
            rows={3} maxLength={1000}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none mb-3 transition-colors"
            style={{background: '#0a0f1e', border: '1px solid #1e2a4a', color: '#F5F5FA'}}
            onFocus={e => e.target.style.borderColor='#2563EB'}
            onBlur={e => e.target.style.borderColor='#1e2a4a'} />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs" style={{color: '#64748b'}}>
              {user ? (
                <span className="flex items-center gap-1">
                  Posting as <span className="font-semibold" style={{color: '#94A3B8'}}>{activeName}</span>
                  <VerifiedBadge />
                </span>
              ) : (
                <span>Posting anonymously</span>
              )}
              <span>·</span>
              <span>{content.length}/1000</span>
            </div>
            <button onClick={submitPost} disabled={posting || !content.trim()}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-40"
              style={{background: '#2563EB', color: '#fff'}}
              onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background='#1d4ed8'; }}
              onMouseLeave={e => e.currentTarget.style.background='#2563EB'}>
              {posting ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>

        {/* Sort + verified toggle */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1 p-1 rounded-xl" style={{background: '#0a0f1e'}}>
            {['new','top'].map(s => (
              <button key={s} onClick={() => setSort(s)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors"
                style={sort === s ? {background: '#2563EB', color: '#fff'} : {color: '#94A3B8'}}>
                {s === 'new' ? '🕐 New' : '🔥 Top'}
              </button>
            ))}
          </div>
          <button onClick={() => setShowVerified(v => !v)}
            className="text-xs font-semibold transition-colors"
            style={{color: '#2563EB'}}
            onMouseEnter={e => e.currentTarget.style.color='#60a5fa'}
            onMouseLeave={e => e.currentTarget.style.color='#2563EB'}>
            ✓ Verified members
          </button>
        </div>

        {showVerified && <VerifiedUsersPanel onClose={() => setShowVerified(false)} />}

        {/* Posts skeleton */}
        {loading && posts.length === 0 && (
          <div className="flex flex-col gap-3">
            {[1,2,3].map(i => (
              <div key={i} className="rounded-2xl p-5 animate-pulse" style={{background: '#0f1729', border: '1px solid #1e2a4a'}}>
                <div className="flex gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full" style={{background: '#1e2a4a'}} />
                  <div className="flex-1">
                    <div className="h-3 rounded w-1/4 mb-1.5" style={{background: '#1e2a4a'}} />
                    <div className="h-2 rounded w-1/6" style={{background: '#1e2a4a'}} />
                  </div>
                </div>
                <div className="h-3 rounded w-3/4 mb-1.5" style={{background: '#1e2a4a'}} />
                <div className="h-3 rounded w-1/2" style={{background: '#1e2a4a'}} />
              </div>
            ))}
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div className="rounded-2xl px-6 py-12 text-center" style={{background: '#0f1729', border: '1px solid #1e2a4a'}}>
            <div className="text-3xl mb-2">💬</div>
            <div className="text-sm font-medium mb-1" style={{color: '#94A3B8'}}>No posts yet in {CHANNELS.find(c => c.id === channel)?.label}</div>
            <div className="text-xs" style={{color: '#64748b'}}>Be the first to start the conversation</div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {posts.map(post => (
            <PostCard key={post.id} post={post} onUpvote={handleUpvote} onReport={() => {}} upvoted={upvoted.has(post.id)} />
          ))}
        </div>

        {hasMore && posts.length > 0 && (
          <button onClick={() => loadPosts(false)} disabled={loading}
            className="w-full rounded-2xl py-3 text-sm font-medium transition-colors disabled:opacity-50"
            style={{border: '1px solid #1e2a4a', color: '#94A3B8', background: 'transparent'}}
            onMouseEnter={e => { e.currentTarget.style.borderColor='#2563EB'; e.currentTarget.style.color='#F5F5FA'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor='#1e2a4a'; e.currentTarget.style.color='#94A3B8'; }}>
            {loading ? 'Loading…' : 'Load more posts'}
          </button>
        )}
      </div>

      {/* Sidebar — desktop only */}
      <aside className="hidden lg:flex flex-col gap-4 w-72 shrink-0">
        <TrendingStrip posts={trending} />

        <div className="rounded-2xl p-4" style={{background: '#0f1729', border: '1px solid #1e2a4a'}}>
          <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{color: '#94A3B8'}}>Channels</div>
          {CHANNELS.map(c => (
            <button key={c.id} onClick={() => setChannel(c.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm mb-0.5 transition-all text-left"
              style={channel === c.id
                ? {background: '#2563EB', color: '#fff', fontWeight: 600}
                : {color: '#94A3B8'}}
              onMouseEnter={e => { if (channel !== c.id) { e.currentTarget.style.background='#1e2a4a'; e.currentTarget.style.color='#F5F5FA'; } }}
              onMouseLeave={e => { if (channel !== c.id) { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#94A3B8'; } }}>
              <span>{c.icon}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>

        <div className="rounded-2xl p-4" style={{background: '#0f1729', border: '1px solid #1e2a4a'}}>
          <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{color: '#94A3B8'}}>Community rules</div>
          <div className="flex flex-col gap-2 text-xs" style={{color: '#64748b'}}>
            {['No spam or self-promotion', 'Be respectful to all members', 'No financial advice — only ideas', 'Flag posts that violate rules', 'Verified badge = registered account'].map((rule, i) => (
              <div key={i} className="flex gap-2">
                <span className="font-semibold" style={{color: '#334155'}}>{i+1}.</span>
                <span>{rule}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
      )}
    </div>
  );
}
