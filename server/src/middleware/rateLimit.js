const { rateLimit } = require("express-rate-limit");

function limiter(limit, message) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message },
  });
}

const authLimiter = limiter(
  Number(process.env.AUTH_RATE_LIMIT) || 30,
  "Too many attempts. Please try again in a few minutes.",
);

const trackingLimiter = limiter(
  Number(process.env.TRACKING_RATE_LIMIT) || 200,
  "Too many tracking requests. Please try again in a few minutes.",
);

module.exports = { authLimiter, trackingLimiter };
