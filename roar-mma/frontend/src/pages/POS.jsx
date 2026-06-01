import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useNotifications } from '../contexts/NotificationContext';

export default function POS() {
  const queryClient = useQueryClient();
  const { error, success } = useNotifications();
  const [tab, setTab] = useState('pos');

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Merchandise & POS</h1>
      </div>

      <div className="bg-white rounded-lg shadow mb-6">
        <nav className="flex border-b border-gray-200">
          {['pos', 'products', 'alerts'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-medium capitalize ${tab === t ? 'border-b-2 border-red-500 text-red-600' : 'text-gray-500'}`}>{t}</button>
          ))}
        </nav>
      </div>

      {tab === 'pos' && <POSScreen />}
      {tab === 'products' && <ProductList />}
      {tab === 'alerts' && <StockAlerts />}
    </div>
  );
}

function POSScreen() {
  const queryClient = useQueryClient();
  const { success, error } = useNotifications();
  const { data: products = [] } = useQuery({
    queryKey: ['stock-products'],
    queryFn: async () => { const r = await api.get('/api/stock/products?active=true'); return r.data?.products || []; },
  });

  const [cart, setCart] = useState([]);
  const [tendered, setTendered] = useState('');

  const addToCart = (p) => {
    setCart(c => { const ex = c.find(i => i.id === p.id); return ex ? c.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i) : [...c, { id: p.id, name: p.name, price: p.sell_price || 0, qty: 1 }]; });
  };

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const change = tendered ? Math.max(0, parseFloat(tendered) - total) : 0;

  const recordSale = useMutation({
    mutationFn: () => Promise.all(cart.map(i => api.post('/api/stock/sales', { product_id: i.id, quantity: i.qty, unit_price: i.price, total_price: i.price * i.qty, tendered: parseFloat(tendered), change }))),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['stock-products'] }); setCart([]); setTendered(''); success(`Sale recorded. Change: $${change.toFixed(2)}`); },
    onError: () => error('Sale failed'),
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Products</h3>
        <div className="grid grid-cols-3 gap-2">
          {(products || []).map(p => (
            <button key={p.id} onClick={() => addToCart(p)} disabled={p.stock_qty <= 0}
              className={`border rounded-lg p-2 text-left hover:bg-gray-50 ${p.stock_qty <= 0 ? 'opacity-40' : ''}`}>
              <p className="text-xs font-medium text-gray-900 truncate">{p.name}</p>
              <p className="text-xs text-gray-500">${(p.sell_price || 0).toFixed(2)}</p>
              <p className="text-[10px] text-gray-400">{p.stock_qty > 0 ? `${p.stock_qty} in stock` : 'Out of stock'}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Cart</h3>
        <div className="space-y-2 min-h-[200px] border-b pb-3">
          {cart.length === 0 ? <p className="text-xs text-gray-400 text-center py-6">Cart empty</p> :
          cart.map(i => (
            <div key={i.id} className="flex justify-between items-center text-sm">
              <span className="text-gray-900">{i.name} ×{i.qty}</span>
              <span className="text-gray-600">${(i.price * i.qty).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center mt-2 text-lg font-bold"><span>Total</span><span>${total.toFixed(2)}</span></div>
        <div className="mt-3">
          <input type="number" step="0.01" placeholder="Tendered $" value={tendered} onChange={e => setTendered(e.target.value)} className="input text-sm w-full" />
          {tendered && <p className="text-xs text-green-600 mt-1">Change: ${change.toFixed(2)}</p>}
        </div>
        <button onClick={recordSale.mutate} disabled={cart.length === 0 || !tendered || parseFloat(tendered) < total}
          className="w-full mt-3 bg-red-600 text-white py-2 rounded-lg text-sm hover:bg-red-700 disabled:opacity-40">Complete Sale</button>
      </div>
    </div>
  );
}

function ProductList() {
  const queryClient = useQueryClient();
  const { success, error } = useNotifications();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', sku: '', sell_price: '', stock_qty: '', min_stock: '10', category: 'apparel' });
  const u = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { data: products = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['stock-products', 'all'],
    queryFn: async () => { const r = await api.get('/api/stock/products'); return r.data?.products || []; },
    retry: 2,
  });

  const saveProduct = useMutation({
    mutationFn: (data) => editing ? api.put(`/api/stock/products/${editing.id}`, data) : api.post('/api/stock/products', { ...data, sell_price: parseFloat(data.sell_price), stock_qty: parseInt(data.stock_qty, 10), min_stock: parseInt(data.min_stock, 10) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['stock-products'] }); setShowForm(false); setEditing(null); setForm({ name: '', sku: '', sell_price: '', stock_qty: '', min_stock: '10', category: 'apparel' }); success(editing ? 'Product updated' : 'Product created'); },
    onError: () => error('Failed to save product'),
  });

  const deleteProduct = useMutation({
    mutationFn: (id) => api.delete(`/api/stock/products/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['stock-products'] }); success('Product deleted'); },
    onError: () => error('Failed to delete product'),
  });

  function openEdit(p) {
    setEditing(p);
    setForm({ name: p.name, sku: p.sku || '', sell_price: String(p.sell_price || ''), stock_qty: String(p.stock_qty || ''), min_stock: String(p.min_stock || '10'), category: p.category || 'apparel' });
    setShowForm(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.sell_price) return;
    saveProduct.mutate(form);
  }

  if (isError) return <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center" role="alert"><p className="text-red-700 text-sm mb-3">Failed to load products</p><button onClick={refetch} className="text-sm text-red-600 underline">Retry</button></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" onClick={() => { setShowForm(true); setEditing(null); setForm({ name: '', sku: '', sell_price: '', stock_qty: '', min_stock: '10', category: 'apparel' }); }} className="btn-primary text-sm">+ Add Product</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3 className="text-lg font-semibold mb-4">{editing ? 'Edit Product' : 'Add Product'}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Name *</label>
                  <input type="text" value={form.name} onChange={e => u('name', e.target.value)} className="input text-sm w-full" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">SKU</label>
                  <input type="text" value={form.sku} onChange={e => u('sku', e.target.value)} className="input text-sm w-full" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                  <select value={form.category} onChange={e => u('category', e.target.value)} className="input text-sm w-full">
                    <option value="apparel">Apparel</option><option value="equipment">Equipment</option><option value="supplements">Supplements</option><option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Sell Price *</label>
                  <input type="number" step="0.01" min="0" value={form.sell_price} onChange={e => u('sell_price', e.target.value)} className="input text-sm w-full" required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Stock Qty</label>
                  <input type="number" min="0" value={form.stock_qty} onChange={e => u('stock_qty', e.target.value)} className="input text-sm w-full" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Min Stock Alert</label>
                  <input type="number" min="0" value={form.min_stock} onChange={e => u('min_stock', e.target.value)} className="input text-sm w-full" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-outline text-sm">Cancel</button>
                <button type="submit" disabled={saveProduct.isPending} className="btn-primary text-sm">{saveProduct.isPending ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th><th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading ? <tr><td colSpan={6} className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div></td></tr> :
            products.length === 0 ? <tr><td colSpan={6} className="text-center py-8 text-gray-500">No products</td></tr> :
            products.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900">{p.name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{p.sku || '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-900">${(p.sell_price || 0).toFixed(2)}</td>
                <td className="px-4 py-3 text-sm"><span className={`${p.stock_qty <= (p.min_stock || 5) ? 'text-red-600 font-medium' : 'text-gray-600'}`}>{p.stock_qty}</span></td>
                <td className="px-4 py-3 text-sm text-gray-500 capitalize">{p.category || '—'}</td>
                <td className="px-4 py-3 text-sm text-right">
                  <button onClick={() => openEdit(p)} className="text-xs text-blue-600 hover:underline mr-2">Edit</button>
                  <button onClick={() => { if (confirm('Delete this product?')) deleteProduct.mutate(p.id); }} className="text-xs text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StockAlerts() {
  const { data: alerts = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['stock-alerts'],
    queryFn: async () => { const r = await api.get('/api/stock/alerts'); return r.data?.alerts || []; },
    retry: 2,
  });
  const queryClient = useQueryClient();
  const { success } = useNotifications();
  const resolve = useMutation({
    mutationFn: (id) => api.post(`/api/stock/alerts/${id}/resolve`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['stock-alerts'] }); success('Resolved'); },
  });

  if (isError) return <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center" role="alert"><p className="text-red-700 text-sm mb-3">Failed to load alerts</p><button onClick={refetch} className="text-sm text-red-600 underline">Retry</button></div>;

  return (
    <div className="bg-white rounded-lg shadow">
      {isLoading ? <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div></div> :
      alerts.length === 0 ? <div className="text-center py-12"><p className="text-gray-500">No stock alerts</p></div> :
      alerts.map(a => (
        <div key={a.id} className="p-4 border-b flex items-center justify-between">
          <div><p className="text-sm text-gray-900">{a.product_name}</p><p className="text-xs text-gray-500">{a.type === 'low_stock' ? `Low stock: ${a.current_qty}/${a.min_stock}` : 'Out of stock'}</p></div>
          <button onClick={() => resolve.mutate(a.id)} className="text-xs text-green-600 hover:underline">Resolve</button>
        </div>
      ))}
    </div>
  );
}
