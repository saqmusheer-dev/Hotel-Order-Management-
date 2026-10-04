import fs from 'node:fs';
const p='src/App.jsx';
let s=fs.readFileSync(p,'utf8');
if(s.includes('function OrdersView(')) process.exit(0);
s=s.replace("speak(`New order. Token number ${o.token}. Total ${money(total)}.`);setCart([])}catch(e){setError(e.message)}}", "speak(`New order. Token number ${o.token}. Total ${money(total)}.`);setCart([]);setView('orders')}catch(e){setError(e.message)}}");
const navOld="<button className={view==='counter'?'active':''} onClick={()=>setView('counter')}>Counter</button>";
s=s.replace(navOld,navOld+"<button className={view==='orders'?'active':''} onClick={()=>setView('orders')}>Orders</button>");
const renderOld="{view==='counter'&&user.role==='manager'&&<Counter cats={cats} category={category} setCategory={setCategory} menu={visible} cart={cart} add={add} change={change} note={note} total={total} createOrder={createOrder}/>}";
s=s.replace(renderOld,renderOld+" {view==='orders'&&!deliveryMode&&<OrdersView orders={orders}/>}");
const marker="function MenuManager({menu,onSave})";
const component=`function OrdersView({orders}){return <main className="panel wide orders-view"><div className="title-row"><div><h2>Orders</h2><p>Track every token and kitchen progress.</p></div><b>{orders.length} ORDERS</b></div>{!orders.length?<div className="empty large">No orders yet. Create an order from Counter.</div>:orders.slice().reverse().map(o=>{const tasks=o.tasks||[];const completed=tasks.filter(t=>t.status==='Completed').length;const overall=o.status||((completed===tasks.length&&tasks.length)?'Ready':'In Kitchen');return <div className="order-card order-status-card" key={o.id}><div className="order-status-head"><div><div className="token">TOKEN #{String(o.token).padStart(3,'0')}</div><small>Created by {o.createdBy||'Counter'}</small></div><span className={\`status order-overall \${overall.toLowerCase().replace(/\\s+/g,'-')}\`}>{overall}</span></div>{tasks.map(t=><div className="status-task" key={t.section}><div><b>{t.section}</b><div className="status-items">{t.items.map((i,n)=><span key={n}>{i.name} × {i.qty}{i.note&&<em> · {i.note}</em>}</span>)}</div></div><span className={\`status \${t.status.toLowerCase()}\`}>{t.status}</span></div>)}<div className="order-total">Total: <b>{money(o.total)}</b></div></div>})}</main>}
`;
s=s.replace(marker,component+marker);
fs.writeFileSync(p,s);
console.log('Orders view injected');
