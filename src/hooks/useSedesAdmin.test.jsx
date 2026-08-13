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

const { useSedesAdmin } = await import('./useSedesAdmin');

const wrapper = ({ children }) => (
  <NotificacionProvider>{children}</NotificacionProvider>
);

const montar = () => renderHook(() => useSedesAdmin(), { wrapper });

const SEDE_VALIDA = {
  nombre: 'Sede Morichal',
  direccion: 'Calle 1 # 2-3',
  whatsapp: '573206873870',
  activo: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  useQueryMock.mockReturnValue([]);
});

describe('useSedesAdmin.guardar — validaciones', () => {
  test('sin nombre no guarda', async () => {
    const { result } = montar();

    await act(async () => {
      await result.current.acciones.guardar({ ...SEDE_VALIDA, nombre: '  ' });
    });

    expect(mutacionMock).not.toHaveBeenCalled();
  });

  test('un whatsapp sin digitos no guarda', async () => {
    const { result } = montar();

    await act(async () => {
      await result.current.acciones.guardar({ ...SEDE_VALIDA, whatsapp: '+ - ()' });
    });

    // Espejo de la validacion del servidor: aca es UX (avisar antes de mandar),
    // la que protege los datos es la de la mutation.
    expect(mutacionMock).not.toHaveBeenCalled();
    expect(screen.getByText(/WhatsApp/i)).toBeInTheDocument();
  });

  test('una sede valida se guarda', async () => {
    const { result } = montar();

    await act(async () => {
      await result.current.acciones.guardar(SEDE_VALIDA);
    });

    expect(mutacionMock).toHaveBeenCalledWith(
      expect.objectContaining({ nombre: 'Sede Morichal', whatsapp: '573206873870' })
    );
  });

  test('sin direccion se guarda igual: es opcional', async () => {
    const { result } = montar();

    await act(async () => {
      await result.current.acciones.guardar({ ...SEDE_VALIDA, direccion: '' });
    });

    expect(mutacionMock).toHaveBeenCalledTimes(1);
  });
});

describe('useSedesAdmin — conteo de productos por sede', () => {
  test('solo cuenta los productos que la tienen marcada explicitamente', async () => {
    const SEDES = [{ _id: 'sede_dalia', nombre: 'Sede Dalia', activo: true }];
    const ITEMS = [
      { _id: 'item_1', sedeIds: ['sede_dalia'] },
      { _id: 'item_2', sedeIds: ['sede_dalia', 'sede_morichal'] },
      // Sin sedeIds: se ve en todas por el fallback, pero no apunta a
      // ninguna, asi que no bloquea el borrado de ninguna sede.
      { _id: 'item_3' },
    ];

    /*
     * El hook llama useQuery dos veces por render: primero sedes, despues
     * items. Se responde por posicion alternando, y NO con mockReturnValueOnce:
     * esa se agota en el primer render y cualquier re-render posterior
     * recibiria [], haciendo fallar el test por una razon que no es la que se
     * esta probando.
     */
    let llamada = 0;
    useQueryMock.mockImplementation(() => (llamada++ % 2 === 0 ? SEDES : ITEMS));

    const { result } = montar();

    expect(result.current.productosPorSede.sede_dalia).toBe(2);
    expect(result.current.productosPorSede.sede_morichal).toBe(1);
  });
});
