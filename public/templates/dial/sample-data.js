/* Example figures, made up to show the template: a village water tank, read once a week. */
window.DIAL_DATA = {
 "label": "Water tank level",
 "value": 38,
 "min": 0,
 "max": 100,
 "suffix": "%",
 "target": 60,
 "zones": [
  {
   "to": 20,
   "label": "Low",
   "tone": "bad",
   "note": "Keep the water for drinking and cooking."
  },
  {
   "to": 50,
   "label": "Getting low",
   "tone": "warn",
   "note": "Cut back on washing and garden water."
  },
  {
   "to": 100,
   "label": "Fine",
   "tone": "good",
   "note": "Normal use."
  }
 ],
 "history": [
  {
   "label": "Week 1",
   "value": 62
  },
  {
   "label": "Week 2",
   "value": 58
  },
  {
   "label": "Week 3",
   "value": 55
  },
  {
   "label": "Week 4",
   "value": 51
  },
  {
   "label": "Week 5",
   "value": 47
  },
  {
   "label": "Week 6",
   "value": 44
  },
  {
   "label": "Week 7",
   "value": 41
  },
  {
   "label": "Week 8",
   "value": 38
  }
 ]
};
