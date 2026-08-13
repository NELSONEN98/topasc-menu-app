import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificacionProvider } from '../../../context/NotificacionContext';

const { useQueryMock, mutacionMock } = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  mutacionMock: vi.fn(),
}));

vi.mock('convex/react', () => ({
  useQuery: useQueryMock,
  useMutation: () => mutacionMock,
}));

const { SedesSection } = await import('./SedesSection');

const SEDES = [
  {
    _id: 'sede_dalia',
    nombre: 'Sede Dalia',
    direccion: 'Carrera 8 # 18-203',
    whatsapp: '573206873870',
    costoDomicilio: 8000,
    activo: true,
  },
  {
    _id: 'sede_morichal',
    nombre: 'Sede Morichal',
    whatsapp: '573206873871',
    activo: false,
  },
];

const ITEMS = [{ _id: 'item_1', sedeIds: ['sede_dalia'] }];

/** El hook pide sedes y despues items, en ese orden, en cada render. */
const responderQueries = (sedes = SEDES, items = ITEMS) => {
  let llamada = 0;
  useQueryMock.mockImplementation(() => (llamada++ % 2 === 0 ? sedes : items));
};

const montar = () =>
  render(
    <NotificacionProvider>
      <SedesSection />
    </NotificacionProvider>
  );

beforeEach(() => {
  vi.clearAllMocks();
  responderQueries();
});

describe('SedesSection', () => {
  test('lista las sedes con su direccion y su whatsapp', () => {
    montar();

    expect(screen.getByText('Sede Dalia')).toBeInTheDocument();
    expect(screen.getByText('Carrera 8 # 18-203')).toBeInTheDocument();
    expect(screen.getByText('573206873870')).toBeInTheDocument();
  });

  test('una sede sin direccion se muestra igual, avisando que falta', () => {
    montar();

    // No puede desaparecer de la tabla solo porque le falte un campo opcional.
    expect(screen.getByText('Sede Morichal')).toBeInTheDocument();
    expect(screen.getByText('Sin dirección')).toBeInTheDocument();
  });

  test('muestra el costo de domicilio de cada sede', () => {
    montar();

    // Regex sobre los digitos y no el string exacto: Intl.NumberFormat
    // intercala un espacio entre el simbolo y el numero, y como se formatea
    // depende de la version de ICU del entorno. Fijar "$ 8.000" haria fallar
    // el test en otra maquina por una razon que no es la que se esta probando.
    expect(screen.getByText(/8\.000/)).toBeInTheDocument();
    // Morichal no lo tiene cargado: usa el de respaldo de la app.
    expect(screen.getByText('Por defecto')).toBeInTheDocument();
  });

  test('un domicilio en cero se lee "Gratis", no "Por defecto"', () => {
    vi.clearAllMocks();
    responderQueries([{ ...SEDES[0], costoDomicilio: 0 }]);
    montar();

    expect(screen.getByText('Gratis')).toBeInTheDocument();
    expect(screen.queryByText('Por defecto')).not.toBeInTheDocument();
  });

  test('el resumen cuenta el total y cuantas estan activas', () => {
    montar();

    expect(screen.getByText(/2 sedes · 1 activas/)).toBeInTheDocument();
  });

  test('deshabilita Eliminar en la sede que tiene productos marcados', () => {
    montar();

    // Espejo en la UI de la guarda del servidor: borrarla dejaria ids colgados
    // dentro de `sedeIds`.
    expect(screen.getByRole('button', { name: /Eliminar Sede Dalia/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Eliminar Sede Morichal/ })).toBeEnabled();
  });

  test('muestra cuantos productos tiene marcados cada sede', () => {
    montar();

    expect(screen.getByText('1 producto')).toBeInTheDocument();
    expect(screen.getByText('Sin productos')).toBeInTheDocument();
  });

  test('el switch de estado refleja si la sede esta activa', () => {
    montar();

    expect(
      screen.getByRole('button', { name: /Sede Dalia: visible/ })
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: /Sede Morichal: oculta/ })
    ).toHaveAttribute('aria-pressed', 'false');
  });

  test('abre el modal de alta desde el boton del header', async () => {
    const usuario = userEvent.setup();
    montar();

    await usuario.click(screen.getByRole('button', { name: /Agregar sede/ }));

    expect(screen.getByRole('heading', { name: 'Agregar Sede' })).toBeInTheDocument();
  });

  test('abre el modal de edicion con la sede precargada', async () => {
    const usuario = userEvent.setup();
    montar();

    await usuario.click(screen.getByRole('button', { name: /Editar Sede Dalia/ }));

    expect(screen.getByRole('heading', { name: 'Editar Sede' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre/)).toHaveValue('Sede Dalia');
  });

  test('sin sedes cargadas muestra el mensaje de vacio', () => {
    vi.clearAllMocks();
    responderQueries([], []);
    montar();

    expect(screen.getByText(/Todavía no hay sedes cargadas/)).toBeInTheDocument();
  });
});
