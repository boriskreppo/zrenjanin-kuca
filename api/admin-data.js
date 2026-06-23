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

async function fetchGitHubFile(repo, path, token) {
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const content = Buffer.from(data.content, 'base64').toString('utf-8');
  return { content: JSON.parse(content), sha: data.sha };
}

const FILES = [
  { id: 'hero', path: '_data/hero.json', lang: 'sr' },
  { id: 'hero_stats', path: '_data/hero_stats.json', lang: 'sr' },
  { id: 'osnovne_info', path: '_data/osnovne_info.json', lang: 'sr' },
  { id: 'galerija', path: '_data/galerija.json', lang: 'sr' },
  { id: 'detalji', path: '_data/detalji.json', lang: 'sr' },
  { id: 'lokacija', path: '_data/lokacija.json', lang: 'sr' },
  { id: 'kontakt', path: '_data/kontakt.json', lang: 'sr' },
  { id: 'hero_en', path: '_data/en/hero.json', lang: 'en' },
  { id: 'hero_stats_en', path: '_data/en/hero_stats.json', lang: 'en' },
  { id: 'osnovne_info_en', path: '_data/en/osnovne_info.json', lang: 'en' },
  { id: 'galerija_en', path: '_data/en/galerija.json', lang: 'en' },
  { id: 'detalji_en', path: '_data/en/detalji.json', lang: 'en' },
  { id: 'lokacija_en', path: '_data/en/lokacija.json', lang: 'en' },
  { id: 'kontakt_en', path: '_data/en/kontakt.json', lang: 'en' },
];

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!verifyToken(token, process.env.JWT_SECRET)) {
    return res.status(401).json({ error: 'Neovlašćen pristup.' });
  }

  const repo = process.env.GITHUB_REPO;
  const ghToken = process.env.GITHUB_TOKEN;

  try {
    const results = await Promise.all(
      FILES.map(async (f) => {
        const data = await fetchGitHubFile(repo, f.path, ghToken);
        return { id: f.id, path: f.path, lang: f.lang, ...data };
      })
    );
    return res.status(200).json({ files: results });
  } catch (err) {
    return res.status(500).json({ error: 'Greška pri čitanju podataka.' });
  }
}
