/* Example figures, made up to show the template: ferry trips a week between eight islands. */
window.ARCFLOW_DATA = {
 "unit": "trips",
 "groups": [
  {
   "id": "north",
   "label": "Northern group"
  },
  {
   "id": "main",
   "label": "Main islands"
  },
  {
   "id": "south",
   "label": "Southern group"
  }
 ],
 "nodes": [
  {
   "id": "a",
   "label": "Island A",
   "group": "north"
  },
  {
   "id": "b",
   "label": "Island B",
   "group": "north"
  },
  {
   "id": "c",
   "label": "Island C",
   "group": "north"
  },
  {
   "id": "d",
   "label": "Island D",
   "group": "main"
  },
  {
   "id": "e",
   "label": "Island E",
   "group": "main"
  },
  {
   "id": "f",
   "label": "Island F",
   "group": "south"
  },
  {
   "id": "g",
   "label": "Island G",
   "group": "south"
  },
  {
   "id": "h",
   "label": "Island H",
   "group": "south"
  }
 ],
 "links": [
  {
   "from": "d",
   "to": "e",
   "value": 42
  },
  {
   "from": "d",
   "to": "a",
   "value": 14
  },
  {
   "from": "d",
   "to": "b",
   "value": 9
  },
  {
   "from": "e",
   "to": "f",
   "value": 18
  },
  {
   "from": "e",
   "to": "g",
   "value": 11
  },
  {
   "from": "a",
   "to": "b",
   "value": 6
  },
  {
   "from": "b",
   "to": "c",
   "value": 4
  },
  {
   "from": "f",
   "to": "g",
   "value": 8
  },
  {
   "from": "g",
   "to": "h",
   "value": 5
  },
  {
   "from": "d",
   "to": "f",
   "value": 7
  },
  {
   "from": "e",
   "to": "h",
   "value": 3
  },
  {
   "from": "c",
   "to": "d",
   "value": 5
  }
 ]
};
