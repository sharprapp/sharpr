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
        background: 'rgba(17,17,32,0.8)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(108, 99, 255, 0.4)',
        boxShadow: '0 0 15px rgba(108, 99, 255, 0.2)',
        borderRadius: Math.round(s.box * 0.2),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0
      }}>
        <svg width={s.svg} height={s.svg} viewBox="0 0 40 40" fill="none">
          <defs>
            <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6C63FF" />
              <stop offset="100%" stopColor="#00E5B4" />
            </linearGradient>
          </defs>
          <path d="M20 4 L36 20 L20 36 L4 20 Z" fill="url(#logo-gradient)" />
          <path d="M20 12 L28 20 L20 28 L12 20 Z" fill="#0A0A0F" />
        </svg>
      </div>
      <span style={{
        fontSize: s.text,
        fontWeight: 900,
        color: '#F0F0FF',
        letterSpacing: '-0.03em',
        lineHeight: 1
      }}>
        sharp<span style={{ color: '#00E5B4', textShadow: '0 0 10px rgba(0,229,180,0.5)' }}>r</span>
      </span>
    </Link>
  )
}
