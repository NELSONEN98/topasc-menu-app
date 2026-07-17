import { useState } from 'react';
import { CartProvider } from './context/CartContext';
import { StatusBar } from './components/organisms/StatusBar';
import { SplashScreen } from './pages/SplashScreen';
import { OrderType } from './pages/OrderType';
import { Home } from './pages/Home';
import { Cart } from './pages/Cart';
import { AdminPanel } from './pages/AdminPanel';
import { useCart } from './context/CartContext';
import './styles/global.css';

const AppContent = () => {
  const { clearCart } = useCart();
  const [currentPage, setCurrentPage] = useState('order-type');
  const [orderType, setOrderType] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const handleSelectType = (type) => {
    clearCart();
    setOrderType(type);
    setCurrentPage('home');
  };

  const handleNavigateBack = () => {
    clearCart();
    setCurrentPage('order-type');
  };

  if (isAdmin) {
    return <AdminPanel onLogout={() => setIsAdmin(false)} />;
  }

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
      <button
        onClick={() => setIsAdmin(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          background: '#333',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          fontSize: '20px',
          zIndex: 999,
        }}
        title="Admin"
      >
        ⚙️
      </button>
    </>
  );
};

export const App = () => {
  const [showSplash, setShowSplash] = useState(true);

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
