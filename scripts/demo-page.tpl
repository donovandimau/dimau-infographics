<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="claude:viewport-fit-sides" content="cover">
<title>{name} · Dimau Infographics</title>
<meta name="description" content="{name}: {best}">
<meta property="og:title" content="{name} · Dimau Infographics">
<meta property="og:description" content="{name}: {best}">
<meta property="og:image" content="/icons/icon-512.png">
<meta name="theme-color" content="#87CEEB">
<link rel="icon" href="/icons/icon.svg" type="image/svg+xml">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700&family=Manrope:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap">
<link rel="stylesheet" href="/v1/dimau-infographics.css">
<link rel="stylesheet" href="/site.css">
<style>
.demo-head {{ display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px 20px; }}
.stagewrap {{ margin-top: 16px; }}
.use {{ margin-top: 14px; }}
.out {{ margin: 12px 0 0; font-size: 14px; color: var(--muted); min-height: 1.5em; }}
.out b {{ color: var(--ink); }}
</style>
</head>
<body>
<header class="site-head">
  <div class="wrap">
    <a class="mark" href="/" aria-label="Dimau Infographics home"><img src="/icons/icon.svg" alt=""><b>Dimau Infographics</b></a>
    <nav class="site-nav" aria-label="Templates">
{navhtml}
    </nav>
  </div>
</header>
<main class="wrap">
  <section class="panel">
    <div class="demo-head"><div><p class="eyebrow">{shape}</p><h1>{name}</h1><p class="lede">{lede}</p></div></div>
    <div class="stagewrap"><div class="di-theme" id="stage"></div></div>
    <p class="row" style="margin:10px 0 0;gap:10px">{flag}</p>
  </section>
  <section class="panel use stack" id="use"></section>
</main>
{scripthtml}
<script src="/v1/{familyfile}"></script>
<script src="/templates/demo.js"></script>
<script>
(function () {{
  DIDemo.usePanel(document.getElementById('use'), '{id}');
  var tl = new {glob}(document.getElementById('stage'), window.{data}, {opts});
  window.timeline = tl;
  
}})();
</script>
<script src="/dimau-pwa.js" data-sw="/sw.js" defer></script>
<script src="https://volau.dimau-fintech.com/dimau-consistency.js" defer></script>
</body>
</html>
