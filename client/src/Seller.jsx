import { useEffect, useState } from 'react';
import { categories, money } from './shop.js';
import './Seller.css';

async function request(path, method = 'GET', body) {
  const multipart = body instanceof FormData;
  const response = await fetch(`${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}/api${path}`, {
    method, credentials: 'include', headers: multipart ? {} : { 'Content-Type': 'application/json' },
    ...(body ? { body: multipart ? body : JSON.stringify(body) } : {}), signal: AbortSignal.timeout(60000),
  });
  const data = await response.json().catch(() => ({ message: 'The server could not complete this request.' }));
  if (!response.ok || !data.success) { const error = new Error(data.message || 'Request failed.'); error.status = response.status; throw error; }
  return data;
}
const emptyProduct = { name: '', description: '', category: 'Vegetables', price: '', offerPrice: '', inStock: true };
const statuses = ['Order Placed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

export default function Seller() {
  const [seller, setSeller] = useState(null);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyProduct);
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(null);
  async function refresh() {
    const [catalog, sales] = await Promise.all([request('/product/list'), request('/order/seller')]);
    setProducts(catalog.products); setOrders(sales.orders);
  }
  function failure(err) { setError(err.message || 'Unable to connect. Please try again.'); if (err.status === 401 || err.status === 403) setSeller(null); }
  useEffect(() => {
    request('/seller/is-Auth').then(async data => { setSeller(data.seller); await refresh(); })
      .catch(err => { if (err.status !== 401) failure(err); }).finally(() => setChecking(false));
  }, []);
  async function action(work, message) {
    setBusy(true); setError(''); setNotice('');
    try { await work(); setNotice(message); } catch (err) { failure(err); } finally { setBusy(false); }
  }
  function edit(product) { setEditing(product); setForm(product ? { ...product, description: Array.isArray(product.description) ? product.description.join('\n') : product.description } : emptyProduct); setFiles([]); setError(''); setTab('editor'); }
  async function save(event) {
    event.preventDefault();
    const details = { ...form, price: Number(form.price), offerPrice: Number(form.offerPrice) };
    if (details.offerPrice > details.price) { setError('Selling price cannot exceed regular price.'); return; }
    await action(async () => {
      if (editing) await request(`/product/${editing._id}`, 'PUT', details);
      else {
        if (!files.length || files.length > 5 || files.some(file => file.size > 5 * 1024 * 1024)) throw new Error('Choose 1-5 images, each no larger than 5 MB.');
        const payload = new FormData(); payload.append('productData', JSON.stringify(details)); files.forEach(file => payload.append('images', file));
        await request('/product/add', 'POST', payload);
      }
      setTab('products'); setEditing(null); await refresh();
    }, 'Product saved.');
  }
  return <div className="seller-app"><header className="seller-header"><a href="/" className="seller-brand">Freshora<span>Seller workspace</span></a><div><a href="/">Visit store</a>{seller && <button disabled={busy} onClick={() => action(async () => { await request('/seller/logout'); setSeller(null); setProducts([]); setOrders([]); }, 'Signed out.')}>Sign out</button>}</div></header>
    <main className="seller-main">
      {error && <p className="seller-error" role="alert">{error}</p>}{notice && <p className="seller-notice" role="status">{notice}</p>}
      {checking ? <p>Checking seller access...</p> : !seller ? <section className="seller-login"><span className="seller-kicker">FRESHORA MANAGEMENT</span><h1>Welcome back.</h1><p>Sign in with your seller account to manage the store.</p><form onSubmit={event => { event.preventDefault(); const credentials = Object.fromEntries(new FormData(event.currentTarget)); action(async () => { const data = await request('/seller/login', 'POST', credentials); setSeller(data.seller); await refresh(); }, 'Welcome to your workspace.'); }}><label>Email<input name="email" type="email" autoComplete="username" required/></label><label>Password<input name="password" type="password" autoComplete="current-password" required/></label><button className="seller-primary" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button></form><p>New here? <a href="/?signup=seller">Create a seller account</a></p></section> : <>
      <div className="seller-heading"><div><span className="seller-kicker">YOUR STORE, AT A GLANCE</span><h1>Seller dashboard</h1><p>{seller.email}</p></div><button disabled={busy} onClick={() => action(refresh, 'Dashboard refreshed.')}>Refresh</button></div>
      <div className="seller-stats"><article><span>Products</span><strong>{products.length}</strong></article><article><span>Available products</span><strong>{products.filter(p => p.inStock).length}</strong></article><article><span>Orders</span><strong>{orders.length}</strong></article><article><span>Delivered order value</span><strong>{money(orders.filter(o => o.status === 'Delivered').reduce((sum, o) => sum + o.amount, 0))}</strong></article></div>
      <nav className="seller-tabs" aria-label="Seller sections"><button aria-current={tab === 'products' ? 'page' : undefined} onClick={() => setTab('products')}>Products</button><button aria-current={tab === 'orders' ? 'page' : undefined} onClick={() => setTab('orders')}>Orders</button><button className="seller-primary" disabled={busy} onClick={() => edit(null)}>+ Add product</button></nav>
      {tab === 'products' && <section className="seller-panel"><div className="seller-heading"><h2>Product catalog</h2><input aria-label="Search products" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)}/></div><div className="seller-table-wrap"><table><thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead><tbody>{products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map(p => <tr key={p._id}><td><div className="seller-product">{p.image?.[0] && <img src={p.image[0]} alt=""/>}<strong>{p.name}</strong></div></td><td>{p.category}</td><td>{money(p.offerPrice)}<small>Regular: {money(p.price)}</small></td><td><button disabled={busy} aria-label={`Toggle stock for ${p.name}`} onClick={() => action(async () => { await request('/product/stock', 'PUT', { id: p._id, inStock: !p.inStock }); await refresh(); }, 'Stock updated.')}>{p.inStock ? 'In stock' : 'Out of stock'}</button></td><td><div className="seller-actions"><button disabled={busy} onClick={() => edit(p)}>Edit</button><button disabled={busy} onClick={() => setDeleting(p)}>Delete</button></div></td></tr>)}</tbody></table></div>{!products.length && <p className="seller-empty">Your catalog is empty. Add your first product to start selling.</p>}</section>}
      {tab === 'editor' && <section className="seller-panel"><h2>{editing ? 'Edit product' : 'Add product'}</h2><form className="seller-editor" onSubmit={save}><fieldset disabled={busy}><label>Product name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}/></label><label>Description<textarea required rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}/></label><label>Category<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{[...new Set([...categories.map(c => c.name), form.category])].map(c => <option key={c}>{c}</option>)}</select></label><div className="seller-columns"><label>Regular price (LKR)<input type="number" min="0" step="0.01" required value={form.price} onChange={e => setForm({ ...form, price: e.target.value })}/></label><label>Selling price (LKR)<input type="number" min="0" step="0.01" required value={form.offerPrice} onChange={e => setForm({ ...form, offerPrice: e.target.value })}/></label></div>{!editing && <label>Images (JPG, PNG, WebP; up to 5 x 5 MB)<input key={editing?._id || 'new'} type="file" accept="image/jpeg,image/png,image/webp" multiple required onChange={e => setFiles([...e.target.files])}/></label>}<label className="seller-checkbox"><input type="checkbox" checked={form.inStock} onChange={e => setForm({ ...form, inStock: e.target.checked })}/> Available in stock</label><div className="seller-actions"><button className="seller-primary" type="submit">{busy ? 'Saving...' : 'Save product'}</button><button type="button" onClick={() => setTab('products')}>Cancel</button></div></fieldset></form></section>}
      {tab === 'orders' && <section className="seller-orders"><h2>Customer orders</h2>{!orders.length && <p className="seller-panel">No orders yet.</p>}{[...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(order => <article className="seller-panel" key={order._id}><div className="seller-heading"><div><h3>Order #{order._id.slice(-8).toUpperCase()}</h3><small>{new Date(order.createdAt).toLocaleString('en-LK')}</small></div><strong>{money(order.amount)}</strong></div><div className="seller-columns"><div><h4>Items</h4>{order.items.map((item, i) => <p key={i}>{item.quantity} x {item.product?.name || 'Deleted product'}</p>)}<p>{order.paymentType} / {order.isPaid ? 'Paid' : 'Unpaid'}</p></div><div><h4>Delivery address</h4>{order.address ? <><p>{order.address.firstName} {order.address.lastName}</p><p>{[order.address.street, order.address.city, order.address.state, order.address.postalCode, order.address.country].filter(Boolean).join(', ')}</p><p>{order.address.phoneNumber}</p><p>{order.address.email}</p></> : <p>Address unavailable</p>}</div></div><label>Order status<select aria-label={`Status for order ${order._id}`} disabled={busy} value={order.status} onChange={e => { const status = e.target.value; action(async () => { await request(`/order/${order._id}/status`, 'PUT', { status }); await refresh(); }, 'Order status updated.'); }}>{statuses.map(status => <option key={status}>{status}</option>)}</select></label></article>)}</section>}
      </>}
    </main>{deleting && <div className="seller-overlay"><section className="seller-panel" role="alertdialog" aria-modal="true" aria-labelledby="delete-title"><h2 id="delete-title">Delete {deleting.name}?</h2><p>This permanently removes the product from your catalog.</p><div className="seller-actions"><button autoFocus disabled={busy} onClick={() => setDeleting(null)}>Cancel</button><button className="seller-danger" disabled={busy} onClick={() => action(async () => { await request(`/product/${deleting._id}`, 'DELETE'); setDeleting(null); await refresh(); }, 'Product deleted.')}>Delete product</button></div></section></div>}
  </div>;
}
