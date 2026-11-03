import PropTypes from "prop-types";

export default function NumBtn({
  children,
  style = "",
  type = "button",
  as: Element = "button",
}) {
  return (
    <Element
      {...(Element === "button" ? { type } : {})}
      className={`xl:row-span-2 text-white rounded-full font-bold tracking-xl w-[67px] grid content-center bg-BrightRed ${style}`}
    >
      {children}
    </Element>
  );
}

NumBtn.propTypes = {
  children: PropTypes.node.isRequired,
  style: PropTypes.string,
  type: PropTypes.oneOf(["button", "submit", "reset"]),
  as: PropTypes.oneOf(["button", "span"]),
};
