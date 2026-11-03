import PropTypes from "prop-types";

function Button({ style = "" }) {
  return <a href="#" className={style}>Get Started</a>;
}

Button.propTypes = {
  style: PropTypes.string,
};

export default Button;
