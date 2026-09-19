# Real-time auction merchant management implementation plan

**Goal:** Move merchant/store/staff management into real-time auction and include all unified accounts and retain independent FoneSquare bidding permissions.
**Architecture:** Update the existing unified-account renderer and navigation; retain unified identities, permission validation, and bank-account wrappers. An explicit firstStoreLoginAt field distinguishes never-logged-in accounts from users who logged in without selecting a role; it does not restrict membership.
**Tech stack:** Static HTML/JavaScript, Playwright, Feishu CLI XML.
**Spec:** User-approved conversation, 2026-09-19; source Feishu account PRD revision 1176.

## Constraints
- No new merchant tabs. Keep 商家列表 name.
- Include every unified account, including FoneSquare-only and never-logged-in Store App accounts.
- Role changes and account disablement retain membership and history.
- Remove FoneSquare creation, KYC and detail routing; retain independent FoneSquare bidding controls and filters.
- Keep all unrelated local work and quotation/finance modules unchanged.

## Tasks
- [x] Modify platform.html navigation and system routing: move list/store/staff into auction, default to auction list, preserve other system switching.
- [x] Modify platform-unified-accounts.js: explicit login fixtures and deduplicated membership; relevant filters/table/export; direct role-specific detail; unselected basic account detail; retain permissions and role restrictions.
- [x] Add tests/realtime-merchant.browser.cjs: verify navigation, all-account coverage and isolated bid updates for unselected/disabled/cross-App/never-login, direct detail, role transitions, permissions, bank/store regression and console errors.
- [x] Run browser checks and git diff --check; inspect screenshots. Commit only scoped files and publish to the existing Pages branch, then verify served version.
- [x] Create a new standalone Feishu change PRD: background then product-design opening flow, source/current/confirmed boundaries, all page rules and acceptance cases. Parse XML to passed, create as user, fetch/read back revision and content.

## Validation evidence
- Browser acceptance passed with no page errors; screenshots inspected.
- Merchant bank/address regression: 9 passed; node syntax and diff checks passed.
- New Feishu document: https://atrenew.feishu.cn/docx/N5KndRt2eoUARLx6ViIcY3a1nQe ; readback revision 26, flow preview verified.
- Publishing uses main-backed GitHub Pages; verify served script after push.

## Follow-up acceptance
- All unified accounts, FS bid enable/disable and stale-submit rejection, unconfigured permissions, Store App state filters, scoped exports and existing navigation tested in the browser.
