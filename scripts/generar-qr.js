import QRCode from "qrcode";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// El dominio se edita en src/config/settings.js (QR_BASE_URL), NO aca.
//
// Se importa de ahi porque el panel de admin genera los mismos QR desde el
// navegador: con una copia en cada lado, alcanza con que alguien cambie una
// para terminar con dos tandas de stickers apuntando a dominios distintos. Y
// eso, una vez impreso, no se arregla.
//
// settings.js es solo `export const`, sin dependencias del browser, asi que
// node lo importa sin problema.
// ---------------------------------------------------------------------------
import { QR_BASE_URL } from "../src/config/settings.js";

const BASE_URL = QR_BASE_URL;

// Sin barra final: mas abajo se concatena "/mesa/<codigo>" y una barra de mas
// genera "//mesa/XXXXX", que no matchea la ruta /mesa/:codigo de React Router
// y termina cayendo en el catch-all. En un QR ya impreso eso no se arregla.
const BASE = BASE_URL.trim().replace(/\/+$/, "");

const SALIDA = path.join(__dirname, "..", "qr-mesas.html");

// Carpeta de PNG sueltos, uno por mesa. Es lo que se le manda al cliente: un
// HTML no se reenvia por WhatsApp, una imagen si.
const SALIDA_PNG = path.join(__dirname, "..", "qr");

// Si BASE_URL sigue con el placeholder generamos igual, para poder ver el
// diseño, pero marcamos el HTML de forma que sea imposible imprimirlo por
// error.
const SIN_CONFIGURAR = BASE_URL.includes("CAMBIAME");

/**
 * Lee las mesas de produccion a traves del CLI de Convex.
 *
 * Antes esto le pegaba por HTTP a `mesas:listar`, pero esa query ahora exige
 * sesion de admin (ver convex/guardias.ts) y un script de linea de comandos no
 * tiene uno de esos tokens. `convex run --inline-query` se autentica con las
 * credenciales del CLI — las del dueño del proyecto — y corre en un sandbox de
 * solo lectura. Es el camino correcto: la alternativa habria sido dejar la
 * query abierta para que el script siguiera andando, o sea, agujerear el
 * backend para acomodar una herramienta interna.
 */
function traerMesas() {
  /*
   * Se resuelve el nombre de la sede en la misma consulta: el script corre una
   * sola vez contra produccion y no tiene sentido hacer dos viajes.
   *
   * Se arma con .join(" ") y NO como template literal multilinea: la consulta
   * viaja como argumento de linea de comandos, y los saltos de linea no
   * sobreviven el pasaje por la shell (llegan como "\n" literal y el modulo no
   * parsea). El array es solo para poder leerla; lo que se manda es una linea.
   */
  const consulta = [
    'const sedes = await ctx.db.query("sedes").collect();',
    "const nombrePorId = new Map(sedes.map((s) => [s._id, s.nombre]));",
    'const mesas = await ctx.db.query("mesas").collect();',
    "return mesas.map((m) => ({",
    "numero: m.numero,",
    "codigo: m.codigo,",
    "activo: m.activo,",
    "sedeNombre: m.sedeId ? (nombrePorId.get(m.sedeId) ?? null) : null,",
    "}));",
  ].join(" ");

  let salida;
  try {
    salida = execSync(
      `npx convex run --prod --inline-query ${JSON.stringify(consulta)}`,
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    );
  } catch (err) {
    throw new Error(
      `No se pudo consultar Convex. ¿Estás logueado con \`npx convex login\`?\n${
        err.stderr || err.message
      }`
    );
  }

  // El CLI puede anteponer lineas de progreso: nos quedamos con el array JSON.
  const desde = salida.indexOf("[");
  const hasta = salida.lastIndexOf("]");
  if (desde === -1 || hasta === -1) {
    throw new Error(`Respuesta inesperada del CLI de Convex:\n${salida}`);
  }

  const mesas = JSON.parse(salida.slice(desde, hasta + 1));

  // Solo las mesas activas: una mesa dada de baja no deberia tener QR pegado.
  return mesas.filter((m) => m.activo);
}

// Etiqueta de las mesas que todavia no tienen local asignado. Sus pedidos caen
// al numero de respaldo de settings.js, asi que no se pueden imprimir como si
// nada: van aparte y marcadas.
const SIN_SEDE = "Sin sede asignada";

/**
 * Agrupa las mesas por sede y ordena cada grupo por numero.
 *
 * Se agrupa porque cada local imprime y pega SUS stickers: mezclarlos en una
 * sola hoja obliga a recortar y repartir a mano, que es justo donde se cuela el
 * error de pegar el QR de un local en otro.
 *
 * El grupo sin sede va ultimo a proposito: es una lista de pendientes, no algo
 * para imprimir.
 */
function agruparPorSede(mesas) {
  const grupos = new Map();

  for (const mesa of mesas) {
    const clave = mesa.sedeNombre ?? SIN_SEDE;
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave).push(mesa);
  }

  for (const lista of grupos.values()) {
    // Numerico y no alfabetico: con `numero` como string, la mesa 10 iria
    // antes que la 2.
    lista.sort((a, b) => Number(a.numero) - Number(b.numero));
  }

  return [...grupos.entries()]
    .map(([sede, mesas]) => ({ sede, mesas }))
    .sort((a, b) => {
      if (a.sede === SIN_SEDE) return 1;
      if (b.sede === SIN_SEDE) return -1;
      return a.sede.localeCompare(b.sede, "es");
    });
}

// Para el nombre del archivo: "Sede Dalia" -> "sede-dalia". Los PNG se mandan
// sueltos por WhatsApp y el nombre del archivo es todo el contexto que llega
// del otro lado.
const aSlug = (texto) =>
  String(texto)
    .normalize("NFD")
    // \p{Diacritic} y no un rango de combinantes escrito literal: ese rango
    // depende de la codificacion con que se guarde este archivo, y si se
    // rompe lo hace en silencio (deja de sacar acentos y nadie se entera).
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Nivel H = 30% de redundancia. Es el mas alto y lo elegimos a proposito:
// estos QR viven pegados a una mesa de restaurante, donde se rayan, se manchan
// de grasa y se les vuelca gaseosa encima. Con H el codigo sigue leyendose
// aunque se pierda casi un tercio de la superficie.
const opcionesQR = {
  type: "svg",
  errorCorrectionLevel: "H",
  margin: 1,
  width: 320,
  color: { dark: "#000000", light: "#ffffff" },
};

// --- PNG individual por mesa -----------------------------------------------
// Lienzo 1000x1320: sede arriba, numero debajo, QR de 800px al medio, codigo
// abajo. El numero va DENTRO de la imagen y no solo en el nombre del archivo:
// cinco QR impresos son indistinguibles a simple vista, y pegar el de la mesa 2
// en la 4 manda los pedidos a la mesa equivocada.
//
// La SEDE va por el mismo motivo, un nivel mas arriba. Antes daba igual: todos
// los QR apuntaban al mismo WhatsApp y confundir dos stickers no tenia
// consecuencia. Desde que la mesa define a que local llega el pedido, pegar el
// QR de la mesa 5 de un local en otro manda esos pedidos al lugar equivocado, en
// silencio y hasta que alguien note que faltan. Y como cada local numera sus
// mesas 1..N, van a existir varias "Mesa 5": sin la sede impresa son
// literalmente indistinguibles.
const LIENZO = { ancho: 1000, alto: 1320 };
const QR_PX = 800;

const escapar = (t) =>
  String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function generarPng({ numero, codigo, url, sede }) {
  const qr = await QRCode.toBuffer(url, {
    errorCorrectionLevel: "H",
    margin: 1,
    width: QR_PX,
    color: { dark: "#000000", light: "#ffffff" },
  });

  const tieneSede = sede !== SIN_SEDE;

  // Una mesa sin local asignado se imprime igual pero en rojo y diciendolo: si
  // saliera con el mismo formato que las demas, se pegaria sin que nadie note
  // que sus pedidos van al numero de respaldo.
  const colorSede = tieneSede ? "#E11E2B" : "#B00020";
  const textoSede = tieneSede ? sede : "⚠ SIN SEDE — NO PEGAR";

  const fondo = `<svg width="${LIENZO.ancho}" height="${LIENZO.alto}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${LIENZO.ancho}" height="${LIENZO.alto}" fill="#ffffff"/>
  <text x="500" y="92" text-anchor="middle" fill="${colorSede}"
        font-family="Arial, Helvetica, sans-serif" font-size="46" font-weight="bold">${escapar(
          textoSede
        )}</text>
  <text x="500" y="184" text-anchor="middle" fill="#241C15"
        font-family="Arial, Helvetica, sans-serif" font-size="76" font-weight="bold">Mesa ${escapar(
          numero
        )}</text>
  <text x="500" y="1150" text-anchor="middle" fill="#241C15"
        font-family="Consolas, monospace" font-size="58" font-weight="bold"
        letter-spacing="10">${escapar(codigo)}</text>
  <text x="500" y="1225" text-anchor="middle" fill="#666666"
        font-family="Arial, Helvetica, sans-serif" font-size="30">Escanea para ver el menú y pedir</text>
</svg>`;

  // La sede va en el nombre del archivo porque los PNG se mandan sueltos por
  // WhatsApp: ahi el nombre es todo el contexto que llega del otro lado.
  const destino = path.join(
    SALIDA_PNG,
    `${aSlug(sede)}-mesa-${aSlug(numero)}-${codigo}.png`
  );

  await sharp(Buffer.from(fondo))
    .composite([{ input: qr, top: 232, left: (LIENZO.ancho - QR_PX) / 2 }])
    .png()
    .toFile(destino);

  return destino;
}

function tarjeta({ numero, codigo, url, svg, sede }) {
  const tieneSede = sede !== SIN_SEDE;

  // La sede va tambien en cada tarjeta, no solo en el titulo del bloque: una
  // vez recortadas por la linea punteada, el titulo se queda en el resto de la
  // hoja y el papelito que se pega en la mesa se queda sin decir de que local
  // es. Que es exactamente cuando importa.
  const etiqueta = tieneSede
    ? `<div class="mesa__sede">${escapar(sede)}</div>`
    : `<div class="mesa__sede mesa__sede--falta">⚠ SIN SEDE &mdash; NO PEGAR</div>`;

  return `      <article class="mesa${tieneSede ? "" : " mesa--falta"}">
        ${etiqueta}
        <div class="mesa__num">Mesa ${escapar(numero)}</div>
        <div class="mesa__qr">${svg}</div>
        <div class="mesa__codigo">${escapar(codigo)}</div>
        <div class="mesa__url">${escapar(url)}</div>
      </article>`;
}

async function generar() {
  const mesas = traerMesas();

  if (mesas.length === 0) {
    console.error("No hay mesas activas en produccion. Nada para generar.");
    process.exit(1);
  }

  await fs.mkdir(SALIDA_PNG, { recursive: true });

  const grupos = agruparPorSede(mesas);

  const bloques = [];
  const pngs = [];
  for (const grupo of grupos) {
    console.log(`\n  ${grupo.sede}`);

    const tarjetas = [];
    for (const mesa of grupo.mesas) {
      const url = `${BASE}/mesa/${mesa.codigo}`;
      const svg = await QRCode.toString(url, opcionesQR);

      tarjetas.push(
        tarjeta({
          numero: mesa.numero,
          codigo: mesa.codigo,
          url,
          svg,
          sede: grupo.sede,
        })
      );

      const png = await generarPng({
        numero: mesa.numero,
        codigo: mesa.codigo,
        url,
        sede: grupo.sede,
      });
      pngs.push(png);

      console.log(`    mesa ${mesa.numero}  ->  ${url}`);
    }

    // Cada sede arranca en pagina nueva: la hoja de un local se imprime y se
    // entrega entera, sin recortar de una hoja compartida con otro.
    bloques.push(`    <section class="sede">
      <h2 class="sede__titulo">${escapar(grupo.sede)}</h2>
      <div class="hoja">
${tarjetas.join("\n")}
      </div>
    </section>`);
  }

  const sinSede = grupos.find((g) => g.sede === SIN_SEDE);

  const avisoUrl = SIN_CONFIGURAR
    ? `    <div class="aviso">
      NO IMPRIMIR &mdash; BASE_URL sin configurar.
      Editar <code>scripts/generar-qr.js</code> y volver a correr <code>npm run qr</code>.
    </div>
`
    : "";

  const avisoSede = sinSede
    ? `    <div class="aviso">
      ${sinSede.mesas.length} mesa(s) sin sede asignada.
      Sus pedidos van al WhatsApp de respaldo, no al del local.
      Asignales una sede en el panel (pestaña Mesas) y volvé a correr <code>npm run qr</code>.
    </div>
`
    : "";

  const aviso = avisoUrl + avisoSede;

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>QR de mesas &mdash; Broaster Topasc</title>
<style>
  @page { size: A4; margin: 12mm; }

  :root { --tinta: #111; --suave: #666; }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    padding: 16mm 12mm;
    font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    color: var(--tinta);
    background: #fff;
  }

  h1 {
    font-size: 18pt;
    margin: 0 0 2mm;
    text-align: center;
  }

  .sub {
    text-align: center;
    color: var(--suave);
    font-size: 9pt;
    margin: 0 0 10mm;
  }

  .aviso {
    border: 2px solid #b00;
    color: #b00;
    background: #fff0f0;
    padding: 4mm;
    border-radius: 2mm;
    text-align: center;
    font-weight: 700;
    font-size: 11pt;
    margin-bottom: 8mm;
  }
  .aviso code { font-weight: 400; }

  .hoja {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8mm;
  }

  /* Cada local arranca en hoja nueva para poder imprimir y entregar la suya
     entera, sin recortar de una hoja compartida con otro local. */
  .sede + .sede {
    break-before: page;
    page-break-before: always;
  }

  .sede__titulo {
    font-size: 14pt;
    margin: 0 0 5mm;
    padding-bottom: 2mm;
    border-bottom: 1.5px solid #ddd;
  }

  .mesa {
    border: 1.5px dashed #999;
    border-radius: 3mm;
    padding: 7mm 5mm;
    text-align: center;
    break-inside: avoid;
    page-break-inside: avoid;
  }

  /* La sede en cada tarjeta: una vez recortada por la linea punteada, el
     titulo del bloque se queda en la hoja y el papelito tiene que seguir
     diciendo de que local es. */
  .mesa__sede {
    font-size: 10pt;
    font-weight: 700;
    color: #E11E2B;
    text-transform: uppercase;
    letter-spacing: 0.3pt;
    margin-bottom: 2mm;
  }

  .mesa--falta { border-color: #b00; }

  .mesa__sede--falta { color: #b00; }

  .mesa__num {
    font-size: 20pt;
    font-weight: 800;
    letter-spacing: -0.4pt;
    margin-bottom: 4mm;
  }

  /* El SVG que genera la libreria trae su propio viewBox: lo dejamos escalar
     al ancho de la tarjeta en vez de fijarle pixeles. */
  .mesa__qr svg {
    width: 100%;
    max-width: 62mm;
    height: auto;
    display: block;
    margin: 0 auto;
  }

  .mesa__codigo {
    margin-top: 4mm;
    font-family: ui-monospace, "SF Mono", Consolas, monospace;
    font-size: 15pt;
    font-weight: 700;
    letter-spacing: 2pt;
  }

  .mesa__url {
    margin-top: 1.5mm;
    color: var(--suave);
    font-size: 7pt;
    word-break: break-all;
  }

  .pie {
    margin-top: 10mm;
    text-align: center;
    color: var(--suave);
    font-size: 8pt;
  }

  @media print {
    body { padding: 0; }
    .pie { display: none; }
  }
</style>
</head>
<body>
${aviso}    <h1>Broaster Topasc</h1>
    <p class="sub">Escanea el código de tu mesa para ver el menú y pedir</p>

${bloques.join("\n")}

    <p class="pie">
      Generado con <code>npm run qr</code> &mdash; ${mesas.length} mesa(s) activa(s)
      en ${grupos.length} sede(s). Cortar por la línea punteada.
    </p>
</body>
</html>
`;

  await fs.writeFile(SALIDA, html, "utf8");
  return { mesas, salida: SALIDA, pngs };
}

generar()
  .then(({ mesas, salida, pngs }) => {
    console.log(`\n✓ ${mesas.length} PNG en ${SALIDA_PNG}`);
    for (const p of pngs) console.log(`    ${path.basename(p)}`);
    console.log(`\n✓ hoja imprimible en ${salida}`);
    if (SIN_CONFIGURAR) {
      console.log(
        "\n⚠  BASE_URL todavia dice CAMBIAME: el HTML salio marcado como NO IMPRIMIR.\n" +
          "   Editar scripts/generar-qr.js y volver a correr npm run qr."
      );
    }
  })
  .catch((err) => {
    console.error("✖ No se pudieron generar los QR:", err.message);
    process.exit(1);
  });
