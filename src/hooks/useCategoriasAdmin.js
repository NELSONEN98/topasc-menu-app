import { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useNotificacion } from '../context/NotificacionContext';
import { mensajeDeError } from '../utils/mensajeDeError';
import { aNumero } from '../utils/numeroDeInput';

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
  const items = useQuery(api.items.listarMenu) ?? SIN_DATOS;
  const crearCategoria = useMutation(api.categorias.crear);
  const actualizarCategoria = useMutation(api.categorias.actualizar);
  const borrarCategoria = useMutation(api.categorias.borrar);

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
    const orden = aNumero(formData.orden, siguienteOrden);

    try {
      if (editandoAhora) {
        await actualizarCategoria({
          id: editando._id,
          campos: { nombre: formData.nombre, orden, activo: formData.activo },
        });
      } else {
        await crearCategoria({ nombre: formData.nombre, orden });
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
    siguienteOrden,
    resumen: {
      total: categorias.length,
      activas: categorias.filter((c) => c.activo).length,
    },
    modal: { abierto: modalAbierto, editando, abrirNuevo, abrirEdicion, cerrar: cerrarModal },
    acciones: { guardar, eliminar, alternarActivo },
  };
};
