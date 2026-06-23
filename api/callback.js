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
            const errMsg = `authorization:github:error:${JSON.stringify({ message: data.error })}`;
            return res.send(`<!DOCTYPE html><html><body><script>
                (function() {
                    function receiveMessage(e) {
                        window.opener.postMessage('${errMsg}', e.origin);
                    }
                    window.addEventListener('message', receiveMessage, false);
                    window.opener.postMessage('authorizing:github', '*');
                })();
            </script></body></html>`);
        }

        const token = data.access_token;
        const msg = `authorization:github:success:${JSON.stringify({ token, provider: 'github' })}`;
        res.send(`<!DOCTYPE html><html><body><script>
            (function() {
                function receiveMessage(e) {
                    window.opener.postMessage('${msg}', e.origin);
                    window.close();
                }
                window.addEventListener('message', receiveMessage, false);
                window.opener.postMessage('authorizing:github', '*');
            })();
        </script></body></html>`);
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
