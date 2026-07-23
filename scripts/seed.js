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
    { nombre: "Salchipapas", orden: 1 },
    { nombre: "Hamburguesas", orden: 2 },
    { nombre: "Perros", orden: 3 },
    { nombre: "Lasagnas", orden: 4 },
    { nombre: "Bebidas", orden: 5 },
    { nombre: "Postres", orden: 6 },
    { nombre: "Alitas", orden: 7 },
    { nombre: "Papas y Acompañamientos", orden: 8 },
  ];

  const items = [
    { categoria: "Salchipapas", nombre: "Salchipapa Especial", descripcion: "Papas con salchichas premium", precio: 16000, imagenUrl: "https://images.unsplash.com/photo-1585238341710-4ead7b36651b?w=300&h=300&fit=crop" },
    { categoria: "Alitas", nombre: "Alitas BBQ", descripcion: "Alitas crujientes con salsa BBQ", precio: 18000, imagenUrl: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300&h=300&fit=crop" },
    { categoria: "Papas y Acompañamientos", nombre: "Papas Francesas", descripcion: "Papas crujientes", precio: 8000, imagenUrl: "https://images.unsplash.com/photo-1585238341710-4ead7b36651b?w=300&h=300&fit=crop" },
    { categoria: "Papas y Acompañamientos", nombre: "Papas Gratinadas", descripcion: "Papas con queso", precio: 10000, imagenUrl: "https://images.unsplash.com/photo-1599599810694-b5ac4dd4c251?w=300&h=300&fit=crop" },
    { categoria: "Bebidas", nombre: "Gaseosa 2L", descripcion: "Bebida gaseosa", precio: 8000, imagenUrl: "https://images.unsplash.com/photo-1554866585-f9c27d5b7e64?w=300&h=300&fit=crop" },
    { categoria: "Bebidas", nombre: "Jugo Natural", descripcion: "Jugo fresco", precio: 6000, imagenUrl: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=300&h=300&fit=crop" },
    { categoria: "Postres", nombre: "Brownie", descripcion: "Chocolate caliente", precio: 7000, imagenUrl: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=300&h=300&fit=crop" },
    { categoria: "Postres", nombre: "Helado", descripcion: "Helado cremoso", precio: 5000, imagenUrl: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=300&h=300&fit=crop" },
  ];

  const salsas = [
    { nombre: "Salsa Roja", tipo: "base", precio: 0 },
    { nombre: "Salsa Rosada", tipo: "base", precio: 0 },
    { nombre: "Salsa de Ajo", tipo: "base", precio: 0 },
    { nombre: "Salsa BBQ", tipo: "base", precio: 0 },
    { nombre: "Mostaza", tipo: "base", precio: 0 },
    { nombre: "Salsa Picante", tipo: "base", precio: 0 },
  ];

  try {
    const categoriaIds = {};

    for (const cat of categorias) {
      try {
        const result = await callMutation("categorias:crear", {
          nombre: cat.nombre,
          orden: cat.orden,
        });
        categoriaIds[cat.nombre] = result.value || result;
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
          imagenUrl: item.imagenUrl,
        });
        console.log(`✓ Item: ${item.nombre}`);
      } catch (err) {
        console.error(`❌ Error en item ${item.nombre}:`, err.message);
      }
    }

    for (const salsa of salsas) {
      try {
        await callMutation("salsas:crear", salsa);
        console.log(`✓ Salsa: ${salsa.nombre}`);
      } catch (err) {
        console.error(`❌ Error en salsa ${salsa.nombre}:`, err.message);
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
