import { Header } from "./components";
import BackToTop from "./components/BackToTop";
import { GetStarted, Features, Hero, Testimonials, ContactUs } from "./pages";
import { features, testimonials } from "./data";
import useActiveSection from "./hooks/useActiveSection";

function App() {
  const activeSection = useActiveSection();

  return (
    <div id="top" tabIndex={-1} className="relative">
      <a href="#main-content" className="skip-link" data-menu-inert>Skip to main content</a>
      <Header activeSection={activeSection} />
      <div data-menu-inert>
        <main id="main-content" tabIndex={-1}>
          <Hero />
          <Features features={features} />
          <Testimonials testimonials={testimonials} />
          <GetStarted />
        </main>
        <ContactUs />
        <BackToTop />
      </div>
    </div>
  );
}

export default App;
