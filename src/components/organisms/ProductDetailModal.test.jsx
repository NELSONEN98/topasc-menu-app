import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductDetailModal } from './ProductDetailModal';
import { CartProvider } from '../../context/CartContext';

const CATEGORIAS = [
  { _id: 'cat_comida', nombre: 'Salchipapas' },
  { _id: 'cat_bebidas', nombre: 'Bebidas' },
  { _id: 'cat_gaseosa', nombre: 'Gaseosa' },
];

const SALSAS = [
  { _id: 's1', nombre: 'Salsa Roja', tipo: 'base', precio: 0 },
  { _id: 's2', nombre: 'Salsa Rosada', tipo: 'base', precio: 0 },
];

const abrir = (product) =>
  render(
    <CartProvider>
      <ProductDetailModal
        product={product}
        salsas={SALSAS}
        categorias={CATEGORIAS}
        onClose={() => {}}
      />
    </CartProvider>
  );

const seccionSalsas = () => screen.queryByText(/Elegí tus salsas/);
const botonAgregar = () => screen.getByRole('button', { name: /Agregar|Elegí una salsa/ });

describe('ProductDetailModal — las bebidas nunca piden salsas (regresion)', () => {
  test('un jugo con llevaSalsas mal guardado en true igual se puede agregar', () => {
    // El bug real: "Jugo tamarindo" tenia `llevaSalsas: true` en la base, el
    // detalle exigia elegir una salsa y el boton quedaba deshabilitado — no
    // habia forma de pedir un jugo. El formulario del admin solo apaga el flag
    // cuando alguien abre y guarda ESE producto, asi que el dato viejo
    // sobrevivia; por eso la categoria tiene que mandar sobre el flag.
    abrir({
      _id: 'item_jugo',
      nombre: 'Jugo tamarindo',
      categoriaId: 'cat_bebidas',
      precio: 5000,
      llevaSalsas: true,
    });

    expect(seccionSalsas()).not.toBeInTheDocument();
    expect(botonAgregar()).toBeEnabled();
  });

  test('tampoco pide salsas en la categoria Gaseosa', () => {
    abrir({
      _id: 'item_coca',
      nombre: 'Coca cola 1.5 lts',
      categoriaId: 'cat_gaseosa',
      precio: 8000,
      llevaSalsas: true,
    });

    expect(seccionSalsas()).not.toBeInTheDocument();
    expect(botonAgregar()).toBeEnabled();
  });

  test('un plato de comida SI sigue pidiendo salsas', () => {
    // El otro lado del contrato: esto no puede aflojar la regla para la comida,
    // que es donde elegir salsa es parte del pedido.
    abrir({
      _id: 'item_salchi',
      nombre: 'Salchipapa Sencilla',
      categoriaId: 'cat_comida',
      precio: 18000,
      llevaSalsas: true,
    });

    expect(seccionSalsas()).toBeInTheDocument();
    expect(botonAgregar()).toBeDisabled();
  });

  test('sin categorias cargadas cae al flag del producto', () => {
    // Mientras la query no resolvio, `categorias` llega vacio: ahi el flag es
    // lo unico que hay, y una bebida marcada en false tampoco pide salsas.
    render(
      <CartProvider>
        <ProductDetailModal
          product={{
            _id: 'item_jugo',
            nombre: 'Jugo de mango',
            categoriaId: 'cat_bebidas',
            precio: 5000,
            llevaSalsas: false,
          }}
          salsas={SALSAS}
          onClose={() => {}}
        />
      </CartProvider>
    );

    expect(seccionSalsas()).not.toBeInTheDocument();
    expect(botonAgregar()).toBeEnabled();
  });
});

describe('ProductDetailModal — preparación del jugo', () => {
  const JUGO = {
    _id: 'item_jugo',
    nombre: 'Jugo de Mango',
    categoriaId: 'cat_bebidas',
    precio: 7000,
    precioConLeche: 10000,
  };

  const opcion = (texto) => screen.getByRole('button', { name: new RegExp(texto) });

  test('un jugo con precio con leche pide elegir y bloquea el agregar', () => {
    abrir(JUGO);

    expect(screen.getByText(/Cómo lo preparamos/)).toBeInTheDocument();
    // Sin elegir, el local no sabria que preparar ni a que precio cobrarlo.
    expect(screen.getByRole('button', { name: /Elegí la preparación/ })).toBeDisabled();
  });

  test('el precio se muestra como "desde" hasta que elige', () => {
    abrir(JUGO);

    // Decir $7.000 a secas seria mentir: con leche cuesta 10.000.
    expect(screen.getByText(/desde/)).toBeInTheDocument();
  });

  test('elegir en leche cobra el precio con leche', async () => {
    const usuario = userEvent.setup();
    abrir(JUGO);

    await usuario.click(opcion('En leche'));

    // Se mira el boton de agregar y no cualquier texto con el precio: ese
    // numero tambien aparece dentro de la opcion elegida.
    const agregar = screen.getByRole('button', { name: /Agregar/ });
    expect(agregar).toBeEnabled();
    expect(agregar).toHaveTextContent('10.000');
  });

  test('elegir en agua cobra el precio de siempre', async () => {
    const usuario = userEvent.setup();
    abrir(JUGO);

    await usuario.click(opcion('En agua'));

    expect(screen.getByRole('button', { name: /Agregar/ })).toHaveTextContent('7.000');
  });

  test('un jugo SIN precio con leche no pregunta nada', () => {
    // La ausencia del campo es lo que apaga la opcion.
    abrir({ ...JUGO, precioConLeche: undefined });

    expect(screen.queryByText(/Cómo lo preparamos/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Agregar/ })).toBeEnabled();
  });
});
