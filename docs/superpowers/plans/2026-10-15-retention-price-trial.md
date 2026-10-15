# Retention strategy price trial Implementation Plan

> For agentic workers: execute the bounded tasks below with independent chart implementation and review. User has approved the modal placement and apply-price behavior in the current thread.

**Goal:** Make strategy creation/editing a modal with inventory price trial immediately above 留货目标与价格, a nonbinding overseas-sale reference, and explicit price application.

**Architecture:** Preserve existing pages and move the strategy form into a native dialog. A scoped reusable chart consumes an explicit demonstration inventory snapshot and the selected strategy context. Form changes rebuild the matching snapshot context; applying prices updates only draft fields until saved.

**Tech Stack:** Existing static HTML, CSS, plain JavaScript, inline SVG, JSDOM; GitHub Pages.

**Spec:** User message dated 2026-10-15 and its two screenshots in this task.

## Global Constraints

- Keep unrelated inventory, export, retention-result and actual locking behavior unchanged.
- All added data are explicitly marked prototype demonstration data; no PMS/Galaxy calls.
- Only saved prices participate; missing prices skipped, counts inclusive and not target-capped.
- Overseas estimated sale price uses the current model, memory, overseas grade and selected channels, minimum across channels; it is a reference, never a drag cap.
- Apply with selected price <= reference: P = selected price, U = reference. With selected price > reference: exact message 超出预估售价请确认后手动输入; do not mutate P or U.
- Manual P/U inputs remain available and validate U >= P. Missing estimates do not silently produce a partial minimum.
- Cancel/close must not save. Existing-strategy edits keep ID and status.

### Task 1: Chart and application module
Files: overseas-retention/strategy-price-trial.js, strategy-price-trial.css.
API: window.RetentionPriceTrial.mount(container, context, onApply) -> {update(context),destroy()}; context contains label, currency, items [{id,price}], estimatedPrices [{channel,price}], initialPrice, snapshotTime, priceTime, disabledReason. Callback receives {base,ceiling}.
- [x] Render exact cumulative stair-step counts, missing-price count, reference line and selected price.
- [x] Native slider and pointer dragging work beyond reference, with finite bounds including stock max and headroom beyond reference.
- [x] Apply calls callback only for valid price <= complete reference; preserve values and exact error otherwise.
- [x] Test ties, missing prices, min across channels, above-reference selection/application, empty snapshot, stale contexts.

### Task 2: Modal and strategy integration
Files: overseas-retention/strategy-editor.js, strategy-editor.css, index.html, README.md.
- [x] Move existing create form into dialog; fixed header/footer, scroll body, responsive layout, keyboard dismissal and focus restoration.
- [x] Place trial section directly before 留货目标与价格. Add list/editor entry handling, load row-specific data and bind immutable fields for active strategies.
- [x] Keep explicit demonstration scope/price catalog separate from rendered graph, filter by current range/template before counting; no inherited page filter contamination.
- [x] Apply price into draft inputs only; save valid draft updates corresponding row; cancel discards edits; manual above-estimate price remains possible when U >= P.
- [x] Ensure deep link #create uses modal and navigation stays functional.

### Task 3: Verify and publish
Files: tests/retention-price-trial.dom.cjs; existing tests/retention-inventory.dom.cjs.
- [x] Validate integrated create/edit/modal close/save, exact warning and no mutation, channel min, saved-price count, responsive chart geometry.
- [x] Run existing inventory regression, node syntax and git diff --check.
- [x] Review independent feedback and resolve issues; attempt actual browser screenshot where runtime permits.
- [ ] Commit only task files, push fast-forward to origin main, wait for Pages built at commit, compare all deployed changed asset hashes.
