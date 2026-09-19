# Unified account detail

User approved: a single 查看 action; merge FoneSquare, Store merchant and staff profiles in the same page. No-role accounts remain readable without implied onboarding.

1. Add platform-account-detail.js after existing extensions. Reuse scoped merchant share/bank and employee relationship editors; expose narrow account context from unified list. Preserve existing records/IDs.
2. Replace two list links with 查看. Merge into detailPage: basic, KYC, limit/deposit, business permissions, merchant-only share, role-scoped bank, per-business owners, sourced audit logs. No-role states distinguish never logged in vs logged but unselected; neither permits Store settings. Missing FS profile stays empty, independent bid permission persists.
3. Restore screenshot fields and functioning FS profile/KYC/image/limit/owner edits; make log diffs explicit. Do not alter existing finance/share calculations or registration flows.
4. Browser acceptance: all identity/profile combinations, no synthetic records, staff entry parity, role change, permissions, bank isolation, editors, return state. Run existing bank/address regressions and syntax/diff checks, inspect screenshot.
5. Fresh-auth/fetch Feishu PRD, replace only superseded blocks and preserve source references; existing whiteboard updated separately by required whiteboard subagent. Read back after every write.
6. Commit scoped files, publish main, verify Pages deployment and served files.

Validation completed: browser scenarios passed for merged merchant/staff, both no-role states, neither App profile, KYC/company/image/profile/limit/owner edits and audit, independent bid changes, identity changes, bank edits, disabled accounts and export; zero page errors. Existing bank/address tests: 9 passed. Merchant/staff screenshots inspected. Feishu targeted changes read back at revision 56; original whiteboard token retained and visually checked.

## Approved refinement: Basic information + Store App tab
- Basic tab becomes the screenshot's single FoneSquare merchant-record card, with exact field order and status/type tags. Missing FS record shows actual unified-account information plus empty-state notice, never invented profile data.
- Add 门店端信息 after 基本信息 for every account. Merchant: role, merchant ID/name, completeness, first-login/business-opening dates and links to scoped store/staff lists. Staff: role, member ID/name, current merchant/relation and applicable relation timestamp, preserving relation operations. No-role: explicit never-login vs logged-unselected state.
- Keep permission/share/bank/owner management in their existing tabs. Remove embedded shop/staff lists and duplicated share table; move historical employee relations to the operation-log tab without dropping history.
- Retain unified 查看 entry and role-aware bank/share availability; verify role branches, scoped links, relation updates, editing return and empty states. Update only affected PRD paragraphs, publish and verify files.
Refinement validation: exact 12-field Basic card, all Store-tab identity branches, no duplicate share table or list cards, staff bind/unbind refresh and source-filtered history tested; full account browser suite passed without page errors. Basic/merchant/staff screenshots inspected. Feishu scoped paragraphs verified at revision 62; adjacent KYC, limit, finance and permission rules preserved.

## Approved split into two independent pages
- Replace merged presentation with fsRecordPage and storeRecordPage, sharing rendering helpers only. 查看 opens a small selection menu with direct page links; staff/store links enter Store details.
- FS page: only 基本信息/KYC 认证材料/限额与保证金/维护人绑定/操作日志; exact screenshot fields, no Store identity, permissions, banking, share rules or summary cards. Bidding remains on the existing list.
- Store page: own basic information, role-specific permission/share/bank/owner/log tabs. Staff and no-role behavior preserved without FS content.
- Scope owners/logs to selected business, preserve unified-account status impacts, edit-save route, originating list state, and bank/relationship functions.
- Update conflicting PRD paragraphs and existing flow, then validate each page's visible tabs/content and editing paths before deployment.
Split validation: browser suite passed for independent pages, exact FS screenshot fields/five tabs, business-scoped logs/owners, missing profiles, identity branches, edit-save routes, staff relations/bank, account status and system navigation; zero page errors. Bank/address regressions: 9 passed. Both page screenshots visually inspected. Feishu scoped updates verified at revision 76; existing whiteboard retained and read back. Syntax and diff checks passed.
