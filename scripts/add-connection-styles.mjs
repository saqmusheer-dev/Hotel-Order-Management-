import fs from 'node:fs';
const p='src/styles.css';
let s=fs.readFileSync(p,'utf8');
const css=`\n.connection-card{display:block;max-width:1050px;margin:10px auto;padding:0 16px;border:1px solid #d9e2ec;border-radius:16px;background:#f7fbff;box-shadow:0 4px 14px rgba(15,35,55,.06);position:relative;z-index:1}.connection-card summary{cursor:pointer;list-style:none;padding:13px 2px;font-weight:800;color:#172033}.connection-card summary::-webkit-details-marker{display:none}.connection-card summary span{font-size:12px;font-weight:500;color:#697586;margin-left:8px}.connection-values{display:grid;grid-template-columns:2fr 2fr 1fr;gap:10px;padding:0 0 10px}.connection-values label{font-size:12px;font-weight:700;color:#425466}.connection-values input{display:block;width:100%;margin-top:5px;padding:11px 12px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;font-weight:700;color:#172033;box-sizing:border-box}.connection-help{padding:0 0 13px;font-size:12px;line-height:1.45;color:#52606d}@media(max-width:700px){.connection-card{margin:8px 10px;padding:0 12px}.connection-card summary{font-size:14px}.connection-card summary span{display:block;margin:3px 0 0}.connection-values{grid-template-columns:1fr}.connection-values input{font-size:13px}}\n`;
s=s.replace(/\n\.connection-card\{[\s\S]*?\n(?=\s*$)/,'\n');
s+=css;
fs.writeFileSync(p,s);
console.log('Connection styles injected');
