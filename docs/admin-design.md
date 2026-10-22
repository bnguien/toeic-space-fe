# Admin visual rules

- Palette comes from the Oysteic mascot: periwinkle shell (blue), shell pink (rose), pearl cream (`--ui-pearl`).
- Canvas: `--ui-canvas` for the navbar and content. The sidebar, cards and controls sit on white surfaces with a 1px `--ui-line` border.
- Text: neutral ink and muted gray. Borders use one neutral family.
- Blue: interaction states and Listening (Parts 1-4). Rose: Reading (Parts 5-7) and the library heading accent.
- Use `--ui-blue` / `--ui-rose` for text, `-mid` tones for bars and dots, `-soft` tones for tinted backgrounds.
- Green (`--ui-green`) is only for "in use / active" states (content "Đang sử dụng", accounts "Đang hoạt động"). Draft and archived stay neutral; pearl marks "waiting" states such as unverified accounts.
- Yellow stays in mascot artwork, not structural surfaces or navigation.
- Exam cards share one appearance. Do not assign colors by row index or arbitrary categories.
- Show category labels from `CATEGORY_LABELS`, never raw enum values such as `FULL_TEST`.
- Header illustration is low contrast with a white summary strip. No rainbow accent strips or competing colored bands.
- Card columns follow the content width (container query), not the viewport: 4 → 3 → 2, so a 12-item page always fills its rows. Use the existing visual/list mode for comparison.
- Sidebar: a group that contains the current page only tints its label. The current child gets the tinted background and the accent bar.
- Use section separators sparingly, and reserve left accent bars for navigation and Part identification.

Palette source: `src/styles/globals.css`, variables prefixed `--ui-`.

## Building admin pages

Use the shared kit in `src/modules/admin/components/ui` (one stylesheet, `ui.module.css`) so every page has the same sizes and behaviour:

| Need                                                                    | Component                                                                                           |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Page frame: eyebrow, title, short description, header actions           | `AdminPage`                                                                                         |
| KPI row; a card can link or act as a quick filter                       | `StatGrid` + `StatCard`                                                                             |
| Search + one "Thao tác" menu (filters, export, refresh) + filter chips  | `DataToolbar` (`Segmented` for tabs / view modes)                                                   |
| Table with a column picker (choice remembered per table) and pagination | `DataTable` with `Column[]`; mark secondary columns `defaultHidden`, the identifying one `locked`   |
| Details of a row                                                        | `Drawer` opened from a URL key (`?user=`, `?exam=`, `?question=`), never a separate full page       |
| Confirmations and short forms                                           | `Modal`, `ConfirmDialog`                                                                            |
| Charts                                                                  | `TrendChart` + `TrendLegend` + `TimeRangeFilter` (time series), `Breakdown` / `SegmentBar` (shares) |
| URL state (search, filters, page, open drawer)                          | `useListParams`; use `update()` to change several keys at once                                      |
| Export                                                                  | `collectPages` + `downloadCsv` (UTF-8 BOM, formula-safe cells)                                      |

Rules:

- Each page sets one colour family with `<AdminPage theme>`: `blue` (dashboard, students, admins, all accounts), `amber` (teachers), `rose` (exam bank). Badges (`tone="theme"`), share lines, charts and summaries use only the `--theme-*` variables; rose stays for danger states such as a suspended account.
- Chart only what changes over time (sign-ups, sign-ins) with `TrendChart` and the shared `TimeRangeFilter` (24 giờ, 3 ngày, 7 ngày, 30 ngày, 90 ngày → API `period`). Figures that barely move are counts plus a thin `Breakdown` share line, never a large chart, and a figure shown in the banner is not repeated below it.

- Show only figures that come from an API. Sections without a backend use `EmptyState` with links to related pages, not sample numbers.
- Validate every response with the schemas in `src/modules/admin/api/schemas.ts` (`parseResponse`); types are inferred from them.
- Admin-only queries (`useManagedUsers`) stay disabled for teachers, who share the admin shell.
- Keep labels short; skip descriptions that repeat what the component already shows.
