/**
 * Host half of the GitHub bundle.
 *
 * One service owns every GitHub operation. The model-facing `github` tool and
 * the Web panel's authenticated `/api/github/*` routes both call that same
 * service, so the two callers never carry separate logic.
 *
 * @module @local/github
 */

/** Stable Cordis plugin name. */
export const name = 'github'

/** The tool registry is the only hard dependency; credentials are optional. */
export const inject = ['tools']

const PLUGIN_VERSION = '1.0.0'
const DEFAULT_API = 'https://api.github.com'
const MAX_INLINE_FILE_BYTES = 8 * 1024 * 1024
const TOOL_TEXT_LIMIT = 24_000
const REF_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/

/** A GitHub failure carrying its HTTP status for callers that branch on it. */
class GithubError extends Error {
  constructor(message, status = 0, extra = {}) {
    super(message)
    this.name = 'GithubError'
    this.status = status
    Object.assign(this, extra)
  }
}

/** Encode each path segment, keeping the separators GitHub expects. */
function encodePath(path) {
  return String(path ?? '')
    .split('/')
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

/** Whether a byte buffer looks like binary content. */
function looksBinary(buffer) {
  const limit = Math.min(buffer.length, 8_000)
  for (let index = 0; index < limit; index += 1) if (buffer[index] === 0) return true
  return false
}

/** Trim text to a model-friendly length. */
function clip(text, limit = TOOL_TEXT_LIMIT) {
  if (typeof text !== 'string' || text.length <= limit) return text
  return `${text.slice(0, limit)}\n… [${text.length - limit} more characters truncated]`
}

/** Read GitHub's rate-limit headers. */
function readRate(headers) {
  const remaining = headers.get('x-ratelimit-remaining')
  const limit = headers.get('x-ratelimit-limit')
  const reset = headers.get('x-ratelimit-reset')
  if (remaining === null && limit === null) return undefined
  return {
    remaining: remaining === null ? null : Number(remaining),
    limit: limit === null ? null : Number(limit),
    resetAt: reset === null ? null : new Date(Number(reset) * 1000).toISOString(),
  }
}

/** Project one repository onto the fields the panel and tool show. */
function shapeRepo(entry) {
  return {
    fullName: entry.full_name,
    name: entry.name,
    owner: entry.owner?.login ?? null,
    private: entry.private === true,
    description: entry.description ?? null,
    defaultBranch: entry.default_branch ?? null,
    updatedAt: entry.updated_at ?? null,
    pushedAt: entry.pushed_at ?? null,
    sizeKb: entry.size ?? null,
    htmlUrl: entry.html_url ?? null,
    archived: entry.archived === true,
    fork: entry.fork === true,
  }
}

/**
 * Build the single service every caller uses.
 * @param ctx - owning plugin context.
 * @param config - the plugin row config (every field optional).
 */
function createService(ctx, config) {
  const options = {
    tokenRef: typeof config?.tokenRef === 'string' && REF_PATTERN.test(config.tokenRef) ? config.tokenRef : 'GITHUB_TOKEN',
    apiBase:
      typeof config?.apiBase === 'string' && config.apiBase.startsWith('http')
        ? config.apiBase.replace(/\/+$/, '')
        : DEFAULT_API,
  }

  /** Resolve the token from the credential store, then the launch environment. */
  async function resolveToken() {
    const credentials = ctx.get('credentials')
    if (credentials !== undefined) {
      try {
        const resolved = await credentials.resolve(options.tokenRef)
        if (resolved !== undefined && typeof resolved.value === 'string' && resolved.value.trim().length > 0) {
          return { value: resolved.value.trim(), source: resolved.source ?? 'credentials' }
        }
      } catch {
        // A provider failure must not hide the environment fallback.
      }
    }
    const ambient = process.env[options.tokenRef]
    if (typeof ambient === 'string' && ambient.trim().length > 0) return { value: ambient.trim(), source: 'environment' }
    return undefined
  }

  /** Require a token or fail with an actionable message. */
  async function requireToken() {
    const token = await resolveToken()
    if (token === undefined) {
      throw new GithubError(
        `no GitHub token: save ${options.tokenRef} in the GitHub panel, or export it before launching the harness`,
        401,
        { tokenMissing: true },
      )
    }
    return token
  }

  /** Allow anonymous reads of public content when no token is configured. */
  async function tokenIfAny() {
    return resolveToken()
  }

  /** Resolve a repository for a read: authenticated when possible, anonymous otherwise. */
  async function readTarget(args) {
    const token = await tokenIfAny()
    if (token === undefined) {
      const raw = String(args?.repo ?? '')
        .trim()
        .replace(/^https?:\/\/github\.com\//i, '')
        .replace(/\.git$/i, '')
      const parts = raw.split('/').filter(Boolean)
      if (parts.length !== 2) {
        throw new GithubError('no GitHub token is configured, so repository reads need "owner/name"', 401, {
          tokenMissing: true,
        })
      }
      return { token: undefined, target: { repo: `${parts[0]}/${parts[1]}`, owner: parts[0], name: parts[1] } }
    }
    return { token, target: await normalizeRepo(token, args?.repo) }
  }

  /** One HTTP call against the configured API base. */
  async function call(token, pathname, init = {}) {
    const url = pathname.startsWith('http') ? pathname : `${options.apiBase}${pathname}`
    const headers = {
      accept: init.accept ?? 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': `dsh-github/${PLUGIN_VERSION}`,
    }
    if (token !== undefined) headers.authorization = `Bearer ${token.value}`
    if (init.body !== undefined) headers['content-type'] = 'application/json'
    const response = await fetch(url, {
      method: init.method ?? 'GET',
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: init.signal,
      redirect: 'follow',
    })
    const rate = readRate(response.headers)
    if (!response.ok) {
      let message = `GitHub answered ${response.status} ${response.statusText}`
      try {
        const payload = await response.json()
        if (payload !== null && typeof payload === 'object' && typeof payload.message === 'string') {
          message = payload.message
          const details = Array.isArray(payload.errors)
            ? payload.errors.map((entry) => (typeof entry === 'string' ? entry : entry?.message)).filter(Boolean)
            : []
          if (details.length > 0) message = `${message}: ${details.join('; ')}`
        }
      } catch {
        // A non-JSON error body keeps the status line.
      }
      throw new GithubError(message, response.status, { rate })
    }
    if (init.raw === true) return { response, rate }
    if (response.status === 204) return { data: null, rate }
    const text = await response.text()
    let data = null
    if (text.trim().length > 0) {
      try {
        data = JSON.parse(text)
      } catch {
        data = text
      }
    }
    return { data, rate }
  }

  /** Split `owner/name`; a bare name belongs to the authenticated account. */
  async function normalizeRepo(token, repo) {
    const raw = String(repo ?? '')
      .trim()
      .replace(/^https?:\/\/github\.com\//i, '')
      .replace(/\.git$/i, '')
    if (raw.length === 0) throw new GithubError('repo is required, as "owner/name"', 400)
    const parts = raw.split('/').filter(Boolean)
    if (parts.length === 2) return { repo: `${parts[0]}/${parts[1]}`, owner: parts[0], name: parts[1] }
    if (parts.length === 1) {
      const { data } = await call(token, '/user')
      return { repo: `${data.login}/${parts[0]}`, owner: data.login, name: parts[0] }
    }
    throw new GithubError(`repo "${raw}" must be "owner/name"`, 400)
  }

  /** Read one contents-API entry. */
  async function entryMeta(token, repo, path, ref) {
    const query = ref === undefined || ref === '' ? '' : `?ref=${encodeURIComponent(ref)}`
    const { data } = await call(token, `/repos/${repo}/contents/${encodePath(path)}${query}`)
    return data
  }

  /** Fetch one file's bytes and metadata. */
  async function fileBytes(token, repo, path, ref) {
    const query = ref === undefined ? '' : `?ref=${encodeURIComponent(ref)}`
    const meta = await entryMeta(token, repo, path, ref)
    if (Array.isArray(meta)) throw new GithubError(`"${path}" is a directory; browse it instead`, 400)
    let buffer
    if (typeof meta.content === 'string' && meta.encoding === 'base64' && meta.content.length > 0) {
      buffer = Buffer.from(meta.content, 'base64')
    } else {
      const { response } = await call(token, `/repos/${repo}/contents/${encodePath(path)}${query}`, {
        accept: 'application/vnd.github.raw',
        raw: true,
      })
      buffer = Buffer.from(await response.arrayBuffer())
    }
    return { meta, buffer }
  }

  /** GitHub account and token facts. */
  async function status() {
    const token = await resolveToken()
    if (token === undefined) {
      return {
        authenticated: false,
        tokenRef: options.tokenRef,
        apiBase: options.apiBase,
        hint: `Save ${options.tokenRef} in the panel, or export it before launching the harness.`,
      }
    }
    try {
      const { data, rate } = await call(token, '/user')
      return {
        authenticated: true,
        tokenRef: options.tokenRef,
        tokenSource: token.source,
        apiBase: options.apiBase,
        login: data.login,
        name: data.name ?? null,
        avatarUrl: data.avatar_url ?? null,
        htmlUrl: data.html_url ?? null,
        publicRepos: data.public_repos ?? null,
        totalPrivateRepos: data.total_private_repos ?? null,
        rate: rate ?? null,
      }
    } catch (error) {
      if (error instanceof GithubError && error.status === 401) {
        return {
          authenticated: false,
          invalid: true,
          tokenRef: options.tokenRef,
          tokenSource: token.source,
          message: error.message,
        }
      }
      throw error
    }
  }

  /** Store a token through the credential service (a user gesture). */
  async function saveToken(value) {
    const trimmed = String(value ?? '').trim()
    if (trimmed.length === 0) throw new GithubError('the token is empty', 400)
    const credentials = ctx.get('credentials')
    if (credentials === undefined) throw new GithubError('no credential service is mounted in this profile', 501)
    await credentials.set(options.tokenRef, trimmed)
    return { saved: true, tokenRef: options.tokenRef }
  }

  /** Remove the stored token, revealing any environment fallback. */
  async function clearToken() {
    const credentials = ctx.get('credentials')
    if (credentials !== undefined) await credentials.unset(options.tokenRef)
    return { cleared: true, tokenRef: options.tokenRef }
  }

  /** Repositories the token can reach, or a search result set. */
  async function listRepos(args = {}) {
    const perPage = Math.min(Math.max(Number(args.perPage) || 30, 1), 100)
    const page = Math.max(Number(args.page) || 1, 1)
    const query = typeof args.query === 'string' ? args.query.trim() : ''
    if (query.length > 0) {
      // Repository search needs no owner identity: anonymous callers may use it.
      const token = await tokenIfAny()
      const { data, rate } = await call(
        token,
        `/search/repositories?q=${encodeURIComponent(query)}&per_page=${perPage}&page=${page}&sort=updated`,
      )
      return { total: data.total_count, page, repos: (data.items ?? []).map(shapeRepo), rate: rate ?? null }
    }
    const token = await requireToken()
    const { data, rate } = await call(
      token,
      `/user/repos?per_page=${perPage}&page=${page}&sort=updated&affiliation=owner,collaborator,organization_member`,
    )
    return { total: null, page, repos: (Array.isArray(data) ? data : []).map(shapeRepo), rate: rate ?? null }
  }

  /**
   * Repositories the user has starred.
   *
   * `GET /user/starred` needs a token, but the public `GET /users/{login}/starred`
   * works anonymously, so a tokenless caller still sees public stars when it
   * names a login. Star timestamps come only from the authenticated form; the
   * public form is reordered by nothing and is reported without `starredAt`.
   */
  async function listStarred(args = {}) {
    const perPage = Math.min(Math.max(Number(args.perPage) || 30, 1), 100)
    const page = Math.max(Number(args.page) || 1, 1)
    const token = await tokenIfAny()
    const login = typeof args.user === 'string' ? args.user.trim() : ''

    if (token !== undefined) {
      const { data, rate } = await call(
        token,
        `/user/starred?per_page=${perPage}&page=${page}&sort=created&direction=desc`,
      )
      return {
        scope: 'authenticated',
        page,
        repos: (Array.isArray(data) ? data : []).map(shapeRepo),
        rate: rate ?? null,
      }
    }

    if (login.length > 0) {
      const { data, rate } = await call(
        undefined,
        `/users/${encodeURIComponent(login)}/starred?per_page=${perPage}&page=${page}`,
      )
      return {
        scope: 'public',
        user: login,
        page,
        repos: (Array.isArray(data) ? data : []).map(shapeRepo),
        rate: rate ?? null,
      }
    }

    throw new GithubError(
      'no GitHub token: starred repositories need a token, or name a user to browse their public stars',
      401,
      { tokenMissing: true },
    )
  }

  /** One repository's details. */
  async function repoInfo(args = {}) {
    const { token, target } = await readTarget(args)
    const { data, rate } = await call(token, `/repos/${target.repo}`)
    return {
      ...shapeRepo(data),
      openIssues: data.open_issues_count ?? null,
      language: data.language ?? null,
      rate: rate ?? null,
    }
  }

  /** Branch names with their tip commits. */
  async function listBranches(args = {}) {
    const { token, target } = await readTarget(args)
    const { data } = await call(token, `/repos/${target.repo}/branches?per_page=100`)
    return {
      repo: target.repo,
      branches: (Array.isArray(data) ? data : []).map((entry) => ({
        name: entry.name,
        sha: entry.commit?.sha ?? null,
        protected: entry.protected === true,
      })),
    }
  }

  /** One directory's entries, directories first. */
  async function browse(args = {}) {
    const { token, target } = await readTarget(args)
    const ref = typeof args.ref === 'string' && args.ref.trim().length > 0 ? args.ref.trim() : undefined
    const path = String(args.path ?? '').replace(/^\/+|\/+$/g, '')
    const data = await entryMeta(token, target.repo, path, ref)
    if (!Array.isArray(data)) {
      return {
        repo: target.repo,
        ref: ref ?? null,
        path: data.path,
        kind: 'file',
        file: {
          path: data.path,
          name: data.name,
          size: data.size,
          sha: data.sha,
          downloadUrl: data.download_url ?? null,
        },
        entries: [],
      }
    }
    const entries = data
      .map((entry) => ({
        name: entry.name,
        path: entry.path,
        kind: entry.type === 'dir' ? 'dir' : entry.type === 'symlink' ? 'link' : 'file',
        size: entry.size ?? null,
        sha: entry.sha ?? null,
      }))
      .sort((left, right) => {
        if (left.kind === 'dir' && right.kind !== 'dir') return -1
        if (right.kind === 'dir' && left.kind !== 'dir') return 1
        return left.name.localeCompare(right.name)
      })
    return { repo: target.repo, ref: ref ?? null, path, kind: 'dir', entries }
  }

  /** One file's text, or base64 bytes when it is binary. */
  async function readFile(args = {}) {
    const { token, target } = await readTarget(args)
    const path = String(args.path ?? '').replace(/^\/+|\/+$/g, '')
    if (path.length === 0) throw new GithubError('path is required for a file read', 400)
    const ref = typeof args.ref === 'string' && args.ref.trim().length > 0 ? args.ref.trim() : undefined
    const { meta, buffer } = await fileBytes(token, target.repo, path, ref)
    if (buffer.length > MAX_INLINE_FILE_BYTES) {
      throw new GithubError(`"${path}" is too large to read inline (${buffer.length} bytes)`, 413)
    }
    const binary = looksBinary(buffer)
    return {
      repo: target.repo,
      ref: ref ?? null,
      path: meta.path ?? path,
      sha: meta.sha ?? null,
      size: buffer.length,
      binary,
      text: binary ? null : clip(buffer.toString('utf8')),
      base64: binary ? buffer.toString('base64') : null,
    }
  }

  /** Create or update one file in a single commit. */
  async function writeFile(args = {}) {
    const token = await requireToken()
    const target = await normalizeRepo(token, args.repo)
    const path = String(args.path ?? '').replace(/^\/+|\/+$/g, '')
    if (path.length === 0) throw new GithubError('path is required for an upload', 400)
    let encoded
    if (typeof args.base64 === 'string' && args.base64.length > 0) encoded = args.base64.replace(/\s+/g, '')
    else if (typeof args.text === 'string') encoded = Buffer.from(args.text, 'utf8').toString('base64')
    else throw new GithubError('provide "text" or "base64" content', 400)
    const branch = typeof args.branch === 'string' && args.branch.trim().length > 0 ? args.branch.trim() : undefined
    let sha = typeof args.sha === 'string' && args.sha.length > 0 ? args.sha : undefined
    if (sha === undefined) {
      try {
        const current = await entryMeta(token, target.repo, path, branch)
        if (current !== null && !Array.isArray(current) && typeof current.sha === 'string') sha = current.sha
      } catch (error) {
        if (!(error instanceof GithubError) || error.status !== 404) throw error
      }
    }
    const body = {
      message:
        typeof args.message === 'string' && args.message.trim().length > 0
          ? args.message.trim()
          : `${sha === undefined ? 'Add' : 'Update'} ${path}`,
      content: encoded,
      ...(branch === undefined ? {} : { branch }),
      ...(sha === undefined ? {} : { sha }),
    }
    const { data } = await call(token, `/repos/${target.repo}/contents/${encodePath(path)}`, { method: 'PUT', body })
    return {
      repo: target.repo,
      path,
      created: sha === undefined,
      branch: branch ?? null,
      commit: data.commit?.sha ?? null,
      commitUrl: data.commit?.html_url ?? null,
    }
  }

  /** Upload several files in order, reporting each outcome. */
  async function uploadFiles(args = {}) {
    const files = Array.isArray(args.files) ? args.files : []
    if (files.length === 0) throw new GithubError('files must contain at least one entry', 400)
    const results = []
    for (const file of files) {
      try {
        results.push({ ok: true, ...(await writeFile({ ...args, ...file })) })
      } catch (error) {
        results.push({
          ok: false,
          path: file?.path ?? null,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
    return {
      repo: args.repo,
      total: results.length,
      succeeded: results.filter((entry) => entry.ok).length,
      results,
    }
  }

  /** Open a file or repository archive as a byte stream. */
  async function openDownload(args = {}) {
    const { token, target } = await readTarget(args)
    const path = String(args.path ?? '').replace(/^\/+|\/+$/g, '')
    const ref = typeof args.ref === 'string' && args.ref.trim().length > 0 ? args.ref.trim() : undefined
    if (path.length === 0) {
      const archiveRef = ref ?? 'HEAD'
      const { response } = await call(token, `/repos/${target.repo}/zipball/${encodeURIComponent(archiveRef)}`, {
        raw: true,
      })
      return {
        kind: 'archive',
        filename: `${target.name}-${archiveRef.replace(/[^A-Za-z0-9._-]/g, '_')}.zip`,
        contentType: 'application/zip',
        size: Number(response.headers.get('content-length') ?? 0) || null,
        stream: response.body,
      }
    }
    const { response } = await call(
      token,
      `/repos/${target.repo}/contents/${encodePath(path)}${ref === undefined ? '' : `?ref=${encodeURIComponent(ref)}`}`,
      { accept: 'application/vnd.github.raw', raw: true },
    )
    return {
      kind: 'file',
      path,
      filename: path.split('/').at(-1) ?? path,
      contentType: response.headers.get('content-type') ?? 'application/octet-stream',
      size: Number(response.headers.get('content-length') ?? 0) || null,
      stream: response.body,
    }
  }

  /** Download to a local path, or report how to fetch it (tool-facing). */
  async function download(args = {}) {
    const { token, target } = await readTarget(args)
    const path = String(args.path ?? '').replace(/^\/+|\/+$/g, '')
    const ref = typeof args.ref === 'string' && args.ref.trim().length > 0 ? args.ref.trim() : undefined
    if (typeof args.localPath === 'string' && args.localPath.trim().length > 0) {
      if (path.length === 0) throw new GithubError('a repository archive needs a path-free local writer; pass a file path', 400)
      const { buffer } = await fileBytes(token, target.repo, path, ref)
      const { writeFile: writeLocal, mkdir } = await import('node:fs/promises')
      const { dirname, resolve } = await import('node:path')
      const destination = resolve(args.localPath.trim())
      await mkdir(dirname(destination), { recursive: true })
      await writeLocal(destination, buffer)
      return { repo: target.repo, path, ref: ref ?? null, localPath: destination, bytes: buffer.length, saved: true }
    }
    if (path.length === 0) {
      return {
        repo: target.repo,
        ref: ref ?? 'HEAD',
        kind: 'archive',
        url: `${options.apiBase}/repos/${target.repo}/zipball/${encodeURIComponent(ref ?? 'HEAD')}`,
        hint: 'The panel can stream this archive; pass localPath with a file path to save a single file instead.',
      }
    }
    const meta = await entryMeta(token, target.repo, path, ref)
    if (Array.isArray(meta)) throw new GithubError(`"${path}" is a directory; pass localPath for a file`, 400)
    return {
      repo: target.repo,
      path: meta.path,
      ref: ref ?? null,
      size: meta.size ?? null,
      sha: meta.sha ?? null,
      downloadUrl: meta.download_url ?? null,
      hint: 'Pass localPath to write the bytes to disk.',
    }
  }

  /** Copy a file or directory to a new path inside the same repository. */
  async function copy(args = {}) {
    const token = await requireToken()
    const target = await normalizeRepo(token, args.repo)
    const from = String(args.from ?? '').replace(/^\/+|\/+$/g, '')
    const to = String(args.to ?? '').replace(/^\/+|\/+$/g, '')
    if (from.length === 0 || to.length === 0) throw new GithubError('from and to are both required', 400)
    const ref = typeof args.ref === 'string' && args.ref.trim().length > 0 ? args.ref.trim() : undefined
    const branch = typeof args.branch === 'string' && args.branch.trim().length > 0 ? args.branch.trim() : ref
    const meta = await entryMeta(token, target.repo, from, ref)
    if (!Array.isArray(meta)) {
      // Read the raw bytes: `readFile` clips text for model display, which would
      // silently truncate a copied file.
      const { buffer } = await fileBytes(token, target.repo, from, ref)
      const written = await writeFile({
        repo: target.repo,
        path: to,
        ...(looksBinary(buffer) ? { base64: buffer.toString('base64') } : { text: buffer.toString('utf8') }),
        branch,
        message: args.message ?? `Copy ${from} to ${to}`,
      })
      return { repo: target.repo, copied: 1, files: [written] }
    }
    const treeRef = ref ?? 'HEAD'
    const { data: tree } = await call(token, `/repos/${target.repo}/git/trees/${encodeURIComponent(treeRef)}?recursive=1`)
    const prefix = `${from}/`
    const blobs = (tree.tree ?? []).filter((entry) => entry.type === 'blob' && entry.path.startsWith(prefix))
    if (blobs.length === 0) throw new GithubError(`"${from}" contains no files to copy`, 404)
    if (blobs.length > 200) throw new GithubError(`"${from}" holds ${blobs.length} files; copy at most 200 at a time`, 413)
    const written = []
    for (const blob of blobs) {
      const destination = `${to}/${blob.path.slice(prefix.length)}`
      try {
        const { buffer } = await fileBytes(token, target.repo, blob.path, ref)
        const result = await writeFile({
          repo: target.repo,
          path: destination,
          ...(looksBinary(buffer) ? { base64: buffer.toString('base64') } : { text: buffer.toString('utf8') }),
          branch,
          message: args.message ?? `Copy ${from} to ${to}`,
        })
        written.push({ ok: true, ...result })
      } catch (error) {
        written.push({
          ok: false,
          path: destination,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
    return { repo: target.repo, copied: written.filter((entry) => entry.ok).length, files: written }
  }

  /** Deploy through Actions, a Pages rebuild, or a release. */
  async function deploy(args = {}) {
    const token = await requireToken()
    const target = await normalizeRepo(token, args.repo)
    const mode = typeof args.mode === 'string' && args.mode.length > 0 ? args.mode : 'workflow'
    if (mode === 'workflow') {
      const ref = typeof args.ref === 'string' && args.ref.trim().length > 0 ? args.ref.trim() : undefined
      if (ref === undefined) throw new GithubError('ref (branch or tag) is required to dispatch a workflow', 400)
      const workflow = typeof args.workflow === 'string' && args.workflow.trim().length > 0 ? args.workflow.trim() : undefined
      if (workflow === undefined) throw new GithubError('workflow (file name or id) is required to dispatch', 400)
      const inputs = args.inputs !== null && typeof args.inputs === 'object' ? args.inputs : {}
      await call(token, `/repos/${target.repo}/actions/workflows/${encodeURIComponent(workflow)}/dispatches`, {
        method: 'POST',
        body: { ref, inputs },
      })
      return {
        repo: target.repo,
        mode,
        workflow,
        ref,
        dispatched: true,
        runsUrl: `https://github.com/${target.repo}/actions`,
      }
    }
    if (mode === 'pages') {
      try {
        const { data } = await call(token, `/repos/${target.repo}/pages/builds`, { method: 'POST', body: {} })
        return {
          repo: target.repo,
          mode,
          status: data?.status ?? 'queued',
          pagesUrl: `https://github.com/${target.repo}/pages`,
        }
      } catch (error) {
        if (error instanceof GithubError && error.status === 404) {
          throw new GithubError(`GitHub Pages is not enabled for ${target.repo}`, 404)
        }
        throw error
      }
    }
    if (mode === 'release') {
      const tag = typeof args.tag === 'string' && args.tag.trim().length > 0 ? args.tag.trim() : undefined
      if (tag === undefined) throw new GithubError('tag is required to publish a release', 400)
      const body = {
        tag_name: tag,
        name: typeof args.name === 'string' && args.name.length > 0 ? args.name : tag,
        body: typeof args.body === 'string' ? args.body : '',
        draft: false,
        prerelease: args.prerelease === true,
      }
      if (typeof args.ref === 'string' && args.ref.length > 0) body.target_commitish = args.ref
      const { data } = await call(token, `/repos/${target.repo}/releases`, { method: 'POST', body })
      return { repo: target.repo, mode, tag: data.tag_name, url: data.html_url, releaseId: data.id }
    }
    throw new GithubError(`unknown deploy mode "${mode}"; use workflow, pages, or release`, 400)
  }

  /** Workflow definitions available to dispatch. */
  async function listWorkflows(args = {}) {
    const { token, target } = await readTarget(args)
    const { data } = await call(token, `/repos/${target.repo}/actions/workflows?per_page=100`)
    return {
      repo: target.repo,
      workflows: (data?.workflows ?? []).map((entry) => ({
        id: entry.id,
        name: entry.name,
        path: entry.path,
        state: entry.state,
        file: String(entry.path ?? '').split('/').at(-1) ?? null,
      })),
    }
  }

  /** Recent commits, optionally for one path. */
  async function listCommits(args = {}) {
    const { token, target } = await readTarget(args)
    const ref = typeof args.ref === 'string' && args.ref.trim().length > 0 ? args.ref.trim() : undefined
    const path = String(args.path ?? '').replace(/^\/+|\/+$/g, '')
    const perPage = Math.min(Math.max(Number(args.limit) || 20, 1), 100)
    const query = new URLSearchParams({ per_page: String(perPage) })
    if (ref !== undefined) query.set('sha', ref)
    if (path.length > 0) query.set('path', path)
    const { data } = await call(token, `/repos/${target.repo}/commits?${query.toString()}`)
    return {
      repo: target.repo,
      commits: (Array.isArray(data) ? data : []).map((entry) => ({
        sha: entry.sha,
        shortSha: String(entry.sha ?? '').slice(0, 7),
        message: String(entry.commit?.message ?? '').split('\n')[0],
        author: entry.commit?.author?.name ?? entry.author?.login ?? null,
        date: entry.commit?.author?.date ?? null,
        url: entry.html_url ?? null,
      })),
    }
  }

  /** Create a repository owned by the authenticated account. */
  async function createRepo(args = {}) {
    const token = await requireToken()
    const repoName = typeof args.name === 'string' ? args.name.trim() : ''
    if (repoName.length === 0) throw new GithubError('name is required to create a repository', 400)
    const { data } = await call(token, '/user/repos', {
      method: 'POST',
      body: {
        name: repoName,
        private: args.private === true,
        description: typeof args.description === 'string' ? args.description : '',
        auto_init: args.autoInit === true,
      },
    })
    return { ...shapeRepo(data), created: true }
  }

  return {
    options,
    status,
    saveToken,
    clearToken,
    listRepos,
    listStarred,
    repoInfo,
    listBranches,
    browse,
    readFile,
    writeFile,
    uploadFiles,
    openDownload,
    download,
    copy,
    deploy,
    listWorkflows,
    listCommits,
    createRepo,
    resolveToken,
  }
}

/** Present one tool call in the transcript. */
function presentCall(args) {
  const action = typeof args?.action === 'string' ? args.action : 'github'
  const subject = typeof args?.repo === 'string' && args.repo.length > 0 ? args.repo : ''
  const path = typeof args?.path === 'string' && args.path.length > 0 ? ` · ${args.path}` : ''
  const kind =
    action === 'upload' || action === 'write' || action === 'copy'
      ? 'edit'
      : action === 'deploy'
        ? 'execute'
        : 'fetch'
  return {
    card: 'generic',
    title: subject.length > 0 ? `GitHub ${action}: ${subject}${path}` : `GitHub ${action}`,
    kind,
    rawInput: args,
  }
}

/** The model-facing parameter schema. */
const PARAMETERS = {
  type: 'object',
  properties: {
    action: {
      type: 'string',
      enum: [
        'status',
        'repos',
        'starred',
        'info',
        'branches',
        'browse',
        'read',
        'write',
        'upload',
        'copy',
        'download',
        'deploy',
        'workflows',
        'commits',
        'createRepo',
      ],
      description: 'Operation to run.',
    },
    repo: { type: 'string', description: 'Repository as "owner/name"; a bare name belongs to the authenticated account.' },
    path: { type: 'string', description: 'Repository-relative path. Empty means the repository root.' },
    ref: { type: 'string', description: 'Branch, tag, or commit to read from and to deploy.' },
    branch: { type: 'string', description: 'Branch to write to; defaults to the repository default branch.' },
    query: { type: 'string', description: 'Search text for action "repos".' },
    user: {
      type: 'string',
      description: 'Login whose public stars to read for action "starred" when no token is configured.',
    },
    text: { type: 'string', description: 'Text content for action "write" or "upload".' },
    base64: { type: 'string', description: 'Base64 content for a binary write.' },
    files: {
      type: 'array',
      description: 'Files for action "upload"; each entry needs a path plus text or base64.',
      items: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Repository-relative destination path.' },
          text: { type: 'string', description: 'UTF-8 content.' },
          base64: { type: 'string', description: 'Base64 content.' },
        },
        required: ['path'],
      },
    },
    message: { type: 'string', description: 'Commit message.' },
    from: { type: 'string', description: 'Source path for action "copy".' },
    to: { type: 'string', description: 'Destination path for action "copy".' },
    mode: { type: 'string', enum: ['workflow', 'pages', 'release'], description: 'Deploy mode.' },
    workflow: { type: 'string', description: 'Workflow file name or numeric id for a workflow dispatch.' },
    inputs: { type: 'object', description: 'Workflow dispatch inputs.', additionalProperties: true },
    tag: { type: 'string', description: 'Tag name for a release deploy.' },
    name: { type: 'string', description: 'Repository name for createRepo, or the release name.' },
    description: { type: 'string', description: 'Repository description for createRepo.' },
    private: { type: 'boolean', description: 'Create a private repository.' },
    autoInit: { type: 'boolean', description: 'Initialize the new repository with a README.' },
    limit: { type: 'number', description: 'Maximum commits to list.' },
    page: { type: 'number', description: 'Page number for repository listings.' },
    perPage: { type: 'number', description: 'Page size for repository listings, 1-100.' },
    localPath: { type: 'string', description: 'Local file path to write a downloaded file to.' },
  },
  required: ['action'],
}

/** Register the model-facing GitHub tool over the shared service. */
function registerTool(ctx, service) {
  ctx.tools.register({
    name: 'github',
    description:
      "Manage the user's GitHub account: browse repositories and files, read file contents, upload or update files, copy files inside a repository, download a file to a local path, create a repository, and deploy by dispatching a workflow, rebuilding GitHub Pages, or publishing a release. Requires a configured GitHub token; when none is present the tool reports how to set it.",
    parameters: PARAMETERS,
    output: {
      schema: {},
      render(_args, value) {
        return [{ type: 'text', text: clip(JSON.stringify(value, null, 2)) }]
      },
    },
    presentCall,
    async execute(args) {
      switch (args.action) {
        case 'status':
          return service.status()
        case 'repos':
          return service.listRepos(args)
        case 'starred':
          return service.listStarred(args)
        case 'info':
          return service.repoInfo(args)
        case 'branches':
          return service.listBranches(args)
        case 'browse':
          return service.browse(args)
        case 'read':
          return service.readFile(args)
        case 'write':
          return service.writeFile(args)
        case 'upload':
          return service.uploadFiles(args)
        case 'copy':
          return service.copy(args)
        case 'download':
          return service.download(args)
        case 'deploy':
          return service.deploy(args)
        case 'workflows':
          return service.listWorkflows(args)
        case 'commits':
          return service.listCommits(args)
        case 'createRepo':
          return service.createRepo(args)
        default:
          throw new GithubError(`unknown action "${args.action}"`, 400)
      }
    },
  })
}

/** One JSON response for the panel routes. */
function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

/** Dispatch one panel operation onto the shared service. */
async function runPanelOp(service, op, body) {
  switch (op) {
    case 'status':
      return service.status()
    case 'saveToken':
      return service.saveToken(body.token)
    case 'clearToken':
      return service.clearToken()
    case 'repos':
      return service.listRepos(body)
    case 'starred':
      return service.listStarred(body)
    case 'info':
      return service.repoInfo(body)
    case 'branches':
      return service.listBranches(body)
    case 'browse':
      return service.browse(body)
    case 'read':
      return service.readFile(body)
    case 'write':
      return service.writeFile(body)
    case 'upload':
      return service.uploadFiles(body)
    case 'copy':
      return service.copy(body)
    case 'deploy':
      return service.deploy(body)
    case 'workflows':
      return service.listWorkflows(body)
    case 'commits':
      return service.listCommits(body)
    case 'createRepo':
      return service.createRepo(body)
    default:
      throw new GithubError(`unknown operation "${op}"`, 400)
  }
}

/** Register the authenticated routes the Web panel calls. */
function registerRoutes(ctx, service) {
  ctx.inject(['connection'], (injected) => {
    const connection = injected.connection
    injected.effect(
      () =>
        connection.fetch.register({
          path: '/api/github/rpc',
          methods: ['POST'],
          requestBody: 'buffered',
          async fetch(request) {
            let body
            try {
              body = await request.json()
            } catch {
              return jsonResponse({ ok: false, error: 'body is not JSON' }, 400)
            }
            const op = typeof body?.op === 'string' ? body.op : ''
            try {
              return jsonResponse({ ok: true, value: await runPanelOp(service, op, body ?? {}) })
            } catch (error) {
              const status = error instanceof GithubError && error.status >= 400 && error.status <= 599 ? error.status : 500
              return jsonResponse(
                {
                  ok: false,
                  error: error instanceof Error ? error.message : String(error),
                  tokenMissing: error?.tokenMissing === true,
                },
                status,
              )
            }
          },
        }),
      'github: panel rpc route',
    )
    injected.effect(
      () =>
        connection.fetch.register({
          path: '/api/github/download',
          methods: ['GET', 'HEAD'],
          requestBody: 'buffered',
          async fetch(request) {
            const url = new URL(request.url)
            try {
              const file = await service.openDownload({
                repo: url.searchParams.get('repo') ?? '',
                path: url.searchParams.get('path') ?? '',
                ref: url.searchParams.get('ref') ?? '',
              })
              if (request.method === 'HEAD') return new Response(null, { status: 200 })
              return new Response(file.stream, {
                status: 200,
                headers: {
                  'content-type': file.contentType ?? 'application/octet-stream',
                  'content-disposition': `attachment; filename="${file.filename}"`,
                  'cache-control': 'no-store',
                },
              })
            } catch (error) {
              const status = error instanceof GithubError && error.status >= 400 && error.status <= 599 ? error.status : 500
              return jsonResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }, status)
            }
          },
        }),
      'github: panel download route',
    )
  })
}

/** Plugin entry. */
export function apply(ctx, config) {
  const service = createService(ctx, config ?? {})
  registerTool(ctx, service)
  registerRoutes(ctx, service)
}
