/**
 * Upload this plugin to GitHub using the plugin's own service code.
 *
 * Boots the real `apply()` from index.js with a ctx shim whose credential
 * lookup reads the same `.credentials.yaml` the running Host uses, so the
 * upload travels through the exact implementation the panel and the `github`
 * tool call — not a re-implementation.
 */
import { readFile, readdir, stat } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import { apply } from './index.js'

const BUNDLE = resolve('.')
const CREDENTIALS = 'C:\\Users\\Administrator\\.dsh\\.credentials.yaml'
const REPO_NAME = 'dsh-github-plugin'

/** Minimal credential-provider shim over the real store file. */
const credentials = {
  async resolve(ref) {
    const text = await readFile(CREDENTIALS, 'utf8')
    const found = new RegExp(`^\\s+${ref}:\\s*(\\S+)\\s*$`, 'm').exec(text)
    return found ? { value: found[1].replace(/^["']|["']$/g, ''), source: 'file' } : undefined
  },
  async set() {},
  async unset() {},
}

const registered = new Map()
const ctx = {
  get(name) {
    return name === 'credentials' ? credentials : undefined
  },
  inject() {},
  effect: () => () => {},
  tools: {
    register(definition) {
      registered.set(definition.name, definition)
      return () => {}
    },
  },
}

apply(ctx, {})
const tool = registered.get('github')
if (tool === undefined) throw new Error('github tool was not registered')

/** Run one tool action and surface a thrown failure as a rejection. */
const run = (args) => tool.execute(args)

/** Every file under the bundle, skipping tooling noise. */
async function collect(dir, skip) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await collect(full, skip)))
    else if ((await stat(full)).isFile()) out.push(full)
  }
  return out
}

const skip = new Set(['node_modules', '.git', '.verify', '.DS_Store'])
const files = (await collect(BUNDLE, skip)).sort()

console.log('repo  :', `weapon111/${REPO_NAME}`)
console.log('files :', files.length)
for (const file of files) console.log('   ', relative(BUNDLE, file))

// 1. Create the repository (idempotent: reuse it when it already exists).
let created
try {
  created = await run({ action: 'createRepo', name: REPO_NAME, private: false, description: 'DSH plugin: manage a GitHub account from the Web UI and the agent. Browse, upload, download, copy, deploy, read stars.', autoInit: true })
  console.log('\ncreated:', created.fullName, '| default:', created.defaultBranch)
} catch (error) {
  if (!/already exists/i.test(error.message)) throw error
  console.log('\nrepository already exists, reusing it')
  created = await run({ action: 'info', repo: `weapon111/${REPO_NAME}` })
  console.log('existing:', created.fullName, '| default:', created.defaultBranch)
}

const branch = created.defaultBranch ?? 'main'

// 2. Upload every file in one call, base64 to keep bytes exact.
const payload = []
for (const file of files) {
  payload.push({
    path: relative(BUNDLE, file).split('\\').join('/'),
    base64: (await readFile(file)).toString('base64'),
  })
}

const uploaded = await run({
  action: 'upload',
  repo: `weapon111/${REPO_NAME}`,
  branch,
  message: 'Add dsh-github plugin: Host service, agent tool, Web panel, locales, icon',
  files: payload,
})

console.log('\nuploaded:', uploaded.succeeded, '/', uploaded.total)
for (const result of uploaded.results) {
  console.log(result.ok ? `  OK   ${result.path}` : `  FAIL ${result.path}: ${result.error}`)
}

if (uploaded.succeeded !== uploaded.total) process.exitCode = 1
