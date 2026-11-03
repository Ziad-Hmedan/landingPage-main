import PropTypes from "prop-types";
import NavigationLinks from "./NavigationLinks";

export default function Navbar({ activeSection }) {
  return (
    <nav aria-label="Primary" className="max-xl:hidden">
      <ul className="flex items-center gap-7 text-smm font-bold">
        <NavigationLinks activeSection={activeSection} />
      </ul>
    </nav>
  );
}

Navbar.propTypes = {
  activeSection: PropTypes.string.isRequired,
};
