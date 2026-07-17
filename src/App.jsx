import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { StatusBar } from './components/organisms/StatusBar';
import { SplashScreen } from './pages/SplashScreen';
import { OrderType } from './pages/OrderType';
import { Home } from './pages/Home';
import { Cart } from './pages/Cart';
import { AdminPanel } from './pages/AdminPanel';
import { AdminLogin } from './pages/AdminLogin';
import { useCart } from './context/CartContext';
import './styles/global.css';

const ClientApp = () => {
  const { clearCart } = useCart();
  const [showSplash, setSplash] = useState(true);
  const [currentPage, setCurrentPage] = useState('order-type');
  const [orderType, setOrderType] = useState(null);

  const handleSelectType = (type) => {
    clearCart();
    setOrderType(type);
    setCurrentPage('home');
  };

  const handleNavigateBack = () => {
    clearCart();
    setCurrentPage('order-type');
  };

  if (showSplash) {
    return <SplashScreen onComplete={() => setSplash(false)} />;
  }

  return (
    <div className="phone-shell">
      <StatusBar />
      <div className="scroll-area">
        {currentPage === 'order-type' ? (
          <OrderType onSelectType={handleSelectType} />
        ) : currentPage === 'home' ? (
          <Home
            onNavigateToCart={() => setCurrentPage('cart')}
            onNavigateBack={handleNavigateBack}
            orderType={orderType}
          />
        ) : (
          <Cart
            onNavigateToHome={() => setCurrentPage('home')}
            onNavigateBack={handleNavigateBack}
            orderType={orderType}
          />
        )}
      </div>
    </div>
  );
};

const AdminApp = () => {
  const [authenticated, setAuthenticated] = useState(false);

  if (!authenticated) {
    return <AdminLogin onLogin={() => setAuthenticated(true)} />;
  }

  return <AdminPanel onLogout={() => setAuthenticated(false)} />;
};

export const App = () => {
  return (
    <BrowserRouter>
      <CartProvider>
        <Routes>
          <Route path="/" element={<ClientApp />} />
          <Route path="/admin" element={<AdminApp />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </CartProvider>
    </BrowserRouter>
  );
};
