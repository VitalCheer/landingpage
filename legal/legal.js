/* VitalCheer legal pages: table of contents behaviour.
   - Desktop: the list is always open and sticky; the section in view is highlighted.
   - Mobile/tablet: a compact "On this page" selector that shows the current section
     and closes after a section is chosen. */
(() => {
    const panel = document.querySelector(".legal-toc-panel");
    const links = [...document.querySelectorAll(".legal-toc a[href^='#']")];
    const current = document.querySelector(".legal-toc-current");
    if (!panel || !links.length) return;

    const compact = window.matchMedia("(max-width: 1024px)");
    const syncLayout = () => {
        panel.open = !compact.matches;
    };
    syncLayout();
    compact.addEventListener("change", syncLayout);

    // On desktop the list must stay open.
    panel.addEventListener("toggle", () => {
        if (!compact.matches && !panel.open) panel.open = true;
    });

    const sections = links
        .map((link) => document.getElementById(link.hash.slice(1)))
        .filter(Boolean);

    const setActive = (id) => {
        links.forEach((link) => {
            const on = link.hash === "#" + id;
            if (on) {
                link.setAttribute("aria-current", "true");
                if (current) current.textContent = link.textContent.replace(/^\s*\d+\s*/, "");
            } else {
                link.removeAttribute("aria-current");
            }
        });
    };

    // the section whose heading most recently crossed the upper part of the screen
    const observer = new IntersectionObserver(
        (entries) => {
            const visible = entries
                .filter((e) => e.isIntersecting)
                .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
            if (visible.length) setActive(visible[0].target.id);
        },
        { rootMargin: "-15% 0px -70% 0px", threshold: 0 }
    );
    sections.forEach((section) => observer.observe(section));
    if (sections[0]) setActive(sections[0].id);

    links.forEach((link) =>
        link.addEventListener("click", () => {
            setActive(link.hash.slice(1));
            if (compact.matches) panel.open = false;
            // move keyboard focus to the chosen section for screen-reader users
            const target = document.getElementById(link.hash.slice(1));
            if (target) {
                target.setAttribute("tabindex", "-1");
                window.setTimeout(() => target.focus({ preventScroll: true }), 300);
            }
        })
    );
})();

/* Footer "Back to top" */
document.querySelectorAll("[data-scroll-top]").forEach((button) =>
    button.addEventListener("click", () => {
        const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: still ? "auto" : "smooth" });
        document.querySelector(".site-header .brand")?.focus({ preventScroll: true });
    })
);
