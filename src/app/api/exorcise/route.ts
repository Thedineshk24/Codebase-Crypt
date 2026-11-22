/**
 * POST /api/exorcise
 *
 * Generates refactoring guidance (requirements, design, tasks) for a file
 * using Gemini 2.5 Flash via the AI SDK.
 *
 * Environment variable:
 *   GOOGLE_GENERATIVE_AI_API_KEY — required by @ai-sdk/google automatically.
 *   If you have GEMINI_API_KEY instead, alias it:
 *     GOOGLE_GENERATIVE_AI_API_KEY=$GEMINI_API_KEY
 */

import { generateObject } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'

const ExorciseSchema = z.object({
  requirements: z.string(),
  design: z.string(),
  tasks: z.string(),
})

interface ExorciseMetrics {
  score: number
  type: string
  commits90d: number
  loc?: number
  todoCount?: number
}

interface ExorciseRequest {
  owner: string
  repo: string
  path: string
  fileContent: string
  metrics: ExorciseMetrics
}

function buildFallback(path: string, metrics: ExorciseMetrics) {
  return {
    requirements: `# Refactor: ${path}\n\n## Problem\nThis file has a Haunting Score of ${metrics.score}/100 (${metrics.type}).\n\n## Requirements\n- [ ] WHEN the file is refactored THEN technical debt is reduced\n- [ ] WHEN tests are added THEN coverage improves`,
    design: `# Design: ${path}\n\n## Current State\n- Lines of code: ${metrics.loc ?? 'unknown'}\n- Commits (90d): ${metrics.commits90d}\n- TODO count: ${metrics.todoCount ?? 0}\n\n## Proposed Changes\n- Extract pure functions\n- Add unit tests\n- Remove dead code`,
    tasks: `# Tasks: ${path}\n\n- [ ] 1. Audit and document current behavior\n- [ ] 2. Write characterization tests\n- [ ] 3. Refactor in small safe steps\n- [ ] 4. Remove dead code\n- [ ] 5. Update documentation`,
  }
}

export async function POST(request: Request) {
  let body: ExorciseRequest
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { path, fileContent, metrics } = body

  if (!path || !metrics) {
    return Response.json({ error: 'Missing required fields: path, metrics' }, { status: 400 })
  }

  const truncatedContent = typeof fileContent === 'string'
    ? fileContent.slice(0, 4000)
    : ''

  const prompt = `You are a senior software engineer performing a code review and refactoring plan.

File: ${path}
Haunting Score: ${metrics.score}/100 (type: ${metrics.type})
Commits in last 90 days: ${metrics.commits90d}
Lines of code: ${metrics.loc ?? 'unknown'}
TODO count: ${metrics.todoCount ?? 0}

File content (truncated to 4000 chars):
\`\`\`
${truncatedContent}
\`\`\`

Generate a concise refactoring plan with three sections:
1. requirements — Markdown with problem statement and acceptance criteria using WHEN/THEN format
2. design — Markdown with current state analysis and proposed changes
3. tasks — Markdown checklist of concrete refactoring steps`

  try {
    const result = await Promise.race([
      generateObject({
        model: google('gemini-2.5-flash'),
        schema: ExorciseSchema,
        prompt,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 8000)
      ),
    ])

    const { object } = result as Awaited<ReturnType<typeof generateObject<typeof ExorciseSchema>>>

    return Response.json({
      requirements: object.requirements,
      design: object.design,
      tasks: object.tasks,
    })
  } catch {
    return Response.json(buildFallback(path, metrics))
  }
}
