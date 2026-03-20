import { useState, useMemo } from 'react';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SPORT_COLORS = {
  NFL:    'bg-orange-500/20 text-orange-400',
  NBA:    'bg-blue-500/20 text-blue-400',
  MLB:    'bg-green-500/20 text-green-400',
  Soccer: 'bg-purple-500/20 text-purple-400',
  UFC:    'bg-red-500/20 text-red-400',
};

export default function BettingCalendar({ bets }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [selectedDay, setSelectedDay] = useState(null);

  const year  = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthName = cursor.toLocaleString('default', { month: 'long', year: 'numeric' });

  const dayMap = useMemo(() => {
    const map = {};
    bets.forEach(b => {
      const d = new Date(b.created_at);
      if (d.getFullYear() !== year || d.getMonth() !== month) return;
      const k = d.getDate();
      if (!map[k]) map[k] = { pnl: 0, bets: [] };
      map[k].bets.push(b);
      if (b.result !== 'pending' && b.pnl != null) map[k].pnl += b.pnl;
    });
    return map;
  }, [bets, year, month]);

  const monthlyPnl     = Object.values(dayMap).reduce((s, d) => s + d.pnl, 0);
  const monthlyBets    = Object.values(dayMap).reduce((s, d) => s + d.bets.length, 0);
  const monthlyWins    = bets.filter(b => { const d = new Date(b.created_at); return d.getFullYear()===year && d.getMonth()===month && b.result==='win'; }).length;
  const monthlySettled = bets.filter(b => { const d = new Date(b.created_at); return d.getFullYear()===year && d.getMonth()===month && b.result!=='pending'; }).length;
  const monthlyWR      = monthlySettled ? Math.round(monthlyWins / monthlySettled * 100) : 0;

  const firstDOW    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [...Array(firstDOW).fill(null), ...Array.from({length: daysInMonth}, (_, i) => i + 1)];

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const selectedBets = selectedDay ? (dayMap[selectedDay]?.bets ?? []) : [];

  const fmt = v => (v >= 0 ? '+' : '') + v.toFixed(2) + 'u';

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
              <span className={`text-lg font-bold ${monthlyPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>{fmt(monthlyPnl)}</span>
              <span className="text-xs font-medium" style={{color: '#94A3B8'}}>{monthlyBets} bets</span>
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
            if (!day) return <div key={`e-${i}`} className="min-h-[70px]" style={{background: '#0a0f1e'}} />;
            const data = dayMap[day];
            const isSelected = selectedDay === day;
            const isToday = isCurrentMonth && today.getDate() === day;
            const pos = data && data.pnl > 0;
            const neg = data && data.pnl < 0;

            let bg = '#0a0f1e';
            if (isSelected && pos)  bg = 'rgba(34,197,94,0.15)';
            else if (isSelected && neg) bg = 'rgba(239,68,68,0.15)';
            else if (isSelected)    bg = '#131b2e';
            else if (pos)           bg = 'rgba(34,197,94,0.08)';
            else if (neg)           bg = 'rgba(239,68,68,0.08)';

            return (
              <button key={day} onClick={() => setSelectedDay(isSelected ? null : day)}
                className="min-h-[70px] flex flex-col items-center justify-center gap-0.5 cursor-pointer relative transition-all"
                style={{background: bg}}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = pos ? 'rgba(34,197,94,0.12)' : neg ? 'rgba(239,68,68,0.12)' : '#131b2e'; }}
                onMouseLeave={e => { e.currentTarget.style.background = bg; }}>
                {isToday && <div className="absolute inset-1 rounded-lg pointer-events-none" style={{boxShadow: 'inset 0 0 0 2px #2563EB'}} />}
                <span className="text-xs font-medium" style={{color: isToday ? '#2563EB' : '#64748b'}}>{day}</span>
                {data ? (
                  <>
                    <span className={`text-sm font-bold leading-none ${pos ? 'text-green-500' : neg ? 'text-red-500' : 'text-slate-500'}`}>
                      {fmt(data.pnl)}
                    </span>
                    <span className="text-xs leading-none" style={{color: '#64748b'}}>{data.bets.length}b</span>
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
              <span className="font-normal ml-2" style={{color: '#94A3B8'}}>· {selectedBets.length} bet{selectedBets.length !== 1 ? 's' : ''}</span>
            </h3>
            {dayMap[selectedDay] && (
              <span className={`text-base font-bold ${dayMap[selectedDay].pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {fmt(dayMap[selectedDay].pnl)}
              </span>
            )}
          </div>
          {selectedBets.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm" style={{color: '#94A3B8'}}>No bets on this day</div>
          ) : (
            <div style={{borderTop: 'none'}}>
              {selectedBets.map((b, idx) => (
                <div key={b.id} className="flex items-center justify-between px-6 py-3.5 gap-4" style={{borderBottom: idx < selectedBets.length - 1 ? '1px solid #1e2a4a' : 'none'}}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${SPORT_COLORS[b.sport] || 'bg-slate-500/20 text-slate-400'}`}>{b.sport}</span>
                    <span className="text-sm truncate" style={{color: '#F5F5FA'}}>{b.match}</span>
                    <span className="text-xs shrink-0 hidden sm:inline" style={{color: '#64748b'}}>{b.type} · {b.odds}</span>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-xs" style={{color: '#94A3B8'}}>${parseFloat(b.stake).toFixed(0)}</span>
                    <span className={`text-sm font-semibold w-20 text-right ${b.result==='win' ? 'text-green-500' : b.result==='loss' ? 'text-red-500' : 'text-slate-500'}`}>
                      {b.result === 'pending' ? 'pending' : b.pnl != null ? (b.pnl >= 0 ? '+' : '') + '$' + Math.abs(b.pnl).toFixed(2) : b.result}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
