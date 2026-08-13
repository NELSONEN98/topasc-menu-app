import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/*
 * Se mockean solo `pngTarjeta` y `descargar`; el resto del modulo va real.
 *
 * pngTarjeta usa <canvas>, y jsdom no trae implementacion de canvas: sin el
 * mock, getContext('2d') devuelve null y el test fallaria por el entorno y no
 * por el componente. Lo que SI importa verificar —que se descargue con el
 * nombre correcto— se chequea sobre el mock.
 */
vi.mock('../../utils/qrMesa', async (importOriginal) => {
  const real = await importOriginal();
  return {
    ...real,
    pngTarjeta: vi.fn(async () => 'data:image/png;base64,FAKE'),
    descargar: vi.fn(),
  };
});

const { MesaQrModal } = await import('./MesaQrModal');
const { pngTarjeta, descargar, urlDeMesa } = await import('../../utils/qrMesa');

const MESA = { _id: 'mesa_5', numero: '5', codigo: 'K7M2QX', activo: true };

const montar = (props = {}) =>
  render(
    <MesaQrModal
      isOpen
      onClose={() => {}}
      mesa={MESA}
      sedeNombre="Sede Dalia"
      {...props}
    />
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MesaQrModal', () => {
  test('muestra la tarjeta generada', async () => {
    montar();

    await waitFor(() =>
      expect(screen.getByAltText(/QR de la mesa 5/)).toHaveAttribute(
        'src',
        'data:image/png;base64,FAKE'
      )
    );
  });

  test('muestra a donde apunta el QR', () => {
    montar();

    // Un QR impreso apunta ahi para siempre: el admin tiene que poder verlo
    // antes de mandar a imprimir.
    expect(screen.getByLabelText(/A dónde apunta/)).toHaveValue(
      urlDeMesa('K7M2QX')
    );
  });

  test('avisa cuando la mesa no tiene sede', () => {
    montar({ sedeNombre: null });

    expect(screen.getByText(/no tiene sede asignada/)).toBeInTheDocument();
  });

  test('no avisa cuando la mesa si tiene sede', () => {
    montar();

    expect(screen.queryByText(/no tiene sede asignada/)).not.toBeInTheDocument();
  });

  test('descarga con el nombre que incluye sede, mesa y codigo', async () => {
    const usuario = userEvent.setup();
    montar();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Descargar PNG/ })).toBeEnabled()
    );
    await usuario.click(screen.getByRole('button', { name: /Descargar PNG/ }));

    expect(descargar).toHaveBeenCalledWith(
      'data:image/png;base64,FAKE',
      'sede-dalia-mesa-5-K7M2QX.png'
    );
  });

  test('el boton de descarga esta deshabilitado mientras genera', () => {
    montar();

    // Sin esto se puede hacer clic antes de que exista la imagen y se
    // descargaria un archivo vacio.
    expect(screen.getByRole('button', { name: /Descargar PNG/ })).toBeDisabled();
  });

  test('la tarjeta se genera con los datos de ESA mesa', async () => {
    montar();

    await waitFor(() =>
      expect(pngTarjeta).toHaveBeenCalledWith({
        sede: 'Sede Dalia',
        numero: '5',
        codigo: 'K7M2QX',
      })
    );
  });

  test('cerrado no genera nada', () => {
    montar({ isOpen: false });

    expect(pngTarjeta).not.toHaveBeenCalled();
  });
});
