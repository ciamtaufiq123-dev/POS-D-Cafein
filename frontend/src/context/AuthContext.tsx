import React, { createContext, useContext, useEffect, useState } from 'react';
import api, { AUTH_UNAUTHORIZED_EVENT } from '../api/axios';
import type { User } from '../types';

interface AuthContextType {
    user: User | null;
    token: string | null;
    loginSuccess: (token: string, userData: User) => void;
    logout: () => void;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [ token, setToken ] = useState<string | null>(() => {
        return localStorage.getItem('token');
    });

    const [ user, setUser ] = useState<User | null>(() => {
        const savedUser = localStorage.getItem('user');
        return savedUser ? (JSON.parse(savedUser) as User) : null;
    });

    useEffect(() => {
        const handleUnauthorized = () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setToken(null);
            setUser(null);
        };

        window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
        return () => {
            window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
        };
    }, []);

    useEffect(() => {
        if (!token) return;

        let isActive = true;
        api.get<{ user: User }>('/auth/me')
            .then(({ data }) => {
                if (!isActive) return;
                localStorage.setItem('user', JSON.stringify(data.user));
                setUser(data.user);
            })
            .catch((error: unknown) => {
                if (isActive) {
                    console.error('Gagal menyegarkan profil pengguna:', error);
                }
            });

        return () => {
            isActive = false;
        };
    }, [token]);

    const loginSuccess = (newToken: string, userData: User) => {
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
        setToken(newToken);
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, loginSuccess, logout, isLoading: false }}>
            {children}
        </AuthContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth harus digunakan di dalam AuthProvider')
    }
    return context;
};