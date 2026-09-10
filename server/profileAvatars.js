const PROFILE_AVATAR_IDS = Object.freeze([
  ...Array.from({ length: 8 }, (_, index) => `chippy-${index + 1}`),
  ...Array.from({ length: 8 }, (_, index) => `lucky-${index + 1}`),
]);

const DEFAULT_PROFILE_AVATAR_ID = PROFILE_AVATAR_IDS[0];

module.exports = { DEFAULT_PROFILE_AVATAR_ID, PROFILE_AVATAR_IDS };