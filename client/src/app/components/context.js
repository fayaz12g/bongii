// context.js
"use client";
import { createContext, useContext, useState, useEffect } from "react";

const BackgroundContext = createContext();

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

   // Sync prop -> state
  useEffect(() => {
    if (initialPreset) {
      setSelectedPreset(initialPreset);
    }
  }, [initialPreset]);
  
  return (
    <BackgroundContext.Provider
      value={{ showDots, setShowDots, showGradient, setShowGradient, selectedPreset, setSelectedPreset, backgroundPresets }}
    >
      {children}
    </BackgroundContext.Provider>
  );
};


export const useBackground = () => useContext(BackgroundContext);
