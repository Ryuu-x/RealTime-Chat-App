import rateLimit from "express-rate-limit";

export const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 signup requests per windowMs
  standardHeaders: true, // Return rate limit info in the RateLimit-* headers
  legacyHeaders: false, // Disable the X-RateLimit-* headers
  message: {
    message: "Too many signup attempts from this IP, please try again later.",
  },
  handler: (req, res /*, next */) => {
    // custom JSON response and Retry-After header
    const retryAfter = Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000);
    res.set("Retry-After", String(retryAfter));
    return res.status(429).json({
      message: "Too many signup attempts. Try again later.",
      retryAfterSeconds: retryAfter,
    });
  },
  skipSuccessfulRequests: false,
});

// per-IP (reasonable for login)
export const loginIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // allow some behaviour like rediscovery, but throttle extremes
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const retryAfter = Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000);
    res.set("Retry-After", String(retryAfter));
    return res
      .status(429)
      .json({
        message: "Too many requests from this IP. Try again later.",
        retryAfterSeconds: retryAfter,
      });
  },
});

// per-account (keyed by email) — stricter, counts only failed requests
export const loginAccountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // e.g., 5 failed attempts per account per window
  keyGenerator: (req /*, res*/) => {
    // fall back to IP when email not present
    const email =
      req.body && req.body.email ? req.body.email.trim().toLowerCase() : req.ip;
    return email;
  },
  skipSuccessfulRequests: true, // only count responses with status >= 400
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const retryAfter = Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000);
    res.set("Retry-After", String(retryAfter));
    return res
      .status(429)
      .json({
        message:
          "Too many failed login attempts. Try again later or reset your password.",
        retryAfterSeconds: retryAfter,
      });
  },
});
