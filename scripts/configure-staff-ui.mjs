import fs from 'node:fs';
const p='src/App.jsx';
let s=fs.readFileSync(p,'utf8');
// Staff app should open ready for Staff 001 instead of Manager credentials.
s=s.replace("function Login({onLogin}){const[id,setId]=useState('Manager'),[pw,setPw]=useState('manager001')", "function Login({onLogin}){const[id,setId]=useState('staff001'),[pw,setPw]=useState('staff001')");
s=s.replace('<h1>Hotel Order Manager</h1><p>Local Mini-Server Kitchen System</p>', '<h1>Hotel Staff</h1><p>Kitchen Staff App · Local Mini-Server</p>');
s=s.replace('<div className="demo-box"><b>Manager</b> Manager / manager001<br/><b>Kitchen</b> staff001 / staff001 · staff002 / staff002</div>', '<div className="demo-box"><b>Staff 001</b> staff001 / staff001<br/><b>Staff 002</b> staff002 / staff002</div>');
fs.writeFileSync(p,s);
console.log('Staff UI configured');
