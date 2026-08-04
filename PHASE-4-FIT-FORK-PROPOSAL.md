Phase 4 · Chunk 2 — The fit fork

PROPOSAL. Held for review. Nothing is wired into the order form and nothing is
committed.

Governs: R7 (fit data), R13a (the wearer is not the customer), R13c (bands and
the diagram), rules-copy §4, Law 058/2021.


─────────────────────────────────────────────────────────────────────────────
THE FINDING THAT COMES FIRST
─────────────────────────────────────────────────────────────────────────────

`garment_type_measurements` is EMPTY in production. Verified by direct read:

  garment_types              1 row  — key "hat", audience adult,
                                      diagram_key "asd" (placeholder)
  garment_type_measurements  0 rows
  piece_options              0 rows
  settings                   design_fee 0, reply_time_days null,
                             queue_offset_days 0, priority_modifier 0

The three-band guardrail is driven ENTIRELY by ranges he sets in Settings.
Phase 2 built that screen and it works; the numbers have never been entered,
because they are the first item on the founder track — *the measurement table
per garment* — which has now ridden through four sessions unsent.

So: the fork can be BUILT without him. It cannot be USED without him. A garment
type with no measurement list asks for nothing, and the form correctly falls
back to "he'll settle the numbers with you" — a real path, not a stub (R7 has
him entering numbers himself when they arrive over WhatsApp).

This does not block the proposal. It does mean the acceptance test for this
chunk is "the form renders and refuses correctly given bands", not "a customer
placed an order with measurements", until he answers.


─────────────────────────────────────────────────────────────────────────────
1 · THE THREE BANDS WITH NO JAVASCRIPT
─────────────────────────────────────────────────────────────────────────────

The hard part is the middle band. Plausible needs nothing. Impossible is a
refusal. But "asks a gentle question that must be acknowledged" needs a round
trip — and a round trip needs the number to SURVIVE it.

Everywhere a number could survive a round trip is somewhere a measurement must
never be:

  a query string   — lands in server logs, browser history, Referer headers
  a cookie         — personal data at rest in a browser, sent on every request
  a hidden field   — bounced off the browser, fine in transit, but it means
                     re-rendering the form, and a server action can only redirect
  useActionState   — works, and progressively enhances, but needs 'use client'
                     on the order form; trades a working no-JS form for state
                     plumbing, and puts a client bundle on the most important
                     page on the site

PROPOSED: the number survives the round trip IN THE DATABASE, BEHIND THE TOKEN
— which is the only place R7 and R11 permit it to be at all.

  Pass 1 — the order form, on /collection/<slug>
    · Each field carries min/max from the IMPOSSIBLE band only.
      HTML constraint validation is markup, not script: the browser refuses
      out-of-range with no JS, and a screen reader announces the range.
      The plausible band deliberately gets NO attribute — a browser cannot ask
      a question, and turning "unusual" into "invalid" is the hard block on a
      real body that R7 refused.
    · Submit → the server re-checks BOTH bands (a rendered attribute is a
      convenience; the write path is the rule).
        - any impossible  → refuse, write nothing, back to the form naming the
                            field. Rare, because the browser already caught it.
        - otherwise       → create the order AND the fit record in one go, with
                            `warned` set per measurement and `acknowledged_at`
                            null. Redirect to /o/<token>.

  Pass 2 — the acknowledgement, on /o/<token>
    · If any measurement is warned-and-unacknowledged, it is the top thing on
      their order page: the value, the fixed UNLIKELY_WARNING string, and one
      button per number — "That's right — leave it".
    · That POST sets `acknowledged_at`. Nothing else moves.

Why this is better than the inline version, not just cheaper:

  · zero client JavaScript on the order form
  · the number never leaves the token — not a URL, not a cookie, not a log
  · the acknowledgement is a SEPARATE DELIBERATE ACT, days later if they like,
    rather than a checkbox ticked in the same breath as the number. In a
    dispute that is materially better evidence.
  · it reuses the surface R7 already specified: "commission fit arrives on the
    order page when the design is agreed — same form, same guardrails". One fit
    surface, not two. (Same argument as R13c on the diagram: two copies drift.)

MAKING "MUST BE ACKNOWLEDGED" ACTUALLY MUST — one condition, and I want your
call on it:

  The dashboard fit check (R9c, required before *In the making*, unconditional)
  REFUSES while an unacknowledged warning stands. No acknowledgement → no fit
  check → no *In the making* → no cloth cut. That makes "must" structural
  rather than a word in the copy, and it costs one line.

  Cost, named: an order can strand if the customer never returns. The escape is
  the one R7 already describes — he talks to them and enters the numbers
  himself, which appends a NEW fit record (records append, never overwrite) and
  the old warning is no longer the one in force.

  I have NOT built this condition. It touches `checkFit` and it is a real
  product decision about stranding an order. Say yes and it's four lines.

THE COST OF THE WHOLE SHAPE, NAMED: the order is created carrying an
unacknowledged warning. The alternative — refusing to create the order until
the question is answered — means holding the numbers somewhere before an order
exists to hold them, which is the thing there is nowhere safe to do. All four
facts the liability record needs (the number, the band in force, that we
warned, whether they acknowledged) are captured correctly either way.


─────────────────────────────────────────────────────────────────────────────
2 · THE SNAPSHOT, AND HOW `source` IS SET
─────────────────────────────────────────────────────────────────────────────

Per fit_record:
  source              from the path + one question (below)
  unit                "cm" — what was in front of them
  size_chart_version  SIZE_CHART_VERSION, a constant in code
  standard_size       the chosen size, path B only
  age_years           a NUMBER, kids garment types only, never a birth date

Per fit_measurement (all five copied IN, never joined):
  measurement_key     the key its definition uses in code
  value               canonical integer — mm for a length, g for a weight
  label               as it read on the form that day
  instruction         THE SENTENCE THAT SHIPPED BESIDE THE FIELD
  plausible/impossible min+max   the bands in force at that moment
  warned              the value fell outside plausible
  acknowledged_at     set by pass 2, and only ever where warned is true
                      (the schema already carries that check constraint)

The instruction is copied rather than joined because it is what the policy's
shared-liability clause turns on. Rewording it better next month must not
rewrite what THIS person was told.

`source`, decided by the path rather than asked twice (`src/lib/fit.ts`):

  path B (a size)              → `standard`, always. A size off the chart is
                                 not a measurement anybody took.
  path A + "Mine"              → `self`
  path A + "Someone else's"    → `guardian`
  path A + "A tailor"          → `tailor`
  `ours`                       → UNREACHABLE from a public form. It means
                                 measured at a physical point by us, liability
                                 fully his, no negotiation. Only the dashboard
                                 may assert it, because only he was there.
                                 There is a test that asserts this.

THE CHILD IS NEVER AN ENTITY (R13a). In the whole component there is:
  no name field, no date of birth, no child row, no second customer.
Only: source = guardian, plus a number of years, shown only on a kids garment
type, with the note saying out loud what is not being kept. `ageAtOrder()`
refuses anything that is not a plain integer 0–120 — including a date string.

  Bug found while testing this: `Number("")` is 0, so an untouched age field
  would have recorded a newborn on every guardian order. Fixed, with a test.


─────────────────────────────────────────────────────────────────────────────
3 · THE PROTOTYPE
─────────────────────────────────────────────────────────────────────────────

  /dashboard/fit-prototype     (behind the login, so an unfinished form
                                cannot be reached by a stranger)

It renders the REAL component and runs the REAL rules. It writes nothing — no
order, no fit record, no customer. Four sections:

  1  the form as a customer meets it (adult, measurements + sizes)
  2  what the rules made of whatever you typed — stored value, what it reads
     back as, which band, and exactly what the snapshot would carry
  3  the acknowledgement pass, as it renders on /o/<token>
  4  the kids variant — one extra field, a number of years

One thing in the harness is NOT how the real form behaves: section 1 submits
with method="get", so you can see a band outcome without anything being
written. That puts numbers in a URL, which the real form never does. It is
labelled on the page.

Files:
  src/lib/fit.ts               the rules, pure — no db, no request, no clock
  src/lib/fit.test.ts          21 tests
  src/components/fit-fields.tsx  the form, server-rendered, zero client JS
  src/app/dashboard/(app)/fit-prototype/page.tsx   the harness


─────────────────────────────────────────────────────────────────────────────
4 · TWO THINGS I WANT YOUR CALL ON
─────────────────────────────────────────────────────────────────────────────

(a) THE SIZE CHART HAS NO SOURCE OF TRUTH.

    `fit_records.size_chart_version` exists and is NOT NULL, which implies a
    stated chart. There isn't one — no S/M/L body ranges anywhere in code or
    in the database, and it is on the same unsent founder list.

    Option 1 (built in the prototype): the sizes come from the piece's own
    `piece_options` group `size`, which already exists as a concept and
    already carries a price modifier. Height and weight are recorded beside
    the choice as ordinary measurement rows, for his check. No new source of
    truth. Works today — except `piece_options` is also empty, so path B
    currently offers nothing either.

    Option 2: a chart in code (S/M/L/XL + body ranges), versioned by
    SIZE_CHART_VERSION as that column seems to intend. Blocked on his numbers.

    I recommend 1 now, 2 reserved. Option 1 is a strictly smaller claim.

(b) THE INSTRUCTION TEXT IS ENGLISH-ONLY, AND IT IS THE LIABILITY SENTENCE.

    `MEASUREMENTS` in src/content/measurements.ts holds label + instruction as
    inline English literals — no `rw` overlay, unlike every other string on the
    site. A Kinyarwanda customer would be shown English instructions AND we
    would snapshot English as "what they were told".

    That is the one place in this design where the record would not honestly
    say what the customer saw. It is pre-existing (Phase 2), but the fit fork
    is what makes it load-bearing.

    Cheapest correct fix: key label + instruction like everything else, with
    rw null (falls back to English silently, as R14 already permits), and
    snapshot the string ACTUALLY RENDERED rather than the English constant.
    Then when he writes the Kinyarwanda, the snapshot follows automatically
    with no further change.

    Not done — it touches the measurement definitions, which are also his
    homework, and I did not want to reshape them while the wording is open.

Also noted, not blocking: `UNLIKELY_WARNING` is an inline English literal in
measurements.ts for the same reason and has the same fix.


─────────────────────────────────────────────────────────────────────────────
WHAT WIRING IT IN WOULD TOUCH, ONCE APPROVED
─────────────────────────────────────────────────────────────────────────────

  src/lib/order-create.ts        accept a fit block, write the record in the
                                 same call that creates the order
  src/app/[locale]/(site)/actions.ts   read the fit fields off the form
  collection/[slug]/page.tsx     replace the marked slot with <FitFields>
  src/app/o/[token]/page.tsx     render <FitWarnings> above everything
  src/app/o/[token]/actions.ts   the acknowledge action
  (your call)  orders/actions.ts checkFit refuses on an open warning

No migration. The schema carries all of it from Gate 0 — fit_records,
fit_measurements, the acknowledged_at check constraint, the fit_source enum
including `guardian`. Nothing here reached for db:generate.
