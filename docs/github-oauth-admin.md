# 管理后台 GitHub 登录（Decap / Netlify CMS）说明

后台地址：<https://super-meringue-6c70e2.netlify.app/admin/>

> 请始终用上面的地址访问后台。`netlify-cms` 会校验登录弹窗发回消息的
> `origin` 是否等于 `static/admin/config.yml` 里的 `base_url`，
> 用 `main--super-meringue-6c70e2.netlify.app` 这类分支别名访问时无法登录。

## 一、登录流程

```
浏览器 /admin/                      Netlify Function          GitHub
     │                                   │                      │
     │ 1. 点击 Login with GitHub         │                      │
     │    打开弹窗 /api/auth?...  ───────► api/auth.js          │
     │                                   │ 2. 302 ─────────────►│ /login/oauth/authorize
     │                                   │                      │ 3. 用户点击 Authorize
     │                                   │◄──── 4. 回跳 /api/callback?code=...
     │                                   │ api/callback.js      │
     │                                   │ 5. code 换 access_token
     │◄── 6. postMessage 握手（见下）─────┤ 6. 返回握手 HTML
```

握手协议来自 `netlify-cms-lib-auth` 的源码，顺序不能错：

1. 弹窗 → 父窗口：`authorizing:github`
2. 父窗口 → 弹窗：`authorizing:github`（父窗口收到 ① 后才会开始监听结果）
3. 弹窗 → 父窗口：`authorization:github:success:{"token":"...","provider":"github"}`

因此**回调页必须和后台同域**，这就是回调放在本站 `/api/callback`
而不是外部 OAuth 服务的原因。

## 二、涉及的文件

| 文件 | 作用 |
| --- | --- |
| `static/admin/index.html` | 后台页面，从 unpkg 加载 `netlify-cms@2.10.192` |
| `static/admin/config.yml` | CMS 配置：仓库、分支、`base_url`、`auth_endpoint` |
| `scripts/copy-admin.js` | 构建时把 `static/admin` 复制到 `public/admin` |
| `api/auth.js` | 登录第 1 步：302 跳转 GitHub 授权页 |
| `api/callback.js` | 登录第 2 步：换 token + 完成 postMessage 握手 |
| `netlify.toml` | 函数目录 + `/api/*` 重定向 |

## 三、一次性配置（换域名 / 换 OAuth App 时需要重做）

### 1. GitHub OAuth App

GitHub → 右上角头像 → Settings → Developer settings → OAuth Apps → 你的应用。
（GitHub 在 2026-08 更新过 OAuth App 的设置界面，字段名和下面一致即可对上。）

**a) Redirect URI**

新界面里叫 **Redirect URIs**（可加多条，按钮 `Add redirect URI`），必须填写：

```
https://super-meringue-6c70e2.netlify.app/api/callback
```

填成站点根路径（`https://super-meringue-6c70e2.netlify.app`）或 `/admin/` 都会导致
GitHub 报 `The redirect_uri is not associated with this application`，
或者授权后弹窗停在一个空白页面 / 博客首页上。

同时建议**取消勾选 `Allow wildcard matching`**：只注册一条地址时 GitHub 会沿用
"通配符匹配"的旧行为，允许把 token 发到该地址的任意子域和子路径，不需要就别开。

**b) 关闭短期 token（重要）**

在新界面的 **Optional features** 区域，取消勾选 `Expire user authorization tokens`
（文案类似 "User authorization tokens expire"）。

GitHub 现在对**新建的 OAuth App 默认开启**该选项：access token 只有 **8 小时**
有效期，另发一个 6 个月有效的 refresh token。而 `netlify-cms@2.10.192` 只会把
token 存下来、**不支持 refresh**，开着这个选项后台每 8 小时就要重新登录一次。

如果一时没关，`api/callback.js` 会在 Netlify 的函数日志里打印一条告警
（关键词 `expire user authorization tokens`），不会静默失败。

**c) Client secret**

页面下方 **Client secrets** → `Generate a new client secret`，生成后立即复制，
填到下面的 Netlify 环境变量里。GitHub 的 token 接口会**先校验客户端凭据、再校验
code**，所以 secret 不对时报的是含糊的
`The client_id and/or client_secret passed are incorrect`。

### 2. Netlify 环境变量

Netlify 项目 → Project configuration → Environment variables：

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `GITHUB_CLIENT_ID` | 是 | OAuth App 的 Client ID |
| `GITHUB_CLIENT_SECRET` | 是 | OAuth App 的 Client Secret（只在本函数里使用，不会下发到浏览器） |
| `SITE_ORIGIN` | 否 | 站点地址，默认取 Netlify 注入的 `URL` |

改完环境变量必须重新部署（Deploys → Trigger deploy → Deploy project）才生效。

## 四、排查方法

```bash
# 1. 应当返回 302 且 Location 指向 github.com，而不是 JSON
curl -sI "https://super-meringue-6c70e2.netlify.app/api/auth?provider=github&site_id=super-meringue-6c70e2.netlify.app&scope=repo"

# 2. 应当返回一页 HTML（提示换 token 失败），说明路由通了、参数也传到了
curl -s "https://super-meringue-6c70e2.netlify.app/api/callback?code=test" | head -20
```

第 1 步返回 JSON、或者第 2 步 404 / 提示缺少 `code`，
都说明 Netlify 上没有部署最新代码 —— 去 Deploys 页面确认最新一次部署是
`Published`，而不是 `Skipped` / `Failed`。

常见报错对照：

| 现象 | 原因 |
| --- | --- |
| 弹窗显示 `{"authorize_url": ...}` | 部署的是旧版本 `api/auth.js`（只返回 JSON，不跳转） |
| 弹窗停留在 GitHub 或空白页 | OAuth App 的回调地址没改成 `/api/callback` |
| `redirect_uri is not associated with this application` | 同上，回调地址与请求里的 `redirect_uri` 不一致 |
| 后台提示登录失败、弹窗自动关闭 | 弹窗与后台不同域，或 `config.yml` 的 `base_url` 与访问地址不一致 |
| 回调页提示缺少 `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | Netlify 环境变量没配或没重新部署 |
| 回调页提示 `The client_id and/or client_secret passed are incorrect` | Netlify 上的 `GITHUB_CLIENT_SECRET` 与 OAuth App 当前的 Client secret 不一致（secret 重新生成过，或粘贴时带了空格/换行）。GitHub 会先校验客户端凭据再校验 code，所以 code 无效时也是这条报错 |
| 正文能打字，但光标总跳回最左边、删不掉、保存报「内容 IS REQUIRED」 | 旧版 `netlify-cms` 的 Slate 编辑器在中文输入法（IME）下的已知缺陷，见下文第五节。已通过改用 Sveltia CMS 解决 |

## 五、为什么把前端从 netlify-cms 换成 Sveltia CMS

`static/admin/index.html` 加载的是 `@sveltia/cms`（版本号固定），
`config.yml` 依旧是标准的 Netlify/Decap CMS 配置格式，两边通吃。

### 换掉的原因

`netlify-cms@2.10.192` 的正文编辑器（包括它所谓的"原始 Markdown 模式"，
`cms-editor-raw` 内部一样是 `data-slate-editor`）基于 **Slate**。
在 Windows + 微软拼音下它有已知缺陷：

* 官方 issue：<https://github.com/decaporg/decap-cms/issues/6287>
  「Windows 11 下用微软拼音在 Body 编辑框输入中文时光标错位」；
* 表现：输入法上屏的文字进入了编辑器 DOM，却没有进入 entry 的值，
  于是每次按键编辑器都被父组件的旧 `value` 覆盖 —— 光标跳回最左边、
  删除无效，保存时 ajv 的必填校验（模板 `"%{fieldLabel} is required."`）
  判定 `body` 为空，界面报「内容 IS REQUIRED」；
* 这条链路和字段配置无关：同一个 entry 里 `title`、`tags` 都正常，
  只有正文（唯一的 markdown 字段）存不进去。

Sveltia CMS 正是为修复这一类问题而做的：编辑器换成 **Lexical**，
并明确把 #6287 列为它解决的问题之一。

### 迁移代价几乎为零

* **OAuth 后端不用改**：Sveltia 复用同一套握手协议，我们代码里实现的
  `authorizing:github` → 父窗口回发 → `authorization:github:success:{token}`
  与 Sveltia 源码里的实现完全一致；官方迁移文档也写明
  "If you have set up an OAuth application for Netlify/Decap CMS,
  you can continue using it with Sveltia CMS"。
* **界面语言自动跟随浏览器**，简体中文无需配置（旧版需要 `locale: 'zh_Hans'` 且要额外引入语言包）。
* `publish_mode`、`media_folder`、`public_folder`、`slug`、各种 widget 都兼容。

### 需要注意的差异

* Sveltia 仍是 0.x（beta），所以我们**固定版本号**而不是用 `@latest`；
  升级时改 `static/admin/index.html` 里的版本号即可。
* Sveltia 会**标记必填字段**（旧版标记可选字段），只是视觉差异。
* 空的可选字段默认不再被省略。若发现 front matter 里出现多余的
  `tags:` 空行，可加 `output: { omit_empty_optional_fields: true }`。
* 之前为了绕开 Slate 加的 `modes: ['raw']` 已删除（Sveltia 不使用该选项）。


