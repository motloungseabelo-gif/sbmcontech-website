(() => {
    "use strict";

    const AppState = {
        mode: "Home",
        room: "Lounge",
        lightsOn: true,
        securityArmed: true,
        gateOpen: false,
        garageOpen: false,
        curtainsOpen: true,
        targetTemp: 22,
        solarPriority: false,
        monthlyEnergy: 412,
        waterReserve: 78,
        activeDevices: 8,
        currentScene: "Lounge Welcome"
    };

    const RoomProfiles = {
        Lounge: "Viewing: Lounge • Ambient lighting active, media-ready comfort, visitor chime enabled.",
        Kitchen: "Viewing: Kitchen • Utility monitoring active, energy-aware devices synchronized.",
        "Main Bedroom": "Viewing: Main Bedroom • Privacy scene available, curtains and climate tuned for comfort.",
        Patio: "Viewing: Patio • Outdoor lighting and braai-area readiness visible.",
        Garage: "Viewing: Garage • Access control and vehicle entry systems available."
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

    function setText(id, value) {
        const element = byId(id);
        if (element) element.textContent = value;
    }

    function setBadge(id, message, isActive = false) {
        const badge = byId(id);
        if (!badge) return;
        badge.textContent = message;
        badge.classList.toggle("active", Boolean(isActive));
    }

    function updateAppUI() {
        setText("modeStatus", AppState.mode);
        setText("selectedRoomStatus", RoomProfiles[AppState.room] || `Viewing: ${AppState.room}`);
        setText("lightStatus", AppState.lightsOn ? "Lights are ON" : "Lights are OFF");
        setBadge("lightBadge", AppState.lightsOn ? `${AppState.currentScene} lighting active` : "Lighting on standby", AppState.lightsOn);

        setText("securityStatus", AppState.securityArmed ? "Armed" : "Disarmed");
        setText("securityDetail", AppState.securityArmed ? "Perimeter secure. All access points normal." : "Security relaxed for active home circulation.");
        setBadge("securityBadge", AppState.securityArmed ? "Perimeter secure" : "Home circulation mode", AppState.securityArmed);

        setText("gateStatus", AppState.gateOpen ? "Open" : "Closed");
        setText("gateDetail", AppState.gateOpen ? "Open" : "Closed");
        setText("garageStatus", AppState.garageOpen ? "Open" : "Closed");

        setText("curtainStatus", AppState.curtainsOpen ? "Open" : "Closed");
        setText("climateStatus", `${AppState.targetTemp}°C Cooling`);
        setText("climateDetail", `Target temperature: ${AppState.targetTemp}°C`);
        setBadge("climateBadge", AppState.curtainsOpen ? "Comfort optimized" : "Privacy comfort mode", true);

        setText("energyUsage", `${(3.4 + Math.random() * 2.4).toFixed(1)} kWh`);
        setText("waterReserve", `${AppState.waterReserve}%`);
        setText("monthlyEnergyValue", `${AppState.monthlyEnergy} kWh`);
        setText("waterReserveValue", `${AppState.waterReserve}%`);
        setText("solarModeStatus", AppState.solarPriority ? "Solar Priority On" : "Solar Priority Off");

        setText("activeDevicesCount", `${AppState.activeDevices} Devices`);
        setText("sceneStatus", `Current scene: ${AppState.currentScene}`);
        setBadge("homeModeBadge", `${AppState.mode} Mode Active`, true);
        setBadge("systemHealthBadge", AppState.securityArmed ? "92% System Health" : "88% System Health", true);
    }

    function setScene(sceneName) {
        AppState.currentScene = sceneName;
        if (sceneName === "Morning") {
            AppState.lightsOn = true;
            AppState.curtainsOpen = true;
            AppState.targetTemp = 21;
        } else if (sceneName === "Work") {
            AppState.lightsOn = true;
            AppState.curtainsOpen = true;
            AppState.targetTemp = 22;
        } else if (sceneName === "Movie") {
            AppState.lightsOn = true;
            AppState.curtainsOpen = false;
            AppState.targetTemp = 21;
        } else if (sceneName === "Outdoor") {
            AppState.lightsOn = true;
            AppState.gateOpen = false;
            AppState.targetTemp = 23;
        }
        updateAppUI();
    }

    function activateMode(mode) {
        if (mode === "away") {
            AppState.mode = "Away";
            AppState.securityArmed = true;
            AppState.lightsOn = false;
            AppState.curtainsOpen = false;
            AppState.currentScene = "Property Secured";
        } else if (mode === "night") {
            AppState.mode = "Night";
            AppState.securityArmed = true;
            AppState.lightsOn = true;
            AppState.curtainsOpen = false;
            AppState.currentScene = "Night Comfort";
        } else {
            AppState.mode = "Home";
            AppState.securityArmed = true;
            AppState.lightsOn = true;
            AppState.curtainsOpen = true;
            AppState.currentScene = "Lounge Welcome";
        }
        updateAppUI();
    }

    function setRoom(roomName, button) {
        AppState.room = roomName;
        document.querySelectorAll(".room-chip").forEach(chip => chip.classList.remove("active"));
        if (button) button.classList.add("active");
        updateAppUI();
    }

    function toggleLight() {
        AppState.lightsOn = !AppState.lightsOn;
        updateAppUI();
    }

    function toggleSecurity() {
        AppState.securityArmed = !AppState.securityArmed;
        updateAppUI();
    }

    function toggleGate() {
        AppState.gateOpen = !AppState.gateOpen;
        updateAppUI();
    }

    function toggleGarage() {
        AppState.garageOpen = !AppState.garageOpen;
        updateAppUI();
    }

    function toggleCurtains() {
        AppState.curtainsOpen = !AppState.curtainsOpen;
        updateAppUI();
    }

    function adjustClimate(change) {
        AppState.targetTemp = Math.min(28, Math.max(16, AppState.targetTemp + change));
        updateAppUI();
    }

    function refreshUtilities() {
        AppState.monthlyEnergy = Math.max(280, Math.min(560, AppState.monthlyEnergy + Math.round((Math.random() - 0.5) * 24)));
        AppState.waterReserve = Math.max(42, Math.min(98, AppState.waterReserve + Math.round((Math.random() - 0.5) * 8)));
        updateAppUI();
    }

    function toggleSolarMode() {
        AppState.solarPriority = !AppState.solarPriority;
        updateAppUI();
    }

    function simulateDoorbell() {
        alert("Visitor detected at the entrance. Live notification sent to the SBM Smart Living dashboard.");
    }

    function openApp() {
        safeNavigate("app.html");
    }

    function goHome() {
        safeNavigate("index.html");
    }

    function goQuotePage() {
        safeNavigate("contact.html");
    }

    function initSplash() {
        const splash = byId("splashScreen");
        if (!splash) return;

        const hideSplash = () => {
            setTimeout(() => {
                splash.classList.add("hide");
            }, getReducedMotionPreference() ? 100 : 1100);
        };

        if (sessionStorage.getItem("sbmSplashSeen") === "true") {
            splash.classList.add("hide");
            return;
        }

        window.addEventListener("load", () => {
            sessionStorage.setItem("sbmSplashSeen", "true");
            hideSplash();
        });
    }

    function initMobileNav() {
        const toggle = byId("navToggle");
        const nav = byId("siteNav");
        if (!toggle || !nav) return;

        const closeNav = () => {
            nav.classList.remove("show");
            toggle.setAttribute("aria-expanded", "false");
            document.body.classList.remove("nav-open");
        };

        toggle.addEventListener("click", () => {
            const expanded = toggle.getAttribute("aria-expanded") === "true";
            toggle.setAttribute("aria-expanded", String(!expanded));
            nav.classList.toggle("show");
            document.body.classList.toggle("nav-open", !expanded && window.innerWidth <= 768);
        });

        nav.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                if (window.innerWidth <= 768) {
                    closeNav();
                }
            });
        });

        document.addEventListener("click", event => {
            if (window.innerWidth > 768) return;
            if (!nav.contains(event.target) && !toggle.contains(event.target)) {
                closeNav();
            }
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                closeNav();
            }
        });

        window.addEventListener("resize", () => {
            if (window.innerWidth > 768) {
                closeNav();
            }
        }, { passive: true });
    }

    function initContactForm() {
        const form = byId("contactForm");
        const submitBtn = byId("submitBtn");
        const formStatus = byId("formStatus");
        const successOverlay = byId("successOverlay");
        if (!form || form.dataset.ajaxHandled === "true") return;

        form.dataset.ajaxHandled = "true";

        form.addEventListener("submit", async event => {
            event.preventDefault();

            if (submitBtn) {
                submitBtn.classList.add("loading");
                submitBtn.disabled = true;
                submitBtn.textContent = "Sending...";
            }

            if (formStatus) formStatus.textContent = "";

            try {
                const response = await fetch(form.action, {
                    method: "POST",
                    body: new FormData(form),
                    headers: { "Accept": "application/json" }
                });

                if (!response.ok) {
                    throw new Error("Request failed");
                }

                form.reset();

                if (successOverlay) {
                    successOverlay.classList.add("show");
                    successOverlay.setAttribute("aria-hidden", "false");
                    setTimeout(() => {
                        window.location.href = "thank-you.html";
                    }, 2200);
                } else if (formStatus) {
                    formStatus.textContent = "Message sent successfully.";
                }

                if (submitBtn) {
                    submitBtn.classList.remove("loading");
                    submitBtn.disabled = false;
                    submitBtn.textContent = "Send Message";
                }
            } catch (error) {
                if (formStatus) {
                    formStatus.textContent = "Network error. Please check your connection and try again.";
                }
                if (submitBtn) {
                    submitBtn.classList.remove("loading");
                    submitBtn.disabled = false;
                    submitBtn.textContent = "Send Message";
                }
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
        const elements = document.querySelectorAll(".feature-box, .service-card, .content-card, .app-card, .stat-card, .cta-box, .highlight-card, .contact-mini-card, .construction-vision-card");
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
        document.querySelectorAll('a[href^="http"]').forEach(link => {
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
    window.goQuotePage = goQuotePage;
    window.toggleLight = toggleLight;
    window.toggleSecurity = toggleSecurity;
    window.toggleGate = toggleGate;
    window.toggleGarage = toggleGarage;
    window.toggleCurtains = toggleCurtains;
    window.adjustClimate = adjustClimate;
    window.refreshUtilities = refreshUtilities;
    window.toggleSolarMode = toggleSolarMode;
    window.simulateDoorbell = simulateDoorbell;
    window.activateMode = activateMode;
    window.setScene = setScene;
    window.setRoom = setRoom;

    document.addEventListener("DOMContentLoaded", init);
})();


// === SBM Enhanced utility layer ===
document.addEventListener("DOMContentLoaded", () => {
  const current = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".navbar a").forEach(link => {
    const href = link.getAttribute("href");
    if (href === current) link.setAttribute("aria-current", "page");
  });
  if (!document.querySelector(".skip-link")) {
    const skip = document.createElement("a");
    skip.href = "#main";
    skip.className = "skip-link";
    skip.textContent = "Skip to content";
    document.body.prepend(skip);
  }
  const firstSection = document.querySelector("main, .hero-section, .page-banner, .section");
  if (firstSection && !firstSection.id) firstSection.id = "main";
});
