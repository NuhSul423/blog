'use strict';

/**
 * Decap / Netlify CMS 的 GitHub 登录 · 第 1 步
 *
 * 管理后台点击「Login with GitHub」时会打开一个弹窗：
 *   GET /api/auth?provider=github&site_id=<host>&scope=repo
 *
 * 本函数只有一个职责：把这个弹窗 302 重定向到 GitHub 的授权页。
 *
 * 关键点：redirect_uri 必须指向本站的 /api/callback，由它完成
 * code -> access_token 的交换以及 netlify-cms 要求的 postMessage 握手。
 * 这个地址必须原样登记在 GitHub OAuth App 的
 * "Authorization callback URL" 里，否则 GitHub 会直接报
 * "The redirect_uri is not associated with this application"。
 *
 * 依赖的环境变量（在 Netlify 站点设置 → Environment variables 里配置）：
 *   GITHUB_CLIENT_ID      必填，OAuth App 的 Client ID
 *   GITHUB_CLIENT_SECRET  必填（只有 /api/callback 会用到）
 *   SITE_ORIGIN           选填，站点地址，例如 https://super-meringue-6c70e2.netlify.app
 */

const CALLBACK_PATH = '/api/callback';

// 只允许管理后台真正需要的两种权限，避免被拼出更大的 scope。
const ALLOWED_SCOPES = ['repo', 'public_repo'];

function firstDefined() {
  for (let i = 0; i < arguments.length; i += 1) {
    const value = arguments[i];
    if (value) return String(value);
  }
  return '';
}

/**
 * 站点自身的 origin，用来拼装回调地址。
 * 优先使用 Netlify 注入的环境变量，而不是请求头里的 Host —— Host 可以被伪造，
 * 用它拼 redirect_uri 等于开放重定向。
 */
function siteOrigin(event) {
  const configured = firstDefined(
    process.env.SITE_ORIGIN,
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
  );
  if (configured) return configured.replace(/\/+$/, '');

  const headers = event.headers || {};
  const host = firstDefined(headers['x-forwarded-host'], headers.host);
  const proto = firstDefined(headers['x-forwarded-proto'], 'https');
  return host ? proto + '://' + host.replace(/\/+$/, '') : '';
}

function htmlPage(statusCode, title, detail) {
  return {
    statusCode: statusCode,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
    },
    body: [
      '<!DOCTYPE html>',
      '<html lang="zh-CN">',
      '<head><meta charset="utf-8"><title>' + title + '</title></head>',
      '<body style="font-family:system-ui,-apple-system,\'Segoe UI\',sans-serif;',
      'padding:2rem;line-height:1.8;max-width:640px;margin:0 auto">',
      '<h2>' + title + '</h2>',
      '<p>' + detail + '</p>',
      '</body></html>',
    ].join(''),
  };
}

exports.handler = async (event) => {
  const clientId = firstDefined(
    process.env.GITHUB_CLIENT_ID,
    process.env.OAUTH_GITHUB_CLIENT_ID,
  );

  if (!clientId) {
    return htmlPage(
      500,
      '服务端缺少 GITHUB_CLIENT_ID',
      '请在 Netlify 站点设置 → Environment variables 中添加 ' +
        'GITHUB_CLIENT_ID 与 GITHUB_CLIENT_SECRET，然后重新部署（Deploys → Trigger deploy）。',
    );
  }

  const origin = siteOrigin(event);
  if (!origin) {
    return htmlPage(
      500,
      '无法确定站点地址',
      '请为站点设置 SITE_ORIGIN 环境变量，例如 ' +
        'https://super-meringue-6c70e2.netlify.app。',
    );
  }

  const params = event.queryStringParameters || {};
  const scope = ALLOWED_SCOPES.indexOf(params.scope) >= 0 ? params.scope : 'repo';
  const redirectUri = origin + CALLBACK_PATH;

  const query = [
    'client_id=' + encodeURIComponent(clientId),
    'redirect_uri=' + encodeURIComponent(redirectUri),
    'scope=' + encodeURIComponent(scope),
    'response_type=code',
    'allow_signup=true',
  ].join('&');

  return {
    statusCode: 302,
    headers: {
      Location: 'https://github.com/login/oauth/authorize?' + query,
      'Cache-Control': 'no-store, max-age=0',
    },
    body: '',
  };
};
