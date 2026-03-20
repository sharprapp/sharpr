import { useNavigate } from 'react-router-dom';
export default function Logo({ size = 'md' }) {
  const navigate = useNavigate();
  const s  = size === 'sm' ? 30 : size === 'lg' ? 46 : 38;
  const fs = size === 'sm' ? 16 : size === 'lg' ? 24 : 20;
  const sw = size === 'sm' ? 2.5 : size === 'lg' ? 4 : 3.2;
  return (
    <div onClick={() => navigate('/')} style={{ display:'flex', alignItems:'center', gap:'10px', cursor:'pointer' }}>
      <div style={{ width:s, height:s, background:'#4f8ef7', borderRadius:'10px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <svg width={Math.round(s*0.55)} height={Math.round(s*0.55)} viewBox="0 0 22 22" fill="none">
          <path d="M3 18 L11 4 L19 18" stroke="white" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      </div>
      <div style={{ fontSize:fs, fontWeight:900, color:'white', letterSpacing:'-1px', lineHeight:1 }}>
        sharp<span style={{ color:'#4f8ef7' }}>r</span>
      </div>
    </div>
  );
}
