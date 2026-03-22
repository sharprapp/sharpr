/**
 * Analyzes a user's bet/trade history and returns structured insights.
 */

function analyzeBets(bets) {
  const insights = [];
  const settled = bets.filter(b => b.result === 'win' || b.result === 'loss');
  if (settled.length < 5) return insights;

  // Best sport by ROI
  const bySport = {};
  settled.forEach(b => {
    const s = b.sport || 'Other';
    if (!bySport[s]) bySport[s] = { wins: 0, losses: 0, pnl: 0, stake: 0 };
    bySport[s].pnl += b.pnl || 0;
    bySport[s].stake += b.stake || 0;
    if (b.result === 'win') bySport[s].wins++; else bySport[s].losses++;
  });
  const sportROIs = Object.entries(bySport).filter(([, v]) => v.wins + v.losses >= 3).map(([k, v]) => ({ sport: k, roi: v.stake ? (v.pnl / v.stake * 100) : 0, wr: Math.round(v.wins / (v.wins + v.losses) * 100) }));
  const bestSport = sportROIs.sort((a, b) => b.roi - a.roi)[0];
  if (bestSport && bestSport.roi > 0) {
    insights.push({ type: 'strength', message: `You perform best on ${bestSport.sport} (${bestSport.roi.toFixed(1)}% ROI, ${bestSport.wr}% win rate)`, icon: '🏆' });
  }
  const worstSport = sportROIs.sort((a, b) => a.roi - b.roi)[0];
  if (worstSport && worstSport.roi < -10) {
    insights.push({ type: 'warning', message: `${worstSport.sport} is your worst sport (${worstSport.roi.toFixed(1)}% ROI) — consider reducing volume`, icon: '📉' });
  }

  // Best bet type
  const byType = {};
  settled.forEach(b => {
    const t = b.type || 'Other';
    if (!byType[t]) byType[t] = { wins: 0, losses: 0, pnl: 0 };
    byType[t].pnl += b.pnl || 0;
    if (b.result === 'win') byType[t].wins++; else byType[t].losses++;
  });
  const bestType = Object.entries(byType).filter(([, v]) => v.wins + v.losses >= 3).sort((a, b) => b[1].pnl - a[1].pnl)[0];
  if (bestType && bestType[1].pnl > 0) {
    insights.push({ type: 'strength', message: `${bestType[0]} bets are your most profitable ($${bestType[1].pnl.toFixed(0)} profit)`, icon: '🎯' });
  }

  // Chasing losses — 3+ bets within 2 hours after a loss
  const sorted = [...settled].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  let chaseCount = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].result === 'loss') {
      const lossTime = new Date(sorted[i].created_at).getTime();
      const within2h = sorted.slice(i + 1, i + 4).filter(b => new Date(b.created_at).getTime() - lossTime < 7200000);
      if (within2h.length >= 2) chaseCount++;
    }
  }
  if (chaseCount >= 2) {
    insights.push({ type: 'warning', message: `Loss chasing detected — ${chaseCount} times you placed 2+ bets within 2 hours of a loss`, icon: '⚠️' });
  }

  // Overtrading
  const byDay = {};
  bets.forEach(b => { const d = new Date(b.created_at).toDateString(); byDay[d] = (byDay[d] || 0) + 1; });
  const days = Object.values(byDay);
  const avgPerDay = days.reduce((a, b) => a + b, 0) / days.length;
  const heavyDays = days.filter(d => d > avgPerDay * 2).length;
  if (heavyDays >= 3) {
    insights.push({ type: 'warning', message: `Overtrading on ${heavyDays} days — you bet 2x+ your daily average`, icon: '🔥' });
  }

  // Odds range performance
  const oddsRanges = { 'Heavy fav (-200+)': [], 'Slight fav (-110 to -199)': [], 'Pick em (-109 to +109)': [], 'Underdog (+110 to +250)': [], 'Big dog (+251+)': [] };
  settled.forEach(b => {
    const o = parseFloat(b.odds);
    if (!o) return;
    if (o <= -200) oddsRanges['Heavy fav (-200+)'].push(b);
    else if (o < 0) oddsRanges['Slight fav (-110 to -199)'].push(b);
    else if (o <= 109) oddsRanges['Pick em (-109 to +109)'].push(b);
    else if (o <= 250) oddsRanges['Underdog (+110 to +250)'].push(b);
    else oddsRanges['Big dog (+251+)'].push(b);
  });
  let bestRange = null, bestRangeROI = -Infinity;
  for (const [range, arr] of Object.entries(oddsRanges)) {
    if (arr.length < 3) continue;
    const pnl = arr.reduce((s, b) => s + (b.pnl || 0), 0);
    const stake = arr.reduce((s, b) => s + (b.stake || 0), 0);
    const roi = stake ? pnl / stake * 100 : 0;
    if (roi > bestRangeROI) { bestRangeROI = roi; bestRange = range; }
  }
  if (bestRange && bestRangeROI > 0) {
    insights.push({ type: 'tip', message: `Best odds range: ${bestRange} (${bestRangeROI.toFixed(1)}% ROI)`, icon: '💡' });
  }

  return insights;
}

function analyzeTrades(trades) {
  const insights = [];
  const settled = trades.filter(t => t.status === 'win' || t.status === 'loss');
  if (settled.length < 5) return insights;

  // Best ticker
  const byTicker = {};
  settled.forEach(t => {
    const tk = (t.ticker || 'Unknown').toUpperCase();
    if (!byTicker[tk]) byTicker[tk] = { wins: 0, losses: 0, pnl: 0 };
    byTicker[tk].pnl += t.pnl || 0;
    if (t.status === 'win') byTicker[tk].wins++; else byTicker[tk].losses++;
  });
  const bestTicker = Object.entries(byTicker).filter(([, v]) => v.wins + v.losses >= 2).sort((a, b) => b[1].pnl - a[1].pnl)[0];
  if (bestTicker && bestTicker[1].pnl > 0) {
    insights.push({ type: 'strength', message: `${bestTicker[0]} is your best ticker ($${bestTicker[1].pnl.toFixed(0)} profit)`, icon: '📈' });
  }

  // Win size vs loss size
  const winPnls = settled.filter(t => t.status === 'win').map(t => t.pnl || 0);
  const lossPnls = settled.filter(t => t.status === 'loss').map(t => Math.abs(t.pnl || 0));
  const avgWin = winPnls.length ? winPnls.reduce((a, b) => a + b, 0) / winPnls.length : 0;
  const avgLoss = lossPnls.length ? lossPnls.reduce((a, b) => a + b, 0) / lossPnls.length : 0;
  if (avgLoss > avgWin * 1.5 && avgLoss > 0) {
    insights.push({ type: 'warning', message: `Average loss ($${avgLoss.toFixed(0)}) is ${(avgLoss / avgWin).toFixed(1)}x your average win ($${avgWin.toFixed(0)}) — cut losses faster`, icon: '✂️' });
  } else if (avgWin > avgLoss * 1.5 && avgWin > 0) {
    insights.push({ type: 'strength', message: `Great risk management — average win ($${avgWin.toFixed(0)}) is ${(avgWin / avgLoss).toFixed(1)}x your average loss`, icon: '🛡️' });
  }

  return insights;
}

function analyzeAll(bets, trades) {
  return [...analyzeBets(bets), ...analyzeTrades(trades)];
}

module.exports = { analyzeAll, analyzeBets, analyzeTrades };
