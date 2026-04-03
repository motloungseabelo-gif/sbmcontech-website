(() => {
    "use strict";

    const AppState = {
        light: false,
        security: false
    };

    function byId(id) {
        return document.getElementById(id);
    }

    function safeNavigate(url) {
        if (typeof url === "string" && url.trim()) {
            window.location.href = url;
        }
    }

    function getReducedMotionPreference() {
        return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    function updateStatus(id, message) {
        const element = byId(id);
        if (element) {
            element.textContent = message;
        }
    }

    function updateBadge(id, message, isActive) {
        const badge = byId(id);
        if (!badge) return;
        badge.textContent = message;
        badge.classList.toggle("active", Boolean(isActive));
    }

    function updateAppUI() {
        updateStatus("lightStatus", AppState.light ? "Light is ON" : "Light is OFF");
        updateStatus("securityStatus", AppState.security ? "Security is ARMED" : "Security is DISARMED");

        updateBadge("lightBadge", AppState.light ? "Lights Active" : "Lights Offline", AppState.light);
        updateBadge("securityBadge", AppState.security ? "Protection Active" : "Protection Standby", AppState.security);
    }

    function toggleLight() {
        AppState.light = !AppState.light;
        updateAppUI();
        console.log(`Smart light status: ${AppState.light ? "ON" : "OFF"}`);
    }

    function toggleSecurity() {
        AppState.security = !AppState.security;
        updateAppUI();
        console.log(`Smart security status: ${AppState.security ? "ARMED" : "DISARMED"}`);
    }

    function doorbell() {
        alert("🚪 Visitor detected at the door. Live notification sent.");
        console.log("Doorbell notification triggered");
    }

    function openApp() {
        safeNavigate("app.html");
    }

    function goHome() {
        safeNavigate("index.html");
    }

    function initSplash() {
        const splash = byId("splashScreen");
        if (!splash) return;

        window.addEventListener("load", () => {
            setTimeout(() => {
                splash.classList.add("hide");
            }, getReducedMotionPreference() ? 100 : 1300);
        });
    }

    function initMobileNav() {
        const toggle = byId("navToggle");
        const nav = byId("siteNav");

        if (!toggle || !nav) return;

        toggle.addEventListener("click", () => {
            const expanded = toggle.getAttribute("aria-expanded") === "true";
            toggle.setAttribute("aria-expanded", String(!expanded));
            nav.classList.toggle("show");
        });

        nav.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                if (window.innerWidth <= 768) {
                    nav.classList.remove("show");
                    toggle.setAttribute("aria-expanded", "false");
                }
            });
        });

        document.addEventListener("click", event => {
            if (window.innerWidth > 768) return;
            if (!nav.contains(event.target) && !toggle.contains(event.target)) {
                nav.classList.remove("show");
                toggle.setAttribute("aria-expanded", "false");
            }
        });

        window.addEventListener("resize", () => {
            if (window.innerWidth > 768) {
                nav.classList.remove("show");
                toggle.setAttribute("aria-expanded", "false");
            }
        }, { passive: true });
    }

    function initContactForm() {
        const form = document.querySelector(".contact-form");
        if (!form || form.dataset.ajaxHandled === "true") return;

        form.addEventListener("submit", () => {
            if (!form.hasAttribute("data-no-alert")) {
                alert("Thank you for contacting SBM ConTech Industries. We will respond to you soon.");
            }
        });
    }

    function initYear() {
        document.querySelectorAll("[data-year]").forEach(element => {
            element.textContent = new Date().getFullYear();
        });
    }

    function initScrollProgress() {
        const progressBar = byId("scrollProgress");
        if (!progressBar) return;

        const updateProgress = () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
            progressBar.style.width = `${progress}%`;
        };

        updateProgress();
        window.addEventListener("scroll", updateProgress, { passive: true });
    }

    function initReveal() {
        const elements = document.querySelectorAll(".feature-box, .service-card, .content-card, .app-card, .stat-card, .cta-box, .highlight-card, .contact-mini-card");
        if (!elements.length || !("IntersectionObserver" in window)) {
            elements.forEach(el => el.classList.add("show"));
            return;
        }

        elements.forEach(el => el.classList.add("reveal"));

        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("show");
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });

        elements.forEach(el => observer.observe(el));
    }

    function initBackToTop() {
        const button = byId("backToTop");
        if (!button) return;

        const toggleButton = () => {
            button.classList.toggle("show", window.scrollY > 360);
        };

        button.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });

        toggleButton();
        window.addEventListener("scroll", toggleButton, { passive: true });
    }

    function initSmartImages() {
        document.querySelectorAll("img").forEach(image => {
            if (!image.hasAttribute("decoding")) image.setAttribute("decoding", "async");
            if (!image.hasAttribute("loading") && !image.classList.contains("hero-logo") && !image.classList.contains("brand-logo") && !image.classList.contains("splash-logo")) {
                image.setAttribute("loading", "lazy");
            }
        });
    }

    function initExternalLinks() {
        document.querySelectorAll(`a[href^="http"]`).forEach(link => {
            if (!link.hasAttribute("target")) link.setAttribute("target", "_blank");
            const rel = link.getAttribute("rel") || "";
            if (!/noopener/i.test(rel)) {
                link.setAttribute("rel", `${rel} noopener noreferrer`.trim());
            }
        });
    }

    function init() {
        initSplash();
        initMobileNav();
        initContactForm();
        initYear();
        initScrollProgress();
        initReveal();
        initBackToTop();
        initSmartImages();
        initExternalLinks();
        updateAppUI();
    }

    window.openApp = openApp;
    window.goHome = goHome;
    window.toggleLight = toggleLight;
    window.toggleSecurity = toggleSecurity;
    window.doorbell = doorbell;

    document.addEventListener("DOMContentLoaded", init);
})();
