import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductGridCard } from './ProductGridCard';
import { CartProvider } from '../../context/CartContext';

const SALCHI = {
  _id: 'item_salchi',
  nombre: 'Salchipapa Sencilla',
  precio: 18000,
  imagenUrl: 'https://ejemplo.com/salchi.jpg',
};

const POSTOBON = {
  _id: 'item_gaseosa',
  nombre: 'Postobón Manzana',
  precio: 2500,
  presentaciones: [
    { tamano: '250 ml', precio: 2500 },
    { tamano: '1.5 lt', precio: 7000 },
  ],
};

const mostrar = (product, props = {}) => {
  const onProductClick = vi.fn();

  const utils = render(
    <CartProvider>
      <ProductGridCard product={product} onProductClick={onProductClick} {...props} />
    </CartProvider>
  );

  return { ...utils, onProductClick };
};

describe('ProductGridCard — carta de solo lectura (/menu)', () => {
  test('NO dibuja el botón "Agregar"', () => {
    // No se deshabilita: no se dibuja. Un "Agregar" apagado invita a tocarlo y
    // deja al cliente pensando que la app está fallando, cuando lo que pasa es que
    // ahí no se pide por la app.
    mostrar(SALCHI, { soloLectura: true });

    expect(screen.queryByRole('button', { name: 'Agregar' })).not.toBeInTheDocument();
  });

  test('ofrece "Ver" para leer el detalle', () => {
    // El cliente igual quiere abrir el plato para saber qué lleva.
    const usuario = userEvent.setup();
    const { onProductClick } = mostrar(SALCHI, { soloLectura: true });

    return usuario.click(screen.getByRole('button', { name: 'Ver' })).then(() => {
      expect(onProductClick).toHaveBeenCalledWith(SALCHI);
    });
  });

  test('avisa "desde" cuando el producto tiene varios tamaños', () => {
    // Decir $2.500 a secas con la de 1.5 lt en 7.000 sería mentirle al cliente.
    mostrar(POSTOBON, { soloLectura: true });

    expect(screen.getByText(/desde/)).toBeInTheDocument();
  });

  test('un producto de un solo precio no dice "desde"', () => {
    mostrar(SALCHI, { soloLectura: true });

    expect(screen.queryByText(/desde/)).not.toBeInTheDocument();
  });
});

describe('ProductGridCard — el modo normal sigue intacto', () => {
  test('el botón "Agregar" abre el detalle', async () => {
    // El otro lado del contrato: la carta de lectura no puede haber apagado el
    // pedido real.
    const usuario = userEvent.setup();
    const { onProductClick } = mostrar(SALCHI);

    await usuario.click(screen.getByRole('button', { name: 'Agregar' }));

    expect(onProductClick).toHaveBeenCalledWith(SALCHI);
  });

  test('no aparece el botón "Ver"', () => {
    mostrar(SALCHI);

    expect(screen.queryByRole('button', { name: 'Ver' })).not.toBeInTheDocument();
  });
});
