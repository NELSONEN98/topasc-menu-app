# Broaster Topasc — React E-commerce Frontend

Proyecto React mobile-first para Broaster Topasc con carrito de compras y integración WhatsApp.

## 🚀 Stack

- **React 18** — UI library
- **Vite** — Build tool (fast development)
- **CSS Modular** — Estilos organizados por componente
- **Context API** — State management para carrito
- **REM-based** — Tipografía y espaciado responsive

## 📁 Estructura

```
src/
├── components/
│   ├── atoms/
│   │   ├── Button.jsx       (componente reutilizable)
│   │   └── Stepper.jsx      (incrementador/decrementador)
│   ├── molecules/
│   │   ├── ProductCard.jsx  (tarjeta de producto)
│   │   └── CartItem.jsx     (item dentro del carrito)
│   └── organisms/
│       └── Header.jsx       (encabezado con carrito)
├── pages/
│   ├── Home.jsx             (lista de productos)
│   └── Cart.jsx             (carrito de compras)
├── context/
│   └── CartContext.jsx      (Context API para carrito)
├── styles/
│   ├── global.css           (estilos globales)
│   └── colors.js            (sistema de colores centralizado)
├── data/
│   └── products.mock.js     (datos de prueba → reemplazar con API)
├── App.jsx                  (componente principal)
└── main.jsx                 (entry point)
```

## 🎯 Características

### ✅ Implementadas
- **Catálogo de productos** con filtrado por categoría
- **Agregar/Eliminar productos** del carrito
- **Incrementar/Decrementar cantidades** con stepper
- **Cálculo automático** de totales
- **Sistema de colores** centralizado en REM
- **Responsive design** (móvil, tablet, desktop)
- **Integración WhatsApp** para checkout (placeholder)

### 🔄 A Reemplazar
- `src/data/products.mock.js` → API endpoint real
- WhatsApp URL en `Cart.jsx` → Backend checkout real
- Imágenes de Unsplash → CDN real del proyecto

## 🛠️ Instalación

```bash
# Instalar dependencias
npm install

# Desarrollar
npm run dev

# Compilar para producción
npm run build
```

## 📐 Sistema de Espaciado (REM)

Todo está basado en `1rem = 16px`:

| Variable | Valor | Px |
|----------|-------|-----|
| `xs`     | 0.25rem | 4px |
| `sm`     | 0.5rem  | 8px |
| `md`     | 1rem    | 16px |
| `lg`     | 1.5rem  | 24px |
| `xl`     | 2rem    | 32px |

## 🎨 Paleta de Colores

| Nombre | Valor | Uso |
|--------|-------|-----|
| `primary` | #E11E2B | CTA, badges |
| `success` | #25D366 | Checkout (WhatsApp) |
| `darkText` | #241C15 | Textos principales |
| `lightText` | #fff | Textos sobre fondo oscuro |
| `bgLight` | #FBF6EE | Fondo principal |
| `accentYellow` | #FFE9A8 | Accents, loaders |

## 🔗 Componentes Reutilizables

### Button
```jsx
<Button variant="primary|secondary|success|ghost" size="sm|md|lg">
  Texto
</Button>
```

### Stepper
```jsx
<Stepper value={qty} onChange={(qty) => setQty(qty)} />
```

### ProductCard
```jsx
<ProductCard product={product} onAddToCart={handleAdd} />
```

### CartItem
```jsx
<CartItem item={item} onUpdateQuantity={update} onRemove={remove} />
```

## 📦 Next Steps

1. Conectar API real en `src/pages/Home.jsx`
2. Implementar backend checkout
3. Autenticación/Login
4. Historial de pedidos
5. Cuenta de usuario

## 📝 Notas

- Los precios están en COP (Pesos Colombianos)
- Las imágenes son placeholders de Unsplash
- El carrito persiste EN MEMORIA (reset en refresh) → implementar localStorage si es necesario
