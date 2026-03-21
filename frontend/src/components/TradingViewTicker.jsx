import { useEffect, useRef, useState } from 'react';

export default function TradingViewTicker() {
  const containerRef = useRef(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!show || !containerRef.current) return;
    containerRef.current.innerHTML = '';
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: [
        {"proName":"FOREXCOM:SPXUSD","title":"S&P 500"},
        {"proName":"FOREXCOM:NSXUSD","title":"Nasdaq"},
        {"proName":"NASDAQ:QQQ","title":"QQQ"},
        {"proName":"AMEX:SPY","title":"SPY"},
        {"proName":"BITSTAMP:BTCUSD","title":"Bitcoin"},
        {"proName":"BITSTAMP:ETHUSD","title":"Ethereum"},
        {"proName":"NASDAQ:AAPL","title":"Apple"},
        {"proName":"NASDAQ:NVDA","title":"NVIDIA"},
        {"proName":"NASDAQ:TSLA","title":"Tesla"},
        {"proName":"TVC:GOLD","title":"Gold"},
        {"proName":"TVC:USOIL","title":"Oil"}
      ],
      showSymbolLogo: true,
      isTransparent: true,
      displayMode: "adaptive",
      colorTheme: "dark",
      locale: "en"
    });
    containerRef.current.appendChild(script);
    return () => { if (containerRef.current) containerRef.current.innerHTML = ''; };
  }, [show]);

  if (!show) return <div style={{height: '46px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(7,7,18,0.9)'}} />;

  return (
    <div style={{borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(7,7,18,0.9)'}}>
      <div ref={containerRef} className="tradingview-widget-container" style={{width:'100%', height:'46px', overflow:'hidden'}} />
    </div>
  );
}
