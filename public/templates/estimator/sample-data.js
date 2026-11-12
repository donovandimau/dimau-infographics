/* Real figures: worked out from the sun's position, map coordinates, the FijiLearn catalogue (exported 11 November 2026) and this library's catalogue. */
window.ESTIMATOR_DATA = {
 "questions": [
  {
   "id": "day",
   "q": "How many hours of daylight does Suva get on its longest day?",
   "min": 10,
   "max": 16,
   "step": 0.1,
   "decimals": 1,
   "answer": 13.2,
   "unit": "hours",
   "source": "Worked out from the sun’s position for 22 December 2026."
  },
  {
   "id": "dist",
   "q": "How far is it from Suva to Auckland in a straight line?",
   "min": 500,
   "max": 5000,
   "step": 10,
   "answer": 2110,
   "unit": "km",
   "source": "Great-circle distance between the two cities’ coordinates."
  },
  {
   "id": "years",
   "q": "How many years passed between the Deed of Cession and Independence?",
   "min": 50,
   "max": 150,
   "step": 1,
   "answer": 96,
   "unit": "years",
   "source": "10 October 1874 to 10 October 1970."
  },
  {
   "id": "courses",
   "q": "How many courses are in the published FijiLearn catalogue?",
   "min": 0,
   "max": 120,
   "step": 1,
   "answer": 40,
   "unit": "courses",
   "source": "FijiLearn catalogue, exported 11 November 2026."
  },
  {
   "id": "templates",
   "q": "How many templates does this library have now?",
   "min": 0,
   "max": 200,
   "step": 1,
   "answer": 133,
   "unit": "templates",
   "source": "This library’s catalogue, v1.22.0."
  }
 ]
};
