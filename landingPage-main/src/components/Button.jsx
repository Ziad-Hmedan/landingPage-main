import PropTypes from "prop-types";

export default function Button({ children = "Explore features", href = "#features", variant = "orange", className = "" }) {
  return <a href={href} className={`btn btn-${variant} ${className}`}>{children}</a>;
}

Button.propTypes = {
  children: PropTypes.node,
  href: PropTypes.string,
  variant: PropTypes.oneOf(["orange", "white"]),
  className: PropTypes.string,
};
