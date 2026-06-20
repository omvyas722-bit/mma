import { useState, useRef, useEffect } from 'react';
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
    staleTime: 10000,
  });

  const [cart, setCart] = useState([]);
  const [tendered, setTendered] = useState('');
  const [lastReceipt, setLastReceipt] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [barcodeBuffer, setBarcodeBuffer] = useState('');
  const barcodeTimer = useRef(null);
  const [showSplitPayment, setShowSplitPayment] = useState(false);
  const [splits, setSplits] = useState([]);
  const [splitMethod, setSplitMethod] = useState('cash');
  const [splitAmount, setSplitAmount] = useState('');
  const [savedCartExists, setSavedCartExists] = useState(() => { try { return !!localStorage.getItem('pos_saved_cart'); } catch { return false; } });

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Enter') {
        const code = barcodeBuffer.trim();
        if (code.length >= 4) {
          const found = products.find(p => p.barcode === code || p.sku === code);
          if (found) addToCart(found);
          else error(`Product not found: ${code}`);
        }
        setBarcodeBuffer('');
        if (barcodeTimer.current) clearTimeout(barcodeTimer.current);
      } else if (e.key.length === 1) {
        setBarcodeBuffer(prev => prev + e.key);
        if (barcodeTimer.current) clearTimeout(barcodeTimer.current);
        barcodeTimer.current = setTimeout(() => setBarcodeBuffer(''), 200);
      }
    };
    window.addEventListener('keydown', handler);
    return () => { window.removeEventListener('keydown', handler); if (barcodeTimer.current) clearTimeout(barcodeTimer.current); };
  }, [products, barcodeBuffer]);

  const { data: memberResults = [] } = useQuery({
    queryKey: ['pos-member-search', memberSearch],
    queryFn: async () => { const r = await api.get(`/api/members?query=${encodeURIComponent(memberSearch)}&limit=5`); return r.data?.members || []; },
    enabled: memberSearch.length >= 2,
    staleTime: 10000,
  });

  const addToCart = (p) => {
    setCart(c => { const ex = c.find(i => i.id === p.id); return ex ? c.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i) : [...c, { id: p.id, name: p.name, price: p.sell_price || 0, qty: 1 }]; });
  };

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discountAmt = subtotal * (parseFloat(discount) || 0) / 100;
  const total = subtotal - discountAmt;
  const change = tendered ? Math.max(0, parseFloat(tendered) - total) : 0;
  const splitsTotal = splits.reduce((s, sp) => s + sp.amount, 0);
  const splitsValid = splits.length === 0 || Math.abs(splitsTotal - total) < 0.01;

  const addSplit = () => {
    const amt = parseFloat(splitAmount);
    if (!amt || amt <= 0) return;
    setSplits(s => [...s, { method: splitMethod, amount: amt }]);
    setSplitAmount('');
  };

  const saveCart = () => {
    try { localStorage.setItem('pos_saved_cart', JSON.stringify({ cart, discount, selectedMember })); setSavedCartExists(true); success('Cart saved'); } catch { error('Failed to save cart'); }
  };

  const loadSavedCart = () => {
    try {
      const saved = localStorage.getItem('pos_saved_cart');
      if (saved) { const { cart: sc, discount: sd, selectedMember: sm } = JSON.parse(saved); setCart(sc || []); setDiscount(sd || 0); if (sm) setSelectedMember(sm); success('Saved cart loaded'); }
    } catch { error('Failed to load cart'); }
  };

  const recordSale = useMutation({
    mutationFn: async () => {
      const r = await api.post('/api/stock/pos-sale', {
        items: cart.map(i => ({ product_id: i.id, quantity: i.qty, unit_price: i.price })),
        tendered: parseFloat(tendered) || total,
        member_id: selectedMember?.id || null,
        discount: parseFloat(discount) || 0,
      });
      if (splits.length > 0) {
        for (const sp of splits) {
          await api.post('/api/transactions', {
            member_id: selectedMember?.id || null, amount: sp.amount, description: `POS sale split - ${sp.method}`, type: 'product', payment_method: sp.method, status: 'completed',
          });
        }
      }
      return r.data;
    },
    onSuccess: (data) => { queryClient.invalidateQueries({ queryKey: ['stock-products'] }); queryClient.invalidateQueries({ queryKey: ['transactions'] }); setLastReceipt(data); setCart([]); setTendered(''); setDiscount(0); setSelectedMember(null); setMemberSearch(''); setSplits([]); setShowSplitPayment(false); success(`Sale recorded. Change: $${(data?.change || 0).toFixed(2)}`); },
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
                {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-16 object-cover rounded mb-1" />}
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
        <div className="flex gap-2 mt-2">
          {cart.length > 0 && <button onClick={saveCart} className="flex-1 text-xs bg-gray-100 text-gray-700 py-1.5 rounded hover:bg-gray-200">Save Cart</button>}
          {savedCartExists && <button onClick={loadSavedCart} className="flex-1 text-xs bg-blue-50 text-blue-700 py-1.5 rounded hover:bg-blue-100">Load Saved Cart</button>}
        </div>
        <div className="mt-2">
          <label className="block text-xs text-gray-500 mb-1">Member (for discount)</label>
          <input type="text" value={memberSearch} onChange={e => setMemberSearch(e.target.value)} placeholder="Search member..." className="input text-xs w-full mb-1" />
          {selectedMember && <div className="flex items-center justify-between bg-blue-50 rounded px-2 py-1 mb-1"><span className="text-xs text-blue-700">{selectedMember.first_name} {selectedMember.last_name}</span><button onClick={() => { setSelectedMember(null); setMemberSearch(''); }} className="text-blue-500 text-xs">&times;</button></div>}
          {memberSearch.length >= 2 && !selectedMember && (
            <div className="border border-gray-200 rounded max-h-32 overflow-y-auto bg-white shadow text-xs">
              {memberResults.length === 0 ? <p className="px-2 py-1 text-gray-400">No members</p> :
              memberResults.map(m => <button key={m.id} type="button" onClick={() => { setSelectedMember(m); setMemberSearch(''); }} className="w-full text-left px-2 py-1 hover:bg-gray-50">{m.first_name} {m.last_name}</button>)}
            </div>
          )}
          <label className="block text-xs text-gray-500 mb-1 mt-1">Discount %</label>
          <input type="number" min="0" max="100" step="1" value={discount} onChange={e => setDiscount(e.target.value)} className="input text-xs w-full" placeholder="0%" />
        </div>
        {discount > 0 && <div className="flex justify-between text-sm text-green-600"><span>Discount ({discount}%)</span><span>-${discountAmt.toFixed(2)}</span></div>}
        <div className="flex justify-between items-center mt-1 text-lg font-bold"><span>Total</span><span>${total.toFixed(2)}</span></div>
        <div className="mt-3">
          <input type="number" step="0.01" placeholder="Tendered $" value={tendered} onChange={e => setTendered(e.target.value)} className="input text-sm w-full" />
          {tendered && <p className="text-xs text-green-600 mt-1">Change: ${change.toFixed(2)}</p>}
        </div>
        {total > 0 && !showSplitPayment && <button onClick={() => setShowSplitPayment(true)} className="w-full mt-2 text-xs text-blue-600 border border-blue-200 rounded py-1.5 hover:bg-blue-50">Split Payment</button>}
        {showSplitPayment && (
          <div className="mt-2 border border-gray-200 rounded-lg p-3 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-700">Payment Splits</span>
              <button onClick={() => { setShowSplitPayment(false); setSplits([]); setSplitAmount(''); }} className="text-xs text-gray-500 hover:underline">Cancel</button>
            </div>
            <div className="flex gap-2 mb-2">
              <select value={splitMethod} onChange={e => setSplitMethod(e.target.value)} className="input text-xs flex-1">
                <option value="cash">Cash</option><option value="card">Card</option><option value="bank_transfer">Bank Transfer</option><option value="other">Other</option>
              </select>
              <input type="number" step="0.01" min="0" value={splitAmount} onChange={e => setSplitAmount(e.target.value)} className="input text-xs w-24" placeholder="Amount" />
              <button onClick={addSplit} disabled={!splitAmount || parseFloat(splitAmount) <= 0} className="text-xs bg-blue-600 text-white px-3 rounded hover:bg-blue-700 disabled:opacity-40">+</button>
            </div>
            {splits.length > 0 && (
              <div className="space-y-1 mb-2">
                {splits.map((sp, i) => (
                  <div key={i} className="flex justify-between items-center text-xs bg-white rounded px-2 py-1">
                    <span className="capitalize text-gray-600">{sp.method} - ${sp.amount.toFixed(2)}</span>
                    <button onClick={() => setSplits(s => s.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-700">&times;</button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between text-xs text-gray-500">
              <span>Split total: ${splitsTotal.toFixed(2)}</span>
              <span className={splitsValid ? 'text-green-600' : 'text-red-500'}>{splitsValid ? '✓ Balanced' : `Remaining: $${(total - splitsTotal).toFixed(2)}`}</span>
            </div>
          </div>
        )}
        <button onClick={recordSale.mutate} disabled={cart.length === 0 || (splits.length > 0 ? !splitsValid : (!tendered || parseFloat(tendered) < total))}
          className="w-full mt-3 bg-red-600 text-white py-2 rounded-lg text-sm hover:bg-red-700 disabled:opacity-40">Complete Sale</button>

        {lastReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setLastReceipt(null)}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
              <ReceiptPreview receipt={lastReceipt} onClose={() => setLastReceipt(null)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReceiptPreview({ receipt, onClose }) {
  const queryClient = useQueryClient();
  const { success, error } = useNotifications();
  const printRef = useRef(null);
  const [sendingEmail, setSendingEmail] = useState(false);

  const handlePrint = () => { const w = window.open('', '_blank'); w.document.write(`<html><head><title>Receipt</title><style>body{font-family:monospace;font-size:12px;padding:20px;max-width:280px;margin:auto}table{width:100%;border-collapse:collapse}th,td{padding:4px 0;text-align:left}hr{border:none;border-top:1px dashed #000}.total{font-weight:bold;font-size:14px}.center{text-align:center}</style></head><body>${printRef.current?.innerHTML}</body></html>`); w.document.close(); w.print(); };

  const handleEmail = async () => {
    if (!receipt.transaction_id || !receipt.member_email) { error('No email on file'); return; }
    setSendingEmail(true);
    try {
      await api.post(`/api/transactions/${receipt.transaction_id}/email-receipt`);
      success('Receipt emailed');
    } catch (err) { error('Failed to email receipt'); }
    finally { setSendingEmail(false); }
  };

  if (!receipt) return null;
  return (
    <div className="mt-4 border border-gray-200 rounded-lg p-4 bg-gray-50 text-xs font-mono">
      <div ref={printRef}>
        <div className="text-center mb-3"><p className="font-bold text-sm">ROAR MMA</p><p className="text-gray-500">{new Date(receipt.sold_at).toLocaleString()}</p></div>
        {receipt.member_name && <p className="text-center text-xs text-gray-600 mb-2">Member: {receipt.member_name}</p>}
        <hr className="border-dashed my-2" />
        <table className="w-full text-xs mb-2"><thead><tr className="text-gray-500"><th className="text-left">Item</th><th className="text-right">Qty</th><th className="text-right">Price</th></tr></thead>
          <tbody>{receipt.items?.map((item, i) => <tr key={i}><td>{item.product_name}</td><td className="text-right">{item.quantity}</td><td className="text-right">${(item.unit_price * item.quantity).toFixed(2)}</td></tr>)}</tbody>
        </table>
        <hr className="border-dashed my-2" />
        <div className="flex justify-between"><span>Subtotal</span><span>${receipt.subtotal?.toFixed(2)}</span></div>
        {receipt.discount && <div className="flex justify-between text-green-600"><span>Discount ({receipt.discount.pct}%)</span><span>-${receipt.discount.amount?.toFixed(2)}</span></div>}
        <div className="flex justify-between font-bold text-sm"><span>Total</span><span>${receipt.total?.toFixed(2)}</span></div>
        <div className="flex justify-between text-gray-600"><span>Tendered</span><span>${receipt.tendered?.toFixed(2)}</span></div>
        <div className="flex justify-between text-green-600"><span>Change</span><span>${receipt.change?.toFixed(2)}</span></div>
        <hr className="border-dashed my-2" />
        <p className="text-gray-400 text-center text-[10px]">Sold by: {receipt.sold_by || 'Staff'} | #{receipt.sale_id}</p>
        <p className="text-gray-400 text-center text-[10px] mt-1">Thank you for your support!</p>
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={handlePrint} className="flex-1 bg-gray-800 text-white py-1.5 rounded text-xs hover:bg-gray-700">Print</button>
        {receipt.member_email && <button onClick={handleEmail} disabled={sendingEmail} className="flex-1 bg-blue-600 text-white py-1.5 rounded text-xs hover:bg-blue-700 disabled:opacity-40">{sendingEmail ? 'Sending...' : 'Email Receipt'}</button>}
        <button onClick={onClose} className="flex-1 bg-gray-100 text-gray-600 py-1.5 rounded text-xs hover:bg-gray-200">Close</button>
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
  const [adjustProduct, setAdjustProduct] = useState(null);
  const [adjustForm, setAdjustForm] = useState({ reason: 'restock', quantity: '', notes: '' });

  const adjustStock = useMutation({
    mutationFn: ({ id, data }) => api.post(`/api/stock/products/${id}/adjust`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['stock-products'] }); setAdjustProduct(null); setAdjustForm({ reason: 'restock', quantity: '', notes: '' }); success('Stock adjusted'); },
    onError: () => error('Failed to adjust stock'),
  });

  const { data: products = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['stock-products', 'all'],
    queryFn: async () => { const r = await api.get('/api/stock/products'); return r.data?.products || []; },
    retry: 2,
    staleTime: 10000,
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
                   <button onClick={() => { setAdjustProduct(p); setAdjustForm({ reason: 'restock', quantity: '', notes: '' }); }} className="text-xs text-green-600 hover:underline mr-2">Adjust</button>
                   <button onClick={() => { if (confirm('Delete this product?')) deleteProduct.mutate(p.id); }} className="text-xs text-red-600 hover:underline">Delete</button>
                   </td>
              </tr>
            ))}
          </tbody>
        </table>
       </div>
       {adjustProduct && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setAdjustProduct(null)}>
           <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
             <h3 className="text-lg font-semibold mb-4">Adjust Stock - {adjustProduct.name}</h3>
             <div className="space-y-3">
               <div><label className="block text-xs font-medium text-gray-700 mb-1">Reason</label>
                 <select value={adjustForm.reason} onChange={e => setAdjustForm(f => ({ ...f, reason: e.target.value }))} className="input text-sm w-full">
                   <option value="restock">Restock</option><option value="damage">Damage</option><option value="return">Return</option><option value="correction">Correction</option>
                 </select>
               </div>
               <div><label className="block text-xs font-medium text-gray-700 mb-1">Quantity Change</label>
                 <input type="number" value={adjustForm.quantity} onChange={e => setAdjustForm(f => ({ ...f, quantity: e.target.value }))} className="input text-sm w-full" placeholder="e.g. 5 or -2" />
               </div>
               <div><label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                 <input type="text" value={adjustForm.notes} onChange={e => setAdjustForm(f => ({ ...f, notes: e.target.value }))} className="input text-sm w-full" placeholder="Optional notes" />
               </div>
             </div>
             <div className="flex justify-end gap-2 mt-6">
               <button onClick={() => setAdjustProduct(null)} className="btn-outline text-sm">Cancel</button>
               <button onClick={() => { const qty = parseInt(adjustForm.quantity, 10); if (!qty) return; adjustStock.mutate({ id: adjustProduct.id, data: { quantity_change: qty, reason: adjustForm.reason, notes: adjustForm.notes } }); }} disabled={adjustStock.isPending} className="btn-primary text-sm">{adjustStock.isPending ? 'Adjusting...' : 'Adjust'}</button>
             </div>
           </div>
         </div>
       )}
     </div>
   );
 }

function StockAlerts() {
  const { data: alerts = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['stock-alerts'],
    queryFn: async () => { const r = await api.get('/api/stock/alerts'); return r.data?.alerts || []; },
    retry: 2,
    staleTime: 10000,
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
