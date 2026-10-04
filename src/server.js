import { registerPlugin } from '@capacitor/core';

export const MiniServer = registerPlugin('MiniServer');

export function getConnection() {
  try { return JSON.parse(localStorage.getItem('koms_connection') || 'null'); } catch { return null; }
}
export function setConnection(value) { localStorage.setItem('koms_connection', JSON.stringify(value)); }

export async function startMiniServer(existingKey='') {
  const info = await MiniServer.start({ key: existingKey || '' });
  const connection = {
    url: info.url,
    localUrl: `http://127.0.0.1:${info.port || 8787}`,
    key: info.key,
    ip: info.ip,
    port: info.port || 8787
  };
  setConnection(connection);
  return connection;
}

export async function stopMiniServer() { try { await MiniServer.stop(); } catch {} }

export async function apiRequest(path, options={}) {
  const conn = getConnection();
  if (!conn?.url || !conn?.key) throw new Error('This device is not connected to the Manager server.');
  const headers = { 'Content-Type':'application/json', 'X-Hotel-Key':conn.key, ...(options.headers||{}) };
  // Manager uses localhost; staff devices use the Manager LAN URL.
  const baseUrl = conn.localUrl || conn.url;
  const res = await fetch(`${baseUrl}${path}`, { ...options, headers });
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { error:text }; }
  if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
  return data;
}
