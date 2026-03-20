import { useNavigate } from 'react-router-dom';
export default function Logo({ size = 'md' }) {
  const navigate = useNavigate();
  const sizes = {
    sm: { box: 24, svg: 14, text: 14 },
    md: { box: 32, svg: 18, text: 18 },
    lg: { box: 48, svg: 28, text: 26 }
  }
  const s = sizes[size] || sizes.md
  return (
    <div onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
      <div style={{
        width: s.box, height: s.box,
        background: '#050e2a',
        border: '1px solid #0d1a3d',
        borderRadius: Math.round(s.box * 0.28),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0
      }}>
        <svg width={s.svg} height={s.svg} viewBox="0 0 40 40" fill="none">
          <path d="M8 30 L20 10 L32 30" stroke="#4f8ef7" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <span style={{
        fontSize: s.text,
        fontWeight: 900,
        color: '#f0f4ff',
        letterSpacing: '-0.5px',
        lineHeight: 1
      }}>
        sharp<span style={{ color: '#4f8ef7' }}>r</span>
      </span>
    </div>
  )
}
