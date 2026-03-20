import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import api from '../lib/api';

// Module-level guard — shared across every component that calls useAuth(),
// so only one /api/auth/me request can be in-flight at any time.
let isFetching = false;

export function useAuth() {
  const [user, setUser] = useState(null);
  const [tier, setTier] = useState('free');
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
      setTier(data.tier || 'free');
    } catch (e) {
      setTier('free');
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

  return { user, tier, loading, signIn, signUp, signOut, isPro: tier === 'pro' };
}
