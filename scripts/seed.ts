import { ConvexClient } from "convex/browser";

const client = new ConvexClient(process.env.VITE_CONVEX_URL!);

async function seed() {
  console.log("🌱 Sembrando datos en Convex...");

  // Crear categorías
  const categorias = [
    { nombre: "Broaster", orden: 1 },
    { nombre: "Ensaladas", orden: 2 },
    { nombre: "Sándwiches", orden: 3 },
    { nombre: "Papas y Acompañamientos", orden: 4 },
    { nombre: "Bebidas", orden: 5 },
    { nombre: "Postres", orden: 6 },
    { nombre: "Salsas", orden: 7 },
  ];

  const categoriaIds: Record<string, string> = {};

  for (const cat of categorias) {
    const id = await client.mutation(async (ctx: any) => {
      return await ctx.db.insert("categorias", {
        nombre: cat.nombre,
        orden: cat.orden,
        activo: true,
      });
    });
    categoriaIds[cat.nombre] = id;
    console.log(`✓ Categoría creada: ${cat.nombre}`);
  }

  // Crear items
  const items = [
    {
      categoria: "Broaster",
      nombre: "Salchipapa Especial",
      descripcion: "Papas con salchichas premium",
      precio: 16000,
      imagenUrl: "https://images.unsplash.com/photo-1585238341710-4ead7b36651b?w=300&h=300&fit=crop",
    },
    {
      categoria: "Broaster",
      nombre: "Alitas BBQ",
      descripcion: "Alitas crujientes con salsa BBQ",
      precio: 18000,
      imagenUrl: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=300&h=300&fit=crop",
    },
    {
      categoria: "Broaster",
      nombre: "Pechuga Completa",
      descripcion: "Pechuga de pollo jugosa",
      precio: 22000,
      imagenUrl: "https://images.unsplash.com/photo-1626082927389-6cd097cdc46e?w=300&h=300&fit=crop",
    },
    {
      categoria: "Ensaladas",
      nombre: "Ensalada Griega",
      descripcion: "Lechuga, tomate, queso feta y aceitunas",
      precio: 14000,
      imagenUrl: "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=300&h=300&fit=crop",
    },
    {
      categoria: "Ensaladas",
      nombre: "Ensalada César",
      descripcion: "Lechuga romana con crutones y aderezo César",
      precio: 15000,
      imagenUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=300&fit=crop",
    },
    {
      categoria: "Sándwiches",
      nombre: "Sándwich de Pollo",
      descripcion: "Pan tostado con pechuga, lechuga y tomate",
      precio: 12000,
      imagenUrl: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=300&h=300&fit=crop",
    },
    {
      categoria: "Sándwiches",
      nombre: "Sándwich de Queso",
      descripcion: "Queso derretido en pan tostado",
      precio: 10000,
      imagenUrl: "https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?w=300&h=300&fit=crop",
    },
    {
      categoria: "Papas y Acompañamientos",
      nombre: "Papas Francesas",
      descripcion: "Papas crujientes recién fritas",
      precio: 8000,
      imagenUrl: "https://images.unsplash.com/photo-1585238341710-4ead7b36651b?w=300&h=300&fit=crop",
    },
    {
      categoria: "Papas y Acompañamientos",
      nombre: "Papas Gratinadas",
      descripcion: "Papas con queso derretido",
      precio: 10000,
      imagenUrl: "https://images.unsplash.com/photo-1599599810694-b5ac4dd4c251?w=300&h=300&fit=crop",
    },
    {
      categoria: "Bebidas",
      nombre: "Gaseosa 2L",
      descripcion: "Refrescante bebida gaseosa",
      precio: 8000,
      imagenUrl: "https://images.unsplash.com/photo-1554866585-f9c27d5b7e64?w=300&h=300&fit=crop",
    },
    {
      categoria: "Bebidas",
      nombre: "Jugo Natural",
      descripcion: "Jugo fresco de frutas",
      precio: 6000,
      imagenUrl: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=300&h=300&fit=crop",
    },
    {
      categoria: "Postres",
      nombre: "Brownie",
      descripcion: "Chocolate caliente y abundante",
      precio: 7000,
      imagenUrl: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=300&h=300&fit=crop",
    },
    {
      categoria: "Postres",
      nombre: "Helado",
      descripcion: "Helado cremoso de vainilla",
      precio: 5000,
      imagenUrl: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=300&h=300&fit=crop",
    },
  ];

  for (const item of items) {
    await client.mutation(async (ctx: any) => {
      return await ctx.db.insert("items", {
        categoriaId: categoriaIds[item.categoria],
        nombre: item.nombre,
        descripcion: item.descripcion,
        precio: item.precio,
        imagenUrl: item.imagenUrl,
        disponible: true,
        activo: true,
      });
    });
    console.log(`✓ Item creado: ${item.nombre}`);
  }

  console.log("\n✅ ¡Datos sembrados exitosamente!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
