/**
 * In-memory sliding window rate limiter
 */

const requestCounts = new Map();

export function rateLimiter(options = {}) {
  const windowMs = options.windowMs || 60 * 1000; // default: 1 minute
  const max = options.max || 300; // max requests per windowMs

  // Clean expired buckets every 2 minutes
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [key, data] of requestCounts.entries()) {
      if (now - data.startTime > windowMs) {
        requestCounts.delete(key);
      }
    }
  }, 120000);
  if (interval.unref) interval.unref();

  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    const key = `${ip}:${req.baseUrl || ''}`;
    const now = Date.now();

    let record = requestCounts.get(key);
    if (!record || now - record.startTime > windowMs) {
      record = { count: 1, startTime: now };
      requestCounts.set(key, record);
      return next();
    }

    record.count++;
    if (record.count > max) {
      return res.status(429).json({
        success: false,
        error: {
          message: 'Too many requests. Please slow down.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfterSeconds: Math.ceil((record.startTime + windowMs - now) / 1000)
        }
      });
    }

    next();
  };
}
