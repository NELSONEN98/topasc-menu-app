import { createContext, useContext, useState, useCallback } from 'react';

const CartContext = createContext();

// Opción fija del front: no es una salsa, es la ausencia de salsas.
// Es excluyente con cualquier salsa real, por eso no vive en la base de datos.
export const SIN_SALSAS = 'Sin salsas';

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe usarse dentro de CartProvider');
  }
  return context;
};

// Los productos de Convex llegan con _id/nombre/precio/imagenUrl y los mocks
// con id/name/price/image — el carrito guarda siempre el mismo shape.
// Una "línea" es producto + salsas + extras + comentario: el mismo producto
// con distintas salsas o comentario ocupa líneas separadas.
const toCartItem = (product, opciones = {}) => {
  const { salsas = [], salsasExtra = [], comentario = '' } = opciones;
  const id = product._id ?? product.id;
  const precioBase = product.precio ?? product.price;
  const precioExtras = salsasExtra.reduce((sum, s) => sum + s.precio, 0);
  const salsasKey = [...salsas].sort().join(',');
  const extrasKey = salsasExtra
    .map((s) => s.nombre)
    .sort()
    .join(',');

  return {
    lineId: `${id}::${salsasKey}::${extrasKey}::${comentario.trim()}`,
    id,
    name: product.nombre ?? product.name,
    price: precioBase + precioExtras,
    image: product.imagenUrl ?? product.image,
    salsas,
    salsasExtra,
    comentario: comentario.trim(),
  };
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);

  // Agregar producto al carrito (con salsa, extras y comentario)
  const addToCart = useCallback((product, opciones = {}) => {
    const cantidad = opciones.cantidad ?? 1;
    const newItem = toCartItem(product, opciones);

    setCartItems((prevItems) => {
      const existingItem = prevItems.find(
        (item) => item.lineId === newItem.lineId
      );

      if (existingItem) {
        // Misma configuración exacta: incrementar cantidad
        return prevItems.map((item) =>
          item.lineId === newItem.lineId
            ? { ...item, quantity: item.quantity + cantidad }
            : item
        );
      }

      return [...prevItems, { ...newItem, quantity: cantidad }];
    });
  }, []);

  // Eliminar línea del carrito
  const removeFromCart = useCallback((lineId) => {
    setCartItems((prevItems) =>
      prevItems.filter((item) => item.lineId !== lineId)
    );
  }, []);

  // Actualizar cantidad de una línea
  const updateQuantity = useCallback((lineId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(lineId);
      return;
    }

    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.lineId === lineId ? { ...item, quantity } : item
      )
    );
  }, [removeFromCart]);

  // Limpiar carrito
  const clearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  // Calcular total
  const getTotal = useCallback(() => {
    return cartItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  }, [cartItems]);

  // Contar items
  const getItemCount = useCallback(() => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  }, [cartItems]);

  // Cantidad total de un producto sumando todas sus líneas
  const getProductQuantity = useCallback(
    (productId) =>
      cartItems
        .filter((item) => item.id === productId)
        .reduce((count, item) => count + item.quantity, 0),
    [cartItems]
  );

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotal,
    getItemCount,
    getProductQuantity,
  };

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
};
