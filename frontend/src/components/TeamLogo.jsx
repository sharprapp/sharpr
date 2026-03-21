import { useState } from 'react';
import { getTeamLogo, getTeamColor, getTeamInitials } from '../lib/teamLogos';

export default function TeamLogo({ teamName, size = 40, showName = false, nameSize = 12 }) {
  const [err, setErr] = useState(false);
  const url = getTeamLogo(teamName);
  const color = getTeamColor(teamName);
  const initials = getTeamInitials(teamName);

  const logo = (!err && url) ? (
    <img src={url} alt={teamName || ''} style={{ width: size, height: size, objectFit: 'contain', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', padding: 2, flexShrink: 0 }} onError={() => setErr(true)} />
  ) : (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.28, fontWeight: 800, color: 'white', flexShrink: 0 }}>{initials}</div>
  );

  if (!showName) return logo;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      {logo}
      <div style={{ fontSize: nameSize, fontWeight: 700, color: '#f0f4ff', textAlign: 'center', maxWidth: size + 20 }}>{teamName}</div>
    </div>
  );
}
