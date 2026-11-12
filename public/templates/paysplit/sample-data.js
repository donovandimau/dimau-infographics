/* Example figures, made up to show the template: a monthly pay of $2,400 and where it goes; the deduction rates are placeholders, not real tax or fund rates. Not financial advice. */
window.PAYSPLIT_DATA = {
 "prefix": "$",
 "gross": 2400,
 "per": "month",
 "items": [
  {
   "id": "tax",
   "label": "Income tax",
   "kind": "deduction",
   "percent": 10
  },
  {
   "id": "fund",
   "label": "Retirement fund",
   "kind": "deduction",
   "percent": 8
  },
  {
   "id": "rent",
   "label": "Rent",
   "kind": "bill",
   "amount": 650
  },
  {
   "id": "power",
   "label": "Power and water",
   "kind": "bill",
   "amount": 120
  },
  {
   "id": "phone",
   "label": "Phone and data",
   "kind": "bill",
   "amount": 60
  },
  {
   "id": "bus",
   "label": "Bus fares",
   "kind": "bill",
   "amount": 90
  },
  {
   "id": "save",
   "label": "Savings",
   "kind": "saving",
   "amount": 200
  }
 ]
};
