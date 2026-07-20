import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { CartProvider } from './context/CartContext';
import { StatusBar } from './components/organisms/StatusBar';
import { SplashScreen } from './pages/SplashScreen';
import { OrderType } from './pages/OrderType';
import { Home } from './pages/Home';
import { Cart } from './pages/Cart';
import { Loader } from './components/organisms/Loader';
import { AdminPanel } from './pages/AdminPanel';
import { AdminLogin } from './pages/AdminLogin';
import { useCart } from './context/CartContext';
import './styles/global.css';

// mesa: cuando viene por QR, el pedido queda "clavado" a esa mesa —
// se saltea la elección de tipo de orden y el modal de número de mesa.
const ClientApp = ({ mesa = null }) => {
  const { clearCart } = useCart();
  const lockedToTable = !!mesa;
  const [showSplash, setSplash] = useState(!lockedToTable);
  const [currentPage, setCurrentPage] = useState(
    lockedToTable ? 'home' : 'order-type'
  );
  const [orderType, setOrderType] = useState(lockedToTable ? 'dine-in' : null);

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
            onNavigateBack={lockedToTable ? undefined : handleNavigateBack}
            orderType={orderType}
            mesa={mesa}
          />
        ) : (
          <Cart
            onNavigateToHome={() => setCurrentPage('home')}
            onNavigateBack={lockedToTable ? undefined : handleNavigateBack}
            orderType={orderType}
            mesa={mesa}
          />
        )}
      </div>
    </div>
  );
};

// Entrada por QR: /mesa/:codigo → identifica la mesa y arranca en dine-in.
const MesaApp = () => {
  const { codigo } = useParams();
  const mesa = useQuery(api.mesas.porCodigo, { codigo });

  if (mesa === undefined) {
    return (
      <div className="phone-shell">
        <Loader message="Buscando tu mesa..." />
      </div>
    );
  }

  // mesa === null → código inválido o inactivo: caemos al flujo normal
  // para no dejar al cliente varado (puede pedir igual eligiendo el tipo).
  return <ClientApp mesa={mesa} />;
};

const AdminApp = () => {
  return (
    <div style={{ background: '#F2ECE3', minHeight: '100vh', height: '100%', width: '100%' }}>
      <AdminPanel onLogout={() => {}} />
    </div>
  );
};

export const App = () => {
  return (
    <BrowserRouter>
      <CartProvider>
        <Routes>
          <Route path="/" element={<ClientApp />} />
          <Route path="/mesa/:codigo" element={<MesaApp />} />
          <Route path="/admin" element={<AdminApp />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </CartProvider>
    </BrowserRouter>
  );
};
