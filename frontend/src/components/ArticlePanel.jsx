export default function ArticlePanel({ article, onClose }) {
  if (!article) return null;

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

  function goResearch() {
    window.dispatchEvent(new CustomEvent('ai-prefill', { detail: { topic: article.title, type: 'news' } }));
    onClose();
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }}>
      <div onClick={e => e.stopPropagation()} style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: 480,
        background: '#070712', borderLeft: '1px solid rgba(255,255,255,0.08)',
        overflowY: 'auto', zIndex: 201, display: 'flex', flexDirection: 'column',
      }}>
        {/* Close */}
        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#6a7a9a', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        {/* Image */}
        {article.image && (
          <img src={article.image} alt="" style={{ width: '100%', height: 240, objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
        )}

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
          {/* Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(79,142,247,0.1)', color: '#7aaff8' }}>{article.source || 'News'}</span>
            {article.sport && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.05)', color: '#6a7a9a' }}>{article.sport}</span>}
            <span style={{ fontSize: 10, color: '#2a3a5a', marginLeft: 'auto' }}>{timeAgo(article.pubDate)}</span>
          </div>

          {/* Title */}
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f0f4ff', margin: 0, lineHeight: 1.3 }}>{article.title}</h2>

          {/* Description */}
          <p style={{ fontSize: 15, color: '#8899bb', lineHeight: 1.8, margin: 0 }}>{article.description}</p>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto', paddingTop: 16 }}>
            {article.link && (
              <a href={article.link} target="_blank" rel="noopener noreferrer"
                style={{ display: 'block', padding: '10px 16px', borderRadius: 10, background: '#4f8ef7', color: '#fff', textAlign: 'center', fontSize: 13, fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}>
                Read full article →
              </a>
            )}
            <button onClick={goResearch}
              style={{ padding: '10px 16px', borderRadius: 10, background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.2)', color: '#7aaff8', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}>
              Research this story with AI
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
