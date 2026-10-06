import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SedeModal } from './SedeModal';

const abrir = (props = {}) => {
  const onSave = vi.fn();

  render(
    <SedeModal isOpen onClose={() => {}} sede={null} onSave={onSave} {...props} />
  );

  return { onSave };
};

describe('SedeModal — alta', () => {
  test('arranca con los campos vacios', () => {
    abrir();

    expect(screen.getByLabelText(/Nombre/)).toHaveValue('');
    expect(screen.getByLabelText('Dirección')).toHaveValue('');
    expect(screen.getByLabelText(/WhatsApp/)).toHaveValue('');
  });

  test('NO muestra el switch de activa: una sede nueva nace activa', () => {
    abrir();

    // Mostrarlo en el alta invitaria a crear una sede apagada, que es un
    // estado sin ningun uso.
    expect(screen.queryByLabelText(/Activa/)).not.toBeInTheDocument();
  });

  test('envia lo que se completo', async () => {
    const usuario = userEvent.setup();
    const { onSave } = abrir();

    await usuario.type(screen.getByLabelText(/Nombre/), 'Sede Morichal');
    await usuario.type(screen.getByLabelText('Dirección'), 'Calle 1 # 2-3');
    await usuario.type(screen.getByLabelText(/WhatsApp/), '573206873870');
    await usuario.click(screen.getByRole('button', { name: /Agregar sede/ }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: 'Sede Morichal',
        direccion: 'Calle 1 # 2-3',
        whatsapp: '573206873870',
      })
    );
  });

  test('la direccion es opcional: se puede guardar sin ella', async () => {
    const usuario = userEvent.setup();
    const { onSave } = abrir();

    await usuario.type(screen.getByLabelText(/Nombre/), 'Sede Morichal');
    await usuario.type(screen.getByLabelText(/WhatsApp/), '573206873870');
    await usuario.click(screen.getByRole('button', { name: /Agregar sede/ }));

    expect(onSave.mock.calls[0][0].direccion).toBe('');
  });
});

describe('SedeModal — edicion', () => {
  const SEDE = {
    _id: 'sede_dalia',
    nombre: 'Sede Dalia',
    direccion: 'Carrera 8 # 18-203',
    whatsapp: '573206873870',
    activo: true,
  };

  test('precarga los datos de la sede', () => {
    abrir({ sede: SEDE });

    expect(screen.getByLabelText(/Nombre/)).toHaveValue('Sede Dalia');
    expect(screen.getByLabelText('Dirección')).toHaveValue('Carrera 8 # 18-203');
    expect(screen.getByLabelText(/WhatsApp/)).toHaveValue('573206873870');
  });

  test('una sede sin direccion precarga el campo vacio, no "undefined"', () => {
    abrir({ sede: { ...SEDE, direccion: undefined } });

    // `direccion` es optional en el schema: sin el `|| ''` el input quedaria
    // no-controlado y React tiraria un warning.
    expect(screen.getByLabelText('Dirección')).toHaveValue('');
  });

  test('muestra el switch de activa y refleja su estado', () => {
    abrir({ sede: { ...SEDE, activo: false } });

    expect(screen.getByLabelText(/Activa/)).not.toBeChecked();
  });

  test('vaciar la direccion se envia como string vacio para que el server la borre', async () => {
    const usuario = userEvent.setup();
    const { onSave } = abrir({ sede: SEDE });

    await usuario.clear(screen.getByLabelText('Dirección'));
    await usuario.click(screen.getByRole('button', { name: /Guardar cambios/ }));

    expect(onSave.mock.calls[0][0].direccion).toBe('');
  });
});

describe('SedeModal — dirección de la carta (/menu/<slug>)', () => {
  const DALIA = {
    _id: 'sede_dalia',
    nombre: 'Sede Dalia',
    whatsapp: '573000000000',
    slug: 'dalia',
    activo: true,
  };

  const campoSlug = () => screen.queryByLabelText(/Dirección de la carta/);

  test('en el ALTA no se pide: el servidor lo deriva del nombre', () => {
    // Pedirlo antes de que la sede exista es pedirle al admin que invente una URL
    // para algo que todavía no nombró.
    abrir();

    expect(campoSlug()).not.toBeInTheDocument();
  });

  test('al editar muestra el slug guardado', () => {
    abrir({ sede: DALIA });

    expect(campoSlug()).toHaveValue('dalia');
  });

  test('una sede SIN slug guardado muestra el derivado del nombre', () => {
    // Hoy esa sede responde por su nombre: mostrar el campo vacío haría creer que
    // no tiene dirección, y guardarlo así le cambiaría la URL por debajo.
    abrir({ sede: { ...DALIA, slug: undefined } });

    expect(campoSlug()).toHaveValue('sede-dalia');
  });

  test('avisa que cambiarlo rompe los QR ya impresos', () => {
    // Es la consecuencia que el admin no puede adivinar: un sticker pegado en la
    // pared no se arregla.
    abrir({ sede: DALIA });

    expect(screen.getByText(/stickers viejos dejan de servir/)).toBeInTheDocument();
  });

  test('marca el error cuando se escribe algo que no sirve en una URL', () => {
    const usuario = userEvent.setup();
    abrir({ sede: DALIA });

    return usuario.type(campoSlug(), ' con espacio').then(() => {
      expect(screen.getByText(/Solo minúsculas, números y guiones/)).toBeInTheDocument();
    });
  });

  test('renombrar la sede NO cambia la dirección de la carta', () => {
    // El punto de guardar el slug. Si se moviera con el nombre, renombrar mataría
    // todos los QR repartidos.
    const usuario = userEvent.setup();
    const { onSave } = abrir({ sede: DALIA });

    return usuario
      .clear(screen.getByLabelText(/Nombre/))
      .then(() => usuario.type(screen.getByLabelText(/Nombre/), 'Dalia Centro'))
      .then(() => usuario.click(screen.getByRole('button', { name: /Guardar/ })))
      .then(() => {
        expect(onSave.mock.calls[0][0].nombre).toBe('Dalia Centro');
        expect(onSave.mock.calls[0][0].slug).toBe('dalia');
      });
  });
});
