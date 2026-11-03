import { useEffect, useState } from "react";
import useMediaQuery from "./useMediaQuery";

const ROTATION_INTERVAL_MS = 3500;

export default function useCarouselAutoplay({ count, isMobile, setActiveIndex }) {
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(() =>
    typeof document === "undefined" || document.visibilityState === "visible"
  );
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const isRotating = count > 1 && isMobile && isPageVisible
    && !isPaused && !isHovered && !reducedMotion;

  useEffect(() => {
    const update = () => setIsPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(() => {
    if (!isRotating) return;
    const intervalId = window.setInterval(() => {
      setActiveIndex(index => (index + 1) % count);
    }, ROTATION_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [count, isRotating, setActiveIndex]);

  return { isPaused, setIsPaused, setIsHovered, reducedMotion, isRotating };
}
