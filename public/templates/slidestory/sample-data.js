/* Real process: how a template is made for this library (from TRACKER.md, ALL-PROJECTS rules and this repo’s tests). */
window.SLIDESTORY_DATA = {
 "title": "From idea to app",
 "slides": [
  {
   "id": "shape",
   "kicker": "Idea",
   "big": "1",
   "title": "Start from the shape of the information",
   "text": "Connections, amounts, steps, places, time or choices. The shape decides the template, not the other way round."
  },
  {
   "id": "build",
   "kicker": "Build",
   "big": "0",
   "title": "Build it with no dependencies",
   "text": "Each template is plain JavaScript in one file: no frameworks to download, so it loads fast on a phone."
  },
  {
   "id": "data",
   "kicker": "Data",
   "big": "Real",
   "title": "Use real data, or say it is an example",
   "text": "Every sample names its source and date, or carries an “Example figures” flag."
  },
  {
   "id": "test",
   "kicker": "Test",
   "big": "2",
   "title": "Test at two widths",
   "text": "The smoke test opens every page at 1,360 and 390 pixels wide, uses each template, and fails on any error or sideways scroll."
  },
  {
   "id": "look",
   "kicker": "Look",
   "big": "Look",
   "title": "Look at the screenshots",
   "text": "Tests catch errors; only looking catches a label that overlaps or a circle that is too small to tap."
  },
  {
   "id": "review",
   "kicker": "Review",
   "big": "PR",
   "title": "Open a pull request",
   "text": "Nothing reaches the live library until Donovan has seen the pull request and merged it."
  },
  {
   "id": "live",
   "kicker": "Live",
   "big": "1",
   "title": "One script for every app",
   "text": "Merging deploys the library. Apps load one script and pick a template by name, so a fix reaches them all."
  }
 ]
};
