/* Demo page logic shared by every signal card: live value editor, theme and shape switches, image export. */
(function () {
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  window.DICardDemo = function (opts) {
    var $ = function (id) { return document.getElementById(id); };
    var Ctor = window[opts.global];
    var card = new Ctor($('stage'), {}, { theme: 'dark' });
    window.card = card;

    // value editor, one field per variable, filled with the defaults
    $('fields').innerHTML = Ctor.variables.map(function (v) {
      return '<label class="field" for="v-' + esc(v.name) + '"><span>' + esc(v.description || v.name) + '<code>' + esc(v.name) + '</code></span>' +
        '<input id="v-' + esc(v.name) + '" name="' + esc(v.name) + '" value="' + esc(v.default) + '" placeholder="' + esc(v.default || 'optional') + '" autocomplete="off"></label>';
    }).join('');
    var timer;
    $('fields').addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        var vals = {};
        Ctor.variables.forEach(function (v) { vals[v.name] = $('v-' + v.name).value; });
        card.set(vals);
        snippet();
      }, 120);
    });
    $('reset').onclick = function () {
      Ctor.variables.forEach(function (v) { $('v-' + v.name).value = v.default; });
      var vals = {}; Ctor.variables.forEach(function (v) { vals[v.name] = v.default; });
      card.set(vals); snippet();
    };

    function seg(groupId, fn) {
      var btns = document.querySelectorAll('#' + groupId + ' button');
      btns.forEach(function (b) {
        b.onclick = function () {
          btns.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
          fn(b.dataset.v);
          snippet();
        };
      });
    }
    seg('theme', function (v) { card.setTheme(v); document.querySelector('.cardwrap').dataset.theme = v; });
    seg('variant', function (v) { card.setVariant(v); });

    var note = function (t) { $('note').textContent = t; clearTimeout(note.t); note.t = setTimeout(function () { $('note').textContent = ''; }, 2600); };
    $('png').onclick = function () { card.download('png').then(function () { note('PNG downloaded'); }, function (e) { note(e.message); }); };
    $('svg').onclick = function () { card.download('svg'); note('SVG downloaded'); };
    card.on('select', function (e) { $('out').textContent = e.detail; });

    function snippet() {
      var vals = {}, changed = 0;
      Ctor.variables.forEach(function (v) { var x = $('v-' + v.name).value; if (x !== v.default && x !== '') { vals[v.name] = x; changed++; } });
      var data = changed ? JSON.stringify(vals, null, 2).replace(/\n/g, '\n    ') : '{}';
      var theme = document.querySelector('#theme [aria-pressed="true"]').dataset.v, variant = document.querySelector('#variant [aria-pressed="true"]').dataset.v;
      $('code').textContent = '<div id="card"></div>\n<script src="' + location.origin + '/v1/dimau-infographics.js"><\/script>\n<script>\n  DimauInfographics.mount("#card", {\n    template: "' + opts.id + '",\n    data: ' + data + ',\n    options: { theme: "' + theme + '", variant: "' + variant + '" },\n    theme: false\n  });\n<\/script>';
    }
    snippet();
    $('copy').onclick = function () {
      var t = $('code').textContent;
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { note('Embed code copied'); }, function () { note('Select the code below to copy it'); });
      else note('Select the code below to copy it');
    };
  };
})();
