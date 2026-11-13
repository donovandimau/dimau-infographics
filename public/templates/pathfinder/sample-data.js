/* Real data: the Dimau Infographics library itself (v1.25, 146 templates). Answer the questions to find the template that fits your information. */
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
     "hint": "regions, distances, routes, the sky",
     "to": "place"
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
     "label": "Something people should learn or practise",
     "hint": "lessons, training, guides",
     "to": "learn"
    },
    {
     "label": "Planning money or time",
     "hint": "loans, savings, deadlines",
     "to": "plan"
    },
    {
     "label": "Asking people what they think",
     "hint": "polls, priorities, surveys",
     "to": "ask"
    },
    {
     "label": "Keeping track of something",
     "hint": "readings, status, events, bookings",
     "to": "track"
    },
    {
     "label": "Helping someone choose or find their way",
     "hint": "decisions, routes, levels, terms",
     "to": "guide"
    },
    {
     "label": "A story or an explainer",
     "to": "story",
     "hint": "step by step, before and after, myths"
    },
    {
     "label": "A story with its pictures",
     "hint": "archives, histories, reports",
     "to": "r_archive-desk"
    },
    {
     "label": "Text: comments, documents, wording",
     "hint": "feedback, policies, notices",
     "to": "words"
    },
    {
     "label": "An everyday tool",
     "hint": "time zones, sharing costs, best value",
     "to": "tools"
    },
    {
     "label": "Just a plain, clear chart",
     "hint": "ring, bars, lines, areas",
     "to": "basics"
    },
    {
     "label": "Sport and games",
     "hint": "matches, races, tournaments",
     "to": "sport"
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
    },
    {
     "label": "Rings inside rings, to zoom into",
     "to": "r_sunburst"
    },
    {
     "label": "Circles inside circles, sized by amount",
     "to": "r_circlepack"
    },
    {
     "label": "A list in levels, as blocks",
     "to": "r_icicle",
     "hint": "e.g. subjects, courses, chapters"
    },
    {
     "label": "Links between places or people",
     "to": "r_arcflow",
     "hint": "e.g. routes, trade"
    },
    {
     "label": "Who links to whom, as a grid",
     "to": "r_linkmatrix",
     "hint": "e.g. messages between teams"
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
    },
    {
     "label": "What several groups are made of",
     "hint": "e.g. spending by category, per year",
     "to": "r_stackbar"
    },
    {
     "label": "Shares split two ways at once",
     "to": "r_marimekko",
     "hint": "e.g. transport by district"
    },
    {
     "label": "The few that make up most of the total",
     "to": "r_pareto"
    },
    {
     "label": "Many categories in a small, round graphic",
     "to": "r_radialbars"
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
     "label": "Rankings, as a still picture",
     "to": "r_bumpline"
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
    },
    {
     "label": "Seasons, year after year",
     "to": "r_spiral"
    },
    {
     "label": "Several layers growing and shrinking",
     "to": "r_streamgraph"
    },
    {
     "label": "Lives, eras or terms that overlap",
     "to": "r_lifespans"
    },
    {
     "label": "Several measures changing together",
     "to": "r_bubbletrail",
     "hint": "e.g. income and schooling by district"
    },
    {
     "label": "A forecast and how sure it is",
     "to": "r_fanchart"
    },
    {
     "label": "Lows and highs by period",
     "to": "r_rangebars",
     "hint": "e.g. temperatures by month"
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
     "label": "Who holds each step, and for how long",
     "hint": "a lease, an application, an approval",
     "to": "r_stagepath"
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
    },
    {
     "label": "Before and after, row by row",
     "to": "r_dumbbell",
     "hint": "e.g. start and end of year"
    },
    {
     "label": "Many options on several measures at once",
     "to": "r_parallelaxes",
     "hint": "e.g. plans, products, sites"
    },
    {
     "label": "Which of two versions works better",
     "to": "r_abtest",
     "hint": "e.g. two messages or posters"
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
    },
    {
     "label": "Which has which feature",
     "hint": "a comparison table",
     "to": "r_featuregrid"
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
  "r_stagepath": {
   "result": "Stagepath",
   "text": "Steps as cards showing who holds each one and how long it usually takes.",
   "link": "/templates/stagepath/",
   "linkLabel": "Open Stagepath"
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
    },
    {
     "label": "How much moves between groups",
     "to": "r_ringflow"
    },
    {
     "label": "How values spread out",
     "to": "r_histobins"
    },
    {
     "label": "Groups side by side, fairly",
     "to": "r_boxplot"
    },
    {
     "label": "The shapes of several groups",
     "to": "r_ridgeline"
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
  },
  "learn": {
   "q": "What should the reader do?",
   "options": [
    {
     "label": "Remember words or terms",
     "to": "r_flashdeck"
    },
    {
     "label": "Check what they know",
     "to": "r_quizline"
    },
    {
     "label": "See how the parts of something work",
     "to": "r_hotspot"
    },
    {
     "label": "Follow steps and tick them off",
     "to": "r_checklist"
    },
    {
     "label": "Picture how big things are",
     "to": "r_scaleup"
    },
    {
     "label": "Sort things into groups",
     "to": "r_sorter"
    },
    {
     "label": "Matching pairs",
     "to": "r_matchup",
     "hint": "e.g. words and meanings"
    },
    {
     "label": "Putting things in order",
     "to": "r_sequence",
     "hint": "e.g. history, steps"
    },
    {
     "label": "Filling gaps in sentences",
     "to": "r_fillgap"
    },
    {
     "label": "Guessing numbers",
     "to": "r_estimator"
    },
    {
     "label": "Seeing who needs help with what",
     "to": "r_masterygrid",
     "hint": "for teachers"
    },
    {
     "label": "Learning by repetition",
     "to": "r_leitner",
     "hint": "flash cards in boxes"
    }
   ]
  },
  "r_flashdeck": {
   "result": "Flashdeck",
   "text": "Flip cards; mark the ones you know and practise the rest.",
   "link": "/templates/flashdeck/",
   "linkLabel": "Open Flashdeck"
  },
  "r_quizline": {
   "result": "Quizline",
   "text": "One question at a time, with an explanation after every answer.",
   "link": "/templates/quizline/",
   "linkLabel": "Open Quizline"
  },
  "r_hotspot": {
   "result": "Hotspot",
   "text": "A diagram with numbered parts to tap, and a tour.",
   "link": "/templates/hotspot/",
   "linkLabel": "Open Hotspot"
  },
  "r_checklist": {
   "result": "Checklist",
   "text": "A how-to with steps to tick off and time left.",
   "link": "/templates/checklist/",
   "linkLabel": "Open Checklist"
  },
  "r_scaleup": {
   "result": "Scaleup",
   "text": "Sizes as circles to scale; pick two to compare.",
   "link": "/templates/scaleup/",
   "linkLabel": "Open Scaleup"
  },
  "r_sorter": {
   "result": "Sorter",
   "text": "Sort items into groups, then check the answers.",
   "link": "/templates/sorter/",
   "linkLabel": "Open Sorter"
  },
  "plan": {
   "q": "What are you planning?",
   "options": [
    {
     "label": "Paying back a loan",
     "to": "r_loanpath"
    },
    {
     "label": "Saving toward a goal",
     "to": "r_savegrow"
    },
    {
     "label": "Counting down to a date",
     "to": "r_countdown"
    },
    {
     "label": "Where pay goes",
     "to": "r_paysplit"
    },
    {
     "label": "Spending against a plan",
     "to": "r_budgetplan",
     "hint": "needs, wants, savings"
    },
    {
     "label": "Paying off several debts",
     "to": "r_debtplan"
    },
    {
     "label": "Sending money home",
     "to": "r_sendmoney",
     "hint": "fees and rates"
    },
    {
     "label": "Getting through the month",
     "to": "r_cashcalendar",
     "hint": "paydays and bills"
    },
    {
     "label": "What rising prices do",
     "to": "r_pricerise"
    }
   ]
  },
  "ask": {
   "q": "What do you want to ask?",
   "options": [
    {
     "label": "Pick one option",
     "hint": "a poll",
     "to": "r_pollbar"
    },
    {
     "label": "Put options in order",
     "to": "r_rankit"
    },
    {
     "label": "How much people agree",
     "hint": "survey results",
     "to": "r_opinion"
    }
   ]
  },
  "r_loanpath": {
   "result": "Loanpath",
   "text": "What a loan costs each month and in all, and what paying extra saves.",
   "link": "/templates/loanpath/",
   "linkLabel": "Open Loanpath"
  },
  "r_savegrow": {
   "result": "Savegrow",
   "text": "Savings growing year by year, and when a goal is reached.",
   "link": "/templates/savegrow/",
   "linkLabel": "Open Savegrow"
  },
  "r_countdown": {
   "result": "Countdown",
   "text": "Time left until a date, with milestones.",
   "link": "/templates/countdown/",
   "linkLabel": "Open Countdown"
  },
  "r_pollbar": {
   "result": "Pollbar",
   "text": "A poll people can vote in.",
   "link": "/templates/pollbar/",
   "linkLabel": "Open Pollbar"
  },
  "r_rankit": {
   "result": "Rankit",
   "text": "Put items in order and compare with the group.",
   "link": "/templates/rankit/",
   "linkLabel": "Open Rankit"
  },
  "r_opinion": {
   "result": "Opinion",
   "text": "Agree–disagree survey answers centred on neutral.",
   "link": "/templates/opinion/",
   "linkLabel": "Open Opinion"
  },
  "track": {
   "q": "What are you keeping track of?",
   "options": [
    {
     "label": "One reading against safe ranges",
     "to": "r_dial"
    },
    {
     "label": "Whether services are working",
     "to": "r_statusboard"
    },
    {
     "label": "Many numbers over time",
     "to": "r_sparkgrid"
    },
    {
     "label": "A big list in branches",
     "to": "r_treeline"
    },
    {
     "label": "Events in a month",
     "to": "r_monthview"
    },
    {
     "label": "Free and booked times",
     "to": "r_slotgrid"
    },
    {
     "label": "Results against targets",
     "to": "r_bulletbar"
    },
    {
     "label": "Headline numbers with change and targets",
     "to": "r_kpitiles"
    },
    {
     "label": "Work left against a deadline",
     "to": "r_burndown",
     "hint": "e.g. a project or sprint"
    },
    {
     "label": "Whether a reading is unusual",
     "to": "r_controlchart",
     "hint": "e.g. daily waiting times"
    },
    {
     "label": "Work stuck in stages",
     "to": "r_cumflow",
     "hint": "e.g. requests, orders, repairs"
    },
    {
     "label": "People who keep coming back",
     "to": "r_cohortgrid",
     "hint": "e.g. members, learners"
    }
   ]
  },
  "r_dial": {
   "result": "Dial",
   "text": "A gauge with zones: low, fine or high.",
   "link": "/templates/dial/",
   "linkLabel": "Open Dial"
  },
  "r_statusboard": {
   "result": "Statusboard",
   "text": "Working, slow or down, day by day.",
   "link": "/templates/statusboard/",
   "linkLabel": "Open Statusboard"
  },
  "r_sparkgrid": {
   "result": "Sparkgrid",
   "text": "Small trend lines side by side.",
   "link": "/templates/sparkgrid/",
   "linkLabel": "Open Sparkgrid"
  },
  "r_treeline": {
   "result": "Treeline",
   "text": "An outline to open, close and search.",
   "link": "/templates/treeline/",
   "linkLabel": "Open Treeline"
  },
  "r_monthview": {
   "result": "Monthview",
   "text": "A month calendar of events.",
   "link": "/templates/monthview/",
   "linkLabel": "Open Monthview"
  },
  "r_slotgrid": {
   "result": "Slotgrid",
   "text": "A booking grid of free and booked times.",
   "link": "/templates/slotgrid/",
   "linkLabel": "Open Slotgrid"
  },
  "r_stackbar": {
   "result": "Stackbar",
   "text": "What each group is made of, as 100% bars.",
   "link": "/templates/stackbar/",
   "linkLabel": "Open Stackbar"
  },
  "r_featuregrid": {
   "result": "Featuregrid",
   "text": "Options and features side by side.",
   "link": "/templates/featuregrid/",
   "linkLabel": "Open Featuregrid"
  },
  "r_ringflow": {
   "result": "Ringflow",
   "text": "Flows between groups around a ring.",
   "link": "/templates/ringflow/",
   "linkLabel": "Open Ringflow"
  },
  "r_bumpline": {
   "result": "Bumpline",
   "text": "Rankings over time as crossing lines.",
   "link": "/templates/bumpline/",
   "linkLabel": "Open Bumpline"
  },
  "r_spiral": {
   "result": "Spiral",
   "text": "Months in a spiral, one turn a year.",
   "link": "/templates/spiral/",
   "linkLabel": "Open Spiral"
  },
  "r_streamgraph": {
   "result": "Streamgraph",
   "text": "Layers over time as a flowing stream.",
   "link": "/templates/streamgraph/",
   "linkLabel": "Open Streamgraph"
  },
  "guide": {
   "q": "What should the reader be able to do?",
   "options": [
    {
     "label": "Choose by what matters to them",
     "to": "r_weighscore"
    },
    {
     "label": "See where a bus or boat is now",
     "to": "r_routeline"
    },
    {
     "label": "See their level and what is next",
     "to": "r_levelup"
    },
    {
     "label": "See who is in which team",
     "to": "r_orgchart"
    },
    {
     "label": "Picture amounts from tiny to huge",
     "to": "r_numberline"
    },
    {
     "label": "Look up what a term means",
     "to": "r_glossary"
    }
   ]
  },
  "r_weighscore": {
   "result": "Weighscore",
   "text": "Set what matters; the options re-rank.",
   "link": "/templates/weighscore/",
   "linkLabel": "Open Weighscore"
  },
  "r_routeline": {
   "result": "Routeline",
   "text": "Stops, times and where it is now.",
   "link": "/templates/routeline/",
   "linkLabel": "Open Routeline"
  },
  "r_levelup": {
   "result": "Levelup",
   "text": "A ladder of levels and what each unlocks.",
   "link": "/templates/levelup/",
   "linkLabel": "Open Levelup"
  },
  "r_orgchart": {
   "result": "Orgchart",
   "text": "Teams and roles, open and close.",
   "link": "/templates/orgchart/",
   "linkLabel": "Open Orgchart"
  },
  "r_numberline": {
   "result": "Numberline",
   "text": "Amounts from tiny to huge on one line.",
   "link": "/templates/numberline/",
   "linkLabel": "Open Numberline"
  },
  "r_glossary": {
   "result": "Glossary",
   "text": "An A–Z of terms with search and links.",
   "link": "/templates/glossary/",
   "linkLabel": "Open Glossary"
  },
  "story": {
   "q": "How should the story be told?",
   "options": [
    {
     "label": "Scrolling, with the chart changing",
     "to": "r_storyscroll"
    },
    {
     "label": "One card at a time",
     "to": "r_slidestory"
    },
    {
     "label": "Before and after pictures",
     "to": "r_beforeafter"
    },
    {
     "label": "A chart with notes on it",
     "to": "r_annotline"
    },
    {
     "label": "True or false claims",
     "to": "r_verdict"
    },
    {
     "label": "A process with decisions",
     "to": "r_flowchart"
    },
    {
     "label": "Counters since the page opened",
     "to": "r_liveticker"
    }
   ]
  },
  "r_beforeafter": {
   "result": "Beforeafter",
   "text": "Drag between two pictures.",
   "link": "/templates/beforeafter/",
   "linkLabel": "Open Beforeafter"
  },
  "r_slidestory": {
   "result": "Slidestory",
   "text": "A story one card at a time.",
   "link": "/templates/slidestory/",
   "linkLabel": "Open Slidestory"
  },
  "r_verdict": {
   "result": "Verdict",
   "text": "True, false or partly: guess, then see why.",
   "link": "/templates/verdict/",
   "linkLabel": "Open Verdict"
  },
  "r_annotline": {
   "result": "Annotline",
   "text": "A line chart with notes to step through.",
   "link": "/templates/annotline/",
   "linkLabel": "Open Annotline"
  },
  "r_liveticker": {
   "result": "Liveticker",
   "text": "Counters running since the page opened.",
   "link": "/templates/liveticker/",
   "linkLabel": "Open Liveticker"
  },
  "r_flowchart": {
   "result": "Flowchart",
   "text": "Steps and decisions; walk the main path.",
   "link": "/templates/flowchart/",
   "linkLabel": "Open Flowchart"
  },
  "place": {
   "q": "What about the places?",
   "options": [
    {
     "label": "Comparing regions on a map",
     "to": "r_tilemap"
    },
    {
     "label": "What is near, and how far",
     "to": "r_reachrings"
    },
    {
     "label": "The ups and downs of a route",
     "to": "r_profileline"
    },
    {
     "label": "Finding a room in a building",
     "to": "r_floorplan"
    },
    {
     "label": "Sunrise, sunset and daylight",
     "to": "r_daylight"
    },
    {
     "label": "Moon phases",
     "to": "r_moonmonth"
    },
    {
     "label": "Weather, tides and storms",
     "hint": "sea, sun, heat, rain",
     "to": "weather"
    },
    {
     "label": "Which way the wind blows",
     "to": "r_windrose"
    }
   ]
  },
  "r_daylight": {
   "result": "Daylight",
   "text": "Sunrise and sunset for every day of the year.",
   "link": "/templates/daylight/",
   "linkLabel": "Open Daylight"
  },
  "r_moonmonth": {
   "result": "Moonmonth",
   "text": "A month of moon phases; tap a day.",
   "link": "/templates/moonmonth/",
   "linkLabel": "Open Moonmonth"
  },
  "r_windrose": {
   "result": "Windrose",
   "text": "Where the wind comes from, and how strong.",
   "link": "/templates/windrose/",
   "linkLabel": "Open Windrose"
  },
  "r_reachrings": {
   "result": "Reachrings",
   "text": "What is within reach, by distance and direction.",
   "link": "/templates/reachrings/",
   "linkLabel": "Open Reachrings"
  },
  "r_profileline": {
   "result": "Profileline",
   "text": "The ups and downs of a route; drag along it.",
   "link": "/templates/profileline/",
   "linkLabel": "Open Profileline"
  },
  "r_floorplan": {
   "result": "Floorplan",
   "text": "Search or tap to find a room.",
   "link": "/templates/floorplan/",
   "linkLabel": "Open Floorplan"
  },
  "r_histobins": {
   "result": "Histobins",
   "text": "How many values fall in each range.",
   "link": "/templates/histobins/",
   "linkLabel": "Open Histobins"
  },
  "r_boxplot": {
   "result": "Boxplot",
   "text": "The middle half and the typical value, by group.",
   "link": "/templates/boxplot/",
   "linkLabel": "Open Boxplot"
  },
  "r_dumbbell": {
   "result": "Dumbbell",
   "text": "Before and after on one line per row.",
   "link": "/templates/dumbbell/",
   "linkLabel": "Open Dumbbell"
  },
  "r_bulletbar": {
   "result": "Bulletbar",
   "text": "Results against targets, poor to good.",
   "link": "/templates/bulletbar/",
   "linkLabel": "Open Bulletbar"
  },
  "r_ridgeline": {
   "result": "Ridgeline",
   "text": "The shape of each group, stacked like hills.",
   "link": "/templates/ridgeline/",
   "linkLabel": "Open Ridgeline"
  },
  "r_marimekko": {
   "result": "Marimekko",
   "text": "Shares by width and height at once.",
   "link": "/templates/marimekko/",
   "linkLabel": "Open Marimekko"
  },
  "r_sunburst": {
   "result": "Sunburst",
   "text": "Rings to zoom into, slice by slice.",
   "link": "/templates/sunburst/",
   "linkLabel": "Open Sunburst"
  },
  "r_circlepack": {
   "result": "Circlepack",
   "text": "Circles inside circles, sized by amount.",
   "link": "/templates/circlepack/",
   "linkLabel": "Open Circlepack"
  },
  "r_icicle": {
   "result": "Icicle",
   "text": "Stacked blocks, left to right.",
   "link": "/templates/icicle/",
   "linkLabel": "Open Icicle"
  },
  "r_arcflow": {
   "result": "Arcflow",
   "text": "Links as arcs; tap one to see its links.",
   "link": "/templates/arcflow/",
   "linkLabel": "Open Arcflow"
  },
  "r_linkmatrix": {
   "result": "Linkmatrix",
   "text": "Who links to whom, as a grid.",
   "link": "/templates/linkmatrix/",
   "linkLabel": "Open Linkmatrix"
  },
  "r_lifespans": {
   "result": "Lifespans",
   "text": "Who was around at the same time.",
   "link": "/templates/lifespans/",
   "linkLabel": "Open Lifespans"
  },
  "r_bubbletrail": {
   "result": "Bubbletrail",
   "text": "Bubbles moving through the years; press play.",
   "link": "/templates/bubbletrail/",
   "linkLabel": "Open Bubbletrail"
  },
  "r_fanchart": {
   "result": "Fanchart",
   "text": "A forecast with the ranges it could fall in.",
   "link": "/templates/fanchart/",
   "linkLabel": "Open Fanchart"
  },
  "r_rangebars": {
   "result": "Rangebars",
   "text": "The low and the high of each period.",
   "link": "/templates/rangebars/",
   "linkLabel": "Open Rangebars"
  },
  "r_pareto": {
   "result": "Pareto",
   "text": "The few that make up most of the total.",
   "link": "/templates/pareto/",
   "linkLabel": "Open Pareto"
  },
  "r_parallelaxes": {
   "result": "Parallelaxes",
   "text": "Many things on several measures at once.",
   "link": "/templates/parallelaxes/",
   "linkLabel": "Open Parallelaxes"
  },
  "r_radialbars": {
   "result": "Radialbars",
   "text": "Bars around a circle.",
   "link": "/templates/radialbars/",
   "linkLabel": "Open Radialbars"
  },
  "words": {
   "q": "What do you want to know about the text?",
   "options": [
    {
     "label": "Which words come up most",
     "to": "r_wordbars"
    },
    {
     "label": "A quick picture of the words",
     "to": "r_tagcloud"
    },
    {
     "label": "What people say after a word",
     "hint": "e.g. “I would like…”",
     "to": "r_wordtree"
    },
    {
     "label": "What changed between two versions",
     "to": "r_textdiff"
    },
    {
     "label": "How easy it is to read",
     "to": "r_readscore"
    },
    {
     "label": "How one word is used",
     "to": "r_keyline"
    }
   ]
  },
  "r_wordbars": {
   "result": "Wordbars",
   "text": "The words used most, with examples.",
   "link": "/templates/wordbars/",
   "linkLabel": "Open Wordbars"
  },
  "r_tagcloud": {
   "result": "Tagcloud",
   "text": "Words sized by how often they are used.",
   "link": "/templates/tagcloud/",
   "linkLabel": "Open Tagcloud"
  },
  "r_wordtree": {
   "result": "Wordtree",
   "text": "What follows a word, as branches.",
   "link": "/templates/wordtree/",
   "linkLabel": "Open Wordtree"
  },
  "r_textdiff": {
   "result": "Textdiff",
   "text": "What changed between two versions.",
   "link": "/templates/textdiff/",
   "linkLabel": "Open Textdiff"
  },
  "r_readscore": {
   "result": "Readscore",
   "text": "How easy a text is to read, as you type.",
   "link": "/templates/readscore/",
   "linkLabel": "Open Readscore"
  },
  "r_keyline": {
   "result": "Keyline",
   "text": "Every use of a word, lined up.",
   "link": "/templates/keyline/",
   "linkLabel": "Open Keyline"
  },
  "tools": {
   "q": "Which tool?",
   "options": [
    {
     "label": "Times in other countries",
     "to": "r_worldclock"
    },
    {
     "label": "A life or a plan in months",
     "to": "r_lifegrid"
    },
    {
     "label": "Sharing costs in a group",
     "to": "r_settleup"
    },
    {
     "label": "Comparing pack sizes and prices",
     "to": "r_unitprice"
    },
    {
     "label": "Seats and majorities",
     "to": "r_seatarc"
    },
    {
     "label": "Scores round by round",
     "to": "r_leaderboard"
    }
   ]
  },
  "r_worldclock": {
   "result": "Worldclock",
   "text": "Local times side by side; when is everyone at work?",
   "link": "/templates/worldclock/",
   "linkLabel": "Open Worldclock"
  },
  "r_lifegrid": {
   "result": "Lifegrid",
   "text": "A life as a grid of months.",
   "link": "/templates/lifegrid/",
   "linkLabel": "Open Lifegrid"
  },
  "r_settleup": {
   "result": "Settleup",
   "text": "Shared costs and the fewest payments.",
   "link": "/templates/settleup/",
   "linkLabel": "Open Settleup"
  },
  "r_unitprice": {
   "result": "Unitprice",
   "text": "Which pack is the best value.",
   "link": "/templates/unitprice/",
   "linkLabel": "Open Unitprice"
  },
  "r_seatarc": {
   "result": "Seatarc",
   "text": "Seats in a half circle; build a majority.",
   "link": "/templates/seatarc/",
   "linkLabel": "Open Seatarc"
  },
  "r_leaderboard": {
   "result": "Leaderboard",
   "text": "Standings round by round.",
   "link": "/templates/leaderboard/",
   "linkLabel": "Open Leaderboard"
  },
  "r_cohortgrid": {
   "result": "Cohortgrid",
   "text": "How many of each group are still active.",
   "link": "/templates/cohortgrid/",
   "linkLabel": "Open Cohortgrid"
  },
  "r_burndown": {
   "result": "Burndown",
   "text": "Work left, the plan and the finish date.",
   "link": "/templates/burndown/",
   "linkLabel": "Open Burndown"
  },
  "r_controlchart": {
   "result": "Controlchart",
   "text": "Normal ups and downs, or something unusual?",
   "link": "/templates/controlchart/",
   "linkLabel": "Open Controlchart"
  },
  "r_cumflow": {
   "result": "Cumflow",
   "text": "Work in each stage over time.",
   "link": "/templates/cumflow/",
   "linkLabel": "Open Cumflow"
  },
  "r_kpitiles": {
   "result": "Kpitiles",
   "text": "Headline numbers with change and trend.",
   "link": "/templates/kpitiles/",
   "linkLabel": "Open Kpitiles"
  },
  "r_abtest": {
   "result": "Abtest",
   "text": "Which of two versions works better.",
   "link": "/templates/abtest/",
   "linkLabel": "Open Abtest"
  },
  "basics": {
   "q": "Which plain chart?",
   "options": [
    {
     "label": "Parts of a whole, as a ring",
     "to": "r_donut"
    },
    {
     "label": "Parts of a whole, as 100 squares",
     "to": "r_waffle"
    },
    {
     "label": "Amounts across groups",
     "to": "r_barchart"
    },
    {
     "label": "Change over time",
     "to": "r_linechart"
    },
    {
     "label": "Parts of a total over time",
     "to": "r_areachart"
    },
    {
     "label": "Two measures of the same periods",
     "to": "r_combochart"
    }
   ]
  },
  "r_donut": {
   "result": "Donut",
   "text": "Parts of a whole as a ring.",
   "link": "/templates/donut/",
   "linkLabel": "Open Donut"
  },
  "r_barchart": {
   "result": "Barchart",
   "text": "Bars, side by side or stacked.",
   "link": "/templates/barchart/",
   "linkLabel": "Open Barchart"
  },
  "r_linechart": {
   "result": "Linechart",
   "text": "Lines over time; read every line at one point.",
   "link": "/templates/linechart/",
   "linkLabel": "Open Linechart"
  },
  "r_areachart": {
   "result": "Areachart",
   "text": "Piled-up amounts, as totals or shares.",
   "link": "/templates/areachart/",
   "linkLabel": "Open Areachart"
  },
  "r_combochart": {
   "result": "Combochart",
   "text": "Bars and a line on two scales.",
   "link": "/templates/combochart/",
   "linkLabel": "Open Combochart"
  },
  "r_waffle": {
   "result": "Waffle",
   "text": "100 squares, one per percent.",
   "link": "/templates/waffle/",
   "linkLabel": "Open Waffle"
  },
  "r_matchup": {
   "result": "Matchup",
   "text": "Match each item with its partner.",
   "link": "/templates/matchup/",
   "linkLabel": "Open Matchup"
  },
  "r_sequence": {
   "result": "Sequence",
   "text": "Put things in the right order.",
   "link": "/templates/sequence/",
   "linkLabel": "Open Sequence"
  },
  "r_fillgap": {
   "result": "Fillgap",
   "text": "Choose the word for each gap.",
   "link": "/templates/fillgap/",
   "linkLabel": "Open Fillgap"
  },
  "r_estimator": {
   "result": "Estimator",
   "text": "Guess a number; see how close you were.",
   "link": "/templates/estimator/",
   "linkLabel": "Open Estimator"
  },
  "r_masterygrid": {
   "result": "Masterygrid",
   "text": "Learners by skills; who needs help.",
   "link": "/templates/masterygrid/",
   "linkLabel": "Open Masterygrid"
  },
  "r_leitner": {
   "result": "Leitner",
   "text": "Flash cards in boxes.",
   "link": "/templates/leitner/",
   "linkLabel": "Open Leitner"
  },
  "r_paysplit": {
   "result": "Paysplit",
   "text": "Where a pay packet goes.",
   "link": "/templates/paysplit/",
   "linkLabel": "Open Paysplit"
  },
  "r_budgetplan": {
   "result": "Budgetplan",
   "text": "Needs, wants and savings against a plan.",
   "link": "/templates/budgetplan/",
   "linkLabel": "Open Budgetplan"
  },
  "r_debtplan": {
   "result": "Debtplan",
   "text": "Two ways to clear debts, compared.",
   "link": "/templates/debtplan/",
   "linkLabel": "Open Debtplan"
  },
  "r_sendmoney": {
   "result": "Sendmoney",
   "text": "How much arrives with each provider.",
   "link": "/templates/sendmoney/",
   "linkLabel": "Open Sendmoney"
  },
  "r_cashcalendar": {
   "result": "Cashcalendar",
   "text": "The balance through a month.",
   "link": "/templates/cashcalendar/",
   "linkLabel": "Open Cashcalendar"
  },
  "r_pricerise": {
   "result": "Pricerise",
   "text": "What rising prices do to money.",
   "link": "/templates/pricerise/",
   "linkLabel": "Open Pricerise"
  },
  "weather": {
   "q": "What about the weather?",
   "options": [
    {
     "label": "When the tide is high or low",
     "to": "r_tidecurve"
    },
    {
     "label": "Each year against the usual",
     "hint": "warming, rainfall",
     "to": "r_warmstripes"
    },
    {
     "label": "Where a storm went or is going",
     "to": "r_stormtrack"
    },
    {
     "label": "Sunburn risk through the day",
     "to": "r_uvday"
    },
    {
     "label": "How hot it feels with humidity",
     "to": "r_feelslike"
    },
    {
     "label": "The next few days",
     "to": "r_forecastrow"
    }
   ]
  },
  "r_tidecurve": {
   "result": "Tidecurve",
   "text": "Tide height through the day, the next high, and when the water is low.",
   "link": "/templates/tidecurve/",
   "linkLabel": "Open Tidecurve"
  },
  "r_warmstripes": {
   "result": "Warmstripes",
   "text": "One coloured stripe per year against the average.",
   "link": "/templates/warmstripes/",
   "linkLabel": "Open Warmstripes"
  },
  "r_stormtrack": {
   "result": "Stormtrack",
   "text": "A storm's path by category, and how close it comes to each place.",
   "link": "/templates/stormtrack/",
   "linkLabel": "Open Stormtrack"
  },
  "r_uvday": {
   "result": "Uvday",
   "text": "The UV index through a clear day, for any place and day.",
   "link": "/templates/uvday/",
   "linkLabel": "Open Uvday"
  },
  "r_feelslike": {
   "result": "Feelslike",
   "text": "How hot it feels from temperature and humidity, with the risk level.",
   "link": "/templates/feelslike/",
   "linkLabel": "Open Feelslike"
  },
  "r_forecastrow": {
   "result": "Forecastrow",
   "text": "The days ahead in rows: sky, rain chance, low to high.",
   "link": "/templates/forecastrow/",
   "linkLabel": "Open Forecastrow"
  },
  "sport": {
   "q": "What about the sport?",
   "options": [
    {
     "label": "How a match went, minute by minute",
     "to": "r_scoreworm"
    },
    {
     "label": "Where things happened on the pitch",
     "to": "r_pitchmap"
    },
    {
     "label": "Race times and pace",
     "hint": "running, swimming, cycling",
     "to": "r_splitpace"
    },
    {
     "label": "A knockout draw",
     "hint": "or predicting one",
     "to": "r_bracket"
    },
    {
     "label": "Who is playing where",
     "to": "r_teamsheet"
    },
    {
     "label": "A medal table",
     "to": "r_medaltable"
    }
   ]
  },
  "r_scoreworm": {
   "result": "Scoreworm",
   "text": "The score gap through a match, with lead changes and time in front.",
   "link": "/templates/scoreworm/",
   "linkLabel": "Open Scoreworm"
  },
  "r_pitchmap": {
   "result": "Pitchmap",
   "text": "Where tries, goals or shots happened, by team and kind.",
   "link": "/templates/pitchmap/",
   "linkLabel": "Open Pitchmap"
  },
  "r_splitpace": {
   "result": "Splitpace",
   "text": "Each split against a target pace, halves compared.",
   "link": "/templates/splitpace/",
   "linkLabel": "Open Splitpace"
  },
  "r_bracket": {
   "result": "Bracket",
   "text": "A knockout draw with winners carried forward and picks.",
   "link": "/templates/bracket/",
   "linkLabel": "Open Bracket"
  },
  "r_teamsheet": {
   "result": "Teamsheet",
   "text": "A rugby or football line-up on the pitch, or as a list.",
   "link": "/templates/teamsheet/",
   "linkLabel": "Open Teamsheet"
  },
  "r_medaltable": {
   "result": "Medaltable",
   "text": "A medal table ranked gold first or by total.",
   "link": "/templates/medaltable/",
   "linkLabel": "Open Medaltable"
  }
 }
};
