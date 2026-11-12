/* Example figures, made up to show the template: a village committee sorting project ideas by effort and impact (0 to 10). */
window.QUADRANT_DATA = {
 "x": {
  "label": "Effort",
  "low": "Easy",
  "high": "Hard"
 },
 "y": {
  "label": "Impact",
  "low": "Small",
  "high": "Big"
 },
 "quadrants": {
  "tl": "Quick wins",
  "tr": "Big projects",
  "bl": "Fill-ins",
  "br": "Not worth it yet"
 },
 "groups": [
  {
   "id": "water",
   "label": "Water"
  },
  {
   "id": "learning",
   "label": "Learning"
  },
  {
   "id": "income",
   "label": "Income"
  }
 ],
 "items": [
  {
   "id": "gutters",
   "label": "Gutters on the hall",
   "x": 2,
   "y": 7,
   "group": "water",
   "note": "Catches rain for the hall tank."
  },
  {
   "id": "tank",
   "label": "New water tank",
   "x": 8,
   "y": 9,
   "group": "water"
  },
  {
   "id": "homework",
   "label": "Homework club",
   "x": 3,
   "y": 8,
   "group": "learning"
  },
  {
   "id": "lights",
   "label": "Solar path lights",
   "x": 4,
   "y": 6,
   "group": "learning"
  },
  {
   "id": "stall",
   "label": "Market stall roof",
   "x": 6,
   "y": 5.5,
   "group": "income"
  },
  {
   "id": "wifi",
   "label": "Village Wi-Fi",
   "x": 8.5,
   "y": 7,
   "group": "learning"
  },
  {
   "id": "nursery",
   "label": "Seedling nursery",
   "x": 3,
   "y": 4,
   "group": "income"
  },
  {
   "id": "racks",
   "label": "Kava drying racks",
   "x": 2,
   "y": 3,
   "group": "income"
  },
  {
   "id": "engine",
   "label": "Boat engine course",
   "x": 7.5,
   "y": 3.5,
   "group": "income"
  },
  {
   "id": "pipes",
   "label": "Fix leaking pipes",
   "x": 1.5,
   "y": 8.5,
   "group": "water"
  }
 ]
};
