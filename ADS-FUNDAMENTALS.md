# Ads Fundamentals — How the Machinery Actually Works

July 2026 · companion to `FACEBOOK-GEOFENCING-PLAYBOOK.md`. The playbook says
*what to do*; this document explains *why*, so campaign decisions can be made
from understanding instead of superstition. Written for whoever manages JJ
Riggs' paid media (currently Aaron). No prior ads knowledge assumed.

Everything here is about mechanics that change slowly (auctions, attribution,
data supply chains). Meta's menus, labels, and policy details change
constantly — always verify the current UI and rules at launch.

---

## 1. You don't buy ads. You bid in an auction.

Every time someone opens Facebook or Instagram, an auction runs in
milliseconds for each ad slot on their screen. Every advertiser who targeted
that person is a bidder. The winner is not simply whoever pays most. Meta
ranks bidders by **total value**, roughly:

```text
total value = your bid × estimated action rate + user value
```

- **Your bid** — with the playbook's setup, Meta bids automatically to get
  the most lead conversions from your daily budget.
- **Estimated action rate** — Meta's prediction of how likely *this person*
  is to do the thing you're optimizing for (submit a quote form) if shown
  *this ad*.
- **User value** — Meta's estimate of whether the ad is a good experience:
  relevance, quality, expected feedback (hides, reports).

**The consequence that matters:** a relevant, well-made ad literally costs
less per result, because Meta's model predicts more action from it, so it
wins auctions at lower prices. This is why the playbook obsesses over
creative rules (real machines, one clear message, readable on a phone) — good
creative isn't just persuasion, it's a **discount**.

The flip side: a boring or misleading ad doesn't just convert worse, it pays
more per impression. Bad creative is taxed twice.

### CPM — the price of attention

Cost is usually quoted as **CPM** (cost per 1,000 impressions). Rural
northeast Washington CPMs are generally cheap compared to cities because
fewer advertisers compete for those eyeballs. But cheap impressions are
worthless by themselves — the funnel math in Section 8 is what turns CPM into
a business number.

---

## 2. The learning phase — why the playbook says ONE ad set

When an ad set launches, Meta's delivery system starts guessing who will
convert, watches what happens, and updates. This is the **learning phase**.
The system stabilizes after roughly **50 optimization events (leads) per ad
set per week**. Below that, it never stops guessing — delivery stays erratic
and costs stay high.

Now the arithmetic that killed the v1.0 competitor ad set:

- Budget: ~$30/day ≈ $210/week.
- A realistic early cost per lead might be $15–40.
- That's maybe **5–15 leads per week total** — already well under 50.
- Split across two ad sets: each gets a handful. Neither ever learns.

Rules that fall directly out of this:

1. **Concentrate.** One ad set with $210/week beats two with $105 each, even
   before considering that two ad sets over the same rural population also
   **bid against each other** in the auction (you literally compete with
   yourself for the same people).
2. **Don't fiddle.** Every significant edit (budget jump >~20%, new audience,
   swapped optimization event) resets learning. This is why the playbook says
   one change per week, and increase winning budgets gradually.
3. **Optimize for the deepest event you have volume for.** Optimizing for
   "link clicks" gets you people who click things (there is a population of
   chronic clickers, and Meta will happily find them all). Optimizing for
   *leads* gets people who fill out forms. If lead volume is too thin for the
   system to learn, the fallback is optimizing for landing-page views —
   shallower but higher-volume — not clicks.

Small-market reality: JJ Riggs may never hit 50 leads/week, and that's fine.
The campaign still works below the threshold; it's just noisier. The rules
above are about not making the noise worse.

---

## 3. The pixel and attribution — how Meta "knows" an ad worked

### The pixel

The **Meta Pixel** is a small script on the website (the playbook's
`js/meta-ads.js`). It sends events to Meta: *someone viewed this page*
(`PageView`), *someone viewed a product* (`ViewContent`), *someone became a
lead* (`Lead`). Meta matches those events back to Facebook/Instagram users —
by the `fbclid` click ID on the URL, by cookies, and by whatever else it can.

Two jobs at once:

1. **Reporting** — "this ad produced 4 leads."
2. **Feeding the optimizer** — every `Lead` event teaches the delivery system
   what a converting person looks like, so it finds more of them. This is why
   firing `Lead` only after `/api/lead` succeeds is non-negotiable: if the
   event fires when someone merely *opens* the form, Meta optimizes for
   form-openers and delivers you tire-kickers at scale. **You get exactly
   what you train it on.**

### Attribution windows

Meta counts a conversion as ad-caused if it happens within (typically)
**7 days of a click** or **1 day of a view**. Both defaults are arguable —
tractor purchases have long consideration cycles, so some real influence
falls outside the window, while "viewed the ad yesterday, googled you today"
view-through credit can be generous. The point: attribution is an
*accounting convention*, not a fact of nature.

### Why Meta's numbers never match your inbox

Expect Meta's lead count, GA4's count, and the actual lead emails to
disagree. Reasons:

- **iOS privacy (App Tracking Transparency):** many iPhone users are
  invisible to the pixel, so Meta *statistically models* some conversions —
  educated guesses, reported as if real.
- Different attribution windows and deduplication rules per platform.
- Ad blockers, cookie clearing, cross-device journeys (saw ad on phone,
  quoted from desktop).

**Resolution rule:** the dealership lead log is the ground truth. Meta and
GA4 are directional instruments for comparing ads against each other — never
the source of record for "how many leads did we get." This is the entire
reason the playbook builds UTM capture into the lead email: it creates
attribution *you own*, independent of any platform's math.

### The Conversions API (CAPI) — the playbook's Phase C

Browser tracking keeps degrading (privacy features, blockers). CAPI sends the
same `Lead` event **server-side** from `functions/api/lead.js` straight to
Meta, with a shared event ID so browser + server duplicates merge. It's the
industry's answer to pixel decay. Worth doing once the basics work — not
before.

---

## 4. Audiences — why "broad" beats clever in a small market

Meta offers several targeting flavors:

- **Broad:** just geography (+ maybe age). Meta's delivery system finds the
  buyers using everything it knows.
- **Interest targeting:** people Meta tags with interests ("tractors,"
  "farming"). Feels precise; is mostly noise — tags come from likes and
  engagement, and interest-tagged audiences routinely underperform broad
  because they *constrain* the optimizer.
- **Lookalikes:** "find people similar to this list." Needs a source list of
  hundreds+ — irrelevant at JJ Riggs' scale for now.
- **Custom/retargeting:** people who already visited the site or engaged with
  the Page. High intent, tiny size. Becomes usable once traffic accumulates
  (the playbook's Phase 2).

**The modern reality:** targeting has migrated from settings into *creative*.
Meta's optimizer is better at finding tractor buyers than any interest
checkbox — *if* the ad itself screams "this is for rural property owners near
Colville." A photo of a TYM with a loader on a gravel Stevens County lot IS
the targeting. This is why the playbook says start broad and put the effort
into the three ad angles.

### Frequency and creative fatigue

Northern Stevens County holds maybe 20–40k adults. A $30/day campaign will
reach most reachable ones within weeks, then start showing the same people
the same ads repeatedly. **Frequency** (average impressions per person) is
the gauge: as it climbs past ~3–4 per week and results decay, the audience
isn't exhausted — the *creative* is. Refresh the ads (new machine, new angle,
new photo), not the targeting. In a small market, creative rotation is the
main ongoing work of the campaign.

---

## 5. Geo-targeting — what Meta actually knows about location

Meta locates people using profile home city, IP addresses, and (where
permitted) device GPS. Targeting options are "people living in," "recently
in," or "traveling in" an area. Precision:

- **Minimum radius around a pin: ~1 mile.** There is no polygon, no
  property-level option, no "people at this address."
- **Special ad categories:** if Meta classifies an ad as credit-related
  (financing offers can trigger this), age/gender targeting is removed and
  geography gets *coarser* (historically a 15-mile minimum radius). This is
  why the playbook flags the 0%-financing ad angle for review before launch.

### The small-town geometry problem (why competitor "geofencing" on Meta is an illusion here)

Draw the smallest circle Meta allows (1 mi) around Adams Tractor on Hwy 395.
It contains: Adams' staff, passing highway traffic, and a slice of Colville —
i.e., **the same people as the core audience**, minus none, plus nobody. In a
metro, a 1-mile circle around a competitor is at least a distinct
neighborhood. In Colville, it's just... Colville. Every dollar in that ad set
is a dollar competing against your own core ad set for identical users.

That's the whole argument, and it's geometric, not strategic — no amount of
budget or cleverness fixes it. Competitor-*lot* targeting requires
property-level polygons, which only true geofencing platforms offer.

---

## 6. True geofencing — the data supply chain, honestly explained

Platforms like GroundTruth or Simpli.fi do something structurally different
from Meta:

1. **Data source:** millions of phones run apps that share location (weather
   apps, games — anything with location permission and an embedded SDK), and
   ad requests themselves leak approximate location (the "bid stream").
   Vendors aggregate this into device-location histories.
2. **The fence:** the vendor draws an actual polygon around a property —
   Adams' lot, a fairground. Devices observed inside get added to an audience
   (usually targetable for ~30 days after the visit).
3. **Delivery:** those devices then see banner/display/mobile ads across
   ordinary apps and websites (not Facebook) via programmatic ad exchanges.
4. **Visit attribution:** the same mechanism in reverse — did a device that
   saw the ad later appear inside the JJ Riggs polygon?

### The honest caveats

- **Small rural volumes.** A dealer lot might see dozens of unique devices a
  week, and only a fraction are in the vendor's data feed. The audience is
  tiny — precise, high-intent, but never a firehose. Expect slow spend and
  weeks before numbers mean anything.
- **GPS drift and polygon quality.** A sloppy polygon on a highway-side lot
  (Adams is right on Hwy 395) captures passing traffic, not shoppers. Demand
  to see the actual polygons before launch — playbook Section 14, step 5.
- **Visit counts are modeled estimates**, extrapolated from the fraction of
  devices the vendor can see. Treat "23 store visits" as directional, never
  as 23 identifiable people. A vendor who implies otherwise is overselling.
- **Display CTRs are tiny** (~0.1% is normal) — the product's value is the
  audience and the visit measurement, not clicks.
- **Minimums and contracts.** Typical platform minimums run ~$1–2k/month.
  This is why the playbook demands recovering the previous vendor's invoices
  and reports first: the question "what did a measured visit cost last time?"
  may already have an answer.

### When it's worth it here

Geofencing buys *precision on a tiny high-intent audience* (people physically
shopping at competing dealers). It complements — never replaces — Meta, which
buys *reach across the whole trade area*. Run the Meta campaign first,
establish a cost per qualified lead, then judge a geofencing pilot against
that number.

---

## 7. Organic vs. Boost vs. Ads Manager

Three ways content reaches Facebook users, often confused:

- **Organic Page posts** (the existing `post_fb` system): free, reach a small
  fraction of Page followers. Keeps the Page alive and credible — a buyer who
  clicks from an ad to a dead Page bounces. Not a growth engine.
- **The "Boost" button:** a simplified wrapper that promotes a post for
  engagement. Fine for visibility on a specific post; it generally optimizes
  for likes, not leads, and hides most controls. Not how the campaign runs.
- **Ads Manager campaigns** (this playbook): full control over objective,
  optimization event, geography, budget, and tracking. The only version that
  can optimize for *quote requests*.

The systems compound: strong organic posts become ad creative ("use existing
post" preserves the likes/comments as social proof), and the ads drive people
who then check the organic Page.

---

## 8. The money math — the funnel that decides everything

Every campaign is this chain. Know it cold:

```text
budget → impressions (CPM)
       → clicks (CTR)
       → landing-page views (load/patience loss)
       → leads (page conversion rate)
       → QUALIFIED leads (spam/fit filter)
       → quotes → sales (the dealership's work)
```

Worked example with plausible rural numbers ($900/month at $30/day):

```text
$900 ÷ $12 CPM               = 75,000 impressions
75,000 × 1.5% CTR            = 1,125 clicks
1,125 × 80% land successfully =  900 landing views
900 × 3% form conversion      =   27 leads
27 × 60% qualified            =   16 qualified leads
→ $900 ÷ 16                   ≈ $56 per qualified lead
16 × 10% close                ≈ 1–2 sales
```

Every number above is an assumption to be replaced with real data — that's
what the 90-day test *is*. But the structure teaches you where to look when
results disappoint:

- Lots of impressions, no clicks → **creative** problem.
- Clicks but no leads → **landing page or offer** problem.
- Leads but not qualified → **targeting or message** problem (or spam —
  check Turnstile).
- Qualified leads but no sales → **follow-up or inventory** problem. Not an
  ads problem at all — and the most common failure in dealer campaigns.

### The one number that governs the campaign

```text
max cost per qualified lead = avg gross profit per sale
                            × close rate on qualified leads
                            × acceptable marketing share of profit
```

With the playbook's illustrative numbers ($3,000 × 10% × 25%) that's **$75**.
Above it, shrink or fix; below it, the campaign is literally printing
margin — scale gradually. Andrew must supply the two business inputs; without
them everyone is guessing with adjectives ("seems expensive") instead of
arithmetic.

### Why vanity metrics lie

Clicks, reach, likes, and even raw "leads" can all rise while the business
gets nothing — chronic clickers, bots, out-of-area dreamers. The only
self-defending metric is **cost per qualified lead trending toward closed
sales**, which is why the weekly report (playbook Section 16) is built around
it and why the lead register must record outcomes, not just arrivals.

---

## 9. Operating principles — the expert habits

1. **Change one thing at a time, weekly.** Two simultaneous changes = zero
   attributable lessons. Also, edits reset the learning phase (Section 2).
2. **Judge nothing in under a week.** Daily numbers on a small budget are
   coin flips. Meta also front-loads delivery erratically after any change.
3. **When results tank, check the plumbing before the strategy.** A broken
   pixel, a dead form, or an unanswered phone looks identical to "the ads
   stopped working" in every dashboard.
4. **Respect seasonality.** Equipment demand moves with the calendar: spring
   (mowing/property work), fall (firewood, cleanup), first snowfall (blades,
   blowers — spike instantly). A "failing" January ad may just be January.
   Compare year-over-year once there's a year of data, and pre-build the
   snow-equipment campaign in October, not during the first storm.
5. **The follow-up hour is the highest-ROI setting in the account.** Contact
   rates on leads collapse within hours. A $56 qualified lead that waits two
   days is a $56 donation. No targeting tweak competes with answering the
   phone — this is why the playbook refuses to launch without a named lead
   owner.
6. **Own your data.** Platforms mark their own homework. UTMs → lead email →
   lead register is the attribution chain JJ Riggs controls, and it's the
   record that decides budget, not Meta's dashboard.

---

## 10. Glossary

| Term | Meaning |
|---|---|
| **Ad set** | The Meta layer holding audience, budget, and optimization settings; ads live inside it |
| **ATT** | App Tracking Transparency — iOS prompt that lets users block tracking, blinding the pixel |
| **Attribution window** | How long after a click/view a conversion still counts as ad-caused |
| **Bid stream** | Location/device data leaked through programmatic ad auctions; a geofencing data source |
| **CAPI** | Conversions API — server-side event sending that bypasses browser tracking loss |
| **CPM** | Cost per 1,000 impressions — the price of attention |
| **CTR** | Click-through rate — clicks ÷ impressions |
| **DSP** | Demand-side platform — software that buys programmatic ads (geofencing vendors are/resell DSPs) |
| **fbclid** | Click ID Meta appends to ad URLs; lets the pixel tie a site visit to the ad click |
| **Frequency** | Average times one person has seen the ad; fatigue gauge |
| **Learning phase** | Meta's calibration period; wants ~50 conversions/ad set/week; resets on big edits |
| **Lookalike** | Audience of people statistically similar to a source list |
| **Pixel / dataset** | The on-site script + Meta's container for the events it sends |
| **Special ad category** | Restricted class (credit, housing, employment) with reduced targeting; financing ads risk it |
| **UTM** | URL tags (`utm_source=facebook…`) that let *your* analytics attribute a visit; platform-independent |
