/* EXAMPLE days, made up to show the template. */
window.DAYCLOCK_DATA = {
  activities: [
    { id: 'sleep', label: 'Sleep' }, { id: 'family', label: 'Family time' }, { id: 'travel', label: 'Travel' },
    { id: 'school', label: 'School' }, { id: 'market', label: 'Market' }, { id: 'study', label: 'Homework' },
    { id: 'chores', label: 'Chores' }, { id: 'church', label: 'Church' }
  ],
  days: [
    { id: 'school', label: 'A school day', blocks: [
      { activity: 'sleep', from: '21:30', to: '05:45' }, { activity: 'chores', from: '05:45', to: '06:45' },
      { activity: 'travel', from: '06:45', to: '07:30', note: 'Bus into town.' }, { activity: 'school', from: '07:30', to: '15:00' },
      { activity: 'travel', from: '15:00', to: '15:45' }, { activity: 'chores', from: '15:45', to: '17:00' },
      { activity: 'study', from: '17:00', to: '18:30' }, { activity: 'family', from: '18:30', to: '21:30', note: 'Dinner and evening devotion.' } ] },
    { id: 'market', label: 'A market day', blocks: [
      { activity: 'sleep', from: '21:00', to: '04:00' }, { activity: 'chores', from: '04:00', to: '05:00', note: 'Loading produce.' },
      { activity: 'travel', from: '05:00', to: '06:00' }, { activity: 'market', from: '06:00', to: '14:00' },
      { activity: 'travel', from: '14:00', to: '15:00' }, { activity: 'chores', from: '15:00', to: '17:30' },
      { activity: 'family', from: '17:30', to: '21:00' } ] },
    { id: 'sunday', label: 'A Sunday', blocks: [
      { activity: 'sleep', from: '22:00', to: '06:30' }, { activity: 'family', from: '06:30', to: '09:30' },
      { activity: 'church', from: '09:30', to: '12:30' }, { activity: 'family', from: '12:30', to: '18:00', note: 'Lunch with the extended family.' },
      { activity: 'church', from: '18:00', to: '19:30' }, { activity: 'family', from: '19:30', to: '22:00' } ] }
  ]
};
