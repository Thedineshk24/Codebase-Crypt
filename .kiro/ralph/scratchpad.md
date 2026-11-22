---
iteration: 1
max_iterations: 15
completion_promise: "ISSUE_1_COMPLETE"
---

You are working on GitHub Issue #1 of the Codebase Crypt project at /Users/kunal/Desktop/Codebase-Crypt.

## Task: Project scaffold + scoring engine + PBT suite

Set up a Next.js App Router project with TypeScript, Tailwind CSS, React Flow, Vitest, and fast-check. Implement `src/lib/scoring.ts` as a pure module. Write the full test suite. Add the hooks config.

## Acceptance criteria (ALL must be true before outputting the promise)

- [ ] `create-next-app` scaffolded with TypeScript + Tailwind at project root
- [ ] Dependencies installed: `reactflow`, `vitest`, `@vitest/coverage-v8`, `fast-check`, `@ai-sdk/google`, `ai`, `jszip`, `zod`
- [ ] `src/types/index.ts` defines `FileMetrics`, `CryptNode`, `CryptData`, `HauntingType`, `HauntingGrade`
- [ ] `src/lib/scoring.ts` exports `scoreFile()`, `classifyFile()`, `ENTRYPOINT_REGEX`, `computeHauntingGrade()`
- [ ] Scoring formula: `score = round(min(100, max(churnNorm, ageNorm) * 65 + sizeNorm * 35 + min(todoCount * 4, 20)))`
- [ ] Classification rules:
  - Cursed Relic: `churnNorm >= 0.6 AND score >= 60`
  - Ghost: `commits90d === 0 AND ageNorm >= 0.7 AND path does NOT match ENTRYPOINT_REGEX`
  - Tombstone: `score >= 35 OR todoCount >= 3`
  - Healthy: everything else
- [ ] `ENTRYPOINT_REGEX` excludes: `index.*`, `page.*`, `layout.*`, `main.*`, `app.*`, `*.config.*`, `*.test.*`, `*.spec.*`
- [ ] Vitest unit tests in `src/lib/scoring.test.ts` covering all classification branches and edge cases
- [ ] fast-check property tests covering:
  1. Boundedness: score always in [0, 100]
  2. Maximum: churnNorm=1, ageNorm=1, sizeNorm=1, todoCount=5 → score = 100
  3. Entrypoint immunity: entrypoint paths are never classified as Ghost
  4. Monotonicity: increasing any input never decreases the score
  5. Exhaustiveness: every input produces exactly one classification label
- [ ] `npm test` runs and passes with 0 failures
- [ ] `src/app/page.tsx` exists (can be a placeholder)
- [ ] `.env.example` documents `GITHUB_TOKEN` and `GEMINI_API_KEY`

## Spec reference
- Design doc: /Users/kunal/Desktop/Codebase-Crypt/.kiro/specs/codebase-crypt/design.md
- Requirements: /Users/kunal/Desktop/Codebase-Crypt/.kiro/specs/codebase-crypt/requirements.md

## When done
Run `npm test` and confirm it passes. Then close GitHub issue #1 with:
  gh issue close 1 --comment "Completed: scaffold, scoring engine, and PBT suite all passing."

Then output exactly:
<promise>ISSUE_1_COMPLETE</promise>
