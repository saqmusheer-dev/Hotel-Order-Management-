import fs from 'node:fs';
const p='src/App.jsx';
let s=fs.readFileSync(p,'utf8');
if(s.includes('function OrdersView(')) process.exit(0);

// After an order is created, open the Orders tab automatically.
s=s.replace(
  "speak(`New order. Token number ${o.token}. Total ${money(total)}.`);setCart([])}catch(e){setError(e.message)}}",
  "speak(`New order. Token number ${o.token}. Total ${money(total)}.`);setCart([]);setView('orders')}catch(e){setError(e.message)}}"
);

// Add Orders beside Counter for the Manager.
const navOld="<button className={view==='counter'?'active':''} onClick={()=>setView('counter')}>Counter</button>";
const navNew=navOld+"<button className={view==='orders'?'active':''} onClick={()=>setView('orders')}>Orders</button>";
s=s.replace(navOld,navNew);

// Render the Orders page from the same server-synchronised orders state.
const renderOld="{view==='counter'&&user.role==='manager'&&<Counter cats={cats} category={category} setCategory={setCategory} menu={visible} cart={cart} add={add} change={change} note={note} total={total} createOrder={createOrder}/>}";
const renderNew=renderOld+" {view==='orders'&&!deliveryMode&&<OrdersView orders={orders}/>}";
s=s.replace(renderOld,renderNew);

const marker="function MenuManager({menu,onSave})";
const component="function OrdersView({orders}){\n  return <main className=\"panel wide orders-view\">\n    <div className=\"title-row\"><div><h2>Orders</h2><p>Track every token and kitchen progress.</p></div><b>{orders.length} ORDERS</b></div>\n    {!orders.length ? <div className=\"empty large\">No orders yet. Create an order from Counter.</div> : orders.slice().reverse().map(o=>{\n      const tasks=o.tasks||[];\n      const completed=tasks.filter(t=>t.status==='Completed').length;\n      const overall=o.status || ((completed===tasks.length && tasks.length) ? 'Ready' : 'In Kitchen');\n      const overallClass=overall.toLowerCase().replace(/\\s+/g,'-');\n      return <div className=\"order-card order-status-card\" key={o.id}>\n        <div className=\"order-status-head\"><div><div className=\"token\">TOKEN #{String(o.token).padStart(3,'0')}</div><small>Created by {o.createdBy||'Counter'}</small></div><span className={'status order-overall '+overallClass}>{overall}</span></div>\n        {tasks.map(t=><div className=\"status-task\" key={t.section}><div><b>{t.section}</b><div className=\"status-items\">{t.items.map((i,n)=><span key={n}>{i.name} × {i.qty}{i.note&&<em> · {i.note}</em>}</span>)}</div></div><span className={'status '+String(t.status||'').toLowerCase()}>{t.status}</span></div>)}\n        <div className=\"order-total\">Total: <b>{money(o.total)}</b></div>\n      </div>;\n    })}\n  </main>;\n}\n";
s=s.replace(marker,component+marker);
fs.writeFileSync(p,s);
console.log('Orders view injected');
