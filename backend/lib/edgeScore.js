/**
 * Edge Score (0-100) — combines multiple signals into a single actionable number.
 *
 * Inputs:
 *   game.allBookmakers — array of bookmaker objects with markets/outcomes
 *   game.homeML, game.awayML — best moneyline odds
 *   game.homeSpread, game.awaySpread — spread points
 *   polyProb — Polymarket YES probability (0-1) if matched, or null
 *   prevSpread — previous spread value for line movement detection, or null
 */

function americanToProb(odds) {
  if (!odds) return null;
  return odds > 0 ? 100 / (odds + 100) : Math.abs(odds) / (Math.abs(odds) + 100);
}

function calcEdgeScore(game, polyProb = null, prevSpread = null) {
  const factors = [];
  let totalScore = 0;

  // ── 1. IMPLIED PROBABILITY GAP (40%) ──
  let probGapScore = 0;
  if (polyProb != null && game.homeML) {
    const bookProb = americanToProb(game.homeML);
    if (bookProb) {
      const gap = Math.abs(polyProb - bookProb) * 100;
      probGapScore = Math.min(100, gap * 5); // 20% gap = 100 score
      factors.push({ name: 'Probability Gap', score: Math.round(probGapScore), detail: `${Math.round(gap)}% divergence between Poly & books` });
    }
  } else {
    // No Polymarket match — use bookmaker consensus gap instead
    const mlPrices = [];
    for (const bk of game.allBookmakers || []) {
      const h2h = bk.markets?.find(m => m.key === 'h2h');
      const homeO = h2h?.outcomes?.find(o => o.name === game.homeTeam);
      if (homeO) mlPrices.push(homeO.price);
    }
    if (mlPrices.length >= 2) {
      const max = Math.max(...mlPrices), min = Math.min(...mlPrices);
      const spread = Math.abs(max - min);
      probGapScore = Math.min(100, spread * 2); // 50-point ML diff = 100
      factors.push({ name: 'Book Divergence', score: Math.round(probGapScore), detail: `${spread}pt spread across ${mlPrices.length} books` });
    }
  }
  totalScore += probGapScore * 0.4;

  // ── 2. SHARP MONEY INDICATOR (30%) ──
  // Mock: derive from ML — underdogs with tight lines suggest sharp action
  let sharpScore = 0;
  if (game.homeML && game.awayML) {
    const homeProb = americanToProb(game.homeML);
    const awayProb = americanToProb(game.awayML);
    if (homeProb && awayProb) {
      const juice = (homeProb + awayProb - 1) * 100; // vig
      // Low juice = sharp book, higher edge
      sharpScore = Math.max(0, Math.min(100, (10 - juice) * 15));
      // Underdog value bonus
      const maxML = Math.max(game.homeML, game.awayML);
      if (maxML > 0 && maxML < 300) sharpScore = Math.min(100, sharpScore + 20);
      factors.push({ name: 'Sharp Indicator', score: Math.round(sharpScore), detail: juice < 5 ? 'Low vig — sharp line' : 'Standard vig' });
    }
  }
  totalScore += sharpScore * 0.3;

  // ── 3. LINE MOVEMENT (20%) ──
  let moveScore = 0;
  if (prevSpread != null && game.homeSpread != null) {
    const move = Math.abs(game.homeSpread - prevSpread);
    if (move >= 1) {
      moveScore = Math.min(100, move * 30); // 3pt move = 90
      factors.push({ name: 'Line Movement', score: Math.round(moveScore), detail: `${move.toFixed(1)}pt move detected` });
    }
  }
  if (!factors.find(f => f.name === 'Line Movement')) {
    factors.push({ name: 'Line Movement', score: 0, detail: 'No significant movement' });
  }
  totalScore += moveScore * 0.2;

  // ── 4. ODDS CONSENSUS (10%) ──
  let consensusScore = 0;
  const spreadPoints = [];
  for (const bk of game.allBookmakers || []) {
    const sp = bk.markets?.find(m => m.key === 'spreads');
    const homeO = sp?.outcomes?.find(o => o.name === game.homeTeam);
    if (homeO?.point != null) spreadPoints.push(homeO.point);
  }
  if (spreadPoints.length >= 2) {
    const avg = spreadPoints.reduce((a, b) => a + b, 0) / spreadPoints.length;
    const maxDev = Math.max(...spreadPoints.map(p => Math.abs(p - avg)));
    consensusScore = Math.min(100, maxDev * 40); // 2.5pt deviation = 100
    if (maxDev > 0.5) {
      factors.push({ name: 'Outlier Book', score: Math.round(consensusScore), detail: `${maxDev.toFixed(1)}pt off consensus` });
    } else {
      factors.push({ name: 'Book Consensus', score: Math.round(consensusScore), detail: 'Books in agreement' });
    }
  }
  totalScore += consensusScore * 0.1;

  const score = Math.round(Math.max(0, Math.min(100, totalScore)));
  const label = score >= 81 ? 'SHARP' : score >= 61 ? 'Good Edge' : score >= 31 ? 'Moderate' : 'Low';
  const color = score >= 81 ? '#22c55e' : score >= 61 ? '#f59e0b' : score >= 31 ? '#fbbf24' : '#4a5a7a';

  return { score, label, color, factors };
}

module.exports = { calcEdgeScore };
