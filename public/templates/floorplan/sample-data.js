/* Example plan, made up to show the template: a small health centre. */
window.FLOORPLAN_DATA = {
 "label": "Health centre, ground floor",
 "cols": 12,
 "rows": 9,
 "groups": [
  {
   "id": "care",
   "label": "Care"
  },
  {
   "id": "wait",
   "label": "Waiting"
  },
  {
   "id": "staff",
   "label": "Staff only"
  },
  {
   "id": "other",
   "label": "Toilets and other"
  }
 ],
 "rooms": [
  {
   "id": "reception",
   "label": "Reception",
   "x": 4,
   "y": 6,
   "w": 4,
   "h": 2,
   "group": "wait",
   "note": "Check in here first."
  },
  {
   "id": "waiting",
   "label": "Waiting area",
   "x": 0,
   "y": 6,
   "w": 4,
   "h": 2,
   "group": "wait",
   "note": "Seats for 30. Children's corner."
  },
  {
   "id": "nurse",
   "label": "Nurse station",
   "x": 8,
   "y": 6,
   "w": 4,
   "h": 2,
   "group": "staff"
  },
  {
   "id": "room1",
   "label": "Room 1",
   "x": 0,
   "y": 0,
   "w": 3,
   "h": 3,
   "group": "care",
   "note": "Doctor."
  },
  {
   "id": "room2",
   "label": "Room 2",
   "x": 3,
   "y": 0,
   "w": 3,
   "h": 3,
   "group": "care",
   "note": "Doctor."
  },
  {
   "id": "room3",
   "label": "Room 3",
   "x": 6,
   "y": 0,
   "w": 3,
   "h": 3,
   "group": "care",
   "note": "Children and babies."
  },
  {
   "id": "dental",
   "label": "Dental",
   "x": 9,
   "y": 0,
   "w": 3,
   "h": 3,
   "group": "care",
   "note": "Tuesdays and Thursdays."
  },
  {
   "id": "lab",
   "label": "Blood tests",
   "x": 0,
   "y": 3,
   "w": 3,
   "h": 3,
   "group": "care",
   "note": "Go in the morning; some tests need you not to eat first."
  },
  {
   "id": "pharmacy",
   "label": "Pharmacy",
   "x": 3,
   "y": 3,
   "w": 3,
   "h": 3,
   "group": "care",
   "note": "Collect medicine with your slip."
  },
  {
   "id": "xray",
   "label": "X-ray",
   "x": 6,
   "y": 3,
   "w": 3,
   "h": 3,
   "group": "care"
  },
  {
   "id": "toilets",
   "label": "Toilets",
   "x": 9,
   "y": 3,
   "w": 3,
   "h": 2,
   "group": "other",
   "note": "Accessible toilet on the left."
  },
  {
   "id": "store",
   "label": "Store room",
   "x": 9,
   "y": 5,
   "w": 3,
   "h": 1,
   "group": "staff"
  }
 ],
 "you": {
  "x": 5,
  "y": 8,
  "label": "You are here"
 }
};
