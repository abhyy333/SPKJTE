import { supabase } from './supabase';
import { toast } from '../components/ui/Toast';

export const OWNER_EMAIL = 'abhyy333@gmail.com';

/**
 * Check if the currently authenticated user in Supabase session is the owner admin
 */
export async function verifyOwnerAdmin(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) return false;
    if (session.user.email.toLowerCase() !== OWNER_EMAIL) return false;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle();

    return profile?.role === 'ADMIN';
  } catch {
    return false;
  }
}

/**
 * Mutation guard helper for services and UI.
 * Throws or toasts an error if user is not the owner administrator.
 */
export async function assertOwnerAdmin(actionName: string = 'mengubah data'): Promise<void> {
  const isOwner = await verifyOwnerAdmin();
  if (!isOwner) {
    const msg = `Mode baca saja. Hanya administrator pemilik (${OWNER_EMAIL}) yang dapat ${actionName}.`;
    toast.error(msg);
    throw new Error(msg);
  }
}
