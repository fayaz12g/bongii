const jwt = require('jsonwebtoken');

const asyncRoute = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const publicUser = (user) => ({
  id: user.id,
  username: user.username,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  profileIcon: user.profileIcon,
});

const createAuthMiddleware = (database, jwtSecret) => asyncRoute(async (req, res, next) => {
  const authorization = req.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  let decoded;
  try {
    decoded = jwt.verify(authorization.slice(7), jwtSecret);
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const user = decoded.sub
    ? await database.getUser(Number(decoded.sub))
    : await database.getUserByUsername(decoded.username);
  if (!user) {
    res.status(401).json({ error: 'Account no longer exists' });
    return;
  }

  req.user = user;
  next();
});

module.exports = { asyncRoute, createAuthMiddleware, publicUser };