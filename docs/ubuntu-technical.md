# UBUNTU — Technical Plan
*July 2026 · **Current as of Round 16, plus the post-review amendments** · Companion to `ubuntu-foundation.md`*

> This is the section the foundation document never had. Stack, hosting, cost
> model, architecture rules, and the order things get built in.
> Setup steps live in `setup-runbook.md`. Claude Code's instructions live in
> `CLAUDE.md` and `.claude/rules/`.

---

## 1. The governing constraint

**Everything runs on free tiers until the first sale.** Then paid plans, chosen
against real numbers rather than guesses.

This is not a preference — it is a bootstrapping brand with zero orders. But it is
also a genuine architectural constraint, and it shaped the stack more than any
aesthetic decision did.

**One exception:** the domain, roughly $12–15/year. Not optional. A brand
launching on a `.workers.dev` subdomain undercuts everything else being built, and
the domain gates the social handles too.

---

## 2. Why Cloudflare and not Vercel

The default answer for a Next.js app is Vercel. It is wrong here, for one specific
reason and one strategic one.

**Vercel's Hobby plan is restricted to personal, non-commercial use.** A site that
sells clothing is outside those terms. So Vercel is not free for this — it is $20
per seat per month from the day the site goes live, before a single sale.

**Cloudflare's free plans permit commercial use.** No such clause. The tradeoffs
are real and worth naming: no SLA, no direct technical support beyond community
channels, and lower-priority traffic handling. For a pre-revenue launch, that is
the correct trade.

**And Cloudflare has a point of presence in Kigali.** KGL, in service. The
customers are in Kigali, arriving on phones, on metered mobile data. Cloudflare
serves them from their own city; Vercel serves them from Europe or South Africa.
On a photo-heavy site that is not a benchmark difference — it is a felt one. On
Rwandan data pricing, bandwidth efficiency is close to an ethical point, not just
a technical one.

Next.js runs there properly now. Cloudflare's own framework guide covers deploying
Next.js to Workers through the OpenNext adapter, and OpenNext for Cloudflare
reached 1.0 GA in February 2026.

---

## 3. The stack

| Layer | Choice | Note |
|---|---|---|
| Framework | **Next.js App Router**, TypeScript strict | |
| Package manager | **pnpm** | |
| Hosting | **Cloudflare Workers** via `@opennextjs/cloudflare` | 100K requests/day free |
| Files | **Cloudflare R2** | 10 GB free, no egress charges |
| Database & auth | **Supabase** | Postgres and the single admin login **only** — password **and** magic link, both, every time |
| ORM | **Drizzle** | |
| Styling | **Tailwind** for layout, hand-written CSS and SVG for motion | |
| Email | Transactional provider behind an adapter | free tier |
| Analytics | **Cloudflare Web Analytics** | free, no cookie banner |
| Errors | **Sentry** free tier | |
| CI, cron, backups | **GitHub Actions** | free |

### The split that makes it work

**Supabase holds the database and auth. It does not hold files, and it does not
serve images.** Every uploaded photo lives in R2.

This is the single most important architectural decision in the free setup. Supabase's
free tier includes limited monthly bandwidth; serving garment photos through it
would exhaust that on a good traffic day. R2 has no egress charges and sits behind
Cloudflare's cache, including Kigali. Photos never touch Supabase's bandwidth at all.

---

## 4. Findings that shaped this

Each of these corrects an assumption that would otherwise have cost real time.

**Supabase free projects pause after 7 days of low activity.** Only paid projects
are exempt. The window tracks database activity, not dashboard visits, and a paused
project takes around 30 seconds to wake. For a boutique that may go a quiet week
between orders at launch, that means a customer arriving from Instagram hits a dead
site. Fixable free with a scheduled keep-alive, but it must be built deliberately.

**Supabase has no African region.** The closest is European — real latency from
Kigali. This is the argument for rendering pages on the server with aggressive
caching rather than fetching from the browser.

**Cloudflare Images was recorded as having no free tier — verify this, it may be
stale.** At least one 2026 comparison reports Cloudflare Images usable free under
**5,000 unique transformations per month**, which for a catalogue of a few hundred
photos would be ample. If true, the pipeline improves materially: he uploads one
1600px master and Cloudflare produces the sizes on demand, which returns **AVIF**
and **precise cropping**, both written off below. Check it in the same session as
the Stage 0 R2 card test. **Nothing depends on it** — browser-side resize works
either way.

**Cloudflare's free plan caps a worker at 3 MiB gzipped.** Which is a happy
accident — it pushes hard toward native browser APIs and hand-written SVG over
GSAP or Framer Motion, which is exactly what the motion charter already decided
for aesthetic reasons. The free tier and the brand want the same thing.

**Next's View Transitions integration is experimental** and its own docs do not
recommend it for production. Support sat around 78% of users as of March 2026, with
Firefox behind a flag. It degrades gracefully — without support the app works
normally and the transitions simply do not animate — but the most distinctive thing
about this site rests on a feature that may fight the framework.

**R2 may require a payment method on file even for the free tier.** Sources
conflict; one Cloudflare community thread from February 2026 has users reporting it
is mandatory, and one person reported an unexpected $5 charge on activation. **Test
this on day one.** If R2 cannot be enabled, launch on Supabase Storage and let the
storage adapter absorb the swap later.

**The Workers free plan allows 10ms of CPU per request — which makes server-side
image processing impossible.** *(Found in Round 8; this corrects Section 6, which
previously said "server-side.")* Decoding a 12 MB phone photo and encoding three
derivatives is hundreds of milliseconds to seconds — two orders of magnitude over.
Both escapes are shut simultaneously: `sharp` is a native Node addon that does not
run in the Workers runtime at all, and the WASM codecs that do run are binaries
counting against the same 3 MB the whole app must fit inside. The word
"server-side" was doing quiet work; the real question is **whose CPU**. Answer:
the browser's.

**Rwanda's data protection law is a constraint on this stack, not a footnote.**
*(Found in Round 5.)* Under Law 058/2021, personal data must be stored **within
Rwanda** unless the controller holds an NCSA-issued certificate authorising
offshore storage, and registration with the Data Protection Office has been
mandatory since October 2023, with penalties reaching RWF 5,000,000 or 1% of
turnover. Supabase's nearest region is European and R2 is global — so the
certificate is not paperwork, it is what makes the architecture legal. Registration
is **free**, done online, reviewed within 30 working days, and attaches to the RDB
conversation already on the critical path. Not legal advice; it belongs in that
filing conversation.

**A database connection belongs to the request that opened it, and Hyperdrive
does not change that rule — it changes what obeying it costs.** *(Found at Gate
0, deploying the connection path in §10.)* `src/db/client.ts` originally cached
one client per isolate, keyed by URL, reasoning that a handshake to Europe was
worth amortising across the many requests an isolate serves. It hangs. A socket
on Workers is owned by the request that created it, and an isolate outlives a
request, so the second request to reach a warm isolate inherits a client whose
socket it may not touch and the query never returns — **a timeout, not an error**,
which is the worst shape a bug can take. Hyperdrive was deployed *with the cache
still in* specifically to test whether it rescued the pattern. It did not. What
it changes is that the pool now sits at Cloudflare's edge already connected to
Supabase, so opening a connection per request is cheap enough that the cache is
safe to **delete rather than repair**. The client is now scoped to one request —
a `WeakMap` keyed on the request's own `ExecutionContext`, so a page that reads
three times still opens one connection and nothing crosses into the next request.

**Closing the connection is what makes Hyperdrive fast; abandoning it silently
undoes the point.** *(Same session.)* An abandoned socket is not a returned one:
Hyperdrive tears the origin connection down and the next request pays TLS and
SCRAM to Frankfurt again. Ending it cleanly leaves a warm connection behind.
Measured, this is the single largest number in the whole exercise — **median
389ms → 101ms**, with no other change. It has to run *after* the response, since
`end()` refuses new queries the moment it is called, so it is Next's `after()`
that does it and nothing earlier would survive a page that reads twice.

**Hyperdrive query caching is deliberately off.** It would serve reads up to 60
seconds stale, and the Today queue's whole contract is that a row leaves the
moment he acts on it — a queue that shows work already done is the failure that
section is written to prevent. What we want from Hyperdrive is the pooled
connection, not a cache in front of order state. This is a `--caching-disabled`
flag on the config, not a code decision, so it is invisible in the repo: it is
recorded here because that is the only place it can be.

**Automated WhatsApp is a paid dependency; hand-sent WhatsApp is not.** Meta bills
per business-initiated message outside an open 24-hour customer service window —
which is exactly what an order status update is. The Business API is therefore
rejected on the free-tier constraint, permanently. **`wa.me` links are free**: no
API, no billing, no approval, just a URL that opens the chat with the message
pre-written. So email is the automated rail, and WhatsApp is a real second channel
driven by one tap in the dashboard *(Round 11)*. The distinction is the robot, not
the channel.

---

## 5. Architecture rules

Five rules, all cheap now and expensive to retrofit.

### Every external service sits behind one module

- `src/lib/storage.ts` — uploads, URLs, deletes
- `src/lib/email.ts` — one `send()`
- `src/lib/payments.ts` — payment state
- `src/lib/auth.ts` — the admin session: read, verify, revoke

**Never call a provider SDK from a component, page, or route handler.** Swapping
providers becomes editing one file.

### The session is server state, not client state *(Round 12)*

Supabase sign-out revokes the refresh token, but an access token already issued is
stateless and stays valid until it expires. A kill switch with an hour of lag is the
wrong thing to own in the one moment it matters, so two things close it:

- **JWT expiry set to ~15 minutes** in the project's auth settings. No code.
- **`sessions_valid_after` on the admin row**, compared on every dashboard request.
  Revocation is then instant, and the same column enforces the thirty-day box rather
  than trusting the client to expire.

The session cookie is **server-set, `httpOnly`, `Secure`, `SameSite=Lax`**, scoped to
the dashboard path — never Supabase's default client-side storage. A session that
JavaScript can read is invisible to the kill switch and evictable besides. The
dashboard is pinnable via a web app manifest; a pinned instance can keep its own
cookie jar, which is a third reason revocation has to be server-side. **No service
worker** — an offline work queue showing stale orders is a correctness problem.

### Payment state is database state, not gateway state

The order's payment status is a row in our own table that the dashboard sets today.
When a gateway arrives, its webhook writes the same rows. Adding it must not change
the order model or the customer's journey — which is a promise the foundation
document already makes to customers.

### `reborn` is a flag on a piece, not a second system *(Round 17)*

Ubuntu for Nature — pieces made from saved cloth — is **one boolean on the piece,
`reborn`, default false**, and nothing more in the runtime. There is deliberately no
source entity, no provenance field, no paired before/after images on the record: the
finished piece is shown as his work, and the rescuing is told in the story and in
marketing, not proven on the product page. So the flag drives **no separate query, no
separate route, no separate bucket, and no second grid** — a reborn piece is one row
in the single catalogue, browsed and ordered like every other. It runs on the
made-to-order model unchanged, which is why it brings **no inventory and no
sold-once state**. Resist making it more than a boolean: the moment `reborn` grows a
join, Nature has quietly become the second product line the decision says it is not.

### Stay generic where a generic option exists

Postgres and standard SQL. No Cloudflare-specific database primitives. If Supabase
ever becomes the constraint, moving to another Postgres host is a connection string.

### Public and private files are different buckets

*(Round 8.)* A public R2 domain serves **anything in that bucket** to anyone holding
the URL. Fine for garment photos, which you want spread around. Not fine for a
customer's family photograph.

- **Public bucket** — catalogue photos. Served direct from R2 on its own hostname,
  cached, immutable, never touching the app. This matters: the app is capped at
  100,000 requests/day, and ten images on a page would turn one visit into eleven.
  Use a real custom domain, not the rate-limited `r2.dev` address.
- **Private bucket** — progress photos and customer reference images. Streamed
  through the Worker with the order token checked. Order pages get dozens of views a
  day, and streaming a body is almost no CPU, so the 10ms limit is not in play.

### Prefer a ceiling that refuses over a meter that bills

*(Round 8.)* Cloudflare's free tier **rejects** past its limits; metered
pay-as-you-go clouds keep serving and invoice. For a pre-revenue brand in Kigali
that asymmetry outweighs allowance size: a site down for a day is recoverable, an
unexpected $300 bill is not. This decided the compute question and should decide the
next ones. Where a metered service is ever added, it gets an instance cap (the real
bound), a $1 budget alert, no public endpoint, and it processes but never serves.

---

## 6. Images

The biggest unglamorous risk on the whole project — and the section Round 8 rewrote
most heavily.

His progress photos come off a phone at 4–12 MB each. Rwandan mobile data is
expensive and most visitors arrive on phones from Instagram or TikTok.

### Resize in the browser, not on the server

Server-side is impossible here (Section 4). **The browser does the work Cloudflare
will not** — canvas decodes, resizes and encodes; the Worker only validates and
stores.

The strongest argument is not about visitors. **He uploads from a phone, in Kigali,
on metered data.** Server-side resize means *he* pushes 12 MB per photo up a
connection that is expensive and drops. Browser-side means about 300 KB. Twenty
progress photos become 6 MB instead of 240 MB. This plan was written entirely about
protecting the customer's data bundle and never noticed the founder is on the same
network, uploading forty times more.

It also keeps the architecture honest: at 300 KB the file goes **through the Worker**
to the storage adapter — no presigned URLs, no second module that knows what R2 is —
and a small upload survives a flaky connection where a large one restarts at 90%.

### The pipeline

- **Three derivatives at 400 / 800 / 1600 px, WebP.** Progress photos get **one** at
  1000 px — private, behind the token, and posting speed matters more than polish.
- **There is no original, and his phone is the archive.** Nothing above 1600 px is
  uploaded. If print resolution is ever needed it is in his camera roll.
- **WebP only.** AVIF would save roughly a quarter again and every free path to it is
  closed — canvas cannot encode it anywhere. Named as a cost, not overlooked. Verify
  Safari's WebP encode in the Phase 0 spike; the fallback is JPEG.
- **Content-hashed keys, immutable cache headers** (`max-age=31536000, immutable`).
  The highest-value free decision in the section: it keeps repeat views off the
  network entirely and reads off R2's 10M monthly Class B operations — which matters
  more still if Stage 0 forces the Supabase Storage fallback, where reads are
  metered bandwidth.
- **Width, height and a focal point stored per image.** Without dimensions
  `next/image` cannot reserve space, and a page that shifts as photos arrive breaks
  the scroll reveals — **layout shift is a motion bug here, not a performance
  metric.** The focal point (an x/y percentage set by clicking the photo in the
  dashboard) is what stops the 4:5 card crop beheading people. ~20 lines, no library.
- **`next/image` stays** for `srcset`, lazy loading and layout stability only. The
  custom loader maps a requested width to the nearest existing derivative — a URL
  mapper, not a transformer, about fifteen lines.
- **Alt text is a required field**, defaulting to the piece's scene line. It is a
  string a customer reads, so `rules-copy.md` governs it.
- **The grid query loads card fields only.** Loading full stories and photo sets to
  render a collection grid is how the site becomes slow on mobile data.

### Two traps to spike, not discover

**EXIF orientation.** Phone photos carry a rotation flag and drawing to canvas is
exactly where it is lost — the "his photos are sideways" bug, which on a garment
site is not cosmetic. Test on his actual phone, not desktop Chrome.

**Memory on a mid-range Android.** Decoding several 12 MB images at once will kill
the tab. Process sequentially, release each bitmap, show progress. He will upload ten
at a time, on the same phone that took them.

*(A free side effect: re-encoding through canvas strips all EXIF, including the GPS
coordinates of his home and workshop — a small piece of DPA compliance for nothing.)*

### Customer uploads

The commission form has **no image field**, deliberately. An anonymous upload box is
the most attackable surface on a site with no accounts. **Reference images unlock on
the tokenised order page once he has accepted** — by then there is a name, a phone,
and an order he chose to take, so the abuse surface shrinks to people he already
agreed to work with, and Round 6 puts the design conversation in exactly that window.
Before then, WhatsApp already covers it: he replies personally and asks if he wants a
picture.

**Phase 8, and it is now assigned rather than floating.** *(Post-review: an unphased
feature gets built by whoever notices it.)* At launch a reference photograph arrives
on his own phone over WhatsApp and is attached to nothing; the private bucket exists
from day one for progress photos, which is the part the token check was built for.
The named cost: he cannot keep a customer's reference image beside the order until
Phase 8, so it lives in a chat thread — acceptable while there are ten orders and he
is the only reader.

When built: **images only, verified by file signature** rather than extension; a cap
on count and size; and a **retention rule** — reference photos deleted a set period
after Delivered, because they are often photos of *other people* who never agreed to
anything. The retention rule ships with the feature, not after it.

### Video

**Not at launch.** R2 can store it; nothing free can compress it, so every visitor
downloads the full file on metered data. The motion charter also forbids the ambient
loop that is web video's main use. If it earns a place it is the *In the making*
moment, in Phase 8. Until then it lives on TikTok — linked, never embedded, because
embedded players drag in heavy third-party tracking.

## 7. Cost model and upgrade triggers

**Today: $0/month plus the domain.**

The free ceilings are enormous for a boutique — 100,000 requests/day, 10 GB of R2,
10M reads/month. **Traffic is not what breaks first.** What binds is build-shaped,
not sales-shaped, so the ladder has two rails.

**Rung 1 — Supabase Pro (~$25/mo), at the first sale.** Not because of limits.
Because running a database holding paid orders and customers' measurements with no
automatic backups stops being acceptable once the money is someone else's. This is
the rung that tracks revenue, and it triggers at sale **one**, not sale ten.

**Rung 2 — Workers Paid ($5/mo), when the build demands it.** The 3 MB bundle is a
build-time wall and the 10ms CPU limit is a capability wall; neither moves with
sales, and either could land in Phase 6 with zero orders. **If it arrives before the
first sale, take it.** Five dollars is cheaper than contorting the architecture
around a cap. This is a named, priced exception to the free-tier constraint — the
constraint stands, with one door and a price on it.

**Rung 3 — Google Cloud Run, as a named escape hatch, not a plan.** A scale-to-zero
container where `sharp` and `ffmpeg` actually run; the always-free allowance is on
the order of 180,000+ vCPU-seconds a month, and a photo resize costs about two — so
it would be free at this volume indefinitely. It sits behind `src/lib/storage.ts`,
so adding it touches one file and no page. **Three triggers:** browser-side resize
fails the Phase 0 spike; video becomes a real requirement; or something else needs
more than 10ms of CPU. Its guardrails are in Section 5 — and note that paying
Cloudflare or Google does **not** widen his uplink, so browser-side resize stays
even after money arrives. What paid buys on top is AVIF as an added format, no page
rebuilt.

**Cloudflare Images** — cost unconfirmed and possibly free under 5,000 monthly
transformations (Section 4). Check it, do not plan on it.

**Everything else stays free indefinitely:** Sentry, the email provider, GitHub
Actions, Cloudflare Web Analytics.

**Neither of the first two rungs requires a code change.** That is the promise the
adapters exist to keep, and Round 8 kept it.

## 8. Risks this creates

**The keep-alive job is load-bearing.** If it silently fails, the site is dead
within a week and nothing tells you. It must **alert on failure**, not just run.
Ten extra minutes of work; without it, a known problem has been replaced by a
hidden one.

**The bundle cap needs enforcement, not a reminder.** `CLAUDE.md` is context, not
configuration — for something that must hold regardless, the enforcement layer is a
CI check or a pre-deploy hook. Add it in Phase 1.

**A backup you have never restored is not a backup.** Restore one into a scratch
database before launch.

**No SLA, no support.** If the site breaks at 2am, you are on your own. Correct
trade pre-revenue; revisit after the first sale.

**His phone is a single point of failure twice over** *(Round 12c).* It holds the
live dashboard session, the mailbox that receives the magic link, WhatsApp history
carrying order tokens, and — because §6 keeps no original — the only copies of every
master photograph. Two free controls carry more weight here than anything built:
**his email 2FA must not live only on that phone** (printed recovery codes or a
second device, or losing it locks *him* out of the recovery path while a thief's
session is still open), and **automatic phone photo backup from day one.** The
incident plan lives on paper: sign out everywhere → change the password → remote wipe
if it is online → rotate exposed tokens.

**The weekly backup is currently a keyring.** *(Round 5.)* `pg_dump` into a private
GitHub repo will contain live order tokens, phone numbers, addresses and body
measurements, in a git history that is effectively permanent and that no
private-repo setting turns into a vault. **Encrypt before commit** — `age` or `gpg`,
key in an Actions secret. Ten minutes, free. The restore test then becomes *decrypt
and restore*.

---

## 9. Build phases

The organising principle: **never let build work wait on his homework, and
de-risk the distinctive parts first.**

**Phase 0 — Two spikes.**
- *The motion spike:* the signature drawing itself, and one page transition —
  tested in the Workers runtime, on a real phone, on mobile data. Throwaway branch.
- *One designed page:* the product page, static, fully styled. Sets the visual
  direction, gives him something real to react to, and tells him what his
  photography has to look like — which is currently blocked on not knowing.

**Phase 1 — Foundation.** Repo, Next, Tailwind, Supabase, design tokens as CSS
variables, **the four adapters** — `storage.ts`, `email.ts`, `payments.ts`,
`auth.ts` (Section 5 always listed four; "three" was a miscount, and `auth.ts` is the
one Phase 2 opens by assuming) — and the bundle check. Domain live and deploying from day
one with a holding page, so there is never a deployment day. First schema — which
now carries, from Rounds 5–11: the order token, `locale` and `preferred_channel` on
orders, `locale` on customers, the customer row with auth columns null, per-entity
translation rows, the payment schedule, self-contained fit records, image dimensions
with a focal point, `piece.kind`, `piece.state` and `published_at`.
**Plus, from Rounds 12, 13 and 16:** `sessions_valid_after` on the admin row;
`guardian` on the fit `source` enum and age-at-order as a number, with **no child
entity anywhere**; a `type` enum on payments (payment, refund, correction); a makers
table with an FK from the order; and `redacted_at` with nullable identity columns on
the customer, so erasure anonymises the person while the order still resolves.
**Plus, from the pre-build review:** `method` on payments (manual / gateway) and a
**reported** flag, both of which existed only in prose; a **diagram key on the garment
type**, so two kids' types point at one drawing rather than two that drift; and the
columns that let a **fit record redact with its customer** — see below, because it is
a decision and not just a column.

**Erasure reaches the fit record.** `redacted_at` anonymises the customer, and the
measured values and age-at-order redact with them. R13 made a child not an entity, so
a child's measurements live on the fit record attached to the parent's order; a
child's numbers surviving a parent's erasure request is the exact failure Law
058/2021 exists to prevent, and there is no child row to delete instead. What survives
is what proves the order happened — piece, money, dates, event log. *The named cost:
a redacted fit record can no longer adjudicate a fit dispute. Correct, because the
person asking to be forgotten is the person that record protected.*
**The first route written is already locale-aware** (`/rw` must be walkable from day
one, so the locale segment cannot be a later file move).

**Phase 2 — The dashboard, before the public site.** This inverts the obvious order
deliberately. It is the least design-sensitive part, which makes it what Claude Code
builds best — and once it exists, he can enter content in parallel with every later
phase instead of it landing as one blocking batch at the end. **Draft state is what
makes that safe:** he works for weeks with missing photos and half-written stories
and nothing reaches the public site.

**The auth shell comes first in this phase** — password and magic link, the
server-set `httpOnly` cookie, the revocation check, sign-out-everywhere, and the web
app manifest. It is small, and every screen after it assumes it.

**Four sections — Today, Orders, Pieces, Settings** *(Round 9, as amended: Customers
was cut. The customer row exists exactly as R5 specified and every FK resolves; what
went is a section no document ever specified.)* **Today is the work queue and it is
built first**, because it is the thing that decides whether the rest gets used. Its membership is derived from the event log and the payments
table, gate-based rather than time-based, so there is nothing to configure and no
job to schedule. Facts complete inline and fire their email; judgements open the
order screen, which is panels with the log collapsed. Nothing in this phase is
truncated, paginated to a top-five, or bulk-actioned.

**Two costs inside Settings, named now rather than discovered:** the garment types
with their measurement lists and guardrail bands, and **the makers list plus the
picker on the order** — the price of R16 turning the maker from a string into an FK.
Small, but a screen.

**Not in this phase: the translation-completeness meter.** It was specified in R14 and
R9b and is cut here. It meters progress toward a switch that is off, and the flip bar
is three named things that can be checked by hand. The email bodies stay keyed in both
locales — the keys are cheap and correct; the absent Kinyarwanda values are the
unbuilt part, which is what a reservation is supposed to look like.

**Phase 3 — Public skeleton.** Every page pulling real content, unstyled. Routes
and data only. **Includes `/contact`, mirrored at `/rw/contact`** — it was specified
in two documents and had a URL in none. It sits in the footer beside Policies; the
nav stays four items.

**Phase 4 — Order flow.** Form creates an order, tokenized private page, the event
log, email on every transition, the maker-name field. **Plus the bounce webhook** —
a failed send becomes a queue row rather than silence, because email is the only
automated channel and a bounced Confirmed is indistinguishable from a stranger who
changed their mind *(Round 11)*.

**Phase 5 — Design.** Palette, typography, layouts, the colour law applied. Tested
against ~30% longer strings, because Kinyarwanda runs long and buttons and nav are
where that shows.

**Phase 6 — Motion.** The eight moments, tuned live, reduced-motion throughout.

**Phase 7 — Launch readiness.** Monitoring, social preview images, performance
tested on a real Rwandan mobile connection — not on a laptop — and the two switches
in setup Stage 3: **open the public gate**, then **remove `noindex`**, as separate
lines, because they fail differently.

*Backups, the restore test and the alerting keep-alive are **not** here. They moved to
setup Stage 6, before the first real feature, where they belong: a free Supabase
project pauses after seven days of inactivity, so a keep-alive that arrives at Phase 7
arrives about six months late.*

**Phase 8 — After launch.** Payment gateway once registration lands, Abantu faces,
past-commission stories, **customer reference uploads on the order page** (Section 6),
and the translation-completeness meter if the catalogue ever grows past the point
where the flip bar can be checked by eye.

**Phases 1 through 4 need almost nothing from him.** That is the point of the
ordering.

---

## 10. Answered only by running it

Do not debate these further. They are named so they get resolved in the right place.

- ~~**The Postgres connection path from Workers**~~ — **settled, Gate 0:
  Hyperdrive over the Supabase *session* pooler (5432).** Measured by a deployed
  worker reading a real row, which is how this list said it would be settled.
  12/12 requests return 200; a warm read is **~100ms** against the ~500ms direct
  Postgres was giving, and the cold outliers land at ~390ms, which is one TLS
  handshake plus SCRAM auth to Frankfurt.

  **The port is the part worth remembering. Hyperdrive is itself a transaction
  pooler**, so pointing it at Supabase's transaction pooler on 6543 stacks two of
  them and the connection hangs: `error code: 1101`, and the Worker log shows
  invocations cancelled with `waitUntil() tasks did not complete`. Session mode
  underneath is the combination Cloudflare and Supabase both document. Repointing
  the same Hyperdrive config from 6543 to 5432 took it from 0/12 to 12/12 with no
  redeploy and no code change, so the port is the whole difference.

  Two consequences in `src/db/client.ts`, both measured and neither worth
  relitigating — see §4. The third option, the Supabase HTTP client, stays named
  and unbuilt: it is a different wire protocol and a dependency this bundle would
  have to find room for.
- **Whether View Transitions survive the Workers runtime** under OpenNext. Settled
  in Phase 0.
- **How the motion actually feels.** Settled in Phase 6.
- **Whether browser-side image resize survives his actual phone** — EXIF orientation
  and memory on a mid-range Android. Settled in the Phase 0 spike. If it fails,
  Cloud Run is the answer and it is already named.
- **Whether Safari can encode WebP from canvas.** Settled in the same spike; the
  fallback is JPEG.
- **Whether Cloudflare Images is free under 5,000 transformations.** Settled in
  setup Stage 0, in the same session as the R2 card test.
- **Whether the server-set `httpOnly` cookie session behaves under OpenNext**, and
  whether a pinned home-screen instance keeps its own cookie jar in practice. Settled
  in Phase 2, in `pnpm preview` rather than `pnpm dev`.

---

## 11. Working habits that matter

**`pnpm preview`, not `pnpm dev`, is the truth.** An entire class of bugs unique to
this stack lives between those two commands. Building the habit now costs nothing;
discovering it in month two costs a week.

**Test on a real phone on mobile data.** Desktop Chrome on fast wifi will tell you
the site is fast. It is not the audience.
