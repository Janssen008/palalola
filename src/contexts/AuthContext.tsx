import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, SUPABASE_STORAGE_KEY } from '@/lib/supabase';
import type { Profile as DbProfile } from '@/types/database';
import { useQueryClient } from '@tanstack/react-query';

export type Profile = DbProfile & { offices?: { name: string } | null };

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, officeId?: string, positionTitle?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isDeptHead: boolean;
  authEvent: string | null;
  clearAuthEvent: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authEvent, setAuthEvent] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, offices(name)')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data as unknown as Profile;
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    // Failsafe timeout to ensure loading never gets stuck indefinitely
    const failsafe = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth initialization timed out. Forcing load completion.');
        setLoading(false);
      }
    }, 8000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        if (event === 'PASSWORD_RECOVERY') {
          setAuthEvent(event);
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          fetchProfile(session.user.id).then(p => {
            if (mounted) {
              setProfile(p);
              setLoading(false);
            }
          }).catch(err => {
            console.error('Profile fetch failed in auth listener:', err);
            if (mounted) {
              setProfile(null);
              setLoading(false);
            }
          });
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(failsafe);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string, officeId?: string, positionTitle?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          office_id: officeId,
          position_title: positionTitle,
        },
      },
    });
    
    // Fallback: If the database trigger hasn't been updated to include office_id yet,
    // attempt to manually update the profile (works if auto-login is enabled)
    if (!error && data?.user) {
      const updates: Record<string, any> = {};
      if (officeId) updates.office_id = officeId;
      if (positionTitle) updates.position_title = positionTitle;
      if (Object.keys(updates).length > 0) {
        // @ts-ignore - Bypass strict type checking for fallback update
        await supabase.from('profiles').update(updates).eq('user_id', data.user.id);
      }
    }

    // Profile is automatically created by a database trigger on auth.users
    return { error: error as Error | null };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.error('Signout error:', error);
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
      queryClient.clear();
      try {
        localStorage.removeItem(SUPABASE_STORAGE_KEY);
      } catch (e) {
        // ignore storage errors
      }
    }
  };

  const isAdmin = profile?.role === 'admin';
  const isDeptHead = profile?.role === 'department_head' || profile?.role === 'oic';

  const clearAuthEvent = () => setAuthEvent(null);

  const refreshProfile = async () => {
    if (user) {
      const p = await fetchProfile(user.id);
      setProfile(p);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signUp, signOut, isAdmin, isDeptHead, authEvent, clearAuthEvent, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
