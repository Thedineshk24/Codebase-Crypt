# Codebase Crypt — Tasks

## Task 1: Project scaffold + scoring engine + PBT suite

Set up the Next.js App Router project (v16+) with TypeScript, Tailwind v4, @xyflow/react, Vitest, fast-check, and shadcn/ui.

- [x] 1.1: Scaffold Next.js App Router project with TypeScript, Tailwind, ESLint, src dir
- [x] 1.2: Install runtime deps (@xyflow/react, ai, @ai-sdk/google, jszip, zod)
- [x] 1.3: Install dev deps (vitest, @vitest/coverage-v8, fast-check, @vitejs/plugin-react)
- [x] 1.4: Create vitest.config.ts at root; add test script to package.json
- [x] 1.5: Write src/types/index.ts with FileMetrics, CryptNode, CryptData, HauntingType, HauntingGrade
- [x] 1.6: Write src/lib/scoring.ts with scoreFile, classifyFile, ENTRYPOINT_REGEX, computeHauntingGrade
- [x] 1.7: Write Vitest unit tests in src/lib/scoring.test.ts covering all classification branches
- [x] 1.8: Write fast-check property tests (boundedness, maximum, entrypoint immunity, monotonicity, exhaustiveness)
- [x] 1.9: Run npm test and confirm 0 failures
- [x] 1.10: Create .env.example documenting GITHUB_TOKEN and GEMINI_API_KEY

## Task 2: GitHub analysis API route

Implement src/app/api/analyze/route.ts and src/lib/github.ts.

**Depends on:** Task 1

- [x] 2.1: Write src/lib/github.ts with fetchFileTree (Git Trees API, filters to 120 source files)
- [x] 2.2: Add fetchCommitHistory to github.ts with batched GraphQL aliases when GITHUB_TOKEN present, REST fallback otherwise
- [x] 2.3: Implement GET /api/analyze?owner=&repo= route calling fetchFileTree + fetchCommitHistory, normalizing metrics, scoring all nodes
- [x] 2.4: Add computeHauntingGrade call and include hauntingGrade in response
- [x] 2.5: Add export const revalidate = 900 and Cache-Control header to analyze route
- [x] 2.6: Return structured JSON errors for 404 and 403 responses from GitHub

## Task 3: Lazy file body API route and fixture generation

Implement the lazy file fetch route and generate pre-baked fixture JSON for three demo repos.

**Depends on:** Task 2

- [ ] 3.1: Implement GET /api/file?owner=&repo=&path= fetching raw.githubusercontent.com, returning loc/todoCount/todoLines/imports
- [ ] 3.2: Write src/lib/fixtures.ts loading pre-baked JSON from fixtures/ by owner/repo key
- [ ] 3.3: Generate fixtures/expressjs-express.json from real analyzer run
- [ ] 3.4: Generate fixtures/fastapi-fastapi.json from real analyzer run
- [ ] 3.5: Generate fixtures/facebook-react.json from real analyzer run
- [ ] 3.6: Commit all three fixture files and verify every CryptNode has a valid GitHub file URL

## Task 4: Landing page

Build src/app/page.tsx. Install shadcn Button, Card, Badge components. Use shadcn Card for demo crypt cards, shadcn Button for Summon CTA.

**Depends on:** Task 3

- [ ] 4.1: Install shadcn components: `npx shadcn@latest add button card badge input --yes`. Build gothic hero layout with obsidian bg (#0B0A10), bone-white text (#F4F1EA), JetBrains Mono for paths via globals.css @theme
- [ ] 4.2: Add GitHub URL input (shadcn Input) with format validation enabling Summon button only on valid URL
- [ ] 4.3: Add three demo crypt cards (shadcn Card) loaded from fixtures.ts showing repo name, language badge (shadcn Badge), Haunting Grade, node count
- [ ] 4.4: Wire navigation to /crypt/[owner]/[repo] on submit and card click
- [ ] 4.5: Ensure keyboard accessibility (Enter submits, cards focusable) and WCAG AA contrast
- [ ] 4.6: Verify responsive layout at mobile and 1080p

## Task 5: Crypt Map — React Flow canvas and Chamber nodes

Build src/components/CryptMap.tsx using @xyflow/react v13+.

**Depends on:** Task 3

- [ ] 5.1: Set up ReactFlow canvas with pan, zoom, and MiniMap imported from @xyflow/react; add @xyflow/react/dist/style.css import
- [ ] 5.2: Build Chamber parent node component as gothic stone container with #151320 bg and directory label
- [ ] 5.3: Build Ghost file node with #00E5FF cyan glow and CSS float keyframe animation
- [ ] 5.4: Build Cursed Relic file node with #FF6B2B orange pulse animation
- [ ] 5.5: Build Tombstone file node with #F59E0B amber badge (shadcn Badge)
- [ ] 5.6: Build Healthy file node with #8B5CF6 violet border
- [ ] 5.7: Implement deterministic grid layout with cols = max(2, ceil(sqrt(n))), chambers tiled left-to-right wrapping at 2400px
- [ ] 5.8: Verify nodes never overlap within a chamber

## Task 6: HUD, search, and filter

Build src/components/HUD.tsx using shadcn Button for filter pills and Badge for Haunting Grade.

**Depends on:** Task 5

- [ ] 6.1: Add filter pills using shadcn Button (variant=outline when inactive, variant=default when active) for All, Ghosts, Cursed Relics, Tombstones with live entity counts
- [ ] 6.2: Implement real-time filename search dimming non-matching nodes under 16ms per keystroke
- [ ] 6.3: Show overall Haunting Grade as shadcn Badge with gothic label and correct color
- [ ] 6.4: Show truncation badge (shadcn Badge variant=secondary) when CryptData.truncated is true

## Task 7: Inspector Drawer and Exorcise modal

Build InspectorDrawer.tsx using shadcn Sheet. Build ExorciseModal.tsx using shadcn Artifact AI element + Tabs.

**Depends on:** Task 6

- [ ] 7.1: Install shadcn components: `npx shadcn@latest add sheet tabs separator --yes`. Build InspectorDrawer using shadcn Sheet (slide-in from right), opens on node click, closes on outside click or Escape
- [ ] 7.2: Trigger GET /api/file on drawer open and display LOC, TODO lines, inbound refs in shadcn Card rows
- [ ] 7.3: Add todo_bonus to displayed score after lazy fetch
- [ ] 7.4: Add GitHub file link opening in new tab
- [ ] 7.5: Add Exorcise button (shadcn Button) sending POST /api/exorcise with file content and metrics
- [ ] 7.6: Build ExorciseModal using shadcn Artifact AI element (install: `npx shadcn@latest add artifact --yes`) with ArtifactHeader, ArtifactActions for copy/download, ArtifactContent for spec; use shadcn Tabs inside ArtifactContent for requirements/design/tasks tabs
- [ ] 7.7: Wire copy action in ArtifactActions to clipboard API (ArtifactAction with CopyIcon)
- [ ] 7.8: Wire download action in ArtifactActions to JSZip bundle producing exorcise-slug.zip
- [ ] 7.9: Show shimmer text ("Summoning spec...") using className="shimmer" while LLM call is in-flight; render deterministic fallback spec if LLM call fails

## Task 8: Exorcise API route with Gemini 2.5 Flash

Implement src/app/api/exorcise/route.ts.

**Depends on:** Task 1

- [x] 8.1: Implement POST /api/exorcise accepting owner, repo, path, fileContent, metrics
- [ ] 8.2: Call generateObject from ai with google('gemini-2.5-flash') from @ai-sdk/google
- [x] 8.3: Define Zod schema with requirements, design, and tasks string fields
- [x] 8.4: Truncate fileContent to 4000 chars in prompt if needed
- [x] 8.5: Enforce 8s timeout via AbortSignal.timeout(8000)
- [x] 8.6: Return deterministic EARS-format fallback template on timeout or error

## Task 9: Summoning loader and error card

Build SummonLoader.tsx and ErrorCard.tsx using shadcn primitives and shimmer.

**Depends on:** Task 4

- [ ] 9.1: Build SummonLoader using shimmer CSS utility (className="shimmer") cycling through: "Unearthing file tree...", "Reading commit spirits...", "Calculating curses...", "Mapping the crypt..."
- [ ] 9.2: Build ErrorCard using shadcn Card with gothic-themed CardHeader and CardContent per error type (not found, private, rate limited)
- [ ] 9.3: Show all three demo crypt cards (shadcn Card) on error screen with one-click navigation

## Task 10: Crypt Explorer page and end-to-end wiring

Build src/app/crypt/[owner]/[repo]/page.tsx wiring all components together.

**Depends on:** Task 5, Task 6, Task 7, Task 9

- [ ] 10.1: Check fixtures by owner/repo and render CryptMap immediately with zero API calls for demo repos
- [ ] 10.2: Show SummonLoader while GET /api/analyze runs for live repos
- [ ] 10.3: Pass CryptData to CryptMap and HUD
- [ ] 10.4: Wire node click to open InspectorDrawer with correct node data
- [ ] 10.5: Render ErrorCard on API error (404, 403, timeout)
- [ ] 10.6: Set page title to owner/repo — Codebase Crypt
- [ ] 10.7: Add canonical link for shareable URL

## Task 11: End-to-end verification and pre-submission checklist

Verify all P0 acceptance criteria on the live Vercel deployment.

**Depends on:** Task 10

- [ ] 11.1: Run npm test and confirm 100% pass for unit and property-based tests
- [ ] 11.2: Verify all three demo crypts load in under 500ms
- [ ] 11.3: Verify live repo analysis of expressjs/express completes in under 10s
- [ ] 11.4: Verify Exorcise spec generates in under 8s with file-specific content
- [ ] 11.5: Verify WCAG AA contrast on landing page and Inspector Drawer
- [ ] 11.6: Verify shareable URL for /crypt/expressjs/express works for a cold visitor
- [ ] 11.7: Confirm .kiro/ is tracked in Git and not in .gitignore
- [ ] 11.8: Confirm .env.example documents GITHUB_TOKEN and GEMINI_API_KEY
- [ ] 11.9: Confirm Vercel deployment URL is live and all three demo flows work end-to-end
