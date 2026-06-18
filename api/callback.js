const https = require('https');

module.exports = async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    const clientId = 'Ov23li1pLAV6fyLXMBP5';
    const redirectUri = `${req.headers.origin}/api/callback`;
    const scope = 'repo';
    
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state || 'cms'}`;
    
    res.writeHead(302, { Location: authUrl });
    res.end();
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
          return;
        }

        const html = `
          <!DOCTYPE html>
          <html>
          <body>
            <script>
              window.opener.postMessage({
                type: 'authorization',
                access_token: '${result.access_token}'
              }, '*');
              window.close();
            </script>
          </body>
          </html>
        `;

        res.setHeader('Content-Type', 'text/html');
        res.status(200).send(html);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  });

  githubReq.on('error', (error) => {
    res.status(500).json({ error: error.message });
  });

  githubReq.write(postData);
  githubReq.end();
};
