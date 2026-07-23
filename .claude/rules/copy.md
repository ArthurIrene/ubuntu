# Copy

Every string a customer reads. Placeholder text, button labels, error messages,
and email subject lines are all brand voice — there is no "just a label" here.

Where a string below is written out, use it exactly. Do not improve it.

## Voice

Warm. Proud. Poetic. Rooted. The brand speaks as **"we"** and addresses **"you."**
It never explains itself twice and never apologises for what it is.

The personality is *the rebel artisan*: crafted, charming, generous, quietly
confident. Never loud, never pleading.

**Do not write:** exclamation marks. Scarcity ("only 2 left", "hurry", countdowns).
Cart language ("buy now", "add to cart", "checkout"). Distance language
("inspired by Africa", "African-inspired", "ethnic", "tribal"). Marketing filler
("amazing", "stunning", "must-have", "game-changing"). Fake social proof.

**Specificity rule:** cultural references are always named and explained — a
particular scene, tradition, or place. Never generic "African wisdom." If you
cannot name the reference precisely, do not gesture at one.

## Fixed strings

**Order button:** `Ask for this piece` — never anything else.
**Commission button:** `Send it to him.`
**Commission money:** three moments — a **design fee** before he draws, a payment
when the design is agreed and the cloth is cut, and the **balance on completion**.
The fee is credited against the total. Never "deposit", never a starting-from price.
**Beneath the commission button:** `He reads every request himself. You'll hear
back within a few days, from him, not from a system.`

**Order statuses** (customer-facing, in order):
`Requested` · `Confirmed` · `In design`* · `Paid` · `In the making` · `On its way` · `Delivered`

*\* commissions only, derived from the design fee landing. Pending his sign-off on
the word.*

**Beneath the order button, three lines, exactly:**
> He reviews your request personally.
> He confirms your final price.
> Payment starts the making.

**Reply time is qualitative here and numeric everywhere else.** *A few days* beneath
the commission button is deliberate and does not read the dashboard field. The
reply-time value fills `[X]` in the submission state, the *In design* line and the
emails.

**Fit, on the product page** — one sentence, both cases, **no branch**:
> Your piece is cut to the numbers you give us, so take them slowly — we show you
> where each one goes. If the fit needs adjusting when it arrives, he can usually
> alter it; you cover the work and the return — or, if you're outside Rwanda, we put
> [X] toward a tailor near you instead, because posting it back and forth would cost
> more than the piece.

*(Round 15, amended.)* A country-conditional variant was rejected: it is a
request-time branch on an edge-cached public page, and the cache key is not worth
buying for one clause. **State both cases in one sentence.** The duties clause on the
policy page gets the same treatment.

**Children's pieces** *(Round 13)*: say **cut with room to grow.** Never offer it as
a choice — it is how he cuts, not an option on a form.

**Fit fork prompts** — *measurements are the urged path; a size is a real choice, not
a fallback. Warm, never insistent.*
- Measurements: `A tape and five minutes, and the piece is cut to your body. We show you where each number goes as you type it.`
- Size: `He checks every order himself against your height and weight before anything is cut.`

**How each measurement is taken ships beside its field**, at the moment of entry —
never in a tooltip. That sentence is what the policy's shared-liability clause turns
on. Guardrail warnings are soft and acknowledgeable; only impossible values refuse.

**Submission state:**
> Your request is with him. He reads each one himself and will confirm your piece
> and final price within [X] days. Nothing is owed until he does.

**Payment state:**
> Your payment buys the fabric and his hours. The needle starts when it arrives.

## Emails and channel

**Every email body is code**, keyed in both locales and selected by `orders.locale`.
Nine of them: order created, Confirmed, Declined, design shared, design agreed,
payment received (once per gate, different each time), In the making, On its way,
Delivered — plus the token re-send. Never make an email body a dashboard field; an
edited body has no key, no translation, and the flip bar cannot count it.

**The personal note** is the one thing he writes himself: optional, appended above
the signature, in whatever language he is writing. Four emails only — **Confirmed,
Declined, design shared, On its way.** An empty note must leave the layout intact.

**Channel.** The customer chooses email or WhatsApp on the form. **The email always
fires either way**, and the form says so rather than letting it be discovered:

> We'll message you on WhatsApp, and email you a copy you can always come back to.

WhatsApp drafts are the same wording as the email, same token link, same locale —
written by us, sent by his thumb. **Never measurements, on either channel.**

## Vocabulary

- The community is **Abantu**. The philosophy is **ubuntu** —
  *umuntu ngumuntu ngabantu.* **This maxim is Nguni (Zulu and Xhosa), not Rwandan** —
  where the site explains it, name it as Nguni. The word *ubuntu* itself is fully
  Kinyarwanda, meaning humanity and human generosity. Never invent a Kinyarwanda
  proverb to fill the gap.
- Commissions are **"Only yours."** Never "custom", never "bespoke".
  **The nav label is *Only yours*; the route is `/commissions`.** A route name and a
  nav label may differ, and this is the only case on the site — *only-yours* is a poor
  slug and a worse link to paste into a message.
- The process page is **"The making."**
- Say **maker**, **stitched**, **scene**, **piece**, **cloth**, **thread**.
- Avoid **product**, **item**, **SKU**, **merch**.
- **Never "drop."** A drop implies the thing goes away, and nothing here does — the
  collection page simply sorts newest-first. Say **newly stitched**, or *the latest*.

## Language

English is canonical; every string here is the source. Kinyarwanda is a translation
built alongside, walkable at `/rw`, unlinked and `noindex` until the switcher flips.

- **Fixed strings are keyed**, never inline literals — a translation should be a
  weekend, not a rewrite.
- A missing Kinyarwanda story **falls back to English silently.** Never block
  publishing on a translation.
- Write button and nav labels expecting the Kinyarwanda to run ~30% longer.
- Never add an i18n library.

## Placeholders

Where content is a dashboard field, ship a strong draft in the founder's voice as
the default value — never `Lorem ipsum`, never an empty string. He rewrites as
his own words come; the site must read completely from day one.

Bracketed values like `[X] days` are unanswered founder questions. Leave the
bracket visible in drafts so it cannot ship unnoticed. Do not invent a number.

## Priority and timeframes

Priority is sold as **position in the queue, never speed**. Every piece is
stitched at full, unrushed care. Copy shows two honest timeframes and always
frames the difference as queue position. Never write "rush", "express", or
"fast-track".

**The priority option renders only while the global queue offset is non-zero.** With
an empty queue there is no position to buy, and offering one on a site with four
pieces and no orders would be the first piece of scarcity copy on it.
