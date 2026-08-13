import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useNotificacion } from '../context/NotificacionContext';
import { mensajeDeError } from '../utils/mensajeDeError';
import { NOMBRE_DIA } from '../utils/horarios';

const SIN_DATOS = [];

// Valor del selector cuando se esta editando el horario que heredan todas las
// sedes. Es un string vacio y no null para poder usarlo directo como `value`
// de un <select> sin que React lo tome por no-controlado.
export const SEDE_GENERAL = '';

export const useHorariosAdmin = () => {
  const { notificar, confirmar } = useNotificacion();

  // Que sede se esta editando. Arranca en el general: es el horario base y el
  // que la mayoria de las veces alcanza con tocar.
  const [sedeId, setSedeId] = useState(SEDE_GENERAL);

  // listarTodas: una sede desactivada sigue teniendo horario, y el admin tiene
  // que poder verlo y editarlo antes de reactivarla.
  const sedes = useQuery(api.sedes.listarTodas) ?? SIN_DATOS;

  // `listar` siempre devuelve los 7 dias, asi que no hace falta paginar
  // ni contemplar el caso de la tabla vacia.
  const horarios =
    useQuery(api.horarios.listar, {
      sedeId: sedeId === SEDE_GENERAL ? undefined : sedeId,
    }) ?? SIN_DATOS;

  const guardarDia = useMutation(api.horarios.guardarDia);
  const volverAlGeneral = useMutation(api.horarios.volverAlGeneral);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);

  const editandoGeneral = sedeId === SEDE_GENERAL;
  const sedeActual = sedes.find((s) => s._id === sedeId);

  const abrirEdicion = (horario) => {
    setEditando(horario);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setEditando(null);
  };

  const guardar = async (formData) => {
    if (!editando) return;

    const { horaApertura, horaCierre, cerrado } = formData;

    if (!cerrado) {
      if (!horaApertura || !horaCierre) {
        notificar.info('Completá la hora de entrada y la de salida');
        return;
      }

      // Un cierre menor a la apertura (11:00 → 00:00) es valido: significa que
      // el local cierra despues de medianoche. Lo unico que no tiene sentido
      // es abrir y cerrar en el mismo minuto.
      if (horaApertura === horaCierre) {
        notificar.info('La hora de entrada y la de salida no pueden ser iguales');
        return;
      }
    }

    try {
      await guardarDia({
        sedeId: editandoGeneral ? undefined : sedeId,
        diaSemana: editando.diaSemana,
        horaApertura,
        horaCierre,
        cerrado,
      });

      cerrarModal();
      notificar.exito(
        editandoGeneral
          ? 'Horario general actualizado'
          : `Horario de ${sedeActual?.nombre ?? 'la sede'} actualizado`
      );
    } catch (error) {
      console.error('Error al guardar horario:', error);
      notificar.error(mensajeDeError(error));
    }
  };

  /** Descarta el horario propio de la sede para ese dia y vuelve a heredar. */
  const restaurarGeneral = async (horario) => {
    if (editandoGeneral) return;

    const confirmado = await confirmar({
      titulo: `¿Volver al horario general el ${NOMBRE_DIA[horario.diaSemana]}?`,
      mensaje:
        `${sedeActual?.nombre ?? 'Esta sede'} va a pasar a usar el horario general ` +
        `para ese día. Si más adelante cambiás el general, este local lo va a ` +
        `seguir automáticamente.`,
      textoConfirmar: 'Volver al general',
    });
    if (!confirmado) return;

    try {
      await volverAlGeneral({ sedeId, diaSemana: horario.diaSemana });
      notificar.exito('Ese día vuelve a seguir el horario general');
    } catch (error) {
      console.error('Error al restaurar el horario general:', error);
      notificar.error(mensajeDeError(error));
    }
  };

  return {
    horarios,
    sedes,
    sedeId,
    setSedeId,
    editandoGeneral,
    sedeActual,
    resumen: {
      abiertos: horarios.filter((h) => !h.cerrado).length,
      cerrados: horarios.filter((h) => h.cerrado).length,
      // Cuantos dias de esta sede todavia siguen al general. Solo tiene
      // sentido mirarlo cuando NO se esta editando el general.
      heredados: horarios.filter((h) => h.heredado).length,
    },
    modal: { abierto: modalAbierto, editando, abrirEdicion, cerrar: cerrarModal },
    acciones: { guardar, restaurarGeneral },
  };
};
