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
    stagepath: { file: 'stagepath.js', global: 'Stagepath' },
    rankrace: { file: 'charts.js', global: 'Rankrace' },
    peoplegrid: { file: 'charts.js', global: 'Peoplegrid' },
    guessline: { file: 'charts.js', global: 'Guessline' },
    flowbank: { file: 'charts.js', global: 'Flowbank' },
    ledger: { file: 'charts.js', global: 'Ledger' },
    storyscroll: { file: 'charts.js', global: 'Storyscroll' },
    tilemap: { file: 'showcase.js', global: 'Tilemap' },
    mosaic: { file: 'showcase.js', global: 'Mosaic' },
    duel: { file: 'showcase.js', global: 'Duel' },
    almanac: { file: 'showcase.js', global: 'Almanac' },
    goalmeter: { file: 'showcase.js', global: 'Goalmeter' },
    dayclock: { file: 'showcase.js', global: 'Dayclock' },
    dropoff: { file: 'compare.js', global: 'Dropoff' },
    quadrant: { file: 'compare.js', global: 'Quadrant' },
    slope: { file: 'compare.js', global: 'Slope' },
    pathfinder: { file: 'compare.js', global: 'Pathfinder' },
    radar: { file: 'compare.js', global: 'Radar' },
    pyramid: { file: 'compare.js', global: 'Pyramid' },
    factwall: { file: 'insight.js', global: 'Factwall' },
    swarm: { file: 'insight.js', global: 'Swarm' },
    scatter: { file: 'insight.js', global: 'Scatter' },
    heatgrid: { file: 'insight.js', global: 'Heatgrid' },
    bridge: { file: 'insight.js', global: 'Bridge' },
    overlap: { file: 'insight.js', global: 'Overlap' },
    flashdeck: { file: 'learn.js', global: 'Flashdeck' },
    quizline: { file: 'learn.js', global: 'Quizline' },
    hotspot: { file: 'learn.js', global: 'Hotspot' },
    checklist: { file: 'learn.js', global: 'Checklist' },
    scaleup: { file: 'learn.js', global: 'Scaleup' },
    sorter: { file: 'learn.js', global: 'Sorter' },
    loanpath: { file: 'plan.js', global: 'Loanpath' },
    savegrow: { file: 'plan.js', global: 'Savegrow' },
    countdown: { file: 'plan.js', global: 'Countdown' },
    pollbar: { file: 'plan.js', global: 'Pollbar' },
    rankit: { file: 'plan.js', global: 'Rankit' },
    opinion: { file: 'plan.js', global: 'Opinion' },
    dial: { file: 'track.js', global: 'Dial' },
    statusboard: { file: 'track.js', global: 'Statusboard' },
    sparkgrid: { file: 'track.js', global: 'Sparkgrid' },
    treeline: { file: 'track.js', global: 'Treeline' },
    monthview: { file: 'track.js', global: 'Monthview' },
    slotgrid: { file: 'track.js', global: 'Slotgrid' },
    stackbar: { file: 'chartbook.js', global: 'Stackbar' },
    featuregrid: { file: 'chartbook.js', global: 'Featuregrid' },
    ringflow: { file: 'chartbook.js', global: 'Ringflow' },
    bumpline: { file: 'chartbook.js', global: 'Bumpline' },
    spiral: { file: 'chartbook.js', global: 'Spiral' },
    streamgraph: { file: 'chartbook.js', global: 'Streamgraph' },
    weighscore: { file: 'guides.js', global: 'Weighscore' },
    routeline: { file: 'guides.js', global: 'Routeline' },
    levelup: { file: 'guides.js', global: 'Levelup' },
    orgchart: { file: 'guides.js', global: 'Orgchart' },
    numberline: { file: 'guides.js', global: 'Numberline' },
    glossary: { file: 'guides.js', global: 'Glossary' },
    beforeafter: { file: 'stories.js', global: 'Beforeafter' },
    slidestory: { file: 'stories.js', global: 'Slidestory' },
    verdict: { file: 'stories.js', global: 'Verdict' },
    annotline: { file: 'stories.js', global: 'Annotline' },
    liveticker: { file: 'stories.js', global: 'Liveticker' },
    flowchart: { file: 'stories.js', global: 'Flowchart' },
    daylight: { file: 'places.js', global: 'Daylight' },
    moonmonth: { file: 'places.js', global: 'Moonmonth' },
    windrose: { file: 'places.js', global: 'Windrose' },
    reachrings: { file: 'places.js', global: 'Reachrings' },
    profileline: { file: 'places.js', global: 'Profileline' },
    floorplan: { file: 'places.js', global: 'Floorplan' },
    histobins: { file: 'stats.js', global: 'Histobins' },
    boxplot: { file: 'stats.js', global: 'Boxplot' },
    dumbbell: { file: 'stats.js', global: 'Dumbbell' },
    bulletbar: { file: 'stats.js', global: 'Bulletbar' },
    ridgeline: { file: 'stats.js', global: 'Ridgeline' },
    marimekko: { file: 'stats.js', global: 'Marimekko' },
    sunburst: { file: 'structure.js', global: 'Sunburst' },
    circlepack: { file: 'structure.js', global: 'Circlepack' },
    icicle: { file: 'structure.js', global: 'Icicle' },
    arcflow: { file: 'structure.js', global: 'Arcflow' },
    linkmatrix: { file: 'structure.js', global: 'Linkmatrix' },
    lifespans: { file: 'structure.js', global: 'Lifespans' },
    bubbletrail: { file: 'analyse.js', global: 'Bubbletrail' },
    fanchart: { file: 'analyse.js', global: 'Fanchart' },
    rangebars: { file: 'analyse.js', global: 'Rangebars' },
    pareto: { file: 'analyse.js', global: 'Pareto' },
    parallelaxes: { file: 'analyse.js', global: 'Parallelaxes' },
    radialbars: { file: 'analyse.js', global: 'Radialbars' },
    wordbars: { file: 'words.js', global: 'Wordbars' },
    tagcloud: { file: 'words.js', global: 'Tagcloud' },
    wordtree: { file: 'words.js', global: 'Wordtree' },
    textdiff: { file: 'words.js', global: 'Textdiff' },
    readscore: { file: 'words.js', global: 'Readscore' },
    keyline: { file: 'words.js', global: 'Keyline' },
    worldclock: { file: 'tools.js', global: 'Worldclock' },
    lifegrid: { file: 'tools.js', global: 'Lifegrid' },
    settleup: { file: 'tools.js', global: 'Settleup' },
    unitprice: { file: 'tools.js', global: 'Unitprice' },
    seatarc: { file: 'tools.js', global: 'Seatarc' },
    leaderboard: { file: 'tools.js', global: 'Leaderboard' },
    cohortgrid: { file: 'metrics.js', global: 'Cohortgrid' },
    burndown: { file: 'metrics.js', global: 'Burndown' },
    controlchart: { file: 'metrics.js', global: 'Controlchart' },
    cumflow: { file: 'metrics.js', global: 'Cumflow' },
    kpitiles: { file: 'metrics.js', global: 'Kpitiles' },
    abtest: { file: 'metrics.js', global: 'Abtest' },
    donut: { file: 'basics.js', global: 'Donut' },
    barchart: { file: 'basics.js', global: 'Barchart' },
    linechart: { file: 'basics.js', global: 'Linechart' },
    areachart: { file: 'basics.js', global: 'Areachart' },
    combochart: { file: 'basics.js', global: 'Combochart' },
    waffle: { file: 'basics.js', global: 'Waffle' },
    matchup: { file: 'practice.js', global: 'Matchup' },
    sequence: { file: 'practice.js', global: 'Sequence' },
    fillgap: { file: 'practice.js', global: 'Fillgap' },
    estimator: { file: 'practice.js', global: 'Estimator' },
    masterygrid: { file: 'practice.js', global: 'Masterygrid' },
    leitner: { file: 'practice.js', global: 'Leitner' },
    paysplit: { file: 'money.js', global: 'Paysplit' },
    budgetplan: { file: 'money.js', global: 'Budgetplan' },
    debtplan: { file: 'money.js', global: 'Debtplan' },
    sendmoney: { file: 'money.js', global: 'Sendmoney' },
    cashcalendar: { file: 'money.js', global: 'Cashcalendar' },
    pricerise: { file: 'money.js', global: 'Pricerise' },
    tidecurve: { file: 'weather.js', global: 'Tidecurve' },
    warmstripes: { file: 'weather.js', global: 'Warmstripes' },
    stormtrack: { file: 'weather.js', global: 'Stormtrack' },
    uvday: { file: 'weather.js', global: 'Uvday' },
    feelslike: { file: 'weather.js', global: 'Feelslike' },
    forecastrow: { file: 'weather.js', global: 'Forecastrow' },
    scoreworm: { file: 'sport.js', global: 'Scoreworm' },
    pitchmap: { file: 'sport.js', global: 'Pitchmap' },
    splitpace: { file: 'sport.js', global: 'Splitpace' },
    bracket: { file: 'sport.js', global: 'Bracket' },
    teamsheet: { file: 'sport.js', global: 'Teamsheet' },
    medaltable: { file: 'sport.js', global: 'Medaltable' },
    recipescale: { file: 'food.js', global: 'Recipescale' },
    seasonwheel: { file: 'food.js', global: 'Seasonwheel' },
    platesplit: { file: 'food.js', global: 'Platesplit' },
    labelcard: { file: 'food.js', global: 'Labelcard' },
    harvestplan: { file: 'food.js', global: 'Harvestplan' },
    servetime: { file: 'food.js', global: 'Servetime' },
    'rbf-sandbox-settlement-flow': { file: 'signal-cards.js', global: 'SettlementFlow' },
    'sota-kece-community-pulse': { file: 'signal-cards.js', global: 'CommunityPulse' },
    'pacific-backhaul-node-map': { file: 'signal-cards.js', global: 'BackhaulMap' },
    'debt-freedom-trajectory': { file: 'signal-cards.js', global: 'DebtTrajectory' },
    'archive-desk': { file: 'archive-desk.js', global: 'ArchiveDesk' }
  };
  var VERSION = '1.26.0';
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
