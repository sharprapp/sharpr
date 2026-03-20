import { useNavigate } from 'react-router-dom';
export default function Logo({ size = 'md' }) {
  const navigate = useNavigate();
  const s  = size === 'sm' ? 22 : size === 'lg' ? 34 : 26;
  const fs = size === 'sm' ? 13 : size === 'lg' ? 20 : 15;
  return (
    <div onClick={() => navigate('/')} style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer' }}>
      <div style={{ width:s, height:s, background:'#111827', borderRadius:'6px', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
        <svg width={s-6} height={s-6} viewBox="0 0 20 20" fill="none">
          {/* 4 bars — increasing height left to right */}
          <rect x="1"    y="14" width="3" height="5"  rx="0.5" fill="#4f8ef7"/>
          <rect x="5.5"  y="11" width="3" height="8"  rx="0.5" fill="#4f8ef7"/>
          <rect x="10"   y="8"  width="3" height="11" rx="0.5" fill="#4f8ef7"/>
          <rect x="14.5" y="5"  width="3" height="14" rx="0.5" fill="#4f8ef7"/>
          {/* White trend line */}
          <polyline points="2.5,14 7,11 11.5,8 16,5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          {/* Dot at top of trend line */}
          <circle cx="16" cy="5" r="1.5" fill="white"/>
        </svg>
      </div>
      <div style={{ fontSize:fs, fontWeight:700, color:'white' }}>Shar<span style={{ color:'#4f8ef7' }}>pr</span></div>
    </div>
  );
}
