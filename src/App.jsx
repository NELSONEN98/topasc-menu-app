import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { CartProvider } from './context/CartContext';
import { NotificacionProvider } from './context/NotificacionContext';
import { StatusBar } from './components/organisms/StatusBar';
import { SplashScreen } from './pages/SplashScreen';
import { OrderType } from './pages/OrderType';
import { Home } from './pages/Home';
import { Cart } from './pages/Cart';
import { Loader } from './components/organisms/Loader';
import { AdminPanel } from './pages/AdminPanel';
import { Authenticated, Unauthenticated, AuthLoading } from 'convex/react';
import { SignIn, useClerk } from '@clerk/react';
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

const FONDO_ADMIN = {
  background: '#F2ECE3',
  minHeight: '100vh',
  height: '100%',
  width: '100%',
};

const CENTRADO = {
  ...FONDO_ADMIN,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  boxSizing: 'border-box',
};

const clerkListo = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

// El panel solo se monta con sesion valida. Igual esto es la puerta, no la
// cerradura: cada funcion de admin revalida la sesion en el servidor
// (convex/guardias.ts). Aunque alguien fuerce este componente a renderizar,
// no puede leer ni escribir nada.
const AdminAutenticado = () => {
  const { signOut } = useClerk();

  // Sin `redirectUrl`, Clerk manda a "/" al cerrar sesion y el admin termina
  // en el menu del cliente. Se vuelve a /admin: como ya no hay sesion, ahi lo
  // recibe el formulario de login, que es lo esperable despues de salir.
  return <AdminPanel onLogout={() => signOut({ redirectUrl: '/admin' })} />;
};

const AuthSinConfigurar = () => (
  <div style={CENTRADO}>
    <div
      style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '32px',
        maxWidth: '420px',
        textAlign: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      }}
    >
      <h1 style={{ fontSize: '18px', margin: '0 0 12px', color: '#241C15' }}>
        Panel no disponible
      </h1>
      <p style={{ fontSize: '14px', color: '#666', margin: 0, lineHeight: 1.5 }}>
        Falta configurar la autenticación (<code>VITE_CLERK_PUBLISHABLE_KEY</code>).
        El menú y los pedidos siguen funcionando con normalidad.
      </p>
    </div>
  </div>
);

const AdminApp = () => {
  if (!clerkListo) return <AuthSinConfigurar />;

  // Se usan los componentes de Convex y no los de Clerk a proposito: lo que
  // importa no es que Clerk diga "hay sesion", sino que Convex haya validado
  // el token. Con los de Clerk el panel se monta un instante antes de que
  // Convex este listo, y las queries de ese primer render fallan.
  return (
    <div style={FONDO_ADMIN}>
      <AuthLoading>
        <Loader message="Verificando sesión..." />
      </AuthLoading>

      <Authenticated>
        <AdminAutenticado />
      </Authenticated>

      <Unauthenticated>
        <div style={CENTRADO}>
          {/*
            Clerk manda a "/" por defecto en TODOS sus flujos, y cada uno se
            configura por separado: login, registro y cierre de sesion (este
            ultimo va en signOut, mas arriba). Sin esto el admin termina en el
            menu del cliente.

            Se usa `force` y no `fallback` porque este formulario solo existe
            dentro de /admin: no hay otro destino razonable al que volver.
          */}
          <SignIn
            routing="hash"
            forceRedirectUrl="/admin"
            signUpForceRedirectUrl="/admin"
          />
        </div>
      </Unauthenticated>
    </div>
  );
};

export const App = () => {
  return (
    <BrowserRouter>
      <NotificacionProvider>
        <CartProvider>
          <Routes>
            <Route path="/" element={<ClientApp />} />
            <Route path="/mesa/:codigo" element={<MesaApp />} />
            <Route path="/admin" element={<AdminApp />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </CartProvider>
      </NotificacionProvider>
    </BrowserRouter>
  );
};
