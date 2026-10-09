# Foldable Photo Guide Implementation Plan

> **For agentic workers:** Execute the approved design in this session with parallel asset work and independent review. The user has approved implementation and illustrative artwork.

**Goal:** Let store staff open an optional image guide from the foldable photo section.

**Architecture:** Add one header button inside the existing foldable-only section. Reuse the inspection-help bottom-sheet styles with an isolated photo dialog so existing help and upload behavior stay intact. Keep the replaceable illustration in two localized SVG assets.

**Tech Stack:** Static HTML, CSS, JavaScript, SVG, existing GitHub Pages hosting.

## Global Constraints

- One shared guide for screen-on and screen-off photos; no automatic opening or required acknowledgement.
- User approved an illustrative image; do not invent brightness, angle, or inspection acceptance standards.
- Closing restores the original page position and preserves uploaded photos.
- Chinese and English, responsive mobile layout, visible close control and image enlargement.

## Task 1: Add guide and artwork

**Files:** `store.html`, `inspection-help.js`, `assets/foldable-photo-guide-zh.svg`, `assets/foldable-photo-guide-en.svg`.

- [x] Add `#foldablePhotoHelp` with `type="button"` and `aria-haspopup="dialog"` next to the existing title; translate it through the existing dictionary.
- [x] Add a dedicated `#foldablePhotoGuideDialog` using the existing help-sheet classes, a scrollable image viewport and a button that toggles image width between 100% and 200%.
- [x] Load `assets/foldable-photo-guide-${en() ? 'en' : 'zh'}.svg`; set localized title, alt and zoom instructions on open.
- [x] Save scroll position and existing overflow styles before opening; restore styles, scroll and trigger focus on close, including Escape.
- [x] Bump the inspection-help script query version to `20261009-1`.

## Task 2: Verify and publish

- [x] Use the actual UI path to reach foldable inspection. Check opening, loaded image, enlargement, image scrolling, close button and Escape, original scroll position and photo state.
- [x] Check ordinary-phone absence, 320/390px layouts, Chinese/English/reload and existing capacity help.
- [x] Run existing store scan tests and JavaScript syntax checks; review the focused diff.
- [ ] Commit only this change, push without force to the current Pages source branch after checking its latest head, and verify the Pages build plus deployed file hashes.

## Verification results

- Existing scan/supervisor tests: 5 passed. External and inline JavaScript syntax checks passed.
- Browser verification: Chinese at 390px, English at 390px and 320px; guide opens without upload prerequisites, SVG loads, zoom/scroll work, Close and Escape restore page/focus/photos, normal phones hide the entry, language roundtrip works.
- Existing capacity help was checked in Chinese. English startup already lacks those pre-existing help buttons and throws in `auction-detail-alignment.js:68`; reproduced with the original script and excluded from new-error checks. No unrelated code changed.
- Independent code review found no blocking issues; Chinese/English screenshots inspected.
