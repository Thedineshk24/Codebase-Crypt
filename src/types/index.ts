export type HauntingType = 'ghost' | 'cursed-relic' | 'tombstone' | 'healthy'
export type HauntingGrade = 'sanctified' | 'restless' | 'haunted' | 'cursed'

export interface FileMetrics {
  path: string
  sizeBytes: number
  commits90d: number
  daysSinceLastEdit: number
  loc?: number
  todoCount?: number
  inboundRefs?: number
}

export interface CryptNode {
  id: string
  path: string
  metrics: FileMetrics
  score: number
  type: HauntingType
  reasons: string[]
  directory: string
}

export interface CryptData {
  owner: string
  repo: string
  nodes: CryptNode[]
  hauntingGrade: HauntingGrade
  truncated: boolean
  analyzedAt: number
}
