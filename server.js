// Minimal static server with history fallback (for Heroku). Any CDN works too.
import express from 'express';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('./dist', import.meta.url));
const app = express();
app.use(express.static(dist, { maxAge: '1y', index: false }));
app.get('/{*path}', (_req, res) => res.sendFile(`${dist}/index.html`));
app.listen(process.env.PORT ?? 5174);
