/* Example figures, made up to show the template: four phone data plans (lettered, not real companies). */
window.WEIGHSCORE_DATA = {
 "criteria": [
  {
   "id": "price",
   "label": "Price a month",
   "weight": 4,
   "better": "low",
   "prefix": "$"
  },
  {
   "id": "data",
   "label": "Data",
   "weight": 3,
   "better": "high",
   "suffix": " GB"
  },
  {
   "id": "coverage",
   "label": "Village coverage",
   "weight": 5,
   "better": "high",
   "suffix": "%"
  },
  {
   "id": "contract",
   "label": "Contract length",
   "weight": 2,
   "better": "low",
   "suffix": " months"
  }
 ],
 "options": [
  {
   "id": "a",
   "label": "Plan A",
   "values": {
    "price": 25,
    "data": 10,
    "coverage": 70,
    "contract": 0
   }
  },
  {
   "id": "b",
   "label": "Plan B",
   "values": {
    "price": 40,
    "data": 30,
    "coverage": 85,
    "contract": 12
   }
  },
  {
   "id": "c",
   "label": "Plan C",
   "values": {
    "price": 15,
    "data": 4,
    "coverage": 60,
    "contract": 0
   }
  },
  {
   "id": "d",
   "label": "Plan D",
   "values": {
    "price": 55,
    "data": 60,
    "coverage": 95,
    "contract": 24
   }
  }
 ]
};
