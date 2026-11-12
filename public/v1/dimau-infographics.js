/*! Dimau Infographics loader 1.0
 *  One script for every app. Pick a template by name; only that template's code is downloaded.
 *
 *  <script src="https://dimau-infographics.vercel.app/v1/dimau-infographics.js"></script>
 *  DimauInfographics.mount('#where', { template: 'tidepool', data, options, on: { change: e => … } })
 *    .then(instance => …);
 *
 *  The template list below must match catalog.json (tests/smoke.cjs checks this).
 */
(function (root) {
  'use strict';
  var TEMPLATES = {
    lanternfield: { file: 'lanternfield.js', global: 'Lanternfield' },
    tidepool: { file: 'tidepool.js', global: 'Tidepool' },
    strata: { file: 'strata.js', global: 'Strata' },
    riverline: { file: 'riverline.js', global: 'Riverline' },
    switchback: { file: 'timelines.js', global: 'Switchback' },
    swimlane: { file: 'timelines.js', global: 'Swimlane' },
    roadmap: { file: 'timelines.js', global: 'Roadmap' },
    waypath: { file: 'timelines.js', global: 'Waypath' },
    'rbf-sandbox-settlement-flow': { file: 'signal-cards.js', global: 'SettlementFlow' },
    'sota-kece-community-pulse': { file: 'signal-cards.js', global: 'CommunityPulse' },
    'pacific-backhaul-node-map': { file: 'signal-cards.js', global: 'BackhaulMap' },
    'debt-freedom-trajectory': { file: 'signal-cards.js', global: 'DebtTrajectory' },
    'archive-desk': { file: 'archive-desk.js', global: 'ArchiveDesk' }
  };
  var VERSION = '1.2.0';
  var me = document.currentScript && document.currentScript.src;
  var base = me ? me.replace(/[^/]*(\?.*)?$/, '') : '/v1/';
  var loading = {};

  function addTheme() {
    if (document.getElementById('di-theme-css')) return;
    var l = document.createElement('link');
    l.id = 'di-theme-css'; l.rel = 'stylesheet'; l.href = base + 'dimau-infographics.css';
    var first = document.head.querySelector('link[rel="stylesheet"], style');
    document.head.insertBefore(l, first || null); // app styles that follow can override the defaults
  }

  function load(id) {
    var t = TEMPLATES[id];
    if (!t) return Promise.reject(new Error('Dimau Infographics: no template called "' + id + '". Available: ' + Object.keys(TEMPLATES).join(', ')));
    if (root[t.global]) return Promise.resolve(root[t.global]);
    // several templates can share one file: download each file once
    if (loading[t.file]) return loading[t.file].then(function () { return root[t.global] || Promise.reject(new Error('Dimau Infographics: ' + t.file + ' did not define ' + t.global)); });
    loading[t.file] = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = base + t.file; s.async = true; s.crossOrigin = 'anonymous';
      s.onload = function () { root[t.global] ? resolve(root[t.global]) : reject(new Error('Dimau Infographics: ' + t.file + ' loaded but did not define ' + t.global)); };
      s.onerror = function () { delete loading[t.file]; reject(new Error('Dimau Infographics: could not download ' + s.src)); };
      document.head.appendChild(s);
    });
    return loading[t.file];
  }

  function mount(target, cfg) {
    cfg = cfg || {};
    var el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return Promise.reject(new Error('Dimau Infographics: mount target not found: ' + target));
    if (!cfg.data) return Promise.reject(new Error('Dimau Infographics: mount needs data'));
    if (cfg.theme !== false) { addTheme(); el.classList.add('di-theme'); }
    return load(cfg.template).then(function (Ctor) {
      var inst = new Ctor(el, cfg.data, cfg.options);
      if (cfg.on) Object.keys(cfg.on).forEach(function (k) { inst.on(k, cfg.on[k]); });
      el.setAttribute('data-di-template', cfg.template);
      return inst;
    });
  }

  root.DimauInfographics = { version: VERSION, base: base, templates: Object.keys(TEMPLATES), load: load, mount: mount, addTheme: addTheme };
})(typeof self !== 'undefined' ? self : this);
