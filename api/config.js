import { readFileSync } from 'fs';
import { join } from 'path';

export default function handler(req, res) {
    const config = readFileSync(join(process.cwd(), 'admin/config.yml'), 'utf8');
    res.setHeader('Content-Type', 'text/yaml');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(config);
}
