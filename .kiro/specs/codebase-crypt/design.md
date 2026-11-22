# Codebase Crypt — Design

## Architecture Overview

Single Next.js 14 App Router application deployed on Vercel. No separate backend service. All GitHub analysis runs in Next.js API routes (serverless functions). The scoring engine is a pure TypeScript module with zero I/O.

```
/
├── src/
│   ├── app/
│   │   ├── page.tsx                  # Landing page — URL input + 3 demo cards
│   │   ├── crypt/[owner]/[repo]/
│   │   │   └── page.tsx              # Crypt Explorer — map + HUD + drawer
│   │   └── api/
│   │       ├── analyze/route.ts      # POST: summon a repo, returns CryptData
│   │       ├── file/route.ts         # GET: lazy-fetch single file body
│   │       └── exorcise/route.ts     # POST: generate .kiro spec via Gemini
│   ├── lib/
│   │   ├── scoring.ts                # Pure scoring + classification engine
│   │   ├── github.ts                 # GitHub API calls (Trees + GraphQL batching)
│   │   ├── fixtures.ts               # Pre-baked demo crypt JSON loaders
│   │   └── zip.ts                    # ZIP bundle builder for .kiro spec download
│   ├── components/
│   │   ├── CryptMap.tsx              # React Flow canvas + Chamber nodes
│   │   ├── HUD.tsx                   # Filter pills, search, Haunting Grade
│   │   ├── InspectorDrawer.tsx       # Node detail panel + Exorcise CTA
│   │   ├── ExorciseModal.tsx         # Tabbed spec preview + copy + download
│   │   ├── SummonLoader.tsx          # Atmospheric progress messages
│   │   └── ErrorCard.tsx             # Gothic error screen + demo crypt cards
│   └── types/
│       └── index.ts                  # CryptNode, CryptData, HauntingType, etc.
├── fixtures/
│   ├── expressjs-express.json
│   ├── fastapi-fastapi.json
│   └── facebook-react.json
└── .kiro/
    ├── specs/codebase-crypt/
    │   ├── requirements.md
    │   ├── design.md
    │   └── tasks.md
    └── hooks/
        └── on-save-scoring.json
```

## Data Flow

### Initial Summon (live repo)

1. User submits URL → `POST /api/analyze`
2. API route: 1× Git Trees API call → file list (path, size), capped at 120 source files (excludes `node_modules`, `vendor`, `.git`, binary extensions)
3. API route: 2–3× GitHub GraphQL batched requests (field aliases, ~40–50 files per request) → `commits_90d` + `days_since_last_edit` per file
4. Scoring engine runs `scoreFile()` + `classifyFile()` on every node — pure, synchronous
5. Response: `CryptData` JSON with all nodes, edges (directory hierarchy), and overall `HauntingGrade`
6. Response cached: `Cache-Control: public, s-maxage=900, stale-while-revalidate=300`

### Demo Crypt

1. User clicks demo card → navigates to `/crypt/expressjs/express` (or fastapi/react)
2. Page component checks `fixtures.ts` → returns pre-baked `CryptData` JSON immediately
3. No API call. Load time < 500ms.

### Node Click (lazy file fetch)

1. User clicks a node → `GET /api/file?owner=&repo=&path=`
2. API route fetches `raw.githubusercontent.com/{owner}/{repo}/main/{path}` (no rate limit cost)
3. Returns `{ loc, todos, imports }` — counts lines, extracts TODO/FIXME markers, regex-scans import statements
4. `todo_bonus` added to score, inbound ref count refined, Inspector Drawer updates

### Exorcise

1. User clicks Exorcise → `POST /api/exorcise` with `{ owner, repo, path, fileContent, metrics }`
2. Vercel AI SDK `generateObject` with Gemini 2.5 Flash + Zod schema `{ requirements: z.string(), design: z.string(), tasks: z.string() }`
3. Timeout: 8s. On failure/timeout → deterministic Markdown template fills in from metrics
4. ExorciseModal renders three tabs. JSZip bundles files for download as `exorcise-<slug>.zip`

## Key Types

```typescript
type HauntingType = 'ghost' | 'cursed-relic' | 'tombstone' | 'healthy'

type HauntingGrade = 'sanctified' | 'restless' | 'haunted' | 'cursed'

interface FileMetrics {
  path: string
  sizeBytes: number
  commits90d: number
  daysSinceLastEdit: number
  // added on click:
  loc?: number
  todoCount?: number
  inboundRefs?: number
}

interface CryptNode {
  id: string
  path: string
  metrics: FileMetrics
  score: number          // 0–100
  type: HauntingType
  reasons: string[]      // plain-English explanation strings
  directory: string      // top-level folder (Chamber key)
}

interface CryptData {
  owner: string
  repo: string
  nodes: CryptNode[]
  hauntingGrade: HauntingGrade
  truncated: boolean     // true if capped at 120 files
  analyzedAt: number     // unix timestamp
}
```

## Scoring Engine (`lib/scoring.ts`)

```typescript
// All inputs normalized 0–1 across the repo before calling scoreFile
function scoreFile(params: {
  churnNorm: number
  ageNorm: number
  sizeNorm: number
  todoCount: number  // 0 until file body fetched
}): number {
  const todoBon = Math.min(params.todoCount * 4, 20)
  return Math.round(
    Math.min(100,
      Math.max(params.churnNorm, params.ageNorm) * 65 +
      params.sizeNorm * 35 +
      todoBon
    )
  )
}

function classifyFile(params: {
  score: number
  churnNorm: number
  ageNorm: number
  commits90d: number
  todoCount: number
  path: string
}): HauntingType {
  const isEntrypoint = /(?:^|\/)(index|page|layout|main|app)\.|\.config\.|\.test\.|\.spec\./.test(params.path)
  if (params.churnNorm >= 0.6 && params.score >= 60) return 'cursed-relic'
  if (params.commits90d === 0 && params.ageNorm >= 0.7 && !isEntrypoint) return 'ghost'
  if (params.score >= 35 || params.todoCount >= 3) return 'tombstone'
  return 'healthy'
}
```

## GitHub API Strategy

**With `GITHUB_TOKEN`** (Vercel production):
- Call 1: `GET /repos/{owner}/{repo}/git/trees/HEAD?recursive=1` → full file tree
- Calls 2–4: GraphQL POST with field aliases, 40–50 files per request:
  ```graphql
  query {
    repository(owner: $owner, name: $repo) {
      f0: object(expression: "HEAD") { ... on Commit { history(first: 20, path: "src/foo.ts") { totalCount nodes { committedDate } } } }
      f1: object(expression: "HEAD") { ... on Commit { history(first: 20, path: "src/bar.ts") { totalCount nodes { committedDate } } } }
      # ... up to 50 aliases per request
    }
  }
  ```

**Without `GITHUB_TOKEN`** (REST fallback):
- Call 1: Git Trees API → paths + sizes
- Call 2: `GET /repos/{owner}/{repo}/commits?per_page=100` → recent activity signal only (no per-file churn). Score uses size + age estimated from commit dates.

## React Flow Chamber Layout

Each top-level directory becomes a Chamber (React Flow parent node). Files are arranged in a grid inside the chamber. Chamber size is computed from child count. Chambers are tiled left-to-right across the canvas with fixed gutters.

```
chamberWidth  = max(2, ceil(sqrt(childCount))) * (NODE_W + GAP) + PADDING * 2
chamberHeight = ceil(childCount / cols) * (NODE_H + GAP) + PADDING * 2 + HEADER_H
```

Chambers tile left-to-right, wrapping at canvas width 2400px.

## Caching

API route handler:
```typescript
export async function GET(req: Request) {
  const data = await fetch(githubUrl, { next: { revalidate: 900 } })
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=300' }
  })
}
```

Vercel's CDN caches the full JSON response for 15 minutes keyed on `owner/repo`. No Redis or KV needed.

## Visual Design Tokens

| Token | Value | Usage |
|---|---|---|
| `--bg-obsidian` | `#0B0A10` | Page background |
| `--bg-stone` | `#151320` | Cards, drawers, chambers |
| `--text-bone` | `#F4F1EA` | Primary text |
| `--glow-ghost` | `#00E5FF` | Ghost node cyan glow |
| `--glow-cursed` | `#FF6B2B` | Cursed Relic orange glow |
| `--glow-tomb` | `#F59E0B` | Tombstone amber glow |
| `--glow-healthy` | `#8B5CF6` | Healthy violet glow |
| `--font-mono` | `JetBrains Mono` | File paths |

## Error Handling

| Condition | Response |
|---|---|
| 404 (repo not found / private) | Gothic error card + all 3 demo crypt cards |
| 403 (rate limited) | Gothic error card + all 3 demo crypt cards + hint to add `GITHUB_TOKEN` |
| Timeout > 10s | Partial results if any nodes scored, else error card |
| Exorcise LLM failure | Deterministic template fallback, no user-visible error |
| Large repo (> 120 files) | Truncation badge on HUD, top 120 source files by commit activity |

