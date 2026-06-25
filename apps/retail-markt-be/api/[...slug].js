// Vercel serverless entry — wraps the bundled NestJS Express app.
// The bundle is produced by `npx nx build retail-markt-be` and lives at
// ../dist/main.js. main.ts exports createApp() and skips listen() when
// VERCEL=1 is set in the environment.

const t0 = Date.now();
console.log('[FN] module load start');
const serverless = require('serverless-http');
console.log(`[FN] serverless-http loaded (+${Date.now() - t0}ms)`);

let cachedHandler;

async function getHandler() {
  if (cachedHandler) return cachedHandler;
  const tReq = Date.now();
  console.log('[FN] requiring dist/main.js');
  const { createApp } = require('../dist/main.js');
  console.log(`[FN] dist/main.js required (+${Date.now() - tReq}ms)`);

  const tApp = Date.now();
  console.log('[FN] calling createApp');
  const expressApp = await createApp();
  console.log(`[FN] createApp resolved (+${Date.now() - tApp}ms)`);

  cachedHandler = serverless(expressApp);
  console.log('[FN] handler ready');
  return cachedHandler;
}

module.exports = async (req, res) => {
  console.log(`[FN] request ${req.method} ${req.url}`);
  const handler = await getHandler();
  return handler(req, res);
};

// Disable Vercel's automatic body parsing so the Stripe webhook receives
// raw bytes — express.raw() in createApp() handles parsing for that route,
// and express.json() handles every other route.
module.exports.config = {
  api: { bodyParser: false },
};
