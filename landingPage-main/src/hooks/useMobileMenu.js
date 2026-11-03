import { useCallback, useEffect, useRef, useState } from "react";

export default function useMobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const navigation = useRef(null);
  const destination = useRef(null);
  const closeMenu = useCallback(event => {
    destination.current = event?.currentTarget?.hash?.slice(1) || null;
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    // Keep this query aligned with Tailwind's xl breakpoint.
    const desktop = window.matchMedia("(min-width: 1110px)");
    if (desktop.matches) {
      closeMenu();
      return;
    }

    const navigationElement = navigation.current;
    const previousFocus = document.activeElement;
    const alreadyLocked = document.body.classList.contains("overflow-hidden");
    const background = [...document.querySelectorAll("[data-menu-inert]")];
    const previousInert = background.map(element => element.inert);
    background.forEach(element => { element.inert = true; });
    document.body.classList.add("overflow-hidden");
    navigationElement.querySelector("#mobile-navigation a")?.focus();

    const handleDesktop = () => {
      if (desktop.matches) closeMenu();
    };
    const handleKeyDown = event => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }
      if (event.key !== "Tab") return;

      const controls = [...navigationElement.querySelectorAll("a[href], button:not([disabled])")]
        .filter(element => element.getClientRects().length > 0);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!navigationElement.contains(document.activeElement)
        || (event.shiftKey && document.activeElement === first)) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    desktop.addEventListener("change", handleDesktop);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      desktop.removeEventListener("change", handleDesktop);
      document.removeEventListener("keydown", handleKeyDown);
      background.forEach((element, index) => { element.inert = previousInert[index]; });
      if (!alreadyLocked) document.body.classList.remove("overflow-hidden");
      const target = destination.current && document.getElementById(destination.current);
      destination.current = null;
      if (target) {
        target.focus({ preventScroll: true });
      } else if (previousFocus?.isConnected && previousFocus.getClientRects().length > 0) {
        previousFocus.focus({ preventScroll: true });
      } else if (navigationElement.isConnected) {
        navigationElement.querySelector("a[href]")?.focus({ preventScroll: true });
      }
    };
  }, [isOpen, closeMenu]);

  return { isOpen, navigation, closeMenu, toggleMenu: () => setIsOpen(open => !open) };
}
