import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const seedMenu = [
  { id: 1, name: 'Chicken Biryani Full', category: 'Biryani', section: 'Chicken Package Unit', price: 220 },
  { id: 2, name: 'Biryani Family Pack', category: 'Biryani', section: 'Chicken Package Unit', price: 650 },
  { id: 3, name: 'Mutton Biryani', category: 'Biryani', section: 'Mutton Package Unit', price: 300 },
  { id: 4, name: 'Chicken 65', category: 'Fried', section: 'Fried Section', price: 180 },
  { id: 5, name: 'Chicken Tandoori', category: 'Tandoori', section: 'Tandoori Section', price: 280 },
];

const sections = ['Chicken Package Unit', 'Mutton Package Unit', 'Fried Section', 'Tandoori Section'];

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}

function App() {
  const [menu] = useState(() => load('hom-menu', seedMenu));
  const [orders, setOrders] = useState(() => load('hom-orders', []));
  const [cart, setCart] = useState([]);
  const [screen, setScreen] = useState('counter');
  const [token, setToken] = useState(() => Number(localStorage.getItem('hom-token') || 0));
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => localStorage.setItem('hom-orders', JSON.stringify(orders)), [orders]);
  useEffect(() => localStorage.setItem('hom-menu', JSON.stringify(menu)), [menu]);
  useEffect(() => localStorage.setItem('hom-token', String(token)), [token]);

  const categories = ['All', ...new Set(menu.map(x => x.category))];
  const visibleMenu = useMemo(() => selectedCategory === 'All' ? menu : menu.filter(x => x.category === selectedCategory), [menu, selectedCategory]);

  const addItem = item => setCart(current => {
    const existing = current.find(x => x.id === item.id);
    if (existing) return current.map(x => x.id === item.id ? { ...x, qty: x.qty + 1 } : x);
    return [...current, { ...item, qty: 1 }];
  });

  const changeQty = (id, delta) => setCart(current => current.map(x => x.id === id ? { ...x, qty: x.qty + delta } : x).filter(x => x.qty > 0));

  const createOrder = () => {
    if (!cart.length) return;
    const nextToken = token + 1;
    const order = {
      id: crypto.randomUUID(),
      token: nextToken,
      createdAt: new Date().toISOString(),
      status: 'New',
      items: cart.map(x => ({ ...x })),
    };
    setToken(nextToken);
    setOrders(current => [order, ...current]);
    setCart([]);
    speak(`New order. Token number ${nextToken}.`);
  };

  const updateOrder = (id, status) => {
    setOrders(current => current.map(order => order.id === id ? { ...order, status } : order));
    const order = orders.find(x => x.id === id);
    if (order) speak(`Token number ${order.token}. Order ${status.toLowerCase()}.`);
  };

  return (
    <div className="app">
      <header>
        <div>
          <h1>Hotel Order Management</h1>
          <span className="sub">MVP • Local-first ordering</span>
        </div>
        <div className="nav">
          <button className={screen === 'counter' ? 'active' : ''} onClick={() => setScreen('counter')}>Counter</button>
          <button className={screen === 'kitchen' ? 'active' : ''} onClick={() => setScreen('kitchen')}>Kitchen</button>
        </div>
      </header>

      {screen === 'counter' ? (
        <main className="grid">
          <section className="panel">
            <div className="panel-head"><h2>Menu</h2><span>{menu.length} items</span></div>
            <div className="chips">{categories.map(c => <button key={c} className={selectedCategory === c ? 'chip active' : 'chip'} onClick={() => setSelectedCategory(c)}>{c}</button>)}</div>
            <div className="menu-grid">
              {visibleMenu.map(item => (
                <button className="menu-card" key={item.id} onClick={() => addItem(item)}>
                  <strong>{item.name}</strong><span>₹{item.price}</span><small>{item.section}</small>
                </button>
              ))}
            </div>
          </section>

          <section className="panel cart-panel">
            <div className="panel-head"><h2>Current Order</h2><span>{cart.reduce((a, x) => a + x.qty, 0)} items</span></div>
            {cart.length === 0 ? <div className="empty">Select items from the menu.</div> : <div className="cart-list">
              {cart.map(item => <div className="cart-row" key={item.id}><div><strong>{item.name}</strong><small>{item.section}</small></div><div className="qty"><button onClick={() => changeQty(item.id, -1)}>−</button><b>{item.qty}</b><button onClick={() => changeQty(item.id, 1)}>+</button></div></div>)}
            </div>}
            <button className="create" disabled={!cart.length} onClick={createOrder}>Create Order & Generate Token</button>
          </section>
        </main>
      ) : (
        <main className="panel kitchen">
          <div className="panel-head"><h2>Kitchen Orders</h2><span>{orders.filter(x => x.status !== 'Completed').length} active</span></div>
          {orders.length === 0 ? <div className="empty">No orders yet. Create one from Counter.</div> : <div className="orders">
            {orders.map(order => <article className="order" key={order.id}>
              <div className="order-top"><div className="token">TOKEN #{String(order.token).padStart(3, '0')}</div><span className={`status ${order.status.toLowerCase()}`}>{order.status}</span></div>
              <div className="items">{order.items.map(item => <div className="order-item" key={item.id}><span>{item.qty} × {item.name}</span><small>{item.section}</small></div>)}</div>
              <div className="actions">{order.status === 'New' && <button onClick={() => updateOrder(order.id, 'Accepted')}>Accept</button>}{order.status === 'Accepted' && <button onClick={() => updateOrder(order.id, 'Processing')}>Processing</button>}{order.status === 'Processing' && <button onClick={() => updateOrder(order.id, 'Completed')}>Complete</button>}</div>
            </article>)}
          </div>}
        </main>
      )}
    </div>
  );
}

function speak(text) {
  if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(text)); }
}

createRoot(document.getElementById('root')).render(<App />);
