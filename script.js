const INQUIRY_EMAIL = "vitalcheergroup@gmail.com";

/* Smooth, weighted scrolling (like yarn-os.com) via Lenis.
   Skipped for reduced-motion users and if the library fails to load. */
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const lenis = !prefersReducedMotion && window.Lenis
    ? new window.Lenis({
        duration: 1.15,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
    })
    : null;

if (lenis) {
    const lenisFrame = (time) => {
        lenis.raf(time);
        requestAnimationFrame(lenisFrame);
    };
    requestAnimationFrame(lenisFrame);
}

/** Scroll to a position, smoothly when allowed. */
const smoothScrollTo = (top, { duration = 1.2, lock = false, onComplete } = {}) => {
    if (lenis) {
        lenis.scrollTo(top, { duration, lock, force: true, onComplete });
    } else {
        window.scrollTo({ top, behavior: prefersReducedMotion ? "auto" : "smooth" });
    }
};

const cursor = document.querySelector(".custom-cursor");

const featureStory = document.querySelector(".feature-story");
const featurePages = [...document.querySelectorAll(".feature-page")];
const featureProgress = [
    ...document.querySelectorAll(".feature-story-progress span"),
];

let activeFeature = 0;
let featureStart = 0;
let featureStep = 1;
// True while a menu/anchor link is smooth-scrolling the page, so the feature
// pages don't flick through every slide during the jump.
let navScrolling = false;
let navScrollTimer;

const measureFeatureStory = () => {
    if (!featureStory) return;

    featureStep = window.innerHeight;
    featureStart =
        featureStory.getBoundingClientRect().top + window.scrollY;

    featureStory.style.height = `${featureStep * featurePages.length}px`;
};

const setFeature = (index, instant = false) => {
    activeFeature = Math.max(
        0,
        Math.min(featurePages.length - 1, index)
    );

    featurePages.forEach((page, pageIndex) => {
        page.classList.toggle(
            "is-active",
            pageIndex === activeFeature
        );

        page.style.opacity = pageIndex === activeFeature ? "1" : "0";

        page.style.transform =
            pageIndex === activeFeature
                ? "translate3d(0, 0, 0)"
                : `translate3d(${pageIndex < activeFeature ? "-8%" : "8%"}, 0, 0)`;

        page.style.transitionDuration = instant ? "0ms" : "500ms";
    });

    featureProgress.forEach((item, itemIndex) => {
        item.classList.toggle(
            "is-active",
            itemIndex === activeFeature
        );
    });
};

// The feature story follows the scroll position: the stage stays pinned and the
// page changes as you scroll through it. Nothing grabs the wheel or touch, so
// scrolling is never "stuck" (the old version snapped one page per wheel tick).
const updateFeatureStory = () => {
    if (!featureStory || navScrolling) return;

    const position = (window.scrollY - featureStart) / featureStep;
    const index = Math.max(0, Math.min(featurePages.length - 1, Math.round(position)));

    if (index !== activeFeature) setFeature(index);
};

measureFeatureStory();
setFeature(0, true);

// Images (e.g. the hero product shot) change the layout once loaded.
window.addEventListener("load", measureFeatureStory);

let navTarget = 0;

const finishNavScroll = () => {
    if (!navScrolling) return;
    window.clearTimeout(navScrollTimer);
    navScrolling = false;
    measureFeatureStory();
};

// Backstop in case the scroll is interrupted before reaching its target.
const armNavTimer = (ms) => {
    window.clearTimeout(navScrollTimer);
    navScrollTimer = window.setTimeout(finishNavScroll, ms);
};

window.addEventListener(
    "scroll",
    () => {
        if (!navScrolling) return;
        if (Math.abs(window.scrollY - navTarget) < 2) {
            finishNavScroll();
        } else {
            armNavTimer(1200);
        }
    },
    { passive: true }
);

document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
        const hash = link.getAttribute("href");
        if (hash.length < 2) return;

        const target = document.querySelector(hash);
        if (!target) return;

        event.preventDefault();
        measureFeatureStory();

        const maxScroll =
            document.documentElement.scrollHeight - window.innerHeight;
        const top = Math.min(
            maxScroll,
            Math.max(0, target.getBoundingClientRect().top + window.scrollY)
        );

        // Show the feature page that matches where we're landing.
        if (featureStory) {
            const storyEnd = featureStart + featureStep * (featurePages.length - 1);
            setFeature(top > storyEnd ? featurePages.length - 1 : 0, true);
        }

        navScrolling = true;
        navTarget = top;
        armNavTimer(4000);

        smoothScrollTo(top, { onComplete: finishNavScroll });
        history.replaceState(null, "", hash);
    });
});

// Footer "Back to top": glides up to the hero
document.querySelectorAll("[data-scroll-top]").forEach((button) => {
    button.addEventListener("click", () => {
        measureFeatureStory();
        if (featureStory) setFeature(0, true);
        navScrolling = true;
        navTarget = 0;
        armNavTimer(4000);
        smoothScrollTo(0, { duration: 1.6, onComplete: finishNavScroll });
        history.replaceState(null, "", location.pathname + location.search);
        // keep keyboard users at the top of the page too
        document.querySelector(".site-header .brand")?.focus({ preventScroll: true });
    });
});

window.addEventListener("scroll", updateFeatureStory, {
    passive: true,
});

window.addEventListener("resize", () => {
    measureFeatureStory();
    updateFeatureStory();
});

let cursorX = 0;
let cursorY = 0;
let cursorFrame = 0;

window.addEventListener("pointermove", (event) => {
    cursorX = event.clientX;
    cursorY = event.clientY;

    if (cursorFrame) return;

    cursorFrame = requestAnimationFrame(() => {
        cursor.style.left = `${cursorX}px`;
        cursor.style.top = `${cursorY}px`;
        cursorFrame = 0;
    });
});

document
    .querySelectorAll(".button")
    .forEach((element) => {
        element.addEventListener("click", (event) => {
            element.style.setProperty(
                "--ripple-x",
                `${event.offsetX}px`
            );

            element.style.setProperty(
                "--ripple-y",
                `${event.offsetY}px`
            );

            element.classList.remove("is-rippling");

            requestAnimationFrame(() => {
                element.classList.add("is-rippling");
            });

            navigator.vibrate?.(10);
        });
    });

const revealItems = document.querySelectorAll(
    ".workflow-grid article, .member, .utility"
);

const revealObserver = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                revealObserver.unobserve(entry.target);
            }
        });
    },
    {
        threshold: 0.12,
    }
);

revealItems.forEach((item) => {
    item.classList.add("reveal-ready");
    revealObserver.observe(item);
});

document
    .querySelectorAll(
        "a, button, input, textarea, .workflow-grid article"
    )
    .forEach((element) => {
        element.addEventListener("mouseenter", () => {
            cursor.classList.add("is-hover");
        });

        element.addEventListener("mouseleave", () => {
            cursor.classList.remove("is-hover");
        });
    });

document
    .querySelector("#contact-form")
    .addEventListener("submit", async (event) => {
        event.preventDefault();

        const form = event.currentTarget;
        const status = form.querySelector(".form-status");
        const button = form.querySelector('button[type="submit"]');
        const data = new FormData(form);
        if (data.get("_honey")) return; // bot trap

        button.disabled = true;
        status.classList.remove("is-error");
        status.textContent = "Sending…";

        try {
            // FormSubmit AJAX endpoint delivers the inquiry to the team inbox
            const res = await fetch("https://formsubmit.co/ajax/" + INQUIRY_EMAIL, {
                method: "POST",
                headers: { Accept: "application/json" },
                body: data,
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok || json.success === "false" || json.success === false) {
                throw new Error(json.message || "Send failed");
            }
            status.textContent = "Thank you — your inquiry has been sent to our team.";
            form.reset();
        } catch (err) {
            // fall back to the visitor's own email app, pre-filled
            const body = `Name: ${data.get("name")}\nEmail: ${data.get("email")}\n\n${data.get("message")}`;
            window.location.href =
                `mailto:${INQUIRY_EMAIL}?subject=${encodeURIComponent("VitalCheer inquiry")}&body=${encodeURIComponent(body)}`;
            status.classList.add("is-error");
            status.textContent = `We couldn't send it automatically, so your email app has opened. You can also write to ${INQUIRY_EMAIL}.`;
        } finally {
            button.disabled = false;
        }
    });

/* ==========================================================
   Clinical challenge: scroll-driven story
   ========================================================== */
(() => {
    const section = document.querySelector(".cc");
    if (!section) return;

    const steps = [...section.querySelectorAll(".cc-step")];
    const controls = [...section.querySelectorAll("[data-cc-go]")];
    const hudCount = section.querySelector(".cc-hud-count b");
    const hudTitle = section.querySelector(".cc-hud-title");
    const stage = section.querySelector(".cc-stage");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const compact = window.matchMedia("(max-width: 850px)");

    let active = -1;

    const setStage = (n) => {
        if (n === active) return;
        active = n;
        section.dataset.stage = String(n);

        steps.forEach((step, i) => {
            step.classList.toggle("is-active", i + 1 === n);
        });

        controls.forEach((control) => {
            const on = Number(control.dataset.ccGo) === n;
            control.classList.toggle("is-active", on);
            if (on) control.setAttribute("aria-current", "step");
            else control.removeAttribute("aria-current");
        });

        hudCount.textContent = String(n).padStart(2, "0");
        hudTitle.textContent = n
            ? steps[n - 1].querySelector("h3").textContent
            : "Gravity IV line";
    };

    // Pick the step nearest a reading line (lower on small screens,
    // where the visual is pinned to the top of the viewport).
    const update = () => {
        const vh = window.innerHeight;
        const rect = section.getBoundingClientRect();
        const travel = Math.max(1, rect.height - vh);
        const progress = Math.min(1, Math.max(0, -rect.top / travel));
        section.style.setProperty("--cc-progress", progress.toFixed(4));

        // entrance fallback (in case the observer below never fires)
        if (rect.top < vh * 0.75 && rect.bottom > 0) section.classList.add("is-inview");

        const line = vh * (compact.matches ? 0.74 : 0.5);
        let best = 0;
        let bestDistance = Infinity;

        steps.forEach((step, i) => {
            const box = step.getBoundingClientRect();
            if (box.bottom < line - vh * 0.3 || box.top > line + vh * 0.3) return;
            const distance = Math.abs(box.top + box.height / 2 - line);
            if (distance < bestDistance) {
                bestDistance = distance;
                best = i + 1;
            }
        });

        setStage(best);
    };

    let frame = 0;
    const requestUpdate = () => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
            frame = 0;
            update();
        });
    };

    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);

    // Entrance animation when the section first comes into view.
    const entrance = new IntersectionObserver(
        (entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                section.classList.add("is-inview");
                entrance.disconnect();
            }
        },
        // threshold 0 + margin: the section is several screens tall, so a
        // ratio threshold could never be reached on short viewports
        { threshold: 0, rootMargin: "0px 0px -25% 0px" }
    );
    entrance.observe(section);

    // Hotspots + rail: jump to the matching challenge.
    const goTo = (n) => {
        const step = steps[n - 1];
        if (!step) return;
        const box = step.getBoundingClientRect();
        const line = window.innerHeight * (compact.matches ? 0.74 : 0.5);
        const top = window.scrollY + box.top + box.height / 2 - line;

        smoothScrollTo(top);
        step.focus({ preventScroll: true });
        setStage(n);
    };

    controls.forEach((control) => {
        control.addEventListener("click", () => goTo(Number(control.dataset.ccGo)));
    });

    // Arrow keys move between challenges while focus is inside the stage
    // controls or on a challenge.
    section.addEventListener("keydown", (event) => {
        if (!event.target.closest(".cc-stage, .cc-step")) return;
        const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
        const dir = keys[event.key];
        if (!dir) return;
        event.preventDefault();
        const next = Math.min(steps.length, Math.max(1, (active || 0) + dir));
        goTo(next);
        const control = section.querySelector(`.cc-rail [data-cc-go="${next}"]`);
        if (event.target.closest(".cc-rail")) control?.focus({ preventScroll: true });
    });

    // Gentle pointer parallax on the visual (desktop, motion allowed).
    if (stage) {
        stage.addEventListener("pointermove", (event) => {
            if (reduceMotion.matches || event.pointerType !== "mouse") return;
            const box = stage.getBoundingClientRect();
            const x = (event.clientX - box.left) / box.width - 0.5;
            const y = (event.clientY - box.top) / box.height - 0.5;
            section.style.setProperty("--cc-px", (x * 2).toFixed(3));
            section.style.setProperty("--cc-py", (y * 2).toFixed(3));
        });

        stage.addEventListener("pointerleave", () => {
            section.style.setProperty("--cc-px", "0");
            section.style.setProperty("--cc-py", "0");
        });
    }

    // Lighter cursor ring while over this dark section.
    const cursorRing = document.querySelector(".custom-cursor");
    section.addEventListener("pointerenter", () => cursorRing?.classList.add("on-dark"));
    section.addEventListener("pointerleave", () => cursorRing?.classList.remove("on-dark"));

    update();
})();



/* ==========================================================
   Essential utilities: hover / focus / tap expands a panel
   ========================================================== */
(() => {
    const panels = [...document.querySelectorAll(".utility")];
    if (!panels.length) return;

    const activate = (panel) => {
        panels.forEach((p) => {
            const on = p === panel;
            p.classList.toggle("is-active", on);
            p.querySelector(".utility-trigger")?.setAttribute("aria-expanded", String(on));
        });
    };

    panels.forEach((panel) => {
        panel.addEventListener("mouseenter", () => {
            if (window.matchMedia("(hover: hover)").matches) activate(panel);
        });
        const trigger = panel.querySelector(".utility-trigger");
        trigger?.addEventListener("click", () => activate(panel));
        trigger?.addEventListener("focus", () => activate(panel));
    });
})();

/* ==========================================================
   Contact: form dialog, live Colombo clock
   ========================================================== */
(() => {
    const dialog = document.querySelector(".contact-dialog");
    if (dialog && typeof dialog.showModal === "function") {
        document.querySelectorAll("[data-open-contact]").forEach((btn) =>
            btn.addEventListener("click", () => {
                dialog.showModal();
                lenis?.stop();
                dialog.querySelector("input")?.focus();
            })
        );
        dialog.querySelector("[data-close-contact]")?.addEventListener("click", () => dialog.close());
        dialog.addEventListener("click", (e) => {
            if (e.target === dialog) dialog.close(); // click on the backdrop
        });
        dialog.addEventListener("close", () => lenis?.start());
    }

    const clock = document.querySelector(".monitor-clock");
    if (clock) {
        const fmt = new Intl.DateTimeFormat("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: clock.dataset.tz || "Asia/Colombo",
        });
        const tick = () => {
            const now = new Date();
            clock.textContent = fmt.format(now);
            clock.dateTime = now.toISOString();
        };
        tick();
        window.setInterval(tick, 20000);
    }
})();

/* ==========================================================
   Footer signature: gradient follows the pointer
   ========================================================== */
(() => {
    const sig = document.querySelector(".footer-signature");
    const spot = sig?.querySelector(".sig-spot");
    const svg = sig?.querySelector("svg");
    if (!spot || !svg) return;

    let tx = 600;
    let ty = 140;
    let x = 600;
    let y = 140;
    let frame = 0;
    let idle = true;
    let t0 = performance.now();

    const loop = (now) => {
        frame = requestAnimationFrame(loop);
        if (idle) {
            // drift across the word when nobody is pointing at it
            const t = (now - t0) / 1000;
            tx = 600 + Math.sin(t * 0.6) * 430;
            ty = 140 + Math.sin(t * 1.1) * 30;
        }
        x += (tx - x) * 0.08;
        y += (ty - y) * 0.08;
        spot.setAttribute("cx", x.toFixed(1));
        spot.setAttribute("cy", y.toFixed(1));
    };

    sig.addEventListener("pointermove", (e) => {
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const p = pt.matrixTransform(svg.getScreenCTM().inverse());
        tx = p.x;
        ty = p.y;
        idle = false;
    });
    sig.addEventListener("pointerleave", () => {
        idle = true;
        t0 = performance.now();
    });

    new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting && !frame) frame = requestAnimationFrame(loop);
        if (!entry.isIntersecting && frame) {
            cancelAnimationFrame(frame);
            frame = 0;
        }
    }).observe(sig);
})();
