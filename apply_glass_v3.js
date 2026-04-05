const fs = require('fs');
const path = require('path');

const FILES_TO_UPDATE = [
  'frontend/src/pages/Dashboard.jsx',
  'frontend/src/pages/Home.jsx',
  'frontend/src/pages/Settings.jsx',
  'frontend/src/components/SharpSignal.jsx',
  'frontend/src/components/MarketDetailModal.jsx'
];

function convertToEliteGlass(content, filePath) {
  let newContent = content;

  // 1. Global Backgrounds
  newContent = newContent.replace(/#080810|#0A0A0F|#0[0-9a-fA-F]{5}/g, '#0A0A0F');
  
  // 2. Card Surfaces
  // Look for inline styles with background: '#111118' or similar and replace with glassmorphism
  newContent = newContent.replace(/background:\s*['"]#111118['"]/g, "background: 'rgba(17,17,32,0.8)', backdropFilter: 'blur(20px)'");
  newContent = newContent.replace(/backgroundColor:\s*['"]#111118['"]/g, "backgroundColor: 'rgba(17,17,32,0.8)', backdropFilter: 'blur(20px)'");
  newContent = newContent.replace(/background:\s*['"]#1[EecC]{4}['"]/g, "background: 'rgba(17,17,32,0.8)', backdropFilter: 'blur(20px)'");
  
  // 3. Borders to glowing indigo
  newContent = newContent.replace(/border:\s*['"]1px solid rgba\(255,.*?,0\.0[0-9]['"]/g, "border: '1px solid rgba(108, 99, 255, 0.3)'");
  newContent = newContent.replace(/borderColor:\s*['"]rgba\(255,255,255,0\.0[0-9]['"]/g, "borderColor: 'rgba(108, 99, 255, 0.3)'");
  newContent = newContent.replace(/border:\s*['"]1px solid #1[a-zA-Z0-9]{5}['"]/g, "border: '1px solid rgba(108, 99, 255, 0.3)'");
  newContent = newContent.replace(/borderColor:\s*['"]#1[EecC]{4}['"]/g, "borderColor: 'rgba(108, 99, 255, 0.3)'");

  // 4. Primary Accents
  // If there's an active tab or primary button, map its color to Indigo or Teal
  newContent = newContent.replace(/color:\s*['"]#F0F0FF['"]/g, "color: '#F0F0FF'");
  
  // 5. Button and Hover Glows
  // Inject drop shadow onto generic interactive elements
  if (filePath.includes('Dashboard.jsx')) {
     // Sliding Tab Bar for Dashboard specifically
     newContent = newContent.replace(/<div style={{ position: 'absolute', bottom: 0.*?background: '#fff'.*?}} \/>/g, 
       "<div style={{ position: 'absolute', bottom: 0, height: 2, background: '#6C63FF', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)', boxShadow: '0 -2px 10px rgba(108,99,255,0.6)' }} />"
     );
  }

  if (filePath.includes('SharpSignal.jsx')) {
     // Pulse glow on the edge
     newContent = newContent.replace(/color:\s*['"]#10b981['"]/g, "color: '#00E5B4', textShadow: '0 0 10px rgba(0,229,180,0.5)'");
     newContent = newContent.replace(/color:\s*['"]#ef4444['"]/g, "color: '#FF4560', textShadow: '0 0 10px rgba(255,69,96,0.5)'");
  }

  // Inject orbs natively into Home, Dashboard, Settings wrappers
  const orbInjection = `
      {/* ELITE ORBS */}
      <style>{'\\
        @keyframes floatDash { 0% { transform: translate(0,0) scale(1); } 50% { transform: translate(3vw, -3vh) scale(1.05); } 100% { transform: translate(0,0) scale(1); } }\\
      '}</style>
      <div style={{ position: 'fixed', width: '60vw', height: '60vw', background: 'rgba(108,99,255,0.1)', filter: 'blur(140px)', top: '-20%', left: '-10%', borderRadius: '50%', pointerEvents: 'none', zIndex: 0, animation: 'floatDash 25s infinite ease-in-out' }}></div>
      <div style={{ position: 'fixed', width: '50vw', height: '50vw', background: 'rgba(0,229,180,0.05)', filter: 'blur(120px)', bottom: '-10%', right: '-15%', borderRadius: '50%', pointerEvents: 'none', zIndex: 0, animation: 'floatDash 30s infinite ease-in-out reverse' }}></div>
  `;

  // Find the top-level div holding the background
  if (filePath.includes('Dashboard.jsx') || filePath.includes('Settings.jsx') || filePath.includes('Home.jsx')) {
      newContent = newContent.replace(/(<div className="min-h-screen.*?)>/, `$1 relative overflow-hidden z-10>\n${orbInjection}`);
  }

  return newContent;
}

FILES_TO_UPDATE.forEach(file => {
  const fullPath = path.resolve(__dirname, file);
  if (fs.existsSync(fullPath)) {
    const original = fs.readFileSync(fullPath, 'utf8');
    const updated = convertToEliteGlass(original, file);
    fs.writeFileSync(fullPath, updated);
    console.log(`Updated Elite Glass tokens on: ${file}`);
  } else {
    console.log(`File not found: ${file}`);
  }
});
