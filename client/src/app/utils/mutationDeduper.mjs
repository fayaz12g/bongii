export const createMutationDeduper = () => {
  const pending = new Map();

  return async (key, execute) => {
    if (!pending.has(key)) {
      pending.set(key, Promise.resolve().then(execute).finally(() => pending.delete(key)));
    }
    const response = await pending.get(key);
    return typeof response?.clone === "function" ? response.clone() : response;
  };
};