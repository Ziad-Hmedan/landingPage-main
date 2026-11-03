import { bgDesktop, bgMobile } from "../utils";
import { Button } from "../components";

export default function GetStarted() {
  return (
    <section aria-labelledby="get-started-title" className="relative overflow-hidden bg-BrightRed py-16 xl:py-[62px]">
      <img src={bgDesktop} alt="" width="1439" height="360" className="max-xl:hidden absolute inset-0 pointer-events-none" loading="lazy" />
      <img src={bgMobile} alt="" width="94" height="302" className="xl:hidden absolute left-0 top-0 pointer-events-none" loading="lazy" />
      <div className="relative container xl:grid xl:grid-cols-2 gap-8 max-xl:text-center items-center">
        <h2 id="get-started-title" className="font-bold text-[39px] leading-xl xl:leading-lg tracking-sm text-white">
          Simplify how your team works today.
        </h2>
        <Button variant="white" href="#updates" className="justify-self-end max-xl:mt-7">Stay in the loop</Button>
      </div>
    </section>
  );
}
