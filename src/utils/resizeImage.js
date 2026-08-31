// Achica una imagen en el navegador ANTES de convertirla a base64.
//
// Las imagenes se guardan como data URI dentro del documento de Convex, y
// Convex limita cada documento a 1 MiB. base64 infla ~33%, asi que el techo
// real es ~786 KB de foto. Una foto de celular (2-5 MB) revienta el insert.
// Redimensionando a 800px y calidad 0.8 una foto de 4 MB queda en ~120 KB.

const MAX_DIMENSION = 800;
const JPEG_QUALITY = 0.8;

// Escala manteniendo proporcion: solo achica, nunca agranda
const calcularMedidas = (ancho, alto, maxLado) => {
  if (ancho <= maxLado && alto <= maxLado) {
    return { ancho, alto };
  }

  const escala = maxLado / Math.max(ancho, alto);
  return {
    ancho: Math.round(ancho * escala),
    alto: Math.round(alto * escala),
  };
};

// Decodifica el archivo y lo dibuja ya escalado en un canvas.
//
// Es el tronco comun de las dos exportaciones: cambia solo como se saca el
// resultado del canvas (data URI o Blob), no como se llega hasta el.
const dibujarEnCanvas = (file, maxDimension) =>
  new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No se recibio ningun archivo'));
      return;
    }

    if (!file.type.startsWith('image/')) {
      reject(new Error('El archivo no es una imagen'));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      // Liberamos el blob apenas la imagen quedo decodificada en memoria
      URL.revokeObjectURL(objectUrl);

      const { ancho, alto } = calcularMedidas(
        img.naturalWidth,
        img.naturalHeight,
        maxDimension
      );

      const canvas = document.createElement('canvas');
      canvas.width = ancho;
      canvas.height = alto;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, ancho, alto);

      resolve(canvas);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('No se pudo leer la imagen'));
    };

    img.src = objectUrl;
  });

export const resizeImage = async (
  file,
  { maxDimension = MAX_DIMENSION, quality = JPEG_QUALITY } = {}
) => {
  const canvas = await dibujarEnCanvas(file, maxDimension);

  // Siempre JPEG: un PNG de foto pesa varias veces mas y aca no
  // necesitamos transparencia
  return canvas.toDataURL('image/jpeg', quality);
};

/**
 * Igual que resizeImage pero devuelve un Blob.
 *
 * Es lo que necesita la subida a Convex File Storage, que sube el archivo
 * crudo por fetch. Un data URI ahi obligaria a decodificar el base64 a mano
 * y a pagar el 33% de inflado en el traslado, justo lo que file storage
 * viene a evitar.
 */
export const resizeImageToBlob = async (
  file,
  { maxDimension = MAX_DIMENSION, quality = JPEG_QUALITY } = {}
) => {
  const canvas = await dibujarEnCanvas(file, maxDimension);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('No se pudo convertir la imagen'));
      },
      'image/jpeg',
      quality
    );
  });
};
