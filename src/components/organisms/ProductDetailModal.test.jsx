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

describe('ProductDetailModal — tamaño de la gaseosa', () => {
  const POSTOBON = {
    _id: 'item_gaseosa',
    nombre: 'Postobón Manzana',
    categoriaId: 'cat_gaseosa',
    precio: 3000,
    marca: 'postobon',
    sabor: 'Manzana',
    presentaciones: [
      { tamano: '350 ml', precio: 3000 },
      { tamano: '1.5 lt', precio: 7000 },
      { tamano: '2.5 lt', precio: 11000 },
    ],
  };

  const opcion = (texto) => screen.getByRole('button', { name: new RegExp(texto) });

  test('pide elegir el tamaño y bloquea el agregar', () => {
    abrir(POSTOBON);

    expect(screen.getByText(/Qué tamaño/)).toBeInTheDocument();
    // `product.precio` es el "desde" de la tarjeta, no el precio de ninguna
    // presentación concreta: sin elegir no hay precio que cobrar.
    expect(screen.getByRole('button', { name: /Elegí el tamaño/ })).toBeDisabled();
  });

  test('el precio se muestra como "desde" hasta que elige', () => {
    abrir(POSTOBON);

    // Decir $3.000 a secas sería mentir: la de 3 litros sale 12.000.
    expect(screen.getByText(/desde/)).toBeInTheDocument();
  });

  test('solo se ofrecen los tamaños que el local cargó', () => {
    // Los que dejó vacíos no se venden y no tienen que llegar al cliente.
    abrir(POSTOBON);

    expect(opcion('350 ml')).toBeInTheDocument();
    expect(opcion('2.5 lt')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /250 ml/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /400 ml/ })).not.toBeInTheDocument();
  });

  test('elegir un tamaño cobra SU precio, no el del producto', async () => {
    const usuario = userEvent.setup();
    abrir(POSTOBON);

    await usuario.click(opcion('2.5 lt'));

    const agregar = screen.getByRole('button', { name: /Agregar/ });
    expect(agregar).toBeEnabled();
    expect(agregar).toHaveTextContent('11.000');
  });

  test('el tamaño más chico cobra el precio de arriba', async () => {
    const usuario = userEvent.setup();
    abrir(POSTOBON);

    await usuario.click(opcion('350 ml'));

    expect(screen.getByRole('button', { name: /Agregar/ })).toHaveTextContent('3.000');
  });

  test('un agua de un solo tamaño NO pregunta nada', () => {
    // El agua viene solo en 600 ml y la cerveza en 473 ml: mostrarle al cliente un
    // único botón y bloquearle el "Agregar" hasta que lo toque es fricción pura, y
    // encima el precio ya sería ese mismo.
    abrir({
      _id: 'item_agua',
      nombre: 'Agua Cristal',
      categoriaId: 'cat_bebidas',
      precio: 2500,
      presentaciones: [{ tamano: '600 ml', precio: 2500 }],
    });

    expect(screen.queryByText(/Qué tamaño/)).not.toBeInTheDocument();
    const agregar = screen.getByRole('button', { name: /Agregar/ });
    expect(agregar).toBeEnabled();
    expect(agregar).toHaveTextContent('2.500');
  });

  test('una gaseosa SIN presentaciones no pregunta nada', () => {
    // La ausencia del array es lo que apaga el selector: no hay un booleano
    // aparte que pueda contradecir a los datos.
    abrir({ ...POSTOBON, presentaciones: undefined });

    expect(screen.queryByText(/Qué tamaño/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Agregar/ })).toBeEnabled();
  });

  test('una gaseosa no pide salsas', () => {
    // Sigue valiendo la regla de las bebidas: la categoría manda sobre el flag.
    abrir({ ...POSTOBON, llevaSalsas: true });

    expect(seccionSalsas()).not.toBeInTheDocument();
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
