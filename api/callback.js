const https = require('https');

module.exports = async (req, res) => {
  const { code } = req.query;

  if (!code) {
    res.status(400).json({ error: 'Missing code' });
    return;
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  const postData = JSON.stringify({
    client_id: clientId,
    client_secret: clientSecret,
    code: code,
    redirect_uri: 'https://super-meringue-6c70e2.netlify.app/admin/'
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
            token_type: result.token_type || 'bearer',
            expires_in: result.expires_in || 3600,
            scope: result.scope || 'repo'
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