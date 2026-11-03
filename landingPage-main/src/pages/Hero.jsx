import { heroImage } from "../utils";
import { Button } from "../components";

export default function Hero() {
  return (
    <section id="overview" tabIndex={-1} aria-labelledby="hero-title" className="container grid lg:grid-cols-2 gap-8 xl:mt-16 mt-12">
      <div className="max-lg:order-2 place-self-center">
        <h1 id="hero-title" className="h1-text max-lg:text-center">
          Bring everyone together to build better products.
        </h1>
        <p className="p-text max-lg:text-center xl:max-w-[36ch] xl:mt-8 mt-4 xl:mb-10 mb-7">
          Manage makes it simple for software teams to plan day-to-day tasks
          while keeping the larger team goals in view.
        </p>
        <div className="max-lg:grid">
          <Button />
        </div>
      </div>
      <img
        src={heroImage}
        alt="Manage dashboard showing charts, progress, and team reports"
        width="580"
        height="525"
        className="max-lg:order-1 justify-self-center w-full max-w-[580px] h-auto"
      />
    </section>
  );
}
