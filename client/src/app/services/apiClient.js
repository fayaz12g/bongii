import { getFirebaseAuth } from "../utils/firebase";
import { getServerPath } from "../utils/config";
import { apiReadiness } from "../utils/readiness.mjs";
import { createMutationDeduper } from "../utils/mutationDeduper.mjs";

const dedupeMutation = createMutationDeduper();

export const apiFetch = async (path, options = {}) => {
  await apiReadiness.ensure();
  const method = (options.method || "GET").toUpperCase();
  const execute = () => fetch(`${getServerPath()}${path}`, options);
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return execute();

  const key = `${method}:${path}:${typeof options.body === "string" ? options.body : ""}`;
  return dedupeMutation(key, execute);
};

export const authenticatedApiFetch = async (path, options = {}) => {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Authentication required");

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${await user.getIdToken()}`);
  return apiFetch(path, { ...options, headers });
};

export const optionalAuthenticatedApiFetch = async (path, options = {}) => {
  const user = getFirebaseAuth().currentUser;
  if (!user?.emailVerified) return apiFetch(path, options);

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${await user.getIdToken()}`);
  return apiFetch(path, { ...options, headers });
};