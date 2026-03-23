import { useState, useEffect, useCallback, createContext, useContext, createElement } from 'react';
import { supabase } from '../lib/supabase';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tier, setTier] = useState('free');
  const [username, setUsername] = useState(null);
  const [usernameSet, setUsernameSet] = useState(true);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const { data } = await api.get('/api/auth/me');
      const t = data.plan || data.tier || 'free';
      console.log('[useAuth] plan from /me:', t);
      setTier(t);
      setUsername(data.profile?.username || null);
      setUsernameSet(data.profile?.username_set !== false);
      return t;
    } catch {}

    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('tier, plan, plan_status, username, username_set')
          .eq('id', u.id)
          .single();
        const t = profile?.plan || profile?.tier || 'free';
        console.log('[useAuth] plan from Supabase:', t);
        setTier(t);
        setUsername(profile?.username || null);
        setUsernameSet(profile?.username_set !== false);
        return t;
      }
    } catch {}

    setTier('free');
    return 'free';
  }, []);

  // Log every tier change
  useEffect(() => {
    console.log('[useAuth] tier changed to:', tier);
  }, [tier]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile().finally(() => { if (mounted) setLoading(false); });
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      console.log('[useAuth] onAuthStateChange:', _event);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile().finally(() => { if (mounted) setLoading(false); });
      else { setTier('free'); setLoading(false); }
    });

    const onVisible = () => { if (document.visibilityState === 'visible') fetchProfile(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => { mounted = false; subscription.unsubscribe(); document.removeEventListener('visibilitychange', onVisible); };
  }, [fetchProfile]);

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUp(email, password) {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setTier('free');
  }

  const value = {
    user, tier, username, usernameSet, setUsername, loading,
    signIn, signUp, signOut, refreshProfile: fetchProfile,
    isPro: tier === 'pro' || tier === 'elite',
  };

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    // Fallback for components not wrapped in AuthProvider (shouldn't happen but prevents crash)
    console.warn('[useAuth] called outside AuthProvider');
    return { user: null, tier: 'free', username: null, usernameSet: true, setUsername: () => {}, loading: true, signIn: async () => {}, signUp: async () => {}, signOut: async () => {}, refreshProfile: async () => 'free', isPro: false };
  }
  return ctx;
}
