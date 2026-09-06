# Platform Account V1.1 Implementation Plan

**Goal:** Implement the approved V1.1 unified account list and merchant/staff lifecycle in the published platform prototype.
**Architecture:** Preserve existing business records and unrelated modules. Add a pure lifecycle model and an account-management UI adapter loaded after the existing page scripts. Account IDs and merchant IDs remain distinct; existing store and financial records are never migrated by role changes.
**Tech Stack:** Static HTML, CSS, vanilla JavaScript, Node test runner, Playwright browser validation.
**Spec:** https://atrenew.feishu.cn/docx/EgWNdLGZEoqcUTxRJINcnIvcnpb (revision 15).

## Constraints
- Three primary pages: 账号列表、店铺列表、店员列表.
- One row per unified account, including unopened accounts and staff.
- Platform-only relationship changes, mutually exclusive current roles, no automatic role swap.
- Merchant disablement preserves relationships and local store configuration; global account disablement affects both Apps.
- Independent merchant detail and orphaned merchant query remain reachable.
- Isolated checkout; do not include unrelated dirty financial/order changes.

## Tasks
- [x] Add `platform-account-model.js` exposing account aggregation, role/permission checks, disablement, reset, transfer, handover and restore operations. Verify with `node --test tests/platform-account-v11.test.mjs` including invariants and failures.
- [x] Add `platform-account-v11.js` for filters, detail sections, business and account controls, required reasons, before/after previews, logs, orphan query and demo onboarding. Wire after existing scripts in `platform.html`; preserve existing business details.
- [x] Extend store/staff renderers with parent state, current/history scope and explicit permission results. Include bilingual UI and reviewer permission scope.
- [x] Exercise browser flows for deduplication, dual-App isolation, handover, reset/new opening, orphan restore, role conflicts, language and navigation; capture screenshots. Run existing regression suite and `git diff --check`.
- [x] Commit scoped files, publish current main plus this change, fetch public HTML/assets and verify exact deployed content. Record any remaining limitations.

## Validation evidence

- Eight focused lifecycle tests passed. Browser suite passed account deduplication, filters, App isolation, primary handover, history scope, independent staff binding, role reset, draft resume/new merchant opening, orphan restoration, global disablement, limited scope, bilingual UI and order navigation.
- Existing suite baseline: 54 / 64 pass, ten failures. With new tests: 62 / 72 pass, the same ten legacy failures (source-pattern assertions and pre-existing script extraction/finance expectations); no added failures.
- No unrelated dirty files included. Browser dependencies were extracted under /tmp without system installation.

- Published implementation commit `ade4573` to main. Public platform HTML and both account scripts match the committed bytes. The browser suite also passed against the public GitHub Pages URL. Original checkout fast-forwarded with its unrelated dirty files preserved.
