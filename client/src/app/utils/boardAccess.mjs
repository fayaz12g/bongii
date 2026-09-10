const storageKey = (boardCode) => `bongii-board-edit:${boardCode.toUpperCase()}`;

export const getBoardEditToken = (boardCode) => {
  if (typeof window === "undefined" || !boardCode) return null;
  return window.localStorage.getItem(storageKey(boardCode));
};

export const rememberBoardEditToken = (boardCode, token) => {
  if (typeof window === "undefined" || !boardCode || !token) return;
  window.localStorage.setItem(storageKey(boardCode), token);
};

export const forgetBoardEditToken = (boardCode) => {
  if (typeof window === "undefined" || !boardCode) return;
  window.localStorage.removeItem(storageKey(boardCode));
};