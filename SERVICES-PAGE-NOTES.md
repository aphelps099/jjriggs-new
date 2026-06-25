# Services Page — Build Notes

_Captured June 17, 2026. To-do for the new `/services/` page._

## Services hero — RED background, transparent nav
The services hero now uses a **red gradient background** (`--red` → `--red-deep`) so the
**transparent nav works** — the white JJ Riggs logo and light nav links read on red.
Header `::before` dark gradient is hidden on this page. Hero CTAs are adjusted for red:
"Get a Quote" is a **white** button (red would vanish), "Schedule Service" is a white-outline ghost.
(Earlier cream-background idea dropped; no dark logo needed.)

## 1. Move the "Rock-solid customer service" section to the service page

The homepage block headed **"Rock-solid customer service."** (the `.andrew` section,
`id="andrew-h"`, with Andrew's photo) is to be **moved off the homepage and onto the
new services page.** Remove it from `index.html` when the services page is built.

## 2. Services page copy (client-provided)

### Hero
**Our Services**
JJ RIGGS offers expert repairs, quality parts, and flexible solutions for your equipment needs.

### Repairs & Parts
At JJ Riggs Equipment, we understand that when your machinery breaks down, it can put your
plans on hold. The repair technicians at JJ Riggs successfully repair many types of outdoor
power equipment. Tractors are our specialty, but we also work on heavy equipment like
excavators, dozers, big rigs, and farm trucks. In addition to diesel repairs, welding and
fabrication are regular parts of what we do to get our customers back to work.

CTA: **GET A QUOTE** → https://jjriggsequipment.com/request-a-quote/

### Callout — Attention Branson Tractor Owners
**Did you know?** JJ Riggs continues to provide full parts and service support for all Branson tractors!

Your Branson tractor is part of the TYM family. In fact, many popular Branson models like the
**3515, 4815, and 5520** continue under the same model numbers as TYM tractors — the only
difference is the decal. Whether you have a classic Branson or a new TYM, our factory-trained
technicians have the expertise and parts to keep your tractor running at peak performance.

CTA: **Schedule Service** → https://jjriggsequipment.com/schedule-service-repair/

### Why JJ RIGGS?
- **Certified Repair Technicians** — experienced crew trained to handle complex repairs on various types of equipment.
- **Diesel Repairs & Welding Services** — diesel engine repairs plus welding and fabrication to fix or enhance components, getting you back to work quickly.
- **Comprehensive Solutions** — from diagnostics and preventive maintenance to major overhauls, a full range of repair services.
- **Quality OEM Parts** — high-quality original-manufacturer parts for the longevity and reliability of your machinery.

### Contact / footer (already in the design system)
685 Elm Tree Dr, Colville, WA 99114 · sales@jjriggsequipment.com · 509-738-2985
Hours: Mon–Fri, 8 AM to 5 PM
Get Directions → https://www.google.com/maps/dir/?api=1&destination=48.464410,-117.884290

### Nav (current live site, for reference)
Tractors · Implements · Mowers · Sheds (colvillesheds.com) · Services · Get a Quote
