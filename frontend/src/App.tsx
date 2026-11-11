import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CheckCircle2, LogOut } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';

// Halaman sementara untuk mengetes apakah Login & pembagian Role berhasil
const TempSuccessPage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md w-full text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>

        <h1 className="text-xl font-bold text-slate-900">Login Berhasil!</h1>

        <p className="text-sm text-slate-600">
          Halo <strong>{user?.name}</strong> ({user?.email})
        </p>

        <div className="inline-block px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
          ROLE AKTIF: {user?.role}
        </div>

        <p className="text-xs text-slate-400">
          Alamat URL saat ini:{' '}
          <code className="font-mono text-slate-700">
            {window.location.pathname}
          </code>
        </p>

        <div className="pt-4">
          <button
            type="button"
            onClick={logout}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout (Kembali ke Login)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Halaman Login */}
      <Route path="/login" element={<LoginPage />} />

      {/* Tujuan jika login sebagai ADMIN */}
      <Route
        path="/dashboard"
        element={user ? <TempSuccessPage /> : <Navigate to="/login" replace />}
      />

      {/* Tujuan jika login sebagai CASHIER */}
      <Route
        path="/pos"
        element={user ? <TempSuccessPage /> : <Navigate to="/login" replace />}
      />

      {/* Jika mengetik URL sembarang, arahkan ke /login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}