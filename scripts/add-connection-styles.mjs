import fs from 'node:fs';
const p='src/styles.css';
let s=fs.readFileSync(p,'utf8');
if(s.includes('.connection-card{')) process.exit(0);
s+=`\n.connection-card{max-width:1000px;margin:14px auto;padding:16px 18px;border:1px solid #d9e2ec;border-radius:16px;background:#f7fbff;box-shadow:0 4px 14px rgba(15,35,55,.06)}\n.connection-card>div:first-child{display:flex;flex-direction:column;gap:4px;margin-bottom:12px}.connection-card>div:first-child span{font-size:13px;color:#5d6b78}.connection-values{display:grid;grid-template-columns:2fr 2fr 1fr;gap:10px}.connection-values label{font-size:12px;font-weight:700;color:#425466}.connection-values input{display:block;width:100%;margin-top:5px;padding:11px 12px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;font-weight:700;color:#172033;box-sizing:border-box}.connection-help{margin-top:10px;font-size:12px;color:#52606d}@media(max-width:700px){.connection-values{grid-template-columns:1fr}.connection-card{margin:10px}.connection-values input{font-size:13px}}\n`;
fs.writeFileSync(p,s);
console.log('Connection styles injected');
