/* EXAMPLE figures, not real household data: a fortnightly budget used to demonstrate the template. */
window.TIDEPOOL_DATA = {
  title: 'A fortnight’s pay',
  unit: 'FJD',
  period: 'per fortnight',
  conserve: true,
  step: 5,
  example: true,
  items: [
    { id: 'rent', label: 'Rent', value: 420, locked: true, note: 'Fixed by the lease. Locked so other changes leave it alone.' },
    { id: 'food', label: 'Food', value: 300, min: 150, note: 'Groceries and market shopping. Kept above FJD 150.' },
    { id: 'transport', label: 'Transport', value: 90, note: 'Bus fares and the occasional taxi.' },
    { id: 'family', label: 'Family & church', value: 120, note: 'Obligations and contributions.' },
    { id: 'power', label: 'Power & water', value: 80, min: 40, note: 'Utility bills, averaged per fortnight.' },
    { id: 'phone', label: 'Phone & data', value: 40, note: 'Top-ups and data bundles.' },
    { id: 'savings', label: 'Savings', value: 60, note: 'Drag this up to see where the money comes from.' }
  ]
};
