import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Profile, UserRole } from '../types';

export const OWNER_EMAIL = 'abhyy333@gmail.com';
export type AccessMode = 'GUEST' | 'OWNER_ADMIN' | 'ADMIN' | 'DOSEN' | 'MAHASISWA';

const STORAGE_PREVIEW_ROLE_KEY = 'spk_preview_role';

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: UserRole | null; // effectiveRole for compatibility
  actualRole: UserRole | null;
  previewRole: UserRole | null;
  effectiveRole: UserRole | null;
  isOwnerAdmin: boolean;
  isSystemOwner: boolean;
  isAdmin: boolean;
  isDosen: boolean;
  isMahasiswa: boolean;
  isGuest: boolean;
  accessMode: AccessMode;
  availablePreviewRoles: UserRole[];
  setPreviewRole: (role: UserRole | null) => void;
  exitPreview: () => void;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string; role?: UserRole; isOwner?: boolean }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string; isConfirmationRequired?: boolean; user?: User | null }>;
  resetPassword: (email: string) => Promise<{ error?: string; success?: boolean }>;
  updatePassword: (password: string) => Promise<{ error?: string; success?: boolean }>;
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
  const isSystemOwner = !!user && user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
  const isOwnerAdmin = isSystemOwner && (profile?.role === 'ADMIN' || !profile?.role);
  const isAdmin = actualRole === 'ADMIN' || isOwnerAdmin;
  const isDosen = actualRole === 'DOSEN';
  const isMahasiswa = actualRole === 'MAHASISWA';
  const isGuest = !user;

  const accessMode: AccessMode = isOwnerAdmin
    ? 'OWNER_ADMIN'
    : isAdmin
    ? 'ADMIN'
    : isDosen
    ? 'DOSEN'
    : isMahasiswa
    ? 'MAHASISWA'
    : 'GUEST';

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

  // Helper to get locally cached profile
  const getCachedProfile = (userId: string): Profile | null => {
    try {
      const raw = localStorage.getItem(`spk_profile_cache_${userId}`);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return null;
  };

  // Helper to persist cached profile
  const setCachedProfile = (userId: string, prof: Profile) => {
    try {
      localStorage.setItem(`spk_profile_cache_${userId}`, JSON.stringify(prof));
    } catch {
      // ignore
    }
  };

  // Fetch user profile from `profiles` table based on user.id
  const fetchProfile = async (currentUser: User): Promise<Profile | null> => {
    const isOwner = currentUser.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
    const cached = getCachedProfile(currentUser.id);

    // If Supabase is not configured, resolve immediately with cached or synthesized profile
    if (!isSupabaseConfigured()) {
      const displayName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || (isOwner ? 'System Owner' : 'Pengguna');
      const fallbackProfile: Profile = cached || {
        id: currentUser.id,
        email: currentUser.email || '',
        name: displayName,
        full_name: displayName,
        role: isOwner ? 'ADMIN' : ((currentUser.user_metadata?.role as UserRole) || 'MAHASISWA'),
        preview_roles: isOwner ? ['ADMIN', 'DOSEN', 'MAHASISWA'] : [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setProfile(fallbackProfile);
      return fallbackProfile;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (error) {
        // Use warning rather than error so network hiccups do not trigger false applet crash reports
        console.warn('Notice: Could not fetch profile from database, using cached/fallback profile:', error.message || error);

        const displayName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || (isOwner ? 'System Owner' : 'Pengguna');
        const fallbackProfile: Profile = cached || {
          id: currentUser.id,
          email: currentUser.email || '',
          name: displayName,
          full_name: displayName,
          role: isOwner ? 'ADMIN' : ((currentUser.user_metadata?.role as UserRole) || 'MAHASISWA'),
          preview_roles: isOwner ? ['ADMIN', 'DOSEN', 'MAHASISWA'] : [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setCachedProfile(currentUser.id, fallbackProfile);
        setProfile(fallbackProfile);
        return fallbackProfile;
      }

      if (data) {
        const fetchedProfile = {
          ...data,
          name: data.name || data.full_name || currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'Pengguna',
          email: data.email || currentUser.email || '',
          role: isOwner ? 'ADMIN' : (data.role || 'MAHASISWA'),
          preview_roles: isOwner
            ? (Array.isArray(data.preview_roles) && data.preview_roles.length > 0 ? data.preview_roles : ['ADMIN', 'DOSEN', 'MAHASISWA'])
            : data.preview_roles,
        } as Profile;

        setCachedProfile(currentUser.id, fetchedProfile);
        setProfile(fetchedProfile);

        // Verify stored previewRole validity against profile.preview_roles
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

      // If record not found, synthesize profile and cache
      const displayName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || (isOwner ? 'System Owner' : 'Pengguna');
      const syntheticProfile: Profile = cached || {
        id: currentUser.id,
        email: currentUser.email || '',
        name: displayName,
        full_name: displayName,
        role: isOwner ? 'ADMIN' : ((currentUser.user_metadata?.role as UserRole) || 'MAHASISWA'),
        preview_roles: isOwner ? ['ADMIN', 'DOSEN', 'MAHASISWA'] : [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setCachedProfile(currentUser.id, syntheticProfile);
      setProfile(syntheticProfile);
      return syntheticProfile;
    } catch (err: any) {
      console.warn('Exception during profile retrieval, using fallback profile:', err?.message || err);
      const displayName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || (isOwner ? 'System Owner' : 'Pengguna');
      const fallbackProfile: Profile = cached || {
        id: currentUser.id,
        email: currentUser.email || '',
        name: displayName,
        full_name: displayName,
        role: isOwner ? 'ADMIN' : 'MAHASISWA',
        preview_roles: isOwner ? ['ADMIN', 'DOSEN', 'MAHASISWA'] : [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setCachedProfile(currentUser.id, fallbackProfile);
      setProfile(fallbackProfile);
      return fallbackProfile;
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
      } catch (err: any) {
        console.warn('Auth initialization notice:', err?.message || err);
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

  const signUp = async (
    email: string,
    password: string,
    fullName: string
  ): Promise<{ error?: string; isConfirmationRequired?: boolean; user?: User | null }> => {
    if (!isSupabaseConfigured()) {
      return {
        error: 'Koneksi database belum dikonfigurasi. Tambahkan Supabase URL dan Publishable Key.',
      };
    }

    try {
      setLoading(true);
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = fullName.trim();

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
            name: cleanName,
          },
        },
      });

      if (error) {
        setLoading(false);
        return { error: error.message };
      }

      if (data.user) {
        // If session returned immediately (email confirmation disabled in Supabase)
        if (data.session) {
          setUser(data.user);
          await fetchProfile(data.user);
          setLoading(false);
          return { user: data.user, isConfirmationRequired: false };
        } else {
          // Email confirmation is required by Supabase backend
          setLoading(false);
          return { user: data.user, isConfirmationRequired: true };
        }
      }

      setLoading(false);
      return { error: 'Gagal membuat akun. Silakan coba lagi.' };
    } catch (err: any) {
      setLoading(false);
      return { error: err.message || 'Terjadi kesalahan sistem saat proses pendaftaran.' };
    }
  };

  const resetPassword = async (email: string): Promise<{ error?: string; success?: boolean }> => {
    if (!isSupabaseConfigured()) {
      return {
        error: 'Koneksi database belum dikonfigurasi.',
      };
    }

    try {
      const cleanEmail = email.trim().toLowerCase();
      const redirectUrl = `${window.location.origin}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        return { error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { error: err.message || 'Gagal mengirim email reset kata sandi.' };
    }
  };

  const updatePassword = async (password: string): Promise<{ error?: string; success?: boolean }> => {
    if (!isSupabaseConfigured()) {
      return {
        error: 'Koneksi database belum dikonfigurasi.',
      };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        return { error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { error: err.message || 'Gagal memperbarui kata sandi.' };
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
        isSystemOwner,
        isAdmin,
        isDosen,
        isMahasiswa,
        isGuest,
        accessMode,
        availablePreviewRoles,
        setPreviewRole,
        exitPreview,
        loading,
        signIn,
        signUp,
        resetPassword,
        updatePassword,
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
