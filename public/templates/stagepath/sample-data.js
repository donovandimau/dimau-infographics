/* Real data: Vanua OS lease desk steps (lease-desk-core.js STAGES), 12 Nov 2026. Usual days are working targets for chasing, not legal deadlines. */
window.STAGEPATH_DATA = {
  kicker: 'Vanua OS lease desk',
  title: 'The lease journey',
  sub: 'Every step of a lease on iTaukei land: who holds it, and how long it usually takes before the desk chases.',
  unit: 'days',
  totalLabel: 'usual days from members’ consent to a registered lease',
  foot: 'Usual days are working targets for chasing, not legal deadlines. TLTB remains the legal trustee.',
  stages: [
    { id: 'consent', label: 'Members’ consent', holders: ['Landowners'], amount: 30, text: 'Members on the roll say yes or no. Moves on by itself once the threshold is reached.' },
    { id: 'application', label: 'Application with TLTB', holders: ['TLTB'], amount: 14, text: 'Lease application lodged with TLTB with the consent record attached.' },
    { id: 'survey', label: 'Survey', holders: ['Surveyor'], amount: 60, text: 'Registered surveyor marks the boundaries and lodges the plan.' },
    { id: 'offer', label: 'Valuation and lease offer', holders: ['TLTB'], amount: 42, text: 'TLTB values the land and issues the lease offer.' },
    { id: 'premium', label: 'Premium payment', holders: ['Your company'], amount: 30, text: 'Premium and first rent paid to TLTB.' },
    { id: 'registration', label: 'Lease registration', holders: ['TLTB', 'Registrar of Titles'], amount: 30, text: 'Lease signed and registered.' },
    { id: 'active', label: 'Lease running', holders: ['Your company'], amount: null, amountLabel: 'No limit', kind: 'goal', tag: 'The lease is live', text: 'Tenants in, rent coming in, payouts to members.' },
    { id: 'renewal', label: 'Renewal', holders: ['Your company', 'TLTB'], amount: 180, kind: 'after', tag: 'Before it runs out', text: 'Renewal under way before the lease runs out.' }
  ]
};
