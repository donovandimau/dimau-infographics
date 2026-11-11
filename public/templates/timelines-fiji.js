/* Fiji history for the timeline views: the Riverline sample (dated events) plus three spans.
   Loaded after templates/riverline/sample-data.js. Summaries are short; check them against the museum's
   reviewed sources before an app publishes them. */
(function () {
  var r = window.RIVERLINE_DATA;
  window.TIMELINE_FIJI = {
    title: 'Fiji through time',
    categories: r.lanes,
    eras: r.eras,
    events: r.events.concat([
      { date: '1874-10-10', end: '1970-10-10', lane: 'governance', title: 'Crown colony', summary: 'Fiji is governed as a British colony from cession until independence.' },
      { date: '1879-05-14', end: '1920-01-01', lane: 'society', title: 'Indenture (girmit) years', summary: 'Labourers from India work under indenture contracts until the system is abolished on 1 January 1920.' },
      { date: '1871-06', end: '1874-10-10', lane: 'governance', title: 'Kingdom of Fiji', summary: 'The united government at Levuka under Cakobau, until cession.' }
    ])
  };
})();
