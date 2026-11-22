# Codebase Crypt — Requirements

## Problem Statement

Growing software repositories accumulate invisible decay: orphaned files nobody imports, high-churn modules that break every sprint, and forgotten TODO/FIXME comments. Existing static analysis tools surface these as dense terminal logs that developers ignore. Even when a developer spots a problem, translating a warning into a safe refactoring plan takes manual effort.

## Solution

Codebase Crypt turns any public GitHub repository into an interactive gothic haunted crypt where spooky visual metaphors communicate real engineering health at a glance. Ghosts reveal dead or orphaned code. Cursed Relics highlight high-churn technical debt. Tombstones mark stale modules with unresolved TODO/FIXME debt. Clicking Exorcise on any haunted file generates a ready-to-run `.kiro` refactoring spec (requirements.md, design.md, tasks.md), closing the loop from visual triage to AI-assisted cleanup.

## User Stories

1. As a first-time visitor, I want to see three Instant Demo Crypt cards on the landing page, so that I can explore a pre-built haunted codebase in one click with no sign-up.
2. As a first-time visitor, I want to click a demo card and have the Crypt Explorer open in under 500ms, so that I get an immediate visual wow.
3. As a developer, I want to paste a public GitHub URL and click Summon Crypt, so that I can analyze any repo I care about.
4. As a developer, I want to see an atmospheric scanning loader with progress messages while the repo analyzes, so that the wait feels intentional and themed.
5. As a developer, I want the full Crypt Map to render in under 10 seconds for repos up to 120 source files, so that I don't lose patience waiting.
6. As a developer, I want to see a clear truncation badge if my repo was capped at 120 files, so that I understand why some files may be missing.
7. As a developer, I want to see file nodes grouped into React Flow Chamber parent nodes by top-level directory, so that the repo's folder architecture is immediately legible.
8. As a developer, I want each node visually styled by its haunting type — Ghost (cyan), Cursed Relic (orange), Tombstone (amber), Healthy (violet) — so that I can triage at a glance.
9. As a developer, I want to filter the Crypt Map by entity type (All, Ghosts, Cursed Relics, Tombstones) using HUD filter pills, so that I can focus on specific problem categories.
10. As a developer, I want to search nodes by filename with real-time dimming of non-matches, so that I can find a specific file quickly.
11. As a developer, I want to see entity counts and the overall Haunting Grade (Sanctified / Restless / Haunted / Cursed) in the HUD, so that I have an at-a-glance health summary.
12. As a developer, I want to click any node and open an Inspector Drawer, so that I can see detailed metrics for that file.
13. As a developer, I want the Inspector Drawer to show the Haunting Score (0–100), plain-English classification reasons, raw metrics (LOC, commits, age, TODOs, inbound refs), and a direct GitHub file link, so that I understand exactly why a file is flagged.
14. As a developer, I want to click Exorcise with Kiro Spec inside the Inspector Drawer, so that I can generate a refactoring plan for that file.
15. As a developer, I want the Exorcise modal to show three tabbed Markdown files (requirements.md, design.md, tasks.md) specific to that file's actual code, so that I get a useful, non-generic spec.
16. As a developer, I want to copy individual spec files or download a `.kiro Spec ZIP`, so that I can drop it straight into `.kiro/specs/exorcise-<slug>/` in my repo.
17. As a developer, I want the Exorcise spec to generate in under 8 seconds, so that the demo flow feels snappy.
18. As a developer, I want a shareable `/crypt/[owner]/[repo]` URL that reloads cleanly, so that I can send the crypt to a colleague.
19. As a developer, I want cached analysis results for 15 minutes on the same repo URL, so that shared links load instantly for other visitors.
20. As a developer, I want a gothic-themed error card with all three demo crypt options when a private repo, typo, or rate limit is encountered, so that I never hit a dead end.
21. As a hackathon judge, I want to see the full flow — landing → summon → crypt map → inspect → exorcise → download — in under 3 minutes, so that I can evaluate the submission quickly.
22. As a hackathon judge, I want WCAG AA contrast (≥ 4.5:1) on all body text and labels, so that the demo is legible in a 1080p recording.

## Implementation Decisions

- **Stack**: Next.js App Router (v16+), TypeScript, deployed on Vercel. All backend logic lives in Next.js API routes — no separate server.
- **GitHub data fetching**:
  - Initial summon: 1 Git Trees API call (file paths + sizes) + 2–3 batched GitHub GraphQL requests using field aliases to fetch `history(first: 20, path: "...")` for all files in chunks of ~40–50 at a time. Total: 3–4 API calls.
  - File bodies: fetched lazily from `raw.githubusercontent.com` on node click (does not count against GitHub REST rate limits).
  - REST fallback when no `GITHUB_TOKEN`: Git Trees API + single recent commits call, scoring on size + age only.
  - Optional `GITHUB_TOKEN` env var pre-set on Vercel for judging day to unlock GraphQL and raise rate limit to 5,000/hour.
- **Scoring engine** (`lib/scoring.ts`, pure functions, zero I/O):
  - `score = round(min(100, (max(churn_norm, age_norm) × 65) + (size_norm × 35) + todo_bonus))`
  - `todo_bonus = min(todo_count × 4, 20)` — added on click when file body is fetched
  - All `_norm` values are 0–1 normalized across all files in the repo
- **Entity classification** (dominant-trait rules, not score ranges):
  - **Cursed Relic**: `churn_norm >= 0.6` AND `score >= 60`
  - **Ghost**: `commits_90d == 0` AND `age_norm >= 0.7` AND path does not match `index.*`, `page.*`, `layout.*`, `main.*`, `app.*`, `*.config.*`, `*.test.*`, `*.spec.*`
  - **Tombstone**: `score >= 35` OR `todo_count >= 3` (once clicked)
  - **Healthy**: everything else
- **Haunting Grade** (overall repo health, shown in HUD):
  - Sanctified: < 10% haunted nodes
  - Restless: 10–30% haunted nodes
  - Haunted: 30–60% haunted nodes
  - Cursed: > 60% haunted nodes
- **Crypt Map**: React Flow canvas with pan/zoom/minimap. Directory Chamber parent nodes using a deterministic grid layout (~40 lines) that places each directory's files in a grid inside a sized chamber box, then tiles chambers across the canvas.
- **Exorcise spec generation**: Gemini 2.5 Flash via Vercel AI SDK `generateObject` with a Zod schema producing `{ requirements: string, design: string, tasks: string }`. Deterministic Markdown template fallback if the LLM call fails or times out in 8s.
- **3 Instant Demo Crypts**: `expressjs/express` (JavaScript), `fastapi/fastapi` (Python), `facebook/react` (TypeScript/JS). Pre-baked JSON fixtures from a real analyzer run committed to the repo. Load in < 500ms with zero external API calls.
- **Caching**: `fetch(..., { next: { revalidate: 900 } })` on the analysis API route + `Cache-Control: public, s-maxage=900, stale-while-revalidate=300` response header. No Redis or KV store.
- **Design tokens**: Obsidian background `#0B0A10`, stone surface `#151320`, bone-white text `#F4F1EA`, JetBrains Mono for file paths.

## Testing Decisions

- Good tests assert observable behavior, not implementation details. Test the scoring engine through its public API (`scoreFile`, `classifyFile`), not internal normalization helpers.
- **Unit tests** (Vitest): all classification rules, score formula edge cases (all-zero inputs, all-max inputs, entrypoint exclusion).
- **Property-based tests** (fast-check):
  - Boundedness: score is always in [0, 100]
  - Maximum: `churn_norm=1, age_norm=1, size_norm=1, todo_count=5` always produces score 100
  - Entrypoint immunity: any file matching the exclusion pattern is never classified as Ghost
  - Monotonicity: increasing `todo_count`, `churn_norm`, `age_norm`, or `size_norm` never decreases the score
  - Exhaustiveness: every file receives exactly one classification label
- **Hook**: `.kiro/hooks/on-save-scoring.json` auto-runs `npm test` on every save to `src/lib/scoring.ts`

## Out of Scope

- Private repository OAuth / GitHub App authentication
- User accounts, saved workspaces, persistent database
- Multi-language full AST compiler resolution
- Automatic Git commits or PR creation from the browser
- Ambient audio (deferred post-v1)
- GitHub App PR commenting or team leaderboards

## Further Notes

- `.kiro/` must be tracked in Git and never added to `.gitignore` per Kiroween contest rules.
- Pre-baked demo fixtures must be generated from a real analyzer run so every GitHub file link and Exorcise click works live during judging.
- The scoring engine must be a pure TypeScript module so property-based tests can run without any network mocks.
