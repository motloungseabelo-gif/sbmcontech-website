/* SBM: lightweight navigation, enquiries, consent and on-demand LAEL. */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const config = JSON.parse($('#site-config')?.textContent || '{}');
  const release = new URL(document.currentScript.src).searchParams.get('v');
  const asset = path => `/${path}${release ? `?v=${encodeURIComponent(release)}` : ''}`;
  $$('[data-year]').forEach(node => { node.textContent = new Date().getFullYear(); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  const nav = $('#siteNav'), toggle = $('#navToggle');
  function closeNavigation() {
    nav?.classList.remove('show'); toggle?.setAttribute('aria-expanded', 'false');
  }
  toggle?.addEventListener('click', () => {
    const open = toggle.getAttribute('aria-expanded') !== 'true';
    toggle.setAttribute('aria-expanded', String(open)); nav.classList.toggle('show', open);
  });
  nav?.addEventListener('click', event => { if (event.target.closest('a,button')) closeNavigation(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle?.getAttribute('aria-expanded') === 'true') { closeNavigation(); toggle.focus(); }
  });
  document.addEventListener('pointerdown', event => { if (!event.target.closest('.site-header')) closeNavigation(); }, {passive:true});
  document.addEventListener('focusin', event => { if (!event.target.closest('.site-header')) closeNavigation(); });
  matchMedia('(min-width:761px)').addEventListener('change', closeNavigation);

  // Analytics loads only with consent and a real property; no personal form fields are sent.
  const consentKey = 'sbm-cookie-consent-v1', duration = 183 * 24 * 60 * 60 * 1000;
  let analyticsLoaded = false;
  function readConsent() {
    try {
      const saved = JSON.parse(localStorage.getItem(consentKey) || 'null');
      return saved && ['accepted','rejected'].includes(saved.choice) && saved.time <= Date.now() && Date.now() - saved.time < duration ? saved.choice : null;
    } catch { return null; }
  }
  function loadAnalytics() {
    const id = config.analyticsId;
    if (analyticsLoaded || !/^G-[A-Z0-9]+$/.test(id || '') || readConsent() !== 'accepted') return;
    analyticsLoaded = true; window[`ga-disable-${id}`] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
    window.gtag('js',new Date());
    window.gtag('config',id,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false});
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    script.async = true; document.head.append(script);
    window.gtag('event','page_view',{page_title:document.title,page_location:location.origin + location.pathname,page_referrer:''});
  }
  function clearAnalyticsCookies() {
    const hostname = location.hostname;
    const domains = ['', hostname, `.${hostname}`, ...hostname.split('.').map((_,i,a)=>'.'+a.slice(i).join('.'))];
    document.cookie.split(';').forEach(cookie => {
      const name = cookie.split('=')[0].trim();
      if (!/^_ga(?:_|$)|^_gid$|^_gat/.test(name)) return;
      domains.forEach(domain => { document.cookie = `${name}=;Max-Age=0;path=/;${domain ? `domain=${domain};` : ''}SameSite=Lax`; });
    });
  }
  const banner = $('#cookieBanner');
  let consentTrigger;
  function showConsent(trigger, focus = false) {
    consentTrigger = trigger; banner.hidden = false;
    if (focus) banner.querySelector('button')?.focus();
  }
  function chooseConsent(choice) {
    const wasLoaded = analyticsLoaded;
    try { localStorage.setItem(consentKey,JSON.stringify({choice,time:Date.now()})); } catch { /* Keep the page usable when storage is unavailable. */ }
    if (choice === 'rejected') {
      if (config.analyticsId) window[`ga-disable-${config.analyticsId}`] = true;
      window.gtag?.('consent','update',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
      clearAnalyticsCookies();
    } else loadAnalytics();
    banner.hidden = true; consentTrigger?.focus();
    if (choice === 'rejected' && wasLoaded) location.reload();
  }
  $$('[data-cookie-settings]').forEach(button => button.addEventListener('click', event => { event.preventDefault(); showConsent(button,true); }));
  $$('[data-consent]').forEach(button => button.addEventListener('click', () => chooseConsent(button.dataset.consent)));
  $('.cookie-close')?.addEventListener('click', () => chooseConsent('rejected'));
  if (!readConsent()) showConsent(null);
  else if (readConsent() === 'accepted') loadAnalytics();
  else clearAnalyticsCookies();
  addEventListener('storage', event => {
    if (event.key !== consentKey) return;
    if (readConsent() === 'accepted') loadAnalytics();
    else if (analyticsLoaded) { if(config.analyticsId) window[`ga-disable-${config.analyticsId}`] = true; location.reload(); }
  });

  const form = $('#projectForm');
  if (form) {
    form.noValidate = true;
    const fields = [...form.querySelectorAll('[required]')];
    const button = $('#scopeSubmit'), status = $('#formStatus');
    let sending = false, submitted = false, request;
    const requested = new URLSearchParams(location.search).get('service');
    if (['digital','automation','infrastructure','discovery'].includes(requested)) $('#service').value = requested;
    const errorFor = field => {
      if (field.type === 'checkbox') return field.checked ? '' : 'Please agree so we can respond to your enquiry.';
      if (!field.value.trim()) return field.tagName === 'SELECT' ? 'Please choose a starting point.' : 'Please complete this field.';
      if (field.type === 'email' && field.validity.typeMismatch) return 'Please enter a valid email address.';
      if (field.id === 'message' && field.value.trim().length < 10) return 'Please add a little more detail (at least 10 characters).';
      return field.validity.valid ? '' : 'Please check this field.';
    };
    const validate = field => {
      const error = errorFor(field), node = document.getElementById(`${field.id}-error`);
      field.setAttribute('aria-invalid',String(Boolean(error))); if (node) node.textContent = error;
      return !error;
    };
    fields.forEach(field => {
      field.addEventListener('blur', () => validate(field));
      field.addEventListener('input', () => { if (field.getAttribute('aria-invalid') === 'true') validate(field); });
      field.addEventListener('change', () => { if (field.getAttribute('aria-invalid') === 'true') validate(field); });
    });
    form.addEventListener('submit',async event => {
      event.preventDefault(); if (sending || submitted) return;
      status.classList.remove('error'); status.textContent = '';
      const invalid = fields.filter(field => !validate(field));
      if (invalid.length) { status.textContent = 'Please check the highlighted fields.'; status.classList.add('error'); invalid[0].focus({preventScroll:true}); invalid[0].scrollIntoView({block:'center',behavior:'instant'}); return; }
      if (form.elements._gotcha.value) return;
      request = new AbortController(); const timer = setTimeout(() => request?.abort(),20000);
      sending = true; const originalButton = button.innerHTML;
      button.disabled = true; button.setAttribute('aria-busy','true'); form.setAttribute('aria-busy','true');
      button.textContent = 'Sending your enquiry…'; status.textContent = 'Sending securely. Please wait a moment.';
      try {
        const response = await fetch(form.action,{method:'POST',body:new FormData(form),headers:{Accept:'application/json'},signal:request.signal});
        if (!response.ok) throw new Error('Enquiry could not be accepted');
        const body = await response.json(); if (body.ok !== true) throw new Error('Enquiry was not confirmed');
        submitted = true;
        try { sessionStorage.setItem('sbm-enquiry-confirmed','1'); } catch { /* Use generic confirmation if storage is unavailable. */ }
        if (analyticsLoaded && readConsent() === 'accepted') window.gtag?.('event','generate_lead',{method:'project_enquiry'});
        location.assign('/thank-you.html');
      } catch (error) {
        status.classList.add('error');
        status.textContent = error.name === 'AbortError' ? 'We could not confirm delivery in time. Please contact us by email or WhatsApp before retrying, so we can avoid a duplicate.' : 'Your enquiry could not be confirmed. Your details are still here. Please retry, email us or contact us on WhatsApp.';
        status.focus();
      } finally {
        clearTimeout(timer); sending = false; request = null; form.removeAttribute('aria-busy'); button.removeAttribute('aria-busy');
        if (!submitted) { button.disabled = false; button.innerHTML = originalButton; }
      }
    });
    addEventListener('pagehide', () => request?.abort());
    addEventListener('pageshow',event => {
      if (event.persisted) { sending = false; submitted = false; button.disabled = false; button.removeAttribute('aria-busy'); form.removeAttribute('aria-busy'); button.innerHTML = 'Send enquiry <span aria-hidden="true">↗</span>'; }
    });
  }
  if ($('#thanksHeading')) {
    try {
      if (sessionStorage.getItem('sbm-enquiry-confirmed') === '1') {
        $('#thanksHeading').innerHTML = 'Message received.<br><em>Possibilities ahead.</em>';
        $('#thanksMessage').textContent = 'Thank you for getting in touch. Our team will review your enquiry and reply using the email address you provided.';
        sessionStorage.removeItem('sbm-enquiry-confirmed');
      }
    } catch { /* A direct visit must never assert an enquiry was delivered. */ }
  }

  const lab = {security:true,gate:false,lighting:true,temperature:22};
  function paintLab(message) {
    if (!$('#labStatus')) return;
    $('#securityState').textContent = lab.security ? 'Armed' : 'Disarmed'; $('#gateState').textContent = lab.gate ? 'Open' : 'Closed';
    $('#lightingState').textContent = lab.lighting ? 'On' : 'Off'; $('#temperature').textContent = lab.temperature;
    $$('[data-lab]').forEach(button => button.setAttribute('aria-pressed',String(lab[button.dataset.lab])));
    $('#labStatus').textContent = `${message} Simulation only; no real device was changed.`;
  }
  $$('[data-lab]').forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.lab; lab[key] = !lab[key];
    $$('[data-scene]').forEach(node => { node.classList.remove('selected'); node.setAttribute('aria-pressed','false'); });
    paintLab(`${key.charAt(0).toUpperCase()+key.slice(1)} changed.`);
  }));
  $$('[data-temperature]').forEach(button => button.addEventListener('click', () => { lab.temperature = Math.max(16,Math.min(30,lab.temperature+Number(button.dataset.temperature))); paintLab(`Target temperature ${lab.temperature} degrees.`); }));
  $$('[data-scene]').forEach(button => button.addEventListener('click', () => {
    const scene = button.dataset.scene;
    lab.security = scene !== 'home'; lab.gate = false; lab.lighting = scene !== 'away'; lab.temperature = scene === 'away' ? 24 : scene === 'night' ? 20 : 22;
    $$('[data-scene]').forEach(node => { const active = node === button; node.classList.toggle('selected',active); node.setAttribute('aria-pressed',String(active)); });
    paintLab(`${scene.charAt(0).toUpperCase()+scene.slice(1)} scene selected.`);
  }));

  // Preserve LAEL's safe renderer, voice behaviour and backend. Load only on intent.
  const launcher = document.createElement('button'); launcher.className = 'lael-preview'; launcher.type = 'button';
  launcher.setAttribute('aria-label','Open LAEL assistant'); launcher.innerHTML = '<span aria-hidden="true">✳</span><b>Ask LAEL</b>'; document.body.append(launcher);
  let loading = false, attempt = 0, initiatingButton;
  function openAssistant(trigger) {
    if ($('.lael-launcher')) { document.dispatchEvent(new Event('sbm:open-lael')); return; }
    if (loading) return;
    initiatingButton = trigger; $('#assistantLoadStatus')?.remove(); loading = true;
    const turn = ++attempt; launcher.disabled = true; launcher.setAttribute('aria-busy','true'); launcher.querySelector('b').textContent = 'Opening…';
    const stylesheet = document.createElement('link'); let script, deadline;
    const recover = () => {
      if (!loading || turn !== attempt) return;
      clearTimeout(deadline); loading = false; launcher.disabled = false; launcher.removeAttribute('aria-busy'); launcher.querySelector('b').textContent = 'TRY LAEL AGAIN';
      stylesheet.remove(); script?.remove();
      const status = document.createElement('p'); status.id = 'assistantLoadStatus'; status.className = 'assistant-status'; status.setAttribute('role','status');
      status.textContent = 'LAEL could not load. Please retry, or use our contact page.'; document.body.append(status); initiatingButton?.focus();
    };
    deadline = setTimeout(recover,12000); stylesheet.rel = 'stylesheet'; stylesheet.href = asset('lael.min.css');
    stylesheet.addEventListener('load', () => {
      if (!loading || turn !== attempt) return;
      script = document.createElement('script'); script.src = asset('lael.min.js'); script.async = true;
      script.addEventListener('load', () => {
        if (turn !== attempt) return;
        clearTimeout(deadline); if (!$('.lael-launcher')) { recover(); return; }
        loading = false; launcher.remove(); document.dispatchEvent(new Event('sbm:open-lael'));
      },{once:true});
      script.addEventListener('error',recover,{once:true}); document.body.append(script);
    },{once:true});
    stylesheet.addEventListener('error',recover,{once:true}); document.head.append(stylesheet);
  }
  launcher.addEventListener('click', () => openAssistant(launcher));
  document.addEventListener('click',event => { const trigger = event.target.closest('[data-open-lael]'); if (trigger) openAssistant(trigger); });
})();
