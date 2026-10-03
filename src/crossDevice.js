import { supabase } from './supabase';

const nativeSet = localStorage.setItem.bind(localStorage);
let pushing = false;

async function pushKey(key, raw) {
  if (!supabase || pushing) return;
  try {
    const payload = JSON.parse(raw);
    if (key === 'koms_orders' && Array.isArray(payload)) {
      await Promise.all(payload.map(o => supabase.from('koms_orders').upsert({ id:o.id, token:o.token, payload:o, updated_at:new Date().toISOString() }, { onConflict:'id' })));
    }
    if (key === 'koms_staff' || key === 'koms_menu') {
      await supabase.from('koms_state').upsert({ key:key.replace('koms_',''), payload, updated_at:new Date().toISOString() }, { onConflict:'key' });
    }
  } catch {}
}
localStorage.setItem = function(key,value){ nativeSet(key,value); pushKey(key,value); };

if (supabase) {
  const channel = supabase.channel('koms-cross-device')
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'koms_orders'},({new:row})=>nativeSet('koms_orders',JSON.stringify(mergeOrder(row.payload))))
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'koms_orders'},({new:row})=>nativeSet('koms_orders',JSON.stringify(mergeOrder(row.payload))))
    .on('postgres_changes',{event:'*',schema:'public',table:'koms_state'},({new:row})=>{if(row?.key==='staff')nativeSet('koms_staff',JSON.stringify(row.payload));if(row?.key==='menu')nativeSet('koms_menu',JSON.stringify(row.payload))})
    .subscribe();
  window.addEventListener('beforeunload',()=>supabase.removeChannel(channel));
}

function mergeOrder(order){
  try { const current=JSON.parse(localStorage.getItem('koms_orders')||'[]'); const next=current.filter(x=>x.id!==order.id); next.push(order); return next.sort((a,b)=>a.token-b.token); } catch { return [order]; }
}

export function startDeliveryCounter(){
  if(location.search!=='?delivery=1')return;
  const root=document.createElement('div'); root.id='delivery-overlay';
  Object.assign(root.style,{position:'fixed',inset:'0',background:'#f5f7fb',zIndex:'99999',overflow:'auto',fontFamily:'Inter,system-ui,sans-serif',color:'#172033',padding:'24px'});
  document.body.appendChild(root);
  const render=()=>{let orders=[];try{orders=JSON.parse(localStorage.getItem('koms_orders')||'[]').filter(o=>o.deliveryStatus==='Waiting')}catch{}
    root.innerHTML=`<div style="max-width:1000px;margin:auto"><div style="display:flex;justify-content:space-between;align-items:center;background:white;padding:18px 20px;border-radius:16px;border:1px solid #e4e8f0;margin-bottom:18px"><div><h1 style="margin:0">🚚 Delivery Counter</h1><p style="margin:6px 0 0;color:#748096">Completed kitchen orders ready for customer collection</p></div><b>${orders.length} Ready</b></div>${orders.length?orders.slice().reverse().map(o=>`<div data-id="${o.id}" style="background:white;border:1px solid #e2e6ed;border-radius:14px;padding:18px;margin-bottom:14px;display:flex;justify-content:space-between;gap:20px;align-items:center"><div><div style="font-size:22px;font-weight:800">TOKEN #${String(o.token).padStart(3,'0')}</div>${o.tasks.flatMap(t=>t.items).map(i=>`<div style="margin-top:7px">${i.name} × <b>${i.qty}</b>${i.note?` <span style="color:#6f7888">· ${i.note}</span>`:''}</div>`).join('')}</div><button data-collect="${o.id}" style="border:0;border-radius:10px;padding:13px 18px;background:#172033;color:white;font-weight:700">Customer Collected</button></div>`).join(''):'<div style="background:white;border-radius:16px;padding:70px;text-align:center;color:#8a94a6">No orders waiting for collection</div>'}</div>`;
    root.querySelectorAll('[data-collect]').forEach(btn=>btn.onclick=async()=>{const id=btn.dataset.collect;let all=[];try{all=JSON.parse(localStorage.getItem('koms_orders')||'[]')}catch{};const o=all.find(x=>x.id===id);if(!o)return;const updated={...o,status:'Collected',deliveryStatus:'Collected',collectedAt:new Date().toISOString()};nativeSet('koms_orders',JSON.stringify(all.map(x=>x.id===id?updated:x)));if(supabase)await supabase.from('koms_orders').upsert({id:updated.id,token:updated.token,payload:updated,updated_at:new Date().toISOString()},{onConflict:'id'});render()});
  };
  render();setInterval(render,15000);
}
