import PropTypes from "prop-types";
import { NumBtn } from "../components";
import { bgTablet } from "../utils";

export default function Features({ features }) {
  return (
    <section className=" relative lg:container lg:mt-[132px] mt-[93px] grid md:grid-cols-2">
      <img src={bgTablet} alt=""  className=" max-md:hidden absolute left-[-50%] bottom-[-90%] -z-10"/>
      <div className="container">
        <h2 className="h2-text lg:mb-6 mb-3 max-lg:text-center">
          What’s different about Manage?
        </h2>
        <p className="p-text md:max-w-[36ch] max-md:text-center max-lg:mb-[54px]">
          Manage provides all the functionality your team needs, without the
          complexity. Our software is tailor-made for modern digital product
          teams.
        </p>
      </div>
      <div className=" overflow-hidden">
        {features.map(({ id, num, title, description }) => (
          <div
            key={id}
            className="lg:grid grid-2   lg:gap-x-7 mb-12 lg:mb-10  items-baseline gap-1 "
          >
         

            <div className="ml-2 overflow-hidden gap-2 grid max-md:flex flex-wrap items-baseline  max-lg:w-full max-lg:bg-PaleRed max-lg:rounded-l-full lg:hidden ">
              <NumBtn as="span" style="row-span-2 h-[39px]">{num}</NumBtn>

              <h3 className="h3-text mb-2 max-xs:text-[14px]">{title}</h3>
            </div>
            <NumBtn as="span" style="row-span-2 max-lg:hidden h-[39px]">{num}</NumBtn>

            <h3 className="h3-text mb-2 max-lg:hidden ">{title}</h3>
            <p className="max-lg:pl-4 max-lg:pr-[14px] max-lg:mt-2 text-[14px] p-text max-w-[403px]">{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

Features.propTypes = {
  features: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    num: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
  })).isRequired,
};
