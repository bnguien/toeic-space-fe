/**
 * Scrolls the home page to a section (instantly when the viewer prefers reduced motion), moves
 * focus to its heading and keeps the URL hash in sync without a jump. False when it is not there.
 */
export function goToSection(id: string): boolean {
  const section = document.getElementById(id);
  if (!section) return false;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  section.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  window.history.replaceState(window.history.state, "", `#${id}`);
  const heading = section.querySelector<HTMLElement>("h2");
  if (heading) {
    if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
    heading.focus({ preventScroll: true });
  }
  return true;
}
