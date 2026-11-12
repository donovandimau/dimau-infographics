/* Real reference: common claims about charts and numbers, with plain-language answers. */
window.VERDICT_DATA = {
 "claims": [
  {
   "id": "zero",
   "claim": "Every chart’s value axis must start at zero.",
   "verdict": "partly",
   "why": "Bar charts should, because readers compare bar lengths. A line chart can start higher when the change is what matters, as long as the axis is labelled."
  },
  {
   "id": "cause",
   "claim": "If two things rise together, one causes the other.",
   "verdict": "false",
   "why": "They may both be driven by something else, or move together by chance. A link is a reason to look closer, not proof."
  },
  {
   "id": "avg",
   "claim": "One very large number can make an average misleading.",
   "verdict": "true",
   "why": "The mean is pulled towards extreme values. The median, the middle value, is barely moved by them."
  },
  {
   "id": "points",
   "claim": "A rise from 10% to 15% is a rise of 5 percent.",
   "verdict": "false",
   "why": "It is a rise of 5 percentage points, which is a 50 percent increase on the 10% you started with."
  },
  {
   "id": "colour",
   "claim": "Colour alone is enough to tell groups apart.",
   "verdict": "false",
   "why": "About one man in twelve has some colour blindness, and printouts may be black and white. Add labels, patterns or words as well."
  },
  {
   "id": "pie",
   "claim": "A pie chart works for showing parts of one whole.",
   "verdict": "partly",
   "why": "It works for a few parts that add up to one whole. With many parts, or to compare sizes closely, bars are easier to read."
  }
 ]
};
