/* Example figures, made up to show the template: a small personal loan in Fiji dollars. Not financial advice. */
window.LOANPATH_DATA = {
 "prefix": "$",
 "amount": {
  "label": "Amount borrowed",
  "min": 1000,
  "max": 50000,
  "step": 500,
  "value": 10000,
  "prefix": "$"
 },
 "rate": {
  "label": "Interest rate a year",
  "min": 1,
  "max": 30,
  "step": 0.5,
  "value": 12,
  "suffix": "%"
 },
 "years": {
  "label": "Years to repay",
  "min": 1,
  "max": 10,
  "step": 1,
  "value": 2,
  "suffix": " yrs"
 },
 "extra": {
  "label": "Extra paid each month",
  "min": 0,
  "max": 500,
  "step": 10,
  "value": 50,
  "prefix": "$"
 }
};
