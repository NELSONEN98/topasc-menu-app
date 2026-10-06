import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddressModal } from './AddressModal';
import { NotificacionProvider } from '../../context/NotificacionContext';

const DALIA = { _id: 'sede_dalia', nombre: 'TOPASC DALIAS', costoDomicilio: 2000 };
const MORICHAL = { _id: 'sede_morichal', nombre: 'TOPASC MORICHAL', costoDomicilio: 0 };

// Morichal no puede con el carrito: le falta la hamburguesa.
const POSIBLES = [
  { sede: DALIA, puede: true, faltantes: [] },
  { sede: MORICHAL, puede: false, faltantes: ['Hamburguesa topasc'] },
];

const TODAS_PUEDEN = [
  { sede: DALIA, puede: true, faltantes: [] },
  { sede: MORICHAL, puede: true, faltantes: [] },
];

const abrir = (sedesPosibles = TODAS_PUEDEN) => {
  const onConfirm = vi.fn();

  render(
    <NotificacionProvider>
      <AddressModal
        onConfirm={onConfirm}
        onCancel={() => {}}
        sedesPosibles={sedesPosibles}
      />
    </NotificacionProvider>
  );

  return { onConfirm };
};

/** Completa todo lo obligatorio menos la sede. */
const llenarDatos = async (usuario) => {
  await usuario.type(screen.getByPlaceholderText(/Tu nombre/), 'Juan Pérez');
  await usuario.type(screen.getByPlaceholderText(/Tu teléfono/), '3001234567');
  await usuario.type(screen.getByPlaceholderText(/Calle, número/), 'Barrio Manzanares');
  // El selector de pago usa botones con aria-pressed, no radios.
  await usuario.click(screen.getByRole('button', { name: /Efectivo/ }));
};

const radioSede = (nombre) => screen.getByRole('radio', { name: new RegExp(nombre) });

describe('AddressModal — la sede se elige acá, al final', () => {
  test('ofrece las sedes para que el cliente elija', () => {
    // El cambio de fondo: antes la sede se elegía al ENTRAR a la app, antes de ver
    // un solo producto. Ahora el cliente arma el pedido y después dice de dónde.
    abrir();

    expect(screen.getByText(/Desde qué sede te lo enviamos/)).toBeInTheDocument();
    expect(radioSede('TOPASC DALIAS')).toBeInTheDocument();
    expect(radioSede('TOPASC MORICHAL')).toBeInTheDocument();
  });

  test('NO viene preseleccionada, ni cuando hay una sola', () => {
    // El costo del domicilio cambia entre sedes: elegir por el cliente sería
    // cobrarle un envío que no eligió.
    abrir([{ sede: DALIA, puede: true, faltantes: [] }]);

    expect(radioSede('TOPASC DALIAS')).not.toBeChecked();
  });

  test('muestra el costo de envío de cada sede', () => {
    // Cambia entre locales —una gratis, otra $2.000— y es un dato con el que el
    // cliente va a querer elegir. Esconderlo hasta el total sería cobrarle sin
    // decirle.
    abrir();

    expect(screen.getByText('Envío gratis')).toBeInTheDocument();
    expect(screen.getByText(/Envío \$2\.000/)).toBeInTheDocument();
  });

  test('la sede elegida viaja en el confirm', async () => {
    // De ella sale el WhatsApp al que llega el pedido: es el dato más importante.
    const usuario = userEvent.setup();
    const { onConfirm } = abrir();

    await llenarDatos(usuario);
    await usuario.click(radioSede('TOPASC MORICHAL'));
    await usuario.click(screen.getByRole('button', { name: /Confirmar/ }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm.mock.calls[0][0].sede).toEqual(MORICHAL);
  });

  test('sin sede NO deja confirmar', async () => {
    // Sin sede el pedido no tendría a qué WhatsApp ir.
    const usuario = userEvent.setup();
    const { onConfirm } = abrir();

    await llenarDatos(usuario);
    await usuario.click(screen.getByRole('button', { name: /Confirmar/ }));

    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe('AddressModal — una sede que no puede preparar el pedido', () => {
  test('se muestra pero deshabilitada, con el motivo', () => {
    // Esconderla dejaría al cliente mirando una lista más corta sin entender por
    // qué. Y si quedara una sola, parecería que la app está rota.
    abrir(POSIBLES);

    expect(radioSede('TOPASC MORICHAL')).toBeDisabled();
    expect(screen.getByText(/No tiene: Hamburguesa topasc/)).toBeInTheDocument();
  });

  test('la que SÍ puede queda elegible', () => {
    abrir(POSIBLES);

    expect(radioSede('TOPASC DALIAS')).toBeEnabled();
  });

  test('el pedido igual se puede completar con la sede que sí tiene todo', async () => {
    const usuario = userEvent.setup();
    const { onConfirm } = abrir(POSIBLES);

    await llenarDatos(usuario);
    await usuario.click(radioSede('TOPASC DALIAS'));
    await usuario.click(screen.getByRole('button', { name: /Confirmar/ }));

    expect(onConfirm.mock.calls[0][0].sede).toEqual(DALIA);
  });
});

describe('AddressModal — los datos del cliente siguen intactos', () => {
  test('nombre, teléfono, dirección y pago viajan en el confirm', async () => {
    // El otro lado del contrato: agregar la sede no puede haber roto lo que ya
    // andaba.
    const usuario = userEvent.setup();
    const { onConfirm } = abrir();

    await llenarDatos(usuario);
    await usuario.type(
      screen.getByPlaceholderText(/Referencia/),
      'portón verde'
    );
    await usuario.click(radioSede('TOPASC DALIAS'));
    await usuario.click(screen.getByRole('button', { name: /Confirmar/ }));

    expect(onConfirm.mock.calls[0][0]).toMatchObject({
      nombre: 'Juan Pérez',
      telefono: '3001234567',
      direccion: 'Barrio Manzanares',
      referencia: 'portón verde',
      metodoPago: 'efectivo',
    });
  });

  test('sin dirección no deja confirmar aunque haya sede', async () => {
    const usuario = userEvent.setup();
    const { onConfirm } = abrir();

    await usuario.type(screen.getByPlaceholderText(/Tu nombre/), 'Juan');
    await usuario.type(screen.getByPlaceholderText(/Tu teléfono/), '3001234567');
    await usuario.click(radioSede('TOPASC DALIAS'));
    await usuario.click(screen.getByRole('button', { name: /Confirmar/ }));

    expect(onConfirm).not.toHaveBeenCalled();
  });
});
