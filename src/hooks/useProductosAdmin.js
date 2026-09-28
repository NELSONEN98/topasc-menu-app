import { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useNotificacion } from '../context/NotificacionContext';
import { mensajeDeError } from '../utils/mensajeDeError';
import { aNumero } from '../utils/numeroDeInput';
import { TODOS_LOS_TAMANOS, tipoPideMarca } from '../config/bebidas';
import { tipoBebidaDeItem } from '../utils/categorias';
import { ADMIN_ITEMS_PER_PAGE, PLACEHOLDER_PRODUCTO } from '../config/settings';

// Referencia estable mientras las queries cargan: un `[]` nuevo por render
// rompe cualquier hook que lo tenga como dependencia.
const SIN_DATOS = [];

/**
 * Todo lo que necesita la pestaña de Productos: datos, filtros, paginacion,
 * estado del modal y acciones. La seccion que lo consume solo dibuja.
 */
export const useProductosAdmin = () => {
  const { notificar, confirmar } = useNotificacion();

  // listarTodos y no listarMenu: el panel tiene que ver tambien los productos
  // apagados, que es desde donde se vuelven a encender.
  const items = useQuery(api.items.listarTodos) ?? SIN_DATOS;
  const categorias = useQuery(api.categorias.listar) ?? SIN_DATOS;
  // listarTodas y no listar: si una sede se desactiva desde la pestana Sedes,
  // con `listar` desapareceria de los checkboxes del producto pero seguiria
  // guardada en su `sedeIds`, invisible e imposible de sacar. El admin tiene
  // que ver todo lo que el producto tiene marcado, prendido o apagado.
  const sedes = useQuery(api.sedes.listarTodas) ?? SIN_DATOS;
  const crearItem = useMutation(api.items.crear);
  const actualizarItem = useMutation(api.items.actualizar);
  const borrarItem = useMutation(api.items.borrar);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const categoriaMap = useMemo(
    () =>
      categorias.reduce((acc, cat) => {
        acc[cat._id] = cat.nombre;
        return acc;
      }, {}),
    [categorias]
  );

  // NO se filtra por imagen: un producto sin foto debe seguir siendo visible
  // y editable, si no queda inaccesible desde el admin.
  const filtrados = useMemo(
    () =>
      items.filter((item) => {
        const coincideNombre = item.nombre
          .toLowerCase()
          .includes(busqueda.toLowerCase());
        const coincideCategoria =
          filtroCategoria === '' || item.categoriaId === filtroCategoria;
        const coincideEstado =
          filtroEstado === '' ||
          (filtroEstado === 'active' && item.disponible) ||
          (filtroEstado === 'inactive' && !item.disponible);

        return coincideNombre && coincideCategoria && coincideEstado;
      }),
    [items, busqueda, filtroCategoria, filtroEstado]
  );

  const totalPaginas = Math.ceil(filtrados.length / ADMIN_ITEMS_PER_PAGE);
  const desde = (pagina - 1) * ADMIN_ITEMS_PER_PAGE;
  const paginados = filtrados.slice(desde, desde + ADMIN_ITEMS_PER_PAGE);

  // Cambiar un filtro siempre vuelve a la pagina 1: si estabas en la 3 y el
  // resultado nuevo tiene una sola pagina, te quedabas mirando una tabla vacia.
  const cambiarFiltro = (setter) => (valor) => {
    setter(valor);
    setPagina(1);
  };

  const abrirNuevo = () => {
    setEditando(null);
    setModalAbierto(true);
  };

  const abrirEdicion = (id) => {
    setEditando(items.find((item) => item._id === id));
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setEditando(null);
  };

  const guardar = async (formData) => {
    if (!formData.nombre.trim()) {
      notificar.info('El nombre del producto es obligatorio');
      return;
    }
    if (!formData.categoriaId) {
      notificar.info('Elegí una categoría');
      return;
    }

    /*
     * El mapa `tamaño -> precio` del formulario se convierte al array que guarda
     * el schema, respetando el orden del catálogo (de menor a mayor).
     *
     * El orden importa: es el que ve el cliente en el selector, y de chico a
     * grande es como se lee un precio que sube. Object.keys no lo garantiza para
     * claves que no son numéricas, así que se recorre la lista y no el mapa.
     *
     * Se recorren TODOS los tamaños de todos los tipos, no los del tipo actual:
     * si quedara un precio de un tipo anterior, recorrer solo el tipo de ahora lo
     * dejaría guardado y sin forma de verlo ni borrarlo.
     */
    const presentaciones = TODOS_LOS_TAMANOS.filter(
      (tamano) => aNumero(formData.presentaciones?.[tamano]) > 0
    ).map((tamano) => ({ tamano, precio: aNumero(formData.presentaciones[tamano]) }));

    const seVendePorTamano = presentaciones.length > 0;

    const precio = aNumero(formData.precio);
    // Cuando se vende por tamaños el precio de arriba lo deriva el servidor del
    // más barato, así que exigirlo acá frenaría un alta perfectamente válida: el
    // admin llenó los cinco tamaños y no tocó un campo que ya no le pertenece.
    if (!seVendePorTamano && precio <= 0) {
      notificar.info('El precio debe ser mayor a 0');
      return;
    }
    // Solo se exige sabor donde el tipo lo tiene. El agua y la cerveza no
    // preguntan sabor, así que pedírselo bloquearía un alta perfectamente válida.
    const tipoBebida = tipoBebidaDeItem(categorias, formData.categoriaId);
    if (seVendePorTamano && tipoPideMarca(tipoBebida) && !formData.sabor) {
      // Sin sabor el pedido diría "Postobón 1.5 lt" y el local no sabría cuál
      // sacar de la nevera. El sabor viaja al pedido dentro de `presentacion`.
      notificar.info('Elegí el sabor de la gaseosa');
      return;
    }
    // Se corta aca a proposito: sin sedes el plato no aparece en ningun menu,
    // pero ademas el server interpreta un array vacio como "todas las sedes"
    // (por los items previos al campo). O sea que guardar sin marcar nada
    // lograria justo lo contrario de lo que el admin cree estar haciendo.
    if (!formData.sedeIds?.length) {
      notificar.info('Elegí al menos una sede');
      return;
    }
    // Se corta acá además del servidor para no hacer viajar un formulario que
    // ya sabemos que va a rebotar. Compara strings porque "YYYY-MM-DD" ordena
    // igual alfabética que cronológicamente.
    if (
      formData.vigenteDesde &&
      formData.vigenteHasta &&
      formData.vigenteDesde > formData.vigenteHasta
    ) {
      notificar.info('La fecha de inicio no puede ser posterior a la de fin');
      return;
    }

    const editandoAhora = !!editando;

    try {
      if (editandoAhora) {
        await actualizarItem({
          id: editando._id,
          campos: {
            nombre: formData.nombre,
            categoriaId: formData.categoriaId,
            precio,
            // Va como 0 y no como undefined cuando esta vacio: es asi como el
            // server distingue "saca la opcion" de "no la toques".
            precioConLeche: aNumero(formData.precioConLeche),
            // Van SIEMPRE, también vacíos: es así como el server sabe que hay que
            // borrarlos cuando el producto deja de venderse por tamaños. Mandarlos
            // solo cuando tienen valor dejaría los tamaños viejos pegados a un
            // producto que ya no es gaseosa.
            marca: formData.marca || undefined,
            sabor: formData.sabor || undefined,
            presentaciones,
            descripcion: formData.descripcion,
            ingredientes: formData.ingredientes,
            imagenUrl: formData.imagenUrl,
            // Solo va si en esta edición se subió una foto nueva. Vacío significa
            // "no la toqué", y mandarlo igual haría que el servidor borre del
            // storage el archivo que el producto ya tiene.
            imagenStorageId: formData.imagenStorageId || undefined,
            disponible: formData.disponible,
            llevaSalsas: formData.llevaSalsas,
            sedeIds: formData.sedeIds,
            esPromo: formData.esPromo,
            // Van como '' y no como undefined a propósito: es así como el
            // server distingue "sacale la fecha" de "no la toques".
            vigenteDesde: formData.esPromo ? formData.vigenteDesde : '',
            vigenteHasta: formData.esPromo ? formData.vigenteHasta : '',
            // Igual que las fechas: `[]` es como se le dice al server "no tapes
            // nada". Sacarle el check de promo tiene que liberar los productos
            // que tapaba — si no, quedarian escondidos por una promo que ya no
            // existe y nadie sabria donde buscar el motivo.
            ocultaItemIds: formData.esPromo ? formData.ocultaItemIds ?? [] : [],
          },
        });
      } else {
        await crearItem({
          categoriaId: formData.categoriaId,
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          ingredientes: formData.ingredientes,
          precio,
          precioConLeche: aNumero(formData.precioConLeche) || undefined,
          marca: formData.marca || undefined,
          sabor: formData.sabor || undefined,
          // En el alta sí va undefined cuando está vacío: no hay nada previo que
          // borrar, y así no se guarda un `[]` que significa lo mismo que ausente.
          presentaciones: seVendePorTamano ? presentaciones : undefined,
          // El placeholder solo si no subió foto: con storage el `imagenUrl` queda
          // vacío a propósito, y la query resuelve la URL desde el id.
          imagenUrl: formData.imagenStorageId
            ? undefined
            : formData.imagenUrl || PLACEHOLDER_PRODUCTO,
          imagenStorageId: formData.imagenStorageId || undefined,
          llevaSalsas: formData.llevaSalsas,
          disponible: formData.disponible,
          sedeIds: formData.sedeIds,
          esPromo: formData.esPromo,
          vigenteDesde: formData.esPromo ? formData.vigenteDesde || undefined : undefined,
          vigenteHasta: formData.esPromo ? formData.vigenteHasta || undefined : undefined,
          ocultaItemIds:
            formData.esPromo && formData.ocultaItemIds?.length
              ? formData.ocultaItemIds
              : undefined,
        });
      }

      cerrarModal();
      notificar.exito(editandoAhora ? 'Producto actualizado' : 'Producto creado');
    } catch (error) {
      console.error('Error al guardar producto:', error);
      notificar.error(mensajeDeError(error));
    }
  };

  const eliminar = async (item) => {
    const confirmado = await confirmar({
      titulo: `¿Eliminar "${item.nombre}"?`,
      mensaje: 'Esta acción no se puede deshacer.',
      textoConfirmar: 'Eliminar',
      peligroso: true,
    });
    if (!confirmado) return;

    try {
      await borrarItem({ id: item._id });
      notificar.exito('Producto eliminado');
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      notificar.error(mensajeDeError(error));
    }
  };

  const alternarDisponible = async (item) => {
    try {
      await actualizarItem({
        id: item._id,
        campos: { disponible: !item.disponible },
      });
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      notificar.error(mensajeDeError(error));
    }
  };

  return {
    categorias,
    sedes,
    categoriaMap,
    // Lista completa y sin paginar: la usa la pestaña de Promociones, que es
    // una vista filtrada de estos mismos items (`esPromo`).
    todosLosItems: items,
    paginados,
    pagina,
    setPagina,
    totalPaginas,
    resumen: {
      total: items.length,
      filtrados: filtrados.length,
      activos: items.filter((item) => item.disponible).length,
    },
    filtros: {
      busqueda,
      setBusqueda: cambiarFiltro(setBusqueda),
      categoria: filtroCategoria,
      setCategoria: cambiarFiltro(setFiltroCategoria),
      estado: filtroEstado,
      setEstado: cambiarFiltro(setFiltroEstado),
    },
    modal: { abierto: modalAbierto, editando, abrirNuevo, abrirEdicion, cerrar: cerrarModal },
    acciones: { guardar, eliminar, alternarDisponible },
  };
};
