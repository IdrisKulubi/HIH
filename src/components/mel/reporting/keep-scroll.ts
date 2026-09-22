export function pushKeepingScroll(
  router: { push: (href: string, options?: { scroll?: boolean }) => void },
  href: string
) {
  const top = window.scrollY;
  router.push(href, { scroll: false });
  const restore = () => {
    if (Math.abs(window.scrollY - top) > 1) window.scrollTo(0, top);
  };
  restore();
  window.addEventListener("scroll", restore, { passive: true });
  window.setTimeout(() => window.removeEventListener("scroll", restore), 1200);
}
