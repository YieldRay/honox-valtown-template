import process from 'node:process'
import { parseEnv, styleText } from 'node:util'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, relative, join, dirname } from 'node:path/posix'
import ValTown from '@valtown/sdk'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)

/**
 * the val name
 */
const name = JSON.parse(
  readFileSync(join(__filename, '../package.json'), 'utf-8'),
)['name']
/**
 * the directory to output the val files to (relative to the project root)
 */
const output = join(__filename, '../dist')
type Val = Awaited<ReturnType<typeof client.me.vals.list>>['data'][number]

const bearerToken =
  process.env.VAL_TOWN_API_KEY ||
  (() => {
    try {
      return parseEnv(readFileSync('.env', 'utf-8')).VAL_TOWN_API_KEY
    } catch {}
  })()

if (!bearerToken) {
  console.error(
    'VAL_TOWN_API_KEY is not set. Please set it in your environment variables or in a .env file. You can get an API key from https://www.val.town/settings/api.',
  )
  process.exit(1)
}

const client = new ValTown({
  bearerToken,
})

async function getAll<T>(
  listFunction: (params: { limit: number; offset: number }) => AsyncIterable<T>,
): Promise<T[]> {
  let offset = 0,
    limit = 100
  const items: T[] = []

  for await (const item of listFunction({
    limit,
    offset,
  })) {
    items.push(item)
    offset += limit
  }
  return items
}

async function getVal(client: ValTown, name: string) {
  const vals = await getAll(client.me.vals.list.bind(client.me.vals))
  const val = vals.find((val) => val.name === name)
  if (!val) {
    console.error(`Val with name "${name}" not found.`)
    process.exit(1)
  }
  console.table({
    username: val.author.username,
    val: val.name,
    privacy: val.privacy,
    createdAt: val.createdAt,
  })
  return val
}

async function getRemoteFiles(client: ValTown, val: Val) {
  return getAll((params) =>
    client.vals.files.retrieve(val.id, {
      ...params,
      path: '',
      recursive: true,
    }),
  )
}

function walkLocalFiles(dir: string) {
  const results: { path: string; content: string }[] = []
  const base = resolve(dir)

  function walk(current: string) {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = join(current, entry.name)
      if (entry.isDirectory()) {
        walk(fullPath)
      } else if (entry.isFile()) {
        results.push({
          path: relative(base, fullPath),
          content: readFileSync(fullPath, 'utf-8'),
        })
      }
    }
  }

  walk(base)
  return results
}

type Status = 'created' | 'deleted' | 'updated' | 'unchanged'

interface LocalFile {
  path: string
  content: string
}

interface FileDiff {
  toDelete: string[]
  toCreate: LocalFile[]
  toUpdate: LocalFile[]
  neededDirs: string[]
  localDirPaths: Set<string>
}

function computeDiff(
  remoteFiles: Awaited<ReturnType<typeof getRemoteFiles>>,
  output: string,
): FileDiff {
  const existingFiles = new Map(
    remoteFiles.filter((f) => f.type !== 'directory').map((f) => [f.path, f]),
  )
  const existingDirs = new Set(
    remoteFiles.filter((f) => f.type === 'directory').map((f) => f.path),
  )

  const localFiles = walkLocalFiles(output)
  const localFilePaths = new Set(localFiles.map((f) => f.path))
  const localDirPaths = new Set<string>()
  for (const f of localFiles) {
    const parts = f.path.split('/')
    for (let i = 1; i < parts.length; i++) {
      localDirPaths.add(parts.slice(0, i).join('/'))
    }
  }

  return {
    toDelete: [...existingFiles.keys()].filter((p) => !localFilePaths.has(p)),
    toCreate: localFiles.filter((f) => !existingFiles.has(f.path)),
    toUpdate: localFiles.filter((f) => existingFiles.has(f.path)),
    neededDirs: [...localDirPaths].filter((d) => !existingDirs.has(d)),
    localDirPaths,
  }
}

const print = process.stdout.write.bind(process.stdout)
const printToStartOfLine = (() => {
  let lastLineLength = 0
  return (s: string) => {
    const str = String(s)
    const neededLength = Math.max(lastLineLength - str.length, 0)
    print('\r' + str + ' '.repeat(neededLength) + '\b'.repeat(neededLength))
    lastLineLength = str.length
  }
})()

async function applyChanges(
  client: ValTown,
  val: Val,
  diff: FileDiff,
): Promise<Set<string>> {
  const { toDelete, toCreate, toUpdate, neededDirs } = diff

  for (const path of toDelete) {
    printToStartOfLine(
      styleText('red', 'deleting ') + styleText('dim', `${path}`),
    )
    await client.vals.files.delete(val.id, { path, recursive: false })
  }
  if (toDelete.length) print('\n')

  for (const path of neededDirs) {
    printToStartOfLine(
      styleText('green', 'creating ') + styleText('dim', `${path}/`),
    )
    await client.vals.files.create(val.id, { path, type: 'directory' })
  }
  for (const { path, content } of toCreate) {
    printToStartOfLine(
      styleText('green', 'creating ') + styleText('dim', `${path}`),
    )
    await client.vals.files.create(val.id, { path, content, type: 'file' })
  }
  if (neededDirs.length + toCreate.length) print('\n')

  const actuallyUpdated = new Set<string>()
  for (const { path, content } of toUpdate) {
    const response = await client.vals.files.getContent(val.id, { path })
    const remoteContent = await response.text()
    if (remoteContent !== content) {
      printToStartOfLine(
        styleText('yellow', 'updating ') + styleText('dim', `${path}`),
      )
      await client.vals.files.update(val.id, { path, content })
      actuallyUpdated.add(path)
    }
  }
  if (actuallyUpdated.size) print('\n')

  return actuallyUpdated
}

interface TreeNode {
  _status?: Status
  children: Map<string, TreeNode>
}

const SC = {
  created: 'green',
  deleted: 'red',
  updated: 'yellow',
  unchanged: 'dim',
} as const

function insert(tree: Map<string, TreeNode>, parts: string[], status?: Status) {
  let node = tree
  for (let i = 0; i < parts.length; i++) {
    const name = parts[i]
    if (!node.has(name)) node.set(name, { children: new Map() })
    const entry = node.get(name)!
    if (i === parts.length - 1 && status) entry._status = status
    node = entry.children
  }
}

function render(tree: Map<string, TreeNode>, prefix: string): string {
  let out = ''
  const entries = [...tree].sort(([a], [b]) => a.localeCompare(b))
  for (let i = 0; i < entries.length; i++) {
    const [name, node] = entries[i]
    const isLast = i === entries.length - 1
    const conn = isLast ? '└── ' : '├── '
    const cont = isLast ? '    ' : '│   '
    let label = name
    if (node._status) {
      label += ` (${styleText(SC[node._status], node._status)})`
    }
    out += prefix + conn + label + '\n'
    if (node.children.size > 0) out += render(node.children, prefix + cont)
  }
  return out
}

function printFileTree(
  diff: FileDiff,
  actuallyUpdated: Set<string>,
  output: string,
) {
  const { toDelete, toCreate, toUpdate, neededDirs, localDirPaths } = diff
  const statusMap = new Map<string, Status>()

  for (const p of toDelete) statusMap.set(p, 'deleted')
  for (const { path } of toCreate) statusMap.set(path, 'created')
  for (const { path } of toUpdate) {
    statusMap.set(path, actuallyUpdated.has(path) ? 'updated' : 'unchanged')
  }
  for (const p of neededDirs) statusMap.set(p, 'created')

  const root: Map<string, TreeNode> = new Map()
  for (const [path, status] of statusMap) {
    insert(root, path.split('/'), status)
  }
  for (const p of localDirPaths) {
    const parts = p.split('/')
    if (!statusMap.has(p)) insert(root, parts)
  }

  console.log()
  console.log(styleText('bold', output))
  process.stdout.write(render(root, ''))
}

// --- main ---

const val = await getVal(client, name)
const remoteFiles = await getRemoteFiles(client, val)
const diff = computeDiff(remoteFiles, output)

if (
  diff.toDelete.length +
    diff.neededDirs.length +
    diff.toCreate.length +
    diff.toUpdate.length ===
  0
) {
  console.log(styleText('dim', 'up to date'))
} else {
  const actuallyUpdated = await applyChanges(client, val, diff)
  printFileTree(diff, actuallyUpdated, output)
}
