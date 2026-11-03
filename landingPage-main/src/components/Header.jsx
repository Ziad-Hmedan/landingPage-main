import { useCallback, useEffect, useRef } from "react";
import PropTypes from "prop-types";
import { logo } from "../utils";
import MobileNavbar from "./MobileNavbar";
import Navbar from "./Navbar";

const menuBarClassName =
  "bg-DarkBlue w-6 h-1 transition ease-in-out duration-300 inline-block";

export default function Header({ isOpen, handleOpen, onClose, inView }) {
  const navigation = useRef(null);
  const closeMenu = useCallback(() => {
    if (onClose) onClose();
    else if (isOpen) handleOpen();
  }, [onClose, isOpen, handleOpen]);

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
      const focusIsOutside = !navigationElement.contains(document.activeElement);

      if (focusIsOutside || (event.shiftKey && document.activeElement === first)) {
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
      if (!alreadyLocked) document.body.classList.remove("overflow-hidden");
      if (previousFocus?.isConnected && previousFocus.getClientRects().length > 0) {
        previousFocus.focus();
      } else if (navigationElement.isConnected) {
        navigationElement.querySelector("a[href]")?.focus();
      }
    };
  }, [isOpen, closeMenu]);

  return (
    <div
      ref={navigation}
      role={isOpen ? "dialog" : undefined}
      aria-modal={isOpen ? true : undefined}
      aria-label={isOpen ? "Mobile navigation" : undefined}
    >
      {isOpen && (
        <div
          aria-hidden="true"
          onClick={closeMenu}
          className="bg-linear fixed top-0 right-0 left-0 bottom-0 z-40 xl:hidden"
        />
      )}
      <header className={`relative z-50 container py-4 flex ${inView ? "top-0 py-5 bg-almost-white left-[50%] translate-x-[-50%]" : "mt-[33px]"} justify-between`}>
        <a href="#" onClick={isOpen ? closeMenu : undefined}>
          <img src={logo} alt="manage-logo" />
        </a>
        <Navbar />
        {isOpen && <MobileNavbar isOpen={isOpen} onNavigate={closeMenu} />}
        <button type="button" className="btn xl:grid hidden btn-orange">Get Started</button>
        <button
          type="button"
          className="xl:hidden"
          onClick={handleOpen}
          aria-label={isOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={isOpen}
          aria-controls={isOpen ? "mobile-navigation" : undefined}
        >
          <div className="flex flex-col gap-[3px]" aria-hidden="true">
            <span className={`${menuBarClassName} ${isOpen ? "translate-y-[7px] rotate-45" : ""}`} />
            <span className={`${menuBarClassName} ${isOpen ? "opacity-0" : ""}`} />
            <span className={`${menuBarClassName} ${isOpen ? "translate-y-[-7px] rotate-[-45deg]" : ""}`} />
          </div>
        </button>
      </header>
    </div>
  );
}

Header.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  handleOpen: PropTypes.func.isRequired,
  onClose: PropTypes.func,
  inView: PropTypes.bool,
};
