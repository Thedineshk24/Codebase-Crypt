import type { HauntingType, HauntingGrade, CryptNode } from '@/types'

export const ENTRYPOINT_REGEX = /(?:^|\/)(?:index|page|layout|main|app)\.|\.(config|test|spec)\./

export function scoreFile(params: {
  churnNorm: number   // 0–1
  ageNorm: number     // 0–1
  sizeNorm: number    // 0–1
  todoCount: number   // integer >= 0
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

export function classifyFile(params: {
  score: number
  churnNorm: number
  ageNorm: number
  commits90d: number
  todoCount: number
  path: string
}): HauntingType {
  const isEntrypoint = ENTRYPOINT_REGEX.test(params.path)
  if (params.churnNorm >= 0.6 && params.score >= 60) return 'cursed-relic'
  if (params.commits90d === 0 && params.ageNorm >= 0.7 && !isEntrypoint) return 'ghost'
  if (params.score >= 35 || params.todoCount >= 3) return 'tombstone'
  return 'healthy'
}

export function computeHauntingGrade(nodes: CryptNode[]): HauntingGrade {
  if (nodes.length === 0) return 'sanctified'
  const haunted = nodes.filter(n => n.type !== 'healthy').length
  const ratio = haunted / nodes.length
  if (ratio > 0.6) return 'cursed'
  if (ratio > 0.3) return 'haunted'
  if (ratio > 0.1) return 'restless'
  return 'sanctified'
}
