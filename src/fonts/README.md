# The three faces

Vendored as files, not fetched. **No third-party request on first paint** — not at
build time either, so a build never waits on someone else's CDN.

| File | Face | Role |
|---|---|---|
| `fraunces-latin.woff2` | Fraunces, roman | Headings *(foundation §9 — "a warm literary serif")* |
| `fraunces-italic-latin.woff2` | Fraunces, italic | The scene line, the footer maxim |
| `instrument-sans-latin.woff2` | Instrument Sans | Body and every form field |
| `sacramento-latin.woff2` | Sacramento | **The wordmark and one closing mark per page. Nothing else.** |

All four are the **latin subset only**. Kinyarwanda is written in plain Latin script
with no diacritics, so `latin` covers both locales — which is why R14 could record
"Latin script, so no font risk".

## Why the Fraunces files are half the size Google serves

Fraunces ships with three axes on the latin subset: `opsz` 9–144, `wght` 100–900 and
`SOFT` 0–100. Two of those are not choices a *reader* makes — they are the brand's
decision about what the face looks like, made once:

- **`opsz` pinned to 24.** Left to vary, `font-optical-sizing: auto` walks a heading
  up toward the 144 display cut, which is the high-contrast, hairline-serif Fraunces.
  That is the wrong face for this brand. Pinned low, a 48px heading keeps the sturdier
  text-weight forms.
- **`SOFT` pinned to 50.** The warmth. `SOFT` 0 is sharp, brittle terminals; 100 goes
  soft to the point of blur. 50 is the "set warm" the brief asks for.
- **`wght` left variable, 300–700**, because that is a real typographic range the
  design uses.

Pinning them with `fontTools.varLib.instancer` took the pair from 264 KB to 99 KB —
and it puts the decision in the file rather than in a `font-variation-settings`
declaration that any later stylesheet could quietly override.

**316 KB → 152 KB for all four.** That matters here more than it usually would: most
visitors arrive on a phone from Instagram, on Rwandan mobile data they pay for by the
megabyte.

## Regenerating

Only needed if a face is replaced or another axis value is chosen. Not part of any
build — the outputs are committed.

```bash
python3 -m venv venv && ./venv/bin/pip install "fonttools[woff]" brotli

# Latin subset, from the Google Fonts CSS2 API (a modern UA gets woff2 back):
#   Fraunces roman   family=Fraunces:SOFT,opsz,wght@0..100,9..144,300..700
#   Fraunces italic  family=Fraunces:ital,SOFT,opsz,wght@1,0..100,9..144,300..700
#   Instrument Sans  family=Instrument+Sans:wght@400..700
#   Sacramento       family=Sacramento
# Then, for each Fraunces file:
#   instancer.instantiateVariableFont(font, {"opsz": 24, "SOFT": 50, "wght": (300, 400, 700)})
```

Requesting `ital` *and* `SOFT` together returns the roman only; the italic has to be
asked for on its own. That is an API quirk, not a missing face.

## Licence

All three families are SIL Open Font License 1.1. Fraunces — Undercase Type. Instrument
Sans — Instrument. Sacramento — Astigmatic. The OFL permits redistribution inside a
project like this one; it does not permit selling the fonts on their own.
