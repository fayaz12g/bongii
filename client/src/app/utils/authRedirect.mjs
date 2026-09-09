export const safeReturnTo = (value, fallback = "/home") => {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  return value;
};

export const loginHref = (returnTo) => {
  const safePath = safeReturnTo(returnTo);
  return `/login?returnTo=${encodeURIComponent(safePath)}`;
};