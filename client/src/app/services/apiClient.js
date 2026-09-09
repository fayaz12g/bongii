import { getFirebaseAuth } from "../utils/firebase";
import { getServerPath } from "../utils/config";

export const apiFetch = (path, options = {}) => fetch(`${getServerPath()}${path}`, options);

export const authenticatedApiFetch = async (path, options = {}) => {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Authentication required");

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${await user.getIdToken()}`);
  return apiFetch(path, { ...options, headers });
};