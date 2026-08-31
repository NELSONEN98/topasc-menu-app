import { describe, expect, test } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CartProvider, useCart } from './CartContext';

const wrapper = ({ children }) => <CartProvider>{children}</CartProvider>;

const GASEOSA = {
  _id: 'item_gaseosa',
  nombre: 'Gaseosa',
  // Precio "desde" del item: NUNCA es lo que se cobra si hay presentacion.
  precio: 3000,
  imagenUrl: '',
};

const montarCarrito = () => renderHook(() => useCart(), { wrapper });

describe('CartContext — presentacion de gaseosa', () => {
  test('el precio de la linea sale de la presentacion, no del producto', () => {
    const { result } = montarCarrito();

    act(() => {
      result.current.addToCart(GASEOSA, {
        presentacion: { sabor: 'Coca Cola', tamano: '2 litros', precio: 9000 },
      });
    });

    // Si tomara el precio del item cobrariamos 3000 por una de 2 litros.
    expect(result.current.cartItems[0].price).toBe(9000);
    expect(result.current.getTotal()).toBe(9000);
  });

  test('dos tamaños del mismo sabor son lineas separadas', () => {
    const { result } = montarCarrito();

    act(() => {
      result.current.addToCart(GASEOSA, {
        presentacion: { sabor: 'Coca Cola', tamano: '500 ml', precio: 3000 },
      });
      result.current.addToCart(GASEOSA, {
        presentacion: { sabor: 'Coca Cola', tamano: '2 litros', precio: 9000 },
      });
    });

    // El bug que esto previene: si la presentacion no entrara en el lineId,
    // las dos se fusionarian y la de 2 litros se cobraria a 3000.
    expect(result.current.cartItems).toHaveLength(2);
    expect(result.current.getTotal()).toBe(12000);
  });

  test('dos sabores del mismo tamaño son lineas separadas', () => {
    const { result } = montarCarrito();

    act(() => {
      result.current.addToCart(GASEOSA, {
        presentacion: { sabor: 'Coca Cola', tamano: '2 litros', precio: 9000 },
      });
      result.current.addToCart(GASEOSA, {
        presentacion: { sabor: 'Postobon Manzana', tamano: '2 litros', precio: 7500 },
      });
    });

    expect(result.current.cartItems).toHaveLength(2);
    expect(result.current.getTotal()).toBe(16500);
  });

  test('la misma presentacion exacta suma cantidad en una sola linea', () => {
    const { result } = montarCarrito();

    act(() => {
      result.current.addToCart(GASEOSA, {
        presentacion: { sabor: 'Coca Cola', tamano: '2 litros', precio: 9000 },
      });
      result.current.addToCart(GASEOSA, {
        presentacion: { sabor: 'Coca Cola', tamano: '2 litros', precio: 9000 },
      });
    });

    expect(result.current.cartItems).toHaveLength(1);
    expect(result.current.cartItems[0].quantity).toBe(2);
    expect(result.current.getTotal()).toBe(18000);
  });

  test('guarda solo sabor y tamaño, sin repetir el precio', () => {
    const { result } = montarCarrito();

    act(() => {
      result.current.addToCart(GASEOSA, {
        presentacion: { sabor: 'Coca Cola', tamano: '2 litros', precio: 9000 },
      });
    });

    // El precio ya vive en `price`. Repetirlo seria una segunda fuente de
    // verdad que puede desincronizarse.
    expect(result.current.cartItems[0].presentacion).toEqual({
      sabor: 'Coca Cola',
      tamano: '2 litros',
    });
  });

  test('las salsas extra se suman ARRIBA del precio de la presentacion', () => {
    const { result } = montarCarrito();

    act(() => {
      result.current.addToCart(GASEOSA, {
        presentacion: { sabor: 'Coca Cola', tamano: '2 litros', precio: 9000 },
        salsasExtra: [{ nombre: 'De la casa', precio: 2000 }],
      });
    });

    // La presentacion reemplaza el precio base; los extras siguen sumando.
    expect(result.current.cartItems[0].price).toBe(11000);
  });
});

describe('CartContext — productos sin presentacion', () => {
  test('siguen usando el precio del producto', () => {
    const { result } = montarCarrito();

    act(() => {
      result.current.addToCart(
        { _id: 'item_burger', nombre: 'Hamburguesa', precio: 18000 },
        { salsas: ['Rosada'] }
      );
    });

    expect(result.current.cartItems[0].price).toBe(18000);
    expect(result.current.cartItems[0].presentacion).toBeNull();
  });

  test('un producto sin presentacion no se fusiona con uno que si la tiene', () => {
    const { result } = montarCarrito();

    act(() => {
      result.current.addToCart(GASEOSA);
      result.current.addToCart(GASEOSA, {
        presentacion: { sabor: 'Coca Cola', tamano: '500 ml', precio: 3000 },
      });
    });

    expect(result.current.cartItems).toHaveLength(2);
  });
});
