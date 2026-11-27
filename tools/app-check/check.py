"""Weekly phone-size check of every live Dimau app.

For each address in apps.txt it opens the page as an iPhone would and checks:
  - the page loads (200)
  - link preview: title, description and picture, and the picture really loads
  - install-to-phone file (manifest) is linked
  - a Share button is visible and not covered by another floating bubble
  - nothing makes the page scroll sideways
Writes report.md and exits 1 when anything is wrong (so GitHub emails the owner).
"""
import asyncio, re, sys, urllib.parse as up
from pathlib import Path
import requests
from playwright.async_api import async_playwright

HERE = Path(__file__).parent
UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

PAGE_JS = r'''() => {
  const out = {};
  out.hscroll = document.documentElement.scrollWidth > innerWidth + 2;
  const meta = k => { const m = document.querySelector(`meta[property="${k}"],meta[name="${k}"]`); return m ? m.content : ''; };
  out.title = meta('og:title'); out.desc = meta('og:description'); out.image = meta('og:image') || meta('twitter:image');
  out.manifest = !!document.querySelector('link[rel=manifest]');
  const deepAt = (x, y) => { let e = document.elementFromPoint(x, y); while (e && e.shadowRoot) { const i = e.shadowRoot.elementFromPoint(x, y); if (!i || i === e) break; e = i; } return e; };
  const b = document.querySelector('[data-dimau-share]');
  if (b) {
    const r = b.getBoundingClientRect();
    const t = deepAt(r.left + r.width / 2, r.top + r.height / 2);
    out.share = r.width > 0 && r.height > 0;
    out.covered = !(t && b.contains(t));
    out.offscreen = r.bottom > innerHeight || r.top < 0;
  } else {
    let found = false;
    const walk = root => root.querySelectorAll('button,a,[role=button]').forEach(e => {
      const t = ((e.getAttribute('aria-label') || '') + ' ' + (e.getAttribute('title') || '') + ' ' + e.textContent).toLowerCase();
      const r = e.getBoundingClientRect();
      if (/\bshare\b/.test(t) && r.width > 0 && r.height > 0) found = true;
    });
    walk(document); document.querySelectorAll('*').forEach(e => e.shadowRoot && walk(e.shadowRoot));
    out.share = found;
  }
  return out;
}'''


def image_ok(page_url, img):
    if not img:
        return False
    try:
        r = requests.get(up.urljoin(page_url, img), timeout=20, headers={'User-Agent': 'facebookexternalhit/1.1'})
        return r.status_code == 200 and r.headers.get('content-type', '').startswith('image')
    except Exception:
        return False


async def check(browser, site, flags):
    ctx = await browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2,
                                    is_mobile=True, has_touch=True, user_agent=UA)
    page = await ctx.new_page()
    problems = []
    try:
        resp = await page.goto('https://' + site, wait_until='domcontentloaded', timeout=45000)
        await page.wait_for_timeout(9000)  # let floating bubbles (Pulse, Volau) settle
        if not resp or resp.status != 200:
            problems.append(f'page answers {resp.status if resp else "nothing"}')
        else:
            d = await page.evaluate(PAGE_JS)
            if 'private' not in flags:  # owner-only tools land on a sign-in page; only check they load
                if not d['title']: problems.append('link preview has no title')
                if not d['desc']: problems.append('link preview has no description')
                if not image_ok(page.url, d['image']): problems.append('link preview picture missing or broken')
                if not d['manifest']: problems.append('cannot be installed on a phone')
                if not d['share'] and 'menu-share' not in flags: problems.append('no visible Share button')
                if d.get('covered'): problems.append('Share button is covered by something else')
                if d.get('offscreen'): problems.append('Share button is off the screen')
            if d['hscroll']: problems.append('page scrolls sideways on a phone')
    except Exception as e:
        problems.append('did not load: ' + str(e).splitlines()[0][:80])
    await ctx.close()
    return site, problems


async def main():
    apps = []
    for line in (HERE / 'apps.txt').read_text().splitlines():
        line = line.split('#')[0].strip()
        if line:
            parts = line.split()
            apps.append((parts[0], set(parts[1:])))
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(**({'executable_path': '/usr/bin/google-chrome', 'args': ['--no-sandbox']} if __import__('os').environ.get('LOCAL_CHROME') else {}))
        sem = asyncio.Semaphore(6)

        async def one(a):
            async with sem:
                return await check(browser, *a)
        results = await asyncio.gather(*[one(a) for a in apps])
        await browser.close()
    bad = [(s, p) for s, p in results if p]
    lines = [f'# Weekly app check: {len(apps) - len(bad)} of {len(apps)} apps fine', '']
    if bad:
        lines += ['## Needs fixing', ''] + [f'- **{s}**: ' + '; '.join(p) for s, p in bad]
    else:
        lines += ['Every app loads, previews properly, installs and shares at phone size.']
    (HERE / 'report.md').write_text('\n'.join(lines) + '\n')
    print('\n'.join(lines))
    sys.exit(1 if bad else 0)


asyncio.run(main())
