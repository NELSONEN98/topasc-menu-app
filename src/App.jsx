import { useState, useEffect, useRef } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { CartProvider } from './context/CartContext';
import { NotificacionProvider } from './context/NotificacionContext';
import { StatusBar } from './components/organisms/StatusBar';
import { SplashScreen } from './pages/SplashScreen';
import { SedeSelect } from './pages/SedeSelect';
import { OrderType } from './pages/OrderType';
import { Home } from './pages/Home';
import { Cart } from './pages/Cart';
import { Loader } from './components/organisms/Loader';
import { AdminPanel } from './pages/AdminPanel';
import { Authenticated, Unauthenticated, AuthLoading } from 'convex/react';
import { SignIn, useClerk } from '@clerk/react';
import { useCart } from './context/CartContext';
import { sedePorSlug, slugDeSede } from './utils/sedeSlug';
import './styles/global.css';

// mesa: cuando viene por QR, el pedido queda "clavado" a esa mesa —
// se saltea la eleccion de sede y de tipo de orden: quien escanea el QR ya
// esta parado en un local especifico, no tiene sentido preguntarle cual.
//
// La sede sale de la propia mesa (`mesas:porCodigo` la resuelve y la devuelve
// junto con ella). Escanear el QR equivale a haber elegido esa sede a mano:
// el menu se filtra por ese local y el pedido va a SU WhatsApp.
//
// Una mesa sin sede —las que se crearon antes de que existiera el campo—
// arranca en null, igual que antes: menu completo y numero de respaldo. Se
// arregla asignandole la sede desde la pestana Mesas del panel.
const ClientApp = ({ mesa = null }) => {
  const { clearCart } = useCart();
  const navegar = useNavigate();
  const lockedToTable = !!mesa;
  const [showSplash, setSplash] = useState(!lockedToTable);
  /*
   * Arranca en el tipo de orden, NO en elegir sede.
   *
   * La pantalla de sede al entrar ya no hace falta y era un paso de mas para todos:
   *   - "Ver Menu" lleva a /menu, que pide la sede ahi (o la trae en la ruta).
   *   - Domicilio la pide en el modal de direccion, al final, que es lo que se
   *     pidio: el cliente arma el pedido y recien despues dice de donde quiere que
   *     se lo manden.
   *   - A dine-in se entra por el QR de la mesa, que ya trae su sede.
   *
   * Asi que ninguna rama necesita la sede antes de ver el menu. El menu se muestra
   * COMPLETO —`listarMenu` sin sede devuelve todo— y el checkout avisa si alguna
   * sede no puede preparar lo que el cliente armo.
   */
  const [currentPage, setCurrentPage] = useState(
    lockedToTable ? 'home' : 'order-type'
  );
  const [sede, setSede] = useState(mesa?.sede ?? null);
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
      <StatusBar sede={sede} />
      <div className="scroll-area">
        {currentPage === 'order-type' ? (
          <OrderType
            onSelectType={handleSelectType}
            /*
             * Sin sede va a /menu pelado, que la pide ahi. Con sede (entrada por el
             * QR de una mesa) va directo a la carta de ese local.
             *
             * Ya no se elige la sede antes de esta pantalla: la pide quien la
             * necesita, cuando la necesita.
             */
            onVerMenu={() =>
              navegar(sede ? `/menu/${slugDeSede(sede)}` : '/menu')
            }
            sede={sede}
          />
        ) : currentPage === 'home' ? (
          <Home
            onNavigateToCart={() => setCurrentPage('cart')}
            onNavigateBack={lockedToTable ? undefined : handleNavigateBack}
            orderType={orderType}
            mesa={mesa}
            sede={sede}
          />
        ) : (
          <Cart
            onNavigateToHome={() => setCurrentPage('home')}
            onNavigateBack={lockedToTable ? undefined : handleNavigateBack}
            orderType={orderType}
            mesa={mesa}
            sede={sede}
          />
        )}
      </div>
    </div>
  );
};

/*
 * /menu — la carta de SOLO LECTURA.
 *
 * El cliente lee y le pide al restaurante: no hay carrito, ni botón de agregar,
 * ni pedido por WhatsApp. Sirve para el QR de la mesa o de la pared en un local
 * donde el pedido se toma a mano.
 *
 * Es un componente aparte y NO una bandera dentro de ClientApp a proposito: ahi
 * vive toda la maquina de estados del pedido (tipo de orden, carrito, navegacion
 * al checkout) y nada de eso aplica. Meterlo como `if` habria dejado ese estado
 * colgando sin usar, que es justo donde se cuelan los bugs de "se puede pedir por
 * un camino que nadie miro".
 *
 * Pide la sede igual que el flujo normal, y eso NO es friccion al balde: los
 * productos y los precios se filtran por local, asi que sin elegirla el cliente
 * podria estar leyendo una carta que no es la de donde esta sentado — y pedirle al
 * mozo algo que ese local no vende.
 */
const MenuApp = () => {
  const [parametros] = useSearchParams();
  // `/menu/:slug` es la forma linda y compartible: /menu/sede-dalia.
  //
  // `?sede=<id>` se sigue aceptando y no es legacy muerto: es el fallback para
  // una sede cuyo slug no resuelve, y lo usan los links que ya circulen. Los dos
  // caminos terminan en el mismo estado.
  const { slug } = useParams();
  const sedeDeUrl = slug ?? parametros.get('sede');
  // Se piden aca y no solo dentro de SedeSelect para poder resolver `?sede=`.
  // Convex deduplica las queries iguales, asi que no es una consulta extra.
  const sedes = useQuery(api.sedes.listar);
  const [sede, setSede] = useState(null);
  const yaHidratado = useRef(false);

  /*
   * La sede de la URL se copia al estado UNA sola vez, y despues el estado es la
   * unica fuente de verdad.
   *
   * El ref es lo que permite que "Cambiar de sede" funcione: sin el, poner la sede
   * en null volveria a leer el parametro de la URL y la carta se quedaria clavada
   * en el mismo local — un boton que no hace nada. Mismo patron que ProductModal
   * usa para no pisar lo que el usuario esta escribiendo.
   */
  useEffect(() => {
    if (yaHidratado.current || !sedeDeUrl || sedes === undefined) return;

    // Se prueban las dos formas: primero el slug (la ruta linda) y despues el id
    // crudo del `?sede=`. Un slug o id invalido —QR viejo, sede borrada, sede
    // renombrada por alguien que no sabia— cae al selector en vez de dejar la
    // pantalla vacia sin explicacion. Un QR roto molesta; una pantalla en blanco
    // hace que el cliente crea que el local no existe.
    setSede(
      sedePorSlug(sedes, sedeDeUrl) ??
        sedes.find((s) => s._id === sedeDeUrl) ??
        null
    );
    yaHidratado.current = true;
  }, [sedeDeUrl, sedes]);

  // Con `?sede=` se espera a que resuelvan las sedes antes de decidir: si no, el
  // selector aparece un instante y salta solo, que se ve como un parpadeo roto.
  if (sedeDeUrl && !yaHidratado.current) {
    return (
      <div className="phone-shell">
        <Loader message="Abriendo la carta..." />
      </div>
    );
  }

  if (!sede) return (
    <div className="phone-shell">
      <div className="scroll-area">
        <SedeSelect onSelectSede={setSede} />
      </div>
    </div>
  );

  return (
    <div className="phone-shell">
      <StatusBar sede={sede} />
      <div className="scroll-area">
        <Home
          sede={sede}
          soloLectura
          // Vuelve a elegir sede en vez de ir al tipo de orden: es la unica
          // navegacion que tiene sentido en una carta.
          onNavigateBack={() => setSede(null)}
        />
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
        <Loader message="Verificando sesión..." showLogo={false} />
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
            {/* Carta de solo lectura: se lee y se pide en el local.
                /menu          -> pide elegir la sede
                /menu/:slug    -> la carta de ESA sede, lista para compartir */}
            <Route path="/menu" element={<MenuApp />} />
            <Route path="/menu/:slug" element={<MenuApp />} />
            <Route path="/mesa/:codigo" element={<MesaApp />} />
            <Route path="/admin" element={<AdminApp />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </CartProvider>
      </NotificacionProvider>
    </BrowserRouter>
  );
};
