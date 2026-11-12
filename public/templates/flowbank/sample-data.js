/* EXAMPLE figures, made up to show the template: where a fortnight's pay goes (FJD). Same example budget as Tidepool. */
window.FLOWBANK_DATA = {
  prefix: 'FJD ',
  nodes: [
    { id: 'pay', label: 'Fortnight’s pay' },
    { id: 'fixed', label: 'Fixed costs' }, { id: 'living', label: 'Living' }, { id: 'family', label: 'Family & church' }, { id: 'save', label: 'Savings' },
    { id: 'rent', label: 'Rent' }, { id: 'power', label: 'Power & water' }, { id: 'phone', label: 'Phone & data' },
    { id: 'food', label: 'Food' }, { id: 'transport', label: 'Transport' }
  ],
  links: [
    { source: 'pay', target: 'fixed', value: 540 }, { source: 'pay', target: 'living', value: 390 },
    { source: 'pay', target: 'family', value: 120 }, { source: 'pay', target: 'save', value: 60 },
    { source: 'fixed', target: 'rent', value: 420 }, { source: 'fixed', target: 'power', value: 80 }, { source: 'fixed', target: 'phone', value: 40 },
    { source: 'living', target: 'food', value: 300 }, { source: 'living', target: 'transport', value: 90 }
  ]
};
