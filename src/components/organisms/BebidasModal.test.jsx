import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BebidasModal } from './BebidasModal';
import { CartProvider } from '../../context/CartContext';

const COCA = { _id: 'item_coca', nombre: 'Coca Cola', precio: 3000, imagenUrl: 'x.jpg' };
const AGUA = { _id: 'item_agua', nombre: 'Agua', precio: 2000, imagenUrl: 'y.jpg' };

// ProductGridCard lee el carrito para mostrar cuantas unidades ya se pidieron.
const abrir = (props = {}) => {
  const onElegir = vi.fn();
  const onClose = vi.fn();

  render(
    <CartProvider>
      <BebidasModal
        bebidas={[COCA, AGUA]}
        onElegir={onElegir}
        onClose={onClose}
        {...props}
      />
    </CartProvider>
  );

  return { onElegir, onClose };
};

describe('BebidasModal', () => {
  test('lista las bebidas que recibe', () => {
    abrir();

    expect(screen.getByText('Coca Cola')).toBeInTheDocument();
    expect(screen.getByText('Agua')).toBeInTheDocument();
  });

  test('elegir una bebida la devuelve, no la agrega directo', async () => {
    // Las gaseosas piden sabor y tamaño: el carrito tiene que abrir el
    // detalle con ESTA bebida en vez de sumarla sin elegir.
    const usuario = userEvent.setup();
    const { onElegir } = abrir();

    const [agregarCoca] = screen.getAllByRole('button', { name: 'Agregar' });
    await usuario.click(agregarCoca);

    expect(onElegir).toHaveBeenCalledWith(COCA);
  });

  test('se cierra con el boton de cerrar', async () => {
    const usuario = userEvent.setup();
    const { onClose } = abrir();

    await usuario.click(screen.getByRole('button', { name: 'Cerrar' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('tocar dentro de la hoja no la cierra', async () => {
    // Solo el fondo cierra: si un toque en el titulo la cerrara, errarle al
    // boton de una bebida por un par de pixeles tiraria al cliente afuera.
    const usuario = userEvent.setup();
    const { onClose } = abrir();

    await usuario.click(screen.getByText('¿Algo para tomar?'));

    expect(onClose).not.toHaveBeenCalled();
  });
});
