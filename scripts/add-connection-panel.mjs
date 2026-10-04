import fs from 'node:fs';
const p='src/App.jsx';
let s=fs.readFileSync(p,'utf8');
if(s.includes('connection-card')) process.exit(0);
const navMarker='</header><nav>';
const panel=`</header><details className="connection-card" open>{user.role==='manager'&&<><summary>🏨 Hotel Network <span>Tap to open/close connection details</span></summary><div className="connection-values"><label>Manager IP / Server URL<input readOnly value={serverInfo?.url||'Starting mini-server…'} onFocus={e=>e.target.select()}/></label><label>Hotel Connection Key<input readOnly value={serverInfo?.key||'Generating…'} onFocus={e=>e.target.select()}/></label><label>Port<input readOnly value={serverInfo?.port||8787}/></label></div><div className="connection-help">Connect Staff / Delivery phones to the same Wi-Fi or Manager hotspot, then enter the Server URL and Hotel Key in the Staff app.</div></>}</details><nav>`;
s=s.replace(navMarker,panel);
fs.writeFileSync(p,s);
console.log('Connection panel injected');
