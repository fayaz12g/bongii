const { applicationDefault, cert, getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

const createFirebaseTokenVerifier = (config) => {
  if ((config.authMode || 'legacy') === 'legacy') return null;

  const appName = `bongii-${config.firebaseProjectId}`;
  let app = getApps().find((candidate) => candidate.name === appName);
  if (!app) {
    const options = { projectId: config.firebaseProjectId };
    if (!config.firebaseAuthEmulatorHost) {
      options.credential = config.firebaseClientEmail && config.firebasePrivateKey
        ? cert({
          projectId: config.firebaseProjectId,
          clientEmail: config.firebaseClientEmail,
          privateKey: config.firebasePrivateKey,
        })
        : applicationDefault();
    }
    app = initializeApp(options, appName);
  }

  const auth = getAuth(app);
  return (token) => auth.verifyIdToken(token, true);
};

module.exports = { createFirebaseTokenVerifier };