# Perplexity prompt — pull JJ Riggs product data into a spreadsheet

Paste everything in the box below into Perplexity (use a model with web browsing).
Run it once for tractors+mowers; re-run with the implements category pages swapped in to cover those too.

---

You are a careful data-extraction assistant. I run **JJ Riggs Equipment** (jjriggsequipment.com), a Bad Boy + TYM dealer in Colville, WA. I'm building product-detail web pages and need every product's information pulled into a structured spreadsheet.

**TASK:** Visit the category pages below, list every product and its link, then open each product page and extract its details into **three CSV tables** (Products, Specifications, Features). Use ONLY information shown on the pages. Do not invent, estimate, or round numbers. If a value isn't present, leave the cell blank.

**CATEGORY PAGES — enumerate every product + URL from these:**
- https://jjriggsequipment.com/branson-tym-tractors/
- https://jjriggsequipment.com/bad-boy-mowers/

Also include any items linked under "Related products" on individual pages.

**SAMPLE PRODUCT PAGES — use these to learn the page layout (title, intro sentence, headline specs, the "Additional information" table, the photo gallery, and the features section):**
- https://jjriggsequipment.com/equipment/branson-tym-t224-sub-compact-tractor/
- https://jjriggsequipment.com/equipment/branson-tym-4820-tractor/
- https://jjriggsequipment.com/equipment/branson-tym-t115-utility-tractor/
- https://jjriggsequipment.com/equipment/bad-boy-avenger-mower/

**STEP 1 — Coverage check:** First output a simple list of every product you found (brand, model, URL) so I can confirm nothing's missing. Then produce the three tables.

**STEP 2 — Output these three CSV tables, each in its own code block, with these EXACT headers.** Wrap any value containing a comma in double quotes.

### TABLE 1 — PRODUCTS (one row per product)
`brand,type,model,series_or_category,title,short_description,price,hp,engine_make,drive,transmission,lift_capacity,station,deck_sizes,fuel,weight,key_specs_other,product_url,primary_image_url,gallery_image_urls`

- **brand:** TYM, Bad Boy, etc.
- **type:** tractor or mower (or implement)
- **model:** short model name only — e.g. `T224`, `4820`, `T115`, `Avenger`
- **series_or_category:** tractors → Sub-Compact / Compact / Utility; mowers → Residential or Commercial + style (e.g. "Residential · Zero-Turn")
- **title:** the product name (H1) exactly as shown
- **short_description:** the intro sentence(s) shown under the title
- **price:** only if a dollar price is displayed; otherwise blank
- **hp:** engine/PTO horsepower number (e.g. `21.5`)
- **engine_make:** e.g. Yanmar diesel
- **drive:** e.g. 4WD
- **transmission:** e.g. Hydrostatic
- **lift_capacity:** 3-point or loader lift capacity (e.g. `1,100 lb`)
- **station:** Open or Cab (tractors)
- **deck_sizes:** mower deck widths in inches, e.g. `54, 61, 72`
- **fuel:** Diesel / Gas
- **weight:** if listed
- **key_specs_other:** any other headline specs not covered above, formatted `label: value; label: value`
- **product_url:** full URL of the product page
- **primary_image_url:** full URL of the main product photo
- **gallery_image_urls:** ALL product photo URLs, separated by ` | ` (a space-pipe-space)

### TABLE 2 — SPECIFICATIONS (long format — multiple rows per product)
`brand,model,spec_group,spec_label,spec_value`

- One row per spec line found in the product's spec / "Additional information" section.
- **spec_group:** group under a sensible heading when the page implies one (Engine, Drivetrain, Transmission, Hitch & PTO, Hydraulics, Dimensions, Operator Station, etc.). If the page lists specs without groups, use `General`.
- Copy label and value verbatim.

### TABLE 3 — FEATURES (long format — multiple rows per product)
`brand,model,order,feature_title,feature_body,feature_image_url`

- One row per item in the product's "features" / highlights section (the expandable list).
- **order:** 1, 2, 3… in the order shown.
- **feature_body:** the paragraph text for that feature, verbatim.
- **feature_image_url:** full URL of the image shown for that feature (blank if none).

**RULES:**
- Cover EVERY product on both category pages (and related links). Don't stop at the samples.
- Copy text verbatim. Never fabricate or guess specs, numbers, or images.
- Use full absolute URLs for all images and pages.
- Blank cells for anything missing — don't write "N/A".
- Keep `model` consistent between all three tables so the rows can be matched.

---

## Notes for later (how this maps to the templates)
- **Table 1** fills the page header + the black highlight box (hp, lift, drive, transmission) + the photo gallery (`gallery_image_urls`).
- **Table 2** becomes the grouped spec cards (each `spec_group` = one card).
- **Table 3** becomes the Features tab (title + body + image per item).
- To cover implements, re-run with these category pages instead:
  `https://jjriggsequipment.com/implements/` (plus brand sites for IronCraft / Braber / CID as needed).
