import { NextRequest, NextResponse } from 'next/server'
import { fetchFileTree, fetchCommitHistory } from '@/lib/github'
import { scoreFile, classifyFile, computeHauntingGrade } from '@/lib/scoring'
import type { CryptNode, CryptData } from '@/types'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const owner = searchParams.get('owner')
  const repo = searchParams.get('repo')

  if (!owner || !repo) {
    return NextResponse.json(
      { error: 'bad_request', message: 'Missing required query params: owner, repo' },
      { status: 400 }
    )
  }

  // Fetch file tree
  let fileTree: Awaited<ReturnType<typeof fetchFileTree>>
  try {
    fileTree = await fetchFileTree(owner, repo)
  } catch (err: unknown) {
    const e = err as { type: string; message?: string }
    if (e?.type === 'not_found') {
      return NextResponse.json(
        { error: 'not_found', message: 'Repository not found or is private' },
        { status: 404 }
      )
    }
    if (e?.type === 'rate_limited') {
      return NextResponse.json(
        { error: 'rate_limited', message: 'GitHub API rate limit exceeded. Add a GITHUB_TOKEN to your environment.' },
        { status: 403 }
      )
    }
    return NextResponse.json(
      { error: 'error', message: e?.message ?? 'Unknown error fetching file tree' },
      { status: 500 }
    )
  }

  const { files, truncated } = fileTree
  const paths = files.map(f => f.path)

  // Fetch commit history
  const commitMap = await fetchCommitHistory(owner, repo, paths)

  // Compute max values for normalization
  const maxCommits = Math.max(...files.map(f => commitMap.get(f.path)?.commits90d ?? 0), 0)
  const maxAge = Math.max(...files.map(f => commitMap.get(f.path)?.daysSinceLastEdit ?? 0), 0)
  const maxSize = Math.max(...files.map(f => f.sizeBytes), 0)

  // Build nodes
  const nodes: CryptNode[] = files.map((file, idx) => {
    const commitInfo = commitMap.get(file.path) ?? { commits90d: 0, daysSinceLastEdit: 0 }
    const { commits90d, daysSinceLastEdit } = commitInfo

    const churnNorm = maxCommits > 0 ? commits90d / maxCommits : 0
    const ageNorm = maxAge > 0 ? daysSinceLastEdit / maxAge : 0
    const sizeNorm = maxSize > 0 ? file.sizeBytes / maxSize : 0

    // todoCount is not available from static analysis here — default 0
    const todoCount: number = 0

    const score = scoreFile({ churnNorm, ageNorm, sizeNorm, todoCount })
    const type = classifyFile({ score, churnNorm, ageNorm, commits90d, todoCount, path: file.path })

    // Build reasons
    const reasons: string[] = []
    if (commits90d === 0) reasons.push('0 commits in 90 days')
    else if (churnNorm >= 0.6) reasons.push(`High churn: ${commits90d} commits`)
    if (daysSinceLastEdit > 180) reasons.push(`Last edited ${daysSinceLastEdit} days ago`)
    if (sizeNorm >= 0.8) reasons.push(`Large file: ${file.sizeBytes} bytes`)
    if (todoCount > 0) reasons.push(`${todoCount} TODO comment${todoCount === 1 ? '' : 's'}`)

    // Derive directory from path
    const lastSlash = file.path.lastIndexOf('/')
    const directory = lastSlash >= 0 ? file.path.slice(0, lastSlash) : '.'

    return {
      id: String(idx),
      path: file.path,
      metrics: {
        path: file.path,
        sizeBytes: file.sizeBytes,
        commits90d,
        daysSinceLastEdit,
      },
      score,
      type,
      reasons,
      directory,
    }
  })

  const hauntingGrade = computeHauntingGrade(nodes)

  const cryptData: CryptData = {
    owner,
    repo,
    nodes,
    hauntingGrade,
    truncated,
    analyzedAt: Date.now(),
  }

  return NextResponse.json(cryptData, {
    headers: {
      'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=300',
    },
  })
}
