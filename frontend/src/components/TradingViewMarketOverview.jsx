import { useEffect, useRef } from 'react';

export default function TradingViewMarketOverview() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      colorTheme: 'dark',
      dateRange: '1D',
      showChart: true,
      locale: 'en',
      backgroundColor: 'rgba(0,0,0,0)',
      isTransparent: true,
      showSymbolLogo: true,
      showFloatingTooltip: false,
      width: '100%',
      height: '500',
      tabs: [
        { title: 'Indices',  symbols: [{ s: 'FOREXCOM:SPXUSD', d: 'S&P 500' }, { s: 'FOREXCOM:NSXUSD', d: 'Nasdaq 100' }, { s: 'FOREXCOM:DJI', d: 'Dow Jones' }, { s: 'NASDAQ:QQQ', d: 'QQQ' }] },
        { title: 'Futures',  symbols: [{ s: 'CME_MINI:NQ1!',  d: 'NQ Futures' }, { s: 'CME_MINI:MNQ1!', d: 'MNQ Futures' }, { s: 'CME_MINI:ES1!', d: 'ES Futures' }, { s: 'CME_MINI:MES1!', d: 'MES Futures' }] },
        { title: 'Crypto',   symbols: [{ s: 'BITSTAMP:BTCUSD', d: 'Bitcoin' }, { s: 'BITSTAMP:ETHUSD', d: 'Ethereum' }, { s: 'COINBASE:SOLUSD', d: 'Solana' }, { s: 'COINBASE:XRPUSD', d: 'XRP' }] },
      ],
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, []);

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', overflow: 'hidden', padding: '4px' }}>
      <div ref={containerRef} className="tradingview-widget-container" style={{ width: '100%', height: '500px' }} />
    </div>
  );
}
