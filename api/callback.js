const https = require('https');

module.exports = async (req, res) => {
  const { code, provider } = req.query;

  if (!code && !provider) {
    res.status(400).json({ error: 'Missing code or provider' });
    return;
  }

  const clientId = 'Ov23li1pLAV6fyLXMBP5';
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const redirectUri = `${req.headers.origin}/api/callback`;

  const postData = JSON.stringify({
    client_id: clientId,
    client_secret: clientSecret,
    code: code,
    redirect_uri: redirectUri
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
            res.status(400).json({ error: result.error });
            resolve();
            return;
          }

          res.status(200).json({
            provider: 'github',
            token: result.access_token,
            token_type: 'bearer',
            expires_in: 3600
          });
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
        resolve();
      });
    });

    githubReq.on('error', (error) => {
      res.status(500).json({ error: error.message });
      resolve();
    });

    githubReq.write(postData);
    githubReq.end();
  });
};
