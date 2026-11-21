/* Screenshots of demo pages at desktop (1360) and phone (390) width, for checking layout by eye.
 * Usage: node scripts/shots.cjs <out-dir> <template-id> [template-id …]
 * Writes <out-dir>/<id>.png and <out-dir>/<id>-phone.png; prints any page errors. Outside hosts are blocked. */
let chromium;
try { ({ chromium } = require('playwright')); } catch (_) { ({ chromium } = require('/opt/npm-tools/node_modules/playwright')); }
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../public'), [OUT, ...IDS] = process.argv.slice(2);
if (!OUT || !IDS.length) { console.error('usage: node scripts/shots.cjs <out-dir> <template-id> [template-id …]'); process.exit(1); }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html'; const f = path.join(ROOT, u); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r); });
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  await new Promise(r => srv.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + srv.address().port;
  const b = await chromium.launch();
  for (const id of IDS) for (const [suffix, w] of [['', 1360], ['-phone', 390]]) {
    const p = await b.newPage({ viewport: { width: w, height: 1000 } });
    p.on('pageerror', e => console.log(id + suffix, 'ERROR', e.message));
    p.on('console', m => { if (m.type() === 'error' && !/ERR_|net::|Failed to load/.test(m.text())) console.log(id + suffix, 'console', m.text()); });
    await p.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort());
    await p.goto(base + '/templates/' + id + '/'); await p.waitForTimeout(1200);
    if (!suffix) await p.evaluate(() => { const s = document.getElementById('stage'); s && s.scrollIntoView(); });
    await p.screenshot({ path: path.join(OUT, id + suffix + '.png') });
    await p.close();
  }
  await b.close(); srv.close();
  console.log('wrote ' + IDS.length * 2 + ' screenshots to ' + OUT);
})();
