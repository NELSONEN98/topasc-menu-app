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

const abrir = (product, props = {}) =>
  render(
    <CartProvider>
      <ProductDetailModal
        product={product}
        salsas={SALSAS}
        categorias={CATEGORIAS}
        onClose={() => {}}
        {...props}
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

  // Desplegable y no botones: seis tamaños apilados ocupaban media pantalla del
  // celular y dejaban el "Agregar" abajo del scroll.
  const selectorTamano = () => screen.getByLabelText(/Qué tamaño/);
  const elegirTamano = (usuario, tamano) =>
    usuario.selectOptions(selectorTamano(), tamano);

  test('el tamaño se elige de un desplegable, no de una fila de botones', () => {
    abrir(POSTOBON);

    expect(selectorTamano().tagName).toBe('SELECT');
    // Ningún botón de tamaño: es justamente lo que se saca de la pantalla.
    expect(screen.queryByRole('button', { name: /350 ml/ })).not.toBeInTheDocument();
  });

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

    expect(screen.getByRole('option', { name: /350 ml/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /2\.5 lt/ })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /250 ml/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /400 ml/ })).not.toBeInTheDocument();
  });

  test('cada opción muestra su precio', () => {
    // Es lo que cambia entre un tamaño y otro: esconderlo obliga a abrir el
    // desplegable varias veces para comparar.
    abrir(POSTOBON);

    expect(screen.getByRole('option', { name: /350 ml — \$\s?3\.000/ })).toBeInTheDocument();
  });

  test('elegir un tamaño cobra SU precio, no el del producto', async () => {
    const usuario = userEvent.setup();
    abrir(POSTOBON);

    await elegirTamano(usuario, '2.5 lt');

    const agregar = screen.getByRole('button', { name: /Agregar/ });
    expect(agregar).toBeEnabled();
    expect(agregar).toHaveTextContent('11.000');
  });

  test('el tamaño más chico cobra el precio de arriba', async () => {
    const usuario = userEvent.setup();
    abrir(POSTOBON);

    await elegirTamano(usuario, '350 ml');

    expect(screen.getByRole('button', { name: /Agregar/ })).toHaveTextContent('3.000');
  });

  test('volver a "Elegí el tamaño" vuelve a bloquear el agregar', async () => {
    // El desplegable permite des-elegir, los botones no: sin esto el cliente
    // podría dejarlo en blanco y agregar el producto sin tamaño.
    const usuario = userEvent.setup();
    abrir(POSTOBON);

    await elegirTamano(usuario, '2.5 lt');
    await elegirTamano(usuario, '');

    expect(screen.getByRole('button', { name: /Elegí el tamaño/ })).toBeDisabled();
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

describe('ProductDetailModal — carta de solo lectura (/menu)', () => {
  const SALCHI = {
    _id: 'item_salchi',
    nombre: 'Salchipapa Sencilla',
    categoriaId: 'cat_comida',
    precio: 18000,
    descripcion: 'Papa francesa con salchicha',
    ingredientes: ['Papa', 'Salchicha', 'Queso'],
    llevaSalsas: true,
  };

  const POSTOBON = {
    _id: 'item_gaseosa',
    nombre: 'Postobón Manzana',
    categoriaId: 'cat_gaseosa',
    precio: 2500,
    sabor: 'Manzana',
    presentaciones: [
      { tamano: '250 ml', precio: 2500 },
      { tamano: '1.5 lt', precio: 7000 },
    ],
  };

  const leer = (product) => abrir(product, { soloLectura: true });

  test('NO hay ninguna forma de agregar al carrito', () => {
    // Es el contrato de la vista: el cliente lee y le pide al mozo. Un solo botón
    // que agregue rompe todo el sentido de /menu.
    leer(SALCHI);

    expect(screen.queryByRole('button', { name: /Agregar/ })).not.toBeInTheDocument();
  });

  test('tampoco pide salsas ni comentarios', () => {
    // Son pasos de un pedido que acá no existe.
    leer(SALCHI);

    expect(screen.queryByText(/Elegí tus salsas/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Comentarios/)).not.toBeInTheDocument();
  });

  test('no hay selector de cantidad', () => {
    leer(SALCHI);

    expect(screen.queryByRole('button', { name: /Aumentar cantidad/ })).not.toBeInTheDocument();
  });

  test('SÍ muestra lo que uno quiere leer de un plato', () => {
    // Si escondiera esto, la carta no serviría para nada: el cliente abre el
    // detalle justamente para saber qué lleva.
    leer(SALCHI);

    expect(screen.getByText(/Papa francesa con salchicha/)).toBeInTheDocument();
    expect(screen.getByText('Queso')).toBeInTheDocument();
  });

  test('dice qué hacer para pedir', () => {
    // Sin esta línea el modal termina en la nada donde antes estaba el botón, y
    // queda la duda de si falta algo que no cargó.
    leer(SALCHI);

    expect(screen.getByText(/mostrale la carta a quien te atiende/i)).toBeInTheDocument();
  });

  test('los tamaños se LEEN con su precio, no se eligen', () => {
    // En una carta los precios por tamaño son la información, no un paso del
    // pedido: van como lista y no como desplegable.
    leer(POSTOBON);

    expect(screen.queryByLabelText(/Qué tamaño/)).not.toBeInTheDocument();
    expect(screen.getByText('250 ml')).toBeInTheDocument();
    expect(screen.getByText('1.5 lt')).toBeInTheDocument();
    expect(screen.getByText(/7\.000/)).toBeInTheDocument();
  });

  test('los jugos muestran el precio en agua y en leche', () => {
    leer({
      _id: 'item_jugo',
      nombre: 'Jugo de Mango',
      categoriaId: 'cat_bebidas',
      precio: 7000,
      precioConLeche: 10000,
    });

    expect(screen.queryByRole('button', { name: /En leche/ })).not.toBeInTheDocument();
    expect(screen.getByText('En agua')).toBeInTheDocument();
    expect(screen.getByText('En leche')).toBeInTheDocument();
    expect(screen.getByText(/10\.000/)).toBeInTheDocument();
  });

  test('el modo normal sigue intacto', () => {
    // El otro lado del contrato: esto no puede haber apagado el pedido real.
    abrir(POSTOBON);

    expect(screen.getByLabelText(/Qué tamaño/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Elegí el tamaño/ })).toBeInTheDocument();
  });
});

describe('ProductDetailModal — las salsas se MUESTRAN en la carta', () => {
  const SALSAS_COMPLETAS = [
    { _id: 's1', nombre: 'Salsa Roja', tipo: 'base', precio: 0 },
    { _id: 's2', nombre: 'Salsa Rosada', tipo: 'base', precio: 0 },
    { _id: 's3', nombre: 'Salsa de Ajo', tipo: 'base', precio: 0 },
    { _id: 's4', nombre: 'Salsa de Queso', tipo: 'especial', precio: 2000 },
    { _id: 's5', nombre: 'Miel Mostaza', tipo: 'especial', precio: 2500 },
  ];

  const PLATO = {
    _id: 'item_salchi',
    nombre: 'Salchipapa Sencilla',
    categoriaId: 'cat_comida',
    precio: 18000,
    llevaSalsas: true,
  };

  const leerPlato = (product = PLATO) =>
    abrir(product, { soloLectura: true, salsas: SALSAS_COMPLETAS });

  test('lista las salsas incluidas', () => {
    // El cliente quiere saber con qué viene el plato para pedírselo al mozo.
    leerPlato();

    expect(screen.getByText(/Salsas a elección/)).toBeInTheDocument();
    expect(screen.getByText(/Salsa Roja · Salsa Rosada · Salsa de Ajo/)).toBeInTheDocument();
  });

  test('pero NO se pueden elegir', () => {
    // Es el punto de la vista: se ven, no se escogen. Un checkbox acá sería un
    // paso de pedido que no lleva a ninguna parte.
    leerPlato();

    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(screen.queryByText(/Elegí tus salsas/)).not.toBeInTheDocument();
  });

  test('las especiales muestran su precio', () => {
    // Es lo que cambia entre una y otra y lo que hay que saber antes de pedirla.
    leerPlato();

    expect(screen.getByText('Salsa de Queso')).toBeInTheDocument();
    expect(screen.getByText(/2\.000/)).toBeInTheDocument();
    expect(screen.getByText('Miel Mostaza')).toBeInTheDocument();
  });

  test('aclara qué está incluido y qué se paga', () => {
    // Sin esa distinción el cliente pide la de queso creyendo que viene gratis.
    leerPlato();

    expect(screen.getByText('Incluidas')).toBeInTheDocument();
    expect(screen.getByText('Tienen costo')).toBeInTheDocument();
  });

  test('una bebida NO muestra salsas', () => {
    // Sigue valiendo la regla de siempre: la categoría manda sobre el flag.
    leerPlato({
      _id: 'item_gaseosa',
      nombre: 'Postobón Manzana',
      categoriaId: 'cat_gaseosa',
      precio: 2500,
      llevaSalsas: true,
    });

    expect(screen.queryByText(/Salsas a elección/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Salsas especiales/)).not.toBeInTheDocument();
  });

  test('en el modo normal se siguen eligiendo', () => {
    // El otro lado del contrato: la carta no puede haber apagado el pedido real.
    abrir(PLATO, { salsas: SALSAS_COMPLETAS });

    expect(screen.getByText(/Elegí tus salsas/)).toBeInTheDocument();
    expect(screen.queryAllByRole('checkbox').length).toBeGreaterThan(0);
    // Y no aparece la versión de lectura.
    expect(screen.queryByText(/Salsas a elección/)).not.toBeInTheDocument();
  });
});
