# Shared auction and order details implementation plan

Goal: Apply the approved shared product/report layout to Store and Recycler details, with remarks inside reports and three pickup states.
Architecture: Shared, per-device prototype snapshots and presentation helpers; existing role actions remain in their owning App. Order details consume the same report helpers and selected-order data.

- [x] Add shared report/product helpers and scoped styling, with photo preview and snapshot remarks.
- [x] Integrate auction and pre-winner details, retaining bid and seller-decision behavior; move the Store report editor inside its report.
- [x] Integrate selected-order details and add delivered state/filter/example with separate pickup/delivery timestamps.
- [x] Test cross-App report parity, all pickup states, role restrictions, language, returns and existing publishing/earnings flows; inspect mobile screenshots.
- [ ] Commit scoped files, publish GitHub Pages and verify deployed assets.
