import { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useNotificacion } from '../context/NotificacionContext';
import { mensajeDeError } from '../utils/mensajeDeError';

const SIN_DATOS = [];

/**
 * Pestaña de Categorias. Consulta `listarTodas` (no `listar`) porque el admin
 * necesita ver tambien las inactivas para poder reactivarlas.
 */
export const useCategoriasAdmin = () => {
  const { notificar, confirmar } = useNotificacion();

  const categorias = useQuery(api.categorias.listarTodas) ?? SIN_DATOS;
  // Convex deduplica suscripciones identicas, asi que pedir los items aca
  // no agrega trafico y mantiene el hook autosuficiente.
  // listarTodos: para contar productos por categoria hay que incluir los
  // apagados, o el conteo miente y una categoria parece vacia sin estarlo.
  const items = useQuery(api.items.listarTodos) ?? SIN_DATOS;
  const crearCategoria = useMutation(api.categorias.crear);
  const actualizarCategoria = useMutation(api.categorias.actualizar);
  const borrarCategoria = useMutation(api.categorias.borrar);

  /**
   * Update optimista: la fila queda en su lugar nuevo apenas soltas, sin
   * esperar el round trip al servidor.
   *
   * Sin esto el arrastre se siente roto. Soltas la categoria, la lista
   * vuelve un instante al orden viejo, y recien despues salta al nuevo.
   * Ese parpadeo lee como un bug aunque el guardado haya salido bien.
   *
   * Convex revierte solo si la mutation falla, asi que no hace falta
   * guardarse el orden anterior a mano.
   */
  const reordenarCategorias = useMutation(
    api.categorias.reordenar
  ).withOptimisticUpdate((localStore, { ids }) => {
    const actuales = localStore.getQuery(api.categorias.listarTodas, {});
    if (!actuales) return;

    const porId = new Map(actuales.map((cat) => [cat._id, cat]));
    const reordenadas = ids
      .map((id, indice) => {
        const cat = porId.get(id);
        return cat ? { ...cat, orden: indice + 1 } : null;
      })
      .filter(Boolean);

    localStore.setQuery(api.categorias.listarTodas, {}, reordenadas);
  });

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);

  const productosPorCategoria = useMemo(
    () =>
      items.reduce((acc, item) => {
        acc[item.categoriaId] = (acc[item.categoriaId] || 0) + 1;
        return acc;
      }, {}),
    [items]
  );

  // Posicion para la categoria nueva: siempre el final de la lista.
  // Ya no se expone al componente, porque el orden dejo de escribirse a
  // mano en el formulario y solo se define arrastrando.
  const siguienteOrden = useMemo(
    () =>
      categorias.length > 0
        ? Math.max(...categorias.map((c) => c.orden || 0)) + 1
        : 1,
    [categorias]
  );

  const abrirNuevo = () => {
    setEditando(null);
    setModalAbierto(true);
  };

  const abrirEdicion = (categoria) => {
    setEditando(categoria);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setEditando(null);
  };

  const guardar = async (formData) => {
    if (!formData.nombre.trim()) {
      notificar.info('El nombre de la categoría es obligatorio');
      return;
    }

    const editandoAhora = !!editando;

    try {
      if (editandoAhora) {
        // Sin `orden`. Es opcional en la mutation, y omitirlo garantiza que
        // renombrar o desactivar una categoria jamas le mueva la posicion:
        // eso ahora se hace solo arrastrando.
        await actualizarCategoria({
          id: editando._id,
          campos: { nombre: formData.nombre, activo: formData.activo },
        });
      } else {
        // La nueva entra al final de la lista. Desde ahi se arrastra.
        await crearCategoria({ nombre: formData.nombre, orden: siguienteOrden });
      }

      cerrarModal();
      notificar.exito(editandoAhora ? 'Categoría actualizada' : 'Categoría creada');
    } catch (error) {
      console.error('Error al guardar categoría:', error);
      notificar.error(mensajeDeError(error));
    }
  };

  const eliminar = async (categoria) => {
    const productos = productosPorCategoria[categoria._id] || 0;

    // Espejo de la guarda que vive en la mutation. Esta es UX (explicar por
    // que no se puede); la que protege los datos es la del servidor.
    if (productos > 0) {
      await confirmar({
        titulo: 'No se puede eliminar',
        mensaje:
          `"${categoria.nombre}" tiene ${productos} producto(s).\n\n` +
          `Si la borrás, esos productos quedan sin categoría y desaparecen del menú. ` +
          `Movelos a otra categoría primero, o desactivala para ocultarla sin perder nada.`,
        textoConfirmar: 'Entendido',
        soloAceptar: true,
      });
      return;
    }

    const confirmado = await confirmar({
      titulo: `¿Eliminar la categoría "${categoria.nombre}"?`,
      mensaje: 'Esta acción no se puede deshacer.',
      textoConfirmar: 'Eliminar',
      peligroso: true,
    });
    if (!confirmado) return;

    try {
      await borrarCategoria({ id: categoria._id });
      notificar.exito('Categoría eliminada');
    } catch (error) {
      console.error('Error al eliminar categoría:', error);
      notificar.error(mensajeDeError(error));
    }
  };

  /**
   * Recibe los ids ya acomodados y los persiste.
   *
   * No notifica en el camino feliz a proposito: un toast por cada arrastre
   * es ruido, y el resultado ya se ve en pantalla. Solo avisa si falla.
   */
  const reordenar = async (idsOrdenados) => {
    try {
      await reordenarCategorias({ ids: idsOrdenados });
    } catch (error) {
      console.error('Error al reordenar categorías:', error);
      notificar.error(mensajeDeError(error));
    }
  };

  const alternarActivo = async (categoria) => {
    try {
      await actualizarCategoria({
        id: categoria._id,
        campos: { activo: !categoria.activo },
      });
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      notificar.error(mensajeDeError(error));
    }
  };

  return {
    categorias,
    productosPorCategoria,
    resumen: {
      total: categorias.length,
      activas: categorias.filter((c) => c.activo).length,
    },
    modal: { abierto: modalAbierto, editando, abrirNuevo, abrirEdicion, cerrar: cerrarModal },
    acciones: { guardar, eliminar, alternarActivo, reordenar },
  };
};
