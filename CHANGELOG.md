# TUBAL HUB Changelog

## v1.2.17 — 2026-05-13

- Compact container: padding 24px → 12px, card radius 26px → 18px.
- Mobile lag fix: removed heavy `backdrop-filter`, disabled mobile animations/transitions, added `content-visibility: auto` and intrinsic sizing.
- Firebase homepage data uses one-time `getDocs()` reads instead of realtime listeners, with manual **Refresh Live Data**.
- Sliding UI pauses off-screen where supported and mobile uses scroll-snap instead of timer-driven transforms.
- Resize/scroll handling uses a 100ms debounce where applicable.
- Live Stats and footer version are read dynamically from `version.json`.
- Lazy image loading remains enabled through existing HTML attributes.

> Performance changes only. Existing feeds, journals, cart, Firebase data, AI Music, CTRLZONE, and other functionality remain intact.

## v1.2.16

Previous production release.
