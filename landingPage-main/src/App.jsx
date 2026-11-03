import { useCallback, useState } from "react";
import { Header } from "./components";
import { GetStarted, Features, Hero, Testimonials, ContactUs } from "./pages";
import { features, testimonials } from "./data";

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const handleOpen = useCallback(() => setIsOpen(show => !show), []);
  const handleClose = useCallback(() => setIsOpen(false), []);

  return (
    <div className="relative">
      <Header isOpen={isOpen} handleOpen={handleOpen} onClose={handleClose} />
      <Hero />
      <main>
        <Features features={features} />
        <Testimonials testimonials={testimonials} />
        <GetStarted />
      </main>
      <ContactUs />
    </div>
  );
}

export default App;
