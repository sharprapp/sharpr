import { useEffect, useRef } from 'react';

export default function TradingViewTicker() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [
        { proName: 'FOREXCOM:SPXUSD',  title: 'S&P 500' },
        { proName: 'FOREXCOM:NSXUSD',  title: 'Nasdaq' },
        { proName: 'CME_MINI:NQ1!',    title: 'NQ Futures' },
        { proName: 'CME_MINI:MNQ1!',   title: 'MNQ Futures' },
        { proName: 'BITSTAMP:BTCUSD',  title: 'Bitcoin' },
        { proName: 'BITSTAMP:ETHUSD',  title: 'Ethereum' },
        { proName: 'NASDAQ:AAPL',      title: 'Apple' },
        { proName: 'NASDAQ:NVDA',      title: 'NVIDIA' },
        { proName: 'NASDAQ:TSLA',      title: 'Tesla' },
      ],
      showSymbolLogo: true,
      isTransparent: true,
      displayMode: 'adaptive',
      colorTheme: 'dark',
      locale: 'en',
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, []);

  return (
    <div ref={containerRef} className="tradingview-widget-container" style={{ width: '100%', height: '46px', overflow: 'hidden' }} />
  );
}
