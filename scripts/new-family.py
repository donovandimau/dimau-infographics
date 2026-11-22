#!/usr/bin/env python3
"""Wire a new template family into the library.  Usage:  python3 scripts/new-family.py path/to/spec.json

Run it from the repo root AFTER writing public/v1/<file> (the family's code) and each
public/templates/<id>/sample-data.js. It is safe to run again: every step checks first.

It does the mechanical wiring that every family needs:
  1. a nav link for the family on the home page and on every demo page (after spec.after)
  2. a demo page per template (public/templates/<id>/index.html) from scripts/demo-page.tpl
  3. catalog.json entries (before the signal cards) and catalog version
  4. loader: TEMPLATES lines, STYLE_IDS entry, VERSION
  5. React wrapper: LOADERS lines and any new event names
  6. node scripts/build-css.cjs (writes public/v1/<file>.css)

It does NOT do the parts that need judgement (see .claude/skills/add-template-family/SKILL.md):
the home-page section, the Pathfinder group, README rows and file layout line, smoke tests, TRACKER.

spec.json:
{
  "file": "energy.js",            // public/v1/<file>, already written
  "family": "energy",             // catalog family and the home-page section id (#energy)
  "nav": "Energy",                // nav label
  "after": "Food",                // nav label to insert after (usually the newest family)
  "version": "1.27.0",            // new loader + catalog version
  "templates": [{
    "id": "payback", "name": "Payback", "global": "Payback",
    "eyebrow": "Energy · paying back",          // small heading on the demo page
    "lede": "When an up-front cost is paid back ...",
    "best": "Solar, efficient appliances ...",  // catalog bestFor, one sentence
    "data": "PAYBACK_DATA",                     // window.<data> set by sample-data.js
    "flag": {"kind": "example", "text": "A $2,400 solar water heater ..."},
             // or {"kind": "real", "label": "Real data, worked out", "text": "Source and date ..."}
    "events": ["change"], "shape": "payback", "sample": "A solar water heater (example)",
    "mechanics": ["...", "..."], "dataShape": "{ prefix?, cost, saving, rise?, years? }",
    "opts": "{}"                                // optional: options object passed on the demo page
  }]
}
"""
import glob, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(ROOT, *a)


def read(p): return open(p, encoding='utf-8').read()
def write(p, s): open(p, 'w', encoding='utf-8').write(s)


def flag_html(f):
    note = '<span style="font-size:13px;color:var(--muted)">' + f['text'] + '</span>'
    if f.get('kind') == 'real':
        return '<span class="chip">' + f.get('label', 'Real data') + '</span>' + note
    return '<span class="example-flag">Example figures</span>' + note


def main(spec_path):
    sp = json.load(open(spec_path, encoding='utf-8'))
    fam, nav, after, file_, ver, T = sp['family'], sp['nav'], sp['after'], sp['file'], sp['version'], sp['templates']
    src = read(P('public/v1', file_))
    for t in T:
        if 'class ' + t['global'] not in src and t['global'] + ':' not in src:
            sys.exit('public/v1/%s does not seem to define %s' % (file_, t['global']))
        if not os.path.exists(P('public/templates', t['id'], 'sample-data.js')):
            sys.exit('missing public/templates/%s/sample-data.js' % t['id'])

    # 1. nav link everywhere (home page and every demo page)
    link = '<a href="/#%s">%s</a>' % (fam, nav)
    pat = re.compile(r'(<a href="/#[a-z-]+"( aria-current="page")?>%s</a>)' % re.escape(after))
    for f in [P('public/index.html')] + glob.glob(P('public/templates/*/index.html')):
        s = read(f)
        if link in s or ('aria-current="page">%s</a>' % nav) in s:
            continue
        s2 = pat.sub(lambda m: m.group(1) + '\n      ' + link, s, count=1)
        if s2 != s:
            write(f, s2)

    # 2. demo pages, with the nav copied from an existing demo page
    ref = next(f for f in sorted(glob.glob(P('public/templates/*/index.html'))) if link in read(f) and '{name}' not in read(f))
    m = re.search(r'(<nav class="site-nav"[^>]*>\n)(.*?)(\n    </nav>)', read(ref), re.S)
    nav_lines = re.sub(r' aria-current="page"', '', m.group(2))
    nav_html = nav_lines.replace(link, '<a href="/#%s" aria-current="page">%s</a>' % (fam, nav))
    tpl = read(P('scripts/demo-page.tpl'))
    for t in T:
        os.makedirs(P('public/templates', t['id']), exist_ok=True)
        page = tpl.format(navhtml=nav_html, scripthtml='<script src="/templates/%s/sample-data.js"></script>' % t['id'], familyfile=file_,
                          id=t['id'], name=t['name'], glob=t['global'], lede=t['lede'], best=t['best'], data=t['data'],
                          flag=flag_html(t['flag']), shape=t['eyebrow'], opts=t.get('opts', '{}'))
        write(P('public/templates', t['id'], 'index.html'), page)

    # 3. catalog
    c = json.load(open(P('public/catalog.json'), encoding='utf-8'))
    c['version'] = ver
    for t in T:
        e = {'id': t['id'], 'name': t['name'], 'global': t['global'], 'file': file_, 'status': 'ready', 'shape': t['shape'], 'family': fam,
             'bestFor': t['best'], 'mechanics': t['mechanics'], 'dataShape': t['dataShape'], 'events': t['events'],
             'demo': '/templates/%s/' % t['id'], 'sample': t['sample'], 'usedBy': []}
        old = next((x for x in c['templates'] if x['id'] == t['id']), None)
        if old: e['usedBy'] = old.get('usedBy', [])
        c['templates'] = [x for x in c['templates'] if x['id'] != t['id']]
        pos = next(i for i, x in enumerate(c['templates']) if x.get('shape') == 'card')
        c['templates'].insert(pos, e)
    write(P('public/catalog.json'), json.dumps(c, indent=2, ensure_ascii=False) + '\n')

    # 4. loader
    lp = P('public/v1/dimau-infographics.js'); s = read(lp)
    anchor = "    'rbf-sandbox-settlement-flow':"
    for t in T:
        line = "    %s: { file: '%s', global: '%s' },\n" % (t['id'], file_, t['global'])
        if line not in s:
            s = s.replace(anchor, line + anchor, 1)
    sid = re.search(r"getElementById\('([a-z]+-style)'\)", src)
    if sid and "'%s': '%s'" % (file_, sid.group(1)) not in s:
        i = s.index('  var STYLE_IDS = {'); j = s.index('\n  };', i)
        s = s[:j] + ",\n    '%s': '%s'" % (file_, sid.group(1)) + s[j:]
    s = re.sub(r"var VERSION = '[\d.]+';", "var VERSION = '%s';" % ver, s, count=1)
    write(lp, s)

    # 5. React wrapper
    rp = P('public/v1/react/DimauInfographic.jsx'); s = read(rp)
    a = "  // the four signal cards share one file\n"
    if "import('../%s')" % file_ not in s:
        s = s.replace(a, "  // the %s templates in %s\n" % (fam, file_) + ''.join(
            "  %s: () => import('../%s').then(m => ({ default: (m.default || m).%s })),\n" % (t['id'], file_, t['global']) for t in T) + a)
    m3 = re.search(r"const events = \[(.*?)\];", s)
    have = set(re.findall(r"'(\w+)'", m3.group(1)))
    new = [e for t in T for e in t['events'] if e not in have]
    if new:
        s = s[:m3.end(1)] + ''.join(", '%s'" % e for e in dict.fromkeys(new)) + s[m3.end(1):]
    write(rp, s)

    # 6. stylesheet copy
    subprocess.run(['node', P('scripts/build-css.cjs')], check=True)
    print('wired %d templates in %s; catalog now has %d. Still to do by hand: home section, Pathfinder group, README, smoke tests, TRACKER.' % (len(T), file_, len(c['templates'])))


if __name__ == '__main__':
    if len(sys.argv) != 2: sys.exit(__doc__)
    main(sys.argv[1])
