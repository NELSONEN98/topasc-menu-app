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

// pngTarjeta usa <canvas>, que jsdom no implementa. Se mockea solo eso para que
// el modal de QR pueda abrirse; lo demas del modulo va real.
vi.mock('../../../utils/qrMesa', async (importOriginal) => ({
  ...(await importOriginal()),
  pngTarjeta: vi.fn(async () => 'data:image/png;base64,FAKE'),
}));

const { MesasSection } = await import('./MesasSection');

const SEDES = [
  { _id: 'sede_dalia', nombre: 'Sede Dalia', activo: true },
  { _id: 'sede_morichal', nombre: 'Sede Morichal', activo: true },
];

const MESAS = [
  // Fuera de orden y con dos digitos a proposito: ordenar strings pondria la
  // 10 antes que la 2.
  { _id: 'mesa_10', numero: '10', codigo: 'K7M2QX', sedeId: 'sede_morichal', activo: true },
  { _id: 'mesa_2', numero: '2', codigo: 'B3N8RT', sedeId: 'sede_dalia', activo: true },
  { _id: 'mesa_9', numero: '9', codigo: 'VIEJA1', activo: false },
];

/** El hook pide mesas y despues sedes, en ese orden, en cada render. */
const responderQueries = (mesas = MESAS, sedes = SEDES) => {
  let llamada = 0;
  useQueryMock.mockImplementation(() => (llamada++ % 2 === 0 ? mesas : sedes));
};

const montar = () =>
  render(
    <NotificacionProvider>
      <MesasSection />
    </NotificacionProvider>
  );

beforeEach(() => {
  vi.clearAllMocks();
  responderQueries();
});

describe('MesasSection', () => {
  test('lista las mesas con su sede y su codigo de QR', () => {
    montar();

    expect(screen.getByText('Mesa 2')).toBeInTheDocument();
    expect(screen.getByText('Sede Dalia')).toBeInTheDocument();
    expect(screen.getByText('B3N8RT')).toBeInTheDocument();
  });

  test('ordena por numero y no alfabeticamente', () => {
    montar();

    const filas = screen.getAllByText(/^Mesa \d+$/).map((n) => n.textContent);

    // Ordenando strings, "10" iria antes que "2".
    expect(filas).toEqual(['Mesa 2', 'Mesa 9', 'Mesa 10']);
  });

  test('marca las mesas sin sede', () => {
    montar();

    // No estan rotas, pero su pedido cae al numero de respaldo: tiene que
    // saltar a la vista en una lista larga.
    expect(screen.getByText('Sin sede')).toBeInTheDocument();
  });

  test('avisa cuantas mesas quedan sin sede', () => {
    montar();

    expect(screen.getByText(/1 mesa\(s\) todavía sin sede/)).toBeInTheDocument();
  });

  test('no muestra el aviso cuando todas tienen sede', () => {
    vi.clearAllMocks();
    responderQueries(MESAS.filter((m) => m.sedeId));
    montar();

    expect(screen.queryByText(/todavía sin sede/)).not.toBeInTheDocument();
  });

  test('el switch refleja si el QR de la mesa esta activo', () => {
    montar();

    expect(
      screen.getByRole('button', { name: /Mesa 2: QR activo/ })
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: /Mesa 9: QR inactivo/ })
    ).toHaveAttribute('aria-pressed', 'false');
  });

  test('el modal de edicion muestra el codigo como solo lectura', async () => {
    const usuario = userEvent.setup();
    montar();

    await usuario.click(screen.getByRole('button', { name: /Editar mesa 2/ }));

    // Cambiarlo dejaria el QR impreso apuntando a la nada.
    const codigo = screen.getByLabelText(/Código del QR/);
    expect(codigo).toHaveValue('B3N8RT');
    expect(codigo).toBeDisabled();
  });

  test('el modal de alta no pide codigo: lo genera el servidor', async () => {
    const usuario = userEvent.setup();
    montar();

    await usuario.click(screen.getByRole('button', { name: /Agregar mesa/ }));

    expect(screen.getByRole('heading', { name: 'Agregar Mesa' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Código del QR/)).not.toBeInTheDocument();
  });

  test('el modal de alta NO preselecciona sede: adivinarla mandaria el pedido mal', async () => {
    const usuario = userEvent.setup();
    montar();

    await usuario.click(screen.getByRole('button', { name: /Agregar mesa/ }));

    expect(screen.getByLabelText(/Sede/)).toHaveValue('');
  });

  test('cada mesa ofrece ver su QR', () => {
    montar();

    // Es lo que le saca al admin la dependencia de correr `npm run qr` en una
    // terminal cada vez que agrega una mesa.
    expect(screen.getAllByRole('button', { name: /Ver el QR de la mesa/ })).toHaveLength(3);
  });

  test('abre el QR de la mesa que se clickeo', async () => {
    const usuario = userEvent.setup();
    montar();

    await usuario.click(screen.getByRole('button', { name: /Ver el QR de la mesa 2/ }));

    expect(screen.getByRole('heading', { name: 'QR de la mesa 2' })).toBeInTheDocument();
  });

  test('el QR de una mesa sin sede avisa antes de imprimir', async () => {
    const usuario = userEvent.setup();
    montar();

    await usuario.click(screen.getByRole('button', { name: /Ver el QR de la mesa 9/ }));

    expect(screen.getByText(/no tiene sede asignada/)).toBeInTheDocument();
  });

  test('sin mesas cargadas muestra el mensaje de vacio', () => {
    vi.clearAllMocks();
    responderQueries([], SEDES);
    montar();

    expect(screen.getByText(/Todavía no hay mesas cargadas/)).toBeInTheDocument();
  });
});
