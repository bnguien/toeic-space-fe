# Admin visual rules

- Palette comes from the Oysteic mascot: periwinkle shell (blue), shell pink (rose), pearl cream (`--ui-pearl`).
- Canvas: `--ui-canvas` for the navbar and content. The sidebar, cards and controls sit on white surfaces with a 1px `--ui-line` border.
- Text: neutral ink and muted gray. Borders use one neutral family.
- Blue: interaction states and Listening (Parts 1-4). Rose: Reading (Parts 5-7) and the library heading accent.
- Use `--ui-blue` / `--ui-rose` for text, `-mid` tones for bars and dots, `-soft` tones for tinted backgrounds.
- Green (`--ui-green`) is only for the "Đang sử dụng" status. Draft and archived stay neutral.
- Yellow stays in mascot artwork, not structural surfaces or navigation.
- Exam cards share one appearance. Do not assign colors by row index or arbitrary categories.
- Show category labels from `CATEGORY_LABELS`, never raw enum values such as `FULL_TEST`.
- Header illustration is low contrast with a white summary strip. No rainbow accent strips or competing colored bands.
- Card columns follow the content width (container query), not the viewport: 4 → 3 → 2, so a 12-item page always fills its rows. Use the existing visual/list mode for comparison.
- Sidebar: a group that contains the current page only tints its label. The current child gets the tinted background and the accent bar.
- Use section separators sparingly, and reserve left accent bars for navigation and Part identification.

Palette source: `src/styles/globals.css`, variables prefixed `--ui-`.
