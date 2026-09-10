const createBoardCreationRateLimit = ({
  clock = Date.now,
  windowMs = 10 * 60 * 1000,
  perIpCampaignLimit = 30,
  perCampaignLimit = 500,
} = {}) => {
  const attempts = new Map();

  const consume = (key, limit, now) => {
    const current = attempts.get(key);
    if (!current || current.resetAt <= now) {
      attempts.set(key, { count: 1, resetAt: now + windowMs });
      return null;
    }
    if (current.count >= limit) return current.resetAt;
    current.count += 1;
    return null;
  };

  return (req, res, next) => {
    const now = clock();
    const campaignCode = req.params.code.toUpperCase();
    const resetAt = consume(`ip:${req.ip}:${campaignCode}`, perIpCampaignLimit, now)
      || consume(`campaign:${campaignCode}`, perCampaignLimit, now);
    if (resetAt) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((resetAt - now) / 1000))));
      res.status(429).json({ error: 'Too many board creation attempts. Try again shortly.' });
      return;
    }
    next();
  };
};

module.exports = { createBoardCreationRateLimit };