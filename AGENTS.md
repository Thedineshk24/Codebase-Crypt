<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Codebase Crypt — Next.js 16 Breaking Change Notes

Read these before writing ANY Next.js code in this repo:

### Route Handlers
- `params` is a **Promise** — always `await params`: `const { owner } = await params`
- Use `request.nextUrl.searchParams` to read query params (not `new URL(request.url)`)
- GET handlers are **dynamic by default** — add `export const revalidate = 900` at top of route file to enable 15-min CDN cache (do NOT use `fetch(..., { next: { revalidate } })` on the response object)

### Tailwind CSS
- This project uses **Tailwind v4** — there is NO `tailwind.config.ts`
- All Tailwind config lives in `src/app/globals.css` using `@theme` and `@import "tailwindcss"`
- Do NOT create a `tailwind.config.ts` or add `@tailwind base/components/utilities` directives

### Caching
- For the `/api/analyze` route: use `export const revalidate = 900` (route segment config)
- Also set `Cache-Control: public, s-maxage=900, stale-while-revalidate=300` manually on the Response for CDN compatibility

### @xyflow/react
- Import from `@xyflow/react`, NOT the old `reactflow` package
- CSS: `import '@xyflow/react/dist/style.css'`

### AI SDK
- `generateObject` is imported from `ai`
- `google` provider is imported from `@ai-sdk/google`
- Model string: `google('gemini-2.5-flash')`
