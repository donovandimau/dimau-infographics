/* Real dates: the calendar year, worked out from today's date, so the demo always counts down to the next 1 January. */
(function () {
  var y = new Date().getUTCFullYear(), p = function (m, d) { return y + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d; };
  window.COUNTDOWN_DATA = {
    label: 'the end of ' + y,
    start: p(1, 1),
    end: (y + 1) + '-01-01',
    milestones: [
      { date: p(4, 1), label: 'First quarter done' },
      { date: p(7, 1), label: 'Halfway through the year' },
      { date: p(10, 1), label: 'Last quarter starts' },
      { date: p(12, 25), label: 'Christmas Day' }
    ]
  };
})();
