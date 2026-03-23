import { useState, useEffect, useCallback, createContext, useContext, createElement, useRef } from 'react';
import { supabase } from '../lib/supabase';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tier, setTier] = useState('free');
  const [username, setUsername] = useState(null);
  const [usernameSet, setUsernameSet] = useState(true);
  const [loading, setLoading] = useState(true);
  const fetchingRef = useRef(false);
  const hasFetchedRef = useRef(false);

  const fetchProfile = useCallback(async () => {
    // Prevent concurrent fetches
    if (fetchingRef.current) return tier;
    fetchingRef.current = true;

    let result = null;

    // Try backend first
    try {
      const { data } = await api.get('/api/auth/me');
      result = data.plan || data.tier || null;
      if (result) {
        console.log('[useAuth] plan from /me:', result);
        setTier(result);
        setUsername(data.profile?.username || null);
        setUsernameSet(data.profile?.username_set !== false);
        hasFetchedRef.current = true;
      }
    } catch {}

    // Fallback: Supabase direct
    if (!result) {
      try {
        const { data: { user: u } } = await supabase.auth.getUser();
        if (u) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('tier, plan, plan_status, username, username_set')
            .eq('id', u.id)
            .single();
          result = profile?.plan || profile?.tier || null;
          if (result) {
            console.log('[useAuth] plan from Supabase:', result);
            setTier(result);
            setUsername(profile?.username || null);
            setUsernameSet(profile?.username_set !== false);
            hasFetchedRef.current = true;
          }
        }
      } catch {}
    }

    // Only set free if we've never successfully fetched before
    // This prevents overwriting pro with free on transient failures
    if (!result && !hasFetchedRef.current) {
      setTier('free');
    }

    fetchingRef.current = false;
    return result || tier;
  }, []);

  useEffect(() => {
    console.log('[useAuth] tier changed to:', tier);
  }, [tier]);

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
      console.log('[useAuth] authChange:', _event);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Skip duplicate fetch if getSession already triggered one
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
    console.warn('[useAuth] called outside AuthProvider');
    return { user: null, tier: 'free', username: null, usernameSet: true, setUsername: () => {}, loading: true, signIn: async () => {}, signUp: async () => {}, signOut: async () => {}, refreshProfile: async () => 'free', isPro: false };
  }
  return ctx;
}
