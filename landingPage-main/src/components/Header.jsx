import PropTypes from "prop-types";
import { logo } from "../utils";
import useMobileMenu from "../hooks/useMobileMenu";
import MobileNavbar from "./MobileNavbar";
import Navbar from "./Navbar";
import Button from "./Button";

const menuBarClassName = "bg-DarkBlue w-6 h-1 transition duration-300 inline-block";

export default function Header({ activeSection }) {
  const { isOpen, navigation, closeMenu, toggleMenu } = useMobileMenu();

  return (
    <div
      ref={navigation}
      className="sticky top-0 z-50 bg-white/95"
      role={isOpen ? "dialog" : undefined}
      aria-modal={isOpen ? true : undefined}
      aria-label={isOpen ? "Mobile navigation" : undefined}
    >
      {isOpen && (
        <div aria-hidden="true" onClick={closeMenu} className="bg-linear fixed inset-0 z-40 xl:hidden" />
      )}
      <header className="relative z-50 container py-5 flex items-center justify-between gap-4">
        <a href="#overview" onClick={isOpen ? closeMenu : undefined} aria-label="Manage home" className="shrink-0">
          <img src={logo} alt="" width="146" height="24" />
        </a>
        <Navbar activeSection={activeSection} />
        {isOpen && <MobileNavbar activeSection={activeSection} onNavigate={closeMenu} />}
        <Button className="max-xl:hidden" />
        <button
          type="button"
          className="xl:hidden w-11 h-11 grid place-items-center"
          onClick={toggleMenu}
          aria-label={isOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={isOpen}
          aria-controls={isOpen ? "mobile-navigation" : undefined}
        >
          <span className="flex flex-col gap-[3px]" aria-hidden="true">
            <span className={`${menuBarClassName} ${isOpen ? "translate-y-[7px] rotate-45" : ""}`} />
            <span className={`${menuBarClassName} ${isOpen ? "opacity-0" : ""}`} />
            <span className={`${menuBarClassName} ${isOpen ? "translate-y-[-7px] rotate-[-45deg]" : ""}`} />
          </span>
        </button>
      </header>
    </div>
  );
}

Header.propTypes = { activeSection: PropTypes.string.isRequired };
