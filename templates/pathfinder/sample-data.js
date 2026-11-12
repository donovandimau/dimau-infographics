/* Real data: the Dimau Infographics library itself (v1.6, 37 templates). Answer the questions to find the template that fits your information. */
window.PATHFINDER_DATA = {
 "title": "Which template fits?",
 "start": "start",
 "nodes": {
  "start": {
   "q": "What is your information mainly about?",
   "help": "Pick the closest. You can change any answer later by tapping it above the question.",
   "options": [
    {
     "label": "Things linked to each other",
     "hint": "topics, systems, catalogues",
     "to": "conn"
    },
    {
     "label": "Amounts and shares",
     "hint": "money, people, stock",
     "to": "amt"
    },
    {
     "label": "Change over time",
     "hint": "histories, plans, habits",
     "to": "time"
    },
    {
     "label": "Places",
     "hint": "provinces, districts, islands",
     "to": "r_tilemap"
    },
    {
     "label": "Steps in a process",
     "hint": "sign-ups, journeys, courses",
     "to": "steps"
    },
    {
     "label": "Choosing between options",
     "hint": "plans, products, ideas",
     "to": "choose"
    },
    {
     "label": "Patterns in a set of numbers",
     "hint": "spread, links, busy times",
     "to": "nums"
    },
    {
     "label": "An explainer told as a story",
     "to": "r_storyscroll"
    },
    {
     "label": "A story with its pictures",
     "hint": "archives, histories, reports",
     "to": "r_archive-desk"
    },
    {
     "label": "A few headline numbers",
     "hint": "at a glance, or as a card",
     "to": "heads"
    }
   ]
  },
  "conn": {
   "q": "How is it organised?",
   "options": [
    {
     "label": "A web of links between topics",
     "to": "r_lanternfield"
    },
    {
     "label": "Levels inside levels",
     "to": "r_strata"
    },
    {
     "label": "Blocks inside blocks, sized by amount",
     "to": "r_mosaic"
    }
   ]
  },
  "amt": {
   "q": "What should readers see?",
   "options": [
    {
     "label": "How a fixed amount is split, and the trade-offs",
     "to": "r_tidepool"
    },
    {
     "label": "Where money or goods flow",
     "to": "r_flowbank"
    },
    {
     "label": "Shares as countable people or things",
     "to": "r_peoplegrid"
    },
    {
     "label": "Two groups back to back, row by row",
     "hint": "e.g. women and men by age",
     "to": "r_pyramid"
    },
    {
     "label": "Progress toward a target",
     "to": "r_goalmeter"
    },
    {
     "label": "How a start amount became an end amount",
     "to": "r_bridge"
    }
   ]
  },
  "time": {
   "q": "What kind of change over time?",
   "help": "Most of these read the same timeline data, so you can switch later without reshaping it.",
   "options": [
    {
     "label": "A story told in order",
     "to": "r_switchback"
    },
    {
     "label": "Several threads side by side",
     "to": "r_swimlane"
    },
    {
     "label": "A plan with tasks that depend on each other",
     "to": "r_roadmap"
    },
    {
     "label": "A long history with busy and quiet periods",
     "to": "r_riverline"
    },
    {
     "label": "Rankings that change year by year",
     "to": "r_rankrace"
    },
    {
     "label": "A trend readers should guess first",
     "to": "r_guessline"
    },
    {
     "label": "Every day for months",
     "hint": "habits, attendance",
     "to": "r_almanac"
    },
    {
     "label": "One day, hour by hour",
     "to": "r_dayclock"
    },
    {
     "label": "Just before and after",
     "to": "r_slope"
    }
   ]
  },
  "steps": {
   "q": "What matters most about the steps?",
   "options": [
    {
     "label": "Where people drop out",
     "to": "r_dropoff"
    },
    {
     "label": "The route, in order",
     "hint": "a journey or learning path",
     "to": "r_waypath"
    },
    {
     "label": "The next step depends on the reader’s answers",
     "to": "r_pathfinder"
    }
   ]
  },
  "choose": {
   "q": "How are you comparing?",
   "options": [
    {
     "label": "Two things, measure by measure",
     "to": "r_duel"
    },
    {
     "label": "Many things on several measures",
     "to": "many"
    },
    {
     "label": "Sorting ideas by two qualities",
     "hint": "e.g. effort and impact",
     "to": "r_quadrant"
    }
   ]
  },
  "many": {
   "q": "What will readers do with it?",
   "options": [
    {
     "label": "Sort, search and look things up",
     "to": "r_ledger"
    },
    {
     "label": "See the shape of each one at a glance",
     "to": "r_radar"
    }
   ]
  },
  "r_lanternfield": {
   "result": "Lanternfield",
   "text": "A field of linked topics explored with a moving lens, with guided tours.",
   "link": "/templates/lanternfield/",
   "linkLabel": "Open Lanternfield"
  },
  "r_strata": {
   "result": "Strata",
   "text": "Layers sized by value; pull one out to drill into it.",
   "link": "/templates/strata/",
   "linkLabel": "Open Strata"
  },
  "r_mosaic": {
   "result": "Mosaic",
   "text": "A treemap: tap a block to zoom into what it holds.",
   "link": "/templates/mosaic/",
   "linkLabel": "Open Mosaic"
  },
  "r_tidepool": {
   "result": "Tidepool",
   "text": "Connected pools that show how a fixed amount is split, with locks for trade-offs.",
   "link": "/templates/tidepool/",
   "linkLabel": "Open Tidepool"
  },
  "r_flowbank": {
   "result": "Flowbank",
   "text": "Bands sized by amount; tap one to follow where it goes.",
   "link": "/templates/flowbank/",
   "linkLabel": "Open Flowbank"
  },
  "r_peoplegrid": {
   "result": "Peoplegrid",
   "text": "One square per person or thing, regrouped between views.",
   "link": "/templates/peoplegrid/",
   "linkLabel": "Open Peoplegrid"
  },
  "r_pyramid": {
   "result": "Pyramid",
   "text": "Two groups back to back, row by row, as numbers or shares.",
   "link": "/templates/pyramid/",
   "linkLabel": "Open Pyramid"
  },
  "r_goalmeter": {
   "result": "Goalmeter",
   "text": "Progress built from each contribution, with milestones and a projected finish.",
   "link": "/templates/goalmeter/",
   "linkLabel": "Open Goalmeter"
  },
  "r_switchback": {
   "result": "Switchback",
   "text": "Alternating story cards along a spine that fills as you read.",
   "link": "/templates/switchback/",
   "linkLabel": "Open Switchback"
  },
  "r_swimlane": {
   "result": "Swimlane",
   "text": "One lane per thread, with zoom and a navigator strip.",
   "link": "/templates/swimlane/",
   "linkLabel": "Open Swimlane"
  },
  "r_roadmap": {
   "result": "Roadmap",
   "text": "Tasks, milestones and dependencies; drag a task and its dependants follow.",
   "link": "/templates/roadmap/",
   "linkLabel": "Open Roadmap"
  },
  "r_riverline": {
   "result": "Riverline",
   "text": "A river that widens when more is happening.",
   "link": "/templates/riverline/",
   "linkLabel": "Open Riverline"
  },
  "r_rankrace": {
   "result": "Rankrace",
   "text": "Bars overtake each other as time plays.",
   "link": "/templates/rankrace/",
   "linkLabel": "Open Rankrace"
  },
  "r_guessline": {
   "result": "Guessline",
   "text": "Readers draw their guess, then the real line is revealed.",
   "link": "/templates/guessline/",
   "linkLabel": "Open Guessline"
  },
  "r_almanac": {
   "result": "Almanac",
   "text": "A calendar heatmap that finds the longest streak.",
   "link": "/templates/almanac/",
   "linkLabel": "Open Almanac"
  },
  "r_dayclock": {
   "result": "Dayclock",
   "text": "A day on a 24-hour clock face; switch between days.",
   "link": "/templates/dayclock/",
   "linkLabel": "Open Dayclock"
  },
  "r_slope": {
   "result": "Slope",
   "text": "One line per item from before to after.",
   "link": "/templates/slope/",
   "linkLabel": "Open Slope"
  },
  "r_dropoff": {
   "result": "Dropoff",
   "text": "A funnel that shows where most people are lost.",
   "link": "/templates/dropoff/",
   "linkLabel": "Open Dropoff"
  },
  "r_waypath": {
   "result": "Waypath",
   "text": "A road, cycle or staircase of steps; play walks the path.",
   "link": "/templates/waypath/",
   "linkLabel": "Open Waypath"
  },
  "r_pathfinder": {
   "result": "Pathfinder",
   "text": "This template: one question at a time to the right result.",
   "link": "/templates/pathfinder/",
   "linkLabel": "Open Pathfinder"
  },
  "r_duel": {
   "result": "Duel",
   "text": "Pick two and compare them row by row.",
   "link": "/templates/duel/",
   "linkLabel": "Open Duel"
  },
  "r_quadrant": {
   "result": "Quadrant",
   "text": "A 2×2 matrix; drag items between the boxes.",
   "link": "/templates/quadrant/",
   "linkLabel": "Open Quadrant"
  },
  "r_ledger": {
   "result": "Ledger",
   "text": "A table with sort, search, bars and sparklines.",
   "link": "/templates/ledger/",
   "linkLabel": "Open Ledger"
  },
  "r_radar": {
   "result": "Radar",
   "text": "A shape per profile across several measures.",
   "link": "/templates/radar/",
   "linkLabel": "Open Radar"
  },
  "r_tilemap": {
   "result": "Tilemap",
   "text": "Places as equal tiles laid out like the map.",
   "link": "/templates/tilemap/",
   "linkLabel": "Open Tilemap"
  },
  "r_storyscroll": {
   "result": "Storyscroll",
   "text": "The chart stays put while the story scrolls past.",
   "link": "/templates/storyscroll/",
   "linkLabel": "Open Storyscroll"
  },
  "r_cards": {
   "result": "Signal cards",
   "text": "Headline-number cards: send your values and get an interactive card plus a PNG or SVG to share.",
   "link": "/#cards",
   "linkLabel": "See the cards"
  },
  "r_archive-desk": {
   "result": "Archive Desk",
   "text": "Read a story and see its pictures together: a book beside a picture stack, with a lightbox and loupe.",
   "link": "/templates/archive-desk/",
   "linkLabel": "Open Archive Desk"
  },
  "nums": {
   "q": "What are you looking for in the numbers?",
   "options": [
    {
     "label": "How spread out they are",
     "to": "r_swarm"
    },
    {
     "label": "Whether two measures are linked",
     "to": "r_scatter"
    },
    {
     "label": "Busy and quiet spots in a table",
     "hint": "e.g. day by hour",
     "to": "r_heatgrid"
    },
    {
     "label": "How a start became an end",
     "hint": "rises and falls",
     "to": "r_bridge"
    },
    {
     "label": "Who belongs to more than one group",
     "to": "r_overlap"
    }
   ]
  },
  "heads": {
   "q": "Where will the numbers be seen?",
   "options": [
    {
     "label": "On a page, at a glance",
     "to": "r_factwall"
    },
    {
     "label": "As a card to share",
     "hint": "PNG or SVG",
     "to": "r_cards"
    }
   ]
  },
  "r_factwall": {
   "result": "Factwall",
   "text": "Headline numbers that count up, with detail and source on tap.",
   "link": "/templates/factwall/",
   "linkLabel": "Open Factwall"
  },
  "r_swarm": {
   "result": "Swarm",
   "text": "Every item as a dot on one scale, split by group.",
   "link": "/templates/swarm/",
   "linkLabel": "Open Swarm"
  },
  "r_scatter": {
   "result": "Scatter",
   "text": "One measure against another, with the trend in words.",
   "link": "/templates/scatter/",
   "linkLabel": "Open Scatter"
  },
  "r_heatgrid": {
   "result": "Heatgrid",
   "text": "A table coloured by size, with row totals.",
   "link": "/templates/heatgrid/",
   "linkLabel": "Open Heatgrid"
  },
  "r_bridge": {
   "result": "Bridge",
   "text": "A waterfall from a start to an end; step through it.",
   "link": "/templates/bridge/",
   "linkLabel": "Open Bridge"
  },
  "r_overlap": {
   "result": "Overlap",
   "text": "A Venn diagram of two or three groups.",
   "link": "/templates/overlap/",
   "linkLabel": "Open Overlap"
  }
 }
};
