export const isStorageEmulatorUrl = (
  value,
  emulatorHost = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST,
) => {
  if (!emulatorHost) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" && parsed.host === emulatorHost;
  } catch {
    return false;
  }
};

export const isUploadedAvatarUrl = (
  value,
  uid,
  emulatorHost = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_EMULATOR_HOST,
) => {
  if (!uid) return false;
  try {
    const parsed = new URL(value);
    const isProductionStorage = parsed.protocol === "https:"
      && parsed.hostname === "firebasestorage.googleapis.com";
    if (!isProductionStorage && !isStorageEmulatorUrl(value, emulatorHost)) return false;

    const marker = "/o/";
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex === -1) return false;
    const objectPath = decodeURIComponent(parsed.pathname.slice(markerIndex + marker.length));
    return objectPath.startsWith(`avatars/${uid}/`);
  } catch {
    return false;
  }
};