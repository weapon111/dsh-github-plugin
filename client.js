window.__ModuleLoader__.load({
  id: '@local/github',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'github'

    /** The Client context, captured so components can read the locale service. */
    const ctxRef = { current: undefined }

    /** Dictionaries registered through the Client locale service. */
    const DICTS = {
      zh: {
        'sidebar.label': 'GitHub',
        'panel.title': 'GitHub 仓库',
        'panel.subtitle': '浏览、上传、下载、部署与复制仓库文件',
        'tab.repos': '仓库',
        'tab.starred': '星标',
        'tab.files': '文件',
        'tab.deploy': '部署',
        'tab.token': '令牌',
        'action.refresh': '刷新',
        'action.search': '搜索仓库后回车',
        'action.download': '下载',
        'action.downloadZip': '下载 ZIP',
        'action.copy': '复制',
        'action.save': '保存',
        'action.clear': '删除',
        'action.deploy': '开始部署',
        'action.createRepo': '新建仓库',
        'field.ref': '分支或标签',
        'field.mode': '部署方式',
        'field.workflow': '工作流',
        'field.tag': '标签名',
        'field.token': 'GitHub 令牌',
        'field.name': '仓库名称',
        'field.private': '私有仓库',
        'field.to': '目标路径',
        'mode.workflow': '触发 Actions 工作流',
        'mode.pages': '重建 GitHub Pages',
        'mode.release': '发布 Release',
        'state.loading': '加载中…',
        'state.empty': '暂无内容',
        'state.noToken': '尚未配置 GitHub 令牌',
        'hint.search': '没有令牌时，仍可用搜索框浏览公开仓库。',
        'hint.token': '令牌保存在本机凭据文件中，只会发送给 GitHub。',
        'label.private': '私有',
        'label.public': '公开',
        'label.saved': '已保存',
        'label.deployed': '部署已提交',
        'label.copied': '复制完成',
        'label.uploaded': '上传完成',
        'label.commits': '提交',
        'starred.scope': '以下是你账号加星标的仓库，最近加星的排在前面。',
        'starred.publicOnly': '未配置令牌，只能读取公开星标仓库。',
        'starred.empty': '这个账号还没有加星标的仓库',
      },
      en: {
        'sidebar.label': 'GitHub',
        'panel.title': 'GitHub repositories',
        'panel.subtitle': 'Browse, upload, download, deploy, and copy repository files',
        'tab.repos': 'Repositories',
        'tab.starred': 'Starred',
        'tab.files': 'Files',
        'tab.deploy': 'Deploy',
        'tab.token': 'Token',
        'action.refresh': 'Refresh',
        'action.search': 'Search repositories, then press Enter',
        'action.download': 'Download',
        'action.downloadZip': 'Download ZIP',
        'action.copy': 'Copy',
        'action.save': 'Save',
        'action.clear': 'Remove',
        'action.deploy': 'Deploy',
        'action.createRepo': 'New repository',
        'field.ref': 'Branch or tag',
        'field.mode': 'Deploy mode',
        'field.workflow': 'Workflow',
        'field.tag': 'Tag',
        'field.token': 'GitHub token',
        'field.name': 'Repository name',
        'field.private': 'Private repository',
        'field.to': 'Destination path',
        'mode.workflow': 'Dispatch an Actions workflow',
        'mode.pages': 'Rebuild GitHub Pages',
        'mode.release': 'Publish a release',
        'state.loading': 'Loading…',
        'state.empty': 'Nothing here yet',
        'state.noToken': 'No GitHub token configured',
        'hint.search': 'Without a token you can still search public repositories.',
        'hint.token': 'The token is stored in the local credential file and only sent to GitHub.',
        'label.private': 'Private',
        'label.public': 'Public',
        'label.saved': 'Saved',
        'label.deployed': 'Deploy submitted',
        'label.copied': 'Copied',
        'label.uploaded': 'Uploaded',
        'label.commits': 'Commits',
        'starred.scope': 'Repositories starred by your account, most recently starred first.',
        'starred.publicOnly': 'No token configured: only public starred repositories are readable.',
        'starred.empty': 'This account has not starred any repository yet',
      },
    }

    const CSS = [
      '.gh-root{display:flex;flex-direction:column;height:100%;min-height:0;color:var(--dsw-alias-label-primary)}',
      '.gh-head{display:flex;align-items:flex-start;gap:12px;padding:calc(20px + var(--dsh-frame-top-clearance,0px)) 24px 12px;border-bottom:1px solid var(--dsw-alias-border-l1)}',
      '.gh-title{font-size:16px;font-weight:600;line-height:1.3}',
      '.gh-sub{margin-top:2px;font-size:12px;color:var(--dsw-alias-label-secondary)}',
      '.gh-tabs{display:flex;gap:4px;padding:8px 24px 0;border-bottom:1px solid var(--dsw-alias-border-l1)}',
      '.gh-tab{appearance:none;border:none;background:transparent;color:var(--dsw-alias-label-secondary);font-family:inherit;font-size:13px;padding:6px 10px;border-radius:6px 6px 0 0;cursor:pointer;border-bottom:2px solid transparent}',
      '.gh-tab:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}',
      '.gh-tab[data-active=true]{color:var(--dsw-alias-brand-primary);border-bottom-color:var(--dsw-alias-brand-primary)}',
      '.gh-body{flex:1;min-height:0;display:flex;overflow:hidden}',
      '.gh-side{width:280px;flex:none;border-right:1px solid var(--dsw-alias-border-l1);display:flex;flex-direction:column;min-height:0}',
      '.gh-main{flex:1;min-width:0;overflow:auto;padding:16px 20px 40px}',
      '.gh-row{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:6px;font-size:13px;cursor:pointer;border:none;background:transparent;color:inherit;font-family:inherit;text-align:left;width:100%}',
      '.gh-row:hover{background:var(--dsw-alias-bg-layer-2)}',
      '.gh-row[data-active=true]{background:var(--dsw-alias-bg-layer-2)}',
      '.gh-row-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.gh-tag{font-size:11px;color:var(--dsw-alias-label-secondary);border:1px solid var(--dsw-alias-border-l1);border-radius:999px;padding:0 6px;flex:none}',
      '.gh-input,.gh-select{width:100%;box-sizing:border-box;font-family:inherit;font-size:13px;color:inherit;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:6px;padding:7px 9px;outline:none}',
      '.gh-input:focus,.gh-select:focus{border-color:var(--dsw-alias-brand-primary)}',
      '.gh-btn{appearance:none;font-family:inherit;font-size:12px;padding:6px 12px;border-radius:6px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);cursor:pointer;text-decoration:none;display:inline-block}',
      '.gh-btn:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}',
      '.gh-btn:disabled{opacity:.5;cursor:default}',
      '.gh-btn[data-kind=primary]{background:var(--dsw-alias-brand-primary);border-color:transparent;color:#fff}',
      '.gh-field{display:flex;flex-direction:column;gap:5px;margin-bottom:12px}',
      '.gh-label{font-size:12px;color:var(--dsw-alias-label-secondary)}',
      '.gh-line{display:flex;gap:8px;align-items:center;flex-wrap:wrap}',
      '.gh-note{font-size:12px;color:var(--dsw-alias-label-secondary);line-height:1.5}',
      '.gh-error{font-size:12px;color:var(--dsw-alias-state-error-primary);white-space:pre-wrap;line-height:1.5}',
      '.gh-ok{font-size:12px;color:var(--dsw-alias-state-success-primary)}',
      '.gh-pre{margin:0;font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:12px;line-height:1.55;white-space:pre-wrap;word-break:break-word;background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:12px;max-height:460px;overflow:auto}',
      '.gh-card{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:12px;background:var(--dsw-alias-bg-layer-1);margin-bottom:12px}',
      '.gh-scroll{overflow:auto;min-height:0;flex:1;padding:8px}',
      '.gh-empty{padding:24px 10px;font-size:12px;color:var(--dsw-alias-label-secondary);text-align:center}',
      '.gh-crumbs{display:flex;gap:4px;align-items:center;flex-wrap:wrap;font-size:12px;color:var(--dsw-alias-label-secondary);margin-bottom:12px}',
      '.gh-crumb{appearance:none;border:none;background:transparent;color:var(--dsw-alias-brand-primary);font-family:inherit;font-size:12px;cursor:pointer;padding:0}',
    ].join('\n')

    /** Resolve a document-relative API URL so a mounted subpath keeps working. */
    function apiUrl(pathname) {
      try {
        return new URL(pathname, document.baseURI).href
      } catch {
        return pathname
      }
    }

    /** Run one panel operation through the authenticated Host route. */
    async function rpc(op, payload) {
      const response = await fetch(apiUrl('api/github/rpc'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ op, ...(payload ?? {}) }),
      })
      let body = null
      try {
        body = await response.json()
      } catch {
        body = null
      }
      if (body === null) throw new Error(`GitHub request failed (${response.status})`)
      if (body.ok !== true) throw new Error(body.error ?? `GitHub request failed (${response.status})`)
      return body.value
    }

    /** Read one local file as base64 for an upload. */
    function readBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = String(reader.result ?? '')
          const comma = result.indexOf(',')
          resolve(comma < 0 ? '' : result.slice(comma + 1))
        }
        reader.onerror = () => reject(reader.error ?? new Error('could not read the file'))
        reader.readAsDataURL(file)
      })
    }

    /** Join a directory path and a file name. */
    function joinPath(base, name) {
      return base.length === 0 ? name : `${base}/${name}`
    }

    /**
     * Translate one key, never returning the bare key.
     *
     * `bind(ns)(key)` returns the key itself when the dictionary is missing, so
     * a non-empty result proves nothing. Fall back to the English dictionary
     * first and to the key only when even that is absent.
     */
    function translate(ctx, key) {
      const locale = ctx?.get?.('locale')
      if (locale !== undefined) {
        try {
          const text = locale.bind(NS)(key)
          if (typeof text === 'string' && text.length > 0 && text !== key) return text
        } catch {
          // A locale failure must not blank the UI.
        }
      }
      return DICTS.en[key] ?? key
    }

    /** Sidebar icon: the panel's own mark, drawn from local geometry. */
    function GithubIcon(props) {
      const size = props?.size ?? 16
      const active = props?.active === true
      return h(
        'svg',
        {
          viewBox: '0 0 16 16',
          width: size,
          height: size,
          fill: 'none',
          stroke: active ? 'var(--dsw-alias-brand-primary)' : 'currentColor',
          strokeWidth: 1.35,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
          style: { display: 'block', flex: 'none' },
        },
        h('path', { d: 'M5.4 13.6c-2.4.7-2.4-1.4-3.4-1.7' }),
        h('path', {
          d: 'M5.4 14v-1.9c0-.5.1-.9.4-1.2-1.9-.2-3.2-1.1-3.2-3.4 0-.8.3-1.5.8-2-.1-.3-.4-1.1.1-2.1 0 0 .7-.2 2.2.8a7 7 0 0 1 3.7 0c1.5-1 2.2-.8 2.2-.8.5 1 .2 1.8.1 2.1.5.5.8 1.2.8 2 0 2.3-1.3 3.2-3.2 3.4.3.3.4.7.4 1.2V14',
        }),
      )
    }

    /** The GitHub management page rendered in the main column. */
    function GithubPanel() {
      const [localeTick, setLocaleTick] = React.useState(0)
      const [tab, setTab] = React.useState('repos')
      const [status, setStatus] = React.useState(null)
      const [repos, setRepos] = React.useState([])
      const [starred, setStarred] = React.useState([])
      const [starredScope, setStarredScope] = React.useState(null)
      const starredLoaded = React.useRef(false)
      const [query, setQuery] = React.useState('')
      const [repo, setRepo] = React.useState('')
      const [branch, setBranch] = React.useState('')
      const [treePath, setTreePath] = React.useState('')
      const [entries, setEntries] = React.useState([])
      const [file, setFile] = React.useState(null)
      const [workflows, setWorkflows] = React.useState([])
      const [commits, setCommits] = React.useState([])
      const [busy, setBusy] = React.useState('')
      const [error, setError] = React.useState('')
      const [notice, setNotice] = React.useState('')
      const [tokenDraft, setTokenDraft] = React.useState('')
      const [deployMode, setDeployMode] = React.useState('workflow')
      const [deployRef, setDeployRef] = React.useState('')
      const [deployTag, setDeployTag] = React.useState('')
      const [deployWorkflow, setDeployWorkflow] = React.useState('')
      const [copyTo, setCopyTo] = React.useState('')
      const [newRepoName, setNewRepoName] = React.useState('')
      const [newRepoPrivate, setNewRepoPrivate] = React.useState(false)
      const uploadInput = React.useRef(null)

      /** Translate through the Client locale service, re-reading on every switch. */
      const tr = React.useCallback(
        (key) => {
          void localeTick
          return translate(ctxRef.current, key)
        },
        [localeTick],
      )

      React.useEffect(() => {
        const locale = ctxRef.current?.get?.('locale')
        if (locale === undefined) return undefined
        return locale.subscribe(() => setLocaleTick((value) => value + 1))
      }, [])

      const fail = React.useCallback((err) => {
        setBusy('')
        setError(err instanceof Error ? err.message : String(err))
      }, [])

      /** Load the account status, then the repository list. */
      const refreshStatus = React.useCallback(async () => {
        setError('')
        setNotice('')
        setBusy('status')
        try {
          const value = await rpc('status')
          setStatus(value)
          if (value?.authenticated === true) {
            const list = await rpc('repos', { perPage: 50 })
            setRepos(Array.isArray(list?.repos) ? list.repos : [])
          } else {
            setRepos([])
          }
          setBusy('')
        } catch (err) {
          fail(err)
        }
      }, [fail])

      React.useEffect(() => {
        refreshStatus()
      }, [refreshStatus])

      /**
       * Load the account's starred repositories into the Starred tab.
       *
       * `busy` is deliberately not consulted by the auto-load effect below: this
       * function sets `busy = 'starred'` itself, so a `busy` dependency would
       * make the guard false immediately and re-enter on every render.
       */
      const loadStarred = React.useCallback(async () => {
        setBusy('starred')
        setError('')
        try {
          const value = await rpc('starred', { perPage: 50 })
          setStarred(Array.isArray(value?.repos) ? value.repos : [])
          setStarredScope(value?.scope ?? null)
          setBusy('')
        } catch (err) {
          fail(err)
        }
      }, [fail])

      // Auto-load once per mounted panel; the Refresh button re-runs it on demand.
      React.useEffect(() => {
        if (tab === 'starred' && !starredLoaded.current) {
          starredLoaded.current = true
          loadStarred()
        }
      }, [tab, loadStarred])

      /** Open a repository, its root tree, its workflows, and its commits. */
      const openRepo = React.useCallback(
        async (fullName) => {
          setError('')
          setNotice('')
          setBusy('browse')
          try {
            setRepo(fullName)
            setTreePath('')
            setFile(null)
            setTab('files')
            const info = await rpc('info', { repo: fullName })
            const resolvedBranch = info?.defaultBranch ?? ''
            setBranch(resolvedBranch)
            setDeployRef(resolvedBranch)
            const listing = await rpc('browse', { repo: fullName, path: '', ref: resolvedBranch })
            setEntries(Array.isArray(listing?.entries) ? listing.entries : [])
            const [workflowList, commitList] = await Promise.all([
              rpc('workflows', { repo: fullName }).catch(() => ({ workflows: [] })),
              rpc('commits', { repo: fullName, ref: resolvedBranch, limit: 15 }).catch(() => ({ commits: [] })),
            ])
            const found = Array.isArray(workflowList?.workflows) ? workflowList.workflows : []
            setWorkflows(found)
            setDeployWorkflow(found[0]?.file ?? '')
            setCommits(Array.isArray(commitList?.commits) ? commitList.commits : [])
            setBusy('')
          } catch (err) {
            fail(err)
          }
        },
        [fail],
      )

      /** Walk into one directory of the current repository. */
      const navigate = React.useCallback(
        async (nextPath) => {
          if (repo.length === 0) return
          setBusy('browse')
          setError('')
          try {
            setTreePath(nextPath)
            setFile(null)
            const listing = await rpc('browse', { repo, path: nextPath, ref: branch })
            setEntries(Array.isArray(listing?.entries) ? listing.entries : [])
            setBusy('')
          } catch (err) {
            fail(err)
          }
        },
        [repo, branch, fail],
      )

      /** Show one file's preview. */
      const openFile = React.useCallback(
        async (entry) => {
          setBusy('read')
          setError('')
          try {
            setFile(await rpc('read', { repo, path: entry.path, ref: branch }))
            setBusy('')
          } catch (err) {
            fail(err)
          }
        },
        [repo, branch, fail],
      )

      /** Upload the chosen local files into the current directory. */
      const uploadChosen = React.useCallback(
        async (fileList) => {
          const chosen = Array.from(fileList ?? [])
          if (chosen.length === 0) return
          setBusy('upload')
          setError('')
          setNotice('')
          try {
            const files = []
            for (const item of chosen) {
              files.push({ path: joinPath(treePath, item.name), base64: await readBase64(item) })
            }
            const result = await rpc('upload', {
              repo,
              files,
              branch: branch.length > 0 ? branch : undefined,
              message: files.length === 1 ? `Upload ${files[0].path}` : `Upload ${files.length} files`,
            })
            const failed = (result?.results ?? []).filter((entry) => entry.ok !== true)
            if (failed.length > 0) setError(failed.map((entry) => `${entry.path}: ${entry.error}`).join('\n'))
            else setNotice(`${tr('label.uploaded')} · ${result?.succeeded ?? files.length}`)
            setBusy('')
            await navigate(treePath)
          } catch (err) {
            fail(err)
          }
        },
        [repo, branch, treePath, navigate, fail, tr],
      )

      /** Copy the previewed file to another path in the same repository. */
      const copyFile = React.useCallback(async () => {
        if (file === null || copyTo.trim().length === 0) return
        setBusy('copy')
        setError('')
        try {
          await rpc('copy', {
            repo,
            from: file.path,
            to: copyTo.trim(),
            branch: branch.length > 0 ? branch : undefined,
            message: `Copy ${file.path} to ${copyTo.trim()}`,
          })
          setNotice(tr('label.copied'))
          setCopyTo('')
          setBusy('')
          await navigate(treePath)
        } catch (err) {
          fail(err)
        }
      }, [repo, branch, file, copyTo, navigate, fail, tr])

      /** Save the pasted token. */
      const saveToken = React.useCallback(async () => {
        setBusy('token')
        setError('')
        try {
          await rpc('saveToken', { token: tokenDraft })
          setTokenDraft('')
          setNotice(tr('label.saved'))
          setBusy('')
          await refreshStatus()
        } catch (err) {
          fail(err)
        }
      }, [tokenDraft, refreshStatus, fail, tr])

      /** Remove the stored token. */
      const clearToken = React.useCallback(async () => {
        setBusy('token')
        setError('')
        try {
          await rpc('clearToken')
          setBusy('')
          await refreshStatus()
        } catch (err) {
          fail(err)
        }
      }, [refreshStatus, fail])

      /** Submit the chosen deploy gesture. */
      const runDeploy = React.useCallback(async () => {
        setBusy('deploy')
        setError('')
        try {
          const value = await rpc('deploy', {
            repo,
            mode: deployMode,
            ref: deployRef.trim().length > 0 ? deployRef.trim() : branch,
            workflow: deployMode === 'workflow' ? deployWorkflow : undefined,
            tag: deployMode === 'release' ? deployTag.trim() : undefined,
            inputs: {},
          })
          setNotice(`${tr('label.deployed')}: ${value?.mode ?? deployMode}`)
          setBusy('')
        } catch (err) {
          fail(err)
        }
      }, [repo, deployMode, deployRef, branch, deployWorkflow, deployTag, fail, tr])

      /** Create a repository for the authenticated account. */
      const createRepo = React.useCallback(async () => {
        if (newRepoName.trim().length === 0) return
        setBusy('create')
        setError('')
        try {
          const value = await rpc('createRepo', {
            name: newRepoName.trim(),
            private: newRepoPrivate,
            description: '',
            autoInit: true,
          })
          setNewRepoName('')
          setBusy('')
          setNotice(`${tr('action.createRepo')}: ${value?.fullName ?? ''}`)
          await refreshStatus()
        } catch (err) {
          fail(err)
        }
      }, [newRepoName, newRepoPrivate, refreshStatus, fail, tr])

      const authenticated = status?.authenticated === true
      const crumbs = treePath.length === 0 ? [] : treePath.split('/')
      const downloadHref = (path) =>
        apiUrl(
          `api/github/download?repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(path ?? '')}&ref=${encodeURIComponent(branch)}`,
        )

      return h(
        'div',
        { className: 'gh-root' },
        h('style', null, CSS),
        h(
          'div',
          { className: 'gh-head' },
          h(
            'div',
            { style: { flex: 1, minWidth: 0 } },
            h('div', { className: 'gh-title' }, tr('panel.title')),
            h('div', { className: 'gh-sub' }, tr('panel.subtitle')),
          ),
          h(
            'div',
            { className: 'gh-line' },
            status?.login != null ? h('span', { className: 'gh-tag' }, `@${status.login}`) : null,
            h(
              'button',
              { className: 'gh-btn', type: 'button', disabled: busy.length > 0, onClick: refreshStatus },
              tr('action.refresh'),
            ),
          ),
        ),
        h(
          'div',
          { className: 'gh-tabs' },
          ...[
            ['repos', 'tab.repos'],
            ['starred', 'tab.starred'],
            ['files', 'tab.files'],
            ['deploy', 'tab.deploy'],
            ['token', 'tab.token'],
          ].map(([id, key]) =>
            h(
              'button',
              {
                key: id,
                type: 'button',
                className: 'gh-tab',
                'data-active': tab === id ? 'true' : 'false',
                onClick: () => setTab(id),
              },
              tr(key),
            ),
          ),
        ),
        h(
          'div',
          { className: 'gh-body' },
          tab === 'repos' || tab === 'files'
            ? h(
                'div',
                { className: 'gh-side' },
                h(
                  'div',
                  { style: { padding: 10, borderBottom: '1px solid var(--dsw-alias-border-l1)' } },
                  h('input', {
                    className: 'gh-input',
                    placeholder: tr('action.search'),
                    value: query,
                    onChange: (event) => setQuery(event.target.value),
                    onKeyDown: (event) => {
                      if (event.key !== 'Enter') return
                      const text = query.trim()
                      if (text.length === 0) return
                      setBusy('repos')
                      setError('')
                      rpc('repos', { query: text, perPage: 30 })
                        .then((value) => {
                          setRepos(Array.isArray(value?.repos) ? value.repos : [])
                          setBusy('')
                        })
                        .catch(fail)
                    },
                  }),
                ),
                h(
                  'div',
                  { className: 'gh-scroll' },
                  busy === 'repos' || busy === 'status'
                    ? h('div', { className: 'gh-empty' }, tr('state.loading'))
                    : repos.length === 0
                      ? h(
                          'div',
                          { className: 'gh-empty' },
                          authenticated ? tr('state.empty') : `${tr('state.noToken')} · ${tr('hint.search')}`,
                        )
                      : repos.map((entry) =>
                          h(
                            'button',
                            {
                              key: entry.fullName,
                              type: 'button',
                              className: 'gh-row',
                              'data-active': repo === entry.fullName ? 'true' : 'false',
                              onClick: () => openRepo(entry.fullName),
                              title: entry.description ?? entry.fullName,
                            },
                            h('span', { className: 'gh-row-name' }, entry.name),
                            h(
                              'span',
                              { className: 'gh-tag' },
                              entry.private ? tr('label.private') : tr('label.public'),
                            ),
                          ),
                        ),
                ),
              )
            : null,
          h(
            'div',
            { className: 'gh-main' },
            error.length > 0
              ? h('div', { className: 'gh-card' }, h('div', { className: 'gh-error' }, error))
              : null,
            notice.length > 0
              ? h('div', { className: 'gh-card' }, h('div', { className: 'gh-ok' }, notice))
              : null,
            busy.length > 0 && busy !== 'repos' && busy !== 'status'
              ? h('div', { className: 'gh-note', style: { marginBottom: 10 } }, tr('state.loading'))
              : null,

            tab === 'token'
              ? h(
                  'div',
                  { className: 'gh-card' },
                  h(
                    'div',
                    { className: 'gh-field' },
                    h('span', { className: 'gh-label' }, tr('field.token')),
                    h('input', {
                      className: 'gh-input',
                      type: 'password',
                      autoComplete: 'off',
                      placeholder: 'ghp_… / github_pat_…',
                      value: tokenDraft,
                      onChange: (event) => setTokenDraft(event.target.value),
                    }),
                  ),
                  h(
                    'div',
                    { className: 'gh-line' },
                    h(
                      'button',
                      {
                        className: 'gh-btn',
                        'data-kind': 'primary',
                        type: 'button',
                        disabled: busy.length > 0 || tokenDraft.trim().length === 0,
                        onClick: saveToken,
                      },
                      tr('action.save'),
                    ),
                    h(
                      'button',
                      { className: 'gh-btn', type: 'button', disabled: busy.length > 0, onClick: clearToken },
                      tr('action.clear'),
                    ),
                  ),
                  h('div', { className: 'gh-note', style: { marginTop: 10 } }, tr('hint.token')),
                  tr('hint.search') !== 'hint.search'
                    ? h('div', { className: 'gh-note' }, tr('hint.search'))
                    : null,
                  status?.tokenRef != null
                    ? h(
                        'div',
                        { className: 'gh-note' },
                        `${status.tokenRef}${status.tokenSource ? ` · ${status.tokenSource}` : ''}`,
                      )
                    : null,
                  status?.rate?.remaining != null
                    ? h(
                        'div',
                        { className: 'gh-note' },
                        `API ${status.rate.remaining}/${status.rate.limit ?? '?'} · ${status.rate.resetAt ?? ''}`,
                      )
                    : null,
                )
              : null,

            tab === 'starred'
              ? h(
                  'div',
                  null,
                  h(
                    'div',
                    { className: 'gh-line', style: { marginBottom: 12 } },
                    h(
                      'button',
                      {
                        className: 'gh-btn',
                        type: 'button',
                        disabled: busy.length > 0,
                        onClick: () => {
                          starredLoaded.current = true
                          loadStarred()
                        },
                      },
                      tr('action.refresh'),
                    ),
                    h(
                      'span',
                      { className: 'gh-note' },
                      starredScope === 'public' ? tr('starred.publicOnly') : tr('starred.scope'),
                    ),
                  ),
                  starred.length === 0
                    ? h(
                        'div',
                        { className: 'gh-empty' },
                        busy === 'starred' ? tr('state.loading') : tr('starred.empty'),
                      )
                    : h(
                        'div',
                        { className: 'gh-card', style: { padding: 4 } },
                        ...starred.map((entry) =>
                          h(
                            'button',
                            {
                              key: entry.fullName,
                              type: 'button',
                              className: 'gh-row',
                              onClick: () => openRepo(entry.fullName),
                              title: entry.description ?? entry.fullName,
                            },
                            h('span', { style: { flex: 'none', color: 'var(--dsw-alias-state-warn-primary)' } }, '★'),
                            h('span', { className: 'gh-row-name' }, entry.fullName),
                            h(
                              'span',
                              { className: 'gh-tag' },
                              entry.private ? tr('label.private') : tr('label.public'),
                            ),
                          ),
                        ),
                      ),
                )
              : null,

            tab === 'repos'
              ? h(
                  'div',
                  null,
                  repo.length === 0
                    ? h('div', { className: 'gh-empty' }, authenticated ? tr('state.empty') : tr('state.noToken'))
                    : h(
                        'div',
                        { className: 'gh-card' },
                        h('div', { className: 'gh-title', style: { fontSize: 14 } }, repo),
                        h(
                          'div',
                          { className: 'gh-sub' },
                          `${tr('field.ref')}: ${branch || '—'}${
                            status?.rate?.remaining != null ? ` · API ${status.rate.remaining}` : ''
                          }`,
                        ),
                        h(
                          'div',
                          { className: 'gh-line', style: { marginTop: 10 } },
                          h(
                            'button',
                            { className: 'gh-btn', type: 'button', onClick: () => setTab('files') },
                            tr('tab.files'),
                          ),
                          h('a', { className: 'gh-btn', href: downloadHref('') }, tr('action.downloadZip')),
                        ),
                      ),
                  h(
                    'div',
                    { className: 'gh-card' },
                    h('div', { className: 'gh-label', style: { marginBottom: 8 } }, tr('action.createRepo')),
                    h(
                      'div',
                      { className: 'gh-line' },
                      h('input', {
                        className: 'gh-input',
                        style: { flex: 1, minWidth: 160 },
                        placeholder: tr('field.name'),
                        value: newRepoName,
                        onChange: (event) => setNewRepoName(event.target.value),
                      }),
                      h(
                        'label',
                        { className: 'gh-note', style: { display: 'flex', gap: 6, alignItems: 'center' } },
                        h('input', {
                          type: 'checkbox',
                          checked: newRepoPrivate,
                          onChange: (event) => setNewRepoPrivate(event.target.checked),
                        }),
                        tr('field.private'),
                      ),
                      h(
                        'button',
                        {
                          className: 'gh-btn',
                          type: 'button',
                          disabled: busy.length > 0 || newRepoName.trim().length === 0,
                          onClick: createRepo,
                        },
                        tr('action.createRepo'),
                      ),
                    ),
                  ),
                  commits.length > 0
                    ? h(
                        'div',
                        { className: 'gh-card' },
                        h('div', { className: 'gh-label', style: { marginBottom: 8 } }, tr('label.commits')),
                        ...commits.map((entry) =>
                          h(
                            'div',
                            { key: entry.sha, className: 'gh-note', style: { padding: '3px 0' } },
                            `${entry.shortSha} · ${entry.message} · ${entry.author ?? ''}`,
                          ),
                        ),
                      )
                    : null,
                )
              : null,

            tab === 'files'
              ? h(
                  'div',
                  null,
                  repo.length === 0
                    ? h('div', { className: 'gh-empty' }, tr('state.empty'))
                    : h(
                        'div',
                        null,
                        h(
                          'div',
                          { className: 'gh-crumbs' },
                          h(
                            'button',
                            { type: 'button', className: 'gh-crumb', onClick: () => navigate('') },
                            `${repo} / ${tr('tab.files')}`,
                          ),
                          ...crumbs.map((segment, index) =>
                            h(
                              'span',
                              { key: `${segment}-${index}` },
                              '› ',
                              h(
                                'button',
                                {
                                  type: 'button',
                                  className: 'gh-crumb',
                                  onClick: () => navigate(crumbs.slice(0, index + 1).join('/')),
                                },
                                segment,
                              ),
                            ),
                          ),
                        ),
                        h(
                          'div',
                          { className: 'gh-line', style: { marginBottom: 12 } },
                          h(
                            'button',
                            {
                              className: 'gh-btn',
                              type: 'button',
                              disabled: busy.length > 0,
                              onClick: () => uploadInput.current?.click(),
                            },
                            tr('action.upload'),
                          ),
                          h('input', {
                            ref: uploadInput,
                            type: 'file',
                            multiple: true,
                            style: { display: 'none' },
                            onChange: (event) => {
                              uploadChosen(event.target.files).finally(() => {
                                if (uploadInput.current) uploadInput.current.value = ''
                              })
                            },
                          }),
                          h('a', { className: 'gh-btn', href: downloadHref(treePath) }, tr('action.downloadZip')),
                        ),
                        entries.length === 0
                          ? h(
                              'div',
                              { className: 'gh-empty' },
                              busy === 'browse' ? tr('state.loading') : tr('state.empty'),
                            )
                          : h(
                              'div',
                              { className: 'gh-card', style: { padding: 4 } },
                              ...entries.map((entry) =>
                                h(
                                  'button',
                                  {
                                    key: entry.path,
                                    type: 'button',
                                    className: 'gh-row',
                                    onClick: () => (entry.kind === 'dir' ? navigate(entry.path) : openFile(entry)),
                                    title: entry.path,
                                  },
                                  h(
                                    'span',
                                    { style: { width: 14, flex: 'none', color: 'var(--dsw-alias-label-secondary)' } },
                                    entry.kind === 'dir' ? '▸' : '·',
                                  ),
                                  h('span', { className: 'gh-row-name' }, entry.name),
                                  entry.size != null
                                    ? h('span', { className: 'gh-tag' }, `${entry.size} B`)
                                    : null,
                                ),
                              ),
                            ),
                        file !== null
                          ? h(
                              'div',
                              { style: { marginTop: 14 } },
                              h('div', { className: 'gh-label', style: { marginBottom: 6 } }, file.path),
                              h(
                                'div',
                                { className: 'gh-line', style: { marginBottom: 10 } },
                                h('a', { className: 'gh-btn', href: downloadHref(file.path) }, tr('action.download')),
                                h('input', {
                                  className: 'gh-input',
                                  style: { flex: 1, minWidth: 140 },
                                  placeholder: tr('field.to'),
                                  value: copyTo,
                                  onChange: (event) => setCopyTo(event.target.value),
                                }),
                                h(
                                  'button',
                                  {
                                    className: 'gh-btn',
                                    type: 'button',
                                    disabled: busy.length > 0 || copyTo.trim().length === 0,
                                    onClick: copyFile,
                                  },
                                  tr('action.copy'),
                                ),
                              ),
                              file.binary === true
                                ? h('div', { className: 'gh-note' }, tr('state.empty'))
                                : h('pre', { className: 'gh-pre' }, file.text ?? ''),
                            )
                          : null,
                      ),
                )
              : null,

            tab === 'deploy'
              ? h(
                  'div',
                  { className: 'gh-card' },
                  repo.length === 0
                    ? h('div', { className: 'gh-empty' }, tr('state.empty'))
                    : h(
                        'div',
                        null,
                        h(
                          'div',
                          { className: 'gh-field' },
                          h('span', { className: 'gh-label' }, tr('field.mode')),
                          h(
                            'select',
                            {
                              className: 'gh-select',
                              value: deployMode,
                              onChange: (event) => setDeployMode(event.target.value),
                            },
                            h('option', { value: 'workflow' }, tr('mode.workflow')),
                            h('option', { value: 'pages' }, tr('mode.pages')),
                            h('option', { value: 'release' }, tr('mode.release')),
                          ),
                        ),
                        h(
                          'div',
                          { className: 'gh-field' },
                          h('span', { className: 'gh-label' }, tr('field.ref')),
                          h('input', {
                            className: 'gh-input',
                            value: deployRef,
                            onChange: (event) => setDeployRef(event.target.value),
                          }),
                        ),
                        deployMode === 'workflow'
                          ? h(
                              'div',
                              { className: 'gh-field' },
                              h('span', { className: 'gh-label' }, tr('field.workflow')),
                              workflows.length === 0
                                ? h('input', {
                                    className: 'gh-input',
                                    value: deployWorkflow,
                                    placeholder: 'deploy.yml',
                                    onChange: (event) => setDeployWorkflow(event.target.value),
                                  })
                                : h(
                                    'select',
                                    {
                                      className: 'gh-select',
                                      value: deployWorkflow,
                                      onChange: (event) => setDeployWorkflow(event.target.value),
                                    },
                                    ...workflows.map((entry) =>
                                      h(
                                        'option',
                                        { key: entry.file ?? entry.id, value: entry.file ?? '' },
                                        `${entry.name} · ${entry.file ?? ''}`,
                                      ),
                                    ),
                                  ),
                            )
                          : null,
                        deployMode === 'release'
                          ? h(
                              'div',
                              { className: 'gh-field' },
                              h('span', { className: 'gh-label' }, tr('field.tag')),
                              h('input', {
                                className: 'gh-input',
                                value: deployTag,
                                placeholder: 'v1.0.0',
                                onChange: (event) => setDeployTag(event.target.value),
                              }),
                            )
                          : null,
                        h(
                          'button',
                          {
                            className: 'gh-btn',
                            'data-kind': 'primary',
                            type: 'button',
                            disabled: busy.length > 0,
                            onClick: runDeploy,
                          },
                          tr('action.deploy'),
                        ),
                      ),
                )
              : null,
          ),
        ),
      )
    }

    /** Register the dictionaries, the sidebar entry, and the panel. */
    function apply(ctx) {
      ctxRef.current = ctx

      // `locale` is a hard dependency (declared in `inject`), so the service is
      // ready here. Registering through `ctx.get` would silently skip both
      // dictionaries when activation raced the locale plugin, and `bind()`
      // then returns the raw key — which is how the sidebar label once rendered
      // as "sidebar.label".
      ctx.effect(() => ctx.locale.register(NS, 'zh', DICTS.zh), 'github: zh dictionary')
      ctx.effect(() => ctx.locale.register(NS, 'en', DICTS.en), 'github: en dictionary')

      ctx.slots.inject('sidebar.panellist', function* () {
        yield ctx.slots.register(
          {
            name: 'sidebar.panellist',
            id: 'github',
            order: 20,
            // The owner re-reads this thunk on every projection, so a locale
            // switch relabels the row without re-registering it.
            label: () => translate(ctx, 'sidebar.label'),
          },
          GithubIcon,
        )
      })

      ctx.slots.inject('main', function* () {
        yield ctx.slots.register({ name: 'main', key: 'github' }, GithubPanel)
      })
    }

    return { inject: ['slots', 'locale'], apply }
  },
})
