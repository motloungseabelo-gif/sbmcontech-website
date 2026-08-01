(() => {
  "use strict";

  const state = {
    mode: "Home", room: "Lounge", lightsOn: true, securityArmed: true,
    gateOpen: false, garageOpen: false, curtainsOpen: true, targetTemp: 22,
    solarPriority: false, monthlyEnergy: 412, waterReserve: 78,
    activeDevices: 8, currentScene: "Lounge Welcome"
  };

  const roomProfiles = {
    Lounge: "Viewing: Lounge • Ambient lighting active, media-ready comfort, visitor chime enabled.",
    Kitchen: "Viewing: Kitchen • Utility monitoring active, energy-aware devices synchronized.",
    "Main Bedroom": "Viewing: Main Bedroom • Privacy scene available, curtains and climate tuned for comfort.",
    Patio: "Viewing: Patio • Outdoor lighting and braai-area readiness visible.",
    Garage: "Viewing: Garage • Access control and vehicle entry systems available."
  };

  const $ = id => document.getElementById(id);
  const setText = (id, value) => { const el = $(id); if (el) el.textContent = value; };
  const setBadge = (id, value, active = false) => {
    const el = $(id); if (!el) return;
    el.textContent = value; el.classList.toggle("active", Boolean(active));
  };
  const navigate = url => { if (url) window.location.href = url; };

  function updateAppUI() {
    setText("modeStatus", state.mode);
    setText("selectedRoomStatus", roomProfiles[state.room] || `Viewing: ${state.room}`);
    setText("lightStatus", state.lightsOn ? "Lights are ON" : "Lights are OFF");
    setBadge("lightBadge", state.lightsOn ? `${state.currentScene} lighting active` : "Lighting on standby", state.lightsOn);
    setText("securityStatus", state.securityArmed ? "Armed" : "Disarmed");
    setText("securityDetail", state.securityArmed ? "Perimeter secure. All access points normal." : "Security relaxed for active home circulation.");
    setBadge("securityBadge", state.securityArmed ? "Perimeter secure" : "Home circulation mode", state.securityArmed);
    setText("gateStatus", state.gateOpen ? "Open" : "Closed");
    setText("gateDetail", state.gateOpen ? "Open" : "Closed");
    setText("garageStatus", state.garageOpen ? "Open" : "Closed");
    setText("curtainStatus", state.curtainsOpen ? "Open" : "Closed");
    setText("climateStatus", `${state.targetTemp}°C Cooling`);
    setText("climateDetail", `Target temperature: ${state.targetTemp}°C`);
    setBadge("climateBadge", state.curtainsOpen ? "Comfort optimized" : "Privacy comfort mode", true);
    setText("energyUsage", `${(3.4 + Math.random() * 2.4).toFixed(1)} kWh`);
    setText("waterReserve", `${state.waterReserve}%`);
    setText("monthlyEnergyValue", `${state.monthlyEnergy} kWh`);
    setText("waterReserveValue", `${state.waterReserve}%`);
    setText("solarModeStatus", state.solarPriority ? "Solar Priority On" : "Solar Priority Off");
    setText("activeDevicesCount", `${state.activeDevices} Devices`);
    setText("sceneStatus", `Current scene: ${state.currentScene}`);
    setBadge("homeModeBadge", `${state.mode} Mode Active`, true);
    setBadge("systemHealthBadge", state.securityArmed ? "92% System Health" : "88% System Health", true);
  }

  function activateMode(mode) {
    if (mode === "away") Object.assign(state, { mode: "Away", securityArmed: true, lightsOn: false, curtainsOpen: false, currentScene: "Property Secured" });
    else if (mode === "night") Object.assign(state, { mode: "Night", securityArmed: true, lightsOn: true, curtainsOpen: false, currentScene: "Night Comfort" });
    else Object.assign(state, { mode: "Home", securityArmed: true, lightsOn: true, curtainsOpen: true, currentScene: "Lounge Welcome" });
    updateAppUI();
  }

  function setScene(name) {
    state.currentScene = name;
    if (name === "Morning") Object.assign(state, { lightsOn: true, curtainsOpen: true, targetTemp: 21 });
    if (name === "Work") Object.assign(state, { lightsOn: true, curtainsOpen: true, targetTemp: 22 });
    if (name === "Movie") Object.assign(state, { lightsOn: true, curtainsOpen: false, targetTemp: 21 });
    if (name === "Outdoor") Object.assign(state, { lightsOn: true, gateOpen: false, targetTemp: 23 });
    updateAppUI();
  }

  function setRoom(name, button) {
    state.room = name;
    document.querySelectorAll(".room-chip").forEach(el => el.classList.remove("active"));
    if (button) button.classList.add("active");
    updateAppUI();
  }

  function initTheme() {
    if (!document.querySelector('link[href="modern.css"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet"; link.href = "modern.css";
      document.head.appendChild(link);
    }
  }

  function hidePausedDivisions() {
    const paused = /(?:^|\/)(?:construction|atelier)\.html(?:$|[?#])/i;
    document.querySelectorAll("a[href]").forEach(link => {
      const href = link.getAttribute("href") || "";
      if (!paused.test(href)) return;
      if (link.closest(".navbar,.footer-links,.footer-bottom-links")) { link.remove(); return; }
      const card = link.closest(".service-card,.feature-box,.highlight-card,.content-card,.focus-card");
      if (card) card.remove(); else link.remove();
    });
  }

  function initSplash() {
    const splash = $("splashScreen"); if (!splash) return;
    if (sessionStorage.getItem("sbmSplashSeen") === "true") { splash.classList.add("hide"); return; }
    window.addEventListener("load", () => {
      sessionStorage.setItem("sbmSplashSeen", "true");
      setTimeout(() => splash.classList.add("hide"), matchMedia("(prefers-reduced-motion: reduce)").matches ? 50 : 550);
    }, { once: true });
  }

  function initNav() {
    const toggle = $("navToggle"), nav = $("siteNav"); if (!toggle || !nav) return;
    const close = () => { nav.classList.remove("show"); toggle.setAttribute("aria-expanded", "false"); document.body.classList.remove("nav-open"); };
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(open)); nav.classList.toggle("show", open); document.body.classList.toggle("nav-open", open && innerWidth <= 860);
    });
    nav.addEventListener("click", e => { if (e.target.closest("a") && innerWidth <= 860) close(); });
    document.addEventListener("click", e => { if (innerWidth <= 860 && !nav.contains(e.target) && !toggle.contains(e.target)) close(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
    addEventListener("resize", () => { if (innerWidth > 860) close(); }, { passive: true });
  }

  function initContactForm() {
    const form = $("contactForm"), button = $("submitBtn"), status = $("formStatus"), overlay = $("successOverlay");
    if (!form || form.dataset.ajaxHandled) return;
    form.dataset.ajaxHandled = "true";
    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (button) { button.disabled = true; button.textContent = "Sending..."; }
      if (status) status.textContent = "";
      try {
        const response = await fetch(form.action, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error("Request failed");
        form.reset();
        if (overlay) { overlay.classList.add("show"); overlay.setAttribute("aria-hidden", "false"); setTimeout(() => navigate("thank-you.html"), 2100); }
        else if (status) status.textContent = "Message sent successfully.";
      } catch (_) {
        if (status) status.textContent = "Network error. Please check your connection and try again.";
      } finally {
        if (button) { button.disabled = false; button.textContent = "Send Message"; }
      }
    });
  }

  function initGlobalUI() {
    const current = location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".navbar a").forEach(link => {
      if ((link.getAttribute("href") || "").split(/[?#]/)[0] === current) link.setAttribute("aria-current", "page");
    });
    document.querySelectorAll("[data-year]").forEach(el => el.textContent = new Date().getFullYear());
    document.querySelectorAll("img").forEach(img => {
      if (!img.hasAttribute("decoding")) img.decoding = "async";
      if (!img.hasAttribute("loading") && !img.matches(".hero-logo,.brand-logo,.splash-logo")) img.loading = "lazy";
    });
    document.querySelectorAll('a[href^="http"]').forEach(link => { if (!link.target) link.target = "_blank"; link.rel = "noopener noreferrer"; });
    const header = document.querySelector(".site-header"), progress = $("scrollProgress"), top = $("backToTop");
    const sync = () => {
      if (header) header.classList.toggle("is-scrolled", scrollY > 12);
      if (progress) { const h = document.documentElement.scrollHeight - innerHeight; progress.style.width = `${h > 0 ? scrollY / h * 100 : 0}%`; }
      if (top) top.classList.toggle("show", scrollY > 360);
    };
    sync(); addEventListener("scroll", sync, { passive: true });
    if (top) top.addEventListener("click", () => scrollTo({ top: 0, behavior: "smooth" }));
    const items = document.querySelectorAll(".feature-box,.service-card,.content-card,.app-card,.stat-card,.cta-box,.highlight-card,.contact-mini-card,.focus-card,.leadership-card,.pricing-card");
    if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) items.forEach(el => el.classList.add("show"));
    else {
      items.forEach(el => el.classList.add("reveal"));
      const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add("show"); observer.unobserve(entry.target); } }), { threshold: .12 });
      items.forEach(el => observer.observe(el));
    }
  }

  Object.assign(window, {
    openApp: () => navigate("app.html"), goHome: () => navigate("index.html"), goQuotePage: () => navigate("contact.html"),
    toggleLight: () => { state.lightsOn = !state.lightsOn; updateAppUI(); },
    toggleSecurity: () => { state.securityArmed = !state.securityArmed; updateAppUI(); },
    toggleGate: () => { state.gateOpen = !state.gateOpen; updateAppUI(); },
    toggleGarage: () => { state.garageOpen = !state.garageOpen; updateAppUI(); },
    toggleCurtains: () => { state.curtainsOpen = !state.curtainsOpen; updateAppUI(); },
    adjustClimate: change => { state.targetTemp = Math.min(28, Math.max(16, state.targetTemp + change)); updateAppUI(); },
    refreshUtilities: () => { state.monthlyEnergy = Math.max(280, Math.min(560, state.monthlyEnergy + Math.round((Math.random() - .5) * 24))); state.waterReserve = Math.max(42, Math.min(98, state.waterReserve + Math.round((Math.random() - .5) * 8))); updateAppUI(); },
    toggleSolarMode: () => { state.solarPriority = !state.solarPriority; updateAppUI(); },
    simulateDoorbell: () => alert("Visitor detected at the entrance. Live notification sent to the SBM Smart Living dashboard."),
    activateMode, setScene, setRoom
  });

  document.addEventListener("DOMContentLoaded", () => {
    initTheme(); hidePausedDivisions(); initSplash(); initNav(); initContactForm(); initGlobalUI(); updateAppUI();
  });
})();
