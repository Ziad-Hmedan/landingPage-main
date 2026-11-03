import PropTypes from "prop-types";
import { navigationLinks } from "../data/navigation";

export default function NavigationLinks({ activeSection, onNavigate }) {
  return navigationLinks.map(({ id, label }) => (
    <li key={id}>
      <a
        href={`#${id}`}
        aria-current={activeSection === id ? "location" : undefined}
        className="navigation-link"
        onClick={onNavigate}
      >
        {label}
      </a>
    </li>
  ));
}

NavigationLinks.propTypes = {
  activeSection: PropTypes.string,
  onNavigate: PropTypes.func,
};
