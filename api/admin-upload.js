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

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/\.{2,}/g, '.');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!verifyToken(token, process.env.JWT_SECRET)) {
    return res.status(401).json({ error: 'Neovlašćen pristup.' });
  }

  const { filename, content } = req.body || {};
  if (!filename || !content) {
    return res.status(400).json({ error: 'Nedostaju podaci.' });
  }

  const safeName = sanitizeFilename(filename);
  const path = `Assets/Images/${safeName}`;
  const repo = process.env.GITHUB_REPO;
  const ghToken = process.env.GITHUB_TOKEN;

  // strip data URL prefix if present
  const base64 = content.includes(',') ? content.split(',')[1] : content;

  try {
    // check if file already exists (to get sha for update)
    let sha;
    const checkRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      headers: {
        Authorization: `Bearer ${ghToken}`,
        Accept: 'application/vnd.github+json',
      },
    });
    if (checkRes.ok) {
      const existing = await checkRes.json();
      sha = existing.sha;
    }

    const body = {
      message: `CMS: upload slike ${safeName}`,
      content: base64,
    };
    if (sha) body.sha = sha;

    const ghRes = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${ghToken}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!ghRes.ok) {
      const err = await ghRes.json();
      return res.status(500).json({ error: err.message || 'GitHub greška.' });
    }

    return res.status(200).json({ path: `/${path}` });
  } catch (err) {
    return res.status(500).json({ error: 'Greška pri uploadu.' });
  }
}
