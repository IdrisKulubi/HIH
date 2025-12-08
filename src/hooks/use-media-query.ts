"use client";

import { useState, useEffect } from "react";

/**
 * Custom hook for responsive design that detects if a media query matches
 * 
 * @param query The media query to check against
 * @returns Boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  // Initialize with null during SSR to prevent hydration mismatch
  const [matches, setMatches] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    
    // Create a media query list
    const mediaQueryList = window.matchMedia(query);
    
    // Set the initial value
    setMatches(mediaQueryList.matches);
    
    // Define a callback function to update the state
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };
    
    // Add the listener
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener("change", listener);
    } else {
      // Fallback for older browsers
      mediaQueryList.addListener(listener);
    }
    
    // Clean up
    return () => {
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener("change", listener);
      } else {
        // Fallback for older browsers
        mediaQueryList.removeListener(listener);
      }
    };
  }, [query]);

  // Return false during SSR and first render
  return mounted ? matches : false;
} 