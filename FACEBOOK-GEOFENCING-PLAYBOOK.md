# JJ Riggs Equipment
## Facebook Advertising + Geofencing Playbook

**Version:** 1.1 (amended after repo verification — see change log at the end)  
**Prepared:** July 2026  
**Primary market:** Colville, Kettle Falls, Chewelah, and northern Stevens County, Washington  
**Primary conversion:** A qualified phone call, quote request, or scheduled lot visit  
**Recommended test period:** 90 days

> **Companion reading:** `ADS-FUNDAMENTALS.md` explains the mechanics behind
> every decision in this playbook — the ad auction, the learning phase,
> attribution, geo-targeting resolution, and how true geofencing actually
> works. Read it once before running a campaign; it is what makes this
> playbook's rules make sense instead of feeling arbitrary.

---

## 1. What we are trying to accomplish

JJ Riggs does not need “more impressions.” It needs more conversations with
nearby property owners who are actively considering a tractor, mower,
implement, service work, or a package purchase.

The advertising system should:

1. Make JJ Riggs visible to qualified buyers within a realistic driving
   distance of Colville.
2. Defend the local market against nearby Kubota, KIOTI, mower, and outdoor
   power-equipment dealers.
3. Promote real equipment that is available or available to order.
4. Turn inventory data and lot photos into repeatable Facebook ads.
5. Send prospects to a useful product page, quote form, phone number, or lot
   appointment—not to a generic homepage with no next step.
6. Track which ads produce qualified leads, quotes, visits, and sales.
7. Give Andrew a simple role: identify the equipment and promotion, approve
   the ad, and follow up with the lead.

The business goal is:

> Generate trackable sales conversations and lot visits from rural northeast
> Washington buyers, then learn which equipment, offers, locations, and
> messages produce profitable sales.

---

## 2. Four activities that must not be confused

### A. Organic Facebook inventory posting

This is the system already described in `FACEBOOK-POSTING.md`.

- Andrew checks `post_fb` in the inventory sheet.
- The system creates a normal post on the JJ Riggs Facebook business Page.
- No advertising budget is involved.
- The post can later be used as creative or social proof for a paid ad.

Organic posting keeps the Page active. It is not geofencing and it is not a
paid campaign.

### B. Paid Meta location advertising

These are ads purchased through Meta Ads Manager and shown on Facebook and
Instagram.

Meta can target people within selected geographic areas. This is often called
“Facebook geofencing,” but it is better described as **location or radius
targeting**. It is useful for reaching the Colville trade area.

**Resolution limit (important):** Meta's smallest targeting unit is roughly a
1-mile radius around a map pin — coarser still if an ad is classified as a
credit/financing ad. In a market the size of Colville, a radius around a
competitor's lot and the core local audience are **the same people**. Meta
therefore cannot deliver meaningful competitor-lot targeting here; that job
belongs to true geofencing (D below) if Andrew wants it at all.

### C. Retargeting

Retargeting shows paid ads to people who have already interacted with JJ Riggs,
including:

- Website visitors
- Product-page visitors
- Facebook or Instagram engagers
- Video viewers
- People who opened but did not submit a Meta lead form

Retargeting becomes useful after enough traffic has accumulated. It should not
consume much budget on day one.

### D. True geofencing

True geofencing uses mapped physical properties or location-visit data to
build an audience or measure visits. A platform such as GroundTruth may be
used for this. Meta alone should not be presented as exact property-level,
device-visit geofencing.

True geofencing is a separate media buy, setup process, and reporting system.
It should be added only after Andrew confirms that this is what he means by
“get the geofencing ads going again.”

---

## 3. Recommended strategy in one page

### Phase 1: Meta location campaign

Run a 90-day Facebook and Instagram lead campaign.

- **Campaign goal:** qualified quote requests, phone calls, and lot visits
- **Core geography:** Colville, Kettle Falls, Chewelah, and northern Stevens
  County
- **Starting media budget:** $25–$35 per day, paid directly by JJ Riggs
- **Audience structure:** one core local audience, full budget. (v1.1 change:
  the earlier competitor-area ad set was removed — Meta's ~1-mile minimum
  radius makes a "competitor area" in Colville/Chewelah identical to the core
  audience, so a second ad set would only split the budget against itself and
  starve Meta's learning phase. Competitor targeting moves to Phase 3.)
- **Creative:** three clear ad angles using real local people and equipment
- **Landing experience:** product page or prefilled quote form
- **Measurement:** Meta, GA4, UTMs, call tracking, and a dealership lead log

### Phase 2: Retargeting

Add a small retargeting audience after the site and Page have enough traffic.
Show specific inventory, service reassurance, testimonials, and reminder ads.

### Phase 3: True geofencing pilot

If Andrew confirms that he wants property-level competitor or event targeting,
run a separate six-to-eight-week pilot through a qualified geofencing
platform. Keep its budget and results separate from Meta.

---

## 4. Known competitor research

The following locations were verified from the businesses' own websites in
July 2026. Addresses and brands must be rechecked immediately before campaign
launch.

| Business | Address | Competitive overlap | Research takeaway |
|---|---|---|---|
| **Adams Tractor Colville** | 635 Hwy 395 S, Colville, WA 99114 | Kubota tractors; implements; lawn and garden; parts and service | JJ Riggs must compete against a long-established dealer with packages, price-led offers, service, and broad brand recognition. |
| **Hartill's Mountain Saw & Tractor** | 101 W Robert Ave, Chewelah, WA 99109 | KIOTI tractors; Bush Hog, Erskine and Rankin implements; outdoor power equipment; parts and service | JJ Riggs can position TYM, Bad Boy, local support, straightforward guidance, delivery, and real owner involvement. |
| **JJ Riggs Equipment** | 685 Elm Tree Dr, Colville, WA 99114 | TYM tractors; Bad Boy mowers; implements; repair, financing and delivery | This is the conversion location and the center of the local service-area campaign. |

**How this research is actually used (v1.1 clarification):** Adams Tractor is
about two miles from JJ Riggs, and Chewelah (Hartill's) is already inside the
core service area. Competitor research here does NOT feed a Meta "competitor
ad set" — it feeds (a) ad positioning (the questions below), and (b) the
polygon target list for a true-geofencing pilot (Section 14), if Andrew
approves one. The list is also likely incomplete: the trade area extends
south toward Deer Park and Spokane and east into the Idaho panhandle, where
Kubota, Deere, and KIOTI dealers compete for the same buyers. Research those
before any geographic expansion (Section 22).

### What the ads should learn from competitors

Do not copy competitor branding and do not mention competitors in ad copy.
Instead, answer the questions their positioning creates:

- Why should someone consider TYM instead of defaulting to Kubota or KIOTI?
- Can JJ Riggs help choose the correct tractor and implements?
- Is service available after the sale?
- Can Andrew explain the machine without sales pressure?
- Is the equipment actually on the lot or available to order?
- Are financing, delivery, implements, and setup available?

### Competitor research checklist

Before each 90-day campaign cycle:

1. Confirm the business is still operating at the listed address.
2. Save the exact map pin and latitude/longitude.
3. Record the tractor, mower, implement, service, and financing brands shown.
4. Review the competitor's website promotions.
5. Review its public Facebook Page and recent ad themes.
6. Record whether it leads with price, financing, inventory, service, or
   heritage.
7. Screenshot the research with the date.
8. Add the finding to the targeting worksheet.
9. Never use an unverified address in a paid campaign.

### Additional location categories to research

These are research categories, not automatically approved targeting locations:

- Farm and ranch supply stores
- Feed stores
- Implement and attachment dealers
- Equipment auctions
- County fairgrounds and agricultural events
- Large rural-property and hobby-farm corridors
- Areas with meaningful concentrations of 2–20 acre properties

Do not add a location merely because it seems relevant. Confirm that the
audience and likely buyer behavior fit JJ Riggs.

---

## 5. Targeting worksheet schema

Keep the targeting worksheet in the shared Google Sheet workflow Andrew
already uses (NOT committed to this repo — see Section 19). Columns:

```csv
location_name,location_type,address,city,state,zip,latitude,longitude,brand_overlap,reason_to_target,meta_target_method,true_geofence_method,status,last_verified,source_url,notes
Adams Tractor Colville,competitor,635 Hwy 395 S,Colville,WA,99114,,,Kubota tractors and equipment,Direct local tractor competitor,None — radius overlaps core audience,Property polygon,RESEARCHED,2026-07-13,https://www.adamstractor.com/,Verify map pin before launch
Hartill's Mountain Saw & Tractor,competitor,101 W Robert Ave,Chewelah,WA,99109,,,KIOTI tractors and implements,Direct southern service-area competitor,None — inside core audience already,Property polygon,RESEARCHED,2026-07-13,https://www.hartills.com/,Verify map pin before launch
JJ Riggs Equipment,conversion,685 Elm Tree Dr,Colville,WA,99114,,,TYM and Bad Boy,Store visit conversion location,Core service area,Conversion polygon,APPROVED,2026-07-13,https://jjriggsequipment.com/,Primary conversion location
```

Allowed status values:

- `RESEARCH`
- `RESEARCHED`
- `APPROVED`
- `ACTIVE`
- `PAUSED`
- `RETIRED`

No target may move to `ACTIVE` without an address check and Andrew's approval.

---

## 6. Responsibilities

### Andrew / JJ Riggs

- Owns the Meta Business Portfolio, Page, Instagram account, ad account, and
  payment method.
- Identifies the priority equipment and approved offer.
- Supplies accurate financing terms and expiration dates.
- Approves creative before it runs.
- Names one person responsible for every incoming lead.
- Records whether leads became quotes, visits, or sales.

### Aaron / campaign manager

- Performs competitor and audience research.
- Builds the campaign and tracking.
- Produces or assembles approved creative.
- Checks delivery, lead quality, budget, and technical errors.
- Reports weekly and recommends changes.
- Does not promise exact sales volume or exact store-visit attribution.

### Sales lead owner

- Responds to each new lead within one business hour.
- Calls, texts, or emails based on the information provided.
- Makes follow-up attempts on day 0, day 1, and day 3 when appropriate.
- Updates the lead log with equipment interest and outcome.

Do not launch until a lead owner is named. Advertising cannot compensate for
unanswered calls or ignored forms.

---

## 7. Access and ownership setup

Complete this once with Andrew.

### Meta business assets

1. Sign in to the Meta business account that owns the JJ Riggs Facebook Page.
2. Confirm the business owns the Page—not Aaron's personal account.
3. Connect the JJ Riggs Instagram account.
4. Create or confirm the JJ Riggs ad account.
5. Set the correct business name, timezone, and currency.
6. Have Andrew add JJ Riggs's payment method directly.
7. Give Aaron partner or employee access needed to manage campaigns.
8. Require two-factor authentication.
9. Record the Business Portfolio ID, ad account ID, Page ID, Instagram ID,
   dataset/pixel ID, and domain verification status in a private credential
   record. Do not commit tokens, passwords, or payment information to GitHub.

### Website assets

Confirm access to:

- Cloudflare Pages project
- `aphelps099/jjriggs-new`
- GA4 property
- Google Tag Manager, if used
- Domain/DNS settings
- Resend lead-form environment variables
- Call-tracking provider

### Previous campaign recovery

Ask Andrew for:

- Previous geofencing vendor name
- Previous invoices
- Old campaign reports
- Old creative
- Meta ad account access
- Prior target list
- Prior monthly spend
- Any known sales attributed to the campaigns

Do not rebuild an unknown past campaign until this recovery step is complete.

---

## 8. Website tracking work required in `jjriggs-new`

The repo already has useful foundations:

- `js/analytics.js` defines GA4 events for call clicks, contact-page views,
  quote/service intent, and form interactions.
- `contact.html` provides quote, visit, and service forms.
- `functions/api/lead.js` emails successful leads to JJ Riggs.
- Product and local town pages can serve as campaign landing pages.

**However (v1.1 correction — verified against the repo): GA4 is not actually
live today.** Two gaps must be closed before any paid campaign:

1. `js/analytics.js` still contains the placeholder measurement ID
   (`GA_ID = 'G-XXXXXXXXXX'`), so every event currently goes to a console
   stub, not to GA4.
2. The script is loaded on only 12 of 28 root pages. The missing pages
   include the ones that matter most: `index.html`, `contact.html` (the
   conversion page — its `schedule_view` event can never fire today),
   `product.html`, `financing.html`, and `services.html`.

There is no Meta Pixel anywhere in the repo, and no UTM handling. There is
also **no shared HTML include** — this is a zero-build static site where each
page carries its own `<script>` tags. The closest thing to a shared hook is
`header.js` (loaded on 21 pages). Decide deliberately: either inject
analytics + pixel from `header.js`, or edit every public page (root pages
plus each `implements/*/index.html`). Do the analytics.js coverage fix and
the pixel install in the same pass.

### Phase 0: Make GA4 real (prerequisite)

1. Set the real GA4 measurement ID in `js/analytics.js`.
2. Add `js/analytics.js` to every public page (or inject via `header.js`).
3. Verify `call_click`, `schedule_view`, and form events arrive in GA4
   real-time reports from a phone.

### Phase A: Minimum viable measurement

1. Create `js/meta-ads.js` as the shared Meta tracking module.
2. Load the Meta base pixel on all public pages using the same injection
   mechanism chosen in Phase 0.
3. Record `PageView` on every page.
4. Record `ViewContent` on tractor, mower, implement, and product pages.
5. Record `Lead` **only after** `/api/lead` returns success.
6. Record call-button clicks as a contact event, while retaining the existing
   GA4 `call_click` event.
7. Test every event with Meta's testing tools before launch.

Do not record a lead when someone merely opens or clicks the form.

### Phase B: Campaign attribution

1. Preserve these URL parameters when a visitor arrives:
   - `utm_source`
   - `utm_medium`
   - `utm_campaign`
   - `utm_content`
   - `utm_term`
   - `fbclid`
2. Store them for the visitor's session.
3. Add them to the successful `/api/lead` payload.
4. Add the fields to the email sent to the sales team.
5. Add a human-readable “Marketing source” section to the lead email.

### Phase C: Server-side confirmation

After browser tracking works, consider sending a matching server-side Meta
Conversions API `Lead` event from the successful lead endpoint. Use a shared
event ID to deduplicate browser and server events. Review privacy disclosures,
data handling, consent requirements, and Meta's current implementation rules
before shipping.

### Call tracking

Use one campaign phone number that forwards to `509-738-2985`.

- Show the tracking number only to paid-campaign visitors where practical.
- Keep the canonical dealership number everywhere else.
- Record call time, duration, source, and campaign.
- Do not record calls without satisfying applicable notification and consent
  requirements.

---

## 9. UTM naming rules

Use lowercase, short, stable values.

Example:

```text
utm_source=facebook
utm_medium=paid_social
utm_campaign=2026_q3_local_equipment
utm_term=core_colville
utm_content=tym_t474h_local_service_4x5_v1
```

Geofencing-pilot example (if Phase 3 runs — different source so the two
media buys never blur in reporting):

```text
utm_source=groundtruth
utm_medium=geofence
utm_campaign=2026_q4_competitor_pilot
utm_term=polygon_adams
utm_content=tym_compact_display_300x250_v1
```

Never rename a live campaign merely to make it look cleaner. Stable names make
reporting reliable.

---

## 10. Campaign structure

Keep the first campaign small enough to understand.

### Campaign

- **Name:** `2026_Q3_JJR_LEADS_LOCAL_EQUIPMENT`
- **Objective:** Leads
- **Primary result:** successful quote request
- **Secondary results:** qualified call and scheduled lot visit
- **Initial test:** 90 days

Use the website conversion location when tracking is verified. A Meta instant
form may be tested separately if website volume or form completion is poor.
Do not combine instant-form and website-lead results without labeling them.

### Ad set 1: Core local market

- **Name:** `CORE_NORTH_STEVENS`
- Colville
- Kettle Falls
- Chewelah
- Northern Stevens County locations within a realistic buying/service radius
- Start broad enough for delivery; do not narrow the audience with many
  interests unless there is enough volume
- Creative is primarily designed for rural property owners ages 50–65+, but
  do not unnecessarily exclude qualified women or younger property owners

Allocate 100% of the starting budget here.

### Why there is no "competitor area" ad set (v1.1 change)

Version 1.0 proposed a second ad set targeting radii around Adams Tractor and
Hartill's. It was removed because the geometry doesn't work:

- Adams Tractor is ~2 miles from JJ Riggs; Meta's minimum radius (~1 mile,
  larger for credit-classified ads) around it targets the same Colville
  population as the core ad set.
- Hartill's is in Chewelah — which the core audience already includes.
- Two ad sets over the same people bid against each other in Meta's auction
  and split an already-small budget below what the learning phase needs.

If competitor targeting matters to Andrew, it happens via property polygons
on a true-geofencing platform (Section 14), not via Meta. Two rules from the
removed ad set still apply everywhere: never use competitor names in ad copy,
and never write copy implying JJ Riggs knows where a person has been.

### Retargeting ad set

Create only after the audience is large enough to deliver.

Potential sources:

- 30-, 60-, or 90-day website visitors
- Product-page visitors
- Facebook and Instagram engagers
- Meaningful video viewers
- Lead-form opens without submission, where available

Exclude recent successful leads when the data is reliable and appropriate.

### Placements

Begin with Meta's recommended automatic placement system, while supplying
correct 4:5 and 9:16 creative. Review actual placement quality weekly. Remove
a placement only when the data or creative failure justifies it.

---

## 11. Simple Ads Manager launch procedure

Meta changes labels and menus regularly. Treat these as operational steps,
not permanent screenshots.

1. Open the JJ Riggs ad account in Meta Ads Manager.
2. Click **Create**.
3. Choose the **Leads** objective.
4. Name the campaign using the naming convention above.
5. Turn off unnecessary tests or automated additions for the first controlled
   launch.
6. At the ad-set level, choose the website as the conversion location if the
   pixel and Lead event are verified.
7. Select the correct dataset/pixel and Lead conversion event.
8. Set a daily budget of $25–$35 on the single core ad set.
9. Build `CORE_NORTH_STEVENS` with the approved service-area locations.
10. Review the estimated audience and remove unnecessary demographic or
    interest restrictions.
11. Use automatic placements and upload both 4:5 and 9:16 assets.
12. Add three approved ads to the ad set.
13. Add the precise landing URL and UTMs.
14. Verify the phone number, offer, stock status, expiration date, and fine
    print.
15. Preview every Facebook and Instagram placement.
16. Submit the ads for review.
17. After approval, click through each live ad and submit one test lead.
18. Confirm the test appears in Meta, GA4, the lead email, and the sales log.

Do not declare the campaign live until step 18 passes.

---

## 12. Creative playbook

### Audience

The primary creative audience is a 50–65+ rural northeast Washington property
owner who values practical guidance, service after the sale, and equipment
that fits the job. The ad should feel local and useful, not like a national
manufacturer campaign.

### Visual rules

- One person and one machine whenever possible
- Real northeast Washington lot, lawn, field, snow, gravel, or property context
- Real JJ Riggs inventory
- Correct model photo—never substitute another model
- Large readable type for a phone screen
- Strong contrast
- No cluttered grid of equipment
- No fake veteran-owned or veteran-operated claim
- No invented price, spec, rebate, financing term, or deadline
- 4:5 for feed and 9:16 for Stories/Reels
- Make the phone number and next step obvious

### Ad angle 1: Local guidance and service

**Purpose:** Differentiate JJ Riggs from a large dealership experience.

Possible message structure:

- Hook: `BUY THE RIGHT TRACTOR.`
- Support: Local help choosing the tractor and implements that fit the work.
- Proof: Family business in Colville, service after the sale, delivery
- CTA: Call Andrew or request a quote

### Ad angle 2: Specific in-stock equipment

**Purpose:** Capture active shoppers.

Possible message structure:

- Hook: `ON THE LOT IN COLVILLE.`
- Product: Exact brand and model
- Facts: No more than three verified facts
- CTA: See it, call, or request a quote

### Ad angle 3: Approved offer

**Purpose:** Give a buyer a reason to act now.

Possible message structure:

- Hook: `0% FINANCING OR CASH REBATES`
- Product/category: Approved eligible equipment only
- Deadline and fine print: Supplied by Andrew or the lender
- CTA: Ask Andrew which option applies

Before launching financing copy, review Meta's current classification and
special-category requirements. If Meta treats the promotion as credit-related
advertising, available targeting controls may change.

### Ad angle 4: Buyer reassurance

Use customer evidence already visible on the website:

- Andrew explains equipment and helps after purchase
- Honest and straightforward assistance
- Support choosing and using the correct tractor
- Service and implements in one local relationship

Use only review text the business has permission to reuse. Do not alter the
meaning of a testimonial.

---

## 13. How the Quick Ad Builder should support paid campaigns

`QUICK-AD-BUILDER-PLAN.md` already defines inventory-driven, locked ad
templates. Add a **Paid Campaign Package** output rather than turning the
builder into Ads Manager.

For every approved creative job, the builder should save or export:

- `campaign_id`
- Brand and model snapshot
- Stock status at approval
- Promotion name
- Promotion end date
- Approved financing disclaimer
- Hook
- Primary ad text
- Headline
- CTA
- Landing URL
- Audience label
- UTM string
- 4:5 asset
- 9:16 asset
- Optional 16:9 asset
- Approval person and timestamp
- Version number

Recommended campaign job states:

`Draft → Needs Facts → Needs Media → Ready for Review → Approved → Uploaded → Live → Paused → Archived`

Do not automatically publish paid ads from an inventory checkbox. Paid ads
need a budget, audience, landing URL, tracking, offer verification, and human
approval.

Organic `post_fb` automation and paid-ad publishing must remain separate.

---

## 14. True geofencing setup

Use this only if Andrew confirms that property-level competitor or event
targeting is required.

### Suggested pilot

- **Duration:** 6–8 weeks
- **Initial media:** approximately $1,500, subject to platform requirements
- **Conversion location:** JJ Riggs Equipment
- **Target candidates:** Adams Tractor Colville, Hartill's, and separately
  approved agricultural events or retail locations
- **Creative:** local dealer, equipment, offer, and service—not competitor
  confrontation
- **Reporting:** impressions, clicks, website visits, qualified leads, and
  measured store visits where the platform supports a defensible methodology

### Setup steps

1. Confirm the previous geofencing vendor and recover the old reports.
2. Select a platform and document its minimums, contracts, data source,
   privacy terms, attribution window, and store-visit methodology.
3. Create exact property maps for approved competitor locations.
4. Create the JJ Riggs location as the conversion property.
5. Check that polygons do not include unrelated homes, roads, or businesses.
6. Choose whether to target recent visitors, serve ads near the property, or
   measure visits—these are different products.
7. Upload approved display, mobile, or social creative in the platform's
   required sizes.
8. Add UTMs to every click-through URL.
9. Set frequency limits to avoid overwhelming a small rural audience.
10. Launch one controlled test rather than many small fences.
11. Confirm website visits and leads independently of the vendor's dashboard.
12. Compare the result with the Meta local campaign.

Do not describe modeled or attributed store visits as a list of identifiable
people. Do not imply perfect accuracy.

---

## 15. Lead handling

Create a shared lead register with these columns:

```csv
lead_date,lead_name,phone,email,equipment_interest,source,campaign,audience,creative,call_or_form,qualified,quote_amount,lot_visit,sold,revenue,gross_profit,follow_up_owner,notes
```

### Qualification definition

A lead is qualified when the person:

- Is reachable
- Has a plausible equipment or service need
- Is located within the serviceable market, or has a reasonable delivery plan
- Has a purchase timeframe or meaningful research intent
- Wants a quote, conversation, demonstration, financing information, or visit

Spam, wrong numbers, vendors, and unrelated requests are not qualified leads.

### Follow-up standard

1. Respond within one business hour.
2. Ask about property, work, acreage, terrain, attachments, timing, delivery,
   and budget/financing needs.
3. Recommend the next step, not merely a model.
4. Record the result.
5. Follow up again when a useful answer, machine, or promotion becomes
   available.

---

## 16. Reporting and decision rules

### Weekly report

Report:

- Spend
- Reach and frequency
- Landing-page views
- Calls
- Quote forms
- Qualified leads
- Cost per qualified lead
- Scheduled visits
- Quotes issued
- Sales and known gross profit
- Best audience
- Best creative
- Tracking or follow-up problems
- One change planned for the next week

### Do not optimize around vanity metrics

Low-cost clicks are not success when visitors never call or request a quote.
The campaign is judged by qualified leads, quotes, visits, and sales.

### Determine the maximum qualified-lead cost

Use:

```text
Maximum qualified-lead cost
= average gross profit per sale
× qualified-lead close rate
× acceptable marketing share of gross profit
```

Example only:

```text
$3,000 average gross profit
× 10% lead close rate
× 25% marketing share
= $75 maximum qualified-lead cost
```

Andrew must provide real gross-profit and close-rate assumptions before this
becomes a campaign rule.

### Optimization rules

- First check tracking and lead follow-up before blaming the ads.
- Do not make several major changes at the same time.
- Compare audience tests using the same creative when possible.
- Pause incorrect, expired, or out-of-stock ads immediately.
- Move budget toward ads producing qualified leads, not merely clicks.
- Refresh creative when frequency rises and response deteriorates.
- Increase a winning budget gradually rather than doubling it overnight.
- Record every important campaign change with date and reason.

---

## 17. The 90-day operating plan

### Days 1–10: Foundation

- Recover old campaign/vendor information
- Approve the new paid-media scope and budget
- Confirm Meta asset ownership and access
- Name the lead owner
- Install and test measurement
- Verify competitor locations
- Choose three priority equipment offers
- Build the first creative set
- Establish the lead register

### Days 11–30: Controlled launch

- Launch the single core local ad set
- Test every lead route
- Review delivery and errors daily
- Review lead quality with Andrew weekly
- Establish the baseline cost per qualified lead
- Correct weak landing pages, broken tracking, or unclear offers

### Days 31–60: Improve

- Move budget toward the stronger location/audience
- Replace weak creative
- Add inventory-specific ads
- Add retargeting if the audience can deliver
- Compare calls, forms, visits, quotes, and sales
- Decide whether a true-geofencing pilot is justified

### Days 61–90: Prove and decide

- Scale the best combinations carefully
- Refresh stale creative
- Calculate the full lead-to-sale result
- Compare Meta local targeting with any geofencing pilot
- Decide what continues, stops, or changes for the next quarter
- Produce a one-page 90-day findings report

---

## 18. Andrew's simple weekly workflow

### Monday

Andrew identifies:

- Up to three machines or categories to emphasize
- Current stock status
- Promotion and deadline
- Approved fine print

### Tuesday

Aaron generates or updates the ads and verifies the landing pages and UTMs.

### Wednesday

Andrew approves the exact ad. Aaron publishes or updates the campaign.

### Daily

The assigned sales owner responds to leads and updates the register.

### Friday

Aaron sends a short report:

- What spent
- What produced qualified interest
- What did not
- What changes next week
- What Andrew needs to approve or supply

---

## 19. Repo structure (v1.1: follows this repo's conventions)

This repo keeps all documentation at the root (`FACEBOOK-POSTING.md`,
`QUICK-AD-BUILDER-PLAN.md`, etc.), so the marketing docs do too:

```text
FACEBOOK-GEOFENCING-PLAYBOOK.md   # this file
ADS-FUNDAMENTALS.md               # how the machinery works (companion)

js/
  meta-ads.js                     # Meta pixel + UTM capture (Phase A/B)

functions/
  api/
    lead.js                 # extend with attribution; later CAPI if approved
```

**Registers stay OUT of the repo.** The lead register and campaign register
contain PII (names, phone numbers, quote amounts, gross profit). They live in
the shared Google Sheet workflow Andrew already uses for inventory — never in
GitHub. The same applies to the targeting worksheet (Section 5) and weekly
reports. Only *schemas and templates* may be documented here.

`USER-GUIDE.md` should link to this playbook, but not duplicate it.

### Campaign register fields (schema for the Google Sheet)

```csv
campaign_id,platform,objective,start_date,end_date,status,daily_budget,audience,offer,landing_url,utm_campaign,lead_owner,creative_version,last_change,last_change_reason
```

### Change log rule

Every major paid-media change records:

- Date
- Person
- Campaign/ad set/ad
- What changed
- Why
- Expected result
- Actual result when known

This prevents the campaign from becoming a series of forgotten guesses.

---

## 20. Preflight checklist

The campaign may launch only when every required box is complete.

### Business

- [ ] Andrew approved the 90-day scope and media budget
- [ ] JJ Riggs owns the ad account and payment method
- [ ] A lead follow-up owner is named
- [ ] Priority inventory and offers are approved

### Research

- [ ] Target addresses were rechecked
- [ ] Competitor brands and promotions were reviewed
- [ ] Targeting does not imply knowledge of personal location history
- [ ] Andrew approved the targeting list

### Tracking

- [ ] Real GA4 measurement ID is set in `js/analytics.js` (not the
      `G-XXXXXXXXXX` placeholder)
- [ ] `js/analytics.js` loads on every public page — especially
      `index.html`, `contact.html`, `product.html`, `financing.html`,
      `services.html`, and all `implements/*` pages
- [ ] Pixel/dataset is installed
- [ ] `PageView` works
- [ ] `ViewContent` works
- [ ] `Lead` fires only after successful submission
- [ ] GA4 receives the corresponding events
- [ ] UTMs appear in the lead record
- [ ] Tracking phone number forwards correctly
- [ ] Test lead reached the sales owner

### Creative

- [ ] Correct machine and model
- [ ] Current stock status
- [ ] Accurate offer and expiration
- [ ] Approved fine print
- [ ] Phone number is `509-738-2985` or the approved tracking number
- [ ] 4:5 and 9:16 versions reviewed
- [ ] Landing page works on a phone
- [ ] No unsupported ownership, veteran, price, rebate, or financing claim

### Campaign

- [ ] Correct Page and Instagram identity
- [ ] Correct objective and conversion event
- [ ] Correct geography
- [ ] Correct budget and schedule
- [ ] UTMs applied
- [ ] All placements previewed
- [ ] Live click-through and test lead completed

---

## 21. First seven actions

1. Ask Andrew what platform or vendor ran the previous geofencing campaign.
2. Gather the old reports, invoices, target list, creative, and account access.
3. Approve a separate 90-day campaign-management scope while completing any
   Facebook creative still owed under the original project.
4. Hold a one-hour Meta access session with Andrew.
5. Add the marketing documentation structure to `jjriggs-new`.
6. Fix GA4 (real measurement ID + full page coverage), then implement
   Meta/UTM lead tracking and pass a complete test lead.
7. Launch one small core-local campaign with three approved ads.

---

## 22. Geographic expansion beyond the core market

Wider targeting (Spokane, western Washington, Idaho, Oregon) is a **business-
model decision, not a targeting decision**. A tractor purchase includes
delivery, warranty service, and an ongoing dealer relationship — and that
value decays with driving distance. Meta will happily sell impressions
anywhere; the question is why a distant buyer would choose JJ Riggs over the
dealer 20 minutes from their house. Expansion works exactly to the extent
that question has an answer (stock, price, or delivery).

### Think in drive-time rings, not state lines

| Ring | Distance | What works | What to know |
|---|---|---|---|
| **Ring 1 — core** | 0–45 min (current playbook scope) | Full value proposition: service, visits, relationship | Highest lead quality; this is the workhorse |
| **Ring 2 — regional** | ~1–2 hr: Spokane metro, Deer Park, Newport, Republic, Idaho panhandle | Viable if delivery is offered and priced; lead with something local dealers can't match | Note: North Idaho is ~40 miles away; the Oregon border is ~280+. "Wider" naturally means Idaho and Spokane, not Oregon |
| **Ring 3 — long distance** | 3+ hr: western WA, Oregon | Only price or scarcity: a hard-to-find model in stock, a demo deal, a package | Not a "local dealer" campaign — inventory-specific ads with freight terms in the copy, quote/phone as the destination |

### Rules for any expansion

1. **Check the dealer agreements first.** TYM and Bad Boy assign dealer
   territories (AORs). Some agreements restrict advertising or selling
   outside the assigned area. Andrew must confirm what his agreements allow
   before a single out-of-area impression runs — this one item can kill the
   idea outright.
2. **Have a real freight/delivery answer** before targeting Ring 2 or 3.
   Distant leads with no delivery answer become dead ends that pollute the
   lead log and the close-rate math.
3. **Separate campaigns, never a stretched audience.** Do not widen the core
   ad set's geography — that scatters a $25–35/day budget so thin Meta learns
   nothing, and it contaminates the local campaign's baseline. Ring 2 gets
   its own campaign with its own budget, launched only after the core
   campaign has a stable cost per qualified lead to compare against.
4. **Ring 3 runs as inventory-sniper ads:** one specific machine, a real
   verified offer, delivery terms in the ad. Run it when a unit worth
   traveling for exists; pause it when it sells. This is where the Quick Ad
   Builder's Paid Campaign Package output earns its keep.
5. **Geofencing does not expand.** Fencing competitor lots in markets where
   JJ Riggs has no service story gets more expensive and less sensible with
   distance. Geofencing stays local; plain Meta targeting handles reach.

---

## 23. Source notes

- Existing JJ Riggs repo documentation reviewed: `USER-GUIDE.md`,
  `FACEBOOK-POSTING.md`, `QUICK-AD-BUILDER-PLAN.md`,
  `LIVE-INVENTORY-AND-DEALER-KIT-PLAN.md`, `js/analytics.js`, `contact.html`,
  and `functions/api/lead.js`.
- Adams Tractor's official site listed Adams Tractor Colville at 635 Hwy 395
  S, Colville, and described Kubota, tractor/equipment, lawn/garden, parts,
  and service offerings.
- Hartill's official site listed 101 W Robert Ave, Chewelah, and described
  KIOTI tractors, implements, outdoor power equipment, parts, and service.
- JJ Riggs's site listed 685 Elm Tree Dr, Colville; TYM tractors, Bad Boy
  mowers, implements, repair, financing, delivery, and phone 509-738-2985.
- Addresses, ad-platform controls, financing classification, privacy rules,
  and platform requirements must be rechecked at launch because they change.

---

## 24. Version change log

### v1.1 — July 2026 (repo-verified amendments)

- **Corrected the GA4 status.** v1.0 implied GA4 tracking was live. Verified
  reality: `js/analytics.js` still carries the placeholder measurement ID and
  loads on only 12 of 28 root pages (missing from `index.html`,
  `contact.html`, `product.html`, `financing.html`, `services.html`). Added
  Phase 0 to Section 8 and two preflight items.
- **Named the pixel injection mechanism.** There is no "shared site
  structure" — pages carry their own script tags. Section 8 now requires a
  deliberate choice: inject via `header.js` or edit every page.
- **Removed the Meta competitor-area ad set.** Meta's ~1-mile minimum radius
  makes "competitor areas" around Adams (2 miles away) and Hartill's (inside
  the core area) identical to the core audience — two ad sets would only bid
  against each other. Competitor targeting now lives exclusively in the
  true-geofencing pilot (Section 14). Full budget goes to the core ad set.
- **Moved all registers out of the repo.** Lead/campaign/targeting data
  contains PII and belongs in the shared Google Sheet, not GitHub. Docs moved
  to repo root to match existing conventions.
- **Added Section 22: geographic expansion** — drive-time rings, the dealer-
  territory (AOR) check, the separate-campaign rule, and inventory-sniper
  ads for long-distance buyers.
- **Added `ADS-FUNDAMENTALS.md`** as the companion explainer for the
  mechanics behind these rules.

### v1.0 — July 2026

Initial draft (ChatGPT), based on repo document review and competitor
website verification.

