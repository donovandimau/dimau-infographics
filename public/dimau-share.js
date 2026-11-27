/* Dimau Share button loader. Loads the one shared copy (fixes there reach every app at once):
   https://volau.dimau-fintech.com/kit/dimau-share.js  (repo fijian-assistant-api, public/kit/)
   If that can't load (offline, outage, blocked), the built-in copy below runs instead, so the button never goes missing. */
(function () {
  if (window.__dimauShareLoader) return; window.__dimauShareLoader = 1;
  var me = document.currentScript, text = me && me.getAttribute('data-text'), done = false;
  function local() {
    if (done || window.__dimauShare) return; done = true;
    var fake = { dataset: { text: text || '' } };
    (function (document_currentScript) {
      /* Dimau share button v1: one Share button for every Dimau app.
         Opens the phone's share sheet (WhatsApp, Messenger, email...) where the device has one, otherwise copies the link.
         Usage: <script src="/dimau-share.js" defer></script>  Optional: data-text="short line" */
      (function () {
        if (window.__dimauShare) return; window.__dimauShare = 1;
        var me = document_currentScript;
        function go() {
          if (document.querySelector('[data-dimau-share]')) return;
          var b = document.createElement('button');
          b.type = 'button'; b.setAttribute('data-dimau-share', ''); b.setAttribute('aria-label', 'Share this app');
          b.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg><span class="dimau-share-label">Share</span>';
          var s = document.createElement('style');
          s.textContent = 'html body button[data-dimau-share][data-dimau-share]{position:fixed!important;left:16px!important;right:auto!important;top:auto!important;width:auto!important;margin:0!important;bottom:calc(16px + env(safe-area-inset-bottom));z-index:2147483000;display:inline-flex!important;align-items:center;gap:8px;min-height:48px!important;padding:0 18px!important;border-radius:999px!important;border:1px solid rgba(255,255,255,.75)!important;background:rgba(135,206,235,.72)!important;-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);color:#0B2E4A!important;font:600 15px/1 Manrope,Lexend,system-ui,sans-serif;box-shadow:0 6px 20px rgba(11,46,74,.18)!important;cursor:pointer}html body button[data-dimau-share][data-dimau-share]:hover{background:rgba(135,206,235,.9)!important}@media(max-width:767px){html body button[data-dimau-share][data-dimau-share]{bottom:calc(84px + env(safe-area-inset-bottom));min-width:48px;padding:0 14px!important}html body button[data-dimau-share][data-dimau-share] .dimau-share-label{display:none}html body button[data-dimau-share][data-dimau-share].is-copied .dimau-share-label{display:inline}}@media print{html body button[data-dimau-share][data-dimau-share]{display:none}}';
          // Constructed style sheets still apply on sites whose security policy blocks inline <style>.
          try { var sh = new CSSStyleSheet(); sh.replaceSync(s.textContent); document.adoptedStyleSheets = document.adoptedStyleSheets.concat([sh]); }
          catch (e) { document.head.appendChild(s); }
          var live = document.createElement('span'); live.setAttribute('aria-live', 'polite');
          live.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)';
          var label = b.querySelector('.dimau-share-label'), timer = 0;
          function copied() {
            clearTimeout(timer); label.textContent = 'Link copied'; b.classList.add('is-copied'); live.textContent = 'Link copied';
            timer = setTimeout(function () { label.textContent = 'Share'; b.classList.remove('is-copied'); live.textContent = ''; }, 1800);
          }
          function copy(url) {
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(copied, function () { prompt('Copy this link', url); });
            else prompt('Copy this link', url);
          }
          b.addEventListener('click', function () {
            var d = { title: document.title, text: (me && me.dataset.text) || (document.querySelector('meta[name="description"]') || {}).content || '', url: location.href };
            if (navigator.share) { navigator.share(d).catch(function (e) { if (!e || e.name !== 'AbortError') copy(d.url); }); return; }
            copy(d.url);
          });
          // Inline (element-attached) important styles beat any site rule, layered or not.
          [['position', 'fixed'], ['left', '16px'], ['border-radius', '999px'], ['background', 'rgba(135,206,235,.72)'],
           ['border', '1px solid rgba(255,255,255,.75)'], ['color', '#0B2E4A'], ['box-shadow', '0 6px 20px rgba(11,46,74,.18)'],
           ['min-height', '48px'], ['min-width', '48px'], ['z-index', '2147483000']].forEach(function (d) { b.style.setProperty(d[0], d[1], 'important'); });
          document.body.appendChild(b); document.body.appendChild(live);
          // Step clear of other floating bubbles (Pulse, chat, install toasts) that sit in the same corner.
          function deepAt(x, y) {
            var e = document.elementFromPoint(x, y);
            while (e && e.shadowRoot && e.shadowRoot.elementFromPoint) {
              var inner = e.shadowRoot.elementFromPoint(x, y);
              if (!inner || inner === e) break;
              e = inner;
            }
            return e;
          }
          function fixedHost(el) {
            while (el && el !== document.body && el !== document.documentElement) {
              var p = getComputedStyle(el).position; if (p === 'fixed' || p === 'sticky') return el;
              el = el.parentElement || (el.getRootNode && el.getRootNode().host) || null;
            }
            return null;
          }
          function place() {
            b.style.removeProperty('bottom');
            for (var i = 0; i < 4; i++) {
              var r = b.getBoundingClientRect(), hit = null;
              b.style.visibility = 'hidden';
              var pts = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 4, r.top + 4], [r.right - 4, r.bottom - 4]];
              for (var j = 0; j < pts.length && !hit; j++) hit = fixedHost(deepAt(pts[j][0], pts[j][1]));
              b.style.visibility = '';
              if (!hit) return;
              var h = hit.getBoundingClientRect();
              if (h.height > innerHeight * 0.5) return; // a full-height panel, not a bubble
              b.style.setProperty('bottom', Math.max(16, innerHeight - h.top + 8) + 'px', 'important');
            }
          }
          [300, 1500, 3000, 5000, 8000, 12000, 20000].forEach(function (t) { setTimeout(place, t); });
          addEventListener('resize', function () { clearTimeout(place.t); place.t = setTimeout(place, 200); });

        }
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
      })();
    })(fake);
  }
  var s = document.createElement('script');
  s.src = 'https://volau.dimau-fintech.com/kit/dimau-share.js';
  s.async = true;
  if (text) s.setAttribute('data-text', text);
  s.onload = function () { done = true; };
  s.onerror = local;
  setTimeout(function () { if (!window.__dimauShare) local(); }, 8000);
  (document.head || document.documentElement).appendChild(s);
})();
