import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { scoreFile, classifyFile, computeHauntingGrade, ENTRYPOINT_REGEX } from './scoring'
import type { CryptNode } from '@/types'

// ---------------------------------------------------------------------------
// Unit tests
// ---------------------------------------------------------------------------

describe('scoreFile', () => {
  it('returns 0 for all-zero inputs', () => {
    expect(scoreFile({ churnNorm: 0, ageNorm: 0, sizeNorm: 0, todoCount: 0 })).toBe(0)
  })

  it('returns 100 for all-max inputs', () => {
    expect(scoreFile({ churnNorm: 1, ageNorm: 1, sizeNorm: 1, todoCount: 5 })).toBe(100)
  })

  it('always returns an integer', () => {
    const s = scoreFile({ churnNorm: 0.3, ageNorm: 0.7, sizeNorm: 0.5, todoCount: 2 })
    expect(Number.isInteger(s)).toBe(true)
  })
})

describe('classifyFile', () => {
  it('returns cursed-relic when churnNorm=0.8 and score=70', () => {
    expect(classifyFile({ score: 70, churnNorm: 0.8, ageNorm: 0, commits90d: 10, todoCount: 0, path: 'src/utils.ts' })).toBe('cursed-relic')
  })

  it('returns ghost when commits90d=0, ageNorm=0.9, non-entrypoint path', () => {
    expect(classifyFile({ score: 10, churnNorm: 0, ageNorm: 0.9, commits90d: 0, todoCount: 0, path: 'src/utils.ts' })).toBe('ghost')
  })

  it('does NOT return ghost for src/index.ts (entrypoint immunity)', () => {
    expect(classifyFile({ score: 10, churnNorm: 0, ageNorm: 0.9, commits90d: 0, todoCount: 0, path: 'src/index.ts' })).not.toBe('ghost')
  })

  it('does NOT return ghost for src/app.ts (entrypoint immunity)', () => {
    expect(classifyFile({ score: 10, churnNorm: 0, ageNorm: 0.9, commits90d: 0, todoCount: 0, path: 'src/app.ts' })).not.toBe('ghost')
  })

  it('does NOT return ghost for src/foo.config.ts (entrypoint immunity)', () => {
    expect(classifyFile({ score: 10, churnNorm: 0, ageNorm: 0.9, commits90d: 0, todoCount: 0, path: 'src/foo.config.ts' })).not.toBe('ghost')
  })

  it('does NOT return ghost for src/foo.test.ts (entrypoint immunity)', () => {
    expect(classifyFile({ score: 10, churnNorm: 0, ageNorm: 0.9, commits90d: 0, todoCount: 0, path: 'src/foo.test.ts' })).not.toBe('ghost')
  })

  it('returns tombstone when score=40', () => {
    expect(classifyFile({ score: 40, churnNorm: 0, ageNorm: 0, commits90d: 5, todoCount: 0, path: 'src/utils.ts' })).toBe('tombstone')
  })

  it('returns tombstone when todoCount=3 and score=10', () => {
    expect(classifyFile({ score: 10, churnNorm: 0, ageNorm: 0, commits90d: 5, todoCount: 3, path: 'src/utils.ts' })).toBe('tombstone')
  })

  it('returns healthy when score=20 and todoCount=0', () => {
    expect(classifyFile({ score: 20, churnNorm: 0, ageNorm: 0, commits90d: 5, todoCount: 0, path: 'src/utils.ts' })).toBe('healthy')
  })
})

describe('computeHauntingGrade', () => {
  it('returns sanctified for 0 nodes', () => {
    expect(computeHauntingGrade([])).toBe('sanctified')
  })

  it('returns cursed when >60% of nodes are haunted', () => {
    const makeNode = (type: CryptNode['type'], i: number): CryptNode => ({
      id: String(i),
      path: `src/file${i}.ts`,
      metrics: { path: `src/file${i}.ts`, sizeBytes: 100, commits90d: 0, daysSinceLastEdit: 400 },
      score: 50,
      type,
      reasons: [],
      directory: 'src',
    })
    // 7 haunted out of 10 = 70% > 60%
    const nodes: CryptNode[] = [
      ...Array.from({ length: 7 }, (_, i) => makeNode('ghost', i)),
      ...Array.from({ length: 3 }, (_, i) => makeNode('healthy', i + 7)),
    ]
    expect(computeHauntingGrade(nodes)).toBe('cursed')
  })
})

// ---------------------------------------------------------------------------
// Property-based tests
// ---------------------------------------------------------------------------

describe('scoreFile — property: boundedness', () => {
  it('score is always in [0, 100] for any valid inputs', () => {
    // Validates: Requirements 1.6 (scoring bounds)
    fc.assert(fc.property(
      fc.float({ min: 0, max: 1, noNaN: true }),
      fc.float({ min: 0, max: 1, noNaN: true }),
      fc.float({ min: 0, max: 1, noNaN: true }),
      fc.integer({ min: 0, max: 20 }),
      (churnNorm, ageNorm, sizeNorm, todoCount) => {
        const s = scoreFile({ churnNorm, ageNorm, sizeNorm, todoCount })
        return s >= 0 && s <= 100
      }
    ))
  })
})

describe('scoreFile — property: maximum', () => {
  it('all-max inputs always produce 100', () => {
    // Validates: Requirements 1.6 (max score)
    expect(scoreFile({ churnNorm: 1, ageNorm: 1, sizeNorm: 1, todoCount: 5 })).toBe(100)
  })
})

describe('classifyFile — property: entrypoint immunity', () => {
  it('files matching ENTRYPOINT_REGEX are never classified as ghost', () => {
    // Validates: Requirements 1.6 (entrypoint immunity)
    const entrypointPaths = [
      'src/index.ts',
      'pages/index.tsx',
      'app/page.tsx',
      'src/main.ts',
      'src/app.ts',
      'next.config.ts',
      'src/foo.test.ts',
      'src/foo.spec.ts',
    ]
    fc.assert(fc.property(
      fc.constantFrom(...entrypointPaths),
      fc.float({ min: 0, max: 1, noNaN: true }),
      (path, ageNorm) => {
        const score = scoreFile({ churnNorm: 0, ageNorm, sizeNorm: 0.5, todoCount: 0 })
        const type = classifyFile({ score, churnNorm: 0, ageNorm, commits90d: 0, todoCount: 0, path })
        return type !== 'ghost'
      }
    ))
  })
})

describe('scoreFile — property: monotonicity', () => {
  it('increasing todoCount never decreases the score', () => {
    // Validates: Requirements 1.6 (todo bonus monotonicity)
    fc.assert(fc.property(
      fc.float({ min: 0, max: 1, noNaN: true }),
      fc.float({ min: 0, max: 1, noNaN: true }),
      fc.float({ min: 0, max: 1, noNaN: true }),
      fc.integer({ min: 0, max: 10 }),
      (churnNorm, ageNorm, sizeNorm, todoCount) => {
        const s1 = scoreFile({ churnNorm, ageNorm, sizeNorm, todoCount })
        const s2 = scoreFile({ churnNorm, ageNorm, sizeNorm, todoCount: todoCount + 1 })
        return s2 >= s1
      }
    ))
  })
})

describe('classifyFile — property: exhaustiveness', () => {
  it('every input produces exactly one of the four labels', () => {
    // Validates: Requirements 1.6 (complete classification)
    fc.assert(fc.property(
      fc.float({ min: 0, max: 1, noNaN: true }),
      fc.float({ min: 0, max: 1, noNaN: true }),
      fc.integer({ min: 0, max: 365 }),
      fc.integer({ min: 0, max: 10 }),
      fc.string(),
      (churnNorm, ageNorm, commits90d, todoCount, path) => {
        const score = scoreFile({ churnNorm, ageNorm, sizeNorm: 0.5, todoCount })
        const type = classifyFile({ score, churnNorm, ageNorm, commits90d, todoCount, path })
        return ['ghost', 'cursed-relic', 'tombstone', 'healthy'].includes(type)
      }
    ))
  })
})
