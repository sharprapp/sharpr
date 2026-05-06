import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import api from '../lib/api';
import Logo from '../components/Logo';
import { requestPermission, subscribeToPush, unsubscribeFromPush } from '../lib/notifications';
import { exportBetsCSV, exportTradesCSV, exportBetsPDF, exportTradesPDF } from '../lib/export';

const inp = 'outline-none transition-colors';
const inpStyle = { background: 'rgba(17,17,32,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(108, 99, 255, 0.3)', color: '#F0F0FF', borderRadius: '12px', padding: '10px 14px', fontSize: 14, width: '100%' };
const inpFocus = e => { e.target.style.borderColor = '#6C63FF'; };
const inpBlur  = e => { e.target.style.borderColor = '#1E1E2E'; };

const CARD = { background: 'rgba(17,17,32,0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(108, 99, 255, 0.3)', borderRadius: '16px', padding: '24px' };
const LABEL = { fontSize: 11, fontWeight: 800, letterSpacing: '-0.02em', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B6B8A', marginBottom: 6, display: 'block' };

function Toggle({ value, onChange, label, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <div>
        <div style={{ fontSize: 14, color: '#F0F0FF', fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: '#6B6B8A', marginTop: 2 }}>{sub}</div>}
      </div>
      <button onClick={() => onChange(!value)}
        style={{
          width: 42, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
          background: value ? '#6C63FF' : '#1E1E2E', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
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
  const { user, tier, displayName: authDisplayName, setDisplayName: setAuthDisplayName, signOut } = useAuth();
  const navigate = useNavigate();
  const [resetSent, setResetSent] = useState(false);
  const [searchParams]          = useSearchParams();
  const [subStatus, setSubStatus] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [portalError, setPortalError] = useState('');
  const upgraded = searchParams.get('upgraded') === 'true';
  const canceled = searchParams.get('canceled') === 'true';
  const [nameSaving, setNameSaving] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [nameError, setNameError] = useState('');

  const [displayName, setDisplayName] = useState(authDisplayName || '');
  useEffect(() => { if (authDisplayName) setDisplayName(authDisplayName); }, [authDisplayName]);
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
    setPortalError('');
    try {
      const { data } = await api.post('/api/stripe/portal');
      window.location.href = data.url;
    } catch(err) {
      setPortalError(err.response?.data?.error || 'Could not open billing portal — please email support@sharprapp.com');
      setLoading(false);
    }
  }

  function savePrefs() {
    try {
      localStorage.setItem('pref_name',    displayName);
      localStorage.setItem('pref_sport',   defaultSport);
      localStorage.setItem('pref_odds',    oddsFormat);
      localStorage.setItem('pref_tz',      timezone);
      localStorage.setItem('pref_public',  String(journalPublic));
      localStorage.setItem('pref_alerts',  String(alertsOn));
    } catch {}
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function firstName(email = '') {
    const raw = (email.split('@')[0].split('.')[0]).replace(/\d+$/, '');
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0A0A0F', color: '#F0F0FF' }}>
      <nav style={{ borderBottom: '1px solid #1E1E2E', padding: '16px 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Logo size="md" />
          <Link to="/dashboard" style={{ fontSize: 13, color: '#6C63FF', textDecoration: 'none' }}>Back to Dashboard</Link>
        </div>
      </nav>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Banners */}
        {upgraded && (
          <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 12, padding: '12px 16px', fontSize: 14, color: '#00E5B4', fontWeight: 500 }}>
            You're now on Pro. Welcome!
          </div>
        )}
        {canceled && (
          <div style={{ background: 'rgba(100,116,139,0.1)', border: '1px solid rgba(108, 99, 255, 0.3)', borderRadius: 12, padding: '12px 16px', fontSize: 14, color: '#6B6B8A' }}>
            Checkout canceled — you haven't been charged.
          </div>
        )}

        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', margin: 0 }}>Settings</h1>

        {/* ── Profile ── */}
        <div style={CARD}>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 16, color: '#F0F0FF' }}>Account</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={LABEL}>Display name</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input value={displayName} onChange={e => { setDisplayName(e.target.value); setNameSaved(false); setNameError(''); }}
                  placeholder={firstName(user?.email)} className={inp} style={{ ...inpStyle, flex: 1 }} onFocus={inpFocus} onBlur={inpBlur} maxLength={50} />
                <button disabled={nameSaving} onClick={async () => {
                  setNameSaving(true); setNameError(''); setNameSaved(false);
                  try {
                    const { error } = await supabase.from('profiles').update({ display_name: displayName.trim() || null }).eq('id', user.id);
                    if (error) throw error;
                    setAuthDisplayName(displayName.trim() || null);
                    setNameSaved(true); setTimeout(() => setNameSaved(false), 3000);
                  } catch (e) { setNameError(e.message || 'Could not save display name'); }
                  setNameSaving(false);
                }} style={{ background: '#6C63FF', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 16px', fontSize: 13, fontWeight: 800, letterSpacing: '-0.02em', cursor: 'pointer', whiteSpace: 'nowrap', opacity: nameSaving ? 0.5 : 1 }}>
                  {nameSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
              {nameError && <div style={{ fontSize: 12, color: '#FF4560', marginTop: 6 }}>{nameError}</div>}
              {nameSaved && <div style={{ fontSize: 12, color: '#00E5B4', marginTop: 6 }}>Display name saved</div>}
            </div>
            <div>
              <label style={LABEL}>Email</label>
              <div style={{ ...inpStyle, background: 'rgba(17,17,32,0.8)', backdropFilter: 'blur(20px)', color: '#6B6B8A' }}>{user?.email}</div>
            </div>
            <div>
              <label style={LABEL}>Password</label>
              {resetSent ? (
                <div style={{ fontSize: 13, color: '#00E5B4' }}>Password reset email sent — check your inbox</div>
              ) : (
                <button onClick={async () => {
                  await supabase.auth.resetPasswordForEmail(user?.email, { redirectTo: window.location.origin + '/settings' });
                  setResetSent(true);
                }} style={{ background: '#1A1A24', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 16px', fontSize: 13, color: '#6B6B8A', cursor: 'pointer' }}>
                  Change password
                </button>
              )}
            </div>
            <div style={{ borderTop: '1px solid #1E1E2E', paddingTop: 14 }}>
              <button onClick={async () => { await signOut(); navigate('/login'); }}
                style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '8px 16px', fontSize: 13, color: '#FF4560', cursor: 'pointer', fontWeight: 800, letterSpacing: '-0.02em' }}>
                Sign out
              </button>
            </div>
          </div>
        </div>

        {/* ── Preferences ── */}
        <div style={CARD}>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 16, color: '#F0F0FF' }}>Preferences</div>
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
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 16, color: '#F0F0FF' }}>Journal Privacy</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Toggle value={journalPublic} onChange={setJournalPublic}
              label="Make journal public"
              sub="Appears on leaderboards. Only P&L and win rate are shown — no positions." />
          </div>
        </div>

        {/* ── Notifications ── */}
        <div style={CARD}>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 16, color: '#F0F0FF' }}>Notifications</div>
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
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.03em', color: '#F0F0FF' }}>Subscription</div>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: '-0.02em', padding: '4px 12px', borderRadius: 20, background: tier === 'pro' ? 'rgba(37,99,235,0.25)' : 'rgba(245,158,11,0.12)', border: `1px solid ${tier === 'pro' ? 'rgba(37,99,235,0.4)' : 'rgba(245,158,11,0.3)'}`, color: tier === 'pro' ? '#93c5fd' : '#fbbf24' }}>
              {tier === 'pro' ? 'Pro' : 'Free'}
            </span>
          </div>

          {tier !== 'pro' ? (
            <div>
              <div style={{ fontSize: 13, color: '#6B6B8A', marginBottom: 14, lineHeight: 1.6 }}>
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
                <div style={{ fontSize: 13, color: '#6B6B8A', marginBottom: 14 }}>
                  Renews {new Date(subStatus.current_period_end).toLocaleDateString()}
                </div>
              )}
              <button onClick={handlePortal} disabled={loading}
                style={{ width: '100%', padding: '12px', fontSize: 14, borderRadius: '12px', background: '#1A1A24', border: '1px solid rgba(108,99,255,0.3)', color: '#F0F0FF', cursor: 'pointer', fontWeight: 700 }}>
                {loading ? 'Loading…' : 'Manage billing / cancel'}
              </button>
              {portalError && <div style={{ fontSize: 12, color: '#FF4560', marginTop: 8 }}>{portalError}</div>}
            </div>
          )}

          {/* Plan limits table */}
          <div style={{ marginTop: 20, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(108, 99, 255, 0.3)' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(17,17,32,0.8)', backdropFilter: 'blur(20px)' }}>
                  {['Feature','Free','Pro'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Feature' ? 'left' : 'center', fontSize: 11, fontWeight: 800, letterSpacing: '-0.02em', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#6B6B8A', borderBottom: '1px solid #1E1E2E' }}>{h}</th>
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
                    <td style={{ padding: '10px 14px', color: '#6B6B8A' }}>{f}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', color: '#6B6B8A' }}>{fr}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'center', color: '#F0F0FF', fontWeight: 800, letterSpacing: '-0.02em' }}>{pr}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Data Export ── */}
        <div style={CARD}>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 16, color: '#F0F0FF' }}>Data Export</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div><div style={{ fontSize: 14, color: '#F0F0FF', fontWeight: 500 }}>Betting Journal</div><div style={{ fontSize: 12, color: '#4E4E63', marginTop: 2 }}>All logged bets</div></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={async () => { try { const { data } = await api.get('/api/bets'); exportBetsCSV(data); } catch { alert('Could not export'); } }}
                  style={{ fontSize: 11, fontWeight: 800, letterSpacing: '-0.02em', padding: '6px 14px', borderRadius: 8, background: '#1A1A24', border: '1px solid rgba(108,99,255,0.2)', color: '#6B6B8A', cursor: 'pointer' }}>CSV</button>
                {(tier === 'pro' || tier === 'elite') && (
                  <button onClick={async () => { try { const { data } = await api.get('/api/bets'); exportBetsPDF(data); } catch { alert('Could not export'); } }}
                    style={{ fontSize: 11, fontWeight: 800, letterSpacing: '-0.02em', padding: '6px 14px', borderRadius: 8, background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)', color: '#867fff', cursor: 'pointer' }}>PDF</button>
                )}
              </div>
            </div>
            <div style={{ height: 1, background: '#1E1E2E' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div><div style={{ fontSize: 14, color: '#F0F0FF', fontWeight: 500 }}>Trading Journal</div><div style={{ fontSize: 12, color: '#4E4E63', marginTop: 2 }}>All logged trades</div></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={async () => { try { const { data } = await api.get('/api/trades'); exportTradesCSV(data); } catch { alert('Could not export'); } }}
                  style={{ fontSize: 11, fontWeight: 800, letterSpacing: '-0.02em', padding: '6px 14px', borderRadius: 8, background: '#1A1A24', border: '1px solid rgba(108,99,255,0.2)', color: '#6B6B8A', cursor: 'pointer' }}>CSV</button>
                {(tier === 'pro' || tier === 'elite') && (
                  <button onClick={async () => { try { const { data } = await api.get('/api/trades'); exportTradesPDF(data); } catch { alert('Could not export'); } }}
                    style={{ fontSize: 11, fontWeight: 800, letterSpacing: '-0.02em', padding: '6px 14px', borderRadius: 8, background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.2)', color: '#867fff', cursor: 'pointer' }}>PDF</button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Legal ── */}
        <div style={CARD}>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 16, color: '#F0F0FF' }}>Legal</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link to="/terms" style={{ fontSize: 14, color: '#6C63FF', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Terms of Service</span><span style={{ color: '#2a3a5a' }}>→</span>
            </Link>
            <Link to="/privacy" style={{ fontSize: 14, color: '#6C63FF', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Privacy Policy</span><span style={{ color: '#2a3a5a' }}>→</span>
            </Link>
          </div>
        </div>

        {/* ── Danger zone ── */}
        <div style={{ ...CARD, border: '1px solid rgba(239,68,68,0.2)' }}>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4, color: '#FF4560' }}>Danger zone</div>
          <div style={{ fontSize: 13, color: '#6B6B8A', marginBottom: 14 }}>Permanently delete your account and all data. This cannot be undone.</div>
          <button
            onClick={() => { if (window.confirm('Are you sure? This cannot be undone.')) alert('Please email support@sharprapp.com to request account deletion. We will process your request within 30 days.'); }}
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '8px 16px', fontSize: 13, color: '#FF4560', cursor: 'pointer' }}>
            Delete account
          </button>
        </div>

        {/* Save button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          {saved && <span style={{ fontSize: 13, color: '#00E5B4', alignSelf: 'center' }}>Saved!</span>}
          <button onClick={savePrefs} className="glass-btn-blue" style={{ padding: '10px 28px', fontSize: 14, borderRadius: '12px' }}>
            Save preferences
          </button>
        </div>

      </div>
    </div>
  );
}
