/* EXAMPLE plan, not a real schedule: the steps for adding a Dimau Infographics template to an app. */
window.ROADMAP_DATA = {
  title: 'Adding a template to an app',
  categories: [
    { id: 'prepare', label: 'Prepare' },
    { id: 'build', label: 'Build' },
    { id: 'launch', label: 'Launch' }
  ],
  events: [
    { id: 'pick', category: 'prepare', title: 'Pick the template', start: '2026-11-16', end: '2026-11-18', progress: 1 },
    { id: 'data', category: 'prepare', title: 'Shape the app’s data', start: '2026-11-19', end: '2026-11-27', progress: 0.6, depends: ['pick'] },
    { id: 'theme', category: 'build', title: 'Colours and wording', start: '2026-11-25', end: '2026-12-03', progress: 0.2, depends: ['pick'] },
    { id: 'mount', category: 'build', title: 'Mount it in the app', start: '2026-11-30', end: '2026-12-08', depends: ['data'] },
    { id: 'checks', category: 'build', title: 'Phone and desktop checks', start: '2026-12-09', end: '2026-12-14', depends: ['mount', 'theme'], status: 'risk' },
    { id: 'review', category: 'launch', title: 'Owner review', start: '2026-12-15', milestone: true, depends: ['checks'] },
    { id: 'live', category: 'launch', title: 'Go live', start: '2026-12-17', milestone: true, depends: ['review'] },
    { id: 'catalog', category: 'launch', title: 'Record it in catalog.json', start: '2026-12-17', end: '2026-12-18', depends: ['live'] }
  ]
};
