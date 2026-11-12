/**
 * Local dev server for /api/* routes (no Vercel login required).
 * Run: npm run dev:api
 * Pair with: npm run dev (Vite proxies /api → port 3001)
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const PORT = Number(process.env.API_PORT || 3001);

function loadEnv() {
    const envPath = path.join(root, '.env');
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const idx = trimmed.indexOf('=');
        if (idx === -1) continue;
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
    }
}

loadEnv();

const routes = {
    'POST /api/payment-initiate': () => import('../api/payment-initiate.js'),
    'POST /api/coupon-validate': () => import('../api/coupon-validate.js'),
    'GET /api/payment-status': () => import('../api/payment-status.js'),
    'POST /api/payment-callback': () => import('../api/payment-callback.js'),
    'GET /api/payment-callback': () => import('../api/payment-callback.js'),
    'POST /api/xentripay-webhook': () => import('../api/xentripay-webhook.js'),
    'POST /api/webhooks/xentripay': () => import('../api/webhooks/xentripay.js'),
};

function parseQuery(url) {
    const i = url.indexOf('?');
    if (i === -1) return {};
    const params = new URLSearchParams(url.slice(i + 1));
    const query = {};
    for (const [k, v] of params) query[k] = v;
    return query;
}

function readBody(req) {
    return new Promise((resolve) => {
        const chunks = [];
        req.on('data', (c) => chunks.push(c));
        req.on('end', () => {
            const raw = Buffer.concat(chunks).toString();
            if (!raw) return resolve({});
            try {
                resolve(JSON.parse(raw));
            } catch {
                resolve(raw);
            }
        });
    });
}

const server = http.createServer(async (req, res) => {
    const urlPath = req.url?.split('?')[0] || '/';
    const routeKey = `${req.method} ${urlPath}`;
    const loader = routes[routeKey];

    if (!loader) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
        return;
    }

    try {
        const mod = await loader();
        const handler = mod.default;

        const body = req.method === 'POST' ? await readBody(req) : undefined;
        const mockReq = {
            method: req.method,
            url: req.url,
            query: parseQuery(req.url || ''),
            body,
            headers: req.headers,
        };

        const mockRes = {
            statusCode: 200,
            headers: {},
            status(code) {
                this.statusCode = code;
                return this;
            },
            setHeader(k, v) {
                this.headers[k] = v;
            },
            end(data) {
                for (const [k, v] of Object.entries(this.headers)) {
                    res.setHeader(k, v);
                }
                res.writeHead(this.statusCode);
                res.end(data);
            },
            json(obj) {
                this.setHeader('Content-Type', 'application/json');
                this.end(JSON.stringify(obj));
            },
            redirect(code, location) {
                res.writeHead(code, { Location: location });
                res.end();
            },
        };

        await handler(mockReq, mockRes);
    } catch (err) {
        console.error(`[local-api] ${routeKey} error:`, err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
    }
});

server.listen(PORT, () => {
    const siteUrl = (process.env.SITE_URL || 'http://localhost:8080').replace(/\/$/, '');
    console.log(`[local-api] Payment API running at http://localhost:${PORT}`);
    console.log('[local-api] Start Vite with: npm run dev  →  http://localhost:8080');
    console.log(`[local-api] XentriPay webhook (prod): ${siteUrl}/api/webhooks/xentripay`);
    console.log(`[local-api] Card return URL base: ${siteUrl}/payment/success?ref=...`);
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.warn('[local-api] WARNING: SUPABASE_SERVICE_ROLE_KEY is missing — payments will not enroll');
    }
    if (!process.env.XENTRIPAY_API_KEY) {
        console.warn('[local-api] WARNING: XENTRIPAY_API_KEY is missing');
    }
});
