import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { NotFoundPage } from '../pages/NotFoundPage';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: ('ADMIN' | 'CASHIER')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    allowedRoles,
}) => {
    const { user } = useAuth();

  // 1. Jika belum login (user kosong), arahkan kembali ke halaman /login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

  // 2. Jika halaman khusus role tertentu (misal ADMIN) tapi yang masuk adalah CASHIER, arahkan ke /pos
    if (allowedRoles && !allowedRoles.includes(user.role as 'ADMIN' | 'CASHIER')) {
        return <NotFoundPage />;
    }

  // 3. Jika lolos pengecekan, tampilkan halaman yang dituju
    return <>{children}</>;
};

export const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const { user } = useAuth();

    if (user) {
        return (
            <Navigate 
                to={user.role === 'ADMIN' ? '/dashboard' : '/pos'}
            />
        );
    }

    return <>{children}</>;
}

export default ProtectedRoute;