export default async function handler(req, res) {
    const { code } = req.query;

    if (!code) {
        return res.status(400).json({ error: 'No code provided' });
    }

    try {
        const response = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code
            })
        });

        const data = await response.json();

        if (data.error) {
            return res.status(400).send(`
                <script>
                    window.opener.postMessage(
                        'authorization:github:error:${data.error}',
                        '*'
                    );
                </script>
            `);
        }

        res.send(`
            <script>
                window.opener.postMessage(
                    'authorization:github:success:${JSON.stringify({ token: data.access_token, provider: 'github' })}',
                    '*'
                );
                window.close();
            </script>
        `);
    } catch (err) {
        res.status(500).send(`
            <script>
                window.opener.postMessage(
                    'authorization:github:error:${err.message}',
                    '*'
                );
            </script>
        `);
    }
}
