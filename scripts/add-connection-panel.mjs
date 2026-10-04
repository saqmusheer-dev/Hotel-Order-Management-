import fs from 'node:fs';
const p='src/App.jsx';
let s=fs.readFileSync(p,'utf8');
if(s.includes('className="connection-card"')) process.exit(0);
const navMarker='</header><nav>';
const panel=`<div className="connection-card">{user.role==='manager'&&<><b>🏨 Hotel Network</b><span>Share with Staff / Delivery devices</span><div className="connection-values"><label>Manager IP / Server URL<input readOnly value={serverInfo?.url||'Starting mini-server…'} onFocus={e=>e.target.select()}/></label><label>Hotel Connection Key<input readOnly value={serverInfo?.key||'Generating…'} onFocus={e=>e.target.select()}/></label><label>Port<input readOnly value={serverInfo?.port||8787}/></label></div><div className="connection-help">Same Wi-Fi or Manager hotspot → enter Server URL and Hotel Key in Staff app.</div></>}</div></header><nav>`;
s=s.replace(navMarker,panel);
fs.writeFileSync(p,s);
console.log('Connection panel injected');
