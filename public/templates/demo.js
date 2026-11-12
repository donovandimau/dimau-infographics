/* Shared helpers for template demo pages: the "Use it in an app" panel and tap/hover help. */
(function () {
  // phones: the nav is one sideways-scrolling row; bring the current page's link into view
  var nav = document.querySelector('.site-nav'), cur = nav && nav.querySelector('[aria-current="page"]');
  if (nav && cur && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = Math.max(0, cur.offsetLeft - (nav.clientWidth - cur.offsetWidth) / 2);
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  window.DIDemo = {
    usePanel: function (el, id) {
      return fetch('/catalog.json').then(function (r) { return r.json(); }).then(function (cat) {
        var t = cat.templates.find(function (x) { return x.id === id; });
        var host = location.origin;
        var code = '<div id="explore" style="min-height:480px"></div>\n<script src="' + host + '/v1/dimau-infographics.js"><\/script>\n<script>\n  DimauInfographics.mount("#explore", {\n    template: "' + id + '",\n    data: myData,\n    on: { ' + t.events[0] + ': function (e) { console.log(e); } }\n  });\n<\/script>';
        el.innerHTML =
          '<h2>Use it in an app</h2>' +
          '<p><b>Best for:</b> ' + esc(t.bestFor) + '</p>' +
          '<pre>' + esc(code) + '</pre>' +
          '<h3>Data shape</h3><pre>' + esc(t.dataShape) + '</pre>' +
          '<h3>Events</h3><p>' + t.events.map(function (e) { return '<code>' + esc(e) + '</code>'; }).join(' · ') + '</p>' +
          '<p>Direct file: <code>' + esc(host + cat.base + t.file) + '</code> (global <code>' + esc(t.global) + '</code>). Colours come from the shared <code>--di-*</code> tokens.</p>';
      });
    },
    tips: function () {
      // tap toggles the hover tip on touch screens
      document.querySelectorAll('.tip[data-tip]').forEach(function (b) {
        b.addEventListener('click', function () { b.classList.toggle('show'); });
        b.addEventListener('blur', function () { b.classList.remove('show'); });
      });
    }
  };
})();
