// Vercel serverless entry — wraps the bundled NestJS Express app.
// The bundle is produced by `npx nx build retail-markt-be` and lives at
// ../dist/main.js. main.ts exports createApp() and skips listen() when
// VERCEL=1 is set in the environment.

const serverless = require('serverless-http');

let cachedHandler;

async function getHandler() {
  if (cachedHandler) return cachedHandler;
  const { createApp } = require('../dist/main.js');
  const expressApp = await createApp();
  cachedHandler = serverless(expressApp);
  return cachedHandler;
}

module.exports = async (req, res) => {
  const handler = await getHandler();
  return handler(req, res);
};

// Disable Vercel's automatic body parsing so the Stripe webhook receives
// raw bytes — express.raw() in createApp() handles parsing for that route,
// and express.json() handles every other route.
module.exports.config = {
  api: { bodyParser: false },
};
