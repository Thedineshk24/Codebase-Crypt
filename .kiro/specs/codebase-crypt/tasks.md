# Codebase Crypt — Tasks

## Task 1: Project scaffold + scoring engine + PBT suite
**Blocked by:** None (can start immediately)

Set up the Next.js App Router project (latest, currently v16) with TypeScript, Tailwind CSS, React Flow (@xyflow/react), Vitest, and fast-check. Implement `src/lib/scoring.ts` as a pure module (`scoreFile`, `classifyFile`, entrypoint regex). Write the full Vitest + fast-check test suite covering boundedness, maximum, entrypoint immunity, monotonicity, and exhaustiveness. All tests must pass.

- [ ] Scaffold with `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git` (answer all prompts with defaults)
- [ ] Install runtime deps: `npm install @xyflow/react ai @ai-sdk/google jszip zod`
- [ ] Install dev deps: `npm install -D vitest @vitest/coverage-v8 fast-check @vitejs/plugin-react`
- [ ] Create `vitest.config.ts` at root (do NOT put vitest config inside next.config.ts)
- [ ] `src/types/index.ts` defines `FileMetrics`, `CryptNode`, `CryptData`, `HauntingType`, `HauntingGrade`
- [ ] `src/lib/scoring.ts` exports `scoreFile()`, `classifyFile()`, `ENTRYPOINT_REGEX`, `computeHauntingGrade()`
- [ ] Vitest unit tests in `src/lib/scoring.test.ts`: all classification branches, edge cases
- [ ] fast-check property tests: boundedness, maximum, entrypoint immunity, monotonicity, exhaustiveness
- [ ] `npm test` passes with 0 failures
- [ ] `.env.example` documents `GITHUB_TOKEN` and `GEMINI_API_KEY`

## Task 2: GitHub analysis API route
**Blocked by:** Task 1

Implement `src/app/api/analyze/route.ts`. Accepts `GET ?owner=&repo=`. Fetches the file tree via Git Trees API, filters to ≤ 120 source files. With `GITHUB_TOKEN`: runs 2–3 batched GraphQL requests for per-file commit history. Without token: REST fallback. Runs scoring engine on all nodes. Returns `CryptData` JSON with `Cache-Control: public, s-maxage=900, stale-while-revalidate=300`.

- [ ] Git Trees API call with source file filtering (excludes `node_modules`, `vendor`, binary extensions)
- [ ] 120-file cap with truncation flag
- [ ] GraphQL batching (40–50 files per request, field aliases) when `GITHUB_TOKEN` present
- [ ] REST fallback path when no token
- [ ] `scoreFile` + `classifyFile` applied to all nodes
- [ ] `computeHauntingGrade` applied to full node set
- [ ] Response cached with correct `Cache-Control` header
- [ ] 404/403 error responses with structured JSON error shape
- [ ] `src/lib/github.ts` extracted module for all GitHub API logic

## Task 3: Lazy file body API route + fixture generation
**Blocked by:** Task 2

Implement `src/app/api/file/route.ts` for lazy per-file fetching. Fetches `raw.githubusercontent.com` for the file body, parses LOC, TODO/FIXME count, and import statements. Run the live analyzer against `expressjs/express`, `fastapi/fastapi`, and `facebook/react` and commit the results as fixture JSON files.

- [ ] `GET /api/file?owner=&repo=&path=` fetches raw file body from `raw.githubusercontent.com` (no rate-limit cost)
- [ ] Returns `{ loc, todoCount, todoLines, imports }`
- [ ] `src/lib/fixtures.ts` loads pre-baked JSON by `owner/repo` key
- [ ] All three fixture files generated from real analyzer runs and committed under `fixtures/`
- [ ] Every `CryptNode` in fixtures has a valid, resolvable GitHub file URL

## Task 4: Landing page
**Blocked by:** Task 3

Build `src/app/page.tsx`. Dark gothic hero with GitHub URL input + Summon Crypt button. Three Instant Demo Crypt cards (express, fastapi, react) with repo name, language badge, Haunting Grade, and node count. Navigates to `/crypt/[owner]/[repo]` on submit or card click.

- [ ] URL input validates GitHub URL format before enabling Summon button
- [ ] Three demo cards load from `fixtures.ts` with Haunting Grade badge
- [ ] Keyboard-accessible (Enter submits, cards focusable)
- [ ] WCAG AA contrast on all text (≥ 4.5:1)
- [ ] Responsive layout (mobile + 1080p)
- [ ] Design tokens applied (`#0B0A10` bg, `#F4F1EA` text, JetBrains Mono for paths)

## Task 5: Crypt Map (React Flow canvas + Chamber nodes)
**Blocked by:** Task 3

Build `src/components/CryptMap.tsx` using `@xyflow/react` (v13+). React Flow canvas with pan/zoom/minimap. Chamber parent nodes per top-level directory using the deterministic grid layout algorithm. Custom node components per `HauntingType` with correct glow colors. Edges from directory hierarchy.

- [ ] Import from `@xyflow/react`, not the old `reactflow` package
- [ ] Chamber (parent) node component styled as gothic stone container with directory label
- [ ] File node components: Ghost (cyan glow + float animation), Cursed Relic (orange pulse), Tombstone (amber badge), Healthy (violet)
- [ ] Deterministic grid layout: `chamberWidth`, `chamberHeight` computed from child count
- [ ] Chambers tiled left-to-right, wrapping at 2400px canvas width
- [ ] Pan, zoom, minimap enabled
- [ ] Nodes never overlap within a chamber

## Task 6: HUD + search + filter
**Blocked by:** Task 5

Build `src/components/HUD.tsx`. Filter pills (All, Ghosts, Cursed Relics, Tombstones) with entity counts. Filename search with real-time node dimming. Haunting Grade badge. Truncation badge if repo was capped.

- [ ] Filter pills update active state and dim non-matching nodes smoothly
- [ ] Search input dims non-matching nodes in real time (< 16ms per keystroke)
- [ ] Haunting Grade displayed with correct gothic label and color
- [ ] Entity counts update when filter changes
- [ ] Truncation badge visible when `CryptData.truncated === true`

## Task 7: Inspector Drawer + Exorcise modal
**Blocked by:** Task 6

Build `src/components/InspectorDrawer.tsx` and `src/components/ExorciseModal.tsx`. Drawer opens on node click, triggers lazy file fetch, shows all metrics. Exorcise button opens modal, calls `/api/exorcise`, renders tabbed spec files, copy + ZIP download.

- [ ] Drawer opens on node click, closes on outside click / Escape
- [ ] Lazy file fetch on drawer open: LOC, TODO count + lines, inbound refs shown
- [ ] `todo_bonus` added to displayed score after fetch
- [ ] GitHub file link opens in new tab
- [ ] Exorcise button triggers `POST /api/exorcise` with file content + metrics
- [ ] Modal shows summoning loader, then three tabs: requirements.md, design.md, tasks.md
- [ ] Copy button per tab (clipboard API)
- [ ] Download ZIP button: `exorcise-<slug>.zip` containing all three files in correct folder structure
- [ ] Deterministic fallback spec rendered if LLM call fails

## Task 8: Exorcise API route (Gemini 2.5 Flash)
**Blocked by:** Task 1

Implement `src/app/api/exorcise/route.ts`. Accepts `POST` with `{ owner, repo, path, fileContent, metrics }`. Calls Gemini 2.5 Flash via Vercel AI SDK `generateObject` with Zod schema. 8s timeout. Falls back to deterministic template on failure.

- [ ] Use `@ai-sdk/google` (v4+) and `ai` (v7+) — import `generateObject` from `ai`, `google` from `@ai-sdk/google`
- [ ] Zod schema: `z.object({ requirements: z.string(), design: z.string(), tasks: z.string() })`
- [ ] Model: `google('gemini-2.5-flash')`
- [ ] Prompt includes file path, content (truncated to 4000 chars if needed), and all metrics
- [ ] 8-second timeout enforced via `AbortSignal.timeout(8000)`
- [ ] Deterministic fallback template produces valid EARS-format requirements.md, design.md, tasks.md
- [ ] `GEMINI_API_KEY` env var documented in `.env.example`

## Task 9: Summoning loader + error card
**Blocked by:** Task 4

Build `src/components/SummonLoader.tsx` and `src/components/ErrorCard.tsx`. Loader shows atmospheric progress messages. Error card handles 404, 403, timeout with gothic prose and all three demo crypt cards.

- [ ] Loader cycles through: "Unearthing file tree...", "Reading commit spirits...", "Calculating curses...", "Mapping the crypt..."
- [ ] Error card displays themed message per error type (not found, private, rate limited)
- [ ] All three demo crypt cards shown on error screen
- [ ] One-click navigation from error card to any demo crypt

## Task 10: Crypt Explorer page + end-to-end wiring
**Blocked by:** Tasks 5, 6, 7, 9

Build `src/app/crypt/[owner]/[repo]/page.tsx`. Wires together the full flow: check fixtures → show demo immediately, or show SummonLoader while calling `/api/analyze`, then render CryptMap + HUD + InspectorDrawer. Handle errors with ErrorCard.

- [ ] Demo crypts load from fixtures with zero API calls
- [ ] Live repos show SummonLoader while `/api/analyze` runs
- [ ] `CryptData` passed to `CryptMap` and `HUD`
- [ ] Node click opens `InspectorDrawer` with correct node data
- [ ] Error from API renders `ErrorCard`
- [ ] Page title is `{owner}/{repo} — Codebase Crypt`
- [ ] `<link rel="canonical">` set for shareable URL SEO

## Task 11: End-to-end verification + pre-submission checklist
**Blocked by:** Task 10

Verify all P0 acceptance criteria against the live Vercel deployment. Run the full test suite. Generate final fixture files from real analyzer runs. Record the 3-minute demo video.

- [ ] `npm test` passes 100% (unit + property-based)
- [ ] All three demo crypts load in < 500ms (measured in DevTools)
- [ ] Live repo analysis (expressjs/express) completes in < 10s
- [ ] Exorcise spec generates in < 8s and contains file-specific content
- [ ] WCAG AA contrast verified on landing page and Inspector Drawer
- [ ] `/crypt/expressjs/express` shareable URL works for a fresh visitor (cached response)
- [ ] `.kiro/` is tracked in Git, not in `.gitignore`
- [ ] `.env.example` documents `GITHUB_TOKEN` and `GEMINI_API_KEY`
- [ ] Vercel deployment URL is live and all three demo flows work end-to-end
