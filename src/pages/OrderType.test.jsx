import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// OrderType monta el Hero, y el Hero lee la configuración con `useQuery`. Sin el
// mock no hay ConvexProvider y el render explota antes de dibujar un solo botón.
// Devolver undefined es lo que pasa mientras la query no resolvió: el Hero tiene
// que aguantarlo igual.
const { useQueryMock } = vi.hoisted(() => ({ useQueryMock: vi.fn() }));

vi.mock('convex/react', () => ({
  useQuery: useQueryMock,
  useMutation: () => vi.fn(),
}));

const { OrderType } = await import('./OrderType');

const abrir = (props = {}) => {
  const onSelectType = vi.fn();
  const onVerMenu = vi.fn();

  const utils = render(
    <OrderType onSelectType={onSelectType} onVerMenu={onVerMenu} {...props} />
  );

  return { ...utils, onSelectType, onVerMenu };
};

const opciones = () =>
  screen
    .getAllByRole('button')
    .map((boton) => boton.textContent)
    // El banner de sede trae su propio botón "Cambiar": no es una opción de tipo
    // de pedido.
    .filter((texto) => texto !== 'Cambiar');

describe('OrderType — orden de las opciones', () => {
  test('"Menú" aparece ANTES de "Domicilio"', () => {
    // Lo que fija el orden en pantalla es el orden del array `orderTypes` y nada
    // más: no hay CSS que lo acomode. Sin este test, reordenar el array por
    // costumbre o agregar una opción al final lo rompe sin que nada avise.
    abrir();

    const textos = opciones();

    expect(textos[0]).toMatch(/Menú/);
    expect(textos[1]).toMatch(/Domicilio/);
  });

  test('siguen siendo dos: a dine-in se entra por el QR de la mesa', () => {
    abrir();

    expect(opciones()).toHaveLength(2);
  });
});

describe('OrderType — "Ver Menú" abre la carta, NO arranca un pedido', () => {
  test('elegirlo lleva a la carta y no crea ningún pedido', async () => {
    // El cambio de fondo: antes esta opción arrancaba un pedido para recoger, y
    // ahora abre /menu, que es de solo lectura. Si volviera a llamar a
    // `onSelectType`, el cliente terminaría en el flujo de pedido con un tipo que
    // hoy está congelado.
    const usuario = userEvent.setup();
    const { onSelectType, onVerMenu } = abrir();

    await usuario.click(screen.getByRole('button', { name: /Menú/ }));

    expect(onVerMenu).toHaveBeenCalledTimes(1);
    expect(onSelectType).not.toHaveBeenCalled();
  });

  test('"recoger" ya no se ofrece: está congelado', () => {
    // Congelado, NO borrado: el literal 'pickup' sigue en el schema y el panel
    // sigue mostrando los pedidos viejos que lo tienen. Lo único que se saca es la
    // puerta de entrada. Si alguien lo vuelve a agregar acá sin querer, este test
    // lo frena.
    const usuario = userEvent.setup();
    const { onSelectType } = abrir();

    return Promise.all(
      screen.getAllByRole('button').map((boton) => usuario.click(boton))
    ).then(() => {
      expect(onSelectType).not.toHaveBeenCalledWith('pickup');
    });
  });

  test('la descripción dice que se pide en el local', () => {
    // La etiqueta "Ver Menú" no habla de entrega: esta línea es lo único que le
    // aclara al cliente que por acá no le llevan el pedido a la casa. Antes decía
    // "haz tu pedido", que con la carta de solo lectura era mentira.
    abrir();

    expect(screen.getByText(/pedí en el local/)).toBeInTheDocument();
  });

  test('"Domicilio" sigue mandando delivery', async () => {
    const usuario = userEvent.setup();
    const { onSelectType } = abrir();

    await usuario.click(screen.getByRole('button', { name: /Domicilio/ }));

    expect(onSelectType).toHaveBeenCalledWith('delivery');
  });
});
