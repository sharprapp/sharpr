import { useState, useEffect, useCallback, createContext, useContext, createElement, useRef } from 'react';
import { supabase } from '../lib/supabase';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tier, setTier] = useState('free');
  const [displayName, setDisplayName] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);
  const hasFetchedRef = useRef(false);

  const fetchProfile = useCallback(async () => {
    if (fetchingRef.current) return tier;
    fetchingRef.current = true;

    let result = null;

    // Try backend first (source of truth)
    try {
      const { data } = await api.get('/api/auth/me');
      result = data.plan || data.tier || null;
      if (result) {
        setTier(result);
        setDisplayName(data.profile?.display_name || null);
        hasFetchedRef.current = true;
        // UI hint only — never used for feature gating
        try { localStorage.setItem('sharpr_last_tier', result); } catch {}
      }
    } catch {}

    // Fallback: Supabase direct
    if (!result) {
      try {
        const { data: { user: u } } = await supabase.auth.getUser();
        if (u) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('tier, plan, plan_status, display_name')
            .eq('id', u.id)
            .single();
          result = profile?.plan || profile?.tier || null;
          if (result) {
            setTier(result);
            setDisplayName(profile?.display_name || null);
            hasFetchedRef.current = true;
            try { localStorage.setItem('sharpr_last_tier', result); } catch {}
          }
        }
      } catch {}
    }

    // If both sources failed and we've never fetched, default to free
    // localStorage is UI hint only — never trust it for actual tier
    if (!result && !hasFetchedRef.current) {
      setTier('free');
    }

    fetchingRef.current = false;
    return result || tier;
  }, []);

  useEffect(() => {
    let mounted = true;
    let initialFetchDone = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (session?.user) {
        initialFetchDone = true;
        fetchProfile().finally(() => { if (mounted) setLoading(false); });
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);

      if (session?.user) {
        if (_event === 'INITIAL_SESSION' && initialFetchDone) return;
        fetchProfile().finally(() => { if (mounted) setLoading(false); });
      } else {
        setTier('free');
        hasFetchedRef.current = false;
        setLoading(false);
      }
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
    hasFetchedRef.current = false;
    try { localStorage.removeItem('sharpr_last_tier'); } catch {}
  }

  const value = {
    user, tier, displayName, setDisplayName, loading,
    signIn, signUp, signOut, refreshProfile: fetchProfile,
    isPro: tier === 'pro' || tier === 'elite',
  };

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return { user: null, tier: 'free', displayName: null, setDisplayName: () => {}, loading: true, signIn: async () => {}, signUp: async () => {}, signOut: async () => {}, refreshProfile: async () => 'free', isPro: false };
  }
  return ctx;
}
