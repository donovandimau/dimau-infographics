import assert from 'node:assert/strict';
import { STARTER_TEMPLATES } from '../src/lib/starter-templates';
import { renderTemplate } from '../src/lib/render';
import { findSlots, resolveValues, VariableError } from '../src/lib/substitute';
import { buildSdk } from '../src/lib/sdk';

(async () => {
  for (const t of STARTER_TEMPLATES) {
    const used = findSlots([t.dsl, t.card_dsl]);
    for (const s of used) assert.ok(t.variables.some((v) => v.name === s), `${t.slug}: slot {{${s}}} has no variable`);
    for (const v of t.variables) assert.ok(used.has(v.name), `${t.slug}: variable ${v.name} is unused`);

    for (const theme of ['dark', 'light'] as const) {
      const svg = await renderTemplate(t, { format: 'svg', theme });
      const text = String(svg.body);
      assert.ok(text.includes('<svg'), `${t.slug} ${theme}: no svg`);
      assert.ok(!text.includes('{{'), `${t.slug} ${theme}: unfilled slot`);
      assert.ok(!text.includes('foreignObject'), `${t.slug} ${theme}: foreignObject left in`);
      assert.ok(text.includes(t.variables[0].default.replace(/&/g, '&amp;').split(' ')[0]), `${t.slug} ${theme}: default text missing`);
      const png = await renderTemplate(t, { format: 'png', theme });
      assert.ok((png.body as Buffer).subarray(1, 4).toString() === 'PNG', `${t.slug} ${theme}: not a PNG`);
    }
    if (t.card_dsl) {
      const card = await renderTemplate(t, { format: 'png', variant: 'card', data: { active_creators: 999 } });
      assert.ok((card.body as Buffer).length > 5000, `${t.slug}: card too small`);
    }
    console.log('ok', t.slug);
  }

  assert.throws(() => resolveValues([{ name: 'x', type: 'number', required: false, default: '1' }], { x: 'abc' }), VariableError);
  assert.equal(resolveValues([{ name: 'x', type: 'string', required: false, default: 'd' }], {}).x, 'd');

  const sdk = buildSdk(STARTER_TEMPLATES, 'https://example.test');
  assert.ok(sdk.includes("'sota-kece-community-pulse'") && sdk.includes('variant'), 'sdk content');
  assert.equal(sdk, buildSdk([...STARTER_TEMPLATES].reverse(), 'https://example.test'), 'sdk must be stable');
  assert.equal(typeof (globalThis as { window?: unknown }).window, 'undefined', 'renderer leaked a fake window into the server');
  console.log('render tests passed');
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
