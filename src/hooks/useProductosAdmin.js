import { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useNotificacion } from '../context/NotificacionContext';
import { mensajeDeError } from '../utils/mensajeDeError';
import { aNumero } from '../utils/numeroDeInput';
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

  const items = useQuery(api.items.listarMenu) ?? SIN_DATOS;
  const categorias = useQuery(api.categorias.listar) ?? SIN_DATOS;
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

    const precio = aNumero(formData.precio);
    if (precio <= 0) {
      notificar.info('El precio debe ser mayor a 0');
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
            descripcion: formData.descripcion,
            ingredientes: formData.ingredientes,
            imagenUrl: formData.imagenUrl,
            disponible: formData.disponible,
            llevaSalsas: formData.llevaSalsas,
          },
        });
      } else {
        await crearItem({
          categoriaId: formData.categoriaId,
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          ingredientes: formData.ingredientes,
          precio,
          imagenUrl: formData.imagenUrl || PLACEHOLDER_PRODUCTO,
          llevaSalsas: formData.llevaSalsas,
          disponible: formData.disponible,
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
    categoriaMap,
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
