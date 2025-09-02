"use client";

import React, { useState } from "react";
import { Github, Volume2, VolumeX, Image, PaintBucket, Snowflake, Check } from "lucide-react";
import { useMusic } from "./music";
import { useBackground } from "./context";

const Footer = () => {
  const { isPlaying, start, stop } = useMusic();
  const [showMenu, setShowMenu] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  const {
    showDots,
    setShowDots,
    showGradient,
    setShowGradient,
    selectedPreset,
    setSelectedPreset,
    backgroundPresets,
  } = useBackground();

  const socialLinks = [
    { icon: Github, href: "https://github.com/fayaz12g/bongii", label: "GitHub" },
  ];

  return (
    <footer className="bg-red-900/0 fixed bottom-5 left-0 right-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Left socials */}
        <div className="flex space-x-6 absolute left-1 mb-10">
          {socialLinks.map(({ icon: Icon, href, label }) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="group" aria-label={label}>
              <Icon className="w-20 h-8 text-gray-200 group-hover:text-black transition-colors" />
            </a>
          ))}
        </div>

        {/* Center text */}
        <p className="text-center text-gray-200">
          Created by Fayaz, Not © {new Date().getFullYear()}.
        </p>

        {/* Bottom-right controls */}
        <div className="absolute right-4 bottom-0 flex space-x-3 items-end">
          {/* Landscape menu */}
          <div className="relative flex flex-col items-center">
            {showMenu && (
              <div className="relative -top-2 flex flex-col items-center bg-black/20 backdrop-blur-md rounded-full p-3 space-y-4">
                {/* Currently selected preset button (top) */}
                {!showPresets && (
                <button
                  onClick={() => setShowPresets((prev) => !prev)}
                  className="w-10 h-10 rounded-full border-2 border-white/50 transition-all overflow-hidden relative"
                  aria-label="Show preset options"
                >
                  {selectedPreset ? (
                    <div
                      className={`w-full h-full rounded-full bg-gradient-to-r ${selectedPreset.gradient}`}
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gray-400" />
                  )}
                </button>
                )}

                {/* Toggle Gradient */}
                {!showPresets && (
                <button
                  onClick={() => setShowGradient((prev) => !prev)}
                  className={`p-3 rounded-full border border-white/30 text-white transition-all ${
                    showGradient ? "bg-white text-black" : "bg-white/10 hover:bg-white/20"
                  }`}
                  aria-label="Toggle Background"
                >
                  <PaintBucket className={`w-5 h-5 ${showGradient ? "text-black/80" : "text-white/50"}`} />
                </button>
                )}

                {/* Toggle Dots */}
                {!showPresets && (
                <button
                  onClick={() => setShowDots((prev) => !prev)}
                  className={`p-3 rounded-full border border-white/30 text-white transition-all ${
                    showDots ? "bg-white text-black" : "bg-white/10 hover:bg-white/20"
                  }`}
                  aria-label="Toggle Dots"
                >
                  <Snowflake className={`w-5 h-5 ${showDots ? "text-black/80" : "text-white/50"}`} />
                </button>
                )}

                {/* Expanded preset grid */}
                {showPresets && (
                  <div className="grid grid-cols-3 grid-rows-2 gap-2 mt-2">
                    {backgroundPresets.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => {
                          setSelectedPreset(preset);
                          setShowPresets(false); // close grid after selection
                        }}
                        className={`w-10 h-10 rounded-full border-2 transition-all relative overflow-hidden ${
                          selectedPreset?.id === preset.id
                            ? "border-white scale-110"
                            : "border-white/30 hover:border-white/50"
                        }`}
                        aria-label={`Select ${preset.name} preset`}
                      >
                        {/* Gradient preview */}
                        <div className={`w-full h-full rounded-full bg-gradient-to-r ${preset.gradient}`} />

                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Landscape toggle button */}
            <button
              onClick={() => setShowMenu((prev) => !prev)}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/30 text-white transition-all"
              aria-label="Open Landscape Menu"
            >
              <Image className="w-6 h-6" />
            </button>
          </div>

          {/* Music button */}
          <button
            onClick={isPlaying ? stop : start}
            className="p-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/30 text-white transition-all"
            aria-label={isPlaying ? "Mute music" : "Unmute music"}
          >
            {isPlaying ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;