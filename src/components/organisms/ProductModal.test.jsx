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
  await usuario.type(screen.getByLabelText(/Precio/), '18000');
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
