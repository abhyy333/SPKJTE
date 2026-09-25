import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogIn, Lock, Mail, AlertCircle, Database, Loader2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { UnramLogo } from '../../components/shared/UnramLogo';
import { isSupabaseConfigured } from '../../lib/supabase';
import { SupabaseConfigModal } from '../../components/ui/SupabaseConfigModal';
import { toast } from '../../components/ui/Toast';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  const { signIn, user, role, isOwnerAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already logged in as owner admin
  React.useEffect(() => {
    if (user && isOwnerAdmin) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, isOwnerAdmin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isSupabaseConfigured()) {
      setErrorMsg(
        'Koneksi database belum dikonfigurasi. Tambahkan Supabase URL dan Publishable Key pada environment project.'
      );
      setShowConfigModal(true);
      return;
    }

    if (!email || !password) {
      setErrorMsg('Silakan masukkan email dan kata sandi.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await signIn(email, password);
      if (res.error) {
        setErrorMsg(res.error);
        setSubmitting(false);
        return;
      }

      if (res.isOwner) {
        toast.success('Berhasil masuk sebagai Administrator Pemilik.');
        navigate('/dashboard', { replace: true });
      } else {
        toast.info('Anda masuk dalam mode baca saja.');
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem saat proses masuk.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      {/* Background subtle decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-100/40 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md">
        {/* Brand Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl p-8 sm:p-10">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="mb-4 drop-shadow-sm">
              <UnramLogo size={56} />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
              SPK Penjadwalan Perkuliahan
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1.5 leading-relaxed">
              Jurusan Teknik Elektro — Universitas Mataram
            </p>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {/* Database connection missing alert */}
          {!isSupabaseConfigured() && (
            <div className="mb-6 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <div className="flex items-center justify-between mb-1 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-amber-600" />
                  Koneksi Belum Terhubung
                </span>
                <button
                  type="button"
                  onClick={() => setShowConfigModal(true)}
                  className="text-blue-600 hover:underline font-medium"
                >
                  Konfigurasi
                </button>
              </div>
              <p className="text-2xs text-amber-700 leading-normal">
                Tambahkan Supabase URL dan Publishable Key agar otentikasi dapat berkomunikasi dengan database.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Alamat Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="admin@unram.ac.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-slate-800 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-50/50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-slate-800 transition-colors"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500/40 shadow-xs transition-all disabled:opacity-60 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Masuk ke Sistem
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer note: strictly NO register/sign up button as per rule 7 */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer py-1.5 px-3 rounded-lg hover:bg-slate-50"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali ke Dashboard (Mode Tamu)
            </button>
            <p className="text-2xs text-slate-400 text-center leading-relaxed">
              Akun pengelola jadwal dikonfigurasi oleh Administrator Jurusan Teknik Elektro.
            </p>
          </div>
        </div>

        {/* Bottom copyright */}
        <p className="text-center text-2xs text-slate-400 mt-6">
          &copy; {new Date().getFullYear()} Jurusan Teknik Elektro Fakultas Teknik Universitas Mataram
        </p>
      </div>

      <SupabaseConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />
    </div>
  );
};
