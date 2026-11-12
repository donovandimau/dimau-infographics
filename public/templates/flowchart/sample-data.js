/* Real process: how a change reaches this library (from TRACKER.md and the shared Dimau rules). */
window.FLOWCHART_DATA = {
 "nodes": [
  {
   "id": "idea",
   "label": "Idea for a template",
   "type": "start",
   "row": 0,
   "col": 0
  },
  {
   "id": "branch",
   "label": "Build it on a branch",
   "type": "step",
   "row": 1,
   "col": 0
  },
  {
   "id": "test",
   "label": "Run the tests",
   "type": "step",
   "row": 2,
   "col": 0
  },
  {
   "id": "pass",
   "label": "All checks pass?",
   "type": "decision",
   "row": 3,
   "col": 0
  },
  {
   "id": "fix",
   "label": "Find the cause and fix it",
   "type": "step",
   "row": 3,
   "col": 1,
   "note": "Never skip or switch off a test to get green."
  },
  {
   "id": "pr",
   "label": "Open a pull request",
   "type": "step",
   "row": 4,
   "col": 0
  },
  {
   "id": "ok",
   "label": "Donovan approves?",
   "type": "decision",
   "row": 5,
   "col": 0
  },
  {
   "id": "change",
   "label": "Make the changes asked for",
   "type": "step",
   "row": 5,
   "col": 1
  },
  {
   "id": "merge",
   "label": "Merge to main",
   "type": "step",
   "row": 6,
   "col": 0,
   "note": "Every merge to main deploys the live library."
  },
  {
   "id": "live",
   "label": "Live in every app",
   "type": "end",
   "row": 7,
   "col": 0
  }
 ],
 "edges": [
  {
   "from": "idea",
   "to": "branch",
   "main": true
  },
  {
   "from": "branch",
   "to": "test",
   "main": true
  },
  {
   "from": "test",
   "to": "pass",
   "main": true
  },
  {
   "from": "pass",
   "to": "pr",
   "label": "Yes",
   "main": true
  },
  {
   "from": "pass",
   "to": "fix",
   "label": "No"
  },
  {
   "from": "fix",
   "to": "test"
  },
  {
   "from": "pr",
   "to": "ok",
   "main": true
  },
  {
   "from": "ok",
   "to": "merge",
   "label": "Yes",
   "main": true
  },
  {
   "from": "ok",
   "to": "change",
   "label": "Not yet"
  },
  {
   "from": "change",
   "to": "test"
  },
  {
   "from": "merge",
   "to": "live",
   "main": true
  }
 ]
};
