import { useEffect, useState } from "react";
import { navigationLinks } from "../data/navigation";

export default function useActiveSection() {
  const [activeSection, setActiveSection] = useState("overview");

  useEffect(() => {
    const sections = navigationLinks.map(({ id }) => document.getElementById(id)).filter(Boolean);
    const updateFromHash = () => {
      const id = window.location.hash.slice(1);
      if (navigationLinks.some(link => link.id === id)) setActiveSection(id);
    };
    const updateFromViewport = () => {
      // Compare visible content, including short sections near the page bottom.
      let visibleHeight = 0;
      let current = null;
      sections.forEach(section => {
        const bounds = section.getBoundingClientRect();
        const height = Math.min(bounds.bottom, window.innerHeight) - Math.max(bounds.top, 100);
        if (height > visibleHeight) {
          visibleHeight = height;
          current = section;
        }
      });
      if (current) setActiveSection(current.id);
    };

    const observer = new IntersectionObserver(updateFromViewport, {
      rootMargin: "-100px 0px 0px",
      threshold: [0, 0.25, 0.5, 0.75, 1],
    });
    sections.forEach(section => observer.observe(section));
    updateFromHash();
    window.addEventListener("hashchange", updateFromHash);
    return () => {
      observer.disconnect();
      window.removeEventListener("hashchange", updateFromHash);
    };
  }, []);

  return activeSection;
}
