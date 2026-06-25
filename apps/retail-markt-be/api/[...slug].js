// Thin Vercel function shim. The Nest app + serverless-http are
// pre-bundled into ../dist/main.js by webpack with externalDependencies:
// 'none', producing a single self-contained ~21 MB file.
//
// We use eval('require') so ncc cannot statically follow the require()
// and re-bundle the world. ncc therefore bundles only this shim.
// At runtime the require resolves dist/main.js from disk, where it lives
// because of `includeFiles: "dist/**"` in vercel.json.

const tBoot = Date.now();
const dynamicRequire = eval('require');

let cachedHandler;
let initError = null;
let initStatus = 'pending';

async function getHandler() {
  if (cachedHandler) return cachedHandler;
  if (initError) throw initError;
  try {
    initStatus = 'loading-bundle';
    const t0 = Date.now();
    const main = dynamicRequire('../dist/main.js');
    console.log(`[FN] dist/main.js loaded (+${Date.now() - t0}ms)`);

    initStatus = 'ready';
    cachedHandler = main.vercelHandler;
    if (typeof cachedHandler !== 'function') {
      throw new Error('vercelHandler is not exported from dist/main.js');
    }
    return cachedHandler;
  } catch (err) {
    initError = err;
    initStatus = 'failed';
    console.error('[FN] init failed:', err && err.stack ? err.stack : err);
    throw err;
  }
}

module.exports = async (req, res) => {
  const url = req.url || '';

  // Diagnostic endpoint — answered without loading Nest.
  if (url.startsWith('/api/_debug')) {
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

  try {
    const handler = await getHandler();
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
