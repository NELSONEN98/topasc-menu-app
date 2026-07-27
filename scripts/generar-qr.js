import QRCode from "qrcode";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// UNICA LINEA QUE HAY QUE EDITAR.
//
// Un QR impreso apunta a esta URL para siempre. Poner aca el dominio propio
// (topasc.com), no la URL del hosting: si algun dia se migra de Vercel, el
// papel pegado en la mesa tiene que seguir funcionando.
// ---------------------------------------------------------------------------
const BASE_URL = "https://topasc-menu-app.vercel.app/";

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
  const consulta = 'return await ctx.db.query("mesas").collect()';

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
  return mesas
    .filter((m) => m.activo)
    .sort((a, b) => Number(a.numero) - Number(b.numero));
}

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
// Lienzo 1000x1240: titulo arriba, QR de 800px al medio, codigo abajo. El
// numero va DENTRO de la imagen y no solo en el nombre del archivo: cinco QR
// impresos son indistinguibles a simple vista, y pegar el de la mesa 2 en la 4
// manda los pedidos a la mesa equivocada.
const LIENZO = { ancho: 1000, alto: 1240 };
const QR_PX = 800;

const escapar = (t) =>
  String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function generarPng({ numero, codigo, url }) {
  const qr = await QRCode.toBuffer(url, {
    errorCorrectionLevel: "H",
    margin: 1,
    width: QR_PX,
    color: { dark: "#000000", light: "#ffffff" },
  });

  const fondo = `<svg width="${LIENZO.ancho}" height="${LIENZO.alto}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${LIENZO.ancho}" height="${LIENZO.alto}" fill="#ffffff"/>
  <text x="500" y="120" text-anchor="middle" fill="#241C15"
        font-family="Arial, Helvetica, sans-serif" font-size="76" font-weight="bold">Mesa ${escapar(
          numero
        )}</text>
  <text x="500" y="1075" text-anchor="middle" fill="#241C15"
        font-family="Consolas, monospace" font-size="58" font-weight="bold"
        letter-spacing="10">${escapar(codigo)}</text>
  <text x="500" y="1150" text-anchor="middle" fill="#666666"
        font-family="Arial, Helvetica, sans-serif" font-size="30">Escanea para ver el menú y pedir</text>
</svg>`;

  const destino = path.join(SALIDA_PNG, `mesa-${numero}-${codigo}.png`);

  await sharp(Buffer.from(fondo))
    .composite([{ input: qr, top: 175, left: (LIENZO.ancho - QR_PX) / 2 }])
    .png()
    .toFile(destino);

  return destino;
}

function tarjeta({ numero, codigo, url, svg }) {
  return `      <article class="mesa">
        <div class="mesa__num">Mesa ${numero}</div>
        <div class="mesa__qr">${svg}</div>
        <div class="mesa__codigo">${codigo}</div>
        <div class="mesa__url">${url}</div>
      </article>`;
}

async function generar() {
  const mesas = traerMesas();

  if (mesas.length === 0) {
    console.error("No hay mesas activas en produccion. Nada para generar.");
    process.exit(1);
  }

  await fs.mkdir(SALIDA_PNG, { recursive: true });

  const tarjetas = [];
  const pngs = [];
  for (const mesa of mesas) {
    const url = `${BASE}/mesa/${mesa.codigo}`;
    const svg = await QRCode.toString(url, opcionesQR);
    tarjetas.push(tarjeta({ numero: mesa.numero, codigo: mesa.codigo, url, svg }));

    const png = await generarPng({ numero: mesa.numero, codigo: mesa.codigo, url });
    pngs.push(png);

    console.log(`  mesa ${mesa.numero}  ->  ${url}`);
  }

  const aviso = SIN_CONFIGURAR
    ? `    <div class="aviso">
      NO IMPRIMIR &mdash; BASE_URL sin configurar.
      Editar <code>scripts/generar-qr.js</code> y volver a correr <code>npm run qr</code>.
    </div>
`
    : "";

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

  .mesa {
    border: 1.5px dashed #999;
    border-radius: 3mm;
    padding: 7mm 5mm;
    text-align: center;
    break-inside: avoid;
    page-break-inside: avoid;
  }

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

    <div class="hoja">
${tarjetas.join("\n")}
    </div>

    <p class="pie">
      Generado con <code>npm run qr</code> &mdash; ${mesas.length} mesa(s) activa(s).
      Cortar por la línea punteada.
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
