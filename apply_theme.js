const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'frontend/src/pages/Dashboard.jsx',
  'frontend/src/pages/Home.jsx',
  'frontend/src/pages/Login.jsx',
  'frontend/src/pages/Register.jsx',
  'frontend/src/pages/Settings.jsx',
  'frontend/src/components/Navbar.jsx',
  'frontend/src/components/SharpSignal.jsx',
  'frontend/src/components/SportsOdds.jsx',
  'frontend/src/components/TierGate.jsx',
  'frontend/src/components/UpgradeModal.jsx',
  'frontend/src/components/MarketDetailModal.jsx'
];

filesToUpdate.forEach(relativePath => {
  const file = path.resolve(__dirname, relativePath);
  if (!fs.existsSync(file)) {
    console.warn('File not found: ' + file);
    return;
  }
  
  let content = fs.readFileSync(file, 'utf8');

  // --- Backgrounds & Surfaces
  content = content.replace(/#03030a/g, '#0A0A0F');
  content = content.replace(/#0f1729/g, '#111118');
  content = content.replace(/#0a0f1e/g, '#111118');
  content = content.replace(/rgba\(3,3,10,0\.92\)/g, 'rgba(10,10,15,0.92)');
  content = content.replace(/rgba\(255,255,255,0\.03\)/g, '#111118');
  content = content.replace(/rgba\(255,255,255,0\.04\)/g, '#1A1A24');

  // --- Borders
  content = content.replace(/#1e2a4a/g, '#1E1E2E');
  content = content.replace(/rgba\(255,255,255,0\.06\)/g, '#1E1E2E');
  content = content.replace(/rgba\(255,255,255,0\.08\)/g, 'rgba(108,99,255,0.2)');

  // --- Primary Accent (Electric Indigo)
  content = content.replace(/#4f8ef7/g, '#6C63FF');
  content = content.replace(/#2563EB/g, '#6C63FF');
  content = content.replace(/#3b7ae0/g, '#5850e6');
  content = content.replace(/#7aaff8/g, '#867fff');
  content = content.replace(/rgba\(79,142,247/g, 'rgba(108,99,255');

  // --- Secondary Accent (Neon Teal)
  content = content.replace(/#22c55e/g, '#00E5B4');
  content = content.replace(/#4ade80/g, '#00E5B4');

  // --- Danger/Loss
  content = content.replace(/#ef4444/g, '#FF4560');
  content = content.replace(/#f87171/g, '#FF4560');

  // --- Text Primary
  content = content.replace(/#F5F5FA/g, '#F0F0FF');

  // --- Text Muted
  content = content.replace(/#94A3B8/g, '#6B6B8A');
  content = content.replace(/#64748b/g, '#6B6B8A');
  content = content.replace(/#475569/g, '#6B6B8A');
  content = content.replace(/#4a5a7a/g, '#4E4E63'); 

  // --- Typography upgrades (bold & tight)
  content = content.replace(/fontWeight: 600/g, "fontWeight: 800, letterSpacing: '-0.02em'");
  content = content.replace(/fontWeight: 700/g, "fontWeight: 800, letterSpacing: '-0.03em'");

  // --- Buttons: not pill shaped
  // We'll replace rounded-full with rounded-lg but only in specific button/pill classNames
  // A simplistic approach: if line has rounded-full AND px-, make it rounded-lg
  const lines = content.split('\n');
  const updatedLines = lines.map(line => {
    if (line.includes('rounded-full') && (line.includes('px-') || line.includes('py-'))) {
      return line.replace(/rounded-full/g, 'rounded-lg');
    }
    return line;
  });
  content = updatedLines.join('\n');

  fs.writeFileSync(file, content, 'utf8');
  console.log('Successfully refactored tokens for ' + relativePath);
});
