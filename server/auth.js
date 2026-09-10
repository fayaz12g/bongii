const asyncRoute = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const publicUser = (user) => ({
  id: user.id,
  username: user.legacyUsername || user.username || user.displayName,
  displayName: user.displayName
    || [user.firstName, user.lastName].filter(Boolean).join(' ')
    || user.username,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  profileIcon: user.profileIcon,
  photoUrl: user.photoUrl,
  doubleOrNothingCredits: user.doubleOrNothingCredits,
});

const createAuthenticationMiddleware = (database, verifyFirebaseToken, required) => asyncRoute(async (req, res, next) => {
  const authorization = req.get('Authorization');
  const bearer = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!bearer) {
    if (required) res.status(401).json({ error: 'Authentication required' });
    else next();
    return;
  }

  let decoded;
  try {
    decoded = await verifyFirebaseToken(bearer[1]);
  } catch {
    res.status(401).json({ error: 'Invalid, expired, or revoked token' });
    return;
  }

  if (!decoded.uid || !decoded.email || decoded.email_verified !== true) {
    res.status(403).json({ error: 'A verified email address is required' });
    return;
  }

  req.user = await database.syncFirebaseUser({
    firebaseUid: decoded.uid,
    displayName: decoded.name,
    email: decoded.email,
    emailVerified: decoded.email_verified,
    photoUrl: decoded.picture,
  });
  next();
});

const createAuthMiddleware = (database, verifyFirebaseToken) => (
  createAuthenticationMiddleware(database, verifyFirebaseToken, true)
);

const createOptionalAuthMiddleware = (database, verifyFirebaseToken) => (
  createAuthenticationMiddleware(database, verifyFirebaseToken, false)
);

module.exports = {
  asyncRoute,
  createAuthMiddleware,
  createOptionalAuthMiddleware,
  publicUser,
};