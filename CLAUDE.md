# Ubuntu

Hand-embroidered clothing brand, Kigali. Made-to-order: nothing is stocked, every
piece is stitched after it is asked for. The site is a small app — public pages,
an order system with private status pages, and an admin dashboard for the founder.

Full brand and content plan: `docs/foundation.md`. Read it when you need intent
behind a decision. Do not import it — it is reference, not session context.

## Commands

```
pnpm dev        # local dev server
pnpm build      # next build
pnpm preview    # opennextjs-cloudflare build && preview  (production-like, local)
pnpm deploy     # opennextjs-cloudflare build && deploy
pnpm size       # check worker bundle against the 3 MiB limit
```

Run `pnpm preview`, not just `pnpm dev`, before saying a change works. Several
Cloudflare constraints only surface in the Workers runtime.

## Stack

- **Next.js App Router** + TypeScript (strict), **pnpm**
- **Cloudflare Workers** via `@opennextjs/cloudflare` — hosting
- **Cloudflare R2** — every uploaded file
- **Supabase** — Postgres and the single admin login. **Not** storage, not file serving.
  Login is **password *and* magic link, both, every time.** The password is the one
  factor his phone does not contain — so it is never saved in the browser.
- **Drizzle** — database layer
- **Tailwind** for layout; hand-written CSS and SVG for all motion

## Hard constraints

Pre-revenue. Everything runs on free tiers until the first sale.

- **Never add a paid service or a dependency with a cost.** If a task seems to
  need one, stop and say so instead of adding it.
- **Worker bundle stays under 3 MiB gzipped** (Cloudflare free plan). Run
  `pnpm size` before any deploy. Prefer a hand-written 40 lines to a 200 KB package.
- **10ms CPU per request** on the free plan. No server-side image processing, no
  heavy computation in a request. `sharp` does not run in the Workers runtime at all.
- **No animation libraries.** No GSAP, Framer Motion, Lottie, anime.js. Motion is
  the native View Transitions API, CSS, and SVG stroke animation. This is both a
  bundle constraint and a brand decision.
- **`next/image` default loader does not work here.** Use the custom loader in
  `src/lib/image-loader.ts`.
- **Render on the server.** Supabase has no African region, so client-side
  fetching is slow for the actual customers. Server Components by default;
  `'use client'` only where interaction genuinely requires it.

## Provider adapters

Every external service sits behind one module. Never call a provider SDK from a
component, page, or route handler.

- `src/lib/storage.ts` — uploads, URLs, deletes (R2 today)
- `src/lib/email.ts` — one `send()` (order links, status changes)
- `src/lib/payments.ts` — payment state only, no gateway today
- `src/lib/auth.ts` — the admin session: read, verify, revoke

Order payment status is a column in our database that the dashboard sets. When a
gateway arrives it writes the same column. Adding it must not change the order
model or the customer's journey.

## Images

His photos come off a phone at 4–12 MB. Rwandan mobile data is expensive and most
visitors arrive on phones from Instagram or TikTok — **and he uploads on the same
network**, which is why the resize happens where it does.

- **Resize, compress and encode in the browser, before upload.** Canvas decodes and
  writes WebP; the Worker validates and stores. Server-side is impossible here.
- **Three derivatives — 400 / 800 / 1600 px, WebP.** Progress photos get one at
  1000 px. **Never serve an original; none is kept.** His phone is the archive.
- **Two buckets.** Catalogue photos are public, served direct from R2 on their own
  hostname, content-hashed and `immutable`. Progress photos and customer reference
  images are private, streamed through the Worker with the order token checked.
- **Store width, height and a focal point on every image.** Missing dimensions cause
  layout shift, which here is a motion bug, not a metric. Cards crop 4:5 with
  `object-fit: cover`; the focal point is what stops it beheading people.
- `next/image` is kept for `srcset`, lazy loading and layout stability only. The
  loader in `src/lib/image-loader.ts` maps a width to the nearest derivative — a URL
  mapper, not a transformer.
- **Alt text is required**, defaulting to the piece's scene line.
- Never add an image to the repo that a dashboard field should hold.

## Design tokens

Defined once as CSS variables. Never hard-code a hex value in a component.

```css
--cream:  #F5F0E8;  /* canvas — page background, behind every photo */
--ink:    #1A1208;  /* text, header, drawn lines */
--wine:   #4E2728;  /* thread — underlines, borders, the stitch */
--hill:   #3D5A3E;  /* cloth */
--tan:    #E8C49A;  /* cloth */
--udongo: #C49A6C;  /* cloth */
```

**The colour law — do not break it.** Strong colour and garment photos never
share a section. Any section containing a product photo is on `--cream`. The
three cloth colours are only for sections with no garment in them. The clothes
must always be the highest-contrast thing on the page.

Typography: a warm serif for headings, a humanist sans for body and forms. The
handwritten script is the logo only, plus one closing mark per page — never body
text, never headings.

## Motion laws

Detail lives in `.claude/rules/motion.md`. These four govern everything:

1. **Vertical only.** Elements enter by rising. Nothing slides sideways.
2. **Animate once, then rest.** No loops, no idling. One exception: the
   running-stitch divider.
3. **Cloth follows the line.** Colour and images settle after the heading they
   belong to, never before.
4. **One thread at a time.** Never animate three things simultaneously.

Every animation honours `prefers-reduced-motion`. Reduced motion gets the
finished state, not a broken one.

## Conventions

- **Mobile-first.** Write the stacked mobile layout first, then add breakpoints
  upward. A desktop-first component is a bug here.
- **Priority renders only while the global queue offset is non-zero.** The modifier
  and the offset exist from day one; the option does not appear on a page while the
  line it promises to move someone up is empty.
- Motion code in `src/motion/`. Copy strings in `src/content/`.
- Server Components by default. Colocate route code under `src/app/`.
- **Routes:** `/` (landing page, window display inside it), `/collection` with
  pieces beneath, `/commissions`, `/the-making`, the story page, `/contact`,
  policies, `/o/<token>`. All mirrored at `/rw`. Dashboard behind one login, off the
  public tree. **The collection page sorts newest-first and is the permanent "what's new"**
  — there is no `/new`. `published_at` exists and sorts from day one; the visible
  marker waits until the catalogue earns it.
- **Four nav items: Collection · Only yours · The making · Our story.** Policies and
  Talk to us in the footer, no hamburger. Revisited in Phase 5 against real
  Kinyarwanda labels.
- **A route name and a nav label may differ, and this is the only case.** The route
  is `/commissions`; the label a customer reads is **Only yours**. *only-yours* is a
  poor slug and a worse link to paste into a message. Nowhere else on the site.
- **Customers have no accounts.** Each order is reached by a **128-bit token in the
  path** — `/o/<token>`, never a query string, never a sequential id. Stored raw so
  the same link can be re-sent, rotatable from the dashboard, and **never expiring**.
  The token is re-sent by email on every status change.
- Order routes get `noindex, nofollow` and `Referrer-Policy: no-referrer`.
- **Email and phone are both required on an order.** Email is the automated rail;
  phone is delivery and his own hand.
- **Fit `source` is `self` / `guardian` / `tailor` / `standard` / `ours`**, and
  liability follows it. `guardian` is the customer measuring someone else — a gift, or
  a child. **A child is never an entity:** no name, no date of birth, no row. Age at
  order is a number, not a birth date.
- **The fit diagram is referenced, not owned.** The garment type holds a key naming
  its drawing, so two types point at one SVG. Two kids' types must never become two
  identical files that drift.
- **The maker is a table with an FK**, not a typed string — the story page names and
  celebrates makers, and a string backfills as misspellings. The dashboard cost is
  named rather than discovered: **a makers list in Settings and a picker on the
  order**, both in Phase 2.
- **Payments carry a `type`** — payment, refund, correction. A refund is not a
  negative row you infer. **Plus `method`** (manual / gateway, so a gateway arriving
  changes nothing) and a **reported** flag: a customer-reported payment is a payment
  row awaiting his confirmation, never an order state.
- **Erasure anonymises the customer while the order survives** — `redacted_at` and
  nullable identity columns. Past orders must always resolve.
- **Erasure reaches the fit record.** Measured values and age-at-order redact with the
  customer. A child's measurements surviving a parent's erasure request is the exact
  failure Law 058/2021 exists to prevent, and the child has no row of their own to
  delete. What the order keeps is what proves it happened: piece, money, dates,
  events. *The named cost: a redacted fit record can no longer adjudicate a fit
  dispute — correct, because the person asking to be forgotten is the person it
  protected.*
- **WhatsApp is never automated** — never the Business API, never a scheduled send.
  Meta bills per business-initiated message outside a 24-hour window. Hand-sent
  `wa.me` links are free and *do* carry the token and the status: every queue row
  that sends an email also offers a one-tap WhatsApp version, pre-written, same
  wording, same link, the customer's locale.
- **`preferred_channel` on the order** — `email` or `whatsapp`, set at creation
  beside `locale`. **The email always fires either way**; it is the permanent address
  of the token, and a chat thread is not durable storage. Choosing WhatsApp makes
  that row *required* in the queue rather than optional.
- **Two locales, English canonical.** Translatable content lives in per-entity
  translation rows; fixed strings are keyed in `src/content/`; `locale` is a column
  on orders and customers, set at creation and read by every email. English is
  unprefixed, Kinyarwanda at `/rw` — built and walkable, `noindex` and unlinked until
  the switcher flips. **No i18n library** — hand-written, and nothing needs one yet.
- Layouts must survive strings ~30% longer than the English. Kinyarwanda runs long.

## The dashboard

Four sections: **Today · Orders · Pieces · Settings.** Garment types and the makers
list live inside Settings, not as sections of their own.

**Customers was cut at launch** *(R9b amendment).* The customer row exists from day
one exactly as R5 specified and every FK resolves — what was cut is a section no
document ever specified, which would otherwise have been invented at build time.
*"This is her third piece"* waits for the order screen's customer panel to want it.

**Getting in.** Password and magic link, both, every login — roughly monthly, because
the session is a **thirty-day time-boxed** one. The cookie is **server-set,
`httpOnly`, `Secure`, `SameSite=Lax`**, scoped to the dashboard path, never
client-side storage. Every dashboard request compares `sessions_valid_after` on the
admin row, which is what makes *sign out everywhere* instant and the thirty-day box
real. JWT expiry is ~15 minutes in the Supabase settings. Pinnable via a web app
manifest on dashboard routes only — **no service worker.**

**Re-auth defends ownership, not actions.** Changing the admin email or recovery
address demands a fresh link. Confirming a price does not — a step-up on his daily
job stops nobody already reading his mail.

**Today is a work queue, and it is the home screen.** An order appears when the next
move is *his* and leaves the moment he makes it — gate-based, never time-based, so
there are no thresholds to tune. **Never truncated:** it is everything waiting on
him, or it is worthless. Grouped by action with a count per heading. Days-waiting
shows on every row as information only and never adds or removes anything. One line
at the foot for orders waiting on customers.

- **Facts complete inline** — payment landed, package posted. One tap, row goes,
  email fires.
- **Judgements open the order** — confirming a price, sharing a design. Each sends a
  number that cannot be taken back. **No bulk approve anywhere.**

**The order screen is panels, not a timeline** — customer, money, fit, photos,
maker. The event log is one panel, collapsed. The action the queue sent him for sits
at the top.

- **Price is adjustable at confirmation, reason required**, written as its own named
  line in the snapshot. The customer's acceptance is the payment — no new state.
- **A fit check is required before *In the making***, recording who and when.
  Unconditional. Cloth is cut at the second gate, so a wrong measurement found after
  it is unrecoverable.

**Pieces are `draft → live → removed`.** Draft on create, so he can work for weeks
with photos missing and nothing leaks. Publish enforces a floor: photo, price, scene
line, alt text. Removed and draft look identical to the public and are different
facts. Hard delete only where no order exists. **Every public query is
`kind = collection AND state = live`** — never a hand-maintained list.

## Code vs dashboard

The founder edits content; he does not edit the site.

**Code:** design, motion, page structure, every fixed string, the fit diagrams,
measurement definitions, and **all email bodies**.
**Dashboard fields:** pieces (photos with focal point and alt text, name,
translation, price and option modifiers, scene line, story, colourways, cuts, making
days), collection theme, window-display selection, order pipeline (confirm price,
record payments at each gate, add photo, mark shipped), measurement guardrail ranges,
the commission design fee and reply time, queue and priority offsets, Abantu entries,
the makers list in Settings, and the maker chosen on each order.

**No translation-completeness meter.** Cut from Phase 2: it meters progress toward a
switch that is off. The flip bar is three named things and is checked by hand.

**Email templates are code, not fields.** A body edited in the dashboard has no key
and no translation, so it silently becomes English-only and the flip bar cannot
count it. What he gets instead is a **personal note** — optional, appended above the
signature, in whatever language he is writing — on four emails only: Confirmed,
Declined, design shared, On its way.

Test: if he would want to change it monthly, it is a field. If changing it would
change the design, it is code. When unsure, ask — do not guess and build a
website builder.

## Never

- Never write "Buy now", "Add to cart", or "Checkout". It is **"Ask for this piece."**
- Never write scarcity copy — no "only 2 left", no countdowns, no urgency.
- Never use an exclamation mark in site copy.
- Never write "inspired by Africa" or similar distance language.
- Never claim the brand is bigger than it is. No fake reviews, no invented counts.
- Never commit secrets. **Never log a customer's order token** — not in errors, not
  in server logs, and never render the analytics beacon on an order route, because
  the path *is* the credential.
- **Never put a customer's measurements in a message** — not an email, not a
  WhatsApp draft. They live behind the token.
- **Never truncate the Today queue.** No "top 5", no "show more". A queue that hides
  its tail is worse than no queue, because it looks complete.
- **Never render an order token in the dashboard** — no field, no list, no link to
  `/o/<token>`. The one exception is the WhatsApp draft, which must carry it. A
  session yields one token per deliberate action, never a table.
- **Never build a bulk send, bulk rotate, or export-all.** The absence is the
  control: it forces an attacker to work one order at a time.
- **Never serve a customer-uploaded image from the public bucket.**
- Never add an animation library, an i18n library, or an image-processing library.
- Never expose an unauthenticated file-upload endpoint.

Voice rules and drafted copy: `.claude/rules/copy.md`.
