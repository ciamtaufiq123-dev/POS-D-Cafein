import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { PosPage } from '../src/pages/PosPage';
import { ProtectedRoute } from '../src/components/ProtectedRoute';
import { DashboardPage } from './pages/DashboardPage';
import { ProductsPages } from '../src/pages/ProductsPage'
import { OrdersPage } from './pages/OrdersPage';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/pos"
            element={
              <ProtectedRoute>
                <PosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/products"
            element={
              <ProtectedRoute>
                <ProductsPages />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/orders"
            element={
              <ProtectedRoute>
                <OrdersPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;