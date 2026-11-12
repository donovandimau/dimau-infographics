/* Real process: how an app adopts a template from this library (from the README and the shared Dimau rules). */
window.CHECKLIST_DATA = {
 "title": "Add a template to your app",
 "steps": [
  {
   "id": "shape",
   "label": "Decide the shape of your information",
   "minutes": 5,
   "detail": "Connections, amounts, levels, time, steps, places, choices, patterns or learning. Not sure? Answer the questions in Pathfinder.",
   "link": "/templates/pathfinder/",
   "linkLabel": "Open Pathfinder"
  },
  {
   "id": "try",
   "label": "Open that template’s page and try it with the sample data",
   "minutes": 5,
   "detail": "Every template has a page on the library site with live sample data, its data shape and its events.",
   "link": "/",
   "linkLabel": "Open the library"
  },
  {
   "id": "data",
   "label": "Shape your data as that page shows",
   "minutes": 20,
   "detail": "Each page lists the data shape. Say in your app whether the figures are real (with source and date) or examples."
  },
  {
   "id": "mount",
   "label": "Mount it in your app",
   "minutes": 10,
   "detail": "Load /v1/dimau-infographics.js once, then call DimauInfographics.mount with the template name and your data. React apps use v1/react/DimauInfographic.jsx."
  },
  {
   "id": "phone",
   "label": "Check it at phone width and in dark mode",
   "minutes": 5,
   "detail": "Look at 390 pixels wide: nothing should scroll sideways or be cut off."
  },
  {
   "id": "usedby",
   "label": "Add your app to the template’s usedBy list in catalog.json",
   "minutes": 5,
   "detail": "Do it in the same pull request as any library change, so later changes can be checked against the apps that use the template."
  }
 ]
};
