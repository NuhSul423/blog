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

GitHub → 右上角头像 → Settings → Developer settings → OAuth Apps →
你的应用：

- **Authorization callback URL** 必须是：

  ```
  https://super-meringue-6c70e2.netlify.app/api/callback
  ```

  填成站点根路径或 `/admin/` 都会导致 GitHub 报
  `The redirect_uri is not associated with this application`，
  或者授权后弹窗停在一个空白页面上。

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
