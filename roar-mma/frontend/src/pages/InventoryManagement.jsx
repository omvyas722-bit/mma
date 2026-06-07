import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useNotifications } from '../contexts/NotificationContext';

export default function InventoryManagement() {
  const [tab, setTab] = useState('products');
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
      </div>
      <div className="bg-white rounded-lg shadow mb-6">
        <nav className="flex border-b border-gray-200 overflow-x-auto">
          {['products', 'alerts', 'suppliers', 'movements', 'analytics'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-medium capitalize whitespace-nowrap ${tab === t ? 'border-b-2 border-red-500 text-red-600' : 'text-gray-500 hover:text-gray-700'}`}>{t.replace('_', ' ')}</button>
          ))}
        </nav>
      </div>
      {tab === 'products' && <ProductList />}
      {tab === 'alerts' && <StockAlerts />}
      {tab === 'suppliers' && <Suppliers />}
      {tab === 'movements' && <StockMovements />}
      {tab === 'analytics' && <StockAnalytics />}
    </div>
  );
}

function ProductList() {
  const queryClient = useQueryClient();
  const { success, error } = useNotifications();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', sku: '', barcode: '', sell_price: '', stock_qty: '', min_stock: '10', cost_price: '', category: 'apparel', description: '', supplier_id: '' });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const fileInputRef = useRef(null);
  const [adjustProduct, setAdjustProduct] = useState(null);
  const [adjustForm, setAdjustForm] = useState({ reason: 'restock', quantity: '', notes: '' });

  const { data: products = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['inv-products'],
    queryFn: async () => { const r = await api.get('/api/stock/products'); return r.data?.products || []; },
    retry: 2,
    staleTime: 10000,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['inv-suppliers-list'],
    queryFn: async () => { const r = await api.get('/api/stock/suppliers'); return r.data || []; },
    retry: 1,
    staleTime: 300000,
  });

  const filtered = products.filter(p => !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase()));

  const saveProduct = useMutation({
    mutationFn: (data) => editing ? api.put(`/api/stock/products/${editing.id}`, data) : api.post('/api/stock/products', { ...data, sell_price: parseFloat(data.sell_price), stock_qty: parseInt(data.stock_qty, 10), min_stock: parseInt(data.min_stock, 10), cost_price: data.cost_price ? parseFloat(data.cost_price) : null, supplier_id: data.supplier_id ? parseInt(data.supplier_id, 10) : null }),
    onSuccess: (data) => { queryClient.invalidateQueries({ queryKey: ['inv-products'] }); setShowForm(false); setEditing(null); setForm({ name: '', sku: '', barcode: '', sell_price: '', stock_qty: '', min_stock: '10', cost_price: '', category: 'apparel', description: '', supplier_id: '' }); setPhotoFile(null); setPhotoPreview(''); if (fileInputRef.current) fileInputRef.current.value = ''; success(editing ? 'Product updated' : 'Product created'); return data; },
    onError: () => error('Failed to save product'),
  });

  const deleteProduct = useMutation({
    mutationFn: (id) => api.delete(`/api/stock/products/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['inv-products'] }); success('Product deleted'); },
    onError: () => error('Failed to delete product'),
  });

  const adjustStock = useMutation({
    mutationFn: ({ id, data }) => api.post(`/api/stock/products/${id}/adjust`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['inv-products'] }); setAdjustProduct(null); setAdjustForm({ reason: 'restock', quantity: '', notes: '' }); success('Stock adjusted'); },
    onError: () => error('Failed to adjust stock'),
  });

  function openEdit(p) {
    setEditing(p);
    setForm({ name: p.name, sku: p.sku || '', barcode: p.barcode || '', sell_price: String(p.sell_price || ''), stock_qty: String(p.stock_qty || ''), min_stock: String(p.min_stock || '10'), cost_price: String(p.cost_price || ''), category: p.category || 'apparel', description: p.description || '', supplier_id: String(p.supplier_id || '') });
    setPhotoPreview(p.image_url || '');
    setPhotoFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.sell_price) return;
    const result = await saveProduct.mutateAsync(form);
    if (photoFile && result?.id) {
      const fd = new FormData();
      fd.append('photo', photoFile);
      try {
        await api.upload(`/api/stock/products/${result.id}/photo`, fd);
        queryClient.invalidateQueries({ queryKey: ['inv-products'] });
      } catch { error('Photo upload failed, product saved'); }
    }
  }

  if (isError) return <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center" role="alert"><p className="text-red-700 text-sm mb-3">Failed to load products</p><button onClick={refetch} className="text-sm text-red-600 underline">Retry</button></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <input type="text" placeholder="Search products by name or SKU..." value={search} onChange={e => setSearch(e.target.value)} className="input text-sm max-w-xs" aria-label="Search products" />
        <button onClick={() => { setEditing(null); setForm({ name: '', sku: '', barcode: '', sell_price: '', stock_qty: '', min_stock: '10', cost_price: '', category: 'apparel', description: '', supplier_id: '' }); setPhotoFile(null); setPhotoPreview(''); if (fileInputRef.current) fileInputRef.current.value = ''; setShowForm(true); }} className="btn-primary text-sm">+ Add Product</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">{editing ? 'Edit Product' : 'Add Product'}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Name *</label><input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="input text-sm w-full" required /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">SKU</label><input value={form.sku} onChange={e => setForm(f => ({...f, sku: e.target.value}))} className="input text-sm w-full" /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Barcode</label><input value={form.barcode} onChange={e => setForm(f => ({...f, barcode: e.target.value}))} className="input text-sm w-full" /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Sell Price *</label><input type="number" step="0.01" min="0" value={form.sell_price} onChange={e => setForm(f => ({...f, sell_price: e.target.value}))} className="input text-sm w-full" required /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Cost Price</label><input type="number" step="0.01" min="0" value={form.cost_price} onChange={e => setForm(f => ({...f, cost_price: e.target.value}))} className="input text-sm w-full" /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Stock Qty</label><input type="number" min="0" value={form.stock_qty} onChange={e => setForm(f => ({...f, stock_qty: e.target.value}))} className="input text-sm w-full" /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Min Stock</label><input type="number" min="0" value={form.min_stock} onChange={e => setForm(f => ({...f, min_stock: e.target.value}))} className="input text-sm w-full" /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Category</label><select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))} className="input text-sm w-full"><option value="apparel">Apparel</option><option value="equipment">Equipment</option><option value="supplements">Supplements</option><option value="accessories">Accessories</option><option value="other">Other</option></select></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Supplier</label><select value={form.supplier_id} onChange={e => setForm(f => ({...f, supplier_id: e.target.value}))} className="input text-sm w-full"><option value="">None</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div className="col-span-2 md:col-span-4">
              <label className="block text-xs font-medium text-gray-700 mb-1">Photo</label>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) { setPhotoFile(f); const reader = new FileReader(); reader.onload = ev => setPhotoPreview(ev.target.result); reader.readAsDataURL(f); } }} className="text-sm w-full" />
              {photoPreview && <img src={photoPreview} alt="Preview" className="mt-2 w-20 h-20 object-cover rounded border" />}
            </div>
          </div>
          <div><label className="block text-xs font-medium text-gray-700 mb-1">Description</label><textarea rows={2} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} className="input text-sm w-full" /></div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="btn-outline text-sm">Cancel</button>
            <button type="submit" disabled={saveProduct.isPending} className="btn-primary text-sm">{saveProduct.isPending ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      )}

      {isLoading ? <div className="bg-white rounded-lg p-6 animate-pulse"><div className="h-4 bg-gray-200 rounded w-40 mb-4"></div><div className="h-32 bg-gray-100 rounded"></div></div> : filtered.length === 0 ? (
        <div className="bg-white rounded-lg p-6 text-center"><p className="text-sm text-gray-500">No products found</p></div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase"><th className="px-4 py-3">Name</th><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Barcode</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3">Category</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      {p.image_url && <img src={p.image_url} alt="" className="w-8 h-8 object-cover rounded" />}
                      {p.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.sku || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.barcode || '—'}</td>
                  <td className="px-4 py-3">${(p.sell_price || 0).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 ${p.stock_qty <= p.min_stock ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
                      {p.stock_qty || 0}
                      {p.stock_qty <= p.min_stock && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Low</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{p.category || '—'}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => { setAdjustProduct(p); setAdjustForm({ reason: 'restock', quantity: '', notes: '' }); }} className="text-xs text-blue-600 hover:underline mr-2">Adjust</button>
                    <button onClick={() => openEdit(p)} className="text-xs text-gray-600 hover:underline mr-2">Edit</button>
                    <button onClick={() => { if (window.confirm('Delete this product?')) deleteProduct.mutate(p.id); }} className="text-xs text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adjustProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setAdjustProduct(null)}>
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">Adjust Stock: {adjustProduct.name}</h3>
            <p className="text-xs text-gray-500 mb-3">Current stock: {adjustProduct.stock_qty || 0}</p>
            <div className="space-y-3">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Reason</label>
                <select value={adjustForm.reason} onChange={e => setAdjustForm(f => ({...f, reason: e.target.value}))} className="input text-sm w-full">
                  <option value="restock">Restock</option><option value="damage">Damage</option><option value="return">Return</option><option value="correction">Correction</option>
                </select>
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Quantity Change (+/-)</label><input type="number" value={adjustForm.quantity} onChange={e => setAdjustForm(f => ({...f, quantity: e.target.value}))} className="input text-sm w-full" placeholder="e.g. 10 or -2" /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Notes</label><input type="text" value={adjustForm.notes} onChange={e => setAdjustForm(f => ({...f, notes: e.target.value}))} className="input text-sm w-full" /></div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setAdjustProduct(null)} className="btn-outline text-sm">Cancel</button>
              <button onClick={() => adjustStock.mutate({ id: adjustProduct.id, data: { quantity_change: parseInt(adjustForm.quantity, 10) || 0, reason: adjustForm.reason, notes: adjustForm.notes } })} disabled={!adjustForm.quantity} className="btn-primary text-sm">Apply</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StockAlerts() {
  const { data: alerts = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['inv-alerts'],
    queryFn: async () => { const r = await api.get('/api/stock/alerts'); return r.data || []; },
    retry: 2,
    staleTime: 10000,
  });
  const queryClient = useQueryClient();
  const { success } = useNotifications();
  const resolveAlert = useMutation({
    mutationFn: (id) => api.post(`/api/stock/alerts/${id}/resolve`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['inv-alerts'] }); success('Alert resolved'); },
  });
  if (isError) return <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center"><p className="text-red-700 text-sm">Failed to load alerts</p><button onClick={refetch} className="text-sm text-red-600 underline mt-2">Retry</button></div>;
  if (isLoading) return <div className="bg-white rounded-lg p-6 animate-pulse"><div className="h-4 bg-gray-200 rounded w-40 mb-4"></div><div className="h-24 bg-gray-100 rounded"></div></div>;
  if (alerts.length === 0) return <div className="bg-white rounded-lg p-6 text-center"><p className="text-sm text-gray-500">No active stock alerts</p></div>;
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="w-full text-sm">
        <thead><tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase"><th className="px-4 py-3">Product</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Message</th><th className="px-4 py-3">Created</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
        <tbody className="divide-y divide-gray-200">
          {alerts.map(a => (
            <tr key={a.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{a.product_name}</td>
              <td className="px-4 py-3"><span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">{a.alert_type}</span></td>
              <td className="px-4 py-3 text-gray-600">{a.message}</td>
              <td className="px-4 py-3 text-gray-500 text-xs">{a.created_at}</td>
              <td className="px-4 py-3 text-right"><button onClick={() => resolveAlert.mutate(a.id)} disabled={resolveAlert.isPending} className="text-xs text-green-600 hover:underline">Resolve</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Suppliers() {
  const queryClient = useQueryClient();
  const { success, error } = useNotifications();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', contact_person: '', email: '', phone: '', address: '', notes: '' });
  const { data: suppliers = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['inv-suppliers'],
    queryFn: async () => { const r = await api.get('/api/stock/suppliers'); return r.data || []; },
    retry: 2,
    staleTime: 300000,
  });
  const saveSupplier = useMutation({
    mutationFn: (data) => api.post('/api/stock/suppliers', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['inv-suppliers'] }); setShowForm(false); setForm({ name: '', contact_person: '', email: '', phone: '', address: '', notes: '' }); success('Supplier added'); },
    onError: () => error('Failed to add supplier'),
  });
  if (isError) return <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center"><p className="text-red-700 text-sm">Failed to load suppliers</p><button onClick={refetch} className="text-sm text-red-600 underline mt-2">Retry</button></div>;
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><button onClick={() => setShowForm(true)} className="btn-primary text-sm">+ Add Supplier</button></div>
      {showForm && (
        <form onSubmit={e => { e.preventDefault(); if (form.name) saveSupplier.mutate(form); }} className="bg-white border rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">Add Supplier</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Name *</label><input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="input text-sm w-full" required /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Contact Person</label><input value={form.contact_person} onChange={e => setForm(f => ({...f, contact_person: e.target.value}))} className="input text-sm w-full" /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Email</label><input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} className="input text-sm w-full" /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Phone</label><input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} className="input text-sm w-full" /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Address</label><input value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} className="input text-sm w-full" /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Notes</label><input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} className="input text-sm w-full" /></div>
          </div>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="btn-outline text-sm">Cancel</button><button type="submit" className="btn-primary text-sm">Save</button></div>
        </form>
      )}
      {isLoading ? <div className="bg-white rounded-lg p-6 animate-pulse"><div className="h-4 bg-gray-200 rounded w-40 mb-4"></div><div className="h-24 bg-gray-100 rounded"></div></div> : suppliers.length === 0 ? (
        <div className="bg-white rounded-lg p-6 text-center"><p className="text-sm text-gray-500">No suppliers</p></div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase"><th className="px-4 py-3">Name</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Phone</th></tr></thead>
            <tbody className="divide-y divide-gray-200">
              {suppliers.map(s => (
                <tr key={s.id} className="hover:bg-gray-50"><td className="px-4 py-3 font-medium text-gray-900">{s.name}</td><td className="px-4 py-3 text-gray-600">{s.contact_person || '—'}</td><td className="px-4 py-3 text-gray-600">{s.email || '—'}</td><td className="px-4 py-3 text-gray-600">{s.phone || '—'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StockMovements() {
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const { data: products = [] } = useQuery({
    queryKey: ['inv-products-list'],
    queryFn: async () => { const r = await api.get('/api/stock/products'); return r.data?.products || []; },
    retry: 1,
    staleTime: 10000,
  });
  const { data: movements = [], isLoading } = useQuery({
    queryKey: ['inv-movements', selectedProduct?.id],
    queryFn: async () => { if (!selectedProduct) return []; const r = await api.get(`/api/stock/movements/${selectedProduct.id}`); return r.data || []; },
    enabled: !!selectedProduct,
    staleTime: 10000,
  });
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <input type="text" placeholder="Search product..." value={productSearch} onChange={e => setProductSearch(e.target.value)} className="input text-sm w-full" aria-label="Search product for movements" />
          {productSearch && (
            <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto">
              {products.filter(p => p.name?.toLowerCase().includes(productSearch.toLowerCase())).map(p => (
                <button key={p.id} onClick={() => { setSelectedProduct(p); setProductSearch(''); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100">{p.name}</button>
              ))}
            </div>
          )}
        </div>
        {selectedProduct && <div className="flex items-center text-sm text-gray-700">Showing: <span className="font-medium ml-1">{selectedProduct.name}</span><button onClick={() => setSelectedProduct(null)} className="ml-2 text-xs text-red-600 hover:underline">Clear</button></div>}
      </div>
      {!selectedProduct ? (
        <div className="bg-white rounded-lg p-6 text-center"><p className="text-sm text-gray-500">Select a product to view stock movement history</p></div>
      ) : isLoading ? (
        <div className="bg-white rounded-lg p-6 animate-pulse"><div className="h-4 bg-gray-200 rounded w-40 mb-4"></div><div className="h-24 bg-gray-100 rounded"></div></div>
      ) : movements.length === 0 ? (
        <div className="bg-white rounded-lg p-6 text-center"><p className="text-sm text-gray-500">No movements recorded for this product</p></div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase"><th className="px-4 py-3">Date</th><th className="px-4 py-3">Change</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Notes</th><th className="px-4 py-3">By</th></tr></thead>
            <tbody className="divide-y divide-gray-200">
              {movements.map(m => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500">{m.created_at}</td>
                  <td className="px-4 py-3"><span className={`font-medium ${m.quantity_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>{m.quantity_change >= 0 ? '+' : ''}{m.quantity_change}</span></td>
                  <td className="px-4 py-3 text-gray-700 capitalize">{m.reason || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{m.notes || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{m.adjusted_by_name || m.adjusted_by || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StockAnalytics() {
  const { data: analytics, isLoading, isError } = useQuery({
    queryKey: ['inv-analytics'],
    queryFn: async () => { const r = await api.get('/api/stock/analytics'); return r.data; },
    retry: 2,
    staleTime: 300000,
  });
  if (isLoading) return <div className="bg-white rounded-lg p-6 animate-pulse"><div className="h-4 bg-gray-200 rounded w-40 mb-4"></div><div className="h-32 bg-gray-100 rounded"></div></div>;
  if (isError) return <div className="bg-white rounded-lg p-6 text-center"><p className="text-sm text-gray-500">Failed to load analytics</p></div>;
  if (!analytics) return <div className="bg-white rounded-lg p-6 text-center"><p className="text-sm text-gray-500">No analytics data available</p></div>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white rounded-lg shadow p-4"><p className="text-xs text-gray-500 mb-1">Total Products</p><p className="text-xl font-bold text-gray-900">{analytics.total_products || 0}</p></div>
      <div className="bg-white rounded-lg shadow p-4"><p className="text-xs text-gray-500 mb-1">Low Stock Items</p><p className={`text-xl font-bold ${analytics.low_stock_count > 0 ? 'text-red-600' : 'text-green-600'}`}>{analytics.low_stock_count || 0}</p></div>
      <div className="bg-white rounded-lg shadow p-4"><p className="text-xs text-gray-500 mb-1">Total Stock Value</p><p className="text-xl font-bold text-gray-900">${(analytics.total_stock_value || 0).toFixed(2)}</p></div>
      <div className="bg-white rounded-lg shadow p-4"><p className="text-xs text-gray-500 mb-1">Active Suppliers</p><p className="text-xl font-bold text-gray-900">{analytics.active_suppliers || 0}</p></div>
    </div>
  );
}
