import fs from 'node:fs';
const p='src/App.jsx';
let s=fs.readFileSync(p,'utf8');
if(s.includes("view==='settings'")) process.exit(0);
const navMarker='</header><nav>';
const nav=`</header><nav>`;
s=s.replace(navMarker,nav);
const beforeCounter='function Counter({cats,category,setCategory,menu,cart,add,change,note,total,createOrder})';
const settings=`function Settings({serverInfo}){return <main className="panel settings-panel"><div className="title-row"><div><h2>⚙ Manager Settings</h2><p>Hotel network connection details for Staff and Delivery devices.</p></div></div><div className="connection-values"><label>Manager IP / Server URL<input readOnly value={serverInfo?.url||'Starting mini-server…'} onFocus={e=>e.target.select()}/></label><label>Hotel Connection Key<input readOnly value={serverInfo?.key||'Generating…'} onFocus={e=>e.target.select()}/></label><label>Port<input readOnly value={serverInfo?.port||8787}/></label></div><div className="connection-help">Connect Staff / Delivery phones to the same Wi-Fi or Manager hotspot. Enter the Server URL and Hotel Connection Key in the Staff app.</div></main>}
`;
s=s.replace(beforeCounter,settings+beforeCounter);
const oldNavButton="<button className={view==='delivery'?'active':''} onClick={()=>setView('delivery')}>Delivery</button></>}";
const newNavButton="<button className={view==='delivery'?'active':''} onClick={()=>setView('delivery')}>Delivery</button><button className={view==='settings'?'active':''} onClick={()=>setView('settings')}>⚙ Settings</button></>}";
s=s.replace(oldNavButton,newNavButton);
const renderMarker="{view==='delivery'&&<Delivery orders={ready} onCollect={collect}/>}";
s=s.replace(renderMarker,renderMarker+" {view==='settings'&&user.role==='manager'&&<Settings serverInfo={serverInfo}/>}");
fs.writeFileSync(p,s);
console.log('Manager connection details moved to Settings');