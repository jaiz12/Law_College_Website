/**
 * Header navigation: mobile hamburger toggle + accordion submenus.
 * Desktop keeps the CSS-only hover dropdowns; below the 1080px breakpoint
 * this switches submenus to tap-to-expand so they work without a mouse.
 */
(function () {
  "use strict";

  const navToggle = document.getElementById("navToggle");
  const mainNav = document.getElementById("mainNav");

  function isMobileNavOpen() {
    return mainNav.classList.contains("nav-open");
  }

  function setNavOpen(open) {
    mainNav.classList.toggle("nav-open", open);
    navToggle.classList.toggle("is-active", open);
    navToggle.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("nav-scroll-lock", open);
  }

  navToggle.addEventListener("click", () => setNavOpen(!isMobileNavOpen()));

  // Close the mobile panel when a plain link is tapped.
  mainNav.querySelectorAll("a:not(.has-sub > a)").forEach((link) => {
    link.addEventListener("click", () => setNavOpen(false));
  });

  // Accordion behaviour for "has-sub" items — only relevant on touch/mobile
  // widths; on desktop the CSS :hover rule takes over regardless of these
  // aria-expanded/open-sub states.
  mainNav.querySelectorAll(".has-sub > a").forEach((toggleLink) => {
    toggleLink.addEventListener("click", (e) => {
      if (window.innerWidth > 1080) return; // desktop: let the link/hover behave normally
      e.preventDefault();
      const parentItem = toggleLink.parentElement;
      const isOpen = parentItem.classList.contains("open-sub");

      // Collapse any sibling submenu first so only one is open at a time.
      mainNav.querySelectorAll(".has-sub.open-sub").forEach((el) => {
        el.classList.remove("open-sub");
        el.querySelector("a").setAttribute("aria-expanded", "false");
      });

      parentItem.classList.toggle("open-sub", !isOpen);
      toggleLink.setAttribute("aria-expanded", String(!isOpen));
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isMobileNavOpen()) setNavOpen(false);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 1080 && isMobileNavOpen()) setNavOpen(false);
  });
})();
