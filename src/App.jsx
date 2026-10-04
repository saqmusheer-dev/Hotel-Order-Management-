import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { apiRequest, getConnection, setConnection, startMiniServer } from './server';

const USERS = [
  { id:'Manager', password:'manager001', role:'manager', name:'Manager' },
  { id:'Manager-001', password:'manager001', role:'manager', name:'Manager 001' },
  { id:'staff001', password:'staff001', role:'staff', name:'Staff 001' },
  { id:'staff002', password:'staff002', role:'staff', name:'Staff 002' },
];
const SECTIONS=['Biryani Section','Fried Section'];
const DEFAULT_MENU=[
  {id:'bir-full',name:'Chicken Biryani Full',category:'Biryani',section:'Biryani Section',price:180,image:''},
  {id:'bir-family',name:'Biryani Family Pack',category:'Biryani',section:'Biryani Section',price:650,image:''},
  {id:'mutton-bir',name:'Mutton Biryani',category:'Biryani',section:'Biryani Section',price:260,image:''},
  {id:'ch65',name:'Chicken 65',category:'Fried',section:'Fried Section',price:180,image:''},
  {id:'ch-tandoori',name:'Chicken Tandoori',category:'Fried',section:'Fried Section',price:240,image:''},
];
const DEFAULT_STAFF=[
  {id:'staff001',name:'Staff 001',position:'Biryani Staff',section:'Biryani Section'},
  {id:'staff002',name:'Staff 002',position:'Fried Staff',section:'Fried Section'},
];

function load(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}}
function save(key,value){localStorage.setItem(key,JSON.stringify(value))}
function speak(text){if('speechSynthesis' in window){window.speechSynthesis.cancel();window.speechSynthesis.speak(new SpeechSynthesisUtterance(text))}}
function money(value){return `₹${Number(value||0).toFixed(2)}`}
function imageToDataUrl(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=reject;r.readAsDataURL(file)})}

async function managerServerStart(){try{return await startMiniServer(getConnection()?.key||'')}catch{return null}}

function Login({onLogin}){
  const [id,setId]=useState('Manager'); const [password,setPassword]=useState('manager001');
  const [serverUrl,setServerUrl]=useState(getConnection()?.url||''); const [serverKey,setServerKey]=useState(getConnection()?.key||'');
  const [error,setError]=useState(''); const [busy,setBusy]=useState(false); const isManager=/^manager/i.test(id.trim());
  async function submit(e){e.preventDefault();setError('');setBusy(true);try{
    const user=USERS.find(u=>u.id.toLowerCase()===id.trim().toLowerCase()&&u.password===password); if(!user)throw new Error('Invalid User ID or password');
    if(user.role==='manager'){const conn=await managerServerStart();if(!conn)throw new Error('Manager Mini Server could not start. Install the Android APK for two-device testing.')}else{
      if(!serverUrl.trim()||!serverKey.trim())throw new Error('Enter the Manager server URL and Hotel Key first.');
      setConnection({url:serverUrl.trim().replace(/\/$/,''),key:serverKey.trim()}); await apiRequest('/health',{headers:{'X-Hotel-Key':serverKey.trim()}}).catch(()=>{}); await apiRequest('/api/state');
    }
    save('koms_session',user);onLogin(user);
  }catch(err){setError(err.message||'Unable to connect')}finally{setBusy(false)}}
  return <div className="login-page"><div className="login-card"><div className="brand-mark">🍽️</div><h1>Hotel Order Manager</h1><p>Local Mini-Server Kitchen System</p><form onSubmit={submit}><label>User ID<input value={id} onChange={e=>setId(e.target.value)}/></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)}/></label>{!isManager&&<><label>Manager Server URL<input value={serverUrl} onChange={e=>setServerUrl(e.target.value)} placeholder="http://192.168.43.1:8787"/></label><label>Hotel Connection Key<input value={serverKey} onChange={e=>setServerKey(e.target.value)} placeholder="HOTEL-XXXXXXXX"/></label></>}{error&&<div className="error">{error}</div>}<button className="primary full" disabled={busy}>{busy?'Connecting…':'Login'}</button></form><div className="demo-box"><b>Manager</b> Manager / manager001<br/><b>Kitchen</b> staff001 / staff001 · staff002 / staff002<br/><small>Staff phones connect to the Manager phone using the Hotel Key.</small></div></div></div>
}

function App(){
  const [user,setUser]=useState(()=>load('koms_session',null));
  const deliveryMode=useMemo(()=>new URLSearchParams(location.search).get('delivery')==='1',[]);
  const [view,setView]=useState(()=>deliveryMode?'delivery':load('koms_view','counter'));
  const [menu,setMenu]=useState(()=>load('koms_menu',DEFAULT_MENU)); const [staff,setStaff]=useState(()=>load('koms_staff',DEFAULT_STAFF));
  const [orders,setOrders]=useState(()=>load('koms_orders',[])); const [cart,setCart]=useState([]); const [category,setCategory]=useState('All');
  const [lastSync,setLastSync]=useState(new Date()); const [serverInfo,setServerInfo]=useState(getConnection()); const [error,setError]=useState('');
  const knownOrdersRef=useRef(new Set(load('koms_orders',[]).map(o=>o.id))); useEffect(()=>save('koms_view',view),[view]);

  const refresh=async({announce=true}={})=>{try{
    const state=await apiRequest('/api/state'); const latestOrders=state.orders||[]; const latestMenu=state.menu?.length?state.menu:DEFAULT_MENU; const latestStaff=state.staff?.length?state.staff:DEFAULT_STAFF;
    const newOrders=latestOrders.filter(o=>!knownOrdersRef.current.has(o.id)); setOrders(latestOrders);setMenu(latestMenu);setStaff(latestStaff);setLastSync(new Date());setServerInfo(getConnection());setError('');
    newOrders.forEach(o=>knownOrdersRef.current.add(o.id));
    if(announce&&user?.role==='staff'){const mySection=latestStaff.find(s=>s.id===user.id)?.section;newOrders.forEach(o=>{const relevant=(o.tasks||[]).filter(t=>t.section===mySection&&t.status==='New');if(relevant.length)speak(`New order. Token ${o.token}. ${relevant.flatMap(t=>t.items.map(i=>`${i.qty} ${i.name}`)).join(', ')}`)})}
    save('koms_orders',latestOrders);save('koms_menu',latestMenu);save('koms_staff',latestStaff);
    if(user?.role==='manager'&&(!state.menu?.length||!state.staff?.length)){
      if(!state.menu?.length)await apiRequest('/api/menu',{method:'POST',body:JSON.stringify(DEFAULT_MENU)});
      if(!state.staff?.length)await apiRequest('/api/staff',{method:'POST',body:JSON.stringify(DEFAULT_STAFF)});
      const seeded=await apiRequest('/api/state');setMenu(seeded.menu);setStaff(seeded.staff);save('koms_menu',seeded.menu);save('koms_staff',seeded.staff);
    }
  }catch(e){setError(e.message||'Manager server unavailable')}};
  useEffect(()=>{if(!user)return;refresh({announce:false});const t=setInterval(()=>refresh({announce:true}),15000);return()=>clearInterval(t)},[user]);
  useEffect(()=>{if(!user?.role||!('BroadcastChannel'in window))return;const ch=new BroadcastChannel('koms-orders');ch.onmessage=()=>refresh({announce:true});return()=>ch.close()},[user]);
  if(!user)return <Login onLogin={u=>{setUser(u);setView(u.role==='manager'?'counter':'kitchen')}}/>;

  const cats=['All',...new Set(menu.map(x=>x.category).filter(Boolean))]; const visibleMenu=category==='All'?menu:menu.filter(x=>x.category===category);
  const mySection=staff.find(s=>s.id===user.id)?.section; const kitchenOrders=orders.filter(o=>(o.tasks||[]).some(t=>t.section===mySection&&t.status!=='Completed')&&o.status!=='Collected'); const readyOrders=orders.filter(o=>o.status==='Ready');
  const cartTotal=cart.reduce((sum,i)=>sum+Number(i.price||0)*i.qty,0);
  function add(item){setCart(c=>{const old=c.find(x=>x.id===item.id);return old?c.map(x=>x.id===item.id?{...x,qty:x.qty+1}:x):[...c,{...item,qty:1,note:''}]})}
  function change(id,d){setCart(c=>c.map(x=>x.id===id?{...x,qty:x.qty+d}:x).filter(x=>x.qty>0))} function changeNote(id,note){setCart(c=>c.map(x=>x.id===id?{...x,note}:x))}
  async function createOrder(){if(!cart.length)return;setError('');try{
    const tasks=cart.reduce((a,item)=>{const f=a.find(t=>t.section===item.section);const oi={name:item.name,qty:item.qty,unitPrice:Number(item.price||0),total:Number(item.price||0)*item.qty,note:(item.note||'').trim()};if(f)f.items.push(oi);else a.push({section:item.section,items:[oi],status:'New'});return a},[]);
    const order=await apiRequest('/api/order',{method:'POST',body:JSON.stringify({createdBy:user.id,tasks,total:cartTotal,itemCount:cart.reduce((n,i)=>n+i.qty,0)})});
    setOrders(await apiRequest('/api/state').then(s=>s.orders||[]));knownOrdersRef.current.add(order.id);speak(`New order. Token number ${order.token}. Total ${money(cartTotal)}.`);setCart([]);
  }catch(e){setError(e.message)}}
  async function updateTask(orderId,section,status){try{await apiRequest('/api/task',{method:'POST',body:JSON.stringify({orderId,section,status})});await refresh({announce:false});if(status==='Accepted')speak(`Token accepted. ${section}.`);if(status==='Completed')speak(`Token completed. ${section}.`)}catch(e){setError(e.message)}}
  async function collect(orderId){try{await apiRequest('/api/collect',{method:'POST',body:JSON.stringify({orderId})});await refresh({announce:false});speak('Order collected.')}catch(e){setError(e.message)}}
  async function saveStaff(next){setStaff(next);save('koms_staff',next);try{await apiRequest('/api/staff',{method:'POST',body:JSON.stringify(next)})}catch(e){setError(e.message)}}
  async function saveMenu(next){setMenu(next);save('koms_menu',next);try{await apiRequest('/api/menu',{method:'POST',body:JSON.stringify(next)})}catch(e){setError(e.message)}}
  function logout(){setUser(null);localStorage.removeItem('koms_session')}

  return <div className="app"><header><div><b>🍽️ Hotel Order Manager</b><span className="user-pill">{user.name} · {user.role}{deliveryMode?' · Delivery':''}</span></div><div className="sync-indicator">{serverInfo?.url||'Mini Server'} · {lastSync.toLocaleTimeString()}</div><button className="logout" onClick={logout}>Logout</button></header><nav>{!deliveryMode&&user.role==='manager'&&<><button className={view==='counter'?'active':''} onClick={()=>setView('counter')}>Counter</button><button className={view==='menu'?'active':''} onClick={()=>setView('menu')}>Menu</button><button className={view==='manage'?'active':''} onClick={()=>setView('manage')}>Staff & Sections</button><button className={view==='delivery'?'active':''} onClick={()=>setView('delivery')}>Delivery</button></>}{!deliveryMode&&<button className={view==='kitchen'?'active':''} onClick={()=>setView('kitchen')}>{user.role==='staff'?mySection||'Kitchen':'Kitchen'}</button>}{deliveryMode&&<button className="active">Delivery Counter</button>}</nav>
    {error&&<div className="error" style={{margin:'12px auto',maxWidth:1000}}>{error}</div>}
    {view==='counter'&&user.role==='manager'&&<main className="grid"><section className="panel"><div className="panel-head"><div><h2>New Order</h2><span>Select food items to add to the order</span></div></div><div className="chips">{cats.map(c=><button className={category===c?'chip active':'chip'} onClick={()=>setCategory(c)} key={c}>{c}</button>)}</div><div className="menu-grid">{visibleMenu.map(i=><button className="menu-item" onClick={()=>add(i)} key={i.id}>{i.image?<img className="menu-image" src={i.image} alt=""/>:<div className="menu-image placeholder-food">🍽️</div>}<div className="menu-info"><b>{i.name}</b><small>{i.section}</small><strong>{money(i.price)}</strong></div></button>)}</div></section><section className="panel cart"><div className="panel-head"><div><h2>Current Order</h2><span>{cart.reduce((n,i)=>n+i.qty,0)} items</span></div></div>{cart.length===0?<div className="empty">No items selected</div>:cart.map(i=><div className="cart-row" key={i.id}><div className="cart-item-info">{i.image?<img className="cart-thumb" src={i.image} alt=""/>:null}<div><b>{i.name}</b><small>{money(i.price)} × {i.qty}</small></div><textarea className="item-note" value={i.note||''} onChange={e=>changeNote(i.id,e.target.value)} maxLength={160} placeholder="Note for kitchen: e.g. only leg pieces, breast pieces, extra spicy..." rows={2}/></div><div className="qty"><button onClick={()=>change(i.id,-1)}>−</button><b>{i.qty}</b><button onClick={()=>change(i.id,1)}>+</button></div><strong className="line-total">{money(Number(i.price||0)*i.qty)}</strong></div>)}<div className="cart-total"><span>Grand Total</span><b>{money(cartTotal)}</b></div><button className="primary full" disabled={!cart.length} onClick={createOrder}>Create Order · {money(cartTotal)} · Generate Token</button></section></main>}
    {view==='menu'&&user.role==='manager'&&<MenuManager menu={menu} onSave={saveMenu}/>} {view==='kitchen'&&<Kitchen user={user} orders={user.role==='staff'?kitchenOrders:orders} onUpdate={updateTask}/>} {view==='manage'&&user.role==='manager'&&<Manage staff={staff} setStaff={saveStaff}/>} {view==='delivery'&&<Delivery orders={readyOrders} onCollect={collect}/>} 
  </div>;
}

function MenuManager({menu,onSave}){
  const empty={id:'',name:'',category:'Biryani',section:SECTIONS[0],price:'',image:''}; const [form,setForm]=useState(empty); const [editing,setEditing]=useState(null); const [busy,setBusy]=useState(false);
  function reset(){setForm(empty);setEditing(null)} function edit(item){setEditing(item.id);setForm({...item,price:String(item.price??'')})}
  async function chooseImage(e){const file=e.target.files?.[0];if(!file)return;if(file.size>1200000){alert('Please choose an image under 1.2 MB for local hotel storage.');e.target.value='';return}try{setForm(f=>({...f,image:await imageToDataUrl(file)}))}catch{alert('Could not read image.')}}
  async function saveItem(e){e.preventDefault();const name=form.name.trim();if(!name)return;setBusy(true);const item={...form,id:editing||crypto.randomUUID(),name,category:form.category.trim()||'Other',section:form.section,price:Math.max(0,Number(form.price)||0),image:form.image||''};const next=editing?menu.map(x=>x.id===editing?item:x):[...menu,item];await onSave(next);setBusy(false);reset()}
  function remove(id){if(confirm('Delete this menu item?'))onSave(menu.filter(x=>x.id!==id))}
  return <main className="panel wide"><div className="title-row"><div><h2>Menu Management</h2><p>Add food image, price, category and kitchen section. Menu is stored on the Manager phone.</p></div><button className="primary" onClick={reset}>+ New Item</button></div><form className="menu-form" onSubmit={saveItem}><div className="image-upload"><div className="upload-preview">{form.image?<img src={form.image} alt="Preview"/>:<span>🍽️</span>}</div><label className="upload-button">{form.image?'Change Food Image':'Upload Food Image'}<input type="file" accept="image/*" onChange={chooseImage}/></label><small>JPG/PNG/WebP · max 1.2 MB</small></div><div className="form-fields"><label>Food Name<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Chicken Biryani Full" required/></label><label>Price (₹)<input type="number" min="0" step="0.01" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} placeholder="180" required/></label><label>Category<input value={form.category} onChange={e=>setForm({...form,category:e.target.value})} placeholder="Biryani"/></label><label>Kitchen Section<select value={form.section} onChange={e=>setForm({...form,section:e.target.value})}>{SECTIONS.map(s=><option key={s}>{s}</option>)}</select></label><div className="form-actions"><button type="submit" className="primary" disabled={busy}>{editing?'Update Item':'Add Item'}</button>{editing&&<button type="button" onClick={reset}>Cancel</button>}</div></div></form><h3 className="menu-list-title">Current Menu · {menu.length} items</h3><div className="manage-menu-grid">{menu.map(item=><div className="manage-menu-card" key={item.id}>{item.image?<img src={item.image} alt=""/>:<div className="manage-placeholder">🍽️</div>}<div className="manage-menu-body"><b>{item.name}</b><span>{item.category} · {item.section}</span><strong>{money(item.price)}</strong><div className="card-actions"><button onClick={()=>edit(item)}>Edit</button><button className="danger" onClick={()=>remove(item.id)}>Delete</button></div></div></div>)}</div></main>
}

function Kitchen({user,orders,onUpdate}){return <main className="panel wide"><div className="title-row"><div><h2>Kitchen Orders</h2><p>{user.role==='staff'?'Only your assigned section is shown.':'All kitchen sections'}</p><small>New-order check runs every 15 seconds.</small></div></div>{orders.length===0?<div className="empty large">No active kitchen orders</div>:orders.slice().reverse().map(o=><div className="order-card" key={o.id}><div className="token">TOKEN #{String(o.token).padStart(3,'0')}<small>{new Date(o.createdAt).toLocaleTimeString()}</small></div>{o.tasks.map(t=><div className="task" key={t.section}><div><h3>{t.section}</h3>{t.items.map((i,index)=><div className="kitchen-item" key={`${i.name}-${index}`}><div>{i.name} × <b>{i.qty}</b>{i.unitPrice!=null&&<span className="item-price"> · {money(i.unitPrice)}</span>}</div>{i.note&&<div className="kitchen-note"><b>Note:</b> {i.note}</div>}</div>)}<span className={`status ${t.status.toLowerCase()}`}>{t.status}</span></div><div className="actions">{t.status==='New'&&<button className="primary" onClick={()=>onUpdate(o.id,t.section,'Accepted')}>Accept</button>}{t.status==='Accepted'&&<button className="primary" onClick={()=>onUpdate(o.id,t.section,'Processing')}>Processing</button>}{t.status==='Processing'&&<button className="success" onClick={()=>onUpdate(o.id,t.section,'Completed')}>Complete</button>}</div></div>)}{o.total!=null&&<div className="order-total">Order Total: <b>{money(o.total)}</b></div>}</div>)}</main>}

function Delivery({orders,onCollect}){return <main className="panel wide"><div className="title-row"><div><h2>Delivery Counter</h2><p>Orders appear here only after every kitchen section is completed.</p></div><b>{orders.length} READY</b></div>{orders.length===0?<div className="empty large">No orders ready for collection</div>:orders.slice().reverse().map(o=><div className="order-card" key={o.id}><div className="token">TOKEN #{String(o.token).padStart(3,'0')} <span className="status completed">READY FOR COLLECTION</span></div>{o.tasks.map(t=><div className="task" key={t.section}><div><h3>{t.section}</h3>{t.items.map((i,index)=><div className="kitchen-item" key={`${i.name}-${index}`}><div>{i.name} × <b>{i.qty}</b></div>{i.note&&<div className="kitchen-note"><b>Note:</b> {i.note}</div>}</div>)}</div></div>)}{o.total!=null&&<div className="order-total">Total: <b>{money(o.total)}</b></div>}<button className="success full" onClick={()=>onCollect(o.id)}>Customer Collected</button></div>)}</main>}

function Manage({staff,setStaff}){const [sel,setSel]=useState(staff[0]?.id||'');const current=staff.find(s=>s.id===sel);function assign(section){setStaff(staff.map(s=>s.id===sel?{...s,section}:s))}return <main className="panel wide"><h2>Staff & Sections</h2><p>Manager assigns each staff member to a kitchen section.</p><div className="staff-list">{staff.map(s=><button className={s.id===sel?'staff-card selected':'staff-card'} onClick={()=>setSel(s.id)} key={s.id}><b>{s.id}</b><span>{s.name}</span><small>{s.position}</small><em>{s.section}</em></button>)}</div>{current&&<div className="assign"><h3>Assign {current.id}</h3>{SECTIONS.map(s=><button className={current.section===s?'primary':''} onClick={()=>assign(s)} key={s}>{s}</button>)}</div>}</main>}

createRoot(document.getElementById('root')).render(<App/>);
