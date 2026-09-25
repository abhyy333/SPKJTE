import React, { useState } from 'react';
import {
  Settings,
  Database,
  User,
  Shield,
  KeyRound,
  CheckCircle2,
  ExternalLink,
  Info,
} from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { isSupabaseConfigured, getSupabaseConfig } from '../../lib/supabase';
import { SupabaseConfigModal } from '../../components/ui/SupabaseConfigModal';

export const SettingsPage: React.FC = () => {
  const { user, profile, role } = useAuth();
  const [showConfigModal, setShowConfigModal] = useState(false);
  const config = getSupabaseConfig();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan Sistem"
        subtitle="Konfigurasi akun, otentikasi role, dan konektivitas database"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Info */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">Profil Pengguna</h4>
              <p className="text-xs text-slate-500">Informasi akun terautentikasi</p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-slate-50">
              <span className="text-slate-500">Nama Lengkap</span>
              <span className="font-semibold text-slate-800">{profile?.name || user?.email || 'Admin Jurusan'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-50">
              <span className="text-slate-500">Email</span>
              <span className="font-semibold text-slate-800">{user?.email || '—'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-50">
              <span className="text-slate-500">Hak Akses Role</span>
              <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {role || 'ADMIN'}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-50">
              <span className="text-slate-500">Jurusan</span>
              <span className="font-semibold text-slate-800">Teknik Elektro FT UNRAM</span>
            </div>
          </div>
        </div>

        {/* Supabase Connection Info */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">Koneksi Database Supabase</h4>
                <p className="text-xs text-slate-500">PostgreSQL Cloud Database</p>
              </div>
            </div>
            <button
              onClick={() => setShowConfigModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Ubah Kredensial
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-slate-50">
              <span className="text-slate-500">Status Koneksi</span>
              {isSupabaseConfigured() ? (
                <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Terhubung
                </span>
              ) : (
                <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  Belum Dikonfigurasi
                </span>
              )}
            </div>
            <div className="flex justify-between py-2 border-b border-slate-50">
              <span className="text-slate-500">Supabase URL</span>
              <span className="font-mono text-slate-700 truncate max-w-[200px]">
                {config.url || 'Belum diisi'}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-50">
              <span className="text-slate-500">Key Type</span>
              <span className="font-medium text-slate-700">Anon / Publishable (Client-Safe)</span>
            </div>
          </div>
        </div>
      </div>

      <SupabaseConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
      />
    </div>
  );
};
