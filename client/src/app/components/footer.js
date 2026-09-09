"use client";

import React, { useState } from "react";
import { Github, Volume2, VolumeX, Image as ImageIcon, PaintBucket, Snowflake } from "lucide-react";
import { usePathname } from "next/navigation";
import { useMusic } from "./music";
import { useBackground } from "./context";

const Footer = () => {
  const { isPlaying, start, stop } = useMusic();
  const [showMenu, setShowMenu] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/" || pathname === "/home";

  const {
    showDots,
    setShowDots,
    showGradient,
    setShowGradient,
    selectedPreset,
    setSelectedPreset,
    backgroundPresets,
    reduceMotion,
    setReduceMotion,
  } = useBackground();

  const socialLinks = [
    { icon: Github, href: "https://github.com/fayaz12g/bongii", label: "GitHub" },
  ];

  return (
    <footer className="relative mt-12 border-t border-line bg-[#10161d] py-5">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          {socialLinks.map(({ icon: Icon, href, label }) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="group p-2" aria-label={label} title={label}>
              <Icon className="h-6 w-6 text-muted transition-colors group-hover:text-white" />
            </a>
          ))}
        </div>

        <p className="text-sm text-muted">
          Created by Fayaz, Not © {new Date().getFullYear()}.
        </p>

        <div className="flex items-end gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={reduceMotion}
            onClick={() => setReduceMotion(!reduceMotion)}
            className="flex min-h-11 items-center gap-2 rounded-md border border-line bg-panel-strong px-3 text-sm font-medium text-white transition-colors hover:bg-slate-700"
          >
            <span>Reduce motion</span>
            <span className={`relative h-6 w-11 rounded-full border transition-colors ${reduceMotion ? "border-focus bg-focus" : "border-line bg-page"}`} aria-hidden="true">
              <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${reduceMotion ? "translate-x-5" : "translate-x-1"}`} />
            </span>
          </button>
          {isHome && <div className="relative flex flex-col items-center">
            {showMenu && (
              <div className="absolute bottom-14 flex flex-col items-center space-y-3 rounded-md border border-line bg-panel p-3 shadow-xl">
                {!showPresets && (
                <button
                  type="button"
                  onClick={() => setShowPresets((prev) => !prev)}
                  className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-white/50 transition-colors"
                  aria-label="Show preset options"
                  title="Choose background preset"
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

                {!showPresets && (
                <button
                  type="button"
                  onClick={() => setShowGradient((prev) => !prev)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border text-white transition-colors ${
                    showGradient ? "bg-white text-black" : "bg-white/10 hover:bg-white/20"
                  }`}
                  aria-label="Toggle background color"
                  aria-pressed={showGradient}
                  title="Toggle background color"
                >
                  <PaintBucket className={`w-5 h-5 ${showGradient ? "text-black/80" : "text-white/50"}`} />
                </button>
                )}

                {!showPresets && (
                <button
                  type="button"
                  onClick={() => setShowDots((prev) => !prev)}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border text-white transition-colors ${
                    showDots ? "bg-white text-black" : "bg-white/10 hover:bg-white/20"
                  }`}
                  aria-label="Toggle background particles"
                  aria-pressed={showDots}
                  title="Toggle background particles"
                >
                  <Snowflake className={`w-5 h-5 ${showDots ? "text-black/80" : "text-white/50"}`} />
                </button>
                )}

                {showPresets && (
                  <div className="grid grid-cols-3 gap-2">
                    {backgroundPresets.map((preset) => (
                      <button
                        type="button"
                        key={preset.id}
                        onClick={() => {
                          setSelectedPreset(preset);
                          setShowPresets(false); // close grid after selection
                        }}
                        className={`relative h-10 w-10 overflow-hidden rounded-full border-2 transition-colors ${
                          selectedPreset?.id === preset.id
                            ? "border-focus"
                            : "border-white/30 hover:border-white/50"
                        }`}
                        aria-label={`Select ${preset.name} preset`}
                        aria-pressed={selectedPreset?.id === preset.id}
                        title={preset.name}
                      >
                        {/* Gradient preview */}
                        <div className={`w-full h-full rounded-full bg-gradient-to-r ${preset.gradient}`} />

                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowMenu((prev) => !prev)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-panel-strong text-white transition-colors hover:bg-slate-700"
              aria-label="Background appearance"
              aria-expanded={showMenu}
              title="Background appearance"
            >
              <ImageIcon className="w-6 h-6" />
            </button>
          </div>}

          <button
            type="button"
            onClick={isPlaying ? stop : start}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-panel-strong text-white transition-colors hover:bg-slate-700"
            aria-label={isPlaying ? "Mute music" : "Unmute music"}
            aria-pressed={isPlaying}
            title={isPlaying ? "Mute music" : "Unmute music"}
          >
            {isPlaying ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;