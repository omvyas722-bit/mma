import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../lib/api';

const DEFAULT_PRODUCTS = [
  { id: 1, name: 'MMA Gloves', price: 59.99, stock: 15, category: 'Gear', sell_price: 59.99, stock_quantity: 15 },
  { id: 2, name: 'Shin Guards', price: 79.99, stock: 8, category: 'Gear', sell_price: 79.99, stock_quantity: 8 },
  { id: 3, name: 'Rash Guard', price: 44.99, stock: 22, category: 'Apparel', sell_price: 44.99, stock_quantity: 22 },
  { id: 4, name: 'Fight Shorts', price: 39.99, stock: 3, category: 'Apparel', sell_price: 39.99, stock_quantity: 3 },
  { id: 5, name: 'Protein Shake', price: 6.99, stock: 45, category: 'Supplements', sell_price: 6.99, stock_quantity: 45 },
  { id: 6, name: 'Pre-Workout', price: 4.99, stock: 30, category: 'Supplements', sell_price: 4.99, stock_quantity: 30 },
  { id: 7, name: 'Mouth Guard', price: 14.99, stock: 50, category: 'Gear', sell_price: 14.99, stock_quantity: 50 },
  { id: 8, name: 'Hand Wraps', price: 9.99, stock: 2, category: 'Gear', sell_price: 9.99, stock_quantity: 2 },
  { id: 9, name: 'Gym Towel', price: 19.99, stock: 40, category: 'Apparel', sell_price: 19.99, stock_quantity: 40 },
  { id: 10, name: 'Day Pass', price: 25.00, stock: 999, category: 'Passes', sell_price: 25.00, stock_quantity: 999 },
  { id: 11, name: 'PT Session', price: 65.00, stock: 999, category: 'Passes', sell_price: 65.00, stock_quantity: 999 },
  { id: 12, name: '10-Class Pass', price: 199.00, stock: 999, category: 'Passes', sell_price: 199.00, stock_quantity: 999 },
];

export default function PointOfSale() {
  const [cart, setCart] = useState([]);
  const [paid, setPaid] = useState(false);

  const { data: apiProducts } = useQuery({
    queryKey: ['pos-products'],
    queryFn: async () => {
      const data = await api.get('/api/stock/products');
      return Array.isArray(data) ? data : data?.data || [];
    },
    staleTime: 30000,
  });

  const PRODUCTS = apiProducts && apiProducts.length > 0
    ? apiProducts.map(p => ({
        id: p.id,
        name: p.name,
        price: p.sell_price || p.price || 0,
        stock: p.stock_quantity || p.stock || 0,
        category: p.category || 'Gear',
      }))
    : DEFAULT_PRODUCTS;

  const posSale = useMutation({
    mutationFn: (saleItems) => api.post('/api/stock/pos-sale', {
      items: saleItems.map(i => ({
        product_id: i.id,
        quantity: i.qty,
        unit_price: i.price,
      })),
      payment_method: 'cash',
    }),
  });

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(c => c.id === product.id);
      if (existing) {
        return prev.map(c => c.id === product.id ? { ...c, qty: c.qty + 1 } : c);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id, delta) => {
    setCart(prev => prev.map(c => {
      if (c.id !== id) return c;
      const newQty = c.qty + delta;
      return newQty <= 0 ? null : { ...c, qty: newQty };
    }).filter(Boolean));
  };

  const removeItem = (id) => {
    setCart(prev => prev.filter(c => c.id !== id));
  };

  const subtotal = cart.reduce((sum, c) => sum + c.price * c.qty, 0);

  const handleCharge = () => {
    if (cart.length === 0) return;
    posSale.mutate(cart, {
      onSuccess: () => {
        setPaid(true);
        setTimeout(() => { setCart([]); setPaid(false); }, 2000);
      },
    });
  };

  const isLowStock = (stock) => stock <= 5 && stock > 0;
  const isOutOfStock = (stock) => stock <= 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Point of Sale</h1>
          <p className="text-sm text-gray-500">Product grid and checkout</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Product Grid */}
        <div className="flex-1">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {PRODUCTS.filter(p => p.stock > 0).map(product => (
              <button key={product.id} onClick={() => addToCart(product)}
                className="bg-white rounded-lg border border-gray-200 p-3 text-left hover:shadow-md hover:border-red-300 transition-all text-center"
              >
                <p className="text-2xl mb-1">
                  {product.category === 'Supplements' ? '💪' : product.category === 'Apparel' ? '👕' : product.category === 'Passes' ? '🎫' : '🥊'}
                </p>
                <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                <p className="text-base font-bold text-red-600">${product.price.toFixed(2)}</p>
                <span className={`badge mt-1 ${
                  isLowStock(product.stock) ? 'badge-yellow' : 'badge-green'
                }`}>
                  {product.stock > 10 ? 'In Stock' : `${product.stock} left`}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Cart Sidebar */}
        <div className="w-80 flex-shrink-0">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4 sticky top-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Cart ({cart.reduce((s, c) => s + c.qty, 0)} items)
            </h3>

            {cart.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Cart is empty</p>
            ) : (
              <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">${(item.price * item.qty).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <button onClick={() => updateQty(item.id, -1)}
                        className="w-6 h-6 flex items-center justify-center rounded bg-gray-200 text-gray-600 hover:bg-gray-300 text-sm"
                      >−</button>
                      <span className="w-6 text-center text-sm font-medium">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)}
                        className="w-6 h-6 flex items-center justify-center rounded bg-gray-200 text-gray-600 hover:bg-gray-300 text-sm"
                      >+</button>
                      <button onClick={() => removeItem(item.id)}
                        className="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600 ml-1 text-sm"
                      >✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t border-gray-200 pt-3">
              <div className="flex justify-between text-lg font-bold text-gray-900 mb-4">
                <span>Total</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <button onClick={handleCharge} disabled={cart.length === 0 || paid}
                className={`btn w-full ${paid ? 'btn-success' : 'btn-primary'}`}
              >
                {paid ? '✓ Charged!' : 'Charge'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
