import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env.local") });

const convexUrl = process.env.VITE_CONVEX_URL;
if (!convexUrl) {
  console.error("❌ VITE_CONVEX_URL no está definido en .env.local");
  process.exit(1);
}

console.log("✓ Conectando a:", convexUrl);

const apiUrl = convexUrl.replace("https://", "").split(".")[0];

async function callMutation(functionName, args) {
  const response = await fetch(`${convexUrl}/api/mutation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: functionName,
      args
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`${functionName}: ${error}`);
  }

  return await response.json();
}

async function seed() {
  console.log("🌱 Sembrando datos en Convex...\n");

  const categorias = [
    { nombre: "Broaster", orden: 1 },
    { nombre: "Ensaladas", orden: 2 },
    { nombre: "Sándwiches", orden: 3 },
    { nombre: "Papas y Acompañamientos", orden: 4 },
    { nombre: "Bebidas", orden: 5 },
    { nombre: "Postres", orden: 6 },
    { nombre: "Salsas", orden: 7 },
  ];

  const items = [
    { categoria: "Broaster", nombre: "Salchipapa Especial", descripcion: "Papas con salchichas premium", precio: 16000 },
    { categoria: "Broaster", nombre: "Alitas BBQ", descripcion: "Alitas crujientes con salsa BBQ", precio: 18000 },
    { categoria: "Broaster", nombre: "Pechuga Completa", descripcion: "Pechuga de pollo jugosa", precio: 22000 },
    { categoria: "Ensaladas", nombre: "Ensalada Griega", descripcion: "Lechuga, tomate, queso feta", precio: 14000 },
    { categoria: "Ensaladas", nombre: "Ensalada César", descripcion: "Lechuga romana con crutones", precio: 15000 },
    { categoria: "Sándwiches", nombre: "Sándwich de Pollo", descripcion: "Pan tostado con pechuga", precio: 12000 },
    { categoria: "Sándwiches", nombre: "Sándwich de Queso", descripcion: "Queso derretido en pan", precio: 10000 },
    { categoria: "Papas y Acompañamientos", nombre: "Papas Francesas", descripcion: "Papas crujientes", precio: 8000 },
    { categoria: "Papas y Acompañamientos", nombre: "Papas Gratinadas", descripcion: "Papas con queso", precio: 10000 },
    { categoria: "Bebidas", nombre: "Gaseosa 2L", descripcion: "Bebida gaseosa", precio: 8000 },
    { categoria: "Bebidas", nombre: "Jugo Natural", descripcion: "Jugo fresco", precio: 6000 },
    { categoria: "Postres", nombre: "Brownie", descripcion: "Chocolate caliente", precio: 7000 },
    { categoria: "Postres", nombre: "Helado", descripcion: "Helado cremoso", precio: 5000 },
  ];

  try {
    const categoriaIds = {};

    for (const cat of categorias) {
      try {
        const result = await callMutation("categorias:crear", {
          nombre: cat.nombre,
          orden: cat.orden,
        });
        categoriaIds[cat.nombre] = result;
        console.log(`✓ Categoría: ${cat.nombre}`);
      } catch (err) {
        console.error(`❌ Error en categoría ${cat.nombre}:`, err.message);
      }
    }

    for (const item of items) {
      try {
        await callMutation("items:crear", {
          categoriaId: categoriaIds[item.categoria],
          nombre: item.nombre,
          descripcion: item.descripcion,
          precio: item.precio,
        });
        console.log(`✓ Item: ${item.nombre}`);
      } catch (err) {
        console.error(`❌ Error en item ${item.nombre}:`, err.message);
      }
    }

    console.log("\n✅ ¡Datos sembrados!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error general:", err.message);
    process.exit(1);
  }
}

seed();
