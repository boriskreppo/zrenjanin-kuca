import crypto from 'crypto';

function verifyToken(token, secret) {
  if (!token) return false;
  const [header, payload, sig] = token.split('.');
  if (!header || !payload || !sig) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString());
  return Date.now() / 1000 < exp;
}

const ALLOWED_PATHS = [
  '_data/hero.json',
  '_data/hero_stats.json',
  '_data/osnovne_info.json',
  '_data/galerija.json',
  '_data/detalji.json',
  '_data/lokacija.json',
  '_data/kontakt.json',
  '_data/en/hero.json',
  '_data/en/hero_stats.json',
  '_data/en/osnovne_info.json',
  '_data/en/galerija.json',
  '_data/en/detalji.json',
  '_data/en/lokacija.json',
  '_data/en/kontakt.json',
];

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!verifyToken(token, process.env.JWT_SECRET)) {
    return res.status(401).json({ error: 'Neovlašćen pristup.' });
  }

  const { path, content, sha } = req.body || {};
  if (!path || !content || !sha) {
    return res.status(400).json({ error: 'Nedostaju podaci.' });
  }
  if (!ALLOWED_PATHS.includes(path)) {
    return res.status(403).json({ error: 'Putanja nije dozvoljena.' });
  }

  const repo = process.env.GITHUB_REPO;
  const ghToken = process.env.GITHUB_TOKEN;
  const fileName = path.split('/').pop();

  try {
    const jsonStr = JSON.stringify(content, null, 2);
    const encoded = Buffer.from(jsonStr).toString('base64');

    const ghRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${ghToken}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `CMS: azuriran ${fileName}`,
        content: encoded,
        sha,
      }),
    });

    if (!ghRes.ok) {
      const err = await ghRes.json();
      return res.status(500).json({ error: err.message || 'GitHub greška.' });
    }

    const data = await ghRes.json();
    return res.status(200).json({ sha: data.content.sha });
  } catch (err) {
    return res.status(500).json({ error: 'Greška pri čuvanju.' });
  }
}
