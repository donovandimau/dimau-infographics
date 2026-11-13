/* React wrapper for every Dimau Infographics template.
 *
 *   import DimauInfographic from '<path>/v1/react/DimauInfographic.jsx';
 *   <DimauInfographic template="tidepool" data={data} persistKey="budget" onChange={e => …} style={{ minHeight: 420 }} />
 *
 * Event props are on + the event name: onOpen, onChange, onDrill, onStateChange, onTour …
 * Only the chosen template's code is loaded (each import below becomes its own chunk).
 * Keep `data` referentially stable (a module constant or useMemo): a new object rebuilds the template.
 */
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import '../dimau-infographics.css';

const LOADERS = {
  lanternfield: () => import('../lanternfield.js'),
  tidepool: () => import('../tidepool.js'),
  strata: () => import('../strata.js'),
  riverline: () => import('../riverline.js'),
  // the four timeline views share one file
  switchback: () => import('../timelines.js').then(m => ({ default: (m.default || m).Switchback })),
  swimlane: () => import('../timelines.js').then(m => ({ default: (m.default || m).Swimlane })),
  roadmap: () => import('../timelines.js').then(m => ({ default: (m.default || m).Roadmap })),
  waypath: () => import('../timelines.js').then(m => ({ default: (m.default || m).Waypath })),
  stagepath: () => import('../stagepath.js'),
  // the six story charts share one file
  rankrace: () => import('../charts.js').then(m => ({ default: (m.default || m).Rankrace })),
  peoplegrid: () => import('../charts.js').then(m => ({ default: (m.default || m).Peoplegrid })),
  guessline: () => import('../charts.js').then(m => ({ default: (m.default || m).Guessline })),
  flowbank: () => import('../charts.js').then(m => ({ default: (m.default || m).Flowbank })),
  ledger: () => import('../charts.js').then(m => ({ default: (m.default || m).Ledger })),
  storyscroll: () => import('../charts.js').then(m => ({ default: (m.default || m).Storyscroll })),
  // the six everyday formats share one file
  tilemap: () => import('../showcase.js').then(m => ({ default: (m.default || m).Tilemap })),
  mosaic: () => import('../showcase.js').then(m => ({ default: (m.default || m).Mosaic })),
  duel: () => import('../showcase.js').then(m => ({ default: (m.default || m).Duel })),
  almanac: () => import('../showcase.js').then(m => ({ default: (m.default || m).Almanac })),
  goalmeter: () => import('../showcase.js').then(m => ({ default: (m.default || m).Goalmeter })),
  dayclock: () => import('../showcase.js').then(m => ({ default: (m.default || m).Dayclock })),
  // the six compare-and-decide formats share one file
  dropoff: () => import('../compare.js').then(m => ({ default: (m.default || m).Dropoff })),
  quadrant: () => import('../compare.js').then(m => ({ default: (m.default || m).Quadrant })),
  slope: () => import('../compare.js').then(m => ({ default: (m.default || m).Slope })),
  pathfinder: () => import('../compare.js').then(m => ({ default: (m.default || m).Pathfinder })),
  radar: () => import('../compare.js').then(m => ({ default: (m.default || m).Radar })),
  pyramid: () => import('../compare.js').then(m => ({ default: (m.default || m).Pyramid })),
  // the six insight formats share one file
  factwall: () => import('../insight.js').then(m => ({ default: (m.default || m).Factwall })),
  swarm: () => import('../insight.js').then(m => ({ default: (m.default || m).Swarm })),
  scatter: () => import('../insight.js').then(m => ({ default: (m.default || m).Scatter })),
  heatgrid: () => import('../insight.js').then(m => ({ default: (m.default || m).Heatgrid })),
  bridge: () => import('../insight.js').then(m => ({ default: (m.default || m).Bridge })),
  overlap: () => import('../insight.js').then(m => ({ default: (m.default || m).Overlap })),
  // the six learning formats share one file
  flashdeck: () => import('../learn.js').then(m => ({ default: (m.default || m).Flashdeck })),
  quizline: () => import('../learn.js').then(m => ({ default: (m.default || m).Quizline })),
  hotspot: () => import('../learn.js').then(m => ({ default: (m.default || m).Hotspot })),
  checklist: () => import('../learn.js').then(m => ({ default: (m.default || m).Checklist })),
  scaleup: () => import('../learn.js').then(m => ({ default: (m.default || m).Scaleup })),
  sorter: () => import('../learn.js').then(m => ({ default: (m.default || m).Sorter })),
  // the six plan-and-ask formats share one file
  loanpath: () => import('../plan.js').then(m => ({ default: (m.default || m).Loanpath })),
  savegrow: () => import('../plan.js').then(m => ({ default: (m.default || m).Savegrow })),
  countdown: () => import('../plan.js').then(m => ({ default: (m.default || m).Countdown })),
  pollbar: () => import('../plan.js').then(m => ({ default: (m.default || m).Pollbar })),
  rankit: () => import('../plan.js').then(m => ({ default: (m.default || m).Rankit })),
  opinion: () => import('../plan.js').then(m => ({ default: (m.default || m).Opinion })),
  // the six tracking formats share one file
  dial: () => import('../track.js').then(m => ({ default: (m.default || m).Dial })),
  statusboard: () => import('../track.js').then(m => ({ default: (m.default || m).Statusboard })),
  sparkgrid: () => import('../track.js').then(m => ({ default: (m.default || m).Sparkgrid })),
  treeline: () => import('../track.js').then(m => ({ default: (m.default || m).Treeline })),
  monthview: () => import('../track.js').then(m => ({ default: (m.default || m).Monthview })),
  slotgrid: () => import('../track.js').then(m => ({ default: (m.default || m).Slotgrid })),
  // the six chartbook formats share one file
  stackbar: () => import('../chartbook.js').then(m => ({ default: (m.default || m).Stackbar })),
  featuregrid: () => import('../chartbook.js').then(m => ({ default: (m.default || m).Featuregrid })),
  ringflow: () => import('../chartbook.js').then(m => ({ default: (m.default || m).Ringflow })),
  bumpline: () => import('../chartbook.js').then(m => ({ default: (m.default || m).Bumpline })),
  spiral: () => import('../chartbook.js').then(m => ({ default: (m.default || m).Spiral })),
  streamgraph: () => import('../chartbook.js').then(m => ({ default: (m.default || m).Streamgraph })),
  // the six guide formats share one file
  weighscore: () => import('../guides.js').then(m => ({ default: (m.default || m).Weighscore })),
  routeline: () => import('../guides.js').then(m => ({ default: (m.default || m).Routeline })),
  levelup: () => import('../guides.js').then(m => ({ default: (m.default || m).Levelup })),
  orgchart: () => import('../guides.js').then(m => ({ default: (m.default || m).Orgchart })),
  numberline: () => import('../guides.js').then(m => ({ default: (m.default || m).Numberline })),
  glossary: () => import('../guides.js').then(m => ({ default: (m.default || m).Glossary })),
  // the six story formats share one file
  beforeafter: () => import('../stories.js').then(m => ({ default: (m.default || m).Beforeafter })),
  slidestory: () => import('../stories.js').then(m => ({ default: (m.default || m).Slidestory })),
  verdict: () => import('../stories.js').then(m => ({ default: (m.default || m).Verdict })),
  annotline: () => import('../stories.js').then(m => ({ default: (m.default || m).Annotline })),
  liveticker: () => import('../stories.js').then(m => ({ default: (m.default || m).Liveticker })),
  flowchart: () => import('../stories.js').then(m => ({ default: (m.default || m).Flowchart })),
  // the six place formats share one file
  daylight: () => import('../places.js').then(m => ({ default: (m.default || m).Daylight })),
  moonmonth: () => import('../places.js').then(m => ({ default: (m.default || m).Moonmonth })),
  windrose: () => import('../places.js').then(m => ({ default: (m.default || m).Windrose })),
  reachrings: () => import('../places.js').then(m => ({ default: (m.default || m).Reachrings })),
  profileline: () => import('../places.js').then(m => ({ default: (m.default || m).Profileline })),
  floorplan: () => import('../places.js').then(m => ({ default: (m.default || m).Floorplan })),
  // the six stats formats share one file
  histobins: () => import('../stats.js').then(m => ({ default: (m.default || m).Histobins })),
  boxplot: () => import('../stats.js').then(m => ({ default: (m.default || m).Boxplot })),
  dumbbell: () => import('../stats.js').then(m => ({ default: (m.default || m).Dumbbell })),
  bulletbar: () => import('../stats.js').then(m => ({ default: (m.default || m).Bulletbar })),
  ridgeline: () => import('../stats.js').then(m => ({ default: (m.default || m).Ridgeline })),
  marimekko: () => import('../stats.js').then(m => ({ default: (m.default || m).Marimekko })),
  // the six structure formats share one file
  sunburst: () => import('../structure.js').then(m => ({ default: (m.default || m).Sunburst })),
  circlepack: () => import('../structure.js').then(m => ({ default: (m.default || m).Circlepack })),
  icicle: () => import('../structure.js').then(m => ({ default: (m.default || m).Icicle })),
  arcflow: () => import('../structure.js').then(m => ({ default: (m.default || m).Arcflow })),
  linkmatrix: () => import('../structure.js').then(m => ({ default: (m.default || m).Linkmatrix })),
  lifespans: () => import('../structure.js').then(m => ({ default: (m.default || m).Lifespans })),
  // the six analyse formats share one file
  bubbletrail: () => import('../analyse.js').then(m => ({ default: (m.default || m).Bubbletrail })),
  fanchart: () => import('../analyse.js').then(m => ({ default: (m.default || m).Fanchart })),
  rangebars: () => import('../analyse.js').then(m => ({ default: (m.default || m).Rangebars })),
  pareto: () => import('../analyse.js').then(m => ({ default: (m.default || m).Pareto })),
  parallelaxes: () => import('../analyse.js').then(m => ({ default: (m.default || m).Parallelaxes })),
  radialbars: () => import('../analyse.js').then(m => ({ default: (m.default || m).Radialbars })),
  // the six words formats share one file
  wordbars: () => import('../words.js').then(m => ({ default: (m.default || m).Wordbars })),
  tagcloud: () => import('../words.js').then(m => ({ default: (m.default || m).Tagcloud })),
  wordtree: () => import('../words.js').then(m => ({ default: (m.default || m).Wordtree })),
  textdiff: () => import('../words.js').then(m => ({ default: (m.default || m).Textdiff })),
  readscore: () => import('../words.js').then(m => ({ default: (m.default || m).Readscore })),
  keyline: () => import('../words.js').then(m => ({ default: (m.default || m).Keyline })),
  // the six tools formats share one file
  worldclock: () => import('../tools.js').then(m => ({ default: (m.default || m).Worldclock })),
  lifegrid: () => import('../tools.js').then(m => ({ default: (m.default || m).Lifegrid })),
  settleup: () => import('../tools.js').then(m => ({ default: (m.default || m).Settleup })),
  unitprice: () => import('../tools.js').then(m => ({ default: (m.default || m).Unitprice })),
  seatarc: () => import('../tools.js').then(m => ({ default: (m.default || m).Seatarc })),
  leaderboard: () => import('../tools.js').then(m => ({ default: (m.default || m).Leaderboard })),
  // the six metrics formats share one file
  cohortgrid: () => import('../metrics.js').then(m => ({ default: (m.default || m).Cohortgrid })),
  burndown: () => import('../metrics.js').then(m => ({ default: (m.default || m).Burndown })),
  controlchart: () => import('../metrics.js').then(m => ({ default: (m.default || m).Controlchart })),
  cumflow: () => import('../metrics.js').then(m => ({ default: (m.default || m).Cumflow })),
  kpitiles: () => import('../metrics.js').then(m => ({ default: (m.default || m).Kpitiles })),
  abtest: () => import('../metrics.js').then(m => ({ default: (m.default || m).Abtest })),
  // the six basic charts share one file
  donut: () => import('../basics.js').then(m => ({ default: (m.default || m).Donut })),
  barchart: () => import('../basics.js').then(m => ({ default: (m.default || m).Barchart })),
  linechart: () => import('../basics.js').then(m => ({ default: (m.default || m).Linechart })),
  areachart: () => import('../basics.js').then(m => ({ default: (m.default || m).Areachart })),
  combochart: () => import('../basics.js').then(m => ({ default: (m.default || m).Combochart })),
  waffle: () => import('../basics.js').then(m => ({ default: (m.default || m).Waffle })),
  // the six practice formats share one file
  matchup: () => import('../practice.js').then(m => ({ default: (m.default || m).Matchup })),
  sequence: () => import('../practice.js').then(m => ({ default: (m.default || m).Sequence })),
  fillgap: () => import('../practice.js').then(m => ({ default: (m.default || m).Fillgap })),
  estimator: () => import('../practice.js').then(m => ({ default: (m.default || m).Estimator })),
  masterygrid: () => import('../practice.js').then(m => ({ default: (m.default || m).Masterygrid })),
  leitner: () => import('../practice.js').then(m => ({ default: (m.default || m).Leitner })),
  // the six money tools share one file
  paysplit: () => import('../money.js').then(m => ({ default: (m.default || m).Paysplit })),
  budgetplan: () => import('../money.js').then(m => ({ default: (m.default || m).Budgetplan })),
  debtplan: () => import('../money.js').then(m => ({ default: (m.default || m).Debtplan })),
  sendmoney: () => import('../money.js').then(m => ({ default: (m.default || m).Sendmoney })),
  cashcalendar: () => import('../money.js').then(m => ({ default: (m.default || m).Cashcalendar })),
  pricerise: () => import('../money.js').then(m => ({ default: (m.default || m).Pricerise })),
  // the six weather templates share one file
  tidecurve: () => import('../weather.js').then(m => ({ default: (m.default || m).Tidecurve })),
  warmstripes: () => import('../weather.js').then(m => ({ default: (m.default || m).Warmstripes })),
  stormtrack: () => import('../weather.js').then(m => ({ default: (m.default || m).Stormtrack })),
  uvday: () => import('../weather.js').then(m => ({ default: (m.default || m).Uvday })),
  feelslike: () => import('../weather.js').then(m => ({ default: (m.default || m).Feelslike })),
  forecastrow: () => import('../weather.js').then(m => ({ default: (m.default || m).Forecastrow })),
  // the four signal cards share one file
  'rbf-sandbox-settlement-flow': () => import('../signal-cards.js').then(m => ({ default: (m.default || m).SettlementFlow })),
  'sota-kece-community-pulse': () => import('../signal-cards.js').then(m => ({ default: (m.default || m).CommunityPulse })),
  'pacific-backhaul-node-map': () => import('../signal-cards.js').then(m => ({ default: (m.default || m).BackhaulMap })),
  'debt-freedom-trajectory': () => import('../signal-cards.js').then(m => ({ default: (m.default || m).DebtTrajectory })),
  'archive-desk': () => import('../archive-desk.js').then(m => ({ default: (m.default || m).ArchiveDesk }))
};

const read = key => { try { return JSON.parse(localStorage.getItem('dimau-infographics:' + key) || 'null'); } catch (_) { return null; } };
const write = (key, v) => { try { v == null ? localStorage.removeItem('dimau-infographics:' + key) : localStorage.setItem('dimau-infographics:' + key, JSON.stringify(v)); } catch (_) {} };

const DimauInfographic = forwardRef(function DimauInfographic(
  { template, data, options, persistKey, className, style, ...rest },
  ref
) {
  const host = useRef(null);
  const inst = useRef(null);
  const handlers = useRef(rest);
  handlers.current = rest;

  useEffect(() => {
    let cancelled = false, saveT;
    const load = LOADERS[template];
    if (!load) { console.error('DimauInfographic: unknown template "' + template + '"'); return undefined; }
    load().then(m => {
      if (cancelled || !host.current) return;
      const Ctor = m.default || m;
      const lf = new Ctor(host.current, data, options);
      inst.current = lf;
      // forward every event to the matching on<Event> prop, read fresh on each call
      const events = ['open', 'focus', 'progress', 'pins', 'lens', 'tour', 'statechange', 'reset', 'change', 'lock', 'drill', 'select', 'range', 'render', 'filter', 'step', 'frame', 'view', 'reveal', 'sort', 'zoom', 'day', 'move', 'answer', 'result', 'back', 'mode', 'layout', 'flip', 'mark', 'done', 'finish', 'complete', 'place', 'check', 'vote', 'toggle', 'search', 'month', 'pick', 'book', 'focus', 'levelup', 'slide', 'guess', 'note', 'within', 'bins', 'year', 'period', 'share', 'phrase', 'time', 'home', 'need', 'group', 'round', 'view', 'match', 'guess', 'per', 'extra', 'amount', 'date'];
      events.forEach(type => lf.on(type, payload => {
        const key = Object.keys(handlers.current).find(k => k.toLowerCase() === 'on' + type);
        if (key && typeof handlers.current[key] === 'function') handlers.current[key](payload);
      }));
      if (persistKey && lf.getState && lf.setState) {
        const saved = read(persistKey);
        if (saved) lf.setState(saved);
        const save = () => { clearTimeout(saveT); saveT = setTimeout(() => write(persistKey, lf.getState()), 400); };
        ['statechange', 'change', 'lock', 'drill'].forEach(t => lf.on(t, save));
        lf.on('reset', () => write(persistKey, null));
      }
    });
    return () => {
      cancelled = true; clearTimeout(saveT);
      if (inst.current) { inst.current.destroy(); inst.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template, data]);

  useImperativeHandle(ref, () => ({
    /** The live template instance (Lanternfield, Tidepool, Strata or Riverline), or null while loading. */
    get instance() { return inst.current; }
  }), []);

  return <div ref={host} className={'di-theme' + (className ? ' ' + className : '')} style={{ position: 'relative', ...style }} />;
});

export default DimauInfographic;
