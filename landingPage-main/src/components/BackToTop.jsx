import { useEffect, useState } from "react";

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const overview = document.getElementById("overview");
    if (!overview) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(!entry.isIntersecting && entry.boundingClientRect.bottom < 0);
    });
    observer.observe(overview);
    return () => observer.disconnect();
  }, []);

  return isVisible ? (
    <a href="#top" className="back-to-top" aria-label="Back to top">
      <span aria-hidden="true">↑</span>
    </a>
  ) : null;
}
