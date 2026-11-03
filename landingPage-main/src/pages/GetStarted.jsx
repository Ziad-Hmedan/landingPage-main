import { bgDesktop, bgMobile } from "../utils";

export default function GetStarted() {
  return (
    <section className="relative bg-BrightRed   py-[91px] xl:py-[62px]">
      <img src={bgDesktop} alt="" className="max-xl:hidden absolute top-0" />
      <img src={bgMobile} alt="" className="xl:hidden absolute inline" />
      <div className="xl:container xl:grid xl:grid-cols-2  max-xl:text-center ">
        <h2 className="font-bold text-[39px] leading-xl xl:leading-lg xl:tracking-md tracking-sm  max-xl:px-8 text-white">
          Simplify how your team works todaydrdr.
        </h2>
        <button className="btn btn-white my-auto  justify-self-end max-xl:my-7">
          Get Started
        </button>
      </div>
    </section>
  );
}
