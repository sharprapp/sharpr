import { Link } from 'react-router-dom';
export default function Logo({ size = 'md' }) {
  const sizes = {
    sm: { box: 28, svg: 16, text: 15 },
    md: { box: 40, svg: 24, text: 22 },
    lg: { box: 52, svg: 32, text: 28 }
  }
  const s = sizes[size] || sizes.md
  return (
    <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textDecoration: 'none' }}>
      <div style={{
        width: s.box, height: s.box,
        background: '#050e2a',
        border: '1px solid rgba(108,99,255,0.3)',
        borderRadius: Math.round(s.box * 0.28),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0
      }}>
        <svg width={s.svg} height={s.svg} viewBox="0 0 40 40" fill="none">
          <defs>
            <linearGradient id="logo-caret-grad" x1="8" y1="30" x2="32" y2="10">
              <stop offset="0%" stopColor="#6C63FF" />
              <stop offset="100%" stopColor="#00E5B4" />
            </linearGradient>
          </defs>
          <path d="M8 30 L20 10 L32 30" stroke="url(#logo-caret-grad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <span style={{
        fontSize: s.text,
        fontWeight: 900,
        color: '#F0F0FF',
        letterSpacing: '-0.03em',
        lineHeight: 1
      }}>
        sharp<span style={{ color: '#00E5B4' }}>r</span>
      </span>
    </Link>
  )
}
