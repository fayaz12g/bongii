import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { isUploadedAvatarUrl } from "./avatarUrls.mjs";
import { getFirebaseStorage } from "./firebase";

export { isUploadedAvatarUrl } from "./avatarUrls.mjs";

const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const MAX_BYTES = 2 * 1024 * 1024;
const MIN_DIMENSION = 128;
const MAX_DIMENSION = 4096;

const imageDimensions = async (file) => {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return { height: image.naturalHeight, width: image.naturalWidth };
  } finally {
    URL.revokeObjectURL(url);
  }
};

export const validateAvatarFile = async (file) => {
  const extension = ALLOWED_TYPES.get(file?.type);
  if (!extension) throw new Error("Choose a JPEG, PNG, or WebP image");
  if (file.size > MAX_BYTES) throw new Error("Avatar images must be 2 MB or smaller");
  const { height, width } = await imageDimensions(file);
  if (width < MIN_DIMENSION || height < MIN_DIMENSION
    || width > MAX_DIMENSION || height > MAX_DIMENSION) {
    throw new Error("Avatar dimensions must be between 128 and 4096 pixels");
  }
  return extension;
};

export const uploadAvatar = async (uid, file) => {
  const extension = await validateAvatarFile(file);
  const object = ref(getFirebaseStorage(), `avatars/${uid}/${crypto.randomUUID()}.${extension}`);
  await uploadBytes(object, file, { cacheControl: "public,max-age=3600", contentType: file.type });
  return getDownloadURL(object);
};

export const deleteUploadedAvatar = async (uid, url) => {
  if (!isUploadedAvatarUrl(url, uid)) return;
  await deleteObject(ref(getFirebaseStorage(), url));
};