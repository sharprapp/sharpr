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
    }).catch(() => setArticles([])).finally(() => setLoading(false));
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#f0f4ff', margin: 0 }}>News</h2>
        <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 12, background: '#0a0f1e' }}>
          {NEWS_TYPES.map(t => (
            <button key={t.key} onClick={() => setNewsType(t.key)}
              style={{
                padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                background: newsType === t.key ? '#2563EB' : 'transparent',
                color: newsType === t.key ? '#fff' : '#6a7a9a', transition: 'all 0.15s',
              }}>
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sub-category pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {(SUB_CATS[newsType] || []).map(c => (
          <button key={c.key} onClick={() => setSubCat(c.key)}
            style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              background: subCat === c.key ? 'rgba(79,142,247,0.15)' : 'rgba(255,255,255,0.04)',
              border: subCat === c.key ? '1px solid rgba(79,142,247,0.3)' : '1px solid rgba(255,255,255,0.06)',
              color: subCat === c.key ? '#7aaff8' : '#6a7a9a',
            }}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Economic Calendar — Forex Factory style */}
      {newsType === 'trading' && allEconEvents.length > 0 && (() => {
        const impactColor = { High: '#ef4444', Medium: '#f59e0b', Low: '#22c55e', Holiday: '#64748b' };
        const impactBg = { High: 'rgba(239,68,68,0.1)', Medium: 'rgba(245,158,11,0.1)', Low: 'rgba(34,197,94,0.1)', Holiday: 'rgba(100,116,139,0.1)' };
        const impactDot = { High: '🔴', Medium: '🟡', Low: '🟢', Holiday: '⚪' };
        const currencyFlags = { USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵', CAD: '🇨🇦', AUD: '🇦🇺', NZD: '🇳🇿', CHF: '🇨🇭', CNY: '🇨🇳' };

        const filtered = allEconEvents.filter(e => {
          if (econFilter === 'high') return e.impact === 'High';
          if (econFilter === 'usd') return e.currency === 'USD';
          if (econFilter === 'eur') return e.currency === 'EUR';
          if (econFilter === 'gbp') return e.currency === 'GBP';
          return true;
        });

        // Group by date
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        const grouped = {};
        filtered.forEach(e => {
          const label = e.date === today ? 'Today' : e.date === tomorrow ? 'Tomorrow' : new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
          if (!grouped[label]) grouped[label] = [];
          grouped[label].push(e);
        });

        return (
          <div style={{ ...gc, padding: 0, overflow: 'hidden' }}>
            {/* Filter bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f0f4ff' }}>Economic Calendar</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {[{ k: 'all', l: 'All' }, { k: 'high', l: '🔴 High' }, { k: 'usd', l: '🇺🇸 USD' }, { k: 'eur', l: '🇪🇺 EUR' }, { k: 'gbp', l: '🇬🇧 GBP' }].map(f => (
                  <button key={f.k} onClick={() => setEconFilter(f.k)}
                    style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 6, cursor: 'pointer', border: 'none', background: econFilter === f.k ? 'rgba(79,142,247,0.15)' : 'transparent', color: econFilter === f.k ? '#7aaff8' : '#4a5a7a' }}>
                    {f.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '56px 44px 1fr 36px 60px 60px 60px', padding: '6px 16px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: '#1a2535', textTransform: 'uppercase' }}>
              <div>Time</div><div>Ccy</div><div>Event</div><div>Impact</div><div>Forecast</div><div>Previous</div><div>Actual</div>
            </div>

            {/* Events grouped by date */}
            {Object.entries(grouped).map(([dateLabel, events]) => (
              <div key={dateLabel}>
                <div style={{ padding: '8px 16px', background: 'rgba(79,142,247,0.04)', fontSize: 11, fontWeight: 700, color: '#4f8ef7', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{dateLabel}</div>
                {events.map((e, i) => {
                  const isHigh = e.impact === 'High';
                  return (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '56px 44px 1fr 36px 60px 60px 60px', padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.03)', background: isHigh ? 'rgba(239,68,68,0.03)' : 'transparent', borderLeft: isHigh ? '2px solid #ef4444' : '2px solid transparent' }}>
                      <div style={{ fontSize: 11, color: '#6a7a9a' }}>{e.time || 'TBD'}</div>
                      <div style={{ fontSize: 11 }}>{currencyFlags[e.currency] || ''} <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8' }}>{e.currency}</span></div>
                      <div style={{ fontSize: 12, color: '#F5F5FA', fontWeight: isHigh ? 600 : 400 }}>{e.title}</div>
                      <div style={{ textAlign: 'center' }}><span style={{ fontSize: 10 }}>{impactDot[e.impact] || '⚪'}</span></div>
                      <div style={{ fontSize: 11, color: '#4a5a7a', textAlign: 'right' }}>{e.forecast !== '—' ? e.forecast : ''}</div>
                      <div style={{ fontSize: 11, color: '#4a5a7a', textAlign: 'right' }}>{e.previous !== '—' ? e.previous : ''}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, textAlign: 'right', color: e.actual ? (e.forecast !== '—' && parseFloat(e.actual) > parseFloat(e.forecast) ? '#22c55e' : parseFloat(e.actual) < parseFloat(e.forecast) ? '#ef4444' : '#F5F5FA') : '#1a2535' }}>
                        {e.actual || '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}

            {filtered.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: '#2a3a5a' }}>No events match this filter</div>
            )}
          </div>
        );
      })()}

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ ...gc, height: 300, animation: 'pulse 1.5s infinite' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[1, 2].map(i => <div key={i} style={{ ...gc, height: 200, animation: 'pulse 1.5s infinite' }} />)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            {[1, 2, 3].map(i => <div key={i} style={{ ...gc, height: 160, animation: 'pulse 1.5s infinite' }} />)}
          </div>
        </div>
      )}

      {/* Articles */}
      {!loading && articles.length === 0 && (
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📰</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#6a7a9a' }}>No {newsType === 'sports' ? subCat : newsType} headlines right now</div>
          <div style={{ fontSize: 12, color: '#2a3a5a', marginTop: 4 }}>Check back soon for the latest updates</div>
        </div>
      )}

      {!loading && articles.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Hero card */}
          <div onClick={() => setSelectedArticle(articles[0])} style={{
            ...gc, height: 340, position: 'relative', overflow: 'hidden', cursor: 'pointer',
            backgroundImage: articles[0].image ? `url(${articles[0].image})` : (CAT_GRADIENTS[subCat] || CAT_GRADIENTS.top),
            backgroundSize: 'cover', backgroundPosition: 'center',
          }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 20%, rgba(3,3,10,0.95) 100%)' }} />
            <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', gap: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: 'rgba(79,142,247,0.2)', color: '#7aaff8' }}>{articles[0].source}</span>
            </div>
            <div style={{ position: 'absolute', top: 16, right: 16, fontSize: 10, color: '#6a7a9a' }}>{timeAgo(articles[0].pubDate)}</div>
            <div style={{ position: 'absolute', bottom: 20, left: 20, right: 20 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#f0f4ff', lineHeight: 1.3, marginBottom: 8 }}>{articles[0].title}</div>
              <div style={{ fontSize: 13, color: '#6a7a9a', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{articles[0].description}</div>
            </div>
          </div>

          {/* Secondary row */}
          {articles.length > 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {articles.slice(1, 3).map((a, i) => (
                <div key={i} onClick={() => setSelectedArticle(a)} style={{ ...gc, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                  <div style={{ height: 180, backgroundImage: a.image ? `url(${a.image})` : (CAT_GRADIENTS[subCat] || CAT_GRADIENTS.top), backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  <div style={{ padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 12, background: 'rgba(79,142,247,0.1)', color: '#7aaff8' }}>{a.source}</span>
                      <span style={{ fontSize: 10, color: '#2a3a5a' }}>{timeAgo(a.pubDate)}</span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#f0f4ff', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 6 }}>{a.title}</div>
                    <div style={{ fontSize: 12, color: '#4a5a7a', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.description}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Grid */}
          {articles.length > 3 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              {articles.slice(3).map((a, i) => (
                <div key={i} onClick={() => setSelectedArticle(a)} style={{ ...gc, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                  <div style={{ height: 140, backgroundImage: a.image ? `url(${a.image})` : (CAT_GRADIENTS[subCat] || CAT_GRADIENTS.top), backgroundSize: 'cover', backgroundPosition: 'center' }} />
                  <div style={{ padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 12, background: 'rgba(79,142,247,0.1)', color: '#7aaff8' }}>{a.source}</span>
                      <span style={{ fontSize: 10, color: '#2a3a5a' }}>{timeAgo(a.pubDate)}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f4ff', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.title}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedArticle && <ArticlePanel article={selectedArticle} onClose={() => setSelectedArticle(null)} />}
    </div>
  );
}
