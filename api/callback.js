'use strict';

/**
 * Decap / Netlify CMS 的 GitHub 登录 · 第 2 步（回调页）
 *
 * GitHub 授权完成后会把登录弹窗重定向到这里：
 *   GET /api/callback?code=xxxxxxxx
 *
 * 本函数做两件事：
 *   1. 用 client_id + client_secret + code 换取 access_token（必须服务端完成，
 *      client_secret 绝不能出现在前端）；
 *   2. 返回一个 HTML 页面，由它完成 netlify-cms 要求的 postMessage 握手。
 *
 * 握手协议（从 netlify-cms-lib-auth 的源码里反查得到，顺序不能错）：
 *   ① 弹窗    → 父窗口 : "authorizing:github"
 *   ② 父窗口  → 弹窗   : "authorizing:github"   （父窗口收到 ① 后才开始监听结果）
 *   ③ 弹窗    → 父窗口 : authorization:github:success:{"token":"...","provider":"github"}
 *
 * 父窗口还会校验消息来源必须等于 config.yml 里的 base_url，所以弹窗必须和
 * 管理后台同域 —— 这正是把回调放在本站 /api/callback 而不是外部服务的原因。
 */

const https = require('https');

const PROVIDER = 'github';
const CALLBACK_PATH = '/api/callback';
const GITHUB_HOST = 'github.com';
const TOKEN_PATH = '/login/oauth/access_token';
const REQUEST_TIMEOUT_MS = 15000;

function firstDefined() {
  for (let i = 0; i < arguments.length; i += 1) {
    const value = arguments[i];
    if (value) return String(value);
  }
  return '';
}

/** 站点自身的 origin，必须和 /api/auth 里用的是同一个值，否则换 token 时会 redirect_uri 不匹配。 */
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

function escapeHtml(value) {
  return firstDefined(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 把任意值安全地内联进 <script>，避免 </script> 之类的注入。 */
function inlineJson(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function htmlResponse(body) {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
    },
    body: body,
  };
}

/**
 * 渲染握手页。
 * @param {string} message 要发给父窗口的消息，例如 authorization:github:success:{...}
 * @param {string} heading 页面标题
 * @param {string} detail  页面说明（已转义）
 */
function handshakePage(message, heading, detail) {
  return htmlResponse(
    [
      '<!DOCTYPE html>',
      '<html lang="zh-CN">',
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      '<title>' + heading + '</title>',
      '<style>',
      'body{font-family:system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif;',
      'display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;',
      'background:#f6f6f6;color:#333}',
      '.card{background:#fff;padding:32px 40px;border-radius:12px;max-width:560px;',
      'text-align:center;box-shadow:0 6px 24px rgba(0,0,0,.08)}',
      'h1{font-size:18px;margin:0 0 12px}',
      'p{margin:0;color:#666;font-size:14px;line-height:1.8;word-break:break-word}',
      '</style>',
      '</head>',
      '<body>',
      '<div class="card"><h1 id="title">' + heading + '</h1>',
      '<p id="detail">' + detail + '</p></div>',
      '<script>',
      '(function () {',
      '  var MESSAGE = ' + inlineJson(message) + ';',
      '  var PROVIDER = ' + inlineJson(PROVIDER) + ';',
      '  var titleEl = document.getElementById("title");',
      '  var detailEl = document.getElementById("detail");',
      '',
      '  function fail(text) {',
      '    titleEl.textContent = "登录未能完成";',
      '    detailEl.textContent = text;',
      '  }',
      '',
      '  if (!window.opener) {',
      '    fail("这个页面需要由博客管理后台 /admin/ 打开。请回到管理后台重新点击登录。");',
      '    return;',
      '  }',
      '',
      '  // 管理后台与本弹窗同域，用自身 origin 做来源校验。',
      '  var expectedOrigin = window.location.origin;',
      '',
      '  function onMessage(event) {',
      '    if (event.origin !== expectedOrigin) return;',
      '    window.removeEventListener("message", onMessage, false);',
      '    try {',
      '      window.opener.postMessage(MESSAGE, expectedOrigin);',
      '    } catch (err) {',
      '      fail(String((err && err.message) || err));',
      '      return;',
      '    }',
      '    titleEl.textContent = "登录成功";',
      '    detailEl.textContent = "正在返回管理后台…";',
      '    setTimeout(function () { window.close(); }, 300);',
      '  }',
      '',
      '  window.addEventListener("message", onMessage, false);',
      '  window.opener.postMessage("authorizing:" + PROVIDER, "*");',
      '})();',
      '</script>',
      '</body>',
      '</html>',
    ].join('\n'),
  );
}

function successPage(token) {
  const payload = { token: token, provider: PROVIDER };
  return handshakePage(
    'authorization:' + PROVIDER + ':success:' + JSON.stringify(payload),
    '登录成功',
    '正在返回管理后台，请稍候…',
  );
}

function errorPage(title, detail) {
  const message = 'authorization:' + PROVIDER + ':error:' +
    JSON.stringify({ message: title + '：' + detail });
  return handshakePage(message, title, escapeHtml(detail));
}

/** 向 GitHub 换取 access_token。 */
function exchangeCodeForToken(payload) {
  return new Promise(function (resolve, reject) {
    const body = JSON.stringify(payload);
    const req = https.request(
      {
        hostname: GITHUB_HOST,
        path: TOKEN_PATH,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          Accept: 'application/json',
          'User-Agent': 'nuhsul-blog-decap-cms-oauth',
        },
      },
      function (res) {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', function (chunk) { data += chunk; });
        res.on('end', function () {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(new Error(
              'GitHub 返回了无法解析的响应（HTTP ' + res.statusCode + '）：' + data.slice(0, 200),
            ));
          }
        });
      },
    );

    req.setTimeout(REQUEST_TIMEOUT_MS, function () {
      req.destroy(new Error('请求 GitHub 超时（' + REQUEST_TIMEOUT_MS + 'ms）'));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};

  // 用户在 GitHub 上点了「取消」
  if (params.error) {
    return errorPage(
      'GitHub 拒绝了本次授权',
      firstDefined(params.error_description, params.error),
    );
  }

  const code = params.code;
  if (!code) {
    return errorPage('回调缺少 code 参数', 'GitHub 没有带回授权码，请回到管理后台重新登录。');
  }

  const clientId = firstDefined(
    process.env.GITHUB_CLIENT_ID,
    process.env.OAUTH_GITHUB_CLIENT_ID,
  );
  const clientSecret = firstDefined(
    process.env.GITHUB_CLIENT_SECRET,
    process.env.OAUTH_GITHUB_CLIENT_SECRET,
  );

  if (!clientId || !clientSecret) {
    return errorPage(
      '服务端缺少 GitHub OAuth 凭据',
      '请在 Netlify 站点设置 → Environment variables 中配置 GITHUB_CLIENT_ID 与 ' +
        'GITHUB_CLIENT_SECRET，然后重新部署。',
    );
  }

  try {
    const result = await exchangeCodeForToken({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: siteOrigin(event) + CALLBACK_PATH,
    });

    if (result.error || !result.access_token) {
      return errorPage(
        '换取 access_token 失败',
        firstDefined(result.error_description, result.error, 'GitHub 未返回 access_token'),
      );
    }

    return successPage(result.access_token);
  } catch (err) {
    return errorPage('换取 access_token 失败', (err && err.message) || String(err));
  }
};
