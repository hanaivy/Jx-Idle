// Offline smoke test: drives headless Chrome via CDP against the local server,
// creates a character, lets the game auto-play, and reports failed / external requests.
// Usage: node tools/smoke.mjs [url] [seconds] [outDir]
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_ = process.argv[2] || 'http://localhost:8080/';
const SECS = +(process.argv[3] || 45);
const OUT = process.argv[4] || '.';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;
const prof = mkdtempSync(join(tmpdir(), 'vl-smoke-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--mute-audio',
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, '--window-size=430,900', 'about:blank'], { stdio: 'ignore' });
const wait = ms => new Promise(r => setTimeout(r, ms));

let targets;
for (let i = 0; i < 50 && !targets; i++) {
  await wait(200);
  targets = await fetch(`http://127.0.0.1:${PORT}/json`).then(r => r.json()).catch(() => null);
}
const page = targets.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pending = new Map();
const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = async expr => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.value;

const external = new Set(), failed = new Set(), errors = [];
let total = 0;
const urls = new Map();
ws.addEventListener('message', ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result || m); pending.delete(m.id); return; }
  if (m.method === 'Network.requestWillBeSent') {
    total++; const u = m.params.request.url; urls.set(m.params.requestId, u);
    if (!/^(https?:\/\/(localhost|127\.0\.0\.1)[:/]|data:|blob:|about:)/.test(u)) external.add(u);
  }
  if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) failed.add(`${m.params.response.status} ${m.params.response.url}`);
  if (m.method === 'Network.loadingFailed' && !m.params.canceled) failed.add(`ERR ${m.params.errorText} ${urls.get(m.params.requestId)}`);
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push(m.params.entry.text + ' ' + (m.params.entry.url || ''));
});
await send('Network.enable'); await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
await send('Page.navigate', { url: URL_ });
await wait(4000);
const picked = await evalJs(`(() => { const b = document.querySelector('.facpick button'); if (!b) return 'no picker'; b.click(); return 'picked: ' + b.textContent.trim().slice(0, 30); })()`);
console.log(picked);
await wait(1500);
await evalJs(`document.querySelector('#modal:not(.hidden) #mClose')?.click()`);
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(OUT, name), Buffer.from(r.data, 'base64')); };
await wait(SECS * 500); await shot('smoke-mid.png');
// Visit every tab so their UI images load too.
for (const t of ['char', 'skill', 'inv', 'more', 'log']) { await evalJs(`document.querySelector('#tabs [data-t="${t}"]').click()`); await wait(800); }
await wait(SECS * 500); await shot('smoke-end.png');
const state = await evalJs(`JSON.stringify({ lvl: S.lvl, gold: S.gold, fac: S.fac, sw: !!navigator.serviceWorker.controller, save: !!Object.keys(localStorage).find(k => k.startsWith('jxidle')) })`);
console.log('state', state);
console.log('requests', total);
console.log('external', [...external]);
console.log('failed', [...failed]);
console.log('js errors', errors);
ws.close(); chrome.kill();
