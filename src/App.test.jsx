import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { NotificacionProvider } from './context/NotificacionContext';

/*
 * Las entradas DIRECTAS al flujo de pedido: /domicilios y el QR de una mesa.
 *
 * Lo que se prueba es que el link caiga donde promete. Es cuatro líneas de props
 * encadenadas, pero "arranca en el menú" y "sin botón de volver" son exactamente
 * lo que regresa en silencio cuando alguien toca ClientApp: nada falla, el link
 * simplemente deja de hacer lo que decía.
 *
 * Las queries van mockeadas devolviendo undefined, que es lo que pasa mientras
 * cargan: las pantallas tienen que renderizar igual. Clerk y el panel no entran
 * porque ClientApp no los toca.
 */
vi.mock('convex/react', () => ({
  useQuery: vi.fn(),
  useMutation: () => vi.fn(),
  Authenticated: ({ children }) => children,
  Unauthenticated: () => null,
  AuthLoading: () => null,
}));

vi.mock('@clerk/react', () => ({
  SignIn: () => null,
  useClerk: () => ({ signOut: vi.fn() }),
}));

const { ClientApp } = await import('./App');

/*
 * Timers falsos para pasar el splash.
 *
 * Sin esto los tests daban VERDE por el motivo equivocado: la pantalla de tipo de
 * orden no aparecía porque estaba el splash adelante, no porque el link fuera al
 * menú. Un falso positivo que habría dejado /domicilios sin cubrir mientras el
 * test decía que sí.
 */
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

const abrir = (props = {}) => {
  const utils = render(
    <MemoryRouter>
      <NotificacionProvider>
        <CartProvider>
          <ClientApp {...props} />
        </CartProvider>
      </NotificacionProvider>
    </MemoryRouter>
  );

  // El splash se cierra con un setTimeout: se adelanta para llegar a la pantalla
  // que cada test dice estar probando.
  act(() => {
    vi.advanceTimersByTime(5000);
  });

  return utils;
};

const pantallaDeTipo = () => screen.queryByText(/Cómo prefieres tu orden/);
const botonVolver = () => screen.queryByRole('button', { name: /Cambiar tipo de orden/ });

describe('/domicilios — el link que se comparte para pedir a domicilio', () => {
  test('entra DIRECTO al menú, sin preguntar el tipo de orden', () => {
    // Es lo único que el link promete: compartirlo y que el cliente empiece a
    // armar su pedido. Si cayera en "¿Cómo prefieres tu orden?" no serviría de
    // nada — sería igual que mandar la raíz.
    abrir({ tipoInicial: 'delivery' });

    // Las DOS afirmaciones, y la positiva importa más: "no veo la pantalla de
    // tipo" también sería verdad si quedara en el splash o en una pantalla vacía.
    // El filtro "Todos" solo existe en el menú.
    expect(screen.getByRole('button', { name: 'Todos' })).toBeInTheDocument();
    expect(pantallaDeTipo()).not.toBeInTheDocument();
  });

  test('NO muestra el botón de volver', () => {
    // No hay pantalla anterior a la que regresar, y un botón que te saca del flujo
    // que el link prometía es peor que no tenerlo.
    abrir({ tipoInicial: 'delivery' });

    expect(botonVolver()).not.toBeInTheDocument();
  });

  test('tampoco muestra el banner de sede', () => {
    // En domicilio la sede se elige al FINAL, en el modal de dirección: de ella
    // salen el costo del envío y el WhatsApp de destino. Mostrar una sede acá
    // sería afirmar algo que todavía no se decidió.
    abrir({ tipoInicial: 'delivery' });

    expect(screen.queryByText(/Pides desde/)).not.toBeInTheDocument();
  });
});

describe('entrada normal por la raíz', () => {
  test('SÍ pregunta el tipo de orden', () => {
    // El otro lado del contrato: el link directo no puede haberse comido la
    // pantalla de elección para quien entra por la raíz.
    abrir();

    expect(pantallaDeTipo()).toBeInTheDocument();
  });

  test('ya NO pide elegir sede antes del menú', () => {
    // La pantalla de sede al entrar se quitó: ninguna rama la necesita antes de
    // ver el menú. Si alguien la repone, este test lo frena.
    abrir();

    expect(screen.queryByText(/Elegí tu sede|Elegi tu sede/i)).not.toBeInTheDocument();
  });
});

describe('entrada por el QR de una mesa', () => {
  test('entra directo al menú y sin botón de volver', () => {
    // Mismo criterio que /domicilios: el tipo viene dado y no hay nada que elegir.
    abrir({ mesa: { _id: 'mesa_1', numero: '5', codigo: 'A34', sede: null } });

    expect(pantallaDeTipo()).not.toBeInTheDocument();
    expect(botonVolver()).not.toBeInTheDocument();
  });

  test('avisa en qué mesa está sentado', () => {
    abrir({ mesa: { _id: 'mesa_1', numero: '5', codigo: 'A34', sede: null } });

    expect(screen.getByText(/Mesa 5/)).toBeInTheDocument();
  });
});
