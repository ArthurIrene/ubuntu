# UBUNTU — Copy
*July 2026 · **Current as of Round 16, plus the pre-build amendment pass** · Every drafted string · Companion to `ubuntu-foundation.md`*

> All of this is a **strong draft in his voice**, editable in the dashboard where
> marked. We launch with every field filled — never `Lorem ipsum`, never empty.
> He rewrites as his own words come.
>
> `[X]` marks an unanswered founder question. **Leave the brackets visible** in
> drafts so they cannot ship unnoticed. Never invent the number.
>
> **Every string here is English, and English is canonical** (Round 14). Kinyarwanda
> is a translation of these, built alongside but not shown publicly until the flip.
> See Section 12.

---

## 1. Voice

Warm. Proud. Poetic. Rooted. The brand speaks as **"we"** and addresses **"you."**
It never explains itself twice and never apologises for what it is.

The personality is *the rebel artisan*: crafted, charming, generous, quietly
confident. Never loud, never pleading.

**Never write:**
- Exclamation marks
- Scarcity — "only 2 left", "hurry", countdowns
- Cart language — "buy now", "add to cart", "checkout"
- Distance language — "inspired by Africa", "African-inspired", "ethnic", "tribal"
- Marketing filler — "amazing", "stunning", "must-have"
- Fake social proof, invented counts, claims of being bigger than it is

**Specificity rule:** cultural references are always named and explained — a
particular scene, tradition, or place. Never generic "African wisdom." If the
reference cannot be named precisely, do not gesture at one.

### Vocabulary

- The community is **Abantu**. The philosophy is **ubuntu** — *umuntu ngumuntu ngabantu.*
- Commissions are **"Only yours."** Never "custom", never "bespoke".
- The process page is **"The making."**
- Say: **maker**, **stitched**, **scene**, **piece**, **cloth**, **thread**.
- Avoid: **product**, **item**, **SKU**, **merch**.
- **Never "drop."** A drop implies the thing goes away, and nothing here does. Say
  **newly stitched**, or *the latest*.

---

## 2. Fixed strings

Use exactly. Do not improve.

| Where | String |
|---|---|
| Order button | `Ask for this piece` |
| Commission button | `Send it to him.` |
| Collection bridge line | `Every piece is stitched after you ask for it.` |
| Commissions nav label | `Only yours` — the route is `/commissions`. A label and a route may differ, and this is the only case on the site. |

**Order statuses, customer-facing:**
`Requested` · `Confirmed` · `In design`* · `Paid` · `In the making` · `On its way` · `Delivered`

*\* `In design` appears on commissions only, once the design fee has landed. **His
sign-off is needed on the word itself**, and it needs a Kinyarwanda key like every
other fixed string.*

**Beneath the commission button:**
> He reads every request himself. You'll hear back within a few days, from him,
> not from a system.

**Beneath the order button — three lines:**
> He reviews your request personally.
> He confirms your final price.
> Payment starts the making.

---

## 3. Home

**Hero line:**
> Clothes for the African who knows who they are.

Button: **See the collection.**

**Who we are** *(dashboard-editable):*
> Ubuntu is clothing hand-stitched in Kigali — one needle, one thread, one scene at
> a time. The name is a Bantu philosophy: I am because we are. Every piece is made
> only after you ask for it, and every piece carries a story we can name. The people
> who wear it are Abantu — the people. One thread at a time, we are sewing our
> collective greatness.

*Split layout: text left, the line-becoming-a-community animation right. Stacks on
mobile, text first.*

**Collection headline:**
> The current collection
> **Summer — life by the water**

**The ritual section:**
> **Every piece carries a story.**
>
> The scenes are sewn in one unbroken thread — a boat, a shoreline, hands at work.
> Each one is drawn from somewhere true, and we will tell you where. When your piece
> arrives, its story arrives with it.
>
> Buying Ubuntu means learning something true.

Door: *Read the story of the fishing shorts.*

**Note:** the phrase "collective greatness" appears exactly twice on the homepage —
in the summary and in the closing section. Never a third time.

---

## 4. Fit — the same rule at three depths

Told at three depths so it never has to be explained twice in one journey.

> **Round 7 reversed the emphasis here.** Measurements are now the **urged** path, and
> because we urge them we must teach them — the earlier note that "the urging stays
> light" and that teaching served "a gap that is nearly empty" both assumed anyone
> with measurements got them from a tailor. Urging recruits people who have neither
> numbers nor a method. Standard sizing stays fully available and is never framed as
> lesser.

### On the product page, under the order button — one sentence

> Your piece is cut to the numbers you give us, so take them slowly — we show you
> where each one goes. If the fit needs adjusting when it arrives, he can usually
> alter it; you cover the work and the return — or, if you're outside Rwanda, we put
> [X] toward a tailor near you instead, because posting it back and forth would cost
> more than the piece.

**Both cases in one sentence, and nothing branches** *(Round 15, amended in the
pre-build review).* Return shipping from London to Kigali and back can cost more than
the garment, so the uniform promise is misleading at distance — but written as a
country-conditional variant it becomes a request-time branch on an edge-cached public
page, needing country in the cache key and a country field on a form that has none, to
serve one clause. A reader in Kigali reads seven extra words. That is the whole cost,
and it is cheaper than the alternative.

**On a children's piece, one line is added:** *cut with room to grow.* It is how he
cuts, never an option on the form.

### At the fit fork — the two lines that make each path whole

> **Your measurements.** A tape and five minutes, and the piece is cut to your body.
> We show you where each number goes as you type it.
>
> **Or choose a size.** He checks every order himself against your height and weight
> before anything is cut.

*The recommendation is warm, not insistent. A size is a real choice, not a fallback.*

**Beside each measurement field, at the moment of entry** — not in a tooltip. This is
the sentence the shared-liability clause turns on, so it says where the tape goes and
whether the number is taken on the body or on a garment laid flat. Per-garment
wording is founder homework (Section 13, item 9).

**When a number looks unlikely:**

> That's outside what we usually see. Check it if you can — and if it's right, leave
> it. He'll see it before anything is cut.

*Soft, and it must be acknowledgeable rather than blocking. A hard stop on a real body
is the site telling someone their body is wrong. Only impossible values refuse.*

**For a tailor — a short shareable list.** Path two routes through a third person who
sees none of the on-page instruction, so the list travels on its own:

> **What your tailor needs**
>
> Ask for these, in centimetres, taken on the body: [per-garment list, item 9].
> Send them to us exactly as they come.

### On "The making" — the fair statement

> **If it doesn't fit**
>
> Every piece is cut for one person. The numbers you give us become the garment, so
> take them slowly — or choose a size and let him check it against your height and
> weight before anything is cut.
>
> If your piece arrives and the fit isn't right, tell us within [X] days. We can
> usually alter it — [X] for the work, plus the return, and it comes back fitting.
> If you are outside Rwanda, we put [X] toward a tailor near you instead, because
> sending it back and forth would cost more than the piece.
> If we cut outside our own measurements, or something is wrong in the making, it is
> ours to put right at no cost to you.
>
> What we cannot do is take a piece back. It was made for your body alone; there is
> no one else waiting for it. That is the honest cost of made-to-order — and the
> same reason the piece is yours in a way no shop garment can be.

*The last paragraph does the real work: it states the hard rule, then turns it into
the reason the brand exists, so the reader finishes feeling privileged rather than
warned. The alteration price is now on the page rather than left to the reply — you
cannot warn about a cost you cannot name.*

## 5. Policies — the full page

> Every piece is made after you ask for it. Nothing here sits on a shelf, and
> nothing is cut before it is paid for.
>
> **Fit.** Your measurements, or the size you choose, are what the piece is cut to.
> If they were wrong, the piece will be wrong — that part belongs to you. If we cut
> outside our own stated measurements, that part belongs to us, and we remake or
> repair it at no cost. If our instructions were unclear and you measured in good
> faith another way, we meet you in the middle.
>
> **Alteration.** Taking a piece in is ordinary work for a maker. Within [X] days of
> receiving it, send it back and he will adjust it — [X] for the work, and you cover
> the return. If you are outside Rwanda we put [X] toward a tailor near you instead,
> because posting it back and forth would cost more than the piece. Letting a piece
> out is limited by the cloth left at the seams, so it is not always possible; he will
> tell you honestly before you send it.
>
> **Getting it to you.** Delivery inside Rwanda is included in the price. Outside
> Rwanda, shipping is shown while you choose where it is going, before you ask for the
> piece — never added afterwards. Any customs duty or import tax your country charges
> is yours to pay, and it is charged by them, not by us. We would rather you heard
> that here than from a courier at your door.
>
> **Making.** If a piece arrives damaged or flawed in the stitching, it is ours.
> Tell us and we will put it right.
>
> **Hands, not machines.** Small variations in the line, the thread, the exact fall
> of a scene are the work of a hand, not a fault. No two pieces are identical, and
> that is the point.
>
> **Your details.** To make a piece for you we hold your name, how to reach you, where
> it is going, and the numbers it is cut to. They live behind the private link to your
> order and nowhere else — never in a message, never on a page anyone can find. If you
> ask us to forget you, we do: your details and your measurements go, and only the bare
> fact of the order stays, so that a piece we made still has a record it existed. If
> the piece was for a child, those numbers are yours to erase and they go with the
> rest — we never held the child as a person in our records, only the measurements
> needed to cut the cloth.
>
> **Before the needle starts.** Once he begins, the piece exists and cannot be
> unmade. If you need to stop an order, talk to us — what comes back depends on how
> far the work has gone. Before anything is cut, nearly all of it. Once cloth is cut
> for your body, the materials are spent. Once the scene is being stitched, most of
> what remains is his hours. He will tell you plainly where your piece stands.
>
> **Only yours.** A commission is designed once, for one person, and retired. Fit is
> settled with him personally after the design is agreed, and the same terms hold —
> with no possibility of remaking the design.
>
> **Only yours — when the piece becomes yours.** A commission is paid in three
> moments: a fee before he draws, a payment when the design is agreed and the cloth
> is cut, and the balance when the piece is finished. Each one is a place you can
> stop. The design becomes yours when the piece is paid in full; until then it stays
> his. Your scene, though — the thing you told him — is never anyone else's.

---

## 6. Contact — `/contact`

Mirrored at `/rw/contact`, built in Phase 3, reached from the footer. **Not in the
nav** — a contact link in the nav is exactly what competes with the order form.
*(The page was drafted here and specified in `ubuntu-foundation.md` §11I, and had a
URL in neither until the pre-build review.)*

Its job is to **route**, not to be reachable.

> **Talk to us**
>
> One person reads everything that comes here. He's usually stitching, so a reply
> takes a day or two — but it comes from him.
>
> **Waiting on a piece?** Your order has its own page. His messages, your price, the
> photos as it's made — all of it is there. → *Open your order*
> Lost the link? Tell us your name and the piece, and we'll send it back to you.
>
> **Want a scene of your own?** That conversation starts on *Only yours.*
> → *Only yours*
>
> **Anything else** — a question before you order, a shop that wants to carry us, or
> something you just want to say.
>
> [name · contact · message]

**WhatsApp** appears here and on order pages. **Never in the global footer.**

---

## 7. Footer

Sits under the running-stitch divider, so the page ends on the site's own heartbeat.

> ubuntu.
>
> The collection · Only yours · The making · The story · Talk to us
>
> Instagram · TikTok
>
> Policies
>
> *Umuntu ngumuntu ngabantu.* — a person is a person through other persons.
> Hand-stitched in Kigali. © 2026 Ubuntu.

The philosophy line sits at the bottom of every page, so it underwrites the whole
site without being repeated in body copy. The handwritten script gets its one
non-logo appearance here as the closing mark — the site opens with the signature
writing itself and closes with it at rest.

---

## 8. The order journey

**Submission:**
> Your request is with him. He reads each one himself and will confirm your piece
> and final price within [X] days. Nothing is owed until he does.

**Confirmation** — his message on the order page: final price, any extras explained,
a personal line. **The body is code and the personal line is his** *(Round 9d, which
reversed "editable templates in the dashboard").* An edited body would have no key
and no translation, so it would silently become English-only where the flip bar
cannot see it. Warmth does not mean writing from zero — it means one optional note
above the signature, on the four emails where a note earns its place.

**Where the price was adjusted at confirmation**, the reason is a named line in the
breakdown, not an unexplained different number. *"Why 51,000?"* is answered by the
record.

**Confirmation, on a commission** — the design fee instead of a final price, because
there is no total until the scene exists:

> He'd like to make this. Before he draws, there's a fee of [X] — it buys his
> drafting hours, and it comes off the price of your piece. Nothing else is owed
> until you've seen the design and said yes.

**In design** *(commissions only, once the fee has landed):*

> He's drawing. He'll bring you the scene when it's ready — usually within [X] days —
> and nothing more is owed until you've seen it and said yes.

**Design agreed — the payment that starts the cutting:**

> The scene is yours. This payment buys the cloth and starts the cutting; the balance
> falls due when the piece is finished, before it ships.

**Payment:**
> Your payment buys the fabric and his hours. The needle starts when it arrives.

**Payment reported** *(customer has sent money, he has not confirmed):*
> You reported payment on [date]. He'll confirm it shortly — usually within a day.

**Paid, in the queue:**
> Your piece is in the queue. He'll start it in about [X] days, and you'll see it
> when he does.

**In the making** — his progress photos, posted from the dashboard in seconds.
*This is where the ceremony plays.*

**Awaiting balance** *(commissions):*
> Your piece is ready. The balance is due before it ships.

**Delivered:**
> Welcome to Abantu.

**Declined** — worded as a maker's choice, not a rejection:
> He's read your request, and this one isn't a piece he can make. He's written to
> you himself about why.

### How we reach you *(Round 11)*

**The nine automatic emails:** order created (carries the link), Confirmed, Declined,
design shared, design agreed, payment received (once per gate, worded differently at
each), In the making, On its way, Delivered. Plus the token re-send. Bodies are code,
keyed in both locales, chosen by `orders.locale`.

**The personal note** — optional, above the signature, his own words in whatever
language he is writing — appears on four: **Confirmed, Declined, design shared, On
its way.** An empty note must leave the layout whole.

**On the form, beside the channel choice:**
> We'll message you on WhatsApp, and email you a copy you can always come back to.

Said rather than discovered. The email fires whichever channel they pick, because the
link has to live somewhere that outlasts a cleared chat and a replaced phone.

**WhatsApp drafts carry the same words as the email** — same link, same locale,
written by us and sent by his own hand. **Never measurements, on either channel.**

---

## 9. Only yours

**Opening:**
> Every Ubuntu piece carries a scene. This one carries yours — and no one else's.

**What it costs:**
> A commission is priced above the collection because you aren't buying a garment —
> you're buying a design that will never exist again.

**The first number, on the page** — the **design fee**, [X], his to set. Round 6
replaced the starting-from figure with it: a commission has no total until the scene
exists, so a "from" price is a guess dressed as information, while the design fee is
real, small, and the actual first thing anyone pays. It filters just as hard and it
lets the page say what it costs to *begin*.

> Beginning costs [X]. That's his drafting hours, and it comes off the price of your
> piece. What the piece itself costs, he'll tell you once he knows what he's making.

**Soft exit:**
> Not sure yet? Start with the collection — every piece there carries a scene too.

**Form asks for a story, not a size:** *Tell us your scene* (generous text field,
gentle prompt) · *which garment do you imagine it on* (or "not sure — advise me") ·
name and contact · one optional *anything he should know*. **No measurements** —
asking sleeve length next to someone's grandmother's story would break the spell.

---

## 10. Priority and timeframes

Priority is sold as **position in the queue, never speed**. Every piece is stitched
at full, unrushed care.

Copy shows two honest timeframes and always frames the difference as queue position.
**Never write "rush", "express", or "fast-track".**

> Standard — about [X] weeks
> Priority — about [Y] weeks. Your piece moves nearer the front of the line; it is
> never stitched faster.

**The priority option renders only while the queue offset is non-zero** *(pre-build
review).* With four pieces and no orders there is no position to sell, and offering
one would be the first piece of scarcity copy on the site. The modifier and the offset
exist from day one; the words wait for the queue.

---

## 11. Open decision — the email list

**Recommended, not yet ruled on.**

Nothing in the plan captures anyone who is not ready to order — which at launch is
nearly every visitor. Collections release over time; without a list, every release
starts from zero and depends entirely on the algorithm showing his video to
strangers again.

The risk is that "subscribe to our newsletter" is the most template-shaped thing on
the internet and would sit badly here. It does not have to be that. In Ubuntu's
language it is an invitation into Abantu:

> Be told when the next collection arrives.

One field. No incentive, no popup, ever. Footer, and possibly the close of the story
page. It is the difference between a launch and a second launch.

---

## 12. Language

**English is canonical and every string above is the source** (Round 14). He writes
in English because it is the surface that meets strangers and carries the reach.
Kinyarwanda is the translation, built from day one and walkable at `/rw`, but
unlinked and hidden from search until the switcher flips.

**What we translate, and what he translates.** The shell is ours — nav, buttons,
statuses, forms, the policy page, every order email. The stories are his. A piece
without a Kinyarwanda story falls back to English silently, so he is never blocked
from publishing.

**The bar for flipping the switcher**, written down so "when we're confident" does not
mean next year:

> shell complete · the four window-display pieces translated · two Kinyarwanda
> readers who are not him

**Checked by hand, not metered.** A dashboard translation-completeness meter was
specified in Round 14 and cut in the pre-build review: it measures progress toward a
switch that is off, and three named things with four pieces behind them can be read
off a page. The strings stay keyed in both locales — the keys are cheap, and the
missing Kinyarwanda values are the part that is meant to be unbuilt.

**Three strings need him, not us:**

1. Does `Ask for this piece` have a Kinyarwanda form, or is it a brand mark that
   stays English? It is the most important string on the site and only he can judge
   whether the translation is as good.
2. `In design` — the word itself, plus its Kinyarwanda key.
3. **The footer line.** *Umuntu ngumuntu ngabantu* is **Nguni** — Zulu and Xhosa —
   not Rwandan, and it sits at the bottom of every page. The word *ubuntu* itself is
   fully Kinyarwanda, meaning humanity and human generosity, and *gira ubuntu* —
   have consideration, be humane — is living everyday speech in Rwanda. The specificity
   rule says name a reference precisely or do not gesture at one, so the story page
   names it as Nguni either way. Whether a Rwandan expression is carried alongside it
   is his. **No Kinyarwanda proverb has been invented to fill the gap.**

**A layout note that is really a copy note:** Kinyarwanda runs roughly 30% longer.
Buttons and nav labels are written with that in mind rather than discovered in Phase 6.

---

## 13. Every `[X]` in this document

Collected so none ships unnoticed:

- The alteration window — days from receipt
- **Alteration pricing** — flat fee or quoted. **Now urgent.** It appears on the
  policy page and on *The making*; the product-page sentence names **who pays**, not
  how much, and that is deliberate — the order block is not the place for a price
  list. You still cannot warn about a cost you cannot name.
- **The contribution toward a local alteration outside Rwanda** — the same number in
  the same three places, and it is the one that decides whether the brand can honestly
  sell to London.
- Reply time on a collection request — days
- Reply time on a commission — days
- Standard and priority timeframes per piece
- **Commission design fee** — an absolute figure, and whether it varies by garment.
  *(Replaces the starting-from figure and the deposit percentage, both retired by
  Round 6.)*
- **The split of the remainder** — how much starts the cutting, how much falls due on
  completion
- Days from design fee to the design being shown
- Days from design agreed to making starting
