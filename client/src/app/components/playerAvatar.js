"use client";

import Image from "next/image";
import { User } from "lucide-react";
import { useState } from "react";
import { isStorageEmulatorUrl } from "../utils/avatarUrls.mjs";
import { getProfileAvatar } from "../utils/profileAvatars.mjs";

const AvatarImage = ({ avatar, name, size, className }) => {
  const [fallbackStage, setFallbackStage] = useState(0);
  const photoUrl = avatar?.photoUrl;
  const profileAvatar = getProfileAvatar(avatar?.profileIcon);
  const presetUrl = profileAvatar.src;
  const source = fallbackStage === 0 && photoUrl ? photoUrl : presetUrl;

  if (fallbackStage >= 2) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded-full bg-panel-strong ${className}`}
        style={{ width: size, height: size }}
        role="img"
        aria-label={`${name || "Player"} avatar`}
      >
        <User className="h-1/2 w-1/2" aria-hidden="true" />
      </span>
    );
  }

  return (
    <Image
      src={source}
      alt={`${name || "Player"} avatar`}
      width={size}
      height={size}
      unoptimized={isStorageEmulatorUrl(source)}
      className={`rounded-full object-cover ${className}`}
      onError={() => setFallbackStage(photoUrl && fallbackStage === 0 ? 1 : 2)}
    />
  );
};

export default function PlayerAvatar({ avatar, name, size = 40, className = "" }) {
  const profileAvatar = getProfileAvatar(avatar?.profileIcon);
  return (
    <AvatarImage
      key={`${avatar?.photoUrl || "preset"}:${profileAvatar.id}`}
      avatar={avatar}
      name={name}
      size={size}
      className={className}
    />
  );
}