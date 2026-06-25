// Vercel serverless entry — wraps the bundled NestJS Express app.
// The bundle is produced by `npx nx build retail-markt-be` and lives at
// ../dist/main.js. main.ts exports createApp() and skips listen() when
// VERCEL=1 is set in the environment.

const tBoot = Date.now();
console.log('[FN] module load start');
const serverless = require('serverless-http');
console.log(`[FN] serverless-http loaded (+${Date.now() - tBoot}ms)`);

let cachedHandler;
let initError;

async function getHandler() {
  if (cachedHandler) return cachedHandler;
  if (initError) throw initError;
  const tReq = Date.now();
  try {
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
  } catch (err) {
    initError = err;
    console.error('[FN] init failed:', err && err.stack ? err.stack : err);
    throw err;
  }
}

module.exports = async (req, res) => {
  console.log(`[FN] request ${req.method} ${req.url}`);

  // Diagnostic bypass — responds without touching Nest. If this works
  // but /api/graphql times out, the problem is Nest init, not the function.
  if (req.url && req.url.startsWith('/api/_debug')) {
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    return res.end(
      JSON.stringify({
        ok: true,
        bootMs: Date.now() - tBoot,
        cachedHandler: !!cachedHandler,
        initError: initError ? String(initError) : null,
        env: {
          NODE_ENV: process.env.NODE_ENV,
          VERCEL: process.env.VERCEL,
          hasDatabaseUrl: !!process.env.DATABASE_URL,
          hasStripeSecret: !!process.env.STRIPE_SECRET,
          hasFrontendUrl: !!process.env.FRONTEND_URL,
          hasFirebaseCreds: !!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
          hasStripeWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
        },
      }),
    );
  }

  try {
    const handler = await getHandler();
    return handler(req, res);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    return res.end(
      JSON.stringify({
        error: 'Nest init failed',
        message: err && err.message ? err.message : String(err),
      }),
    );
  }
};

// Disable Vercel's automatic body parsing so the Stripe webhook receives
// raw bytes — express.raw() in createApp() handles parsing for that route,
// and express.json() handles every other route.
module.exports.config = {
  api: { bodyParser: false },
};
