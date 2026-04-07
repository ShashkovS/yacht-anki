# Yacht Racing Anki Trainer -- Phased Implementation Plan

## Overview

Transform the existing template PWA (aiohttp + React/Vite/TypeScript + SQLite) into a spaced-repetition training app for yacht racing on the Fareast 28R. The existing auth infrastructure, testing setup, Docker config, and PWA shell are retained. Template-specific code (notes feature, template branding) is removed and replaced with sailing-specific modules.

---

## Database Schema (Medium Detail)

All new tables use `STRICT`, `foreign_keys = ON`, timestamps as UTC ISO text strings -- matching the existing convention in migrations 001-003.

### `decks`
- `id INTEGER PRIMARY KEY`
- `owner_id INTEGER` -- NULL for global/built-in decks, FK to users(id) for user-created
- `name TEXT NOT NULL`
- `description TEXT NOT NULL DEFAULT ''`
- `language TEXT NOT NULL DEFAULT 'ru'`
- `is_builtin INTEGER NOT NULL CHECK (is_builtin IN (0, 1))` -- seed decks are builtin
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`

### `cards`
- `id INTEGER PRIMARY KEY`
- `deck_id INTEGER NOT NULL` FK decks(id) ON DELETE CASCADE
- `template TEXT NOT NULL` -- enum-like: 'term_definition', 'directional', 'trim', 'manoeuvre', 'right_of_way'
- `front_text TEXT NOT NULL`
- `back_text TEXT NOT NULL`
- `diagram_spec TEXT NOT NULL DEFAULT '{}'` -- JSON blob (DiagramSpec)
- `tags TEXT NOT NULL DEFAULT '[]'` -- JSON array of strings
- `sort_order INTEGER NOT NULL DEFAULT 0`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`

### `card_states` (per-user FSRS scheduling state)
- `id INTEGER PRIMARY KEY`
- `user_id INTEGER NOT NULL` FK users(id) ON DELETE CASCADE
- `card_id INTEGER NOT NULL` FK cards(id) ON DELETE CASCADE
- `fsrs_difficulty REAL NOT NULL`
- `fsrs_stability REAL NOT NULL`
- `fsrs_state TEXT NOT NULL` -- 'new', 'learning', 'review', 'relearning'
- `fsrs_reps INTEGER NOT NULL DEFAULT 0`
- `fsrs_lapses INTEGER NOT NULL DEFAULT 0`
- `due_at TEXT NOT NULL` -- UTC ISO timestamp
- `last_review_at TEXT` -- NULL if never reviewed
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`
- UNIQUE(user_id, card_id)

### `review_log` (immutable append-only log)
- `id INTEGER PRIMARY KEY`
- `user_id INTEGER NOT NULL` FK users(id) ON DELETE CASCADE
- `card_id INTEGER NOT NULL` FK cards(id) ON DELETE CASCADE
- `rating INTEGER NOT NULL` -- 1=Again, 2=Hard, 3=Good, 4=Easy
- `elapsed_ms INTEGER NOT NULL` -- time from card shown to rating pressed
- `reviewed_at TEXT NOT NULL`
- `scheduled_days REAL NOT NULL` -- interval assigned by FSRS after this review
- `fsrs_state_snapshot TEXT NOT NULL DEFAULT '{}'` -- JSON snapshot of FSRS state after review

### `user_settings`
- `user_id INTEGER PRIMARY KEY` FK users(id) ON DELETE CASCADE
- `desired_retention REAL NOT NULL DEFAULT 0.9`
- `daily_new_limit INTEGER NOT NULL DEFAULT 10`
- `daily_review_limit INTEGER NOT NULL DEFAULT 200`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`

---

## Phase 01 -- Foundation: Cleanup and New Dependencies

**Goal:** Remove template-specific code, install new dependencies, establish the new project identity, and create the empty database schema.

### Backend
- Remove `backend/db/notes.py`, `backend/migrations/003_create_notes.py`, notes-related routes from `backend/http/routes.py`, and `backend/tests/test_notes.py`
- Remove or gut the WebSocket hub (`backend/ws/`) -- not needed for SRS cards initially; can be re-added later for live sync
- Rename cookie names and project name in `backend/config.py` (template_access -> sail_access, etc.)
- Add new yoyo migrations (004-008):
  - 004_create_decks.py
  - 005_create_cards.py
  - 006_create_card_states.py
  - 007_create_review_log.py
  - 008_create_user_settings.py
- Update `backend/db/seed.py` to create default user_settings row on dev seed

### Frontend
- `npm install react-konva konva ts-fsrs`
- Remove `src/features/notes/` directory
- Remove NotesPanel from DashboardPage
- Update `vite.config.ts` PWA manifest (name: "SailMaster", short_name: "SailMaster", etc.)
- Update Layout in App.tsx: rebrand header, update nav links placeholder for future pages (Review, Decks, Stats, Settings)
- Update `frontend/src/shared/types.ts`: remove Note type, add Deck/Card/CardState/ReviewLog/UserSettings types

### Tests
- Remove `backend/tests/test_notes.py`, `backend/tests/test_ws.py`
- Update e2e auth test to reflect new page names
- Run `make test` -- all remaining tests must pass

### Deliverable
Clean repo with new schema tables created on startup, no notes feature, new branding, and passing test suite.

---

## Phase 02 -- Core Backend API: Decks, Cards, Card States

**Goal:** Build the CRUD API for decks and cards, plus the card_states and user_settings endpoints. All POST-based per existing convention.

### Backend routes (new files)
- `backend/db/decks.py` -- list_decks, get_deck, create_deck, update_deck, delete_deck
- `backend/db/cards.py` -- list_cards_for_deck, get_card, create_card, update_card, delete_card, count_cards_by_deck
- `backend/db/card_states.py` -- get_or_create_state, update_state, list_due_cards, count_due_cards, count_new_cards
- `backend/db/review_log.py` -- create_review_log, list_reviews_for_user (with date range)
- `backend/db/user_settings.py` -- get_settings, upsert_settings
- `backend/http/decks_routes.py` -- wire deck and card endpoints, register in main.py via setup_deck_routes
- `backend/http/review_routes.py` -- placeholder for review submission (wired in Phase 03)

### API endpoints (all POST, JSON envelope)
- `/decks/list` -- list all decks visible to user (builtin + own)
- `/decks/create` -- create user deck
- `/decks/update` -- update own deck
- `/decks/delete` -- delete own deck (cannot delete builtin)
- `/cards/list` -- list cards for a deck_id
- `/cards/get` -- get single card with diagram_spec
- `/cards/create` -- create card in own deck
- `/cards/update` -- update card
- `/cards/delete` -- delete card
- `/settings/get` -- get user_settings (create default if missing)
- `/settings/update` -- update user_settings

### Tests
- `backend/tests/test_decks.py` -- CRUD tests, permission checks (cannot edit builtin)
- `backend/tests/test_cards.py` -- CRUD tests, cascade delete
- `backend/tests/test_user_settings.py`
- All tests green via `make test`

### Deliverable
Fully tested deck/card/settings CRUD API. No frontend changes yet.

---

## Phase 03 -- FSRS Integration: Review API

**Goal:** Integrate ts-fsrs on the backend (actually: the FSRS computation happens on the frontend in TypeScript, but the backend stores state). Build the review submission and queue-fetching API.

### Architecture Decision: Where FSRS Runs
- FSRS computation runs on the **frontend** using `ts-fsrs` library. This enables offline review sessions without backend calls.
- The backend stores card_states and review_log, and provides the "due cards" queue endpoint.
- On review completion, the frontend sends the computed new FSRS state + rating to the backend for persistence.

### Backend
- `/review/queue` -- return due cards for user, respecting daily_new_limit and daily_review_limit from user_settings. Returns cards joined with their card_state (or marks as "new" if no state exists). Ordered: learning first, then review by due_at, then new cards.
- `/review/submit` -- accept card_id, rating, elapsed_ms, new FSRS state fields (difficulty, stability, state, reps, lapses, due_at, scheduled_days). Create/update card_state and append to review_log. Validate rating in [1,4].
- `/review/summary` -- return counts: due_today, new_today, reviewed_today (for the dashboard)
- `backend/db/card_states.py` -- implement get_or_create_state, bulk_get_states, update_state_after_review
- `backend/db/review_log.py` -- implement create_log_entry, count_reviews_today

### Frontend (library setup only, no UI yet)
- Create `src/shared/fsrs.ts` -- wrapper around ts-fsrs:
  - `createScheduler(desiredRetention)` -- returns configured FSRS instance
  - `computeNextState(currentFsrsCard, rating)` -- returns new card state + scheduled info
  - `cardStateToFsrsCard(cardState)` -- converts backend card_state row to ts-fsrs Card object
- Unit tests for `fsrs.ts` with deterministic timestamps

### Tests
- `backend/tests/test_review.py` -- queue ordering, submit validation, daily limit enforcement, summary counts
- `frontend/src/shared/fsrs.test.ts` -- scheduling determinism, all four ratings, new vs review cards

### Deliverable
Working review API. Frontend FSRS wrapper tested. No review UI yet.

---

## Phase 04 -- Visualization Engine: react-konva Diagram Renderer

**Goal:** Build the reusable 2D diagram component that renders boats, wind, sails, marks, and zones from a DiagramSpec JSON object.

### Frontend components (new directory: `src/features/diagram/`)
- `DiagramStage.tsx` -- top-level `<Stage>` + `<Layer>` with responsive sizing (fills parent, maintains aspect ratio). Accepts DiagramSpec as prop.
- `WindArrow.tsx` -- renders the true wind direction arrow at the top of the stage. Takes `twdDeg` as prop.
- `BoatShape.tsx` -- renders a single boat as a `<Group>`:
  - Hull as `<Path>` (simplified Fareast 28R top-down outline)
  - Mainsail as `<Line>` / `<Path>` with configurable boom angle relative to hull centerline
  - Jib as `<Line>` forward of mast
  - Gennaker as `<Path>` (balloon shape from bowsprit) -- shown/hidden by flag
  - Color coding: green border for starboard tack, red for port tack
  - Rotation by heading angle
- `MarkBuoy.tsx` -- renders a circular mark with optional dashed `<Circle>` for the 3-hull-length zone
- `OverlapIndicator.tsx` -- renders overlap/clear-ahead/clear-astern visual lines between two boats
- `diagramHelpers.ts` -- geometry utility functions:
  - `normalizeAngle(deg)` -- keep in 0-359
  - `computeTack(heading, twd)` -- returns 'port' | 'starboard' | 'head_to_wind'
  - `computeBoomAngle(heading, twd, template)` -- auto-computes boom angle from wind angle
  - `computeApparentWind(twdDeg, twsKnots, boatSpeedKnots, headingDeg)` -- vector sum (optional display)

### Design constraints
- The component is pure/stateless: it renders exactly what DiagramSpec describes
- Interactive handles (drag-to-rotate) are NOT in this phase -- added in Phase 05
- Mobile-friendly: the Stage auto-sizes to container width with a fixed aspect ratio (e.g., 4:3)
- All angles in degrees, 0 = north/up, clockwise

### Tests
- `src/features/diagram/diagramHelpers.test.ts` -- geometry functions (angle normalization, tack computation, boom angle logic)
- `src/features/diagram/DiagramStage.test.tsx` -- renders without crashing for each card template type, correct number of boat groups
- Manual visual QA: create a temporary /diagram-test page with hardcoded DiagramSpec examples (one per card type)

### Deliverable
Reusable `<DiagramStage spec={...} />` component that procedurally renders any sailing scenario from JSON. Tested geometry helpers. Visually verified in browser.

---

## Phase 05 -- Review Flow UI

**Goal:** Build the complete review session user interface: queue loading, card display with diagram, show/hide answer, rating buttons, progress indicator, and session completion screen.

### Frontend pages and components
- `src/pages/ReviewPage.tsx` -- the main review session page:
  - On mount: fetch `/review/queue` to load due cards
  - Display card count and progress bar (e.g., "5 / 20")
  - For each card:
    1. Show front: DiagramStage + frontText + "Show Answer" button
    2. On "Show Answer": reveal backText + explanation + optional diagram animation/change
    3. Show rating buttons: Again (red) / Hard (orange) / Good (green) / Easy (blue)
    4. On rating: call FSRS computeNextState locally, POST to `/review/submit`, advance to next card
  - On session complete: show summary (reviewed count, again count, average time)
  - Handle empty queue: "Nothing due! Come back later." message with next due time
- `src/pages/DashboardPage.tsx` -- replace current notes dashboard:
  - Show review summary (due today, new today, reviewed today) from `/review/summary`
  - "Start Review" button linking to /review
  - Quick deck list with card counts
- `src/pages/DecksPage.tsx` -- deck browser:
  - List all decks with card counts and "due" badge
  - Tap deck to see card list
  - Create/edit/delete own decks (forms)
- `src/pages/CardListPage.tsx` -- card list within a deck:
  - Shows all cards with template type icon, front text preview, and state badge (new/learning/review)
  - Create/edit card (admin or own deck only)
- Update `App.tsx` routes: /review, /decks, /decks/:id, keep /login, /dashboard (default after auth), /settings (Phase 07)

### Card display logic per template
- `term_definition`: DiagramStage showing boat/wind + frontText as term. Back shows definition, English equivalent, synonyms.
- `directional`: DiagramStage with interactive rotation handle (user drags boat nose). Validate answer angle range.
- `trim`: DiagramStage showing current wind/boat. Question asks what to do with sails. Multiple choice or text answer.
- `manoeuvre`: DiagramStage with "before" state. Back shows step list. Optional: animate to "after" state.
- `right_of_way`: DiagramStage with two boats + wind + optional mark. User taps which boat must keep clear. Back shows rule reference.

### Interactive diagram additions (extends Phase 04)
- `BoatDragHandle.tsx` -- for directional cards: a draggable arc handle around the boat that lets the user set heading
- `TapTarget.tsx` -- for right_of_way cards: makes each boat tappable, highlights selection

### Tests
- `src/pages/ReviewPage.test.tsx` -- mocked API, renders card, show answer flow, rating submission
- `src/pages/DecksPage.test.tsx` -- renders deck list, create deck form
- E2e test: `tests/e2e/review.spec.ts` -- login, start review, answer one card, complete session
- E2e test: `tests/e2e/decks.spec.ts` -- login, view decks, create deck, add card

### Deliverable
Fully functional review loop in the browser. User can log in, see due cards, answer them with diagrams, rate, and see updated schedule. Deck browsing works.

---

## Phase 06 -- Seed Content: Sailing Card Decks

**Goal:** Populate the app with real sailing training content from the research documents. Create three seed decks loaded on first run.

### Seed decks (loaded by backend seed.py in dev mode, or by a management command for prod)

#### Deck 1: "Терминология яхтинга" (Glossary, ~30 cards)
Template: term_definition
Content from v1.md and v2.md terminology sections:
- Wind and courses: левентик, бейдевинд (крутой/полный), галфвинд, бакштаг, фордевинд, лавировка, истинный/вымпельный ветер
- Spatial: наветренный, подветренный, чисто впереди, чисто позади, связанность
- Rigging controls: грот-шкот, каретка/погон, оттяжка гика, ахтерштаг, каннингхэм, аутхаул, бушприт
- Actions: выбрать/набить, потравить, заполаскивает/лопочет, колдунчики
- Each card has: Russian term front, back with definition + English equivalent + diagram showing the concept

#### Deck 2: "Манёвры" (Manoeuvres, ~15 cards)
Templates: directional, trim, manoeuvre
Content:
- Приводиться / heading up (directional + trim)
- Уваливаться / bearing away (directional + trim)
- Оверштаг / tacking (manoeuvre steps)
- Поворот через фордевинд / gybing (manoeuvre steps)
- Постановка/уборка генакера (manoeuvre)
- Trim questions: "wind freshens on close haul -- what do you do with mainsheet/traveller/backstay?"
- Each card has realistic DiagramSpec with boat heading, wind direction, sail angles

#### Deck 3: "Правила расхождения (ППГ)" (RRS Basics, ~20 cards)
Template: right_of_way
Content from v1.md and v2.md RRS sections:
- Rule 10: opposite tacks (3-4 scenario variations)
- Rule 11: same tack overlapped (3-4 variations)
- Rule 12: same tack not overlapped (2-3 variations)
- Rule 13: while tacking (2 variations)
- Rule 14/15/16: right-of-way limitations (2-3 cards)
- Rule 18: mark room scenarios with zone visualization (3-4 variations)
- Each card has two boats with realistic headings/positions, wind arrow, and correct answer encoded

### Implementation
- `backend/db/seed_decks.py` -- new file with functions to create seed decks and cards
- Each deck/card defined as Python dicts with all fields including diagram_spec JSON
- `backend/db/seed.py` -- call seed_decks in dev mode, skip if decks already exist (idempotent)
- DiagramSpec values based on realistic angles from the research docs (e.g., close-hauled at ~42 degrees TWA for FA28R)

### Tests
- `backend/tests/test_seed_decks.py` -- verify seed creates expected deck/card counts, idempotent on re-run
- Manual visual QA: review each seed card in browser, verify diagram renders correctly

### Deliverable
App starts with ~65 real sailing training cards across 3 decks. A new user can immediately begin reviewing.

---

## Phase 07 -- Statistics and Settings Pages

**Goal:** Build the statistics dashboard and user settings page.

### Frontend pages
- `src/pages/StatsPage.tsx`:
  - Daily reviews bar chart (last 30 days) -- built with plain SVG or a lightweight chart (recharts or just canvas)
  - Per-deck retention estimate (computed from review_log: fraction of non-Again ratings in last N reviews)
  - "Hardest cards" list: cards sorted by Again-rate descending (top 10)
  - Total cards: new / learning / review / relearning breakdown
  - Average review time
  - Optional: heatmap calendar (reviews per day, colored cells)
- `src/pages/SettingsPage.tsx`:
  - Desired retention slider (0.7 -- 0.97, default 0.9)
  - Daily new card limit (number input)
  - Daily review limit (number input)
  - Save button (POST /settings/update)
  - Account info (username, created_at)

### Backend
- `/stats/overview` -- return aggregated stats: reviews_by_day (last 30), cards_by_state, hardest_cards, retention_by_deck
- `/stats/overview` queries review_log with GROUP BY date, card_states with GROUP BY fsrs_state, etc.
- `backend/db/stats.py` -- query functions for statistics aggregation
- `backend/http/stats_routes.py` -- register stats endpoints

### Tests
- `backend/tests/test_stats.py` -- verify stats queries with known review_log data
- `src/pages/StatsPage.test.tsx` -- renders with mocked data
- `src/pages/SettingsPage.test.tsx` -- form interaction, save

### Deliverable
Users can view their learning progress and tune FSRS parameters. All routes registered in App.tsx.

---

## Phase 08 -- Polish, PWA Optimization, and Offline Support

**Goal:** Harden the PWA for offline use, polish the UI/UX, and ensure production readiness.

### PWA / Offline
- Configure vite-plugin-pwa service worker with workbox strategies:
  - App shell: CacheFirst
  - API calls: NetworkFirst with offline fallback
  - Seed deck data: pre-cache at install time OR cache on first fetch
- Implement offline review flow:
  - On app start (or when online), fetch and cache the review queue + card data in IndexedDB or localStorage
  - During offline review, store review results in a local queue
  - On reconnect, sync pending reviews to backend via `/review/submit` (batch endpoint)
- `/review/submit-batch` -- new backend endpoint accepting an array of review results
- Add install prompt UI ("Add to Home Screen" banner)
- Update PWA icons to sailing-themed SVGs

### UI/UX Polish
- Mobile-first responsive review layout: diagram fills top half, text + buttons fill bottom
- Touch-friendly rating buttons (large tap targets, min 48px)
- Swipe gestures (optional): swipe up for "Show Answer"
- Loading states and error states for all pages
- Smooth transitions between cards (fade or slide)
- Dark mode support (optional, Tailwind dark: prefix)

### Import/Export
- `/decks/export` -- export all user's decks + cards + progress as JSON
- `/decks/import` -- import JSON, handle ID collisions by creating new IDs
- Frontend: Export/Import buttons on DecksPage with file picker and preview

### Docker / Deployment
- Update docker-compose.yml service names
- Update Makefile project name from templatepwa to sailmaster
- Update README.md with project description and setup instructions
- Verify production build works: `make front-docker && make back-docker`

### Final Testing
- Full `make test` suite green
- Manual offline testing: airplane mode, review cards, reconnect and sync
- PWA install test on iOS Safari and Android Chrome
- E2e test: `tests/e2e/offline.spec.ts` (if feasible with Playwright service worker support)

### Deliverable
Production-ready PWA that works offline, installable on mobile, with polished UI and complete test coverage.

---

## docs/AGENTS.md Design

The top-level `docs/AGENTS.md` file should provide instructions for how development proceeds across all phases. Content:

1. **Phase Execution Order** -- phases must be done sequentially (01 through 08). Each phase is self-contained and must pass `make test` before moving on.

2. **Development Workflow Per Phase**:
   - Read the phase doc (docs/phases/phaseNN.md)
   - Implement backend changes first (migrations, db modules, routes, backend tests)
   - Implement frontend changes second (types, components, pages, frontend tests)
   - Run `make test` -- all tests must pass
   - Verify in live browser session for any UI/auth/cookie changes
   - Update phase doc with any deviations or notes

3. **Existing Conventions to Follow** (inherited from template AGENTS.md files):
   - Backend: plain aiohttp functions, SQL in backend/db/, POST-based JSON envelope
   - Frontend: plain React state (no state manager libraries), Tailwind CSS, postJson for API calls
   - DB: yoyo migrations, STRICT tables, UTC ISO timestamps
   - Tests: pytest backend, vitest frontend unit, playwright e2e
   - File headers: docstrings/comments explaining what file does
   - Dependencies: `uv add` for Python, `npm install` for frontend

4. **Key Decision: FSRS on Frontend**
   - ts-fsrs runs in the browser, not on the backend
   - Backend is a persistence layer for card_states and review_log
   - This enables offline review without backend connectivity

5. **Key Decision: No Zustand**
   - Per existing frontend AGENTS.md: "Do not add state managers"
   - Use React state + context for review session state
   - Keep it simple and explicit

6. **Seed Content Notes**
   - Seed decks are created by backend on dev startup
   - For production, run seed via management command or migration
   - DiagramSpec JSON must match the DiagramStage component's expected shape

---

## Phase File Structure

```
docs/
  AGENTS.md          -- development process instructions
  phases/
    phase01.md       -- Foundation: Cleanup and New Dependencies
    phase02.md       -- Core Backend API
    phase03.md       -- FSRS Integration
    phase04.md       -- Visualization Engine
    phase05.md       -- Review Flow UI
    phase06.md       -- Seed Content
    phase07.md       -- Statistics and Settings
    phase08.md       -- Polish, PWA, Offline
  v1.md              -- (existing research doc)
  v2.md              -- (existing research doc)
```

Each phaseNN.md contains:
- Phase title and goal
- Prerequisite: previous phase completed and tests passing
- Detailed task list (backend, frontend, tests)
- Acceptance criteria
- Files to create/modify
- Dependencies to install (if any)

---

## Dependency Summary

### Phase 01 -- Frontend
- `npm install react-konva konva ts-fsrs`

### Phase 07 -- Frontend (optional)
- `npm install recharts` (or build charts with plain SVG)

### No backend Python dependencies needed beyond what exists
- aiohttp, aiosqlite, argon2-cffi, itsdangerous, yoyo-migrations -- all sufficient

---

## Risk Notes

1. **react-konva Canvas + vitest/jsdom**: Canvas rendering in jsdom is limited. Diagram component unit tests should test structure/props, not pixel output. Use e2e tests for visual verification.

2. **FSRS offline queue**: If the user reviews offline and then reviews the same cards online on another device before syncing, there will be conflicts. For the MVP, single-device usage is assumed. Multi-device sync is a future enhancement.

3. **Seed content volume**: ~65 cards is a good starting set. The v1.md and v2.md docs contain enough material to fill all three decks. Additional cards can be added incrementally after Phase 06.

4. **DiagramSpec schema evolution**: The JSON blob in the cards table will evolve as the diagram engine matures. Use a version field in DiagramSpec if needed, but for MVP a single shape is sufficient.
