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

  const utils = render(<OrderType onSelectType={onSelectType} {...props} />);

  return { ...utils, onSelectType };
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

describe('OrderType — "Menú" sigue siendo un pedido para recoger', () => {
  test('elegirlo manda el tipo pickup, no otro', async () => {
    // El punto del test: cambió la etiqueta, NO el tipo de pedido. `pickup` viaja
    // al pedido como `tipoPedido`, está en la unión del schema de Convex y es lo
    // que el panel traduce para la cocina. Si alguien "completa" el renombre
    // cambiando el id, los pedidos guardados quedan con un tipo que la app no
    // sabe leer y el local no se entera de que hay que ir a buscarlo.
    const usuario = userEvent.setup();
    const { onSelectType } = abrir();

    await usuario.click(screen.getByRole('button', { name: /Menú/ }));

    expect(onSelectType).toHaveBeenCalledWith('pickup');
  });

  test('avisa que el pedido no se lo llevan a la casa', () => {
    // La etiqueta dice "Ver Menú", que no habla de entrega: esta línea es lo
    // único que le aclara al cliente que este pedido no es un domicilio. Si
    // alguien la borra "porque es obvia", el cliente elige mal y el local
    // termina con un pedido que nadie va a buscar.
    abrir();

    expect(screen.getByText(/pide para llevar/)).toBeInTheDocument();
  });

  test('"Domicilio" sigue mandando delivery', async () => {
    const usuario = userEvent.setup();
    const { onSelectType } = abrir();

    await usuario.click(screen.getByRole('button', { name: /Domicilio/ }));

    expect(onSelectType).toHaveBeenCalledWith('delivery');
  });
});
