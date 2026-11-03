import PropTypes from "prop-types";
import { bgTablet } from "../utils";

export default function Features({ features }) {
  return (
    <section id="features" tabIndex={-1} aria-labelledby="features-title" className="relative lg:container lg:mt-[132px] mt-[93px] grid md:grid-cols-2 gap-8">
      <img src={bgTablet} alt="" width="814" height="814" loading="lazy" className="pointer-events-none max-md:hidden absolute left-[-50%] bottom-[-90%] -z-10" />
      <div className="container">
        <h2 id="features-title" className="h2-text lg:mb-6 mb-3 max-lg:text-center">
          What&rsquo;s different about Manage?
        </h2>
        <p className="p-text md:max-w-[36ch] max-md:text-center max-lg:mb-[54px]">
          Manage provides all the functionality your team needs, without the
          complexity. Our software is tailor-made for modern digital product teams.
        </p>
      </div>
      <ol className="overflow-hidden">
        {features.map(({ id, num, title, description }) => (
          <li key={id} className="mb-12 lg:mb-10">
            <div className="feature-heading">
              <span className="feature-number">{num}</span>
              <h3 className="h3-text">{title}</h3>
            </div>
            <p className="feature-description p-text text-smm mt-2">{description}</p>
          </li>
        ))}
      </ol>
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
