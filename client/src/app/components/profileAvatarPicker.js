"use client";

import Image from "next/image";
import { PROFILE_AVATAR_GROUPS } from "../utils/profileAvatars.mjs";

export default function ProfileAvatarPicker({
  disabled = false,
  googlePhotoUrl = null,
  onSelect,
  onSelectGoogle,
  selectedId,
  usingGoogle = false,
}) {
  return (
    <fieldset className="space-y-5" disabled={disabled}>
      <legend className="mb-4 text-lg font-semibold text-white">Choose avatar</legend>

      {googlePhotoUrl && (
        <section aria-labelledby="avatar-group-google">
          <h3 id="avatar-group-google" className="mb-2 text-sm font-semibold text-gray-200">Google image</h3>
          <button
            type="button"
            onClick={onSelectGoogle}
            aria-label="Use Google profile image"
            aria-pressed={usingGoogle}
            className={`h-20 w-20 overflow-hidden rounded-md border-2 p-1 transition-colors ${
              usingGoogle ? "border-amber-300 bg-amber-300/15" : "border-line hover:border-white/60"
            }`}
          >
            <Image
              src={googlePhotoUrl}
              alt="Google profile"
              width={72}
              height={72}
              className="h-full w-full rounded object-cover"
            />
          </button>
        </section>
      )}

      {PROFILE_AVATAR_GROUPS.map((group) => (
        <section key={group.name} aria-labelledby={`avatar-group-${group.name.toLowerCase()}`}>
          <h3
            id={`avatar-group-${group.name.toLowerCase()}`}
            className="mb-2 text-sm font-semibold text-gray-200"
          >
            {group.name}
          </h3>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {group.avatars.map((avatar) => (
              <button
                type="button"
                key={avatar.id}
                onClick={() => onSelect(avatar.id)}
                aria-label={avatar.label}
                aria-pressed={!usingGoogle && selectedId === avatar.id}
                className={`aspect-square overflow-hidden rounded-md border-2 p-1 transition-colors ${
                  !usingGoogle && selectedId === avatar.id
                    ? "border-amber-300 bg-amber-300/15"
                    : "border-line hover:border-white/60"
                }`}
              >
                <Image
                  src={avatar.src}
                  alt=""
                  width={128}
                  height={128}
                  className="h-full w-full rounded object-cover"
                />
              </button>
            ))}
          </div>
        </section>
      ))}
    </fieldset>
  );
}