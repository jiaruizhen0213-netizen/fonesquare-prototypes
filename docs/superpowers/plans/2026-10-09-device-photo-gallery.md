# Device Photo Gallery Implementation Plan

> **For agentic workers:** Implement the user's requested gallery in the current isolated checkout, with independent asset work and review.

**Goal:** Browse and enlarge multiple device photos in the inspection page's top device card.

**Architecture:** Keep the existing device card and model text, replacing its decorative thumbnail with a small gallery. A dedicated module owns photo index, the dark image viewer and gestures. The scan flow calls `StoreDeviceGallery.setDevice(profileKey)` to load the matching device's illustrative photo set.

**Tech Stack:** Static HTML, JavaScript, CSS, SVG; GitHub Pages.

## Scope

- Only the inspection page's top device photos. Existing photo guide and required uploads retain their behavior.
- Three illustrative images for each demonstrated phone type; image arrays support additional photos.
- Thumbnail swipe/previous/next/count; click opens the current photo in the large viewer.
- Large viewer swipe/previous/next/keyboard arrows; click or zoom button toggles enlargement, pinch supports 1–3x, drag pans a zoomed image.
- Switching photos resets zoom. Closing restores scroll/focus and keeps the current photo; rescanning resets to the new device's first image.
- Localized labels, image loading failure text, 320px/390px layouts.

## Implementation

- [x] Add `store-device-gallery.js`, six `assets/device-*.svg` images, thumbnail markup and versioned script reference in `store.html`.
- [x] Connect `setDevice` in `applyScanProfile`; keep gallery state separate from `lotDraft.foldablePhotos`.
- [x] Verify thumbnail buttons/swipes, image synchronization, zoom/pan/pinch, keyboard/close, scan reset, Chinese/English and narrow screen using browser automation and screenshots.
- [ ] Run syntax and existing scan tests, review diff, publish without force and verify Pages build plus deployed content.

## Verification

- Browser checks passed at 390px Chinese and 320px English: thumbnail arrows and touch swipe, viewer arrows/swipe/pinch, zoom and pan, wrap-around, keyboard, synchronized index, scroll/focus restoration, rescanning, language switch, and existing guide/upload preservation.
- Existing scan/supervisor tests: 5 passed. JavaScript syntax passed. Screenshots inspected; independent review found no blocking issues.
- English retains the previously confirmed unrelated baseline error in auction-detail-alignment.js; no new page errors.
