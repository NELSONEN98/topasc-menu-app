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

const { HorarioSection } = await import('./HorarioSection');

const SEDES = [
  { _id: 'sede_dalia', nombre: 'Sede Dalia', activo: true },
  { _id: 'sede_morichal', nombre: 'Sede Morichal', activo: true },
];

const ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0];

/** Los 7 dias, todos heredados salvo los que se indiquen. */
const semana = (excepciones = {}) =>
  ORDEN_SEMANA.map((diaSemana) => ({
    _id: excepciones[diaSemana] ? `h_${diaSemana}` : null,
    diaSemana,
    horaApertura: '11:00',
    horaCierre: '23:00',
    cerrado: false,
    heredado: !excepciones[diaSemana],
    ...(excepciones[diaSemana] || {}),
  }));

/** El hook pide sedes y despues horarios, en ese orden, en cada render. */
const responderQueries = (horarios = semana(), sedes = SEDES) => {
  let llamada = 0;
  useQueryMock.mockImplementation(() => (llamada++ % 2 === 0 ? sedes : horarios));
};

/**
 * Solo las chapitas de las tarjetas, no la palabra suelta del texto de ayuda.
 *
 * Con `selector` y no `getAllByText` a secas: la palabra "General" tambien
 * aparece dentro del parrafo explicativo de arriba, y sin acotar la busqueda el
 * test contaria ese <strong> como si fuera una tarjeta mas.
 */
const badgesGeneral = () =>
  screen.getAllByText('General', { selector: '.horario-badge-general' });

const montar = () =>
  render(
    <NotificacionProvider>
      <HorarioSection />
    </NotificacionProvider>
  );

beforeEach(() => {
  vi.clearAllMocks();
  responderQueries();
});

describe('HorarioSection — vista general', () => {
  test('muestra los siete dias', () => {
    montar();

    expect(screen.getByText('Lunes')).toBeInTheDocument();
    expect(screen.getByText('Domingo')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Editar el horario/ })).toHaveLength(7);
  });

  test('arranca editando el general', () => {
    montar();

    expect(screen.getByLabelText(/Editando el horario de/)).toHaveValue('');
    expect(screen.getByText(/Este es el horario base/)).toBeInTheDocument();
  });

  test('el selector lista todas las sedes ademas del general', () => {
    montar();

    const opciones = screen.getAllByRole('option').map((o) => o.textContent);
    expect(opciones).toEqual([
      'Todas las sedes (general)',
      'Sede Dalia',
      'Sede Morichal',
    ]);
  });

  test('en el general no se marca nada como heredado', () => {
    montar();

    // Todo dia del general ES el original: la marca no tendria sentido.
    expect(screen.queryByText('General')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Volver al horario general/ })
    ).not.toBeInTheDocument();
  });
});

describe('HorarioSection — vista por sede', () => {
  const verSede = async (usuario) => {
    await usuario.selectOptions(
      screen.getByLabelText(/Editando el horario de/),
      'sede_morichal'
    );
  };

  test('marca los dias que siguen al horario general', async () => {
    const usuario = userEvent.setup();
    montar();
    await verSede(usuario);

    // Sin la marca, "abre 11:00 porque alguien lo decidio" y "abre 11:00
    // porque nadie lo toco" se ven identicos.
    expect(badgesGeneral()).toHaveLength(7);
  });

  test('un dia con horario propio no se marca como heredado', async () => {
    const usuario = userEvent.setup();
    vi.clearAllMocks();
    responderQueries(semana({ 1: { heredado: false, horaApertura: '14:00' } }));
    montar();
    await verSede(usuario);

    expect(badgesGeneral()).toHaveLength(6);
  });

  test('solo el dia desenganchado ofrece volver al general', async () => {
    const usuario = userEvent.setup();
    vi.clearAllMocks();
    responderQueries(semana({ 1: { heredado: false } }));
    montar();
    await verSede(usuario);

    // Sobre un dia que ya hereda no hay nada que restaurar.
    const botones = screen.getAllByRole('button', { name: /Volver al horario general/ });
    expect(botones).toHaveLength(1);
    expect(botones[0]).toHaveAccessibleName(/Lunes/);
  });

  test('el aviso explica que los dias heredados siguen al general', async () => {
    const usuario = userEvent.setup();
    montar();
    await verSede(usuario);

    expect(screen.getByText(/siguen al horario/)).toBeInTheDocument();
    expect(screen.queryByText(/Este es el horario base/)).not.toBeInTheDocument();
  });

  test('el resumen cuenta cuantos dias siguen al general', async () => {
    const usuario = userEvent.setup();
    vi.clearAllMocks();
    responderQueries(semana({ 1: { heredado: false } }));
    montar();
    await verSede(usuario);

    expect(screen.getByText(/6 siguen al general/)).toBeInTheDocument();
  });
});
