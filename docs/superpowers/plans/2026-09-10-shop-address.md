# Shop address implementation plan

**Goal:** Replace the existing store address field in PC and App with registration country, state, city, postcode and detail. KYC is optional and only supplies defaults on create.
**Architecture:** A shared ShopAddress form module owns initialization, validation, fixture suggestions and persistence. Small PC and App adapters retain the existing banking save paths.
**Tech Stack:** Existing static HTML/JavaScript, localStorage, Node tests and Playwright.
**Spec:** https://atrenew.feishu.cn/docx/QL3XdERtioKlvQxSShOceOx6n2f

## Constraints
- Preserve current store/bank navigation and unrelated working-tree changes.
- Country comes from registration; same-country approved KYC may prefill address. Edit never reinitializes from KYC.
- Suggestions are clearly marked prototype data; no live Google credentials.

## Tasks
- [x] Add `shop-address.js`: initial(profile, store), validate(address), mount(input, initial) and persist(key, address). Validate missing country, state and five-digit MY postcode. Add Node behavior tests covering unverified, matched, mismatched and saved addresses.
- [x] Add `platform-shop-address.js` after merchant-bank adapter. Mount on create/edit, validate before existing submit, assign structured data only after successful save; prompt before switching merchants with filled addresses.
- [x] Update `store-merchant-banks.js` editor with the same component; remove the hardcoded verified-address button, preserve bank modes and role guards. Add module includes to both HTML pages.
- [x] Run Node checks and scoped browser create/edit/cancel/bank tests, capture PC/App screenshots, run `git diff --check`, commit task-only files and publish the authorized prototype change. Verify remote content.

Validation environment: `FONTCONFIG_FILE=/tmp/platform-browser-deps/fonts.conf`, `LD_LIBRARY_PATH=/tmp/platform-browser-deps/root/usr/lib64`, Chromium 1228. Missing font configuration causes browser navigation timeouts.
