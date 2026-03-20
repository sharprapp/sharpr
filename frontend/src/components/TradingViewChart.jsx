import { useEffect, useRef } from 'react';

export default function TradingViewChart({ symbol, theme = 'dark', height = 700, cssHeight }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';
    if (!symbol) return;

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = '100%';
    widgetDiv.style.width = '100%';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbol,
      interval: 'D',
      timezone: 'America/New_York',
      theme: 'dark',
      style: '1',
      locale: 'en',
      backgroundColor: '#03030a',
      gridColor: 'rgba(255,255,255,0.04)',
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      support_host: 'https://www.tradingview.com',
    });

    containerRef.current.appendChild(widgetDiv);
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [symbol]);

  const h = cssHeight || `${height}px`;

  if (!symbol) {
    return (
      <div style={{
        height: h,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '16px',
        gap: '12px',
      }}>
        <div style={{fontSize: '32px'}}>📈</div>
        <div style={{fontSize: '15px', fontWeight: 600, color: '#4a5a7a'}}>Search for a symbol to load a chart</div>
        <div style={{fontSize: '12px', color: '#1a2535'}}>Try MNQ1!, NQ1!, SPY, BTC, AAPL</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container"
      style={{ height: h, width: '100%' }}
    />
  );
}
