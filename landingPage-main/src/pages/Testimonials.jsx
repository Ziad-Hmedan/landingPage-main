import { motion } from "framer-motion";
import { useState } from "react";
import PropTypes from "prop-types";
import { Button } from "../components";
import useCarouselAutoplay from "../hooks/useCarouselAutoplay";
import useCarouselTrack from "../hooks/useCarouselTrack";

const testimonialType = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  name: PropTypes.string.isRequired,
  comment: PropTypes.string.isRequired,
  avatar: PropTypes.string.isRequired,
});

function TestimonialContent({ testimonial: { name, comment, avatar } }) {
  return (
    <>
      <img
        src={avatar}
        alt=""
        width="72"
        height="72"
        loading="lazy"
        decoding="async"
        draggable={false}
        className="rounded-full absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 w-[72px] h-[72px] object-cover"
      />
      <h3 className="h3-text text-center mt-8">{name}</h3>
      <blockquote className="p-text text-center mt-5">{comment}</blockquote>
    </>
  );
}

TestimonialContent.propTypes = { testimonial: testimonialType.isRequired };

export default function Testimonials({ testimonials }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const count = testimonials.length;
  const currentIndex = count ? activeIndex % count : 0;
  const { slider, track, x, width, isMobile, moveTrack, handleTrackKeyDown } = useCarouselTrack(count);
  const { isPaused, setIsPaused, setIsHovered, reducedMotion, isRotating } =
    useCarouselAutoplay({ count, isMobile, setActiveIndex });

  function handleSelectorKeyDown(event) {
    let nextIndex;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % count;
    else if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + count) % count;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = count - 1;
    else return;

    event.preventDefault();
    setActiveIndex(nextIndex);
    setIsPaused(true);
    event.currentTarget.querySelectorAll("button")[nextIndex]?.focus();
  }

  return (
    <section
      id="testimonials"
      tabIndex={-1}
      ref={slider}
      aria-label="Testimonials"
      aria-roledescription={count ? "carousel" : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsPaused(true);
      }}
      className="xl:mt-[106px] mt-16 xl:mb-28 mb-14 overflow-hidden"
    >
      <h2 className="h2-text text-center">What they&rsquo;ve said</h2>
      {count === 0 ? (
        <p className="p-text text-center mt-6">No testimonials are available right now.</p>
      ) : (
        <>
          <motion.ul
            ref={track}
            drag={width > 0 ? "x" : false}
            dragConstraints={{ right: 0, left: -width }}
            dragElastic={reducedMotion ? 0 : 0.15}
            dragMomentum={!reducedMotion}
            style={{ x, touchAction: "pan-y" }}
            tabIndex={0}
            aria-label="Testimonials; use the left and right arrow keys to scroll"
            onKeyDown={handleTrackKeyDown}
            className="max-lg:hidden flex gap-6 cursor-grab active:cursor-grabbing pt-12 pb-4 mt-6 px-5"
          >
            {testimonials.map((testimonial, index) => (
              <li key={testimonial.id} aria-roledescription="slide" aria-label={`${index + 1} of ${count}`} className="min-h-[248px] w-[540px] shrink-0 relative bg-almost-white p-8">
                <TestimonialContent testimonial={testimonial} />
              </li>
            ))}
          </motion.ul>
          <div className="max-lg:hidden flex gap-4 justify-center mt-4">
            <button type="button" onClick={() => moveTrack(1)} disabled={width === 0} className="carousel-control">Previous testimonials</button>
            <button type="button" onClick={() => moveTrack(-1)} disabled={width === 0} className="carousel-control">Next testimonials</button>
          </div>
          <ul aria-live={isRotating ? "off" : "polite"} aria-atomic="true" className="lg:hidden grid bg-almost-white relative mx-4 sm:mx-auto sm:max-w-[540px] min-h-[272px] mt-[72px]">
            {testimonials.map((testimonial, index) => (
              <li key={testimonial.id} aria-hidden={index !== currentIndex} aria-roledescription="slide" aria-label={`${index + 1} of ${count}`} className={`p-6 relative col-start-1 row-start-1 ${index === currentIndex ? "" : "invisible pointer-events-none"}`}>
                <TestimonialContent testimonial={testimonial} />
              </li>
            ))}
          </ul>
          <ul className="lg:hidden flex mx-auto mt-3 justify-center" aria-label="Choose a testimonial" onKeyDown={handleSelectorKeyDown}>
            {testimonials.map((testimonial, index) => (
              <li key={testimonial.id}>
                <button
                  type="button"
                  aria-label={`Show testimonial ${index + 1}: ${testimonial.name}`}
                  aria-pressed={index === currentIndex}
                  onClick={() => { setActiveIndex(index); setIsPaused(true); }}
                  className="testimonial-selector"
                />
              </li>
            ))}
          </ul>
        </>
      )}
      {count > 1 && (
        <button
          type="button"
          onClick={() => setIsPaused(paused => !paused)}
          disabled={reducedMotion}
          className="carousel-control block mx-auto lg:hidden mt-2"
        >
          {reducedMotion
            ? "Automatic testimonials paused for reduced motion"
            : isPaused ? "Resume automatic testimonials" : "Pause automatic testimonials"}
        </button>
      )}
      <div className="grid place-items-center pb-2 mt-8 xl:mt-10">
        <Button />
      </div>
    </section>
  );
}

Testimonials.propTypes = { testimonials: PropTypes.arrayOf(testimonialType).isRequired };
