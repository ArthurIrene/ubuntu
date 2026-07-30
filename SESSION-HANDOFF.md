Ubuntu — Session Handoff

Date: 30 Jul 2026
Branch state: main at 1f466b5 (Phase 2 complete, merged, pushed). Phase 3 not yet started.

Where we are

Phase 2 (the dashboard) is DONE — merged to main, pushed, both migrations applied.
Phase 3 (public skeleton) is briefed and ready to build. Nothing gates it.

Phase 2 — closed, settled facts (don't relitigate)
- Merged and pushed: origin/main at 1f466b5. The last commit (the dev-password
  hatch for when the mail rail is down) fast-forwarded clean. R12b unchanged —
  link-first, password-second stays; the hatch only opens a way in when no email
  arrives, gated on request-not-over-https so it can't render on the deployed site.
- Migrations: both applied. pnpm db:migrate reports "2 files, up to date." The
  0001 the earlier handoff worried was held is IN.
- Login proven in the Workers runtime — settles the httpOnly-cookie-under-OpenNext
  question that was open.

Phase 2 — the two findings from close-out testing
- SIDEWAYS-EXIF TEST: PASSED. The one real risk of the whole phase is retired.
  On a real device (dev hatch, local), a photo shot sideways on a phone uploaded
  via /dashboard/api/upload (200 OK) and rendered upright. The browser-resize
  pipeline handles orientation correctly. Memory-on-mid-range-Android and Safari
  WebP encode remain for Phase 5 on HIS phone — the orientation half is proven.
- DUPLICATE-SLUG 500 (Phase 5 fix, not a bug in the save path). Creating two
  pieces with the same name → both derive slug "money" → the second INSERT hits
  the pieces_slug_unique constraint (Postgres 23505) and surfaces as a bare 500.
  The constraint is CORRECT and wanted; the save path works. What's missing is
  graceful handling: the piece form should catch 23505 on pieces_slug_unique and
  show "A piece named X already exists — names must be unique" beside the name
  field, not 500. FILED FOR PHASE 5 (form error copy). Open design question, do
  NOT decide now: whether to auto-suffix (money-2) or force distinct names —
  arguably the founder SHOULD be forced to pick distinct names.

To start Phase 3
1. Confirm the repo's four planning docs match intent (the build lane reads them
   from the repo, not from any upload).
2. git checkout -b phase-3-public   (off main at 1f466b5)
3. Hand Claude Code the Phase 3 brief (public skeleton — routes + data, unstyled,
   both language trees, /rw noindex+unlinked). Read-only against the catalogue:
   no migration, no push. The order-creating form and /o/<token> are Phase 4, not
   this phase.
4. Separate review pass checks the diff against the acceptance list before merge.

Phase 3 — done when
Every route renders real DB content on both language trees in preview on a real
phone; collection grid newest-first, card-fields-only query; nothing shifts as
images load; nav four items, Policies + Talk to us in footer; no page writes to
the DB.

Carry forward (unchanged)
- Email delivery still deferred to Phase 7 (domain verify) — empty Resend key +
  the shingiroirene/arthurshingiro address mismatch. Root-caused, not a bug.
  Do NOT let it block anything.
- pnpm preview swallows worker logs — use npx wrangler dev --port 8788 to see a
  Worker's stack (this is how the duplicate-slug trace was caught); wrangler tail
  for deployed.
- Migrations run by hand, never in deploy. Never push unattended work without
  review. Both fences held again this session.
- pnpm lint still broken (Next 16 removed next lint) — its own future pass.
- Founder track (five blocking answers + email recovery) still needs to go out —
  it's the longest lead time on the board and Phase 5 is the first phase that
  walls without it.
