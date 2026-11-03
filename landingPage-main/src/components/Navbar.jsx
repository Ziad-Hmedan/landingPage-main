import { navigationLinks } from "../data/navigation";

export default function Navbar() {
  return (
    <nav aria-label="Primary" className="max-xl:hidden">
      <ul className="flex tracking-xl font-bold mx-auto gap-8 font-base">
        {navigationLinks.map(label => (
          <li key={label} className="hover:opacity-50 transition ease-in-out duration-300">
            <a href="#">{label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
