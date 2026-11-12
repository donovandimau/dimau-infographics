/* The real steps an app follows to adopt a Dimau Infographics template (no dates: a process). */
window.WAYPATH_DATA = {
  title: 'How an app adopts a template',
  categories: [{ id: 'step', label: 'Step' }],
  events: [
    { title: 'Know the shape', summary: 'Decide whether the information is connections, amounts, levels, time, or one set of headline numbers.' },
    { title: 'Try it on the library site', summary: 'Open that template’s page and use it with the sample data, on a phone and on a computer.' },
    { title: 'Shape the data', summary: 'Copy the data shape from the template page and fill it from the app’s own records.' },
    { title: 'Add one script', summary: 'Load dimau-infographics.js and mount the template by name. Only that template downloads.' },
    { title: 'Match the app', summary: 'Set the colour and font tokens so the template looks like it belongs to the app.' },
    { title: 'Check and record', summary: 'Check desktop and phone, then add the app to the template’s usedBy list in catalog.json.' }
  ]
};
