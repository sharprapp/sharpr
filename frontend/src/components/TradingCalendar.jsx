import { useState, useMemo } from 'react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function TradingCalendar({ trades }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [selectedDay, setSelectedDay] = useState(null);

  const year  = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthName = cursor.toLocaleString('default', { month: 'long', year: 'numeric' });

  const dayMap = useMemo(() => {
    const map = {};
    trades.forEach(t => {
      const d = new Date(t.created_at);
      if (d.getFullYear() !== year || d.getMonth() !== month) return;
      const k = d.getDate();
      if (!map[k]) map[k] = { pnl: 0, count: 0, wins: 0, trades: [] };
      map[k].trades.push(t);
      map[k].count++;
      if (t.status !== 'open') {
        map[k].pnl += t.pnl || 0;
        if (t.status === 'win') map[k].wins++;
      }
    });
    return map;
  }, [trades, year, month]);

  const monthlyPnl     = Object.values(dayMap).reduce((s, d) => s + d.pnl, 0);
  const monthlyTrades  = Object.values(dayMap).reduce((s, d) => s + d.count, 0);
  const monthlyWins    = Object.values(dayMap).reduce((s, d) => s + d.wins, 0);
  const monthlySettled = trades.filter(t => { const d = new Date(t.created_at); return d.getFullYear()===year && d.getMonth()===month && t.status!=='open'; }).length;
  const monthlyWR      = monthlySettled ? Math.round(monthlyWins / monthlySettled * 100) : 0;

  const firstDOW    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(firstDOW).fill(null), ...Array.from({length: daysInMonth}, (_, i) => i + 1)];

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const selectedTrades = selectedDay ? (dayMap[selectedDay]?.trades ?? []) : [];

  const fmtPnl  = v => (v >= 0 ? '+$' : '-$') + Math.abs(v).toFixed(0);
  const fmtFull = v => (v >= 0 ? '+$' : '-$') + Math.abs(v).toFixed(2);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl overflow-hidden" style={{background: '#0f1729', border: '1px solid #1e2a4a'}}>
        {/* Month header */}
        <div className="flex items-center justify-between px-6 py-4" style={{borderBottom: '1px solid #1e2a4a'}}>
          <button onClick={() => { setCursor(new Date(year, month-1, 1)); setSelectedDay(null); }}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-xl font-light transition-colors"
            style={{color: '#94A3B8'}}
            onMouseEnter={e => { e.currentTarget.style.background='#1e2a4a'; e.currentTarget.style.color='#F5F5FA'; }}
            onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#94A3B8'; }}>
            ‹
          </button>
          <div className="text-center">
            <div className="font-semibold text-base" style={{color: '#F5F5FA'}}>{monthName}</div>
            <div className="flex items-center gap-4 justify-center mt-1">
              <span className={`text-lg font-bold ${monthlyPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>{fmtFull(monthlyPnl)}</span>
              <span className="text-xs font-medium" style={{color: '#94A3B8'}}>{monthlyTrades} trades</span>
              {monthlySettled > 0 && <span className="text-xs font-medium" style={{color: '#94A3B8'}}>{monthlyWR}% win</span>}
            </div>
          </div>
          <button onClick={() => { setCursor(new Date(year, month+1, 1)); setSelectedDay(null); }}
            className="w-9 h-9 flex items-center justify-center rounded-xl text-xl font-light transition-colors"
            style={{color: '#94A3B8'}}
            onMouseEnter={e => { e.currentTarget.style.background='#1e2a4a'; e.currentTarget.style.color='#F5F5FA'; }}
            onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#94A3B8'; }}>
            ›
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7" style={{borderBottom: '1px solid #1e2a4a'}}>
          {DAYS.map(d => (
            <div key={d} className="text-center text-xs font-medium py-2.5 tracking-wide" style={{color: '#64748b'}}>{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7" style={{gap: '1px', background: '#1e2a4a', padding: '1px'}}>
          {cells.map((day, i) => {
            if (!day) return <div key={`e-${i}`} className="min-h-[72px]" style={{background: '#0a0f1e'}} />;
            const data = dayMap[day];
            const isSelected = selectedDay === day;
            const isToday = isCurrentMonth && today.getDate() === day;
            const pos  = data && data.pnl > 0;
            const neg  = data && data.pnl < 0;
            const flat = data && data.pnl === 0 && data.count > 0;

            let bg = '#0a0f1e';
            if (isSelected && pos)  bg = 'rgba(34,197,94,0.15)';
            else if (isSelected && neg) bg = 'rgba(239,68,68,0.15)';
            else if (isSelected)    bg = '#131b2e';
            else if (pos)           bg = 'rgba(34,197,94,0.08)';
            else if (neg)           bg = 'rgba(239,68,68,0.08)';
            else if (flat)          bg = 'rgba(148,163,184,0.06)';

            return (
              <button key={day} onClick={() => setSelectedDay(isSelected ? null : day)}
                className="min-h-[72px] flex flex-col items-center justify-center gap-0.5 cursor-pointer relative transition-all"
                style={{background: bg}}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = pos ? 'rgba(34,197,94,0.12)' : neg ? 'rgba(239,68,68,0.12)' : '#131b2e'; }}
                onMouseLeave={e => { e.currentTarget.style.background = bg; }}>
                {isToday && <div className="absolute inset-1 rounded-lg pointer-events-none" style={{boxShadow: 'inset 0 0 0 2px #2563EB'}} />}
                <span className="text-xs font-medium" style={{color: isToday ? '#2563EB' : '#64748b'}}>{day}</span>
                {data ? (
                  <>
                    <span className={`text-sm font-bold leading-none ${pos ? 'text-green-500' : neg ? 'text-red-500' : 'text-slate-500'}`}>
                      {fmtPnl(data.pnl)}
                    </span>
                    <span className="text-xs leading-none" style={{color: '#64748b'}}>{data.count}t</span>
                  </>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* Day drill-down */}
      {selectedDay && (
        <div className="rounded-2xl overflow-hidden" style={{background: '#0f1729', border: '1px solid #1e2a4a'}}>
          <div className="flex items-center justify-between px-6 py-4" style={{borderBottom: '1px solid #1e2a4a'}}>
            <h3 className="font-semibold" style={{color: '#F5F5FA'}}>
              {cursor.toLocaleString('default', {month:'short'})} {selectedDay}
              <span className="font-normal ml-2" style={{color: '#94A3B8'}}>· {selectedTrades.length} trade{selectedTrades.length !== 1 ? 's' : ''}</span>
            </h3>
            {dayMap[selectedDay] && (
              <span className={`text-base font-bold ${dayMap[selectedDay].pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {fmtFull(dayMap[selectedDay].pnl)}
              </span>
            )}
          </div>
          {selectedTrades.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm" style={{color: '#94A3B8'}}>No trades on this day</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs font-medium tracking-wide" style={{borderBottom: '1px solid #1e2a4a', background: '#0a0f1e', color: '#64748b'}}>
                    {['Ticker','Dir','Setup','Entry','Exit','P&L','Status'].map(h => (
                      <th key={h} className="text-left px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedTrades.map((t, idx) => {
                    const cls = t.status==='win' ? 'text-green-500' : t.status==='loss' ? 'text-red-500' : 'text-slate-500';
                    return (
                      <tr key={t.id} style={{borderBottom: idx < selectedTrades.length - 1 ? '1px solid #1e2a4a' : 'none'}}>
                        <td className="px-4 py-3 font-semibold" style={{color: '#F5F5FA'}}>{t.ticker}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${t.direction==='LONG' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{t.direction}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-400">{t.setup}</td>
                        <td className="px-4 py-3 text-slate-300">${parseFloat(t.entry).toFixed(2)}</td>
                        <td className="px-4 py-3 text-slate-300">{t.exit ? '$'+parseFloat(t.exit).toFixed(2) : '—'}</td>
                        <td className={`px-4 py-3 font-semibold ${cls}`}>{t.status==='open' ? 'Open' : (t.pnl>=0?'+':'')+' $'+parseFloat(t.pnl).toFixed(2)}</td>
                        <td className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide ${cls}`}>{t.status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
