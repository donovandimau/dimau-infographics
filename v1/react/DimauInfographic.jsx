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
      const events = ['open', 'focus', 'progress', 'pins', 'lens', 'tour', 'statechange', 'reset', 'change', 'lock', 'drill', 'select', 'range', 'render', 'filter', 'step', 'frame', 'view', 'reveal', 'sort', 'zoom', 'day', 'move', 'answer', 'result', 'back', 'mode'];
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
