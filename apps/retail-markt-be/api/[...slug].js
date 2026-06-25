// Absolute minimum function — zero requires, zero references to anything
// that could be statically traced and bundled. If THIS times out, the
// Vercel function infrastructure itself isn't working for this project.

module.exports = (req, res) => {
  res.statusCode = 200;
  res.setHeader('content-type', 'application/json');
  res.end(
    JSON.stringify({
      ok: true,
      url: req.url,
      timestamp: Date.now(),
      env: {
        NODE_ENV: process.env.NODE_ENV || null,
        VERCEL: process.env.VERCEL || null,
      },
    }),
  );
};
