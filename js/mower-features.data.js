/* ============================================================================
   JJ Riggs — Mower feature accordions (PER MODEL)
   ----------------------------------------------------------------------------
   Key = the model name exactly as in mower-models.data.js (e.g. "MZ Rambler").
   Each entry: { heading, intro, items:[ {title, body, image} ] }
   Add `image` URL/path to show a photo beside the copy; leave "" for text-only.
   Models not listed fall back to no feature section.
   ============================================================================ */
window.MOWER_FEATURES = {

  "MZ Rambler": {
    heading: "Built tough, easy to live with",
    intro: "Bad Boy's smallest zero-turn — compact, agile, and built with the heaviest deck in its class.",
    items: [
      { title: "Heavy weight champion", body: "The MZ Rambler has the heaviest-built deck in its class for long-lasting durability. Bad Boy's formed-and-welded all-steel deck with reinforced edges won't bend or wobble under the stress of everyday mowing.", image: "JJ-RIGGS-ADS-BUILDER/badboy-images/rebel_feature.jpg" },
      { title: "Agile by design", body: "Our smallest zero-turn has some serious advantages. The 42-inch deck gives you optimal maneuverability — compact enough to fit through gates and perfect for weaving through tight spaces.", image: "JJ-RIGGS-ADS-BUILDER/badboy-images/zt_elite_mowing.jpg" },
      { title: "Built to fit you", body: "Pick which side you want the deck-lift pedal on, dial in a repeatable cut height time after time, and adjust the comfortable, cushioned seat for an even better ride.", image: "JJ-RIGGS-ADS-BUILDER/badboy-images/maverick_residential_12.jpg" }
    ]
  }

};
