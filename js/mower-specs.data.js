/* ============================================================================
   JJ Riggs — Mower spec sheets (PER MODEL)
   ----------------------------------------------------------------------------
   Key = the model name exactly as in mower-models.data.js (e.g. "MZ Rambler").
   Each entry: { groups: [ {group, rows:[[label,value], ...]} ] }
   Models not listed here fall back to a short summary automatically.
   ============================================================================ */
window.MOWER_SPECS = {

  "MZ Rambler": {
    groups: [
      { group: "Engine & Drive", rows: [
        ["Engine", "Briggs & Stratton"],
        ["Fuel", "Gas"],
        ["Drive system", "Dual Hydro-Gear ZT 2200 integrated transaxles"]
      ]},
      { group: "Cutting Deck", rows: [
        ["Available deck", "42 in"],
        ["Deck construction", "3/16\" or 7-gauge all-steel, formed & welded"],
        ["Edges", "Reinforced"]
      ]},
      { group: "Frame", rows: [
        ["Construction", "Heavy-gauge, all-steel, all-welded"]
      ]},
      { group: "Class", rows: [
        ["Category", "Residential"],
        ["Type", "Zero-Turn"]
      ]}
    ]
  }

  /* Add more mowers here, keyed by model name. */

};
