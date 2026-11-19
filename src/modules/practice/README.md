# Practice module: practice & mock exam

Port of the StudyChill TOEIC practice UX (spec v1, 2026-11-18). Teacher/staff pages of
PBL-26 (`/practice/parts`, `/teacher/practice-sets/*`) live here too; see `docs/PBL-26-practice-sets.md`.

## Colour mapping (decided once; use these tokens only)

| Meaning                                    | Tokens                                                                  |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| Listening (Parts 1–4): accents, bars       | `--ui-blue`, `--ui-blue-mid`, `--ui-blue-soft`, `--ui-blue-line`        |
| Reading (Parts 5–7): accents, bars         | `--ui-rose`, `--ui-rose-mid`, `--ui-rose-soft`, `--ui-rose-line`        |
| Chosen / answered (interaction)            | `--ui-blue` border + `--ui-blue-soft`; filled bubble `--ui-accent-fill` |
| Current question / active state only       | `--ui-green` (outline), never for results                               |
| Correct answer, evidence highlight         | `--ui-correct`, `--ui-correct-soft`, `--ui-correct-line`, `-fill`       |
| Wrong answer, timer ≤ 5 min, unanswered    | `--ui-wrong`, `--ui-wrong-soft`, `--ui-wrong-line`, `-fill`             |
| Flag ("Đánh dấu xem lại", ★ in grids)      | `--ui-pink`, `--ui-pink-soft`, `--ui-pink-line`, `--ui-pink-strong`     |
| Skipped / locked / neutral                 | `--ui-muted`, `--ui-subtle`, `--ui-hover` (locked: hatched + 0.55)      |
| Mini bars (result table): good / mid / low | `--ui-correct` / `--ui-blue-mid` / `--ui-wrong` (`barLevel`)            |

Yellow (`--ui-mark*`) stays reserved for the mascot. `--ui-correct*` / `--ui-wrong*` were added
to `src/styles/globals.css` with light and dark values; everything else already existed, so every
component here follows `[data-color-mode="dark"]` without extra rules. Pages call
`useColorModeScope()`.

## Layout

- `api/`: `attempts.api.ts`, `tests.api.ts`, `practice-progress.api.ts`, `practice-sets.api.ts`,
  `practice-exam.query-keys.ts`. Every response goes through the zod schemas in `schemas/`.
- `types/practice-exam.types.ts`: inferred DTO types, request bodies, `PracticeSpaceMode`.
- `hooks/`: TanStack hooks (`usePracticeExamQueries`, `usePracticeExamMutations`) and behaviour hooks
  (`useAttemptSession`, `useExamClock`, `useListeningFlow`, `useAudioPlayer`, `useSplitRatio`,
  `useFullscreen`, `usePracticePrefs`).
- `utils/`: pure helpers, unit-tested in `tests/practice-exam-*.test.mjs`. They import each other
  with `.ts` extensions and only `import type` from elsewhere, so Node can load them directly.
- `components/common/`: shared building blocks (`index.ts`). Screens own `components/<area>/`.
- `store/practicePrefs.store.ts`: persisted display preferences (`toeicspace.practice.prefs`).

## Rules

- Content HTML only through `RichText` (`highlights`, `blankLabel`, `blankFill` cover evidence,
  Part 6 badges and the Part 5 blank). Never `dangerouslySetInnerHTML`.
- Answers, explanations, transcripts and translations exist only after a check or a submit; the
  server enforces it, the UI never asks for them earlier.
- The exam room uses the single shared audio element (`utils/examAudio.ts`); the practice player
  owns its own element (`useAudioPlayer`).
