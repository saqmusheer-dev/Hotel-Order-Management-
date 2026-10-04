import fs from 'node:fs';
const p='src/App.jsx';
let s=fs.readFileSync(p,'utf8');

// After an order is created, open the Orders tab automatically.
s=s.replace(
  "speak(`New order. Token number ${o.token}. Total ${money(total)}.`);setCart([])}catch(e){setError(e.message)}}",
  "speak(`New order. Token number ${o.token}. Total ${money(total)}.`);setCart([]);setView('orders')}catch(e){setError(e.message)}}"
);

// Add Orders beside Counter for the Manager.
const navOld="<button className={view==='counter'?'active':''} onClick={()=>setView('counter')}>Counter</button>";
const navNew=navOld+"<button className={view==='orders'?'active':''} onClick={()=>setView('orders')}>Orders</button>";
s=s.replace(navOld,navNew);

// Use the existing Kitchen order cards for the Orders screen.
// This gives the manager token, section, item, note and live status without duplicating order logic.
const renderOld="{view==='counter'&&user.role==='manager'&&<Counter cats={cats} category={category} setCategory={setCategory} menu={visible} cart={cart} add={add} change={change} note={note} total={total} createOrder={createOrder}/>}";
const renderNew=renderOld+" {view==='orders'&&!deliveryMode&&<Kitchen user={{...user,role:'manager'}} orders={orders} onTask={task}/>}";
s=s.replace(renderOld,renderNew);

fs.writeFileSync(p,s);
console.log('Orders view safely injected');
