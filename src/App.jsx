import { useState, useEffect } from 'react';
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

const AppContent = () => {
  const { clearCart } = useCart();
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

  return (
    <>
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
    </>
  );
};

export const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/admin')) {
      setIsAdminMode(true);
    }
  }, []);

  if (isAdminMode) {
    if (!adminAuthenticated) {
      return <AdminLogin onLogin={() => setAdminAuthenticated(true)} />;
    }
    return <AdminPanel onLogout={() => setAdminAuthenticated(false)} />;
  }

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <CartProvider>
      <div className="phone-shell">
        <StatusBar />
        <div className="scroll-area">
          <AppContent />
        </div>
      </div>
    </CartProvider>
  );
};
