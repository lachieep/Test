import http from 'node:http';
import crypto from 'node:crypto';
import { openDb } from './db.js';
import { createApp } from './app.js';

const port = Number(process.env.PORT || 3000);
const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;
const secret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.SESSION_SECRET) console.warn('SESSION_SECRET not set: using a random secret, so logins reset on restart.');

const store = openDb();
const server = http.createServer(createApp({ store, secret, baseUrl }));
server.listen(port, () => console.log(`Tenanted running at ${baseUrl}`));

// Alert delivery: the MVP logs queued emails. Swap this for an email provider
// (SES, Postmark, SendGrid) before launch.
setInterval(() => {
  for (const a of store.pendingAlerts()) {
    console.log(`[alert] to=${a.email} subject="${a.subject}"`);
    store.markAlertSent(a.id);
  }
}, 30_000).unref();
