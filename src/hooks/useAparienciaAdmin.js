import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useNotificacion } from '../context/NotificacionContext';
import { mensajeDeError } from '../utils/mensajeDeError';
import { resizeImageToBlob } from '../utils/resizeImage';

// El Hero ocupa todo el ancho de la pantalla, asi que 800px (el default de
// resizeImage, pensado para miniaturas de producto) se ve blando. 1600px
// cubre un celular de 400px logicos a 3x y todavia pesa poco.
const ANCHO_MAXIMO = 1600;
const CALIDAD = 0.82;

// Techo de cortesia sobre el archivo de ENTRADA, antes de procesarlo.
// No es un limite de storage: es para no dejar al navegador decodificando
// una imagen de 40 MB y que parezca que la pagina se colgo.
const MAX_ENTRADA_MB = 15;

export const useAparienciaAdmin = () => {
  const { notificar, confirmar } = useNotificacion();

  const configCargando = useQuery(api.configuracion.obtener);
  const generarUrlDeSubida = useMutation(api.configuracion.generarUrlDeSubida);
  const guardarImagenHeader = useMutation(api.configuracion.guardarImagenHeader);
  const quitarImagenHeader = useMutation(api.configuracion.quitarImagenHeader);

  const [subiendo, setSubiendo] = useState(false);

  const imagenUrl = configCargando?.imagenHeaderUrl ?? null;

  const subirImagen = async (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notificar.info('El archivo tiene que ser una imagen');
      return;
    }

    if (file.size > MAX_ENTRADA_MB * 1024 * 1024) {
      notificar.info(`La imagen no puede pesar más de ${MAX_ENTRADA_MB} MB`);
      return;
    }

    setSubiendo(true);

    try {
      // Se achica ANTES de subir. Subir la foto original de un celular
      // gastaria los datos del admin y storage, para despues mostrarla a
      // una fraccion de su tamaño.
      const blob = await resizeImageToBlob(file, {
        maxDimension: ANCHO_MAXIMO,
        quality: CALIDAD,
      });

      // Paso 1: URL de un solo uso.
      const url = await generarUrlDeSubida();

      // Paso 2: el archivo va directo a storage, sin pasar por una mutation.
      const respuesta = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': blob.type },
        body: blob,
      });

      if (!respuesta.ok) {
        throw new Error('No se pudo subir la imagen. Probá de nuevo.');
      }

      const { storageId } = await respuesta.json();

      // Paso 3: recien aca la configuracion apunta al archivo nuevo.
      await guardarImagenHeader({ storageId });

      notificar.exito('Imagen del header actualizada');
    } catch (error) {
      console.error('Error al subir la imagen del header:', error);
      notificar.error(mensajeDeError(error));
    } finally {
      setSubiendo(false);
    }
  };

  const quitarImagen = async () => {
    const confirmado = await confirmar({
      titulo: '¿Quitar la imagen del header?',
      mensaje:
        'El menú vuelve a mostrar la portada por defecto. La imagen se borra y no se puede recuperar.',
      textoConfirmar: 'Quitar',
      peligroso: true,
    });
    if (!confirmado) return;

    try {
      await quitarImagenHeader();
      notificar.exito('Imagen del header quitada');
    } catch (error) {
      console.error('Error al quitar la imagen del header:', error);
      notificar.error(mensajeDeError(error));
    }
  };

  return {
    imagenUrl,
    // undefined = la query todavia no respondio. Distinto de "respondio y
    // no hay imagen", que es null.
    cargando: configCargando === undefined,
    subiendo,
    acciones: { subirImagen, quitarImagen },
  };
};
