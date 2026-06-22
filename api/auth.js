const https = require('https');

exports.handler = async (event, context) => {
  const { code, provider, state } = event.queryStringParameters || {};

  if (provider === 'github' && code) {
    return await exchangeCodeForToken(code);
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = `${event.headers.origin}/admin/`;
  const scope = 'repo';

  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code${state ? `&state=${state}` : ''}`;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': event.headers.origin || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    },
    body: JSON.stringify({
      authorize_url: authUrl
    })
  };
};

async function exchangeCodeForToken(code) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  const postData = JSON.stringify({
    client_id: clientId,
    client_secret: clientSecret,
    code: code
  });

  const options = {
    hostname: 'github.com',
    path: '/login/oauth/access_token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'Accept': 'application/json'
    }
  };

  return new Promise((resolve) => {
    const githubReq = https.request(options, (githubRes) => {
      let data = '';
      githubRes.on('data', (chunk) => {
        data += chunk;
      });
      githubRes.on('end', () => {
        try {
          const result = JSON.parse(data);

          if (result.error) {
            resolve({
              statusCode: 400,
              headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
              },
              body: JSON.stringify({ error: result.error_description || result.error })
            });
            return;
          }

          resolve({
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
              provider: 'github',
              token: result.access_token,
              token_type: result.token_type || 'bearer',
              expires_in: result.expires_in || 3600,
              scope: result.scope || 'repo'
            })
          });
        } catch (error) {
          resolve({
            statusCode: 500,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: error.message })
          });
        }
      });
    });

    githubReq.on('error', (error) => {
      resolve({
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ error: error.message })
      });
    });

    githubReq.write(postData);
    githubReq.end();
  });
}