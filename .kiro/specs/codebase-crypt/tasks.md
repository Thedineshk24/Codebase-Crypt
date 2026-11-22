# Codebase Crypt — Tasks

## Task 1: Project scaffold + scoring engine + PBT suite

Set up the Next.js App Router project (latest, v16+) with TypeScript, Tailwind CSS, @xyflow/react, Vitest, and fast-check. Implement `src/lib/scoring.ts` as a pure module. Write the full Vitest + fast-check PBT suite. All tests must pass.

### Sub-tasks

- [-] 1.1 Scaffold Next.js: run `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git` with defaults
- [~] 1.2 Install runtime deps: `npm install @xyflow/react ai @ai-sdk/google jszip zod`
- [~] 1.3 Install dev deps: `npm install -D vitest @vitest/coverage-v8 fast-check @vitejs/plugin-react`
- [~] 1.4 Create `vitest.config.ts` at root (separate from next.config.ts); add `"test": "vitest"` to package.json scripts
- [~] 1.5 Write `src/types/index.ts` — exports `FileMetrics`, `CryptNode`, `CryptData`, `HauntingType`, `HauntingGrade`
- [~] 1.6 Write `src/lib/scoring.ts` — exports `scoreFile()`, `classifyFile()`, `ENTRYPOINT_REGEX`, `computeHauntingGrade()`; formula: `score = round(min(100, max(churnNorm, ageNorm) * 65 + sizeNorm * 35 + min(todoCount * 4, 20)))`
- [~] 1.7 Write `src/lib/scoring.test.ts` — Vitest unit tests covering all four classification branches and edge cases
- [~] 1.8 Write fast-check property tests in `src/lib/scoring.test.ts`: boundedness [0,100], maximum (all-1 inputs → 100), entrypoint immunity (entrypoints never Ghost), monotonicity (increasing any input never decreases score), exhaustiveness (exactly one label per input)
- [~] 1.9 Run `npm test` and confirm 0 failures
- [~] 1.10 Create `.env.example` documenting `GITHUB_TOKEN` and `GEMINI_API_KEY`

## Task 2: GitHub analysis API route

Implement `src/app/api/analyze/route.ts` and `src/lib/github.ts`. Fetches file tree + commit history, scores all nodes, returns `CryptData` JSON cached 15 min.

**Depends on:** Task 1

### Sub-tasks

- [~] 2.1 Write `src/lib/github.ts` — `fetchFileTree(owner, repo)` via Git Trees API, filters to ≤120 source files, returns `{ path, sizeBytes }[]`
- [~] 2.2 Add `fetchCommitHistory(owner, repo, paths[])` to `github.ts` — batched GraphQL aliases (40–50 files/request) when `GITHUB_TOKEN` present; REST fallback otherwise
- [~] 2.3 Implement `GET /api/analyze?owner=&repo=` route — calls `fetchFileTree` + `fetchCommitHistory`, normalizes metrics, runs `scoreFile` + `classifyFile` on all nodes
- [~] 2.4 Add `computeHauntingGrade` call and include in response
- [~] 2.5 Return `Cache-Control: public, s-maxage=900, stale-while-revalidate=300` header
- [~] 2.6 Return structured JSON errors for 404 (not found/private) and 403 (rate limited)

## Task 3: Lazy file body API route + fixture generation

Implement `src/app/api/file/route.ts`. Generate and commit pre-baked fixture JSON for the three demo crypts.

**Depends on:** Task 2

### Sub-tasks

- [~] 3.1 Implement `GET /api/file?owner=&repo=&path=` — fetches `raw.githubusercontent.com/{owner}/{repo}/HEAD/{path}`, returns `{ loc, todoCount, todoLines, imports }`
- [~] 3.2 Write `src/lib/fixtures.ts` — loads pre-baked JSON from `fixtures/` by `owner/repo` key
- [~] 3.3 Generate `fixtures/expressjs-express.json` from a real analyzer run
- [~] 3.4 Generate `fixtures/fastapi-fastapi.json` from a real analyzer run
- [~] 3.5 Generate `fixtures/facebook-react.json` from a real analyzer run
- [~] 3.6 Commit all three fixture files; verify every `CryptNode` has a valid GitHub file URL

## Task 4: Landing page

Build `src/app/page.tsx` — gothic hero, URL input, three Instant Demo Crypt cards.

**Depends on:** Task 3

### Sub-tasks

- [~] 4.1 Build gothic hero layout with `#0B0A10` bg, `#F4F1EA` text, JetBrains Mono for paths
- [~] 4.2 Add GitHub URL input with format validation (enable Summon button only on valid URL)
- [~] 4.3 Add three demo crypt cards loaded from `fixtures.ts` showing repo name, language badge, Haunting Grade, node count
- [~] 4.4 Wire navigation to `/crypt/[owner]/[repo]` on submit and card click
- [~] 4.5 Ensure keyboard accessibility (Enter submits, cards focusable) and WCAG AA contrast (≥4.5:1)
- [~] 4.6 Verify responsive layout at mobile and 1080p

## Task 5: Crypt Map — React Flow canvas + Chamber nodes

Build `src/components/CryptMap.tsx` using `@xyflow/react` v13+.

**Depends on:** Task 3

### Sub-tasks

- [~] 5.1 Set up `<ReactFlow>` canvas with pan, zoom, and `<MiniMap>` — import from `@xyflow/react`
- [~] 5.2 Build Chamber parent node component — gothic stone container styled with `#151320` bg, directory name label
- [~] 5.3 Build Ghost file node — `#00E5FF` cyan glow + CSS float keyframe animation
- [~] 5.4 Build Cursed Relic file node — `#FF6B2B` orange pulse animation
- [~] 5.5 Build Tombstone file node — `#F59E0B` amber badge
- [~] 5.6 Build Healthy file node — `#8B5CF6` violet border
- [~] 5.7 Implement deterministic grid layout: `cols = max(2, ceil(sqrt(n)))`, `chamberWidth = cols * (NODE_W + GAP) + PADDING*2`, chambers tiled left-to-right wrapping at 2400px
- [~] 5.8 Verify nodes never overlap within a chamber

## Task 6: HUD + search + filter

Build `src/components/HUD.tsx`.

**Depends on:** Task 5

### Sub-tasks

- [~] 6.1 Add filter pills: All, Ghosts, Cursed Relics, Tombstones — with live entity counts
- [~] 6.2 Implement real-time filename search that dims non-matching nodes (<16ms per keystroke)
- [~] 6.3 Show overall Haunting Grade badge with gothic label and correct color
- [~] 6.4 Show truncation badge when `CryptData.truncated === true`

## Task 7: Inspector Drawer + Exorcise modal

Build `src/components/InspectorDrawer.tsx` and `src/components/ExorciseModal.tsx`.

**Depends on:** Task 6

### Sub-tasks

- [~] 7.1 Build `InspectorDrawer` — opens on node click, closes on outside click/Escape
- [~] 7.2 Trigger `GET /api/file` on drawer open; display LOC, TODO lines, inbound refs
- [~] 7.3 Add `todo_bonus` to displayed score after lazy fetch
- [~] 7.4 Add GitHub file link (opens new tab)
- [~] 7.5 Add Exorcise button — sends `POST /api/exorcise` with file content + metrics
- [~] 7.6 Build `ExorciseModal` — summoning loader, then three tabs (requirements.md, design.md, tasks.md)
- [~] 7.7 Add copy-to-clipboard button per tab
- [~] 7.8 Add Download ZIP button — `exorcise-<slug>.zip` with correct folder structure via JSZip
- [~] 7.9 Render deterministic fallback spec if LLM call fails

## Task 8: Exorcise API route (Gemini 2.5 Flash)

Implement `src/app/api/exorcise/route.ts`.

**Depends on:** Task 1

### Sub-tasks

- [~] 8.1 Implement `POST /api/exorcise` — accepts `{ owner, repo, path, fileContent, metrics }`
- [~] 8.2 Call `generateObject` from `ai` with `google('gemini-2.5-flash')` from `@ai-sdk/google`
- [~] 8.3 Zod schema: `z.object({ requirements: z.string(), design: z.string(), tasks: z.string() })`
- [~] 8.4 Truncate `fileContent` to 4000 chars in prompt if needed
- [~] 8.5 Enforce 8s timeout via `AbortSignal.timeout(8000)`
- [~] 8.6 Return deterministic EARS-format fallback template on timeout or error

## Task 9: Summoning loader + error card

Build `src/components/SummonLoader.tsx` and `src/components/ErrorCard.tsx`.

**Depends on:** Task 4

### Sub-tasks

- [~] 9.1 Build `SummonLoader` — cycles through: "Unearthing file tree...", "Reading commit spirits...", "Calculating curses...", "Mapping the crypt..."
- [~] 9.2 Build `ErrorCard` — gothic-themed message per error type (not found, private, rate limited)
- [~] 9.3 Show all three demo crypt cards on error screen with one-click navigation

## Task 10: Crypt Explorer page + end-to-end wiring

Build `src/app/crypt/[owner]/[repo]/page.tsx`.

**Depends on:** Task 5, Task 6, Task 7, Task 9

### Sub-tasks

- [~] 10.1 Check fixtures by `owner/repo` — render CryptMap immediately with zero API calls for demo repos
- [~] 10.2 For live repos, show `SummonLoader` while `GET /api/analyze` runs
- [~] 10.3 Pass `CryptData` to `CryptMap` and `HUD`
- [~] 10.4 Wire node click to open `InspectorDrawer` with correct node data
- [~] 10.5 Render `ErrorCard` on API error (404, 403, timeout)
- [~] 10.6 Set page `<title>` to `{owner}/{repo} — Codebase Crypt`
- [~] 10.7 Add `<link rel="canonical">` for shareable URL

## Task 11: End-to-end verification + pre-submission checklist

Verify all P0 acceptance criteria on the live Vercel deployment.

**Depends on:** Task 10

### Sub-tasks

- [~] 11.1 Run `npm test` — confirm 100% pass (unit + PBT)
- [~] 11.2 Verify all three demo crypts load in <500ms (DevTools Network tab)
- [~] 11.3 Verify live repo analysis (expressjs/express) completes in <10s
- [~] 11.4 Verify Exorcise spec generates in <8s with file-specific content
- [~] 11.5 Verify WCAG AA contrast on landing page and Inspector Drawer
- [~] 11.6 Verify `/crypt/expressjs/express` shareable URL works for a cold visitor (CDN cache hit)
- [~] 11.7 Confirm `.kiro/` is tracked in Git and not in `.gitignore`
- [~] 11.8 Confirm `.env.example` documents `GITHUB_TOKEN` and `GEMINI_API_KEY`
- [~] 11.9 Confirm Vercel deployment URL is live and all three demo flows work end-to-end
