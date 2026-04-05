import { useState, useEffect } from 'react';
import api from '../lib/api';
import ArticlePanel from './ArticlePanel';

const NEWS_TYPES = [
  { key: 'sports', label: 'Sports', emoji: '🏆' },
  { key: 'trading', label: 'Trading', emoji: '📈' },
  { key: 'world', label: 'World', emoji: '🌍' },
];

const SUB_CATS = {
  sports: [
    { key: 'NBA', label: 'NBA' }, { key: 'NFL', label: 'NFL' }, { key: 'MLB', label: 'MLB' },
    { key: 'NHL', label: 'NHL' }, { key: 'Soccer', label: 'Soccer' }, { key: 'UFC', label: 'UFC' },
  ],
  trading: [
    { key: 'markets', label: 'Markets' }, { key: 'crypto', label: 'Crypto' },
    { key: 'macro', label: 'Macro' }, { key: 'earnings', label: 'Earnings' },
  ],
  world: [
    { key: 'top', label: 'Top' }, { key: 'us', label: 'US' }, { key: 'world', label: 'World' },
    { key: 'politics', label: 'Politics' }, { key: 'tech', label: 'Tech' }, { key: 'science', label: 'Science' },
    { key: 'business', label: 'Business' }, { key: 'entertainment', label: 'Entertainment' },
  ],
};

const CAT_GRADIENTS = {
  NBA: 'linear-gradient(135deg, #1a3a5a, #0d2a4a)', NFL: 'linear-gradient(135deg, #0a2a0a, #1a3a1a)',
  MLB: 'linear-gradient(135deg, #3a0a0a, #2a0a0a)', NHL: 'linear-gradient(135deg, #0a1a3a, #0a2a4a)',
  Soccer: 'linear-gradient(135deg, #0a2a1a, #1a3a2a)', UFC: 'linear-gradient(135deg, #2a0a0a, #3a1a0a)',
  markets: 'linear-gradient(135deg, #0a2a1a, #0a3a2a)', crypto: 'linear-gradient(135deg, #2a1a0a, #3a2a0a)',
  top: 'linear-gradient(135deg, #1a1a2a, #2a2a3a)', us: 'linear-gradient(135deg, #1a1a2a, #2a2a3a)',
  world: 'linear-gradient(135deg, #1a1a2a, #2a2a3a)', politics: 'linear-gradient(135deg, #2a0a2a, #3a0a3a)',
  tech: 'linear-gradient(135deg, #0a0a3a, #0a1a4a)', science: 'linear-gradient(135deg, #0a2a2a, #0a3a3a)',
  business: 'linear-gradient(135deg, #1a2a1a, #2a3a2a)', entertainment: 'linear-gradient(135deg, #2a0a1a, #3a0a2a)',
};

// Sanitize image URLs to prevent CSS injection via backgroundImage
function safeImgUrl(url) {
  if (!url || typeof url !== 'string') return null;
  if (!/^https:\/\//.test(url)) return null;
  // Strip anything that could inject CSS: parentheses, semicolons, quotes, backslashes
  if (/[();"'\\{}]/.test(url)) return null;
  return `url(${url})`;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return mins + 'm ago';
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return hours + 'h ago';
  return Math.floor(hours / 24) + 'd ago';
}

export default function NewsTab({ initialType }) {
  const [newsType, setNewsType] = useState(initialType || 'sports');
  const [subCat, setSubCat] = useState(() => SUB_CATS[initialType || 'sports']?.[0]?.key || 'NBA');
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [econEvents, setEconEvents] = useState([]);
  const [newsError, setNewsError] = useState(null);

  useEffect(() => {
    setSubCat(SUB_CATS[newsType]?.[0]?.key || '');
  }, [newsType]);

  useEffect(() => {
    if (initialType && initialType !== newsType) {
      setNewsType(initialType);
    }
  }, [initialType]);

  useEffect(() => {
    if (!subCat) return;
    setLoading(true);
    let endpoint = '';
    if (newsType === 'sports') endpoint = `/api/news/sports?sport=${subCat}`;
    else if (newsType === 'trading') endpoint = `/api/news/trading?category=${subCat}`;
    else endpoint = `/api/news/world?category=${subCat}`;

    api.get(endpoint).then(r => {
      setArticles(r.data.items || []);
      setNewsError(null);
    }).catch(() => { setArticles([]); setNewsError('News unavailable right now — try again later'); }).finally(() => setLoading(false));
  }, [newsType, subCat]);

  const [allEconEvents, setAllEconEvents] = useState([]);
  const [econFilter, setEconFilter] = useState('all'); // all | high | usd | eur | gbp
  useEffect(() => {
    if (newsType === 'trading') {
      api.get('/api/news/economic').then(r => {
        setAllEconEvents(r.data.events || []);
        setEconEvents((r.data.events || []).filter(e => e.impact === 'High'));
      }).catch(() => {});
    }
  }, [newsType]);

  const gc = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16 };

  return (
    <div className="flex flex-col gap-8">
      {/* Header & Main Categories */}
      <div className="flex items-center justify-between flex-wrap gap-6">
        <div>
          <h2 className="text-2xl font-black text-[#F0F0FF] tracking-tight uppercase">Terminal Intelligence</h2>
          <p className="text-[10px] font-black text-[#6B6B8A] uppercase tracking-[0.2em] mt-1">Real-time global news & data streams</p>
        </div>
        <div className="flex gap-1.5 p-1.5 rounded-2xl bg-black/40 border border-white/5 backdrop-blur-md">
          {NEWS_TYPES.map(t => (
            <button key={t.key} onClick={() => setNewsType(t.key)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${newsType === t.key ? 'bg-[#6C63FF] text-white shadow-[0_0_20px_rgba(108,99,255,0.4)]' : 'text-[#6a7a9a] hover:text-[#F0F0FF]'}`}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-category pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {(SUB_CATS[newsType] || []).map(c => (
          <button key={c.key} onClick={() => setSubCat(c.key)}
            className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border whitespace-nowrap ${subCat === c.key ? 'bg-[#6C63FF]/10 border-[#6C63FF]/40 text-[#867fff]' : 'bg-white/5 border-white/5 text-[#4E4E63] hover:border-white/10'}`}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Economic Calendar */}
      {newsType === 'trading' && allEconEvents.length > 0 && (() => {
        const impactDot = { High: '🔴', Medium: '🟡', Low: '🟢', Holiday: '⚪' };
        const currencyFlags = { USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵', CAD: '🇨🇦', AUD: '🇦🇺', NZD: '🇳🇿', CHF: '🇨🇭', CNY: '🇨🇳' };

        const filtered = allEconEvents.filter(e => {
          if (econFilter === 'high') return e.impact === 'High';
          if (econFilter === 'usd') return e.currency === 'USD';
          if (econFilter === 'eur') return e.currency === 'EUR';
          if (econFilter === 'gbp') return e.currency === 'GBP';
          return true;
        });

        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        const grouped = {};
        filtered.forEach(e => {
          const label = e.date === today ? 'TODAY' : e.date === tomorrow ? 'TOMORROW' : new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();
          if (!grouped[label]) grouped[label] = [];
          grouped[label].push(e);
        });

        return (
          <div className="rounded-2xl overflow-hidden border border-white/5 bg-black/20 backdrop-blur-xl">
            <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/5">
              <div className="text-[10px] font-black text-[#F0F0FF] uppercase tracking-[0.2em]">Economic Risk Pulse</div>
              <div className="flex gap-1">
                {[{ k: 'all', l: 'ALL' }, { k: 'high', l: '🔴 HIGH' }, { k: 'usd', l: '🇺🇸 USD' }, { k: 'eur', l: '🇪🇺 EUR' }, { k: 'gbp', l: '🇬🇧 GBP' }].map(f => (
                  <button key={f.k} onClick={() => setEconFilter(f.k)}
                    className={`text-[9px] font-black px-3 py-1.5 rounded-lg transition-all ${econFilter === f.k ? 'bg-[#6C63FF]/20 text-[#867fff] border border-[#6C63FF]/30' : 'text-[#4E4E63] hover:text-[#6B6B8A]'}`}>
                    {f.l}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-[80px_60px_1fr_80px_80px_80px_80px] p-4 bg-black/40 text-[9px] font-black text-[#2a3a5a] uppercase tracking-widest border-b border-white/5">
              <div>TIME</div><div>CCY</div><div>EVENT</div><div className="text-center">IMPACT</div><div className="text-right">FORECAST</div><div className="text-right">PREV</div><div className="text-right">ACTUAL</div>
            </div>
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              {Object.entries(grouped).map(([dateLabel, events]) => (
                <div key={dateLabel}>
                  <div className="px-5 py-2.5 bg-[#6C63FF]/5 text-[9px] font-black text-[#6C63FF] tracking-widest border-b border-white/5">{dateLabel}</div>
                  {events.map((e, i) => {
                    const isHigh = e.impact === 'High';
                    return (
                      <div key={i} className={`grid grid-cols-[80px_60px_1fr_80px_80px_80px_80px] p-4 border-b border-white/5 hover:bg-white/5 transition-all ${isHigh ? 'bg-[#FF4560]/5' : ''}`}>
                        <div className="text-[11px] text-[#6B6B8A] font-bold">{e.time || 'TBD'}</div>
                        <div className="text-[11px] font-bold text-[#F0F0FF]">{currencyFlags[e.currency]} {e.currency}</div>
                        <div className={`text-[12px] font-black tracking-tight ${isHigh ? 'text-[#F0F0FF]' : 'text-[#8899bb]'}`}>{e.title}</div>
                        <div className="text-center text-xs">{impactDot[e.impact] || '⚪'}</div>
                        <div className="text-[11px] text-[#6B6B8A] text-right font-bold">{e.forecast !== '—' ? e.forecast : ''}</div>
                        <div className="text-[11px] text-[#2a3a5a] text-right">{e.previous !== '—' ? e.previous : ''}</div>
                        <div className={`text-[11px] font-black text-right ${e.actual && !isNaN(parseFloat(e.actual)) ? (e.forecast !== '—' && !isNaN(parseFloat(e.forecast)) && parseFloat(e.actual) > parseFloat(e.forecast) ? 'text-[#00E5B4]' : !isNaN(parseFloat(e.forecast)) && parseFloat(e.actual) < parseFloat(e.forecast) ? 'text-[#FF4560]' : 'text-[#F0F0FF]') : 'text-[#1a2535]'}`}>
                          {e.actual || '—'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Loading Skeletals */}
      {loading && (
        <div className="flex flex-col gap-6 animate-pulse">
          <div className="h-80 rounded-3xl bg-white/5 border border-white/10" />
          <div className="grid grid-cols-2 gap-6">
            <div className="h-60 rounded-3xl bg-white/5 border border-white/10" />
            <div className="h-60 rounded-3xl bg-white/5 border border-white/10" />
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && articles.length === 0 && (
        <div className="p-20 rounded-3xl bg-black/20 border border-white/5 flex flex-col items-center text-center">
          <div className="text-4xl mb-4">{newsError ? '⚠️' : '📰'}</div>
          <div className="text-lg font-black text-[#F0F0FF] tracking-tight">{newsError || `Market Quiet`}</div>
          <p className="text-sm text-[#4E4E63] mt-2 mb-6">No headlines found for {subCat || newsType}</p>
          {newsError && (
            <button onClick={() => window.location.reload()} className="px-6 py-2.5 rounded-xl bg-[#6C63FF] text-white text-[10px] font-black uppercase tracking-widest shadow-lg">Retry Sync</button>
          )}
        </div>
      )}

      {/* Article Feed */}
      {!loading && articles.length > 0 && (
        <div className="flex flex-col gap-8">
          {/* Main Hero Card */}
          <div onClick={() => setSelectedArticle(articles[0])}
            className="group relative h-[450px] rounded-[32px] overflow-hidden cursor-pointer border border-white/10 hover:border-[#6C63FF]/40 transition-all shadow-2xl">
            <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
              style={{ backgroundImage: safeImgUrl(articles[0].image) || (CAT_GRADIENTS[subCat] || CAT_GRADIENTS.top) }} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] via-[#0A0A0F]/60 to-transparent" />
            
            <div className="absolute top-8 left-8 flex items-center gap-3">
              <span className="px-4 py-1.5 rounded-full bg-[#6C63FF] text-white text-[10px] font-black uppercase tracking-widest shadow-lg">{articles[0].source}</span>
              <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">{timeAgo(articles[0].pubDate)}</span>
            </div>

            <div className="absolute bottom-10 left-10 right-10">
              <h1 className="text-4xl font-black text-white leading-tight tracking-tight mb-4 group-hover:text-[#6C63FF] transition-colors">{articles[0].title}</h1>
              <p className="text-lg text-white/60 leading-relaxed line-clamp-2 max-w-3xl">{articles[0].description}</p>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.slice(1).map((a, i) => (
              <div key={i} onClick={() => setSelectedArticle(a)}
                className="group flex flex-col rounded-3xl bg-black/20 border border-white/5 overflow-hidden hover:border-[#6C63FF]/30 hover:bg-black/40 transition-all cursor-pointer">
                <div className="h-48 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                  style={{ backgroundImage: safeImgUrl(a.image) || (CAT_GRADIENTS[subCat] || CAT_GRADIENTS.top) }} />
                <div className="p-6 flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-black text-[#6C63FF] uppercase tracking-widest">{a.source}</span>
                    <span className="text-[9px] font-black text-[#2a3a5a] uppercase tracking-widest">• {timeAgo(a.pubDate)}</span>
                  </div>
                  <h3 className="text-lg font-black text-[#F0F0FF] leading-tight tracking-tight group-hover:text-[#6C63FF] transition-colors line-clamp-2">{a.title}</h3>
                  <p className="text-sm text-[#6B6B8A] leading-relaxed line-clamp-2">{a.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedArticle && <ArticlePanel article={selectedArticle} onClose={() => setSelectedArticle(null)} />}
    </div>
  );
}
