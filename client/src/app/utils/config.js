const serverBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000")
  .replace(/\/$/, "");

export const getServerPath = () => `${serverBase}/api`;
