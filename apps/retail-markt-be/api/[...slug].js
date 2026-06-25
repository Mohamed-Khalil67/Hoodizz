// Diagnostic version — zero requires at module level. If even THIS
// times out, the problem is the Vercel function bundle/runtime itself,
// not anything in our Nest code.

const tBoot = Date.now();

let cachedHandler;
let initStatus = 'pending';
let initError = null;

async function ensureHandler() {
  if (cachedHandler) return cachedHandler;
  if (initError) throw initError;
  try {
    initStatus = 'loading-serverless';
    const serverless = require('serverless-http');
    initStatus = 'loading-main';
    const { createApp } = require('../dist/main.js');
    initStatus = 'creating-app';
    const expressApp = await createApp();
    initStatus = 'wrapping';
    cachedHandler = serverless(expressApp);
    initStatus = 'ready';
    return cachedHandler;
  } catch (err) {
    initError = err;
    initStatus = 'failed';
    throw err;
  }
}

module.exports = async (req, res) => {
  const url = req.url || '';

  // Default: return immediately with diagnostic info. Nest is only
  // invoked when the path starts with /api/nest/ — this proves the
  // function itself can respond.
  if (!url.startsWith('/api/nest/')) {
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    return res.end(
      JSON.stringify({
        ok: true,
        url: req.url,
        bootMs: Date.now() - tBoot,
        initStatus,
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

  // /api/nest/* — invoke Nest. Strip the /nest segment.
  req.url = url.replace('/api/nest', '/api');
  try {
    const handler = await ensureHandler();
    return handler(req, res);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    return res.end(
      JSON.stringify({
        error: 'Nest init failed',
        initStatus,
        message: err && err.message ? err.message : String(err),
      }),
    );
  }
};

module.exports.config = {
  api: { bodyParser: false },
};
