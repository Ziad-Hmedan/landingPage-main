import { useRef, useState } from "react";

export default function NewsletterForm() {
  const emailInput = useRef(null);
  const [feedback, setFeedback] = useState(null);

  function handleSubmit(event) {
    event.preventDefault();
    const input = emailInput.current;
    if (!input.checkValidity()) {
      setFeedback({
        isError: true,
        message: input.validity.valueMissing
          ? "Enter your email address."
          : "Enter a valid email address, for example name@example.com.",
      });
      input.focus();
      return;
    }
    setFeedback({
      isError: false,
      message: "Subscriptions are currently unavailable. Your email has not been sent or saved.",
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-labelledby="newsletter-label" className="w-full max-w-[360px] mx-auto">
      <label id="newsletter-label" htmlFor="newsletter-email" className="block text-white font-bold mb-3">
        Updates in your inbox
      </label>
      <p id="newsletter-help" className="text-xs text-gray-light mb-4">
        Sign-ups are currently unavailable. You can check your email format below.
      </p>
      <div className="flex gap-2">
        <input
          ref={emailInput}
          id="newsletter-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          aria-describedby={`newsletter-help${feedback ? " newsletter-feedback" : ""}`}
          aria-invalid={feedback?.isError || undefined}
          onChange={() => setFeedback(null)}
          className="min-w-0 flex-1 text-DarkBlue px-4 rounded-full placeholder:text-xs py-3"
          placeholder="name@example.com"
        />
        <button type="submit" className="rounded-full px-4 min-h-[48px] shrink-0 text-xs font-bold bg-white text-DarkBlue hover:bg-gray-light transition-colors">
          Check email
        </button>
      </div>
      <p
        id="newsletter-feedback"
        role="status"
        aria-atomic="true"
        className={`mt-3 text-xs leading-5 min-h-[3.75rem] ${feedback?.isError ? "text-[#ffb8a6]" : "text-gray-light"}`}
      >
        {feedback?.message}
      </p>
    </form>
  );
}
