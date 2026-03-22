import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import api from '../lib/api';
import Logo from '../components/Logo';
import { requestPermission, subscribeToPush, unsubscribeFromPush } from '../lib/notifications';

const inp = 'outline-none transition-colors';
const inpStyle = { background: '#0a0f1e', border: '1px solid #1e2a4a', color: '#F5F5FA', borderRadius: '12px', padding: '10px 14px', fontSize: 14, width: '100%' };
const inpFocus = e => { e.target.style.borderColor = '#2563EB'; };
const inpBlur  = e => { e.target.style.borderColor = '#1e2a4a'; };

const CARD = { background: '#0f1729', border: '1px solid #1e2a4a', borderRadius: '16px', padding: '24px' };
const LABEL = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 6, display: 'block' };

function Toggle({ value, onChange, label, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <div>
        <div style={{ fontSize: 14, color: '#F5F5FA', fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{sub}</div>}
      </div>
      <button onClick={() => onChange(!value)}
        style={{
          width: 42, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
          background: value ? '#2563EB' : '#1e2a4a', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
        }}>
        <span style={{
          position: 'absolute', top: 3, left: value ? 21 : 3, width: 18, height: 18,
          borderRadius: '50%', background: '#fff', transition: 'left 0.2s',
        }} />
      </button>
    </div>
  );
}

export default function Settings() {
  const { user, tier, username, signOut } = useAuth();
  const navigate = useNavigate();
  const [resetSent, setResetSent] = useState(false);
  const [searchParams]          = useSearchParams();
  const [subStatus, setSubStatus] = useState(null);
  const [loading, setLoading]   = useState(false);
  const upgraded = searchParams.get('upgraded') === 'true';
  const canceled = searchParams.get('canceled') === 'true';

  // Profile prefs (stored in localStorage for now, would be Supabase in full impl)
  const [displayName,   setDisplayName]   = useState(() => localStorage.getItem('pref_name')     || '');
  const [defaultSport,  setDefaultSport]  = useState(() => localStorage.getItem('pref_sport')    || 'NBA');
  const [oddsFormat,    setOddsFormat]    = useState(() => localStorage.getItem('pref_odds')     || 'American');
  const [timezone,      setTimezone]      = useState(() => localStorage.getItem('pref_tz')       || 'America/New_York');
  const [journalPublic, setJournalPublic] = useState(() => localStorage.getItem('pref_public')   === 'true');
  const [alertsOn,      setAlertsOn]      = useState(() => localStorage.getItem('pref_alerts')   !== 'false');
  const [pushEnabled,   setPushEnabled]   = useState(() => localStorage.getItem('pref_push')     === 'true');
  const [saved, setSaved]                 = useState(false);

  useEffect(() => {
    api.get('/api/stripe/status').then(r => setSubStatus(r.data)).catch(() => {});
  }, []);

  async function handleUpgrade() {
    setLoading(true);
    try { const { data } = await api.post('/api/stripe/create-checkout'); window.location.href = data.url; }
    catch { setLoading(false); }
  }

  async function handlePortal() {
    setLoading(true);
    try { const { data } = await api.post('/api/stripe/portal'); window.location.href = data.url; }
    catch { setLoading(false); }
  }

  function savePrefs() {
    localStorage.setItem('pref_name',    displayName);
    localStorage.setItem('pref_sport',   defaultSport);
    localStorage.setItem('pref_odds',    oddsFormat);
    localStorage.setItem('pref_tz',      timezone);
    localStorage.setItem('pref_public',  String(journalPublic));
    localStorage.setItem('pref_alerts',  String(alertsOn));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function firstName(email = '') {
    const raw = (email.split('@')[0].split('.')[0]).replace(/\d+$/, '');
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080810', color: '#F5F5FA' }}>
      <nav style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '16px 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Logo size="md" />
          <Link to="/dashboard" style={{ fontSize: 13, color: '#4f8ef7', textDecoration: 'none' }}>Back to Dashboard</Link>
        </div>
      </nav>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Banners */}
        {upgraded && (
          <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 12, padding: '12px 16px', fontSize: 14, color: '#22c55e', fontWeight: 500 }}>
            You're now on Pro. Welcome!
          </div>
        )}
        {canceled && (
          <div style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid #1e2a4a', borderRadius: 12, padding: '12px 16px', fontSize: 14, color: '#94A3B8' }}>
            Checkout canceled — you haven't been charged.
          </div>
        )}

        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Settings</h1>

        {/* ── Profile ── */}
        <div style={CARD}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#F5F5FA' }}>Account</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {username && (
              <div>
                <label style={LABEL}>Username</label>
                <div style={{ ...inpStyle, background: '#0a0f1e', color: '#94A3B8' }}>@{username}</div>
              </div>
            )}
            <div>
              <label style={LABEL}>Email</label>
              <div style={{ ...inpStyle, background: '#0a0f1e', color: '#64748b' }}>{user?.email}</div>
            </div>
            <div>
              <label style={LABEL}>Display name</label>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder={firstName(user?.email)} className={inp} style={inpStyle} onFocus={inpFocus} onBlur={inpBlur} />
            </div>
            <div>
              <label style={LABEL}>Password</label>
              {resetSent ? (
                <div style={{ fontSize: 13, color: '#22c55e' }}>Password reset email sent — check your inbox</div>
              ) : (
                <button onClick={async () => {
                  await supabase.auth.resetPasswordForEmail(user?.email, { redirectTo: window.location.origin + '/settings' });
                  setResetSent(true);
                }} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 16px', fontSize: 13, color: '#94A3B8', cursor: 'pointer' }}>
                  Change password
                </button>
              )}
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 14 }}>
              <button onClick={async () => { await signOut(); navigate('/login'); }}
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '8px 16px', fontSize: 13, color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}>
                Sign out
              </button>
            </div>
          </div>
        </div>

        {/* ── Preferences ── */}
        <div style={CARD}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#F5F5FA' }}>Preferences</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={LABEL}>Default sport</label>
              <select value={defaultSport} onChange={e => setDefaultSport(e.target.value)} className={inp} style={inpStyle} onFocus={inpFocus} onBlur={inpBlur}>
                {['NFL','NBA','MLB','NHL','Soccer','UFC'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={LABEL}>Odds format</label>
              <select value={oddsFormat} onChange={e => setOddsFormat(e.target.value)} className={inp} style={inpStyle} onFocus={inpFocus} onBlur={inpBlur}>
                {['American','Decimal','Fractional'].map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label style={LABEL}>Timezone</label>
              <select value={timezone} onChange={e => setTimezone(e.target.value)} className={inp} style={inpStyle} onFocus={inpFocus} onBlur={inpBlur}>
                {['America/New_York','America/Chicago','America/Denver','America/Los_Angeles','Europe/London','Europe/Paris','Asia/Tokyo'].map(tz => (
                  <option key={tz} value={tz}>{tz.replace('_',' ')}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── Privacy ── */}
        <div style={CARD}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#F5F5FA' }}>Journal Privacy</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Toggle value={journalPublic} onChange={setJournalPublic}
              label="Make journal public"
              sub="Appears on leaderboards. Only P&L and win rate are shown — no positions." />
          </div>
        </div>

        {/* ── Notifications ── */}
        <div style={CARD}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#F5F5FA' }}>Notifications</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Toggle value={alertsOn} onChange={setAlertsOn}
              label="In-app alerts"
              sub="Get alerts when Polymarket prices cross your thresholds." />
            <Toggle value={pushEnabled} onChange={async (val) => {
              if (val) {
                const perm = await requestPermission();
                if (perm !== 'granted') { alert('Please allow notifications in your browser settings.'); return; }
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                  const ok = await subscribeToPush(session.access_token);
                  if (ok) setPushEnabled(true);
                }
              } else {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) await unsubscribeFromPush(session.access_token);
                setPushEnabled(false);
              }
              localStorage.setItem('pref_push', String(val));
            }}
              label="Push notifications"
              sub="Line movement alerts and sharp signals sent to your device." />
          </div>
        </div>

        {/* ── Subscription ── */}
        <div style={CARD}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#F5F5FA' }}>Subscription</div>
            <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20, background: tier === 'pro' ? 'rgba(37,99,235,0.25)' : 'rgba(245,158,11,0.12)', border: `1px solid ${tier === 'pro' ? 'rgba(37,99,235,0.4)' : 'rgba(245,158,11,0.3)'}`, color: tier === 'pro' ? '#93c5fd' : '#fbbf24' }}>
              {tier === 'pro' ? 'Pro' : 'Free'}
            </span>
          </div>

          {tier !== 'pro' ? (
            <div>
              <div style={{ fontSize: 13, color: '#94A3B8', marginBottom: 14, lineHeight: 1.6 }}>
                Unlock unlimited AI queries, live odds, and unlimited journal entries.
              </div>
              <button onClick={handleUpgrade} disabled={loading}
                className="glass-btn-blue" style={{ width: '100%', padding: '12px', fontSize: 14, borderRadius: '12px' }}>
                {loading ? 'Loading…' : 'Upgrade to Pro — $19/month'}
              </button>
            </div>
          ) : (
            <div>
              {subStatus?.current_period_end && (
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>
                  Renews {new Date(subStatus.current_period_end).toLocaleDateString()}
                </div>
              )}
              <button onClick={handlePortal} disabled={loading}
                className="glass-btn" style={{ width: '100%', padding: '12px', fontSize: 14, borderRadius: '12px' }}>
                {loading ? 'Loading…' : 'Manage billing / cancel'}
              </button>
            </div>
          )}

          {/* Plan limits table */}
          <div style={{ marginTop: 20, borderRadius: 12, overflow: 'hidden', border: '1px solid #1e2a4a' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#0a0f1e' }}>
                  {['Feature','Free','Pro'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Feature' ? 'left' : 'center', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', borderBottom: '1px solid #1e2a4a' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['AI queries / day', '5', 'Unlimited'],
                  ['Trade journal entries', '50', 'Unlimited'],
                  ['Bet journal entries', '50', 'Unlimited'],
                  ['Live odds feed', '—', '✓'],
                  ['CSV export', '—', '✓'],
                  ['Leaderboard', '—', '✓'],
                ].map(([f, fr, pr]) => (
                  <tr key={f} style={{ borderBottom: '1px solid rgba(30,42,74,0.6)' }}>
                    <td style={{ padding: '10px 14px', color: '#94A3B8' }}>{f}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', color: '#475569' }}>{fr}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', color: '#22c55e', fontWeight: 600 }}>{pr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Legal ── */}
        <div style={CARD}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: '#F5F5FA' }}>Legal</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link to="/terms" style={{ fontSize: 14, color: '#4f8ef7', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Terms of Service</span><span style={{ color: '#2a3a5a' }}>→</span>
            </Link>
            <Link to="/privacy" style={{ fontSize: 14, color: '#4f8ef7', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Privacy Policy</span><span style={{ color: '#2a3a5a' }}>→</span>
            </Link>
          </div>
        </div>

        {/* ── Danger zone ── */}
        <div style={{ ...CARD, border: '1px solid rgba(239,68,68,0.2)' }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: '#ef4444' }}>Danger zone</div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>Permanently delete your account and all data. This cannot be undone.</div>
          <button
            onClick={() => { if (window.confirm('Are you sure? This cannot be undone.')) alert('Please email support@sharprapp.com to request account deletion. We will process your request within 30 days.'); }}
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '8px 16px', fontSize: 13, color: '#ef4444', cursor: 'pointer' }}>
            Delete account
          </button>
        </div>

        {/* Save button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          {saved && <span style={{ fontSize: 13, color: '#22c55e', alignSelf: 'center' }}>Saved!</span>}
          <button onClick={savePrefs} className="glass-btn-blue" style={{ padding: '10px 28px', fontSize: 14, borderRadius: '12px' }}>
            Save preferences
          </button>
        </div>

      </div>
    </div>
  );
}
