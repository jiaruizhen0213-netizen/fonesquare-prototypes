# Unified account detail

User approved: a single 查看 action; merge FoneSquare, Store merchant and staff profiles in the same page. No-role accounts remain readable without implied onboarding.

1. Add platform-account-detail.js after existing extensions. Reuse scoped merchant share/bank and employee relationship editors; expose narrow account context from unified list. Preserve existing records/IDs.
2. Replace two list links with 查看. Merge into detailPage: basic, KYC, limit/deposit, business permissions, merchant-only share, role-scoped bank, per-business owners, sourced audit logs. No-role states distinguish never logged in vs logged but unselected; neither permits Store settings. Missing FS profile stays empty, independent bid permission persists.
3. Restore screenshot fields and functioning FS profile/KYC/image/limit/owner edits; make log diffs explicit. Do not alter existing finance/share calculations or registration flows.
4. Browser acceptance: all identity/profile combinations, no synthetic records, staff entry parity, role change, permissions, bank isolation, editors, return state. Run existing bank/address regressions and syntax/diff checks, inspect screenshot.
5. Fresh-auth/fetch Feishu PRD, replace only superseded blocks and preserve source references; existing whiteboard updated separately by required whiteboard subagent. Read back after every write.
6. Commit scoped files, publish main, verify Pages deployment and served files.

Validation completed: browser scenarios passed for merged merchant/staff, both no-role states, neither App profile, KYC/company/image/profile/limit/owner edits and audit, independent bid changes, identity changes, bank edits, disabled accounts and export; zero page errors. Existing bank/address tests: 9 passed. Merchant/staff screenshots inspected. Feishu targeted changes read back at revision 56; original whiteboard token retained and visually checked.
