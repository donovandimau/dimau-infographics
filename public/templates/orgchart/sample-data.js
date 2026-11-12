/* Example structure, made up to show the template: a school committee by role (no real people). */
window.ORGCHART_DATA = {
 "root": {
  "id": "school-committee",
  "label": "School committee",
  "role": "Chair",
  "children": [
   {
    "id": "finance",
    "label": "Finance",
    "role": "Treasurer",
    "children": [
     {
      "id": "fees",
      "label": "Fees"
     },
     {
      "id": "fundraising",
      "label": "Fundraising"
     }
    ]
   },
   {
    "id": "learning",
    "label": "Learning",
    "role": "Head teacher",
    "children": [
     {
      "id": "junior-classes",
      "label": "Junior classes"
     },
     {
      "id": "senior-classes",
      "label": "Senior classes"
     },
     {
      "id": "library",
      "label": "Library"
     }
    ]
   },
   {
    "id": "grounds",
    "label": "Grounds",
    "role": "Caretaker",
    "children": [
     {
      "id": "gardens",
      "label": "Gardens"
     },
     {
      "id": "repairs",
      "label": "Repairs"
     }
    ]
   },
   {
    "id": "parents-group",
    "label": "Parents' group",
    "role": "Secretary",
    "children": [
     {
      "id": "canteen",
      "label": "Canteen"
     },
     {
      "id": "events",
      "label": "Events"
     }
    ]
   }
  ]
 }
};
