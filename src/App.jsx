import { useState } from 'react';
import { CartProvider } from './context/CartContext';
import { StatusBar } from './components/organisms/StatusBar';
import { SplashScreen } from './pages/SplashScreen';
import { OrderType } from './pages/OrderType';
import { Home } from './pages/Home';
import { Cart } from './pages/Cart';
import './styles/global.css';

export const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [currentPage, setCurrentPage] = useState('order-type');
  const [orderType, setOrderType] = useState(null);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <CartProvider>
      <div className="phone-shell">
        <StatusBar />
        <div className="scroll-area">
          {currentPage === 'order-type' ? (
            <OrderType
              onSelectType={(type) => {
                setOrderType(type);
                setCurrentPage('home');
              }}
            />
          ) : currentPage === 'home' ? (
            <Home
              onNavigateToCart={() => setCurrentPage('cart')}
              onNavigateBack={() => setCurrentPage('order-type')}
              orderType={orderType}
            />
          ) : (
            <Cart
              onNavigateToHome={() => setCurrentPage('home')}
              onNavigateBack={() => setCurrentPage('order-type')}
              orderType={orderType}
            />
          )}
        </div>
      </div>
    </CartProvider>
  );
};
