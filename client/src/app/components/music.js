"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";

const MusicContext = createContext();

export function MusicProvider({ children }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    // create once
    if (!audioRef.current) {
      audioRef.current = new Audio("/music/bongii.mp3");
      audioRef.current.loop = true;
      audioRef.current.volume = 0.7;
    }

    return () => {
      // don’t fully kill audio, just pause
      audioRef.current?.pause();
    };
  }, []);

  const start = () => {
    if (audioRef.current && audioRef.current.paused) {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn("Autoplay blocked, waiting for user gesture", err);
      });
    }
  };

  const stop = () => {
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <MusicContext.Provider value={{ start, stop, isPlaying }}>
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  return useContext(MusicContext);
}
