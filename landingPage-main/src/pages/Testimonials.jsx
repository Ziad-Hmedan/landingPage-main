import { motion, useMotionValue } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";

const ROTATION_INTERVAL_MS = 3500;

const testimonialType = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  Name: PropTypes.string.isRequired,
  comment: PropTypes.string.isRequired,
  avatar: PropTypes.string.isRequired,
});

function TestimonialContent({ testimonial: { Name, comment, avatar } }) {
  return (
    <>
      <div>
        <img
          src={avatar}
          alt={`${Name}-avatar`}
          className="rounded-full absolute right-[50%] translate-x-[50%] translate-y-[-50%] w-[72px] h-[72px]"
        />
      </div>
      <h3 className="h3-text text-center mt-[67px] max-xl:mt-[60px]">{Name}</h3>
      <p className="p-text text-center mt-5 font-vitenam xl:px-10">{comment}</p>
    </>
  );
}

TestimonialContent.propTypes = {
  testimonial: testimonialType.isRequired,
};

export default function Testimonials({ testimonials }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [width, setWidth] = useState(0);
  const measuredWidth = useRef(null);
  const slider = useRef(null);
  const track = useRef(null);
  const x = useMotionValue(0);
  const count = testimonials.length;
  const currentIndex = count === 0 ? 0 : activeIndex % count;
  const isRotating = count > 1 && isMobile && isPageVisible
    && !isPaused && !isHovered && !reducedMotion;

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateAutoplayPreferences = () => {
      setReducedMotion(preference.matches);
      setIsPageVisible(document.visibilityState === "visible");
    };
    updateAutoplayPreferences();
    preference.addEventListener("change", updateAutoplayPreferences);
    document.addEventListener("visibilitychange", updateAutoplayPreferences);
    return () => {
      preference.removeEventListener("change", updateAutoplayPreferences);
      document.removeEventListener("visibilitychange", updateAutoplayPreferences);
    };
  }, []);

  useEffect(() => {
    if (!isRotating) return;
    const intervalId = window.setInterval(() => {
      setActiveIndex(index => (index + 1) % count);
    }, ROTATION_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [count, isRotating]);

  useEffect(() => {
    const containerElement = slider.current;
    const trackElement = track.current;
    const updateConstraints = () => {
      // Follow the CSS layout instead of duplicating its breakpoint in JavaScript.
      setIsMobile(window.getComputedStyle(trackElement).display === "none");
      const nextWidth = Math.max(0, trackElement.scrollWidth - containerElement.clientWidth);
      if (nextWidth === measuredWidth.current) return;

      measuredWidth.current = nextWidth;
      setWidth(nextWidth);
      x.stop();
      x.set(Math.max(-nextWidth, Math.min(0, x.get())));
    };

    updateConstraints();
    const observer = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(updateConstraints);
    observer?.observe(containerElement);
    observer?.observe(trackElement);
    window.addEventListener("resize", updateConstraints);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateConstraints);
    };
  }, [count, x]);

  const handleTrackKeyDown = event => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? -1 : 1;
    const cardWidth = track.current.firstElementChild?.getBoundingClientRect().width ?? 0;
    x.stop();
    x.set(Math.max(-width, Math.min(0, x.get() + direction * cardWidth)));
  };

  return (
    <motion.section
      ref={slider}
      aria-label="Testimonials"
      aria-roledescription="carousel"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsPaused(true);
      }}
      className="xl:mt-[106px] mt-[54px] xl:mb-[172px] mb-[42px] overflow-hidden"
    >
      <h2 className="h2-text text-center xl:mb-[56px] mb-[62px]">What they’ve said</h2>
      <motion.ul
        ref={track}
        drag="x"
        dragConstraints={{ right: 0, left: -width }}
        style={{ x, touchAction: "pan-y" }}
        tabIndex={0}
        aria-label="Testimonials; use the left and right arrow keys to scroll"
        onKeyDown={handleTrackKeyDown}
        className="max-lg:hidden flex cursor-grab mt-[92px]"
      >
        {testimonials.map(testimonial => (
          <li
            key={testimonial.id}
            className="min-h-[220px] min-w-[540px] relative transition ease-in-out duration-700 -z-10 mx-auto"
          >
            <TestimonialContent testimonial={testimonial} />
          </li>
        ))}
      </motion.ul>
      <ul
        aria-live={isRotating ? "off" : "polite"}
        className="lg:hidden bg-almost-white -z-50 relative mx-auto w-[340px] min-h-[248px] mt-[158px] flex flex-col gap-10"
      >
        {testimonials.map((testimonial, index) => (
          <li
            key={testimonial.id}
            aria-hidden={index !== currentIndex}
            className={`transition ease-in-out duration-700 absolute -z-10 mx-auto ${index === currentIndex ? "opacity-100" : "opacity-0"}`}
          >
            <TestimonialContent testimonial={testimonial} />
          </li>
        ))}
      </ul>
      <ul className="lg:hidden flex gap-1 mx-auto mt-5 justify-center" aria-label="Choose a testimonial">
        {testimonials.map((testimonial, index) => (
          <li key={testimonial.id} className="flex">
            <button
              type="button"
              aria-label={`Show testimonial ${index + 1}: ${testimonial.Name}`}
              aria-pressed={index === currentIndex}
              onClick={() => setActiveIndex(index)}
              className={`w-2 h-2 ${index === currentIndex ? "bg-BrightRed" : "bg-white"} border border-BrightRed rounded-full`}
            />
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => setIsPaused(paused => !paused)}
        disabled={count < 2 || reducedMotion}
        className="sr-only focus:not-sr-only focus:block focus:mx-auto lg:hidden"
      >
        {reducedMotion
          ? "Automatic testimonials paused for reduced motion"
          : isPaused ? "Resume automatic testimonials" : "Pause automatic testimonials"}
      </button>
      <div className="grid place-items-center pb-2">
        <button type="button" className="btn btn-orange xl:mt-[88px] mt-[50px] z-30">
          Get started
        </button>
      </div>
    </motion.section>
  );
}

Testimonials.propTypes = {
  testimonials: PropTypes.arrayOf(testimonialType).isRequired,
};
