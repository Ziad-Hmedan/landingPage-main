import { useEffect, useRef, useState } from "react";
import { useMotionValue } from "framer-motion";

export default function useCarouselTrack(count) {
  const slider = useRef(null);
  const track = useRef(null);
  const x = useMotionValue(0);
  const [width, setWidth] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const container = slider.current;
    const trackElement = track.current;
    if (!container || !trackElement) return;
    let measuredWidth = -1;

    const updateConstraints = () => {
      // Read the rendered layout so autoplay follows the actual CSS breakpoint.
      setIsMobile(window.getComputedStyle(trackElement).display === "none");
      const nextWidth = Math.max(0, trackElement.scrollWidth - container.clientWidth);
      if (nextWidth === measuredWidth) return;
      measuredWidth = nextWidth;
      setWidth(nextWidth);
      x.stop();
      x.set(Math.max(-nextWidth, Math.min(0, x.get())));
    };

    updateConstraints();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateConstraints);
    if (observer) {
      observer.observe(container);
      observer.observe(trackElement);
    } else {
      window.addEventListener("resize", updateConstraints);
    }
    return () => {
      observer?.disconnect();
      if (!observer) window.removeEventListener("resize", updateConstraints);
    };
  }, [count, x]);

  const moveTrack = direction => {
    const card = track.current?.firstElementChild;
    if (!card) return;
    const gap = parseFloat(window.getComputedStyle(track.current).columnGap) || 0;
    const step = card.getBoundingClientRect().width + gap;
    x.stop();
    x.set(Math.max(-width, Math.min(0, x.get() + direction * step)));
  };

  const handleTrackKeyDown = event => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    moveTrack(event.key === "ArrowRight" ? -1 : 1);
  };

  return { slider, track, x, width, isMobile, moveTrack, handleTrackKeyDown };
}
