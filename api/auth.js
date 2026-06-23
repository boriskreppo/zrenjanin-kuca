export default function handler(req, res) {
    const { provider } = req.query;

    if (provider !== 'github') {
        return res.status(400).json({ error: 'Unsupported provider' });
    }

    const params = new URLSearchParams({
        client_id: process.env.GITHUB_CLIENT_ID,
        redirect_uri: `https://zrenjanin-kuca.vercel.app/api/callback`,
        scope: 'repo',
        state: 'github'
    });

    res.redirect(`https://github.com/login/oauth/authorize?${params}`);
}
