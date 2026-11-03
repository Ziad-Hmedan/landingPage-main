import PropTypes from "prop-types";
import { navigationLinks } from "../data/navigation";

export default function MobileNavbar({ isOpen, onNavigate }) {
  return (
    <nav
      id="mobile-navigation"
      aria-label="Primary"
      className={`absolute left-[50%] translate-y-[50%] container z-50 transition ease-in-out duration-300 xl:hidden ${isOpen ? "translate-x-[-50%]" : "translate-x-[100%]"}`}
    >
      <ul className="text-center space-y-6 bg-white py-10 font-bold">
        {navigationLinks.map(label => (
          <li key={label} className="hover:opacity-50 transition ease-in-out duration-300">
            <a href="#" onClick={onNavigate}>{label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

MobileNavbar.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onNavigate: PropTypes.func,
};
