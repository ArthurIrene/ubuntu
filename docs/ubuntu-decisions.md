# UBUNTU — Decisions & Method
*July 2026 · All sixteen rounds closed · Companion to `ubuntu-foundation.md`*

> **To start a new chat:** upload `ubuntu-foundation.md`, this file,
> `ubuntu-technical.md`, and `ubuntu-copy.md`. **The rounds are finished.** What
> remains is the founder's homework, the RDB filing, and the build itself.
>
> **The whole set is current as of Round 16, plus one amendment pass.** Before any
> code was written the set was reviewed in three passes — contradictions, reservations
> that had grown into builds, and blockers. Nine amendments came out of it and are
> recorded here in the rounds they belong to and in the superseded table at the foot.
> No corrections list, no stale file — every document carries every closed round,
> which is the condition for cold-starting a build chat from them without repeating
> work.

---

# PART ONE — HOW WE WORK

We are working through every open decision before writing code, one topic at a
time. This section exists so the method survives a new chat.

## The shape of one round

1. Claude opens the topic and states **what it constrains** — which later decisions
   depend on it.
2. Claude lays out the real options with what each costs. Not a polite menu — the
   actual distinct paths.
3. Claude gives a recommendation and the reasoning, so there is something to push
   against rather than a blank page.
4. The decision is made, pushed back on, or explored further.
5. Claude writes the closing lines: what was decided, what it constrains, what it
   defers.

**One question at a time.** If something surfaces mid-round that belongs elsewhere,
it is parked by name and returned to. A round never sprawls into three.

## When a point is closed

The test is not "does this feel resolved." It is:

> **Could someone build this without asking another question?**

If it cannot close, it is not left vague. It is named as one of three things:

- **His call** — the founder must answer
- **Code-only** — no amount of discussion settles it; only running it will
- **Deferred** — genuinely past MVP

## Now vs designed-for

Every decision is marked one or the other. "Designed for" should almost always mean
*a column that exists and is unused*, or *an adapter with one implementation*. It
should very rarely mean building something. This is what stops an MVP becoming a
platform.

## Three rules that keep this from bloating

1. **Do not debate what only code can answer.** Name it, move on.
2. **Filter every feature through the first ten orders.** Four garments, zero
   customers. If it does not serve the first ten, it is a note in a later list.
3. **Match depth to reversibility.** Schema and money get full attention. Copy and
   layout get a decision and a move-on — they cost an afternoon to change.

## When to call the founder

He is reachable any time, but we call **only when the answer changes what gets
built** — three or four times across the whole exercise. Everything else is content,
or a value that fills a field we are building anyway, and those batch into one
sitting.

When we do call, we hand him **a decision, not a canvas.** *"Which of these three,
and here is what each costs"* gets an answer in two minutes. *"What do you think
about X"* gets forty minutes and no decision.

## Recording

Checkpoint every four or five rounds. The foundation document is rebuilt from these
decision lines rather than patched, because a document plus a corrections list is
how two locked files come to contradict each other quietly.

**Checkpoint before the round that reopens things, not after.** Round 12 was
identified as the one most likely to send us back to amend Rounds 9 and 11, so the
set was written up before opening it. In the event it amended only itself.

**Rounds may be reordered when deferral gets expensive.** Round 14 (site language)
was pulled forward ahead of 6–13 because it is a schema change across all content
the moment the founder starts writing. Round 16 was run before Round 15 once it was
clear the sweep would settle most of what 15 had left to decide — which it did.

---

# PART TWO — DECISIONS CLOSED

## Round 1 — Collection lifecycle

**The contradiction resolved:** "worlds, not inventory" implied collections end;
made-to-order means nothing ever runs out.

- Pieces are **removed from the site**, never hard-deleted, once an order exists.
  *(Round 9b added the other half: a piece is a **draft** until he publishes it, so
  "removed" is now one of three states rather than the only off-switch.)*
  Past orders must always resolve to the piece they were for.
- **Hard delete only for a piece with zero orders** — wrong photo, duplicate, typo.
  Same button, behaviour decided by the data rather than by him remembering a rule.
- Removal is **reversible in one click.** He will bring pieces back.
- The homepage collection is a **curated window display** — what he wants people to
  meet first, changeable at will. Not a set that closes, so nothing is ever made
  artificially scarce.
- The **full range lives on its own page**, browsable.
- **Filter taxonomy in the schema now** (garment type, adult/kids). Filter interface
  built when the catalogue earns it, roughly 15–20 pieces. A filter bar above four
  items makes a small brand look like an empty shop.
- **No gender field anywhere.** What changes the making is the **cut**, not the
  customer. Cut is a per-piece option, structurally identical to colourway: he sets
  available cuts per piece, and a piece with one cut asks no question. More accurate
  than gender, future-proof, and nobody is asked to classify themselves to buy a hat.

## Round 2 — What a piece is

- A piece = **one garment + one scene**, sold as a single design.
- Options on a piece: colourway, cut, size/fit. Not separate products.
- Scene and story are **fields on the piece.** No shared scene library — the same
  scene on two garments is two pieces, and he writes the story twice. Splitting
  scenes out later is a small migration; building it now adds a dashboard section he
  does not need for four pieces.
- **A piece also carries `reborn`** *(Round 17)* — one boolean marking cloth that was
  saved rather than new. It changes nothing about how a piece is defined, browsed, or
  ordered; it is a fact the story and marketing can tell, not a second kind of piece.
- The word **"template" is retired** — it invites a blank-garment reading.
- **Three browse layers:**
  - *Card:* photo on cream, name, scene line, base price. The whole card is the door.
  - *Hover:* decorative only, **never information.** Most traffic is mobile and has
    no hover. A second photo, or a stitch border drawing itself.
  - *Page:* everything.
- **The grid query loads card fields only.**
- Resist moving more onto the card later. The card's job is to make someone open the
  piece, not to let them evaluate it without opening it — and the story is what sells
  a made-to-order garment to a stranger.

## Round 3 — Money

- It is a **price, not a starting price.** Anything that legitimately costs more is
  shown **while it is being chosen**, so the button always shows the real total.
- Options carry **modifiers** — default zero, can be negative. Priority is a modifier.
- **The base price must be the ordinary configuration**, not the cheapest edge case.
  Otherwise the card price is fiction and "from" pricing has returned by the back door.
- Money stored as **integers in minor units with an explicit currency code.** Never
  floating-point. **RWF at launch.**
- Orders **snapshot the full breakdown** — base, each modifier, final — not just the
  total. So "why 51,000?" is answered by the record, not his memory.
- **Payments are their own table.** An order has many; today every order has exactly
  one. This is what makes deposits, refunds and corrections free later.
- **Manual payment is a permanent capability, not a permanent presentation.** Once a
  gateway is live it becomes the visible path; manual is the fallback for outages and
  customers who insist. Removing the capability means an outage stops orders.
- ~~**Commissions:** configurable deposit percentage upfront, balance before
  shipping.~~ **Superseded by Round 6** — three gates, and an absolute design fee
  rather than a percentage, because there is no total to take a percentage of until
  the design exists.

*Payments landscape detail is in `ubuntu-foundation.md` Section 7.*

## Round 4 — Order lifecycle

- **An order is an append-only event log**, not a status field. Each event carries a
  timestamp and an actor. Status is *derived* for the dashboard; the log is the truth.
  This gives the customer page, an audit trail, and a guarantee nothing is silently
  overwritten. Retrofitting means reconstructing history that was never recorded.
- **Payment is a separate dimension from journey.** Paid-ness is derived from the
  payments table. No payment states clutter the machine, and "awaiting balance" needs
  no new state.
- **The path:** Requested → Confirmed → Paid → In the making → On its way → Delivered
- **Paid and In the making stay separate.** Paid means *in the queue*; In the making
  means *he has started.* The honest version of priority-as-position.
- **Delivered matters:** the alteration window runs from receipt, so without it the
  clock has no start. It carries the welcome into Abantu.
- **Plus three off-path states:** Declined, Lapsed, Cancelled. **Lapsed** is
  operationally essential — without it, every stranger who requests and vanishes sits
  in Confirmed forever and the pipeline becomes unreadable within months.
- **Customer-reported payment** is a payment record marked *reported*, not an order
  state. Closes the silence between sending money and him noticing.
- **Decline exists permanently, and it is consent, not capacity.** He must be able to
  refuse a scene he does not want to stitch. Cannot be solved by hiring.
- **No self-service cancellation.** A conversation. The refund **shrinks as the work
  progresses** — nearly all before cutting, less once cloth is cut, least
  mid-stitching. The policy states the principle; the number is his per case. Quietly
  rewards telling him early.
- **Capacity is handled by growing the workforce**, with timeframes absorbing the
  hiring lag — hiring runs on months, demand spikes on days, and the part he cannot
  delegate is the slow part.
- **Timeframes are typed, not calculated.** Calculated needs queue depth and a
  capacity number that do not exist yet; with fewer than ten orders he knows better
  than any formula.
  - **Making days, per piece** — a property of the craft, set once.
  - **Queue offset, global** — one number he raises when busy; all pieces update at once.
  - **Priority offset, global.**
  - Customer sees making days + offset.
- **Priority changes the offset, never the making days.** The data model itself
  cannot express "we stitch it faster." The promise is enforced by schema rather than
  discipline.
- ~~Dashboard **nudges** when open orders cross a threshold. A prompt, not
  automation.~~ **Struck in the pre-build review.** R9a chose gate-based queue
  membership precisely because time- and threshold-based membership "would need six
  numbers guessed before a single real order exists." The nudge is one of those
  numbers. Capacity is visible in Today, which is never truncated, and that is the
  whole answer.
- **The priority option renders only while the queue offset is non-zero** *(pre-build
  review).* The modifier and the global offset exist from day one, unchanged. But a
  site with four pieces and no orders offering a paid place nearer the front of an
  empty line is selling a position that does not exist, and it would be the first
  scarcity copy on the site.
- The event log is already capturing real durations. After 20–30 orders, calculated
  timeframes become possible from history. Nothing extra to build now.


## Round 5 — Order access & identity

- **No accounts at launch.** Every order is reached by a **128-bit token in the
  path** — `/o/<token>`, never a query string, never a sequential id. Short enough to
  paste into a message without looking like phishing.
- **Stored raw, not hashed**, because the dashboard must re-send *the same* link and
  the customer's old copy must keep working. **Rotatable in one click** for the
  customer who forwarded it to the wrong person.
- **No expiry, ever.** The alteration window runs from Delivered, and Round 1
  promised past orders always resolve. A dead link is the site forgetting someone.
- **Never logged.** Scrubbed from error reporting, and **the analytics beacon is not
  rendered on order routes** — the path *is* the credential, so page-view analytics
  would file every live token in a table. `noindex, nofollow` and
  `Referrer-Policy: no-referrer` on those routes.
- **Email and phone both required.** Email is the free automated rail and the
  permanent address of the link; phone is delivery, alteration, and his own hand.
- ~~**WhatsApp is enquiry only.** It never carries a link, a status or a payment.~~
  **Amended by Round 11 to: WhatsApp is never automated.** The cost argument below
  survives intact and only ever applied to the robot.
  *Automating it was rejected on cost:* Meta bills per business-initiated message
  outside an open 24-hour service window, which is exactly what a status update is.
- **Recovery stays human at launch** — name and piece, and he sends the link back.
  With fewer than ten orders he knows every name. Self-serve recovery adds an
  enumeration surface for no present benefit: designed for, not built.
- **A customer row exists from day one**, keyed on phone, auth columns null. One
  table buys *"this is her third piece"* in the dashboard, which for a brand named
  Abantu is not a nicety. No customer-facing surface.
- **Accounts land in Phase 8, guest-first.** The order is created with no account;
  the confirmation invites the customer to claim it. **Magic link, not password** —
  a password store is the worst thing to own on a free tier. **Phone identifies,
  email authenticates**, because SMS and WhatsApp OTP both cost money. The token
  never dies: an account is another door to the same page, never the only one.
- **The `pg_dump` backup is encrypted before commit** (`age` or `gpg`, key in an
  Actions secret). Without it the weekly backup is a git history of live tokens,
  phone numbers, addresses and measurements. The restore test becomes decrypt-and-restore.
- **NCSA registration and the cross-border storage certificate join the RDB
  conversation.** Rwanda's Law 058/2021 requires personal data to be stored in
  Rwanda absent a certificate; Supabase's nearest region is European. Registration is
  free and online. Not legal advice — it belongs in the filing conversation.

## Round 14 — Site language *(pulled forward)*

- **Two locales: English and Kinyarwanda.** Both real from day one. French and
  Swahili: named, dismissed, permanently.
- **English is canonical, written first, and ships publicly at launch.** Chosen
  because English is the surface that meets strangers and carries the global reach.
  Fallback runs `rw → en`.
- **Kinyarwanda ships dark** — `/rw/...` walkable from day one, `noindex`, no
  switcher rendered, no link anywhere public. Built and reviewable on a phone from
  week one; nobody meets it until it can carry them the whole way.
- **The flip is a written bar, not a feeling:** shell complete (nav, buttons,
  statuses, forms, policies, every order email), plus the four window-display pieces,
  plus **two Kinyarwanda readers who are not him.** Everything outside that bar falls
  back to English silently so he is never blocked from publishing a piece.
- **The bar is visible, not remembered.** The dashboard shows translation
  completeness per piece, turning the flip from a judgement call into a number
  reaching zero.
- **Content schema bilingual from the first migration** — per-entity translation
  rows with a fallback chain. Adding a locale is inserting rows, never altering
  tables. Locale joins the edge cache key.
- **`locale` on the order and the customer row**, set at creation, read by every
  email. One column now; impossible to reconstruct later.
- **Fixed strings keyed from the start** — a hand-written map in `src/content/`.
  **No i18n library**; the bundle cannot spend it and nothing needs it until the flip.
- **Route shape decided, mechanism deferred to code:** English unprefixed,
  Kinyarwanda at `/rw`. Whether that is middleware or a duplicated `[locale]` tree is
  settled by whatever behaves under OpenNext.
- **Layout survives ~30% longer strings.** Kinyarwanda is agglutinative; Latin
  script, so no font risk. Tested in Phase 5, not discovered in Phase 6.
- **The reversible/irreversible split that drove all of it:** content schema, locale
  columns and keyed strings are paid for now. URL structure, middleware, the library
  and the switcher are a file move later. *(Amended once: because `/rw` must be
  walkable from day one, the locale segment does have to exist in the first route.)*
- **A finding:** *umuntu ngumuntu ngabantu* is a **Nguni** maxim, not a Rwandan one,
  and it sits at the bottom of every page. The word *ubuntu* itself is fully
  Kinyarwanda — humanity, human generosity — and *gira ubuntu* is living speech. The
  copy rule requires naming references precisely, so the story page names it as
  Nguni. No Kinyarwanda proverb was invented to fill the gap.

## Round 6 — Commissions as a structure

- **One order object.** A commission is the existing machinery pointed at a piece
  that does not exist yet. In a line: **a collection order is a commission with one
  gate.**
- **Three payment gates** — **design fee** (before he drafts) → **payment to start
  cutting** (once the design is agreed) → **balance on completion**, before shipping.
  The order snapshots an ordered payment schedule; a collection order has one entry.
  **No schema change** — Round 3's payments table already carries it.
- **The design fee is an absolute figure, not a percentage.** A commission has no
  total until the design exists, so a percentage is arithmetically impossible.
  Global default, overridable per commission. *Supersedes Round 3's "configurable
  deposit percentage upfront."*
- **Credited against the total**, and uniform in that treatment even where the amount
  varies. A credited fee must sit comfortably below the cheapest thing he would make.
- **The design fee does not advance the journey.** New customer-facing word **In
  design**, commissions only, derived from that payment. Without it a commission reads
  *Confirmed* for three weeks while he is actively drawing, which looks stalled. His
  sign-off on the word, plus a Kinyarwanda key.
- **`design_shared` and `design_agreed` as events.** Not an approval workflow with
  deadlines and a stuck path — two facts, because money hangs off one. *(This reverses
  an earlier "no design-approval workflow" line: once money gates on the agreement,
  the moment has to exist as a record.)*
- **The piece is minted at design agreement**, when making days become knowable and it
  enters the queue. `piece_id` is null only between Requested and design agreement —
  and that window is the design, not a wart: the customer's page shows their own words
  back to them, no photo, no price. The emptiness is the product on the order page too.
- **`piece.kind` = collection | commission.** A commission-kind piece can never be
  listed publicly or enter the window display. Schema, not discipline.
- **Ownership transfers on full payment.** Until then the design is his, to retire or
  reuse. *Only yours* attaches to the finished piece, not to the drawing — so there is
  no exception clause, because there was never a rule to except. **Stated on the page**
  rather than discovered.
- **Reuse is a clone, never a flip.** The abandoned order keeps its frozen snapshot;
  reuse creates a new piece with a **new name and a new story**. The customer's story
  is never reused — it was told in confidence, and only a completed commission earns a
  past-commission story.
- **No priority on commissions.** The modifier system permits it; the page will not
  offer it. Options are set by him in conversation and snapshot like any modifier.
- **`making_complete` as an event, not a state.** Earns the finished-but-unshipped
  moment for commissions, and for every order separates *finished stitching* from
  *got to the post office* — the duration wanted when calculated timeframes arrive.
- **No separate commissions section in the dashboard.** Same pipeline, filtered.

## Round 7 — Fit data

- **Measurements are the urged path**, and therefore taught. Standard sizing remains
  fully available and is not a lesser choice. *(This supersedes two earlier lines:
  "the urging stays light" and "teaching people to measure serves a gap that is nearly
  empty." Urging recruits people with no numbers and no method.)*
- **Misfit is fixable at a stated additional price**, said as confidence rather than
  as a disclaimer — the page's own move is to state the hard rule and turn it into the
  reason it exists.
- **Definitions in code, ranges in the dashboard.** A measurement only means something
  if it has a place on the drawing, and the drawing is code — so he cannot invent a
  measurement with nowhere to render. He *can* widen a guardrail the day a real
  customer is blocked, without a deploy.
- **Millimetres stored as integers**, displayed in centimetres, with the unit the
  customer typed recorded. Same discipline as money; inches will arrive with the diaspora.
- **Guardrails are soft, in three bands** — plausible passes silently; implausible
  asks a gentle question that must be acknowledged, **and the acknowledgement is
  recorded**; impossible is the only hard stop. A hard block on a real body is the site
  telling someone their body is wrong. The bands are evidence, not validation.
- **The order snapshots a self-contained fit record**: values, labels, the instruction
  text shown, the ranges in force, and the **size-chart version**. *Our own stated
  measurements* means the ones stated on the day, so without a version the policy's
  three-way liability clause cannot be adjudicated.
- **`source` on the fit record decides liability** — `self` / `tailor` (theirs),
  `standard` (theirs, but he checks against height and weight), **`ours`** (a physical
  measuring point: fully his, no negotiation). That last value is the whole drop-in
  feature — one enum and a `measured_at` reference now, no build.
- **Fit records append, never overwrite.** A second set of numbers after a path-1
  request is a new record; the log says which was in force when making started.
- **Measurements never appear in an email.** Behind the token only — the most intimate
  thing on the page, and personal data under the DPA.
- **The diagram is enhancement, never the input mechanism.** The form completes with
  no JavaScript, no motion, and a screen reader. ~~One SVG per garment type~~ — **one
  drawing per garment shape, referenced by a key on the garment type** *(amended by
  R13c, which never propagated until the pre-build review: two kids' types must not
  become two identical files that drift)*. Anchors named by measurement key, no
  library.
- **Instruction text ships beside the field**, not in a tooltip.
- **No suggested size from height and weight.** It would probably lift conversion, and
  it competes with *he checks every order himself* — quietly assuming the liability the
  policy just spent three clauses distributing.
- **A "what your tailor needs" list**, short and shareable, because path 2 routes
  through a third person who sees none of the on-page instructions.
- **Commission fit arrives on the order page when the design is agreed** — same form,
  same guardrails. He can enter it himself if the numbers came over WhatsApp; the
  actor is recorded either way.
- **Kids get cheap.** A children's garment is a garment type with different bands, so
  Round 13 is left with the questions that actually need thought.

## Round 8 — Images

- **Resize, compress and encode in the browser at upload.** Server-side is impossible
  on this stack — 10ms CPU per request and a 3 MB worker, with `sharp` unavailable in
  the Workers runtime and WASM codecs counting against the same cap. *This supersedes
  `ubuntu-technical.md` §6's "server-side."*
- **The decisive argument is his uplink, not the visitor's.** He uploads from a phone
  on metered Kigali data; browser-side turns 12 MB into ~300 KB. Twenty progress
  photos become 6 MB instead of 240 MB. No paid plan ever fixes this.
- **Three derivatives — 400 / 800 / 1600 px, WebP.** Progress photos get one at 1000 px.
- **No original is kept. His phone is the archive.**
- **WebP only.** AVIF is closed on every free path; named as a cost.
- **Uploads pass through the Worker** to the storage adapter — viable at 300 KB, and
  it keeps R2 knowledge in one file.
- **Public and private buckets.** Catalogue photos served direct from R2 on their own
  hostname, cached and immutable, never touching the app. Progress photos and customer
  reference images streamed through the Worker with the token checked.
- **Content-hashed keys, immutable cache headers.**
- **Width, height and a focal point per image.** Layout shift is a motion bug here.
- **`next/image` retained** for `srcset`, lazy loading and layout stability only; the
  loader maps width to derivative.
- **Alt text required**, defaulting to the scene line.
- **Customer uploads unlock on the order page after he accepts** — never on the public
  commission form, which would be an anonymous upload box on a site with no accounts.
  File-signature verification, caps, and a retention rule, because reference photos are
  often of other people.
- **No video at launch.** Storable, not compressible on any free tier, and the motion
  charter forbids the ambient loop that is web video's main use. TikTok holds it —
  linked, never embedded.
- **Spike EXIF orientation and phone memory in Phase 0**, on his actual device.
- **The upgrade ladder, and the principle under it:** Supabase Pro at the first sale;
  Workers Paid at $5 when the bundle or CPU binds, taken even pre-revenue; Cloud Run
  as a named escape hatch behind `storage.ts` with three triggers. **Prefer a ceiling
  that refuses over a meter that bills** — Cloudflare rejects past its limits, metered
  clouds invoice, and for a pre-revenue brand a day of downtime is recoverable where a
  surprise bill is not.

## Round 9 — Dashboard scope

*The biggest remaining round, held in four parts. Rounds 5–8 filed twelve
requirements here without drawing the boundary.*

### 9a — Shape

- **A work queue is the home screen**, named **Today**. Orders, Pieces, Customers and
  Settings sit beside it. *(This reverses the recommendation of an orders list with a
  derived `waiting on` column — the glanceable "you are clear" moment was judged worth
  the build, for someone doing this between stitching sessions.)*
- **Membership is gate-based, never time-based.** An order appears when the next move
  is **his** — confirm a price, record a reported payment, share a design, mark it
  made, mark it shipped — and leaves the moment he makes it. No thresholds to tune, so
  it cannot nag and cannot go quiet. Time-based membership would need six numbers
  guessed before a single real order exists, and guessing them wrong is what teaches
  him to stop looking.
- **The list is complete and never truncated.** Not a top-five. This is what makes
  forgetting *structural* rather than lucky, and it is the whole reason the queue was
  chosen over the table.
- **Grouped by action, with a count per heading** — *confirm a price · 3*. At twelve
  items a flat list of sentences is a wall; grouped, he batches instead of
  context-switching between pricing and packing.
- **Days-waiting shows on every row, as information only.** It never adds or removes
  anything. The date was the part that had to be visible; the age is not the rule.
- **Facts complete inline** — payment landed, package posted. One tap, the row goes,
  the email fires. He is recording something that already happened.
- **Judgements open the order** — confirming a price, sharing a design. Each snapshots
  a breakdown and sends a number that cannot be taken back. **No bulk approve
  anywhere:** a one-tap approve on a price is exactly how a wrong price gets sent.
- **Customer silence is one line at the foot**, not mixed in — *3 waiting on
  customers.* The gate-based rule cannot catch an order where the next move is theirs;
  this is what feeds Round 4's Lapsed.

### 9b — Sections

- ~~**Five: Today · Orders · Pieces · Customers · Settings.**~~ **Amended in the
  pre-build review: four — Today · Orders · Pieces · Settings.** Customers was the
  only one of the five with no specification in any of the eight documents, and an
  unspecified section is one that gets invented at build time. R5's customer row is
  untouched — it exists from day one, keyed on phone, auth columns null, and every FK
  resolves. What was bought with it, *"this is her third piece,"* is deferred to the
  order screen's customer panel on the day it is wanted; it is one query, not a
  section. **The makers list joins garment types under Settings**, which is where R16's
  FK has to surface.
- **Garment types live under Settings**, not as a sixth section. Three rows set up once
  and untouched for months is the definition of a setting, and top-level nav would make
  the dashboard look like it is about garments when it is about orders. Carries the
  measurement list and Round 7's three guardrail bands per type; Round 13 extends the
  same page.
- **Pieces is one section filtered by `kind`**, defaulting to collection. Commission
  pieces stay reachable — Round 6's clone action has to find an abandoned design, and
  Phase 8's past-commission stories need somewhere to be written — without twenty-six
  one-offs sitting between him and the four window-display choices. No second section,
  no schema: `kind` already exists and is doing the work.
- **Three piece states: draft → live → removed.** Draft on create. *(This fills the
  half of Round 1 that only ever settled un-publishing.)* Phase 2 puts the dashboard in
  his hands before the public site exists, so he will be entering pieces for weeks with
  photos missing and stories half-written; without draft, launch day means hunting for
  the unfinished ones.
- **Publish is deliberate and enforces a floor** — photo, price, scene line, alt text.
- **Removed and draft look identical to the public and are different facts.** The
  difference shows in the dashboard. Hard delete is unchanged from Round 1: same
  button, allowed only where no order exists, reversal in one click.
- **The public site queries `kind = collection AND state = live`** everywhere. Never a
  hand-maintained list.
- ~~Translation completeness is a **column in Pieces**, not a section.~~ **Cut in the
  pre-build review.** It is a meter of progress toward a switch that is off — the
  clearest case in the set of a reservation growing into a build. R14's flip bar is
  three named things (shell complete, four window pieces, two readers) and can be
  checked by hand. It returns in Phase 8 if the catalogue ever outgrows the eye.

### 9c — The order screen

- **Panels, not a timeline.** Customer, money, fit, photos, maker — each its own block;
  the event log is one panel among them, collapsed by default. The queue now sends him
  here with one specific job, and a timeline would make him read three weeks of history
  to find the button. Panels also stack on a phone, where he will actually be. *The
  cost, named: when an order goes wrong the timeline is the view you want, and it is a
  click away rather than in front of him.*
- **Price is adjustable at confirmation, with a required reason**, written as its own
  named line in Round 3's snapshot. The cases are real — cloth a wide measurement eats,
  a colourway he is short on, a discount he wants to give. An adjustment that explains
  itself inside the breakdown does not weaken *"it is a price, not a starting price"*;
  it is what answers *why 51,000?* Decline-and-re-ask was rejected: it throws away the
  request and asks a stranger to fill the form twice.
- **The customer's acceptance is the payment.** The existing gate does that work, so a
  raised price needs no new state and no approval loop.
- **The dashboard shows a count of recently adjusted orders**, so drift back toward
  "from" pricing is visible rather than gradual.
- **A required fit check before *In the making***, recording who and when, beside the
  fit snapshot. **Unconditional — not raised only on odd numbers.** A conditional tick
  means he must learn which cases raise it, and the case it does not raise is the
  plausible-but-wrong number that sails through. Cloth is cut at the second gate, so
  the error is unrecoverable. This is also the missing half of Round 7's liability
  record, which captured what the customer acknowledged and nothing about him. *The
  cost, named: a tick on every order risks becoming reflexive.*
- Settled by earlier rounds, needing no decision here: three payment gates as panel
  rows (R6), maker name per order, one-tap WhatsApp (R5, as amended in R11), token
  rotation in one click (R5), progress photos at 1000px (R8), the clone action (R6).

### 9d — Field vs code

- **Message templates are code, not dashboard fields.** *(This reverses `CLAUDE.md`,
  which listed them as fields, and it is a straight contradiction between two locked
  documents rather than a change of mind. Copy won.)* An email body edited in the
  dashboard has no key and no translation, so it silently becomes English-only — and
  the Round 14 flip bar cannot count what it does not know exists.
- **A personal note field instead:** optional, appended above the signature, in
  whatever language he is writing to that customer. On the four where a note earns its
  place — **Confirmed, Declined, design shared, On its way.** What he actually wants is
  to say something to Claudine about her order, not to rewrite the shipping
  notification. The hardest one, Declined, is the piece of writing that most needs to
  be right and least wants rewriting at speed.
- Every wording change is therefore a deploy. Correct by `CLAUDE.md`'s own test: email
  wording is brand voice, and brand voice is design.
- **Confirmed as fields:** piece content and photos with focal point and alt text,
  price and option modifiers, collection theme, window-display selection, guardrail
  ranges, queue and priority offsets, making days, the commission design fee and reply
  time, Abantu entries, the makers list in Settings, and the maker chosen per order.
- **Confirmed as code:** every fixed string, the fit diagrams, measurement definitions,
  page structure, motion.
- ~~**Read-only:** translation completeness per piece.~~ Cut — see 9b.

## Round 10 — Routes and navigation

- **The homepage is a landing page**, with the window display inside it rather than as
  it. Most arrivals come from a fifteen-second video on a phone knowing nothing about
  the brand — they have to learn that nothing is stocked before a made-to-order price
  makes any sense. A shop-shaped grid homepage is faster for someone who already knows
  the brand, which at launch is nobody.
- **The collection page sorts newest-first and is the permanent answer to "what's
  new."** A stable URL he can post every time he finishes something, which never goes
  stale and never sits empty. **No third route** — with four pieces a `/new` page is
  the collection page with a different heading, and it would have to be maintained.
- **`published_at` in the schema now, sorted from day one.** The visible *newly
  stitched* marker waits until the catalogue earns it, exactly as Round 1 handled
  filters — a badge on all four pieces says nothing.
- **The window display keeps doing something different:** his hand choosing what a
  stranger meets first. Not simply the four most recent.
- **Never "drop."** `rules-copy.md` retires it beside merch and SKU, and Round 1
  rejected collections that close — a drop implies it goes away. *Newly stitched*, or
  *the latest*.
- **Four nav items: Collection · Only yours · The making · Our story.** Policies and
  Talk to us in the footer. **No hamburger at launch** — four fit across a phone, and a
  menu that has to be opened costs the click that gets someone into the story.
- **The nav label and the route may differ, and this is the only case on the site**
  *(pre-build review).* `ubuntu-foundation.md` §11F and the drafted footer always said
  **Only yours**; this round and `CLAUDE.md` said *Commissions*. That was an unwritten
  rule rather than a disagreement, so it is written down: the route stays
  `/commissions` because *only-yours* is a poor slug and a worse link to paste into a
  message, and the label a customer reads is **Only yours.**
- **`/contact` exists** *(pre-build review).* Foundation §11I specified its job and
  `ubuntu-copy.md` §6 drafted it in full, and it had a URL in neither. Mirrored at
  `/rw/contact`, built in Phase 3, reached from the footer. **The nav stays four
  items** — a contact link in the nav is the thing that quietly competes with the
  order form, which is the whole reason §11I made the page route rather than receive.
- **Revisited in Phase 5 against real Kinyarwanda strings.** Four English words may be
  five Kinyarwanda ones that do not fit; the fallback is a hamburger at `/rw` only,
  which is harmless because nothing meets Kinyarwanda until the flip bar clears.
- URL set otherwise forced by earlier rounds: `/collection` with pieces beneath,
  `/commissions`, `/the-making`, the story page, `/contact`, policies, `/o/<token>`,
  all mirrored at `/rw`, dashboard behind one login and off the public tree.

## Round 11 — Notifications

- **Nine automatic emails:** order created (carries the token), Confirmed, Declined,
  design shared, design agreed, payment received (fires up to three times, saying
  something different at each gate), In the making, On its way, Delivered. Plus the
  token re-send, which is a link and one line. All keyed in both locales, selected by
  `orders.locale`.
- **A preferred-channel field on the order**, set at creation, beside `locale`. Two
  values: email, WhatsApp.
- **The email always fires, whatever the preference.** It is the permanent address of
  the token — Round 5 refused expiry because a dead link is the site forgetting
  someone, and a WhatsApp thread is not durable storage. Chats get cleared, phones get
  replaced. **Said plainly on the form** rather than discovered: *we'll message you on
  WhatsApp, and email you a copy you can always come back to.*
- **Choosing WhatsApp makes it a required row in the Today queue.** It does not clear
  until he has sent it. The customer gets the channel they asked for; the durable copy
  exists whether they read it or not.
- **Every queue row that sends an email also offers a one-tap WhatsApp version** —
  pre-written `wa.me`, same wording, same token link, the customer's locale. Optional
  by default, required when chosen.
- **Round 5 is amended.** *"WhatsApp is enquiry only — it never carries a link, a
  status or a payment"* becomes **WhatsApp is never automated.** The cost argument was
  always about Meta billing per business-initiated message outside the 24-hour window;
  his own thumb is free, and `wa.me` needs no Business API, no billing and no approval.
  Enquiry-only was over-broad — and email being the rail was a fact about cost, not a
  claim about what a Kigali customer checks.
- **A failed send becomes a queue row** — *couldn't reach her, resend or call.* One
  webhook, one column. Without it a bounced Confirmed reads as a stranger who changed
  their mind: the customer never sees the price, never pays, and lands in Lapsed
  looking exactly like ordinary attrition. Phone is already required, so the fallback
  is human and already in his hand.
- **No measurements in any message, on either channel.** Round 7 stands unchanged.
- **The cost, named:** his phone's chat history now holds order tokens. The same
  exposure as his sent mail, and acceptable — but losing the phone matters more, which
  lands on Round 12.

## Round 12 — Admin security

*Held in four parts. The round was expected to reopen Rounds 5, 9 and 11. It
amended itself instead and left all three standing.*

### 12a — What he types to get in

- **The lock is sized to the room.** Behind one login: every live order token,
  stored raw and never expiring (R5); phone, email, address and body measurements
  under Law 058/2021 with the NCSA registration still pending; nine email types
  firing from his domain on one tap (R9a); token rotation that would cut every
  customer off from their order page with only R5's human recovery to undo it; the
  fit tick that is the liability record (R9c); price confirmation that sends a
  number that cannot be taken back.
- **Magic link, not password** — nothing to steal at rest, nothing to phish but a
  one-time code, no reset flow to abuse. A password does not move the root of
  trust, which is his email under every option including the password ones. Same
  reasoning R5 used to refuse a password store for customers, applied to the one
  account that sees all of them. *(Amended within the round by 12b.)*
- **Rejected: Cloudflare Access in front of the route.** Free to 50 users and
  genuinely two independent factors, but a second system a solo founder must keep
  working and one more thing that locks him out at 2am with no support.
- **TOTP stays available with no migration** — free and enabled by default on
  Supabase projects.
- **The admin login address is not the address printed on the site.** 2FA on that
  mailbox, and Supabase joins GitHub and Cloudflare in the runbook's 2FA line.

### 12b — Sessions

- **Under magic link alone the phone is both factors.** A thief with the unlocked
  device also holds the mailbox that receives the link, so shortening the session
  stops nobody and costs him friction daily. **This amends 12a: password *and*
  magic link, both, at every login** — the password is the one thing the phone does
  not contain. With a thirty-day session that is roughly twelve logins a year.
- **The password is never saved in the browser.** If autofill holds it, the device
  contains both factors again and the whole gain vanishes. Recorded as a condition,
  not assumed.
- **No anomaly tier.** Detecting a suspicious login means recognising device or
  network; on Rwandan mobile data behind carrier NAT the IP changes constantly, so
  the rule either fires on him every day or never fires at all. The expensive part
  to build and the part that would not work here.
- **Thirty-day time-boxed session**, rotating refresh, `httpOnly` `Secure`
  `SameSite=Lax`, scoped to the dashboard path. Time-boxed rather than indefinite,
  because a session that never dies survives a phone he sold. Inactivity timeout is
  the wrong tool — a thief is active so it never fires, and it only logs out the
  founder who spent a week stitching.
- **Re-auth defends ownership, not actions.** Changing the admin email or recovery
  address always demands a fresh link; it is the only move that converts temporary
  access into permanent ownership. Price confirmation does not — a step-up would
  fire on his daily job, cost a mail round trip each time, and stop nobody who is
  already reading his mail. **R9a's one-tap inline actions stand.**
- **No bulk send, rotate or export, ever**, as a security rule extending R9a's ban
  on bulk approve. The absence is the control: an attacker works one order at a time.

### 12c — Device loss

- **The password decision closed re-login, so the live session is the whole
  exposure.** What sits on that phone: the session, the mailbox, WhatsApp history
  holding order tokens (R11), and — R8 — the only copies of every master photograph.
- **The kill switch has a gap.** Supabase sign-out revokes the refresh token, but an
  access token already issued is stateless and stays valid until it expires. So
  **JWT expiry shortened to ~15 minutes** (a settings change, no code) **and
  `sessions_valid_after` on the admin row, checked server-side on every dashboard
  request.** Revocation becomes instant, and the column is also what makes 12b's
  thirty-day box enforceable rather than trusted to the client.
- **The session is a server-set `httpOnly` cookie**, never Supabase's default
  client-side storage. A session JavaScript can read is invisible to the kill switch
  and evictable besides.
- **Pinnable to the home screen** via a web app manifest on the dashboard routes
  only. **No service worker** — an offline work queue showing stale orders and
  firing emails on reconnect is a correctness problem, not a feature. A pinned
  instance can hold its own cookie jar, which is a third argument for the column.
- **His email 2FA must not live only on that phone.** Printed recovery codes or a
  second trusted device. Otherwise losing the phone locks *him* out of the recovery
  path while the thief's session is still open. Free, and the most important line in
  the round.
- **A WhatsApp two-step PIN**, so a swapped SIM cannot become someone messaging his
  customers as him.
- **Token rotation stays one at a time**, per the bulk ban. Ten orders is ten taps;
  the bulk version waits until the catalogue earns it, as R1 handled filters.
- **Automatic phone photo backup from day one.** R8 made his phone the archive and
  never said what happens when it is lost. Not security — it belongs here because it
  is what a lost phone costs.
- **The incident plan is on paper**, not remembered: sign out everywhere → change
  the password → remote wipe if it is online → rotate exposed tokens.
  `ubuntu-technical.md` §8 already says there is nobody to call.

### 12d — What it amends

- **R5's raw-token storage survives, and the reasoning is recorded so it does not
  return.** Hashing is not a trade-off but an incompatibility: a hash cannot be
  reversed into a link, so re-send would have to issue a *new* token on every status
  change, killing the customer's bookmarked copy and contradicting *no expiry, ever.*
  Encryption at rest defends a database-only leak, not a dashboard session, which
  decrypts by design — named as designed-for, with a lookup hash beside an encrypted
  column as the clean later migration. The backup is already encrypted (R5).
- **What does reduce the radius, and is free: the dashboard never renders a token.**
  No token field, no list, no link to `/o/<token>`. R9c's panels already mean he
  never needs the customer's URL. The one exception is R11's WhatsApp draft, which
  must carry the link — so a session yields **one token per deliberate action, not a
  table.** Same principle as the bulk ban: the absence is the control.
- **R9a, R9c and R11 stand unamended.** The round amended only itself.

## Round 13 — Kids

*A reserve-not-build round. The launch range is bucket hats, jacket, vest and
shorts; no kids' piece exists, and building kids' sizing for a catalogue with none
is what "filter every feature through the first ten orders" exists to stop. R7
settled the schema and R9b placed the page, so what is paid for here is only what is
cheap today and a migration later.*

### 13a — The wearer is not the customer

- **R7's `source` enum assumed the person ordering is the person measured**, and
  liability hangs off it. **`guardian` added as a fourth value** — the customer
  measured someone else, liability theirs, and the record says what actually happened.
- **The hole is a gift, not a child.** Someone measuring their partner at the kitchen
  table is not `self`, `tailor` or `standard`, and a gift is likelier in the first ten
  orders than a child's jacket. Kids only made it visible.
- **Reusing `self` was rejected.** It gets liability right and the record wrong, and
  the fit record's entire job is adjudication. One enum value now, before there are
  records to reclassify.
- **The child is never an entity.** No child record, no name, no date of birth. The
  order is the parent's, the customer row is the parent's, the measurements sit on the
  fit record where they already live. A minor's data carries heightened protection
  under Law 058/2021 and under GDPR if R15 ever ships to Europe; measurements attached
  to no identified child is the difference between minimal data and a profile. **True
  from the first migration** — not retrofittable once the shape exists.
- **Age at time of order, as a number, not a birth date.** A birth date ages by itself
  and identifies. It is what R7's guardrail bands key off.

### 13b — Safety and the making

- **Judged against the actual range, not a generic list. No cords, drawstrings or
  detachable embellishment on a children's piece; threads finished and trimmed on the
  reverse.** Cords land on three of the four garments and are restricted for
  children's clothing in the EU and US. Loose thread on the reverse is the hazard
  specific to *this* product, and no general checklist surfaces it. Flammability
  applies to sleepwear, which he does not make.
- **Craft, not code.** Rejected as a tick in R9b's publish floor on R9c's own
  reasoning: a tick he applies himself becomes reflexive, and a reflexive tick is
  process that looks like safety. There is also nothing to constrain — he configures
  colourway, cut and size, never construction.
- **Generous hem and sleeve allowance so it can be let down**, stated on the page as
  *cut with room to grow* and **never offered as a choice** — R7 fought to keep forks
  off that form. Making days plus queue offset can put a month between the tape and
  the finished garment, and cloth is cut at the second gate: growth is a wrong
  measurement that arrives on schedule. Folds into the seam-allowance homework item.
- **The R9c fit check shows how old the measurements are** on a kids' order. Derived
  from what the fit record already carries.

### 13c — Bands and the diagram

- **He creates more than one kids garment type** — *kids 2–6*, *kids 7–12*, wherever
  his own cutting splits. A three-year-old and a twelve-year-old differ by roughly
  double on every measurement, so a single band passes anything, and a guardrail that
  never fires is worse than none because it looks like a check. **No new schema:** R9b
  already made types configurable with their own bands.
- **A kids' type leads with height.** Children's sizing is height-driven; adult sizing
  is chest and waist. A property of the measurement list on the type row, already a field.
- **The fit diagram is a reference on the garment type, not a file bound to it.** One
  column holding a key, so two types point at one drawing. Otherwise two kids types
  mean two identical SVGs that drift the moment one is edited.
- **The measurement values themselves are his call**, already first on the homework
  list. Nobody who does not cut the cloth can answer it.

## Round 15 — International

*Closed short, as predicted. Most of it was already paid for: currency code with one
value and integer minor units (R3), the payments table and `payments.ts` with no
gateway, inches reserved through R7's recorded-unit field, and erasure as of R16.*

- **Destination zone is a modifier** under R3's existing system — Rwanda, East Africa,
  rest of Africa, rest of world — values he sets in Settings when he first ships
  abroad. Shipping from Kigali is neither small nor uniform, so it cannot hide inside
  the base price without inflating it for Rwandan buyers or appearing as a surprise at
  confirmation, which R3 called a genuine exception rather than routine. Reserved, no
  new schema.
- **Duties are the buyer's, stated plainly on the policy page.** Unstated, it arrives
  as a courier's bill and reads as a brand that misled them.
- **R7's alteration promise gains a distance clause.** *He can usually alter it; you
  cover the work and the return* is misleading from London, where return shipping to
  Kigali and back can exceed the garment. **Outside Rwanda: a stated contribution
  toward a local alteration instead of a return.** It converts an impossible logistics
  problem into a bounded money one, and it makes R7's case for urging measurements land
  harder — the further away, the more the tape matters. The amount is his.
- **It is one sentence, not a variant** *(pre-build review, amending the line above).*
  Written as a country-conditional string it would be a request-time branch on an
  edge-cached public page — locale already joins the cache key and country would have
  to join it too, plus a country field on a form that does not have one, to serve one
  clause. **Both cases are stated in the same sentence and nothing branches:** *you
  cover the work and the return — or, if you're outside Rwanda, we put [X] toward a
  tailor near you instead, because posting it back and forth would cost more than the
  piece.* A reader outside Rwanda reads one extra clause. That is the entire cost.
- **The duties clause gets the same treatment**, and the same review found it had
  reached no document at all: it is stated plainly in the policy page copy rather than
  shown conditionally.
- **Everything else waits on registration:** the gateway, the acquirer, whether terms
  differ contractually.

## Round 16 — What we design for but do not build

*The final sweep. The test: a reservation should be a column that exists and is
unused, or an adapter with one implementation. Anything that became a build is where
an MVP becomes a platform.*

- **Clean on that test — nine of them, and they are not all columns** *(corrected in
  the pre-build review; this line originally read "eight reservations, eight columns,"
  which was wrong twice).* **Six columns:** the payments table with one row per order
  (R3), the currency code with one value (R3), the customer row with auth columns null
  (R5), `ours` and `guardian` on the fit source enum (R7, R13a), the recorded unit
  (R7), `published_at` sorted with no marker rendered (R10). **Two adapters with one
  implementation:** `storage.ts` with Cloud Run named behind it (R8) and `payments.ts`
  with no gateway. **One schema shape with no interface:** the filter taxonomy with no
  filter bar (R1). Nothing built.
- **One acknowledged exception: `/rw` is built, not reserved.** R14 took that
  deliberately — the schema was the expensive part and the routes had to be walkable —
  and it is named here rather than left quiet.
- **The exception was one item short** *(pre-build review).* The walkable routes were
  named; the **translation-completeness meter** was not, and it is the part that had
  genuinely become a feature — a computed, rendered measure of progress toward a switch
  that is off. **Cut** (see R9b). The **nine email bodies keyed in both locales stay**:
  keys are cheap and the absent Kinyarwanda values are the unbuilt part, which is
  exactly what a reservation is supposed to look like. Per-entity translation rows and
  the fallback chain stay for the same reason.

**Three gaps the sweep found. All one column or one table, all following from
commitments already made rather than features imagined, all expensive later:**

- **The maker is a string, not an entity.** R9d has maker name as a dashboard field,
  but `ubuntu-foundation.md` §6 commits to makers being named and celebrated, with
  faces on the story page. The day that page exists, a typed name per order is a
  backfill of misspellings. **One table and an FK now**, one row to start.
  *(Pre-build review: the table is one row, but the dashboard surface it needs — a
  makers list in Settings and a picker on the order — appeared in no document. It is
  now costed into Phase 2 rather than discovered inside it. This is the one place the
  round's own recommendation carried an unnamed build.)*
- **Nothing supports erasure.** The DPA registration is pending and the database holds
  phone numbers, addresses and body measurements — including, after R13, a child's. A
  data subject can ask to be forgotten, and R1 requires past orders to always resolve,
  so erasure means **anonymising the customer while the order survives**: `redacted_at`
  and nullable identity columns. Retrofitting means writing a migration during a
  request that is already legally running.
- **And it stopped one table short** *(pre-build review, and the sharpest thing the
  review found).* R13 made the child not an entity, so a child's measurements live on
  the **fit record**, attached to the parent's order — and `redacted_at` on the
  customer touches none of it. A child's measurements surviving a parent's erasure
  request is the precise failure Law 058/2021 is about, and there is no child row to
  delete instead. **Fit records redact with the customer:** measured values and
  age-at-order clear. **The order keeps only what proves the order happened** — piece,
  money, dates, event log. *The named cost: a redacted fit record can no longer
  adjudicate a fit dispute. That is correct, because the person asking to be forgotten
  is the person the record protected.* Decided before the schema, which is the only
  time it is free.
- **Payments have no type.** R3 said the table makes deposits, refunds and corrections
  free later, and never gave it the column that does; R4 promised a refund that shrinks
  with progress. Without a type a refund is a negative row you have to infer. **One enum.**

---

## Round 17 — Ubuntu for Nature

*The founder's second thread: pieces made from saved cloth rather than new. Raised
before the schema, which is the only reason it is here as a column and not a
migration. The whole round is an exercise in the R16 test — how much of this is a
build, and how much is one field and a stronger story.*

**What it is, said plainly.** He also makes garments from rescued material — old
clothes, offcuts, cloth on its way to waste — remade into new pieces. Saving the
material *is* the point: you keep something out of the bin and get something good in
return. That is the second thing the brand stands for, beside *ubuntu*.

**The finding: this is not a second line, a second brand, or a second site.** Every
piece he makes is still a stitched scene — a story on cloth. That never changes; the
scene is the soul in both cases *(R2 holds unamended in substance)*. What a reborn
piece adds is only **where the cloth came from**, and even that is not shown as
product. The finished piece stands on its own like all his work. The rescuing is a
**support point and a marketing truth**, told in the story and in marketing — never a
feature on the product page, never a separate catalogue.

So the honest footprint is one fact on a piece, and a second pillar in the voice.

- **A piece carries `reborn` — one boolean, default false.** True where the cloth was
  saved. That is the entire schema cost of Nature. It drives **no separate query, no
  separate route, no separate bucket, no second grid.** A reborn piece sits in the one
  catalogue beside every other, browsed the same way, ordered the same way.
  - **The word is `reborn`**, in the code, the docs, and the site — the cloth had a
    life, it ended, the piece is that life begun again. Not "upcycled" (tired,
    technical), not "recycled", not "eco". Chosen for the same reason every other term
    on this site was: it says the true thing in his voice. *(Copy consequence in
    `ubuntu-copy.md` §1.)*
- **The source is never shown as product.** No before/after on the product page, no
  "made from" provenance field, no photograph of the old garment beside the new one.
  The buyer knows it is reborn; they are not shown the bin it came from. This is why
  `reborn` is a flag and not a relationship — there is no source entity to point at,
  because the source is deliberately not modelled.
- **It runs on the made-to-order model, unchanged.** He remakes in his style; nothing
  is tied to one specific physical garment that gets used up. So there is **no
  inventory, no stock count, no sold-once state** — the one genuinely frightening
  thing Nature could have brought does not exist, because the decision above means the
  thing that would have created it was never built. *(This is the R1 no-scarcity rule
  surviving intact; see the deferral below for the one case that would test it.)*

**The real work is copy, not architecture.** *Saving what would be wasted, making it
good* becomes a **second brand pillar beside `ubuntu`** — woven into Voice, the
homepage, and the story, thoughtfully, because it is core to what he represents. That
is words, governed by the copy rules, touching nothing in the runtime. It is the part
worth doing carefully, and it is the part that has nothing to do with the schema
deadline. *(Recorded as a copy consequence, not a build task.)*

**Deferred — designed for, not built** *(the R16 test, applied to Nature's own
edges):*

- **The before/after marketing imagery.** A story-telling asset for a marketing
  section, not something a piece needs to function. It shows when the brand chooses to
  show it, after launch. The `reborn` flag is all the reservation it needs — a
  marketing surface can read a boolean; it does not need the schema to carry paired
  images today.
- **The genuinely one-of-one piece.** A reborn piece made from one irreplaceable
  garment that truly cannot be remade would be the first inventory-like thing on the
  site — a piece that can be *claimed*, after which it is gone. He is **not** building
  that for launch; the finished-work-in-his-style model covers Nature without it. Named
  here so that if it ever arrives, it arrives as its own decision round with the
  claimed/available state worked through — not retrofitted into a catalogue that
  assumes everything is repeatable. **The door stays open** (a boolean does not close
  it) **without building the room.**
- **Physical stores and souvenirs.** He pictures selling in person one day — visiting
  sites, tourists, souvenirs. That is a whole channel with its own hard questions (who
  marks a piece sold offline, whether it needs a till, whether it touches this system
  at all) and it is a Phase 8 shape, not a foundation one. Written down so it is not
  forgotten; not designed, and explicitly not allowed to block launch.

*The named cost of doing it this way: the brand tells the saving-nature story in
words and, later, in marketing images, rather than proving it on each product page
with the garment's history. That is correct — the finished piece is his work and
speaks as his work, and a provenance trail on every card would be the first time the
site asked a buyer to evaluate a piece by something other than the scene and the
story. Decided before the schema, which is the only time the boolean is free.*

---

# PART THREE — WHAT REMAINS

## Rounds

**All sixteen are closed**, and one amendment pass has run over the top of them. The
list stood at twelve after Round 4, grew during Rounds 1 and 4, and never grew again.
Gaps were found by working through adjacent rounds, and every round now has adjacent
ones on both sides.

**The pre-build review, in one paragraph.** Before any code, the eight documents were
read against each other for contradictions, for reservations that had grown into
builds, and for what blocked setup. Three findings were errors from the final
propagation session (the fit-diagram column, the "three adapters" line, this
document's own reservation count). Nine were amendments and are recorded in their
rounds above and in the table below. One was new and is the erasure decision in R16.
Nothing in the review reopened a round.

What blocks a launch from here is his homework and the RDB filing. Neither is a
decision, and neither is a build.

## Answered only by running it

- Postgres connection path from Workers — direct, Hyperdrive, or Supabase HTTP client
- Whether View Transitions survive the Workers runtime under OpenNext
- How the motion actually feels
- Whether browser-side image resize survives his actual phone — EXIF orientation and
  memory on a mid-range Android. If it fails, Cloud Run is already named.
- Whether Safari can encode WebP from canvas; the fallback is JPEG
- Whether Cloudflare Images is genuinely free under 5,000 monthly transformations —
  ten minutes in setup Stage 0, and it would return AVIF and precise cropping
- Whether the server-set `httpOnly` cookie session behaves under OpenNext *(R12c)*,
  and whether a pinned home-screen instance keeps its own cookie jar in practice

## His call

Consolidated in `ubuntu-foundation.md` Section 13 — thirty items, one sitting.

~~**What language is the site in?**~~ **Answered in Round 14** — English canonical,
Kinyarwanda built dark. The five that would **change what gets built** and are worth a
call rather than a batch:

1. **The measurement table per garment** — which measurements, how each is taken, a
   plausible band and an impossible band — plus **body ranges for S/M/L/XL.** Now
   blocking, because measurements became the urged path. Hand him a table, not a
   question.
2. **Does he cut more than one block?** Governs whether cut options ever exist.
3. **Generous seam allowance on every piece.** Before a single piece is cut — and more
   load-bearing than before, since it is what makes a wrong measurement survivable.
4. **The design fee, and the split between cutting and balance.** The commission page
   cannot be written without the first number.
5. **Merchant rates from Bank of Kigali and MVend** for eKash acquiring. May change
   which bank he uses.

Batched with the rest, but new since Round 4: the Kinyarwanda form of
`Ask for this piece`; whether the footer carries a Rwandan expression beside the Nguni
maxim; **who the two Kinyarwanda readers are**; alteration pricing; and whether he
wants a cap on open commissions — *which is now a number he holds in his head rather
than a dashboard nudge, because the pre-build review struck the threshold nudges on
R9a's reasoning.*

New since Round 12, and the only one that is urgent because it is free and protects
everything else: **does his email account recovery exist anywhere other than that
phone?** Printed codes or a second device. If the answer is no, the kill switch has
no hand to press it.

New since Round 13, batchable: confirmation of the **no-cords rule** on children's
pieces, and **the growth allowance he is willing to cut**. New since Round 15: the
**alteration contribution outside Rwanda**, and the four **shipping zone values**
when he first ships abroad.

New since Round 8, all batchable: **the four nav labels in Kinyarwanda** (Round 10
assumes four fit across a phone; five long words change that, and it is tested in
Phase 5); and whether the *newly stitched* marker is worth showing at all once the
catalogue reaches fifteen pieces, or whether newest-first ordering says it already.

---

# THE DOCUMENT SET

| File | Holds | Upload to a new chat? |
|---|---|---|
| `ubuntu-foundation.md` | What Ubuntu is — brand, product, business, content map, motion | **Yes** |
| `ubuntu-decisions.md` | Method, closed rounds, what remains | **Yes** |
| `ubuntu-technical.md` | Stack, architecture, cost model, build phases | **Yes** |
| `ubuntu-copy.md` | Every drafted string and long-form text | **Yes** |
| `setup-runbook.md` | Zero to first commit, as a checklist | When building |
| `CLAUDE.md` | Claude Code's always-loaded instructions | Repo root |
| `rules-motion.md` | Path-scoped motion rules | `.claude/rules/motion.md` |
| `rules-copy.md` | Path-scoped copy rules | `.claude/rules/copy.md` |

*Superseded: `ubuntu-project-foundation.md`, `ubuntu-decisions-checkpoint.md`.*

**Lines superseded within the set, so nothing contradicts quietly:**

| Superseded | By | Where |
|---|---|---|
| Commissions: deposit percentage upfront, balance before shipping | Three gates; an absolute design fee | R6 |
| "The urging stays light. Standard sizing is a legitimate path, not a lesser one." | Measurements urged, and therefore taught | R7 |
| "Teaching people to measure serves a gap that is nearly empty." | Instruction ships beside every field | R7 |
| Resize on upload, **server-side** | Resize in the browser | R8 |
| "Cloudflare Images has no free tier" | Possibly free under 5,000 transforms — verify | R8 |
| "No design-approval workflow" | Two events, because money gates on the agreement | R6 |
| Order access as an unresolved hole | Token spec, closed | R5 |
| Message templates listed as a dashboard field (`CLAUDE.md`) | Templates are code; a personal note field instead | R9d |
| "WhatsApp is enquiry only — never a link, a status or a payment" | **WhatsApp is never automated.** Hand-sent `wa.me` carries both | R11 |
| Round 1 settled un-publishing only | A piece is a draft until published; three states | R9b |
| Magic link only as the admin login | Password **and** magic link, both, every login | R12b |
| Fit `source`: self / tailor / standard / ours | `guardian` added — the customer measured someone else | R13a |
| Maker name as a string field on the order | Makers are a table with an FK; one row to start | R16 |
| "Payments table makes refunds free later" | It needed the `type` enum that makes them free | R16 |
| Alteration promise stated uniformly | A distance variant: contribution, not return, outside Rwanda | R15 |
| A country-conditional alteration variant | One sentence stating both cases; no branch, no country field, no cache key | Review |
| Dashboard nudge when open orders cross a threshold | Struck — Today is never truncated, and R9a refused guessed thresholds | Review |
| Five dashboard sections | Four. Customers cut; the customer row and every FK unchanged | Review |
| Translation completeness as a column in Pieces | Cut — a meter of progress toward a switch that is off | Review |
| Nav label *Commissions* | Nav label **Only yours**, route stays `/commissions` | Review |
| Contact page with no URL | `/contact`, mirrored at `/rw/contact`, Phase 3, reached from the footer | Review |
| International delivery shown at the confirmation step | Shown while it is being chosen, per R3 | Review |
| Backups, restore test and keep-alive in Phase 7 | Setup Stage 6, before the first real feature | Review |
| `redacted_at` on the customer alone | Fit values and age-at-order redact with the customer | Review |
| One SVG per garment type | One drawing referenced by key, so two types share one file (R13c, unpropagated) | Review |
