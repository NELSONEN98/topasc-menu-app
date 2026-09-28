import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductModal } from './ProductModal';

const CATEGORIAS = [{ _id: 'cat_1', nombre: 'Salchipapas' }];
const CATEGORIAS_CON_BEBIDAS = [
  ...CATEGORIAS,
  { _id: 'cat_2', nombre: 'Bebidas' },
  { _id: 'cat_3', nombre: 'Gaseosas' },
];

const DALIA = { _id: 'sede_dalia', nombre: 'Sede Dalia', direccion: 'Carrera 8', activo: true };
const MORICHAL = { _id: 'sede_morichal', nombre: 'Sede Morichal', activo: true };
const SEDES = [DALIA, MORICHAL];

const abrir = (props = {}) => {
  const onSave = vi.fn();

  const utils = render(
    <ProductModal
      isOpen
      onClose={() => {}}
      product={null}
      categorias={CATEGORIAS}
      sedes={SEDES}
      onSave={onSave}
      {...props}
    />
  );

  return { ...utils, onSave };
};

const checkboxSede = (nombre) => screen.getByRole('checkbox', { name: new RegExp(nombre) });

/** Completa los campos obligatorios y envia. */
const guardar = async (usuario, textoBoton) => {
  await usuario.type(screen.getByLabelText(/Nombre/), 'Salchipapa Sencilla');
  // `/Precio/` a secas ahora matchea tambien "Precio con leche".
  await usuario.type(screen.getByLabelText('Precio *'), '18000');
  await usuario.click(screen.getByRole('button', { name: textoBoton }));
};

describe('ProductModal — sedes al abrir', () => {
  test('un producto nuevo nace con TODAS las sedes marcadas', async () => {
    abrir();

    // La mayoria de los platos se venden en todos los locales: es mas rapido
    // destildar uno que tildar tres.
    expect(checkboxSede('Sede Dalia')).toBeChecked();
    expect(checkboxSede('Sede Morichal')).toBeChecked();
  });

  test('un producto viejo SIN sedeIds muestra todas marcadas', async () => {
    abrir({ product: { _id: 'item_1', nombre: 'Clasica', categoriaId: 'cat_1', precio: 1 } });

    // Hoy ese producto se ve en todas las sedes por el fallback del servidor:
    // mostrarlas todas tildadas no cambia su comportamiento, solo lo deja
    // explicito la proxima vez que se guarde.
    expect(checkboxSede('Sede Dalia')).toBeChecked();
    expect(checkboxSede('Sede Morichal')).toBeChecked();
  });

  test('un producto con sedeIds muestra marcadas solo esas', async () => {
    abrir({
      product: {
        _id: 'item_1',
        nombre: 'Exclusiva Dalia',
        categoriaId: 'cat_1',
        precio: 1,
        sedeIds: ['sede_dalia'],
      },
    });

    expect(checkboxSede('Sede Dalia')).toBeChecked();
    expect(checkboxSede('Sede Morichal')).not.toBeChecked();
  });

  test('avisa cuando una sede esta desactivada', async () => {
    abrir({ sedes: [DALIA, { ...MORICHAL, activo: false }] });

    // Si no avisara, el admin la marca creyendo que el plato se va a ver ahi.
    expect(screen.getByText(/Sede desactivada/)).toBeInTheDocument();
  });
});

describe('ProductModal — carrera con la query de sedes (regresion)', () => {
  test('si las sedes llegan DESPUES de abrir, igual quedan marcadas', async () => {
    const { rerender } = render(
      <ProductModal
        isOpen
        onClose={() => {}}
        product={null}
        categorias={CATEGORIAS}
        sedes={[]}
        onSave={vi.fn()}
      />
    );

    // Todavia no resolvio la query: no hay ninguna sede que mostrar.
    expect(screen.queryAllByRole('checkbox', { name: /Sede/ })).toHaveLength(0);

    rerender(
      <ProductModal
        isOpen
        onClose={() => {}}
        product={null}
        categorias={CATEGORIAS}
        sedes={SEDES}
        onSave={vi.fn()}
      />
    );

    // El bug: el efecto que arma el formulario dependia solo de
    // [product?._id, isOpen], asi que calculaba los defaults con la lista
    // vacia y NUNCA volvia a marcarlas. En una edicion eso hacia que un plato
    // vendido en las tres sedes apareciera sin ninguna, y guardarlo asi lo
    // sacaba de dos locales.
    expect(checkboxSede('Sede Dalia')).toBeChecked();
    expect(checkboxSede('Sede Morichal')).toBeChecked();
  });
});

describe('ProductModal — "lleva salsas" no va en Bebidas', () => {
  const checkboxSalsas = () =>
    screen.queryByRole('checkbox', { name: /Lleva salsas/ });

  test('aparece en una categoria de comida', async () => {
    abrir({ categorias: CATEGORIAS });

    expect(checkboxSalsas()).toBeInTheDocument();
  });

  test('no aparece cuando la categoria es Bebidas', async () => {
    abrir({
      categorias: CATEGORIAS_CON_BEBIDAS,
      product: { _id: 'item_1', nombre: 'Coca Cola', categoriaId: 'cat_2', precio: 1 },
    });

    expect(checkboxSalsas()).not.toBeInTheDocument();
  });

  test('tampoco aparece en la categoria Gaseosas', async () => {
    // Son dos categorias distintas en el panel y las dos son bebidas: la
    // regla tiene que cubrir las dos, no solo la que existia primero.
    abrir({
      categorias: CATEGORIAS_CON_BEBIDAS,
      product: { _id: 'item_1', nombre: 'Postobón', categoriaId: 'cat_3', precio: 1 },
    });

    expect(checkboxSalsas()).not.toBeInTheDocument();
  });

  test('una bebida vieja SIN el campo se autocorrige a false', async () => {
    // El default de `llevaSalsas` es al reves que el resto: undefined
    // significa "SI lleva". Sin el autocorregido, una gaseosa cargada antes de
    // este chequeo le pediria salsas al cliente.
    const usuario = userEvent.setup();
    const { onSave } = abrir({
      categorias: CATEGORIAS_CON_BEBIDAS,
      product: { _id: 'item_1', nombre: 'Coca Cola', categoriaId: 'cat_2', precio: 1 },
    });

    await usuario.click(screen.getByRole('button', { name: /Guardar cambios/ }));

    expect(onSave.mock.calls[0][0].llevaSalsas).toBe(false);
  });

  test('pasar un plato a Bebidas apaga el flag aunque estuviera prendido', async () => {
    const usuario = userEvent.setup();
    const { onSave } = abrir({
      categorias: CATEGORIAS_CON_BEBIDAS,
      product: {
        _id: 'item_1',
        nombre: 'Salchipapa',
        categoriaId: 'cat_1',
        precio: 18000,
        llevaSalsas: true,
      },
    });

    expect(checkboxSalsas()).toBeChecked();

    await usuario.selectOptions(screen.getByLabelText(/Categoría/), 'cat_2');
    await usuario.click(screen.getByRole('button', { name: /Guardar cambios/ }));

    // El checkbox ya no se ve: si el formulario siguiera mandando true, nadie
    // podria darse cuenta hasta que un cliente pida una gaseosa con salsas.
    expect(checkboxSalsas()).not.toBeInTheDocument();
    expect(onSave.mock.calls[0][0].llevaSalsas).toBe(false);
  });
});

describe('ProductModal — "precio con leche" solo donde la leche existe', () => {
  const CATEGORIAS_CON_JUGOS = [
    ...CATEGORIAS,
    { _id: 'cat_gaseosa', nombre: 'Gaseosa' },
    { _id: 'cat_jugos', nombre: 'JUGOS NATURALES' },
  ];

  const campoLeche = () => screen.queryByLabelText(/Precio con leche/);

  test('NO aparece en la categoría Gaseosa', () => {
    // Lo pedido: una gaseosa con leche no existe, y tener el campo a la vista
    // invita a llenarlo por error.
    abrir({
      categorias: CATEGORIAS_CON_JUGOS,
      product: { _id: 'item_1', nombre: 'Pepsi', categoriaId: 'cat_gaseosa', precio: 1 },
    });

    expect(campoLeche()).not.toBeInTheDocument();
  });

  test('SÍ aparece en "JUGOS NATURALES" sin marcar nada', () => {
    // Regresión de producción: los jugos viven en esa categoría. Si el respaldo
    // por nombre no la reconociera, este cambio apagaría la opción de agua/leche
    // en producción el día del deploy.
    abrir({
      categorias: CATEGORIAS_CON_JUGOS,
      product: { _id: 'item_1', nombre: 'Jugo de Mango', categoriaId: 'cat_jugos', precio: 7000 },
    });

    expect(campoLeche()).toBeInTheDocument();
  });

  test('tampoco aparece en una categoría de comida', () => {
    // El campo estaba a la vista en TODA la carta, no solo en gaseosas.
    abrir({ categorias: CATEGORIAS_CON_JUGOS });

    expect(campoLeche()).not.toBeInTheDocument();
  });

  test('un producto que YA tiene precio con leche muestra el campo igual', () => {
    // Válvula de seguridad: sin esto, un jugo cargado en una categoría que no
    // admite leche quedaría con un precio visible para el cliente que el
    // formulario no muestra y nadie podría sacarle.
    abrir({
      categorias: CATEGORIAS_CON_JUGOS,
      product: {
        _id: 'item_1',
        nombre: 'Jugo viejo',
        categoriaId: 'cat_gaseosa',
        precio: 7000,
        precioConLeche: 10000,
      },
    });

    expect(campoLeche()).toBeInTheDocument();
    expect(campoLeche()).toHaveValue(10000);
  });

  test('pasar un jugo a Gaseosas le BORRA el precio con leche', async () => {
    // El bug que esto evita es el peor de todos: el campo desaparece del
    // formulario pero el valor sigue en el estado, y esa gaseosa quedaría
    // ofreciéndose "en leche" a 10.000 en el menú del cliente. Mismo trap que
    // llevaPresentacion.
    const usuario = userEvent.setup();
    const { onSave } = abrir({
      categorias: CATEGORIAS_CON_JUGOS,
      product: {
        _id: 'item_1',
        nombre: 'Jugo de Mango',
        categoriaId: 'cat_jugos',
        precio: 7000,
        precioConLeche: 10000,
      },
    });

    await usuario.selectOptions(screen.getByLabelText(/Categoría/), 'cat_gaseosa');
    await usuario.click(screen.getByRole('button', { name: /Guardar cambios/ }));

    expect(campoLeche()).not.toBeInTheDocument();
    expect(onSave.mock.calls[0][0].precioConLeche).toBe('');
  });

  test('pasar un jugo a otra categoría de jugos le conserva el precio', async () => {
    const usuario = userEvent.setup();
    const { onSave } = abrir({
      categorias: [...CATEGORIAS_CON_JUGOS, { _id: 'cat_jugos2', nombre: 'Jugos del día' }],
      product: {
        _id: 'item_1',
        nombre: 'Jugo de Mango',
        categoriaId: 'cat_jugos',
        precio: 7000,
        precioConLeche: 10000,
      },
    });

    await usuario.selectOptions(screen.getByLabelText(/Categoría/), 'cat_jugos2');
    await usuario.click(screen.getByRole('button', { name: /Guardar cambios/ }));

    // Mover un jugo entre categorías de jugos no puede costarle el precio.
    expect(onSave.mock.calls[0][0].precioConLeche).toBe(10000);
  });
});

describe('ProductModal — productos que la promo reemplaza', () => {
  const SALCHIPAPA = { _id: 'item_salchi', nombre: 'Salchipapa Sencilla', categoriaId: 'cat_1', precio: 18000 };
  const PAPA_LOCA = { _id: 'item_loca', nombre: 'Papa Loca', categoriaId: 'cat_1', precio: 22000 };
  const OTRA_PROMO = { _id: 'item_promo2', nombre: '2x1 viejo', categoriaId: 'cat_1', precio: 30000, esPromo: true };

  const MENU = [SALCHIPAPA, PAPA_LOCA, OTRA_PROMO];

  const checkboxOculta = (nombre) =>
    screen.queryByRole('checkbox', { name: new RegExp(nombre) });

  const abrirPromo = (props = {}) =>
    abrir({ productos: MENU, defaults: { esPromo: true }, ...props });

  test('el selector no se ve si el producto no es promo', async () => {
    // En un plato normal sería un bloque más para completar sin motivo.
    abrir({ productos: MENU });

    expect(screen.queryByText(/Productos que reemplaza/)).not.toBeInTheDocument();
  });

  test('marcando "es promoción del día" aparece el selector', async () => {
    abrirPromo();

    expect(screen.getByText(/Productos que reemplaza/)).toBeInTheDocument();
    expect(checkboxOculta('Salchipapa Sencilla')).toBeInTheDocument();
  });

  test('no se ofrece a sí misma', async () => {
    // Una promo que se tapa a sí misma desaparece del menú el día que arranca,
    // y desde el panel se ve perfecta. Mejor que ni se pueda elegir.
    abrirPromo({
      product: { _id: 'item_salchi', nombre: 'Salchipapa Sencilla', categoriaId: 'cat_1', precio: 1, esPromo: true },
    });

    expect(checkboxOculta('Salchipapa Sencilla')).not.toBeInTheDocument();
    expect(checkboxOculta('Papa Loca')).toBeInTheDocument();
  });

  test('no ofrece las otras promos', async () => {
    // Tapar una promo con otra no resuelve nada y solo alarga una lista que en
    // una carta real ya tiene decenas de items.
    abrirPromo();

    expect(checkboxOculta('2x1 viejo')).not.toBeInTheDocument();
  });

  test('lo tildado viaja en ocultaItemIds', async () => {
    const usuario = userEvent.setup();
    const { onSave } = abrirPromo();

    await usuario.click(checkboxOculta('Salchipapa Sencilla'));
    await guardar(usuario, /Agregar producto/);

    expect(onSave.mock.calls[0][0].ocultaItemIds).toEqual(['item_salchi']);
  });

  test('destildar lo saca de la lista', async () => {
    const usuario = userEvent.setup();
    const { onSave } = abrirPromo();

    await usuario.click(checkboxOculta('Papa Loca'));
    await usuario.click(checkboxOculta('Papa Loca'));
    await guardar(usuario, /Agregar producto/);

    expect(onSave.mock.calls[0][0].ocultaItemIds).toEqual([]);
  });

  test('al editar, llega tildado lo que ya tenía guardado', async () => {
    abrirPromo({
      product: {
        _id: 'item_promo',
        nombre: '2x1 en Salchipapas',
        categoriaId: 'cat_1',
        precio: 30000,
        esPromo: true,
        ocultaItemIds: ['item_salchi'],
      },
    });

    // Si no se hidratara, abrir la promo para cambiarle el precio y guardar
    // liberaría los productos que estaba tapando, sin que nadie lo pida.
    expect(checkboxOculta('Salchipapa Sencilla')).toBeChecked();
    expect(checkboxOculta('Papa Loca')).not.toBeChecked();
  });

  test('sin la prop productos el formulario sigue funcionando', async () => {
    // La lista es opcional: mientras la query no resuelve llega vacía y el
    // bloque simplemente no se dibuja, en vez de romper el modal entero.
    abrir({ defaults: { esPromo: true } });

    expect(screen.queryByText(/Productos que reemplaza/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Agregar producto/ })).toBeInTheDocument();
  });
});

describe('ProductModal — que se guarda', () => {
  test('destildar una sede la saca de lo que se envia', async () => {
    const usuario = userEvent.setup();
    const { onSave } = abrir();

    await usuario.click(checkboxSede('Sede Morichal'));
    await guardar(usuario, /Agregar producto/);

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0].sedeIds).toEqual(['sede_dalia']);
  });

  test('volver a tildar una sede la reincorpora', async () => {
    const usuario = userEvent.setup();
    const { onSave } = abrir();

    await usuario.click(checkboxSede('Sede Morichal'));
    await usuario.click(checkboxSede('Sede Morichal'));
    await guardar(usuario, /Agregar producto/);

    expect(onSave.mock.calls[0][0].sedeIds).toHaveLength(2);
  });

  test('se pueden destildar todas: el corte lo hace el hook, no el modal', async () => {
    const usuario = userEvent.setup();
    const { onSave } = abrir();

    await usuario.click(checkboxSede('Sede Dalia'));
    await usuario.click(checkboxSede('Sede Morichal'));
    await guardar(usuario, /Agregar producto/);

    // El modal no valida: junta datos. Quien frena el guardado sin sedes es
    // useProductosAdmin, que es el que sabe que un array vacio significa
    // "todas las sedes" del lado del servidor.
    expect(onSave.mock.calls[0][0].sedeIds).toEqual([]);
  });
});
