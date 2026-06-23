import crypto from 'crypto';

function verifyPassword(password, hash) {
  // hash format: sha256:salt:digest
  const [, salt, digest] = hash.split(':');
  const attempt = crypto.createHmac('sha256', salt).update(password).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(attempt), Buffer.from(digest));
}

function createToken(secret) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 86400 })).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${sig}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  let body = req.body || {};
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const { password } = body;
  if (!password) return res.status(400).json({ error: 'Lozinka je obavezna.' });

  const hash = process.env.ADMIN_PASSWORD_HASH;
  const secret = process.env.JWT_SECRET;
  if (!hash || !secret) return res.status(500).json({ error: 'Server nije konfigurisan.' });

  try {
    if (!verifyPassword(password, hash)) {
      return res.status(401).json({ error: 'Pogrešna lozinka.' });
    }
    const token = createToken(secret);
    return res.status(200).json({ token });
  } catch {
    return res.status(401).json({ error: 'Pogrešna lozinka.' });
  }
}
