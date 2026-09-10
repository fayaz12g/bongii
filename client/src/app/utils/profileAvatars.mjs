const createAvatarGroup = (name) => Object.freeze({
  name,
  avatars: Object.freeze(Array.from({ length: 8 }, (_, index) => {
    const variant = index + 1;
    const id = `${name.toLowerCase()}-${variant}`;
    return Object.freeze({
      id,
      label: `${name} ${variant}`,
      src: `/avatars/${id}.png`,
    });
  })),
});

export const PROFILE_AVATAR_GROUPS = Object.freeze([
  createAvatarGroup("Chippy"),
  createAvatarGroup("Lucky"),
]);

export const PROFILE_AVATAR_IDS = Object.freeze(
  PROFILE_AVATAR_GROUPS.flatMap((group) => group.avatars.map((avatar) => avatar.id)),
);

export const DEFAULT_PROFILE_AVATAR_ID = PROFILE_AVATAR_IDS[0];

const avatarById = new Map(
  PROFILE_AVATAR_GROUPS.flatMap((group) => group.avatars.map((avatar) => [avatar.id, avatar])),
);
const pendingAvatarKey = "bongii:pending-profile-avatar";

export const normalizeProfileAvatarId = (value) => {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (avatarById.has(normalized)) return normalized;
  const legacy = normalized.match(/^(?:icon-)?([1-4])$/);
  return legacy ? `chippy-${legacy[1]}` : DEFAULT_PROFILE_AVATAR_ID;
};

export const getProfileAvatar = (value) => avatarById.get(normalizeProfileAvatarId(value));

export const rememberPendingProfileAvatar = (storage, userId, profileIcon) => {
  storage.setItem(pendingAvatarKey, JSON.stringify({
    userId,
    profileIcon: normalizeProfileAvatarId(profileIcon),
  }));
};

export const readPendingProfileAvatar = (storage, userId) => {
  try {
    const pending = JSON.parse(storage.getItem(pendingAvatarKey));
    if (pending?.userId !== userId || !avatarById.has(pending?.profileIcon)) return null;
    return pending.profileIcon;
  } catch {
    storage.removeItem(pendingAvatarKey);
    return null;
  }
};

export const clearPendingProfileAvatar = (storage) => storage.removeItem(pendingAvatarKey);