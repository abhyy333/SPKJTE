import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Profile, UserRole } from '../types';

export const OWNER_EMAIL = 'abhyy333@gmail.com';
export type AccessMode = 'GUEST' | 'OWNER_ADMIN';

const STORAGE_PREVIEW_ROLE_KEY = 'spk_preview_role';

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: UserRole | null; // effectiveRole for compatibility
  actualRole: UserRole | null;
  previewRole: UserRole | null;
  effectiveRole: UserRole | null;
  isOwnerAdmin: boolean;
  accessMode: AccessMode;
  availablePreviewRoles: UserRole[];
  setPreviewRole: (role: UserRole | null) => void;
  exitPreview: () => void;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string; role?: UserRole; isOwner?: boolean }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [previewRole, setPreviewRoleState] = useState<UserRole | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_PREVIEW_ROLE_KEY);
      return (saved as UserRole) || null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Authoritative database role
  const actualRole: UserRole | null = profile?.role ?? null;

  // STRICT SECURITY RULE: Owner Admin check
  const isOwnerAdmin =
    !!user &&
    user.email?.toLowerCase() === OWNER_EMAIL &&
    profile?.role === 'ADMIN';

  const accessMode: AccessMode = isOwnerAdmin ? 'OWNER_ADMIN' : 'GUEST';

  // Role preview is strictly allowed ONLY for the verified owner admin
  const availablePreviewRoles: UserRole[] = React.useMemo(() => {
    if (!isOwnerAdmin) return [];
    if (!profile?.preview_roles || !Array.isArray(profile.preview_roles)) {
      return ['ADMIN', 'DOSEN', 'MAHASISWA'];
    }
    return profile.preview_roles;
  }, [isOwnerAdmin, profile?.preview_roles]);

  // Effective role used strictly for UI presentation (preview only valid for owner admin)
  const effectiveRole: UserRole | null = isOwnerAdmin
    ? (previewRole ?? actualRole)
    : actualRole;

  // Set or switch preview role
  const setPreviewRole = (role: UserRole | null) => {
    if (!isOwnerAdmin) {
      setPreviewRoleState(null);
      return;
    }

    if (!role || role === actualRole) {
      setPreviewRoleState(null);
      try {
        localStorage.removeItem(STORAGE_PREVIEW_ROLE_KEY);
      } catch (err) {
        console.warn('LocalStorage error:', err);
      }
      return;
    }

    if (availablePreviewRoles.includes(role)) {
      setPreviewRoleState(role);
      try {
        localStorage.setItem(STORAGE_PREVIEW_ROLE_KEY, role);
      } catch (err) {
        console.warn('LocalStorage error:', err);
      }
    }
  };

  // Exit preview mode back to authoritative admin role
  const exitPreview = () => {
    setPreviewRoleState(null);
    try {
      localStorage.removeItem(STORAGE_PREVIEW_ROLE_KEY);
    } catch (err) {
      console.warn('LocalStorage error:', err);
    }
  };

  // Fetch user profile from `profiles` table based on user.id
  const fetchProfile = async (currentUser: User): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile from profiles table:', error);
        return null;
      }

      if (data) {
        const fetchedProfile = {
          ...data,
          email: data.email || currentUser.email || '',
        } as Profile;
        setProfile(fetchedProfile);

        // Verify stored previewRole validity against profile.preview_roles
        const isOwner =
          currentUser.email?.toLowerCase() === OWNER_EMAIL &&
          fetchedProfile.role === 'ADMIN';

        if (isOwner) {
          const allowed = Array.isArray(fetchedProfile.preview_roles)
            ? fetchedProfile.preview_roles
            : ['ADMIN', 'DOSEN', 'MAHASISWA'];

          try {
            const saved = localStorage.getItem(STORAGE_PREVIEW_ROLE_KEY) as UserRole | null;
            if (saved && allowed.includes(saved) && saved !== fetchedProfile.role) {
              setPreviewRoleState(saved);
            } else {
              setPreviewRoleState(null);
              localStorage.removeItem(STORAGE_PREVIEW_ROLE_KEY);
            }
          } catch {
            // ignore localStorage error
          }
        } else {
          setPreviewRoleState(null);
          try {
            localStorage.removeItem(STORAGE_PREVIEW_ROLE_KEY);
          } catch {
            // ignore
          }
        }

        return fetchedProfile;
      }
      return null;
    } catch (err) {
      console.error('Exception fetching profile:', err);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      if (!isSupabaseConfigured()) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          setUser(session.user);
          await fetchProfile(session.user);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    if (!isSupabaseConfigured()) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session: Session | null) => {
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user);
      } else {
        setUser(null);
        setProfile(null);
        setPreviewRoleState(null);
        try {
          localStorage.removeItem(STORAGE_PREVIEW_ROLE_KEY);
        } catch {
          // ignore
        }
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error?: string; role?: UserRole; isOwner?: boolean }> => {
    if (!isSupabaseConfigured()) {
      return {
        error: 'Koneksi database belum dikonfigurasi. Tambahkan Supabase URL dan Publishable Key.',
      };
    }

    try {
      setLoading(true);
      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        setLoading(false);
        return { error: error.message };
      }

      if (!data.user) {
        setLoading(false);
        return { error: 'Gagal melakukan otentikasi. Silakan periksa kembali email dan password.' };
      }

      setUser(data.user);
      const prof = await fetchProfile(data.user);

      const isOwner = cleanEmail === OWNER_EMAIL && prof?.role === 'ADMIN';

      setLoading(false);
      return { role: prof?.role, isOwner };
    } catch (err: any) {
      setLoading(false);
      return { error: err.message || 'Terjadi kesalahan sistem saat proses login.' };
    }
  };

  const signOut = async () => {
    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Sign out error:', err);
    } finally {
      setUser(null);
      setProfile(null);
      setPreviewRoleState(null);
      try {
        localStorage.removeItem(STORAGE_PREVIEW_ROLE_KEY);
      } catch {
        // ignore
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: effectiveRole,
        actualRole,
        previewRole,
        effectiveRole,
        isOwnerAdmin,
        accessMode,
        availablePreviewRoles,
        setPreviewRole,
        exitPreview,
        loading,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
