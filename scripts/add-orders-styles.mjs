import fs from 'node:fs';
const p='src/styles.css';
let s=fs.readFileSync(p,'utf8');
if(s.includes('.orders-view')) process.exit(0);
s += `\n/* Orders status view + mobile safe spacing */\n.orders-view{padding-bottom:28px}.order-status-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.order-overall{font-weight:800}.order-overall.ready{background:#dff7e7}.order-overall.in-kitchen{background:#fff1cc}.status-task{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:13px 0;border-top:1px solid #edf0f4}.status-items{display:flex;flex-direction:column;gap:4px;margin-top:7px;color:#58667a;font-size:13px}.status-items em{color:#a06d12;font-style:normal}.cart{padding-bottom:40px}.cart>.primary.full{margin-bottom:8px}@media(max-width:760px){.cart{padding-bottom:48px}.cart>.primary.full{margin-bottom:12px}.order-status-head,.status-task{align-items:flex-start;flex-direction:column}.order-status-head .status{margin-top:0}.orders-view{margin-bottom:20px}}\n`;
fs.writeFileSync(p,s);
console.log('Orders styles injected');
