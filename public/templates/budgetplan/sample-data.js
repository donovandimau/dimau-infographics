/* Example figures, made up to show the template: a household earning $1,800 a month, against a 50 / 30 / 20 plan. Not financial advice. */
window.BUDGETPLAN_DATA = {
 "prefix": "$",
 "income": 1800,
 "plan": {
  "needs": 50,
  "wants": 30,
  "savings": 20
 },
 "items": [
  {
   "id": "rent",
   "label": "Rent",
   "kind": "needs",
   "amount": 550
  },
  {
   "id": "food",
   "label": "Food",
   "kind": "needs",
   "amount": 380
  },
  {
   "id": "bills",
   "label": "Power, water, phone",
   "kind": "needs",
   "amount": 140
  },
  {
   "id": "out",
   "label": "Eating out and treats",
   "kind": "wants",
   "amount": 220
  },
  {
   "id": "fun",
   "label": "Outings and gifts",
   "kind": "wants",
   "amount": 180
  },
  {
   "id": "save",
   "label": "Savings",
   "kind": "savings",
   "amount": 200
  }
 ]
};
