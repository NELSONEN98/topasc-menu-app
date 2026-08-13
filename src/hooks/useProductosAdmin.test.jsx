import { beforeEach, describe, expect, test, vi } from 'vitest';
import { renderHook, act, screen } from '@testing-library/react';
import { NotificacionProvider } from '../context/NotificacionContext';

/*
 * vi.hoisted porque vi.mock se eleva por encima de los imports: sin esto, las
 * referencias a los mocks todavia no existirian cuando el mock se registra.
 *
 * Las tres mutations del hook (crear, actualizar, borrar) comparten un mismo
 * mock a proposito. Alcanza: en cada test corre una sola de las tres, asi que
 * "se llamo la mutation" identifica sin ambiguedad a cual.
 */
const { useQueryMock, mutacionMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  mutacionMock: vi.fn(),
}));

vi.mock('convex/react', () => ({
  useQuery: useQueryMock,
  useMutation: () => mutacionMock,
}));

const { useProductosAdmin } = await import('./useProductosAdmin');

const wrapper = ({ children }) => (
  <NotificacionProvider>{children}</NotificacionProvider>
);

const montar = () => renderHook(() => useProductosAdmin(), { wrapper });

const PRODUCTO_VALIDO = {
  nombre: 'Salchipapa Sencilla',
  categoriaId: 'cat_1',
  precio: 18000,
  descripcion: '',
  ingredientes: [],
  imagenUrl: '',
  disponible: true,
  llevaSalsas: true,
  sedeIds: ['sede_dalia'],
};

beforeEach(() => {
  vi.clearAllMocks();
  useQueryMock.mockReturnValue([]);
});

describe('useProductosAdmin.guardar — validaciones', () => {
  test('sin sedes NO guarda y lo explica', async () => {
    const { result } = montar();

    await act(async () => {
      await result.current.acciones.guardar({ ...PRODUCTO_VALIDO, sedeIds: [] });
    });

    /*
     * Es el corte mas importante del hook. Del lado del servidor un array
     * vacio significa "todas las sedes" (por los items previos al campo), asi
     * que guardar sin marcar ninguna lograria justo lo contrario de lo que el
     * admin cree estar haciendo.
     */
    expect(mutacionMock).not.toHaveBeenCalled();
    expect(screen.getByText(/al menos una sede/i)).toBeInTheDocument();
  });

  test('con sedeIds undefined tampoco guarda', async () => {
    const { result } = montar();

    await act(async () => {
      await result.current.acciones.guardar({
        ...PRODUCTO_VALIDO,
        sedeIds: undefined,
      });
    });

    expect(mutacionMock).not.toHaveBeenCalled();
  });

  test('sin nombre no guarda', async () => {
    const { result } = montar();

    await act(async () => {
      await result.current.acciones.guardar({ ...PRODUCTO_VALIDO, nombre: '   ' });
    });

    expect(mutacionMock).not.toHaveBeenCalled();
  });

  test('sin categoria no guarda', async () => {
    const { result } = montar();

    await act(async () => {
      await result.current.acciones.guardar({ ...PRODUCTO_VALIDO, categoriaId: '' });
    });

    expect(mutacionMock).not.toHaveBeenCalled();
  });

  test('con precio 0 no guarda', async () => {
    const { result } = montar();

    await act(async () => {
      await result.current.acciones.guardar({ ...PRODUCTO_VALIDO, precio: 0 });
    });

    expect(mutacionMock).not.toHaveBeenCalled();
  });

  test('un producto valido se guarda con sus sedes', async () => {
    const { result } = montar();

    await act(async () => {
      await result.current.acciones.guardar({
        ...PRODUCTO_VALIDO,
        sedeIds: ['sede_dalia', 'sede_morichal'],
      });
    });

    expect(mutacionMock).toHaveBeenCalledTimes(1);
    expect(mutacionMock).toHaveBeenCalledWith(
      expect.objectContaining({ sedeIds: ['sede_dalia', 'sede_morichal'] })
    );
  });
});
