/* Example figures, made up to show the template: one month at a small business against its targets. */
window.BULLETBAR_DATA = {
 "bandLabels": [
  "Poor",
  "OK",
  "Good"
 ],
 "rows": [
  {
   "id": "sales",
   "label": "Sales",
   "value": 18400,
   "target": 20000,
   "bands": [
    12000,
    18000,
    25000
   ],
   "prefix": "$"
  },
  {
   "id": "customers",
   "label": "New customers",
   "value": 46,
   "target": 40,
   "bands": [
    20,
    35,
    60
   ]
  },
  {
   "id": "repeat",
   "label": "Repeat customers",
   "value": 58,
   "target": 50,
   "bands": [
    30,
    45,
    80
   ],
   "suffix": "%"
  },
  {
   "id": "wait",
   "label": "Average wait",
   "value": 12,
   "target": 10,
   "bands": [
    8,
    15,
    25
   ],
   "suffix": " min",
   "better": "down"
  },
  {
   "id": "costs",
   "label": "Running costs",
   "value": 6100,
   "target": 6500,
   "bands": [
    5500,
    7000,
    9000
   ],
   "prefix": "$",
   "better": "down"
  }
 ]
};
