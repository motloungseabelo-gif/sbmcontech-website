(() => {
  "use strict";

  if (window.__SBM_REACT_ENHANCER_LOADED__) return;
  window.__SBM_REACT_ENHANCER_LOADED__ = true;

  const { useEffect, useState } = React;

  const CONFIG = {
    businessName: "SBM ConTech Industries",
    instagramUrl: "https://www.instagram.com/sbmcontechindustries/",
    whatsappUrl: "https://wa.me/27795282958",
    email: "sbmcontechindustries@gmail.com",
    founder: "Seabelo Blessing Motloung",
    siteUrl: window.location.origin || window.location.href
  };

  function ensureMountNode() {
    let node = document.getElementById("sbm-react-root");
    if (!node) {
      node = document.createElement("div");
      node.id = "sbm-react-root";
      document.body.appendChild(node);
    }
    return node;
  }

  function safeSetAttr(el, attr, value) {
    if (el && value) el.setAttribute(attr, value);
  }

  function injectStyles() {
    if (document.getElementById("sbm-react-enhancer-styles")) return;

    const style = document.createElement("style");
    style.id = "sbm-react-enhancer-styles";
    style.textContent = `
      .sbm-react-ui {
        position: relative;
        z-index: 999;
      }

      .sbm-react-float-stack {
        position: fixed;
        right: 18px;
        bottom: 18px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        z-index: 1300;
      }

      .sbm-react-float-btn {
        border: none;
        outline: none;
        cursor: pointer;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 56px;
        min-height: 56px;
        padding: 12px 16px;
        border-radius: 999px;
        font-family: inherit;
        font-size: 0.92rem;
        font-weight: 600;
        color: #fff;
        background: linear-gradient(135deg, #2f6dff, #194abf);
        box-shadow: 0 14px 34px rgba(47, 109, 255, 0.28);
        transition: transform 0.25s ease, box-shadow 0.25s ease, opacity 0.25s ease;
        backdrop-filter: blur(10px);
      }

      .sbm-react-float-btn:hover {
        transform: translateY(-2px);
      }

      .sbm-react-float-btn--instagram {
        background: linear-gradient(135deg, #405de6, #833ab4, #c13584);
      }

      .sbm-react-float-btn--whatsapp {
        background: linear-gradient(135deg, #25d366, #128c7e);
        color: #07111f;
      }

      .sbm-react-float-btn--top {
        background: linear-gradient(135deg, #d4a164, #7b4d32);
      }

      .sbm-react-mobile-dock {
        position: fixed;
        left: 12px;
        right: 12px;
        bottom: 12px;
        display: none;
        grid-template-columns: repeat(5, 1fr);
        gap: 8px;
        padding: 10px;
        border-radius: 20px;
        background: rgba(7, 16, 28, 0.9);
        border: 1px solid rgba(241, 213, 175, 0.14);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.28);
        backdrop-filter: blur(16px);
        z-index: 1300;
      }

      .sbm-react-mobile-link {
        text-decoration: none;
        color: #f8f3ec;
        text-align: center;
        padding: 10px 6px;
        border-radius: 14px;
        font-size: 0.76rem;
        line-height: 1.2;
        background: rgba(255, 255, 255, 0.04);
        transition: transform 0.2s ease, background 0.2s ease;
      }

      .sbm-react-mobile-link:hover {
        transform: translateY(-1px);
        background: rgba(255, 255, 255, 0.08);
      }

      .sbm-react-mobile-link strong {
        display: block;
        font-size: 1rem;
        margin-bottom: 4px;
      }

      .sbm-react-instagram-banner {
        position: fixed;
        left: 18px;
        bottom: 18px;
        max-width: 320px;
        padding: 14px 16px;
        border-radius: 18px;
        color: #fff;
        background: linear-gradient(135deg, rgba(64, 93, 230, 0.96), rgba(131, 58, 180, 0.96), rgba(193, 53, 132, 0.96));
        border: 1px solid rgba(255, 255, 255, 0.14);
        box-shadow: 0 18px 42px rgba(0, 0, 0, 0.28);
        backdrop-filter: blur(12px);
        z-index: 1299;
      }

      .sbm-react-instagram-banner h4 {
        margin: 0 0 6px;
        font-size: 1rem;
      }

      .sbm-react-instagram-banner p {
        margin: 0 0 10px;
        font-size: 0.88rem;
        line-height: 1.5;
        color: rgba(255, 255, 255, 0.9);
      }

      .sbm-react-instagram-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .sbm-react-instagram-actions a,
      .sbm-react-instagram-actions button {
        border: none;
        cursor: pointer;
        text-decoration: none;
        border-radius: 999px;
        padding: 9px 12px;
        font-size: 0.84rem;
        font-weight: 600;
      }

      .sbm-react-instagram-actions a {
        background: #fff;
        color: #1a1a1a;
      }

      .sbm-react-instagram-actions button {
        background: rgba(255, 255, 255, 0.14);
        color: #fff;
      }

      .sbm-react-speed-chip {
        position: fixed;
        top: 92px;
        right: 18px;
        padding: 10px 14px;
        border-radius: 999px;
        background: rgba(7, 16, 28, 0.84);
        color: #f8f3ec;
        border: 1px solid rgba(241, 213, 175, 0.14);
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.22);
        backdrop-filter: blur(12px);
        font-size: 0.82rem;
        z-index: 1200;
      }

      @media (max-width: 768px) {
        .sbm-react-float-stack,
        .sbm-react-speed-chip,
        .sbm-react-instagram-banner {
          display: none;
        }

        .sbm-react-mobile-dock {
          display: grid;
        }

        body {
          padding-bottom: 92px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function addMetaIfMissing(selector, attrName, attrValue, content) {
    let tag = document.querySelector(selector);
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute(attrName, attrValue);
      document.head.appendChild(tag);
    }
    safeSetAttr(tag, "content", content);
  }

  function enhanceSEO() {
    const currentUrl = window.location.href;
    const title = document.title || CONFIG.businessName;
    const description =
      document.querySelector('meta[name="description"]')?.getAttribute("content") ||
      `${CONFIG.businessName} offers smart homes, automation, websites, apps, and intelligent digital solutions in South Africa.`;

    addMetaIfMissing('meta[property="og:title"]', "property", "og:title", title);
    addMetaIfMissing('meta[property="og:description"]', "property", "og:description", description);
    addMetaIfMissing('meta[property="og:url"]', "property", "og:url", currentUrl);
    addMetaIfMissing('meta[name="twitter:title"]', "name", "twitter:title", title);
    addMetaIfMissing('meta[name="twitter:description"]', "name", "twitter:description", description);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", currentUrl);

    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.setAttribute("name", "robots");
      document.head.appendChild(robots);
    }
    robots.setAttribute("content", "index, follow");
  }

  function addStructuredData() {
    if (document.getElementById("sbm-react-structured-data")) return;

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "sbm-react-structured-data";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: CONFIG.businessName,
      url: CONFIG.siteUrl,
      logo: "images/Logo.png",
      sameAs: [CONFIG.instagramUrl],
      founder: {
        "@type": "Person",
        name: CONFIG.founder
      },
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: CONFIG.email
      }
    });
    document.head.appendChild(script);
  }

  function optimizeImages() {
    const images = document.querySelectorAll("img");
    images.forEach((img, index) => {
      if (!img.hasAttribute("loading")) {
        img.setAttribute("loading", index === 0 ? "eager" : "lazy");
      }
      if (!img.hasAttribute("decoding")) {
        img.setAttribute("decoding", "async");
      }
    });
  }

  function secureExternalLinks() {
    document.querySelectorAll('a[href^="http"]').forEach((link) => {
      const href = link.getAttribute("href") || "";
      const sameOrigin = href.startsWith(window.location.origin);

      if (!sameOrigin) {
        if (!link.hasAttribute("target")) link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer");
      }
    });
  }

  function injectInstagramLinksIntoPage() {
    const footerAreas = document.querySelectorAll(".hero-buttons");
    footerAreas.forEach((area) => {
      if (!area || area.querySelector(".sbm-react-inline-instagram")) return;

      const link = document.createElement("a");
      link.href = CONFIG.instagramUrl;
      link.className = "sbm-react-inline-instagram";
      link.textContent = "Instagram";
      link.style.textDecoration = "none";
      link.style.display = "inline-flex";
      link.style.alignItems = "center";
      link.style.justifyContent = "center";
      link.style.padding = "10px 14px";
      link.style.borderRadius = "12px";
      link.style.marginTop = "10px";
      link.style.marginRight = "10px";
      link.style.background = "linear-gradient(135deg, #405de6, #833ab4, #c13584)";
      link.style.color = "#fff";
      link.style.fontWeight = "600";
      link.style.boxShadow = "0 10px 24px rgba(131,58,180,0.24)";
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");

      area.appendChild(link);
    });
  }

  function SpeedChip() {
    const [text, setText] = useState("Optimized for mobile");

    useEffect(() => {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (!connection) return;

      const update = () => {
        const type = connection.effectiveType || "";
        if (type.includes("2g")) {
          setText("Low-data mode detected");
        } else if (type.includes("3g")) {
          setText("Balanced performance mode");
        } else {
          setText("Optimized for mobile");
        }
      };

      update();
      connection.addEventListener?.("change", update);
      return () => connection.removeEventListener?.("change", update);
    }, []);

    return <div className="sbm-react-speed-chip">{text}</div>;
  }

  function InstagramBanner() {
    const [show, setShow] = useState(false);

    useEffect(() => {
      const closed = localStorage.getItem("sbm-react-ig-banner-closed") === "true";
      if (closed) return;

      const timer = setTimeout(() => setShow(true), 2200);
      return () => clearTimeout(timer);
    }, []);

    const close = () => {
      setShow(false);
      localStorage.setItem("sbm-react-ig-banner-closed", "true");
    };

    if (!show) return null;

    return (
      <div className="sbm-react-instagram-banner">
        <h4>Follow SBM on Instagram</h4>
        <p>@sbmcontechindustries for updates, smart living content, branding, and projects.</p>
        <div className="sbm-react-instagram-actions">
          <a href={CONFIG.instagramUrl} target="_blank" rel="noopener noreferrer">
            Open Instagram
          </a>
          <button type="button" onClick={close}>Close</button>
        </div>
      </div>
    );
  }

  function FloatingButtons() {
    const goTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

    return (
      <div className="sbm-react-float-stack" aria-label="Quick actions">
       

        <a
          className="sbm-react-float-btn sbm-react-float-btn--whatsapp"
          href={CONFIG.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open WhatsApp"
        >
          WhatsApp
        </a>

        
      </div>
    );
  }

  function MobileDock() {
    const items = [
      { href: "index.html", icon: "⌂", label: "Home" },
      { href: "services.html", icon: "✦", label: "Services" },
      { href: "contact.html", icon: "✉", label: "Contact" },
      { href: CONFIG.instagramUrl, icon: "◎", label: "Instagram", external: true },
      { href: "app.html", icon: "⌁", label: "App" }
    ];

    return (
      <nav className="sbm-react-mobile-dock" aria-label="Mobile quick navigation">
        {items.map((item) => (
          <a
            key={item.label}
            className="sbm-react-mobile-link"
            href={item.href}
            target={item.external ? "_blank" : undefined}
            rel={item.external ? "noopener noreferrer" : undefined}
          >
            <strong>{item.icon}</strong>
            {item.label}
          </a>
        ))}
      </nav>
    );
  }

  function SBMReactEnhancer() {
    useEffect(() => {
      injectStyles();
      enhanceSEO();
      addStructuredData();
      optimizeImages();
      secureExternalLinks();
      injectInstagramLinksIntoPage();
    }, []);

    return (
      <div className="sbm-react-ui">
        <SpeedChip />
        <InstagramBanner />
        <FloatingButtons />
        <MobileDock />
      </div>
    );
  }

  function mountReactEnhancer() {
    if (!window.React || !window.ReactDOM) {
      console.warn("SBM React enhancer was not mounted because React or ReactDOM is missing.");
      return;
    }

    const rootNode = ensureMountNode();

    try {
      if (ReactDOM.createRoot) {
        if (!window.__SBM_REACT_ROOT__) {
          window.__SBM_REACT_ROOT__ = ReactDOM.createRoot(rootNode);
        }
        window.__SBM_REACT_ROOT__.render(<SBMReactEnhancer />);
      } else {
        ReactDOM.render(<SBMReactEnhancer />, rootNode);
      }
    } catch (error) {
      console.error("SBM React enhancer failed to mount:", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountReactEnhancer);
  } else {
    mountReactEnhancer();
  }
})();
