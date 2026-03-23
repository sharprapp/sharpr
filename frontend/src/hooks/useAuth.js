import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import api from '../lib/api';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [tier, setTier] = useState('free');
  const [username, setUsername] = useState(null);
  const [usernameSet, setUsernameSet] = useState(true);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    // Try backend first
    try {
      const { data } = await api.get('/api/auth/me');
      const t = data.plan || data.tier || 'free';
      console.log('[useAuth] plan:', t);
      setTier(t);
      setUsername(data.profile?.username || null);
      setUsernameSet(data.profile?.username_set !== false);
      return t;
    } catch {}

    // Fallback: Supabase direct
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('tier, plan, plan_status, username, username_set')
          .eq('id', u.id)
          .single();
        const t = profile?.plan || profile?.tier || 'free';
        console.log('[useAuth] plan (fallback):', t);
        setTier(t);
        setUsername(profile?.username || null);
        setUsernameSet(profile?.username_set !== false);
        return t;
      }
    } catch {}

    setTier('free');
    return 'free';
  }, []);

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
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile().finally(() => { if (mounted) setLoading(false); });
      else { setTier('free'); setLoading(false); }
    });

    // Re-fetch when app regains focus (e.g. returning from Stripe checkout)
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

  return {
    user, tier, username, usernameSet, setUsername, loading,
    signIn, signUp, signOut, refreshProfile: fetchProfile,
    isPro: tier === 'pro' || tier === 'elite',
  };
}
