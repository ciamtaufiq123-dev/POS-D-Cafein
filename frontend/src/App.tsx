import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { PosPage } from '../src/pages/PosPage';
import { ProtectedRoute, PublicOnlyRoute } from '../src/components/ProtectedRoute';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPages } from '../src/pages/ProductsPage';
import { OrdersPage } from './pages/OrdersPage';
import { NotFoundPage } from './pages/NotFoundPage';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
            <Route path="/" element={<Navigate to="/login" replace />}/>
          <Route 
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>} 
          />
          <Route
            path="/pos"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'CASHIER']}>
                <PosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/products"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <ProductsPages />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/orders"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <OrdersPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;