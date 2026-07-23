# Motion

The single-line embroidery is not just photographed on the site — it is how the
site is drawn and how it moves. Scenes redraw as line art, dividers are running
stitches, hovers are stitches sewing themselves. The site should feel drawn by
the same hand that stitches the garments.

## The four laws

1. **Vertical only.** Elements enter by rising. Nothing slides sideways.
2. **Animate once, then rest.** No loops, no idling. One exception: the
   running-stitch divider.
3. **Cloth follows the line.** Colour and images settle after the heading they
   belong to, never before.
4. **One thread at a time.** Never animate three things simultaneously.

The four laws above govern everything below. Where a moment here
conflicts with a law, the law wins.

Every animation honours `prefers-reduced-motion`. Reduced motion gets the
finished state, not a broken one.

## Technical constraints

- Native View Transitions API, CSS animation, and SVG `stroke-dasharray` /
  `stroke-dashoffset`. No animation libraries.
- Next's View Transitions integration is experimental and Firefox support sits
  behind a flag. Every transition must degrade to no-animation without breaking
  layout or blocking navigation.
- `prefers-reduced-motion: reduce` gets the finished state immediately. Never a
  half-played or empty state.
- Nothing may block interaction. A user who taps during an animation gets the
  destination, not a wait.
- **Every image reserves its space before it loads.** Width, height and a focal point
  are stored per image for exactly this. A page that shifts as photos arrive breaks
  the reveals underneath them — **layout shift is a motion bug here, not a
  performance metric.**

## Locked — build as specified

**1. First arrival.** Cream screen, nothing else. The signature writes itself:
word, then the long "t" crossbar sweeping through as the flourish, then the final
dot lands. About 2s. It then rises into the header position as the page lifts in.

- Plays **once per session** (sessionStorage flag, not localStorage).
- **Any tap, scroll, key, or click skips it immediately** to the finished state.
- Reduced motion: finished signature, simple fade.
- Optional, pending founder confirmation: the final dot lands in `--color-wine`. Behind
  a flag; off until confirmed.

**2. Page transitions.** One persistent nav stitch in `--color-wine` that never blinks
out — it sews itself between nav items as the user navigates. One thread moving
through the whole site.

- Outgoing page exhales down a few pixels while fading; incoming page rises from
  below, contents staggered: heading, then body, then images. ~500ms total.
- **One richer transition, gallery → product:** the piece's image lifts and
  expands from its card into the page. Taking a garment off the rail.
- Repeat navigation must never feel like waiting. Mid-transition clicks jump
  ahead. Back is near-instant.
- Prefetch on link hover/visibility — a transition that waits on the network
  feels worse than none.

**3. Scroll reveals.** Each **section** rises once — about 15px plus fade, ~500ms
— staggered within: heading, body, image.

- **Section-level, never paragraph-level.** A long page must not twitch all the
  way down.
- **Fires once.** Scrolling back up re-triggers nothing. This is stillness.
- **Photos are uncovered by a rising edge**, bottom to top, like cloth lifted off
  a finished piece. Text enters in the language of the pen; images in the
  language of fabric.
- Must never be slower than a fast scroller. If an element is already in view on
  load, it is simply there.

## Sketched — propose before building

Bring an approach and a working prototype before committing these. They were
designed in words and need confirming against real code.

**4. The scene drawing (the centerpiece).** On product and story pages, the
scene's line art draws as the user scrolls (scroll-linked, not time-linked), and
the cloth/colour drapes in exactly as the story text arrives. On the commissions
page it plays **in reverse**: an empty ground line, a needle waiting, the scene
absent. The emptiness is the product.

**5. Hovers and micro-interactions.** Links: an underline that sews itself.
Buttons and cards: a dashed stitch border that runs. Quiet, small, everywhere.
Must have a sensible touch-device equivalent — most users are on phones.

**6. Dividers.** Section dividers are running stitches that stitch across the
first time they appear, then keep a gentle march. **The only thing on the site
that moves on its own.** Pauses under reduced motion.

**7. Form moments.** The live fit diagram: an annotated line drawing of the
garment where the numbers the customer types appear on the drawing itself, in
place, as they type. **One drawing per garment shape, referenced by key** — the
garment type holds a key naming its SVG, so *kids 2–6* and *kids 7–12* point at one
file rather than two identical ones that drift the moment either is edited *(R13c)*.
Anchors named by measurement key, no library.

- **The diagram is enhancement and never the input mechanism.** The form must
  complete with no JavaScript, no motion, and a screen reader. This is the difference
  between a beautiful idea and an order that cannot be placed.
- Guardrails are **soft**: an unlikely number asks a question that can be
  acknowledged; only an impossible one refuses. A hard block on a real body is the
  site telling someone their body is wrong.

**8. The ceremony.** One celebratory moment in the whole site: when an order
turns to "In the making", a line figure performs a single clean vertical jump —
the adumu. One person rises while the community holds them up. Plays once, on
that transition only. Never a loop, never elsewhere.
