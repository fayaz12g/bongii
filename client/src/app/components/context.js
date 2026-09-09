// context.js
"use client";
import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { MotionConfig } from "framer-motion";

const BackgroundContext = createContext();
const MOTION_STORAGE_KEY = "bongii-reduce-motion";
const MOTION_EVENT = "bongii:motion-preference";

const getMotionSnapshot = () => {
  const stored = localStorage.getItem(MOTION_STORAGE_KEY);
  if (stored === "true") return true;
  if (stored === "false") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

const subscribeToMotion = (callback) => {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  window.addEventListener("storage", callback);
  window.addEventListener(MOTION_EVENT, callback);
  media.addEventListener("change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(MOTION_EVENT, callback);
    media.removeEventListener("change", callback);
  };
};

export const BackgroundProvider = ({ children, selectedPreset: initialPreset }) => {
  const backgroundPresets = [
    { id: 1, name: "Ocean Waves", gradient: "from-blue-400 via-blue-600 to-purple-700", animation: "wave" },
    { id: 2, name: "Sunset Glow", gradient: "from-orange-400 via-pink-500 to-purple-600", animation: "glow" },
    { id: 3, name: "Forest Mystery", gradient: "from-green-400 via-teal-500 to-blue-600", animation: "float" },
    { id: 4, name: "Cherry Blossom", gradient: "from-pink-300 via-purple-400 to-indigo-500", animation: "drift" },
    { id: 5, name: "Golden Hour", gradient: "from-yellow-400 via-orange-500 to-red-600", animation: "pulse" },
    { id: 6, name: "Arctic Aurora", gradient: "from-cyan-300 via-blue-400 to-indigo-600", animation: "shimmer" },
  ];

  const [showDots, setShowDots] = useState(true);
  const [showGradient, setShowGradient] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState(initialPreset || backgroundPresets[0]);
  const reduceMotion = useSyncExternalStore(subscribeToMotion, getMotionSnapshot, () => false);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(reduceMotion);
  }, [reduceMotion]);

  const setReduceMotion = (value) => {
    localStorage.setItem(MOTION_STORAGE_KEY, String(value));
    window.dispatchEvent(new Event(MOTION_EVENT));
  };

  return (
    <BackgroundContext.Provider
      value={{
        showDots,
        setShowDots,
        showGradient,
        setShowGradient,
        selectedPreset,
        setSelectedPreset,
        backgroundPresets,
        reduceMotion,
        setReduceMotion,
      }}
    >
      <MotionConfig
        reducedMotion={reduceMotion ? "always" : "never"}
        transition={reduceMotion ? { duration: 0 } : undefined}
      >
        {children}
      </MotionConfig>
    </BackgroundContext.Provider>
  );
};


export const useBackground = () => useContext(BackgroundContext);
