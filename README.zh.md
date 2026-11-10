# dsh-github-plugin

[English](README.md) | 简体中文

一个把 GitHub 账号接入 DSH（host runtime）的插件 —— 让你（通过左侧栏的 Web
面板）和智能体（通过 `github` 工具）都能管理仓库。

## 能做什么

| 能力 | 面板 | 智能体工具 |
|---|---|---|
| 浏览仓库与文件 | ✅ | ✅ `browse` |
| 读取文件内容 | ✅ | ✅ `read` |
| 上传 / 更新文件 | ✅ | ✅ `write`、`upload` |
| 下载文件或仓库 ZIP | ✅ | ✅ `download` |
| 复制文件或目录 | ✅ | ✅ `copy` |
| 删除文件 | ✅ | ✅ `delete` |
| 部署（Actions / Pages / Release） | ✅ | ✅ `deploy` |
| 查看提交与工作流 | ✅ | ✅ `commits`、`workflows` |
| 新建仓库 | ✅ | ✅ `createRepo` |
| 读取星标仓库 | ✅ | ✅ `starred` |

面板和工具调用的是**同一个 Host 服务**，两条调用路径不会各写一套逻辑。

## 安装

```powershell
# 方式一：在 DSH Web 界面里 Settings → Plugins → 添加插件 → 本地目录
# 方式二：让 Plugin Manager 指向这份代码
plugin_manager install_bundle "E:\path\to\dsh-github-plugin"
```

插件在 `cordis.patch.yml` 里声明补丁，注册一行：

```yaml
- insert:
    - id: github
      name: '@weapon111/dsh-github-plugin'
```

## 配置令牌

令牌通过 harness 的凭据存储（`$DSH_HOME/.credentials.yaml`）保存，不会写进仓库，
也不会下发到浏览器。

1. 在左侧栏打开 **GitHub** → **令牌** 页签。
2. 粘贴 Personal Access Token，点 **保存**。
3. 之后面板右上角会显示 `@你的登录名` 和剩余 API 配额。

也可以在启动 harness 前导出环境变量 `GITHUB_TOKEN`。

### 需要的权限（classic token）

| 权限 | 用途 |
|---|---|
| `repo` | 读写仓库内容，含私有仓库 |
| `workflow` | 部署时触发 GitHub Actions 工作流 |

只需要这两项。不要勾选 `admin:*`、`delete_repo`、`write:ssh_signing_key` ——
插件从不调用这些接口。

## 国际化

文案内置**简体中文与英文**。两套字典都通过 Client locale 服务注册，因此侧栏标签和
面板内的每一处文字都会跟随当前语言切换，无需刷新页面。

## 目录结构

| 文件 | 作用 |
|---|---|
| `index.js` | Host 半：GitHub 服务、`github` 工具、已认证的 `/api/github/*` 路由 |
| `client.js` | 浏览器半：左侧栏入口与管理面板 |
| `cordis.patch.yml` | 插入插件行的 Loader 补丁 |
| `package.json` | 清单：bundle 补丁与 `dsh.client` 声明 |
| `locale/*.json` | Plugin Manager 显示的标题与描述 |
| `icon.svg` | 侧栏与 Plugin Manager 图标 |

## 设计说明

- **一套服务，两个调用方。** `createService()` 掌管所有 GitHub 操作，工具和 HTTP
  路由只是它上面的一层薄适配。
- **支持匿名读取。** 没有令牌时，仍可用 `owner/name` 搜索、浏览、读取公开仓库，
  也能按用户名读取公开的星标仓库。
- **流式下载。** `/api/github/download` 直接流式返回，不会把整个仓库 ZIP 读进内存。
- **贴合主题的界面。** 面板只使用 `--dsw-alias-*` 主题变量，明暗两套主题都能正常显示。

## 许可证

MIT —— 见 [LICENSE](LICENSE)。
