# Real-time auction merchant management implementation plan

**Goal:** Move merchant/store/staff management into real-time auction and scope the account list to successful Store App logins.
**Architecture:** Update the existing unified-account renderer and navigation; retain unified identities, permission validation, and bank-account wrappers. An explicit firstStoreLoginAt field controls membership independent of role or registration source.
**Tech stack:** Static HTML/JavaScript, Playwright, Feishu CLI XML.
**Spec:** User-approved conversation, 2026-09-19; source Feishu account PRD revision 1176.

## Constraints
- No new merchant tabs. Keep 商家列表 name.
- Include unselected, merchant, and staff identities with successful Store App login; exclude never-logged-in accounts.
- Role changes and account disablement retain membership and history.
- Remove FoneSquare creation, KYC, bidding and detail routing from this surface.
- Keep all unrelated local work and quotation/finance modules unchanged.

## Tasks
- [x] Modify platform.html navigation and system routing: move list/store/staff into auction, default to auction list, preserve other system switching.
- [x] Modify platform-unified-accounts.js: explicit login fixtures and deduplicated membership; relevant filters/table/export; direct role-specific detail; unselected basic account detail; retain permissions and role restrictions.
- [x] Add tests/realtime-merchant.browser.cjs: verify navigation, list membership for unselected/disabled/cross-App/never-login, direct detail, role transitions, permissions, bank/store regression and console errors.
- [x] Run browser checks and git diff --check; inspect screenshots. Commit only scoped files and publish to the existing Pages branch, then verify served version.
- [x] Create a new standalone Feishu change PRD: background then product-design opening flow, source/current/confirmed boundaries, all page rules and acceptance cases. Parse XML to passed, create as user, fetch/read back revision and content.

## Validation evidence
- Browser acceptance passed with no page errors; screenshots inspected.
- Merchant bank/address regression: 9 passed; node syntax and diff checks passed.
- New Feishu document: https://atrenew.feishu.cn/docx/N5KndRt2eoUARLx6ViIcY3a1nQe ; readback revision 3, flow preview verified.
- Publishing uses main-backed GitHub Pages; verify served script after push.
