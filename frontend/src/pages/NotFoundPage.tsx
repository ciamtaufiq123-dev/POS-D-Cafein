import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Coffee, ArrowLeft, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const NotFoundPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const handleGoBack = () => {
        if (!user) {
            navigate('/login', { replace: true });
        } else if (user.role === 'ADMIN') {
            navigate('/dashboard', { replace: true})
        } else {
            navigate('/pos', { replace: true })
        }   
    };
        return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6 font-sans text-on-surface">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-primary-fixed/60 text-primary-container flex items-center justify-center mb-4">
                <ShieldAlert className="w-7 h-7" />
            </div>

            <span className="text-xs font-bold uppercase tracking-widest text-primary-container">
                Error 404
            </span>
            <h1 className="text-2xl font-bold text-on-surface mt-1">
                Halaman Tidak Ditemukan
            </h1>
            <button
                type="button"
                onClick={handleGoBack}
                className="mt-6 w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary-container text-white text-sm font-semibold shadow-xs hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer"
            >
                <ArrowLeft className="w-4 h-4" />
                <span>
                    {user ? 'Kembali ke Halaman Utama' : 'Kembali ke Halaman Login'}
                </span>
            </button>

            <div className="mt-6 pt-5 border-t border-slate-100 w-full flex items-center justify-center gap-2 text-xs text-on-surface-variant">
                <Coffee className="w-4 h-4 text-primary-container" />
                <span>D&apos;Cafein Point of Sale System</span>
            </div>
            </div>
        </div>
    );
};