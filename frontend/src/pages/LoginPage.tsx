import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Coffee,
  Zap,
  Package,
  BarChart3,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import type { Authresponse } from '../types';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@dcafein.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { loginSuccess } = useAuth();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const response = await api.post<Authresponse>('/auth/login', {
        email,
        password,
      });
      const { token, user } = response.data;

      loginSuccess(token, user);

      if (user.role === 'ADMIN') {
        navigate('/dashboard');
      } else {
        navigate('/pos');
      }
    } catch (err: unknown) {
      if (axios.isAxiosError<{ message?: string }>(err)) {
        setErrorMsg(
          err.response?.data?.message ||
            'Gagal terhubung ke server Backend (Port 5000)'
        );
      } else {
        setErrorMsg('Terjadi kesalahan saat mencoba login');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
    setErrorMsg(null);
  };

  return (
    <main className="min-h-screen w-full bg-background">
      <div className="w-full min-h-screen flex flex-col lg:flex-row overflow-hidden bg-surface-container-lowest">
        {/* PANEL KIRI: Branding D'Cafein */}
        <div className="w-full lg:w-1/2 relative bg-linear-to-br from-primary-container via-surface-tint to-primary text-on-primary p-8 sm:p-12 lg:p-16 flex flex-col justify-between overflow-hidden min-h-screen">
          <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none"></div>
          <div className="absolute -left-16 bottom-24 w-72 h-72 rounded-full bg-black/10 blur-xl pointer-events-none"></div>

          {/* Watermark Pattern Kopi */}
          <svg
            className="absolute inset-0 w-full h-full opacity-10 pointer-events-none select-none"
            fill="currentColor"
            height="100%"
            width="100%"
            xmlns="http://www.w3.org/2000/svg"
          >
            <pattern
              height="80"
              id="coffee-pattern"
              patternUnits="userSpaceOnUse"
              width="80"
            >
              <path
                d="M20 18c0-3.3 2.7-6 6-6h8c3.3 0 6 2.7 6 6v10c0 5.5-4.5 10-10 10s-10-4.5-10-10V18zm20 3h4a4 4 0 0 1 4 4v2a4 4 0 0 1-4 4h-4V21zM18 42h24c1.1 0 2 .9 2 2s-.9 2-2 2H18c-1.1 0-2-.9-2-2s.9-2 2-2z"
                fill="white"
              ></path>
              <path
                d="M60 52c-2.2-4.5-1.5-8.5 1.5-12.5 3 4 3.7 8 1.5 12.5-1.1 2.2-3 2.2-3 0z"
                fill="white"
              ></path>
            </pattern>
            <rect fill="url(#coffee-pattern)" height="100%" width="100%"></rect>
          </svg>

          {/* Header Logo */}
          <div className="relative z-10 space-y-7">
            <div className="flex items-center gap-4 pt-1">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner border border-white/30 shrink-0">
                <Coffee className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-[30px] text-white font-bold leading-tight tracking-tight">
                  D'Cafein
                </h1>
                <p className="text-[11px] text-primary-fixed tracking-wider uppercase font-semibold">
                  Point of Sale System
                </p>
              </div>
            </div>
            <div className="max-w-lg space-y-3 pt-1">
              <h2 className="text-[24px] text-white font-bold leading-snug">
                Sistem Kasir &amp; Manajemen Inventaris Terpadu
              </h2>
            </div>
          </div>

          {/* 3 Kartu Fitur */}
          <div className="relative z-10 my-8 space-y-3.5 max-w-lg">
            <div className="flex items-center gap-3.5 p-4 rounded-xl bg-white/10 backdrop-blur-md hover:bg-white/15 transition-all shadow-sm border border-white/15">
              <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0 border border-white/20">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] text-white font-semibold">
                  Transaksi Cepat &amp; Struk Otomatis
                </p>
                <p className="text-[13px] text-primary-fixed/80 truncate">
                  Tender kilat dengan unduh struk PDF &amp; integrasi Midtrans QRIS
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-4 rounded-xl bg-white/10 backdrop-blur-md hover:bg-white/15 transition-all shadow-sm border border-white/15">
              <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0 border border-white/20">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] text-white font-semibold">
                  Manajemen Inventaris Stok Real-time
                </p>
                <p className="text-[13px] text-primary-fixed/80 truncate">
                  Pemotongan stok produk otomatis saat transaksi kasir selesai
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-4 rounded-xl bg-white/10 backdrop-blur-md hover:bg-white/15 transition-all shadow-sm border border-white/15">
              <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0 border border-white/20">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] text-white font-semibold">
                  Laporan Analitik Harian &amp; Mingguan
                </p>
                <p className="text-[13px] text-primary-fixed/80 truncate">
                  Pantau grafik omzet 7 hari terakhir dan metode pembayaran
                </p>
              </div>
            </div>
          </div>

          {/* Footer Kiri */}
          <div className="relative z-10 pt-4 text-xs text-primary-fixed/80 flex items-center justify-between border-t border-white/10">
            <span>© 2026 D'Cafein POS Technologies.</span>
            <span className="inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-secondary-fixed animate-pulse"></span>
              Terminal Siap Pakai
            </span>
          </div>
        </div>

        {/* PANEL KANAN: Form Login */}
        <div className="w-full lg:w-1/2 bg-surface-container-lowest flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16 min-h-screen">
          <div className="w-full max-w-110 space-y-6 my-auto">
            <div className="space-y-2.5">
              <h2 className="text-[30px] text-on-surface font-bold tracking-tight">
                Selamat Datang Kembali
              </h2>
              <p className="text-[14px] text-on-surface-variant leading-relaxed">
                Masukkan kredensial akun Anda untuk mengakses terminal kasir
                atau portal administrasi.
              </p>
            </div>

            {/* Tombol Pilih Cepat Akun Demo */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-on-surface-variant font-medium">
                Akun Cepat:
              </span>
              <button
                type="button"
                onClick={() => fillDemoAccount('admin@dcafein.com')}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all cursor-pointer ${
                  email === 'admin@dcafein.com'
                    ? 'bg-orange-50 border-primary-container text-primary-container'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Admin (ADMIN)
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount('kasir@dcafein.com')}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all cursor-pointer ${
                  email === 'kasir@dcafein.com'
                    ? 'bg-orange-50 border-primary-container text-primary-container'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Kasir (CASHIER)
              </button>
            </div>

            {/* Kotak Pesan Error */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form className="space-y-4" onSubmit={handleLoginSubmit}>
              <div className="space-y-1.5">
                <label
                  className="block text-[12px] text-on-surface font-semibold"
                  htmlFor="email"
                >
                  Email Terdaftar
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 absolute left-3.5 text-on-surface-variant/70 pointer-events-none" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@dcafein.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-container-lowest text-on-surface text-[14px] shadow-sm outline-none transition-all placeholder:text-on-surface-variant/40 hover:bg-surface-container-low focus:bg-surface-container-lowest border border-outline-variant/40 focus:border-primary-container focus:ring-2 focus:ring-primary-container/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    className="block text-[12px] text-on-surface font-semibold"
                    htmlFor="password"
                  >
                    Kata Sandi
                  </label>
                </div>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 absolute left-3.5 text-on-surface-variant/70 pointer-events-none" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-surface-container-lowest text-on-surface text-[14px] shadow-sm outline-none transition-all placeholder:text-on-surface-variant/40 hover:bg-surface-container-low focus:bg-surface-container-lowest border border-outline-variant/40 focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    title="Tampilkan / Sembunyikan sandi"
                    className="absolute right-3 p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors flex items-center justify-center cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="w-4 h-4 rounded text-primary-container focus:ring-0 cursor-pointer accent-primary-container"
                  />
                  <span className="text-[13px] text-on-surface-variant">
                    Ingat sesi perangkat ini (30 hari)
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 rounded-xl bg-primary-container hover:bg-surface-tint active:bg-primary text-on-primary text-[14px] font-semibold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-primary-container/30 disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memverifikasi Akses...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Sistem POS</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
};