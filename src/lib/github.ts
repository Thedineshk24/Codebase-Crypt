const EXCLUDED_PATH_PREFIXES = [
  'node_modules/',
  'vendor/',
  '.git/',
  'dist/',
  'build/',
  'out/',
  '.next/',
  'coverage/',
  '__pycache__/',
]

const EXCLUDED_EXTENSIONS = [
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico',
  '.woff', '.woff2', '.ttf', '.eot',
  '.pdf', '.zip', '.tar', '.gz',
  '.mp4', '.mp3', '.webm',
  '.min.js', '.min.css',
]

function isSourceFile(path: string): boolean {
  for (const prefix of EXCLUDED_PATH_PREFIXES) {
    if (path.startsWith(prefix) || path.includes('/' + prefix)) return false
  }
  for (const ext of EXCLUDED_EXTENSIONS) {
    if (path.endsWith(ext)) return false
  }
  return true
}

function authHeaders(): HeadersInit {
  const token = process.env.GITHUB_TOKEN
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export interface FileEntry {
  path: string
  sizeBytes: number
}

export interface FileTreeResult {
  files: FileEntry[]
  truncated: boolean
}

export type GitHubError =
  | { type: 'not_found' }
  | { type: 'rate_limited' }
  | { type: 'error'; message: string }

export async function fetchFileTree(owner: string, repo: string): Promise<FileTreeResult> {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...authHeaders(),
    },
  })

  if (res.status === 404) throw { type: 'not_found' } as GitHubError
  if (res.status === 403 || res.status === 429) throw { type: 'rate_limited' } as GitHubError
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw { type: 'error', message: text } as GitHubError
  }

  const data = await res.json()
  const tree: Array<{ path: string; type: string; size?: number }> = data.tree ?? []

  const sourceFiles = tree
    .filter(item => item.type === 'blob' && isSourceFile(item.path))
    .map(item => ({ path: item.path, sizeBytes: item.size ?? 0 }))
    .sort((a, b) => b.sizeBytes - a.sizeBytes)

  const truncated = sourceFiles.length > 120
  return {
    files: sourceFiles.slice(0, 120),
    truncated,
  }
}

export interface CommitInfo {
  commits90d: number
  daysSinceLastEdit: number
}

export async function fetchCommitHistory(
  owner: string,
  repo: string,
  paths: string[]
): Promise<Map<string, CommitInfo>> {
  const result = new Map<string, CommitInfo>()
  const now = Date.now()
  const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000)

  if (process.env.GITHUB_TOKEN) {
    // GraphQL batching: 40 files per request
    const BATCH_SIZE = 40
    for (let batchStart = 0; batchStart < paths.length; batchStart += BATCH_SIZE) {
      const batch = paths.slice(batchStart, batchStart + BATCH_SIZE)

      const fields = batch
        .map((path, i) => {
          const alias = `f${i}`
          return `${alias}: object(expression: "HEAD") { ... on Commit { history(first: 20, path: ${JSON.stringify(path)}) { totalCount nodes { committedDate } } } }`
        })
        .join('\n      ')

      const query = `
        query {
          repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(repo)}) {
            ${fields}
          }
        }
      `

      const res = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      })

      if (!res.ok) {
        // Fall back to REST for this batch on failure
        break
      }

      const json = await res.json()
      const repoData = json?.data?.repository ?? {}

      batch.forEach((path, i) => {
        const alias = `f${i}`
        const historyData = repoData[alias]?.history
        if (!historyData) {
          result.set(path, { commits90d: 0, daysSinceLastEdit: 0 })
          return
        }

        const nodes: Array<{ committedDate: string }> = historyData.nodes ?? []
        const commits90d = nodes.filter(n => new Date(n.committedDate) >= ninetyDaysAgo).length

        const latestDate = nodes.length > 0 ? new Date(nodes[0].committedDate) : null
        const daysSinceLastEdit = latestDate
          ? Math.floor((now - latestDate.getTime()) / (1000 * 60 * 60 * 24))
          : 365

        result.set(path, { commits90d, daysSinceLastEdit })
      })
    }

    // If all batches succeeded, return
    if (result.size >= paths.length) return result
  }

  // REST fallback (no token, or GraphQL failed)
  const url = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=100`
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...authHeaders(),
    },
  })

  let daysSinceMostRecent = 0
  if (res.ok) {
    const commits: Array<{ commit: { committer: { date: string } } }> = await res.json()
    if (commits.length > 0) {
      const latestDate = new Date(commits[0].commit.committer.date)
      daysSinceMostRecent = Math.floor((now - latestDate.getTime()) / (1000 * 60 * 60 * 24))
    }
  }

  for (const path of paths) {
    if (!result.has(path)) {
      result.set(path, { commits90d: 1, daysSinceLastEdit: daysSinceMostRecent })
    }
  }

  return result
}
