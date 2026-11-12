import fs from 'fs';
import path from 'path';
import { STARTER_TEMPLATES } from '../src/lib/starter-templates';
import { buildSdk, DEFAULT_BASE_URL } from '../src/lib/sdk';

const out = buildSdk(STARTER_TEMPLATES, DEFAULT_BASE_URL);
const outPath = path.join(process.cwd(), 'dist-sdk', 'infographics-fiji.ts');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, out, 'utf8');
console.log(`Generated dist-sdk/infographics-fiji.ts (${out.match(/hash: (\w+)/)?.[1]})`);
