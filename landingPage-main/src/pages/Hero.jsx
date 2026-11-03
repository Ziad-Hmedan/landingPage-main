import { heroImage } from "../utils";

export default function Hero() {
  return (
    <div className="container grid lg:grid-cols-2 xl:mt-[100px] mt-[111px] ">
      <div className="max-lg:order-2 place-self-center ">
        <h1 className="h1-text max-lg:text-center ">
          Bring everyone together to build better products.
        </h1>
        <p className="p-text max-lg:text-center max-lg:px-3 xl:max-w-[36ch] xl:mt-8 mt-2 xl:mb-10 mb-7">
          Manage makes it simple for software teams to plan day-to-day tasks
          while keeping the larger team goals in view.
        </p>
        <div className="max-lg:grid">
          <button className="btn btn-orange">Get Started</button>
        </div>
      </div>
      <div className="max-lg:justify-self-end max-lg:order-1 ">
        <img src={heroImage} alt="hero-image" />
      </div>
    </div>
  );
}
