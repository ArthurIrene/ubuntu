Ubuntu — Session Handoff

Date: 31 Jul 2026
Branch state: main at 60b1a46 (Phase 3, merged). Phase 4 built and verified on
phase-4-order-flow, 8 commits ahead, NOT pushed. Diff review is the review
lane's.

Where we are

Phase 4 (order flow) is DONE and verified in the Workers runtime. The site works
end to end, unstyled: a stranger can ask for a piece and reach a working
tokenised status page, and every transition constructs its email. Phase 5
(design) is next.

Phase 4 — verified facts (don't relitigate)

- 8 commits, no migration generated, nothing pushed. Both fences held.
- Walked in npx wrangler dev (Workers runtime), not just dev: four orders
  created from the real forms with no JavaScript, /o/<token> renders derived
  status, the fit fork's three bands all behave, a reported payment does not
  advance the order, a signed bounce becomes a queue row.
- SECOND-REQUEST WRITES ARE FINE. Orders 2 and 3 created back-to-back with no
  warm-up, both 303. The shared-ExecutionContext lifecycle issue that bit Gate 0
  and next dev does NOT affect this path in preview. Watched for deliberately.
- tsc clean, 159 tests, bundle 1.505 MiB gzipped (50.2% of the 3 MiB cap).
- Server actions post as a $ACTION_ID_<hash> FORM FIELD with no Next-Action
  header when there is no JS. Sending the header with a form body 500s with
  "Connection closed" — that is the JS path, and it fails identically on the
  Phase 2 login action. Not a defect. Worth knowing for the next walk.

Decisions the build lane made (sanctioned, don't reopen)

- EMAIL_TRANSPORT=log is a transport, not a failure. It renders the real message
  and records message_sent, because it did what the configuration asks. That is
  what keeps a stubbed rail from manufacturing a bounce on every order and keeps
  the bounce path provable. Never set it in production.
- The log redacts the token. The brief asked the log to carry it; CLAUDE.md
  forbids it and the Never list wins. Construction is proved by assertions on
  the message in memory instead.
- No bounce column. message_failed already exists and queueActions already reads
  it; a second place recording the same fact is a second place to disagree.
- ranges_version = 1 lives in fit_records.size_chart_version. A dedicated
  integer column would have been a migration and this phase generates none.
  Renaming it is a Phase 5 decision.
- The honeypot on both forms is a doormat, not a control. No captcha: CLAUDE.md
  forbids a paid service and the free ones watch the form.

THE BUG THE WALK FOUND (fixed, but read it)

queueActions asked whether a message had ever been sent. A bounce ALWAYS follows
a successful hand-off, so that was answered yes exactly when a bounce landed and
the resend_failed row never appeared. The Phase 2 test only covered
failed-then-sent. It now asks what happened last, with tests for both orderings,
and the event reads gained an ORDER BY.

BLOCKING — the fit fork is built and cannot be used

garment_type_measurements is EMPTY in production. The three bands are entirely
his to set in Settings (Phase 2 built that screen and it works). Until he
answers, every garment type asks for nothing and orders arrive with no fit
record — a real path, not a stub, but not the intended one. This is the first
item on the FOUNDER TRACK and it now has a feature waiting on it.

TEST DATA IN PRODUCTION — clean up before launch

- Three invented band rows on the "hat" garment type, seeded so the fork could be
  walked. NOT his numbers. Delete or replace.
- Seven test orders with real tokens, customers, fit records and one reported
  payment. Fine behind a closed gate; delete before launch.
- Summer is still test data (see below), unchanged.

OPEN — needs a decision, not a build

- OBSERVABILITY LOGS EVERY ORDER TOKEN. wrangler.jsonc has
  observability.enabled: true, so Cloudflare records request URLs — and the path
  IS the credential. Our own code never logs one (verified: zero occurrences in
  any line we wrote), but wrangler's access lines carry them and production will
  too. Contradicts CLAUDE.md's "never in server logs". Disable, sample, or
  accept — untouched pending that call.
- THE DASHBOARD IS UNWALKED. The admin password is in Supabase Auth and the
  build lane does not have it. His price confirmation was simulated at the
  database level. Token-absence in the dashboard is proved statically: the only
  render is the wa.me href in queue.ts, which is R12d's one permitted exception.
- fit_recorded is appended BEFORE requested on a collection order. Status
  derivation is presence-only so nothing breaks, but the log reads wrong. One
  line in order-create.ts; deliberately not touched after verification.
- MEASUREMENT LABELS AND INSTRUCTIONS ARE ENGLISH-ONLY inline literals in
  content/measurements.ts. A Kinyarwanda customer sees English AND we snapshot
  English as "what they were told" — the one place the record would not honestly
  say what they saw. Fix is to key them like everything else with rw null. Not
  done: the wording is his homework and reshaping it mid-question was wrong.
- The two Kinyarwanda guardrail strings in rw.ts are DRAFTS. First non-null
  values in that file. They need one of R14's two readers before the flip.

FILED — carry into later phases (do NOT let these block the merge)

- FORCE-DYNAMIC, revisit Phase 5/7. The product, commission, and story pages use
  `export const dynamic = "force-dynamic"` — every visit is a full server render
  with a Hyperdrive DB round-trip. On the most-hit public page, Rwandan-mobile
  audience, that's a real latency cost. It was a silent build-lane choice, not in
  the brief. Question to answer: move these to ISR / tag-revalidation once
  there's real traffic and a publish action can trigger revalidation.
- "WHO WE ARE" HAS NO COLUMN. ubuntu-copy.md 3 marks it dashboard-editable, but
  no settings column holds it. Shipped as a keyed draft in his voice. Making it
  editable is a migration — Phase 5 or later.
- next dev SERVES ONE DB REQUEST THEN 500s — including /api/db-check, which Phase
  2 wrote and Phase 3 never touched. The dev shim reuses one ExecutionContext, so
  the per-request memo hands back a connection the previous request's after()
  already closed. Pre-existing, dev-only; preview is unaffected. CLAUDE.md
  already says trust preview over dev. Its own future pass. (This is now the
  second connection-lifecycle quirk in the codebase — the first was the 6543
  pooler in Gate 0. Watch for a third.)
- SUMMER IS TEST DATA IN PRODUCTION. Summer is now a live collection row in the
  real Supabase DB, with a placeholder scene line and story (written this
  session, not his words) and a schoolchildren photo that has an AHF Rwanda
  banner in it. Fine behind a closed gate on an unlaunched site. Before launch:
  overwrite Summer with a real piece or set it back to draft, so a placeholder
  never rides to launch.

Carry forward (unchanged)

- Duplicate-slug 500 → friendly field error is still a Phase 5 form-copy item.
- Email delivery still deferred to Phase 7 (domain verify). Root-caused, not a
  bug. Don't let it block anything.
- pnpm preview swallows worker logs — use npx wrangler dev --port 8788 to see a
  stack; wrangler tail for deployed.
- Migrations run by hand, never in deploy. Never push unattended work without
  review.
- pnpm lint still broken (Next 16 removed next lint) — its own future pass.
- FOUNDER TRACK still needs to go out — five blocking answers (measurement table
  per garment, S/M/L/XL body ranges, seam allowance, design fee, the two
  Kinyarwanda readers) plus the email-recovery item. It's the longest lead time
  on the board and Phase 5 is the first phase that walls without it. This has now
  ridden through three code sessions unsent.

Working method (keep)
Two lanes: Claude Code builds a whole phase from the docs (no push, no live
migration); a separate review pass checks the diff against the acceptance list
before merge. Phase tickets at map altitude in the build plan; expand one to a
full brief only when starting it. Note: ubuntu-build-plan.md does not exist in
the repo — the build lane worked from technical 9's Phase 3 paragraph. Consider
committing the build plan to the repo so the build lane can read it.
