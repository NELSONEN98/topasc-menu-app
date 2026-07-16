import { ConvexClient } from "convex/browser";

const convexUrl = process.env.VITE_CONVEX_URL;
if (!convexUrl) {
  console.error("❌ VITE_CONVEX_URL no está definido en .env.local");
  process.exit(1);
}

const client = new ConvexClient(convexUrl);

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
    { categoria: "Ensaladas", nombre: "Ensalada Griega", descripcion: "Lechuga, tomate, queso feta y aceitunas", precio: 14000 },
    { categoria: "Ensaladas", nombre: "Ensalada César", descripcion: "Lechuga romana con crutones", precio: 15000 },
    { categoria: "Sándwiches", nombre: "Sándwich de Pollo", descripcion: "Pan tostado con pechuga", precio: 12000 },
    { categoria: "Sándwiches", nombre: "Sándwich de Queso", descripcion: "Queso derretido en pan tostado", precio: 10000 },
    { categoria: "Papas y Acompañamientos", nombre: "Papas Francesas", descripcion: "Papas crujientes", precio: 8000 },
    { categoria: "Papas y Acompañamientos", nombre: "Papas Gratinadas", descripcion: "Papas con queso", precio: 10000 },
    { categoria: "Bebidas", nombre: "Gaseosa 2L", descripcion: "Bebida gaseosa", precio: 8000 },
    { categoria: "Bebidas", nombre: "Jugo Natural", descripcion: "Jugo fresco", precio: 6000 },
    { categoria: "Postres", nombre: "Brownie", descripcion: "Chocolate caliente", precio: 7000 },
    { categoria: "Postres", nombre: "Helado", descripcion: "Helado cremoso", precio: 5000 },
  ];

  try {
    // Crear categorías
    const categoriaIds = {};

    for (const cat of categorias) {
      const id = await client.mutation("categorias:crear", {
        nombre: cat.nombre,
        orden: cat.orden,
      });
      categoriaIds[cat.nombre] = id;
      console.log(`✓ Categoría: ${cat.nombre}`);
    }

    // Crear items
    for (const item of items) {
      await client.mutation("items:crear", {
        categoriaId: categoriaIds[item.categoria],
        nombre: item.nombre,
        descripcion: item.descripcion,
        precio: item.precio,
      });
      console.log(`✓ Item: ${item.nombre}`);
    }

    console.log("\n✅ ¡Datos sembrados exitosamente!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

seed();
