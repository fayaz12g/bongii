import { getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectStorageEmulator, getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let emulatorConnected = false;
let storageEmulatorConnected = false;

const getFirebaseApp = () => getApps()[0] || initializeApp(firebaseConfig);

export const getFirebaseConfigurationError = () => {
  const missing = ["apiKey", "authDomain", "projectId", "appId"]
    .filter((key) => !firebaseConfig[key]);
  return missing.length > 0
    ? `Firebase is not configured (${missing.join(", ")})`
    : "";
};

export const getFirebaseAuth = () => {
  const configurationError = getFirebaseConfigurationError();
  if (configurationError) throw new Error(configurationError);

  const app = getFirebaseApp();
  const auth = getAuth(app);
  const emulatorHost = process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST;
  if (emulatorHost && !emulatorConnected) {
    connectAuthEmulator(auth, `http://${emulatorHost}`, { disableWarnings: true });
    emulatorConnected = true;
  }
  return auth;
};

export const isAvatarUploadEnabled = () => (
  process.env.NEXT_PUBLIC_ENABLE_AVATAR_UPLOAD === "true"
  && Boolean(firebaseConfig.storageBucket)
);

export const getFirebaseStorage = () => {
  if (!isAvatarUploadEnabled()) throw new Error("Avatar uploads are not enabled");
  const storage = getStorage(getFirebaseApp());
  const emulatorHost = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST;
  if (emulatorHost && !storageEmulatorConnected) {
    const [host, port] = emulatorHost.split(":");
    connectStorageEmulator(storage, host, Number(port));
    storageEmulatorConnected = true;
  }
  return storage;
};