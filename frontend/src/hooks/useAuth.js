import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import api from '../lib/api';

// Module-level guard — shared across every component that calls useAuth(),
// so only one /api/auth/me request can be in-flight at any time.
let isFetching = false;

export function useAuth() {
  const [user, setUser] = useState(null);
  const [tier, setTier] = useState('free');
  const [username, setUsername] = useState(null);
  const [usernameSet, setUsernameSet] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile();
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile();
      else { setTier('free'); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile() {
    if (isFetching) return;
    isFetching = true;
    try {
      const { data } = await api.get('/api/auth/me');
      const t = data.tier || 'free';
      console.log('[useAuth] tier from backend:', t);
      setTier(t);
      setUsername(data.profile?.username || null);
      setUsernameSet(data.profile?.username_set !== false);
    } catch (e) {
      console.warn('[useAuth] /api/auth/me failed, trying Supabase direct fallback:', e.message);
      // Fallback: query Supabase directly
      try {
        const { data: { user: u } } = await supabase.auth.getUser();
        if (u) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('tier, username, username_set')
            .eq('id', u.id)
            .single();
          const t = profile?.tier || 'free';
          console.log('[useAuth] tier from Supabase fallback:', t);
          setTier(t);
          setUsername(profile?.username || null);
          setUsernameSet(profile?.username_set !== false);
        }
      } catch (e2) {
        console.warn('[useAuth] Supabase fallback also failed:', e2.message);
        setTier('free');
      }
    } finally {
      setLoading(false);
      isFetching = false;
    }
  }

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

  return { user, tier, username, usernameSet, setUsername, loading, signIn, signUp, signOut, isPro: tier === 'pro' || tier === 'elite' };
}
