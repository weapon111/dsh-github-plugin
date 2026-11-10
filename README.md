# dsh-github-plugin

English | [简体中文](README.zh.md)

A DSH (DeepSeek Harness) plugin that connects a GitHub account to the harness —
so both **you** (through a Web panel in the left sidebar) and **the agent**
(through a `github` tool) can manage repositories.

## What it does

| Capability | Panel | Agent tool |
|---|---|---|
| Browse repositories and files | ✅ | ✅ `browse` |
| Read file contents | ✅ | ✅ `read` |
| Upload / update files | ✅ | ✅ `write`, `upload` |
| Download a file or repository ZIP | ✅ | ✅ `download` |
| Copy a file or directory | ✅ | ✅ `copy` |
| Deploy (Actions / Pages / Release) | ✅ | ✅ `deploy` |
| List commits and workflows | ✅ | ✅ `commits`, `workflows` |
| Create a repository | ✅ | ✅ `createRepo` |
| Read starred repositories | ✅ | ✅ `starred` |

The panel and the tool call **one shared Host service**, so the two callers
never carry separate logic.

## Install

```powershell
# from the DSH Web UI: Settings → Plugins → Add plugin → local directory
# or point Plugin Manager at this checkout:
plugin_manager install_bundle "E:\path\to\dsh-github-plugin"
```

The bundle declares its patch in `cordis.patch.yml` and registers one row:

```yaml
- insert:
    - id: github
      name: '@weapon111/dsh-github-plugin'
```

## Configure the token

The token is stored through the harness credential store
(`$DSH_HOME/.credentials.yaml`), never in the repository and never sent to the
browser.

1. Open **GitHub** in the left sidebar → **Token** tab.
2. Paste a Personal Access Token and press **Save**.
3. The header then shows `@your-login` and the remaining API quota.

Or export `GITHUB_TOKEN` before launching the harness.

### Required scopes (classic token)

| Scope | Why |
|---|---|
| `repo` | Read and write repository contents, including private repos |
| `workflow` | Dispatch GitHub Actions workflows during a deploy |

Nothing else is needed. Avoid `admin:*`, `delete_repo`, and
`write:ssh_signing_key` — the plugin never calls those APIs.

## Internationalization

Copy ships in **Chinese and English**. Both dictionaries register through the
Client locale service, so the sidebar label and every panel string follow the
active language without a reload.

## Layout

| File | Role |
|---|---|
| `index.js` | Host half: the GitHub service, the `github` tool, and the authenticated `/api/github/*` routes |
| `client.js` | Browser half: the sidebar entry and the management panel |
| `cordis.patch.yml` | Loader patch inserting the plugin row |
| `package.json` | Manifest: bundle patch + `dsh.client` declaration |
| `locale/*.json` | Plugin Manager title and description |
| `icon.svg` | Sidebar / Plugin Manager artwork |

## Design notes

- **One service, two callers.** `createService()` owns every GitHub operation;
  the tool and the HTTP routes are thin adapters over it.
- **Anonymous reads are supported.** Without a token, public repositories can
  still be searched, browsed, and read by naming `owner/name`, and public
  stars are readable by naming a user.
- **Streaming downloads.** `/api/github/download` streams the response instead
  of buffering a repository ZIP in memory.
- **Theme-native UI.** The panel styles from `--dsw-alias-*` tokens only, so it
  matches light and dark themes.

## License

MIT — see [LICENSE](LICENSE).
