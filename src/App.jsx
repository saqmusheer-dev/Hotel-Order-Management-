import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const USERS = [
  { id: 'Manager', password: 'manager001', role: 'manager', name: 'Manager' },
  { id: 'Manager-001', password: 'manager001', role: 'manager', name: 'Manager 001' },
  { id: 'staff001', password: 'staff001', role: 'staff', name: 'Staff 001' },
  { id: 'staff002', password: 'staff002', role: 'staff', name: 'Staff 002' },
];

const SECTIONS = ['Biryani Section', 'Fried Section'];
const DEFAULT_MENU = [
  { id: 'bir-full', name: 'Chicken Biryani Full', category: 'Biryani', section: 'Biryani Section', price: 0 },
  { id: 'bir-family', name: 'Biryani Family Pack', category: 'Biryani', section: 'Biryani Section', price: 0 },
  { id: 'mutton-bir', name: 'Mutton Biryani', category: 'Biryani', section: 'Biryani Section', price: 0 },
  { id: 'ch65', name: 'Chicken 65', category: 'Fried', section: 'Fried Section', price: 0 },
  { id: 'ch-tandoori', name: 'Chicken Tandoori', category: 'Fried', section: 'Fried Section', price: 0 },
];

const DEFAULT_STAFF = [
  { id: 'staff001', name: 'Staff 001', position: 'Biryani Staff', section: 'Biryani Section' },
  { id: 'staff002', name: 'Staff 002', position: 'Fried Staff', section: 'Fried Section' },
];

function load(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }
function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function speak(text) { if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(text)); } }

function Login({ onLogin }) {
  const [id, setId] = useState('Manager'); const [password, setPassword] = useState('manager001'); const [error, setError] = useState('');
  function submit(e) { e.preventDefault(); const user = USERS.find(u => u.id.toLowerCase() === id.trim().toLowerCase() && u.password === password); if (!user) return setError('Invalid User ID or password'); setError(''); onLogin(user); }
  return <div className="login-page"><div className="login-card"><div className="brand-mark">🍽️</div><h1>Hotel Order Manager</h1><p>Internal Kitchen Ordering System</p><form onSubmit={submit}><label>User ID<input value={id} onChange={e=>setId(e.target.value)} /></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} /></label>{error && <div className="error">{error}</div>}<button className="primary full">Login</button></form><div className="demo-box"><b>Demo IDs</b><br/>Manager / manager001<br/>staff001 / staff001<br/>staff002 / staff002</div></div></div>;
}

function App() {
  const [user, setUser] = useState(() => load('koms_session', null));
  const [view, setView] = useState('counter');
  const [menu, setMenu] = useState(() => load('koms_menu', DEFAULT_MENU));
  const [staff, setStaff] = useState(() => load('koms_staff', DEFAULT_STAFF));
  const [orders, setOrders] = useState(() => load('koms_orders', []));
  const [cart, setCart] = useState([]);
  const [category, setCategory] = useState('All');
  const [lastSync, setLastSync] = useState(() => new Date());
  const knownOrdersRef = useRef(new Set(load('koms_orders', []).map(o => o.id)));

  useEffect(()=>save('koms_menu',menu),[menu]);
  useEffect(()=>save('koms_staff',staff),[staff]);
  useEffect(()=>save('koms_orders',orders),[orders]);

  // 15-second polling trigger. This is the local-first MVP sync loop.
  // The same sync function will later be connected to the lightweight
  // internet sync service without changing the Counter/Kitchen workflow.
  useEffect(() => {
    if (!user) return;
    const sync = () => {
      const latestOrders = load('koms_orders', []);
      const latestMenu = load('koms_menu', DEFAULT_MENU);
      const latestStaff = load('koms_staff', DEFAULT_STAFF);
      const newOrders = latestOrders.filter(o => !knownOrdersRef.current.has(o.id));
      setOrders(latestOrders);
      setMenu(latestMenu);
      setStaff(latestStaff);
      setLastSync(new Date());
      newOrders.forEach(order => knownOrdersRef.current.add(order.id));
      if (user.role === 'staff') {
        const mySection = latestStaff.find(s => s.id === user.id)?.section;
        newOrders.forEach(order => {
          const relevant = order.tasks?.filter(t => t.section === mySection && t.status === 'New') || [];
          if (relevant.length) {
            const items = relevant.flatMap(t => t.items.map(i => `${i.qty} ${i.name}`)).join(', ');
            speak(`New order. Token ${order.token}. ${items}`);
          }
        });
      }
    };
    sync();
    const timer = window.setInterval(sync, 15000);
    return () => window.clearInterval(timer);
  }, [user]);

  // Same-browser instant notification; 15-second polling remains the fallback trigger.
  useEffect(() => {
    if (!user || !('BroadcastChannel' in window)) return;
    const channel = new BroadcastChannel('koms-orders');
    channel.onmessage = event => {
      if (event.data?.type === 'ORDER_CREATED' && user.role === 'staff') {
        const order = event.data.order;
        const mySection = staff.find(s => s.id === user.id)?.section;
        const relevant = order.tasks?.filter(t => t.section === mySection && t.status === 'New') || [];
        if (relevant.length) speak(`New order. Token ${order.token}.`);
      }
    };
    return () => channel.close();
  }, [user, staff]);

  if (!user) return <Login onLogin={u=>{setUser(u);save('koms_session',u);setView(u.role==='manager'?'counter':'kitchen')}} />;

  const cats = ['All', ...new Set(menu.map(x=>x.category))];
  const visibleMenu = category === 'All' ? menu : menu.filter(x=>x.category===category);
  const mySection = staff.find(s=>s.id===user.id)?.section;
  const kitchenOrders = orders.filter(o => o.tasks.some(t => t.section === mySection && t.status !== 'Completed'));

  function add(item){ setCart(c=>{const old=c.find(x=>x.id===item.id); return old ? c.map(x=>x.id===item.id?{...x,qty:x.qty+1}:x):[...c,{...item,qty:1}]}); }
  function change(id,d){setCart(c=>c.map(x=>x.id===id?{...x,qty:x.qty+d}:x).filter(x=>x.qty>0));}
  function createOrder(){
    if(!cart.length)return;
    const n=(orders.reduce((m,o)=>Math.max(m,o.token),0)||0)+1;
    const order={id:crypto.randomUUID(),token:n,createdAt:new Date().toISOString(),createdBy:user.id,status:'New',tasks:cart.reduce((a,item)=>{const f=a.find(t=>t.section===item.section); if(f) f.items.push({name:item.name,qty:item.qty}); else a.push({section:item.section,items:[{name:item.name,qty:item.qty}],status:'New'}); return a},[])};
    knownOrdersRef.current.add(order.id);
    setOrders(o=>[...o,order]);
    try { localStorage.setItem('koms_sync_trigger', JSON.stringify({time:Date.now(),orderId:order.id})); } catch {}
    if ('BroadcastChannel' in window) { const channel = new BroadcastChannel('koms-orders'); channel.postMessage({type:'ORDER_CREATED',order}); channel.close(); }
    speak(`New order. Token number ${n}. ${cart.map(x=>`${x.qty} ${x.name}`).join(', ')}`);
    setCart([]);
  }
  function updateTask(orderId,section,status){setOrders(os=>os.map(o=>{if(o.id!==orderId)return o;const tasks=o.tasks.map(t=>t.section===section?{...t,status}:t);const overall=tasks.every(t=>t.status==='Completed')?'Completed':tasks.some(t=>t.status==='Processing')?'Processing':tasks.some(t=>t.status==='Accepted')?'Accepted':'New'; if(status==='Accepted')speak(`Token ${o.token}. ${section} accepted.`); if(status==='Completed')speak(`Token ${o.token}. ${section} completed.`); return {...o,tasks,status:overall};}));}
  function logout(){setUser(null);localStorage.removeItem('koms_session');}

  return <div className="app"><header><div><b>🍽️ Hotel Order Manager</b><span className="user-pill">{user.name} · {user.role}</span></div><div className="sync-indicator">Sync check: {lastSync.toLocaleTimeString()}</div><button className="logout" onClick={logout}>Logout</button></header><nav>{user.role==='manager'&&<><button className={view==='counter'?'active':''} onClick={()=>setView('counter')}>Counter</button><button className={view==='manage'?'active':''} onClick={()=>setView('manage')}>Staff & Sections</button></>}<button className={view==='kitchen'?'active':''} onClick={()=>setView('kitchen')}>{user.role==='staff'?mySection||'Kitchen':'Kitchen'}</button></nav>
    {view==='counter'&&user.role==='manager'&&<main className="grid"><section className="panel"><h2>New Order</h2><div className="chips">{cats.map(c=><button className={category===c?'chip active':'chip'} onClick={()=>setCategory(c)} key={c}>{c}</button>)}</div><div className="menu-grid">{visibleMenu.map(i=><button className="menu-item" onClick={()=>add(i)} key={i.id}><b>{i.name}</b><small>{i.section}</small></button>)}</div></section><section className="panel cart"><h2>Current Order</h2>{cart.length===0?<div className="empty">No items selected</div>:cart.map(i=><div className="cart-row" key={i.id}><div><b>{i.name}</b><small>{i.section}</small></div><div className="qty"><button onClick={()=>change(i.id,-1)}>−</button><b>{i.qty}</b><button onClick={()=>change(i.id,1)}>+</button></div></div>)}<button className="primary full" disabled={!cart.length} onClick={createOrder}>Create Order & Generate Token</button></section></main>}
    {view==='kitchen'&&<Kitchen user={user} orders={user.role==='staff'?kitchenOrders:orders} onUpdate={updateTask}/>} 
    {view==='manage'&&<Manage staff={staff} setStaff={setStaff}/>} 
  </div>;
}

function Kitchen({user,orders,onUpdate}){return <main className="panel wide"><div className="title-row"><div><h2>Kitchen Orders</h2><p>{user.role==='staff'?'Only your assigned section is shown.':'All kitchen sections'}</p><small>New-order check runs every 15 seconds.</small></div></div>{orders.length===0?<div className="empty large">No active kitchen orders</div>:orders.slice().reverse().map(o=><div className="order-card" key={o.id}><div className="token">TOKEN #{String(o.token).padStart(3,'0')}<small>{new Date(o.createdAt).toLocaleTimeString()}</small></div>{o.tasks.map(t=><div className="task" key={t.section}><div><h3>{t.section}</h3>{t.items.map(i=><div key={i.name}>{i.name} × <b>{i.qty}</b></div>)}<span className={`status ${t.status.toLowerCase()}`}>{t.status}</span></div><div className="actions">{t.status==='New'&&<button className="primary" onClick={()=>onUpdate(o.id,t.section,'Accepted')}>Accept</button>}{t.status==='Accepted'&&<button className="primary" onClick={()=>onUpdate(o.id,t.section,'Processing')}>Processing</button>}{t.status==='Processing'&&<button className="success" onClick={()=>onUpdate(o.id,t.section,'Completed')}>Complete</button>}</div></div>)}</div>)}</main>}

function Manage({staff,setStaff}){const [sel,setSel]=useState(staff[0]?.id||'');const current=staff.find(s=>s.id===sel);function assign(section){setStaff(staff.map(s=>s.id===sel?{...s,section}:s));}return <main className="panel wide"><h2>Staff & Sections</h2><p>Manager assigns each staff member to a kitchen section.</p><div className="staff-list">{staff.map(s=><button className={s.id===sel?'staff-card selected':'staff-card'} onClick={()=>setSel(s.id)} key={s.id}><b>{s.id}</b><span>{s.name}</span><small>{s.position}</small><em>{s.section}</em></button>)}</div>{current&&<div className="assign"><h3>Assign {current.id}</h3>{SECTIONS.map(s=><button className={current.section===s?'primary':''} onClick={()=>assign(s)} key={s}>{s}</button>)}</div>}</main>}

createRoot(document.getElementById('root')).render(<App />);
