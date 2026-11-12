/* Real data: the three ways an app can use this library, from the README and TRACKER (12 Nov 2026). */
window.FEATUREGRID_DATA = {
 "options": [
  {
   "id": "script",
   "label": "Script tag",
   "note": "/v1/dimau-infographics.js"
  },
  {
   "id": "react",
   "label": "React wrapper",
   "note": "v1/react/DimauInfographic.jsx"
  },
  {
   "id": "render",
   "label": "Render API",
   "note": "/api/v1/render/<slug>"
  }
 ],
 "features": [
  {
   "id": "interactive",
   "label": "Interactive in the page",
   "group": "What you get",
   "values": {
    "script": true,
    "react": true,
    "render": false
   },
   "note": "Tap, zoom, drag, filter"
  },
  {
   "id": "image",
   "label": "A PNG or SVG image",
   "group": "What you get",
   "values": {
    "script": "partial",
    "react": "partial",
    "render": true
   },
   "note": "In the browser, only the signal cards export images"
  },
  {
   "id": "email",
   "label": "Works in emails and link previews",
   "group": "What you get",
   "values": {
    "script": false,
    "react": false,
    "render": true
   }
  },
  {
   "id": "count",
   "label": "Templates available",
   "group": "What you get",
   "values": {
    "script": "55",
    "react": "55",
    "render": "4"
   },
   "note": "The render API draws the four signal cards"
  },
  {
   "id": "themes",
   "label": "Light and dark",
   "group": "What you get",
   "values": {
    "script": true,
    "react": true,
    "render": true
   }
  },
  {
   "id": "nojs",
   "label": "Works without JavaScript on the page",
   "group": "Building with it",
   "values": {
    "script": false,
    "react": false,
    "render": true
   }
  },
  {
   "id": "events",
   "label": "Tells the app what the reader did",
   "group": "Building with it",
   "values": {
    "script": true,
    "react": true,
    "render": false
   },
   "note": "Events such as select and change"
  },
  {
   "id": "progress",
   "label": "Saves the reader’s progress",
   "group": "Building with it",
   "values": {
    "script": "partial",
    "react": true,
    "render": false
   },
   "note": "Script tag: getState and setState; React: persistKey"
  },
  {
   "id": "split",
   "label": "Downloads only the template you use",
   "group": "Building with it",
   "values": {
    "script": true,
    "react": true,
    "render": false
   }
  },
  {
   "id": "nokey",
   "label": "No key needed",
   "group": "Building with it",
   "values": {
    "script": true,
    "react": true,
    "render": "partial"
   },
   "note": "Render API: public templates by GET; POST needs a key"
  }
 ]
};
