import PropTypes from "prop-types";
import NavigationLinks from "./NavigationLinks";

export default function MobileNavbar({ activeSection, onNavigate }) {
  return (
    <nav
      id="mobile-navigation"
      aria-label="Primary"
      className="absolute top-full left-0 right-0 mt-3 mx-4 rounded-lg bg-white shadow-xl xl:hidden"
    >
      <ul className="text-center py-5 px-4 font-bold">
        <NavigationLinks activeSection={activeSection} onNavigate={onNavigate} />
      </ul>
    </nav>
  );
}

MobileNavbar.propTypes = {
  activeSection: PropTypes.string.isRequired,
  onNavigate: PropTypes.func.isRequired,
};
