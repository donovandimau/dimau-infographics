/* Writes public/v1/<family>.css from the STYLE string inside public/v1/<family>.js.
 * Run after editing a family's STYLE:  node scripts/build-css.cjs
 * The .css copies let apps with a strict style policy (no 'unsafe-inline' in style-src) use the templates:
 * the loader links them instead of injecting a <style> element. npm test fails if a copy is out of date. */
const fs = require('fs');
const path = require('path');
const V1 = path.resolve(__dirname, '../public/v1');
const SKIP = new Set(['dimau-infographics.js', 'stagepath.js']); // stagepath.css is kept by hand (see TRACKER)
let n = 0;
for (const file of fs.readdirSync(V1).filter(f => f.endsWith('.js') && !SKIP.has(f)).sort()) {
  const src = fs.readFileSync(path.join(V1, file), 'utf8');
  const m = src.match(/const STYLE = `([\s\S]*?)`;/);
  if (!m) continue;
  const id = (src.match(/getElementById\('([a-z]+-style)'\)/) || [])[1];
  const names = [...new Set([...m[1].matchAll(/\$\{(\w+)\}/g)].map(x => x[1]))], vals = {};
  for (const k of names) {
    const d = src.match(new RegExp('const ' + k + " = (['\"])((?:\\\\.|(?!\\1).)*)\\1"));
    if (!d) throw new Error(file + ': cannot resolve ${' + k + '} in STYLE');
    vals[k] = d[2].replace(/\\(.)/g, '$1');
  }
  const css = m[1].replace(/\$\{(\w+)\}/g, (_, k) => vals[k]).trim();
  const head = '/* ' + file.replace('.js', '') + ' styles (Dimau Infographics). Generated from STYLE in v1/' + file + ' by scripts/build-css.cjs — do not edit by hand.\n' +
    ' * Apps with a strict style policy link this file with id="' + id + '"; the loader does it for them. */\n';
  fs.writeFileSync(path.join(V1, file.replace('.js', '.css')), head + css + '\n');
  n++;
}
console.log('wrote ' + n + ' css files');
