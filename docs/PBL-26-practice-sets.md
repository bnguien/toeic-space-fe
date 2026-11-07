# PBL-26 frontend

The `practice` module owns API contracts, runtime response schemas, query hooks,
metadata validation, browsing, preview and Teacher management. It uses the existing
Axios client, auth session, Question Bank API/preview, buttons, confirmation dialog,
pagination and safe RichText renderer through module public exports.

| Route                             | Purpose                                                                   |
| --------------------------------- | ------------------------------------------------------------------------- |
| `/practice/parts`                 | Active-only browsing with search, Part/Kind and conditional Level filters |
| `/practice/parts/:id`             | Metadata and authenticated read-only question/answer/explanation preview  |
| `/teacher/practice-sets`          | Server-paginated owned management list                                    |
| `/teacher/practice-sets/create`   | Compose locally; Save or Publish metadata and questions together          |
| `/teacher/practice-sets/:id/edit` | Metadata, bank selection, question order, publish/unpublish               |

The Teacher routes live under the existing Teacher Dashboard guard and layout. Ownership
checks also control visible edit/delete actions and direct edit routes. Backend APIs enforce
all permissions, including Admin override; there is no new Admin page or dashboard access change.
Navbar uses the configured `/practice/parts` path in desktop and mobile menus, preserving
the existing anchor behavior for other navigation entries.

New sets keep metadata and ordered questions in component state until Save or Publish.
Creation sends both in a single POST; publishing also validates and commits Active status
in that request. Leaving and confirming discard sends no write request. Existing sets
still save metadata and questions separately; their publication action validates saved
server content. An Active set accepts only valid replacements, and cannot be emptied. Remove all
saved questions from a non-Active set before changing Part. Draft and Archived sets may
be republished after validation. UI labels do not rename backend enum values.

Preview uses ordered item IDs from detail to preserve exact set order even when the content
payload groups questions by passage. Imported HTML is rendered by RichText; media uses
the shared URL parser. Answers and explanations require an authenticated session.
Query caches are invalidated after writes and cleared by the existing sign-out workflow.

The Teacher picker opens the existing Question Bank `Drawer` and `QuestionPreview`
without navigation. Both selected and bank rows use readable question cards with Part,
source question number (or list position), actual prompt/option preview, difficulty and
available media/topic metadata. Newly picked summaries remain available across bank pages
before saving. Drawer close/Escape preserves selection, search, page and focus.

Student and Teacher previews share `ListeningTranscript`, `QuestionExplanation` and
`QuestionOptions`. Only Parts 1–4 render the collapsed transcript disclosure, directly
after its audio. Shared listening scripts use passage content/transcript and question
transcripts; identical plain/annotated imports are deduplicated without changing the stored
text or dropping distinct scripts. Reading passages remain visible text. Solutions show
only explanation, the available Vietnamese translation and answer information; no nested
transcript toggle. Question and passage translations are both considered and identical text
already present in the explanation is not repeated. Missing content is never generated.

Read-only content audit (local imported database, November 2026): 155 Part 1 and 680 Part 2
questions have no transcript source. Three questions each in Parts 3 and 4 lack their own
transcript but all have passage scripts. All questions have an explanation, which may itself
contain Vietnamese translation. Separate passage translations exist for 208/1,324 Part 3,
160/1,017 Part 4, 427/446 Part 6 and 390/390 Part 7 passages. These are field-presence
counts, not an assessment of translation completeness. Existing API mappings split the
documented translation delimiters correctly; no backend contract or data change is needed.

Layouts use mobile-first grid breakpoints at 768 and 1024 pixels, with loading, empty,
retry/error, disabled-save and mutation-error states. No PDF upload, attempt execution,
answer submission, grading, Mock Test or new dependencies are included.

Review fixes preserve saved order and render passage context once per consecutive group:
an A–B–A–A selection renders A, B, then A again. Missing question payloads are reported
at their saved position. Shared `QuestionMedia` retains each preview's image styles and
audio policy, with media deduplication scoped to the current passage group. Student Part 6
blanks map unique source question numbers to selected question IDs and visible positions;
unselected, missing-number or ambiguous blanks retain their source labels. The Teacher
bank preview retains its complete-source positional fallback through the same utility.

The picker compares ordered server IDs with its observed server state and saved baseline.
Clean selections follow refetches; dirty selections remain intact with conflict feedback
and a confirmed reload action. Successful saves use the returned ordered IDs as the saved
baseline and preserve edits made while awaiting the request. Older in-flight practice
queries are cancelled before mutations; post-commit invalidation fetches current data.
No server revision field or new state library is required.

Run `npm test` for Node's built-in regression tests (Node 22, already required). Pure tests
cover grouping/order, reliable blank mapping and picker synchronization; rendering tests
use the existing Vite SSR loader and React renderer to exercise actual Student/Teacher
components, media, blank labels and collapsed Listening disclosures. The creation interaction
test uses jsdom to cover discard/cancel, Save, failed Publish, Publish and existing-set discard
with the actual editor/router and an isolated Axios adapter. Browser verification should also cover two tabs, failed saves, reload
confirmation, Drawer/pagination, and desktop/tablet/mobile layouts.

## Reviewer fixes (3 November 2026)

The editor owns metadata/picker dirty flags. Router Back, sidebar links and breadcrumbs
show a Vietnamese discard dialog; beforeunload guards reload/close (browsers choose the
native dialog text). Failed saves preserve drafts. Successful saves reset their baseline.
Background refetch errors retain an existing editor instead of unmounting its drafts.

Detail parsing retains `createdAt`/`updatedAt`. Clean metadata follows refetch; dirty
metadata retains local values and blocks save after a changed server timestamp, with a
confirmed reload action. PUT sends `expectedUpdatedAt` from the edit baseline; the backend
checks it under its set lock. Deploy these contract changes together. Older clients omitting
the precondition still use last-write-wins; timestamp precision is microseconds, not a new
database revision counter. The picker retains its existing ordered-ID conflict detection.

Practice queries include identity/role, and auth identity/role transitions clear caches,
including BroadcastChannel login/sync updates. Preview uses loaded questionCount and shows
targetScore. Archived selected content retains status/topic, displays an inactive badge,
and blocks publishing; backend validation remains authoritative. Saved content status takes
precedence over an older cached Active bank page.

Both lists persist filters/search/page in URL parameters. Requests debounce search by 350 ms.
Shared Select and EmptyState are reused. Selected questions render 20 per page while global
selection/order and cross-page moves remain intact. Cards show set position and original
questionNumber separately; accessible names include actual preview/metadata and contextual
Add/Remove actions. Management clamps an emptied page. Unpublish and deleting an Active set
require confirmation. Status PATCH only offers Active/Archived; Draft is used at creation.

`npm test` includes actual Admin Preview rendering across Parts 1–7 and Vietnamese error
mapping. `tests/review-browser.html` is a local-only synthetic browser fixture using an Axios
adapter and dedicated localStorage key; it never calls an API or uses real account data.
Open it on the Vite dev server for navigation, conflict, pagination and confirmation checks.
It is outside the production entry/build. Reset fixture affects only its synthetic data.

## Creation persistence fix (7 November 2026)

The former "Create draft" action persisted empty metadata before the question picker
appeared. Discard only abandoned subsequent local edits, leaving that saved draft listed
with zero questions. Creation now shows the picker immediately and offers Save/Publish
only. Changing Part resets the local question selection. No draft ID or content request
is needed until persistence succeeds. Successful creation resets navigation state and
opens the saved editor without a discard prompt. A pending save blocks discard until
the request settles. Existing saved sets remain when later edits are discarded.

Deploy the matching backend POST contract (`questionIds`, optional `status`) together
with this frontend. The backend validates before adding any record and commits metadata,
ordered items and initial status in one transaction. This does not remove drafts already
created by the former flow; those remain saved records.

`tests/practice-creation-browser.html` is an isolated creation fixture, also used by the
automated interaction test. Its visible counters report saved sets and POST requests.
It uses synthetic in-memory records and does not contact the real API.

## Concurrent question saves and Preview revocation (7 November 2026)

Question-list PUT now sends `questionIds` plus required `expectedQuestionIds`, the editor's
saved ordered baseline. The server compares the baseline under its set write lock and
returns 409 `concurrency_conflict` if another editor changed membership or order. The
Teacher editor keeps unsaved selections, refetches the server list after a conflict, and
blocks saving a known stale list until the user confirms reload. It never substitutes a
background refetch for the baseline of a dirty editor. Deploy both clients and API together;
older item writers without the baseline receive 400 rather than silently overwriting data.

Student Preview verifies detail and content as a single snapshot. It polls every five
seconds while visible and revalidates on mount, focus, visibility restoration and reconnect,
overriding the application's longer cache lifetime and disabled focus refetch. Failed
visibility/content/network checks replace the snapshot with an unavailable state, clearing
questions, answers, explanations and media. Cached results are not displayed on re-entry
before verification, and unused Preview entries are removed immediately. Detail/content
HTTP responses use `Cache-Control: no-store`; server cache hits still check visibility.
This is polling rather than server push: an open visible page notices remote revocation
on its next check and response.

`tests/practice-access.test.mjs` uses actual editor/Preview components, router and query
client with an isolated adapter. It covers stale saves, local edit retention, confirmed
reload, saving with the fresh baseline, automatic unpublish detection, deletion, denied
content, network failure, cache removal and re-entry without stale content.
