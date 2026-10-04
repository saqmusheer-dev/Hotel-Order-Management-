import fs from 'node:fs';
const p='src/App.jsx';
let s=fs.readFileSync(p,'utf8');

// Manager Settings: move Settings from the tab row into the top-right header.
s=s.replace("<button className={view==='settings'?'active':''} onClick={()=>setView('settings')}>⚙ Settings</button>","");
const headerMarker='<button className="logout" onClick={()=>{setUser(null);localStorage.removeItem(\'koms_session\')}}>Logout</button>';
if(!s.includes('manager-settings-top')){
  const replacement="{user.role==='manager'&&!deliveryMode&&<button className=\"manager-settings-top\" onClick={()=>setView('settings')} aria-label=\"Manager Settings\">⚙</button>}"+headerMarker;
  if(!s.includes(headerMarker)) throw new Error('Header logout marker not found');
  s=s.replace(headerMarker,replacement);
}

// Menu Manager: add List / Grid view switch. Grid remains the default.
if(!s.includes('menuView===')){
  s=s.replace("const[form,setForm]=useState(empty),[editing,setEditing]=useState(null),[busy,setBusy]=useState(false);", "const[form,setForm]=useState(empty),[editing,setEditing]=useState(null),[busy,setBusy]=useState(false),[menuView,setMenuView]=useState('grid');");
  const titleOld='<div className="title-row"><div><h2>Menu Management</h2><p>Upload food image, set price, category and kitchen section.</p></div><button className="primary" onClick={reset}>+ New Item</button></div>';
  const titleNew='<div className="title-row"><div><h2>Menu Management</h2><p>Manage food items, prices, images and kitchen sections.</p></div><div className="menu-toolbar"><button className={menuView===\'list\'?\'view-toggle active\':\'view-toggle\'} onClick={()=>setMenuView(\'list\')}>☰ List</button><button className={menuView===\'grid\'?\'view-toggle active\':\'view-toggle\'} onClick={()=>setMenuView(\'grid\')}>▦ Grid</button><button className="primary" onClick={reset}>+ Add Item</button></div></div>';
  if(!s.includes(titleOld)) throw new Error('Menu title marker not found');
  s=s.replace(titleOld,titleNew);
  s=s.replace('<div className="manage-menu-grid">{menu.map(i=>', '<div className={menuView===\'grid\'?\'manage-menu-grid\':\'manage-menu-list\'}>{menu.map(i=>');
}
fs.writeFileSync(p,s);
console.log('UI improvements injected');
