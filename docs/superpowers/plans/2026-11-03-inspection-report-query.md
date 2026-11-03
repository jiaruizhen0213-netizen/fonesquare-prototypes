# 质检报告查询 Implementation Plan

> For agentic workers: implement and review the isolated module before publishing; user has authorized the prototype change.

**Goal:** Add an item-number upload and PMS inspection-report lookup prototype to overseas retention.

**Architecture:** A separate `inspectionReports` view owns upload and query state. It reuses global XLSX and the existing export-task API without changing inventory, retention, strategy or transfer records. The local PMS simulator is explicitly labelled and returns no fabricated report for unknown identifiers.

**Tech Stack:** Vanilla JavaScript, HTML/CSS, existing embedded XLSX, JSDOM and Playwright.

**Spec:** Current user request in this conversation, plus current `index.html` detailCols and detailDialogCols (verified 2026-11-03).

## Global Constraints

- Keep these report fields in order: 物品编号、商品码、货源主体、运营中心、型号名称、内存、颜色、海外购买渠道、海外等级、PJT等级、质检报告编号、最新看图成色、边框背板、屏幕外观、屏幕显示、电池健康度。
- Add only query metadata (查询状态、查询时间、查询失败原因), not pricing/strategy/comparison/retention/transfer fields.
- Preserve string item numbers and leading zeros; reject formula cells and numeric identifiers longer than 15 digits.
- Unknown reports, query failures and missing attributes are distinct. Only known demo identifiers return fixture data. All PMS behavior is explicitly simulated.
- All new dropdown filters use checkbox multi-select. Same-field OR, cross-field AND; search applies on 查询.
- No writes to existing inventory, retention, strategy or transfer state. No real PMS or lock requests.

## Task 1: New module and route

Files: create `overseas-retention/inspection-reports.js` and `.css`; add nav, empty section, route name and versioned asset references to `index.html`.

- [x] Add navigation with `data-view="inspectionReports"`, a matching `.view` with `id="inspectionReports"`, and `names.inspectionReports='质检报告查询'`.
- [x] Build a heading, template/upload/example actions, query filters, current-result table, pagination, upload dialog and report detail dialog inside the new view.
- [x] Upload template contains only `物品编号`; cells use string type and text number format. XLSX parser uses raw values and rejects unsafe identifiers rather than coercing them silently.
- [x] Upload replaces the current query result with an explicit notice; merge repeated valid identifiers and report the duplicate count. Invalid rows remain visible as query failures. Loading prevents double submissions and result export until settled.
- [x] A local async lookup function returns the 16-field whitelisted report, null for no report, and a retryable error fixture. Retry updates the same row without duplicating it.
- [x] Expose successful item numbers as blue detail links and keep the first table column sticky. Missing returned values display `—`.

## Task 2: Export integration and verification

Files: modify `overseas-retention/export-tasks.js` only to add the new export type; add `tests/retention-inspection-reports.dom.cjs`; append the feature summary to `overseas-retention/README.md`.

Interface: `window.RetentionExportTasks.create({type:'质检报告查询导出',format:'xlsx',filename,matrix,count})`; snapshot all filtered rows, not just the current page. Matrix headers contain report fields plus query metadata only.

- [x] Check template workbook contains `物品编号` and no mandatory region field.
- [x] Test uploaded string IDs, duplicate merging, leading zeros, unsafe numeric/formula cells, blank or bad headers, empty/unreadable file, and safe text rendering.
- [x] Test successful, missing and failed queries, retry recovery, live progress, repeated-upload replacement, filtering/reset and pagination.
- [x] Check exported field names and actual values, blank failed-report values, original string IDs, and immutable snapshots. Verify original detail/inventory rows remain identical.
- [x] Run focused DOM acceptance plus appropriate existing navigation/export regression. Check browser upload, details and result table at desktop and narrow widths with no page errors.
- [ ] Inspect diff, commit only the relevant module/integration/tests/documentation. Push main, wait for Pages `built` at the exact commit, verify remote asset bytes and HTTP 200, then return the new route.
