import { beforeEach, describe, expect, test, vi } from 'vitest';
import { renderHook, act, screen } from '@testing-library/react';
import { NotificacionProvider } from '../context/NotificacionContext';

const { useQueryMock, mutacionMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  mutacionMock: vi.fn(),
}));

vi.mock('convex/react', () => ({
  useQuery: useQueryMock,
  useMutation: () => mutacionMock,
}));

const { useMesasAdmin } = await import('./useMesasAdmin');

const SEDES = [
  { _id: 'sede_dalia', nombre: 'Sede Dalia', activo: true },
  { _id: 'sede_morichal', nombre: 'Sede Morichal', activo: true },
];

const MESAS = [
  { _id: 'mesa_1', numero: '1', codigo: 'AAA111', sedeId: 'sede_dalia', activo: true },
  { _id: 'mesa_2', numero: '2', codigo: 'BBB222', sedeId: 'sede_dalia', activo: true },
];

/** El hook pide mesas y despues sedes, en ese orden, en cada render. */
const responderQueries = (mesas = MESAS, sedes = SEDES) => {
  let llamada = 0;
  useQueryMock.mockImplementation(() => (llamada++ % 2 === 0 ? mesas : sedes));
};

const wrapper = ({ children }) => (
  <NotificacionProvider>{children}</NotificacionProvider>
);

const montar = () => renderHook(() => useMesasAdmin(), { wrapper });

const MESA_VALIDA = { numero: '9', sedeId: 'sede_dalia', activo: true };

beforeEach(() => {
  vi.clearAllMocks();
  responderQueries();
});

describe('useMesasAdmin.guardar — validaciones', () => {
  test('sin numero no guarda', async () => {
    const { result } = montar();

    await act(async () => {
      await result.current.acciones.guardar({ ...MESA_VALIDA, numero: '  ' });
    });

    expect(mutacionMock).not.toHaveBeenCalled();
  });

  test('sin sede no guarda', async () => {
    const { result } = montar();

    await act(async () => {
      await result.current.acciones.guardar({ ...MESA_VALIDA, sedeId: '' });
    });

    // Sin sede el pedido cae al numero de respaldo y al menu sin filtrar:
    // exactamente el problema que esta pantalla existe para resolver.
    expect(mutacionMock).not.toHaveBeenCalled();
  });

  test('una mesa valida se guarda', async () => {
    const { result } = montar();

    await act(async () => {
      await result.current.acciones.guardar(MESA_VALIDA);
    });

    expect(mutacionMock).toHaveBeenCalledTimes(1);
  });
});

describe('useMesasAdmin — numero unico por sede', () => {
  test('rechaza un numero que ya existe en esa sede, y lo dice', async () => {
    const { result } = montar();

    await act(async () => {
      await result.current.acciones.guardar({ ...MESA_VALIDA, numero: '1' });
    });

    expect(mutacionMock).not.toHaveBeenCalled();
    // En produccion Convex oculta los mensajes del servidor: si este espejo no
    // existiera, el admin veria un "Server Error" pelado.
    expect(screen.getByText(/Ya existe una mesa 1 en Sede Dalia/)).toBeInTheDocument();
  });

  test('PERMITE el mismo numero en otra sede', async () => {
    const { result } = montar();

    await act(async () => {
      await result.current.acciones.guardar({
        ...MESA_VALIDA,
        numero: '1',
        sedeId: 'sede_morichal',
      });
    });

    expect(mutacionMock).toHaveBeenCalledTimes(1);
  });

  test('ignora espacios y mayusculas', async () => {
    responderQueries([
      { _id: 'mesa_t', numero: 'Terraza', codigo: 'CCC333', sedeId: 'sede_dalia', activo: true },
    ]);
    const { result } = montar();

    await act(async () => {
      await result.current.acciones.guardar({ ...MESA_VALIDA, numero: '  terraza ' });
    });

    expect(mutacionMock).not.toHaveBeenCalled();
  });

  test('una mesa no choca consigo misma al editarse', async () => {
    const { result } = montar();

    await act(async () => {
      result.current.modal.abrirEdicion(MESAS[0]);
    });

    await act(async () => {
      await result.current.acciones.guardar({
        numero: '1',
        sedeId: 'sede_dalia',
        activo: false,
      });
    });

    // Si el chequeo no se ignorara a si misma, editar solo el estado seria
    // imposible.
    expect(mutacionMock).toHaveBeenCalledTimes(1);
  });

  test('mover una mesa a un local que ya tiene ese numero se rechaza', async () => {
    responderQueries([
      ...MESAS,
      { _id: 'mesa_m1', numero: '1', codigo: 'DDD444', sedeId: 'sede_morichal', activo: true },
    ]);
    const { result } = montar();

    await act(async () => {
      result.current.modal.abrirEdicion({
        _id: 'mesa_m1',
        numero: '1',
        sedeId: 'sede_morichal',
      });
    });

    await act(async () => {
      await result.current.acciones.guardar({
        numero: '1',
        sedeId: 'sede_dalia',
        activo: true,
      });
    });

    // El numero no cambia, pero el duplicado se crea igual.
    expect(mutacionMock).not.toHaveBeenCalled();
  });
});
