(() => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let disposeUI = () => {};

  function globalUI() {
    const controller = new AbortController();
    const { signal } = controller;
    const nav = $('#siteNav'), toggle = $('#navToggle'), header = $('#siteHeader');
    const closeNav = () => {
      nav?.classList.remove('show');
      toggle?.setAttribute('aria-expanded', 'false');
    };
    const progress = $('#scrollProgress'), top = $('#backToTop');
    let uiRaf = 0, idle = 0, timer = 0, layoutDirty = true, scrollRange = 1, headerHeight = 76;
    const paintScrollUI = () => {
      uiRaf = 0;
      // Read layout only when it changes, before writing compositor-only progress.
      if (layoutDirty) {
        scrollRange = document.documentElement.scrollHeight - innerHeight;
        headerHeight = header?.getBoundingClientRect().height || 76;
        document.documentElement.style.setProperty('--site-header-height', `${headerHeight}px`);
        layoutDirty = false;
      }
      if (progress) progress.style.transform = `scaleX(${Math.max(0, Math.min(1, scrollRange > 0 ? scrollY / scrollRange : 0))})`;
      top?.classList.toggle('show', scrollY > 420);
      if (header && nav?.classList.contains('show')) {
        const box = header.getBoundingClientRect();
        nav.style.maxHeight = `${Math.max(0, innerHeight - box.bottom)}px`;
      }
    };
    const queue = () => { if (!uiRaf) uiRaf = requestAnimationFrame(paintScrollUI); };
    const layoutChanged = () => { layoutDirty = true; queue(); };
    if (toggle && nav) {
      toggle.addEventListener('click', () => {
        const open = toggle.getAttribute('aria-expanded') !== 'true';
        toggle.setAttribute('aria-expanded', String(open));
        nav.classList.toggle('show', open);
        queue();
      }, { signal });
      nav.addEventListener('click', event => { if (event.target.closest('a')) closeNav(); }, { signal });
      addEventListener('keydown', event => {
        if (event.key === 'Escape' && nav.classList.contains('show')) { closeNav(); toggle.focus(); }
      }, { signal });
      document.addEventListener('pointerdown', event => { if (!event.target.closest('.site-header')) closeNav(); }, { passive: true, signal });
      document.addEventListener('focusin', event => { if (!event.target.closest('.site-header')) closeNav(); }, { signal });
      const desktop = matchMedia('(min-width: 861px)');
      desktop.addEventListener('change', closeNav, { signal });
    }
    $$('[data-year]').forEach(element => { element.textContent = new Date().getFullYear(); });
    paintScrollUI();
    addEventListener('scroll', queue, { passive: true, signal });
    addEventListener('resize', layoutChanged, { passive: true, signal });
    addEventListener('load', layoutChanged, { capture: true, signal });
    top?.addEventListener('click', () => scrollTo({ top: 0, behavior: reducedMotion() ? 'instant' : 'smooth' }), { signal });
    const observer = 'ResizeObserver' in window ? new ResizeObserver(layoutChanged) : null;
    if (header) observer?.observe(header);
    observer?.observe(document.documentElement);
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      const register = () => navigator.serviceWorker.register('./sw.js').catch(() => undefined);
      if ('requestIdleCallback' in window) idle = requestIdleCallback(register, { timeout: 3000 });
      else timer = setTimeout(register, 0);
    }
    return () => {
      controller.abort();
      observer?.disconnect();
      cancelAnimationFrame(uiRaf);
      if (idle) cancelIdleCallback(idle);
      clearTimeout(timer);
      closeNav();
    };
  }

  function projectScope() {
    const form = $('#projectForm');
    if (!form) return;
    const steps = $$('.scope-step'), progress = $('#scopeProgress'), button = $('#scopeSubmit'), status = $('#formStatus');
    let current = 0, sending = false, submitted = false, request;
    // Validate the visible step ourselves; native implicit submission would try to focus hidden fields.
    form.noValidate = true;
    const show = index => {
      current = Math.max(0, Math.min(steps.length - 1, index));
      steps.forEach((step, number) => { step.classList.toggle('active', number === current); });
      if (progress) progress.textContent = `${String(current + 1).padStart(2, '0')} / ${String(steps.length).padStart(2, '0')}`;
      $('#scopeProgressBar')?.style.setProperty('transform', `scaleX(${current + 1})`);
      if (current === steps.length - 1) generateBrief();
      const heading = steps[current].querySelector('h2');
      heading?.setAttribute('tabindex', '-1');
      heading?.focus({ preventScroll: true });
      $('#scopeCard')?.scrollIntoView({ behavior: reducedMotion() ? 'instant' : 'smooth', block: 'nearest' });
    };
    function validate(index = current) {
      const fields = [...steps[index].querySelectorAll('input,textarea,select')].filter(field => field.required && !field.disabled);
      for (const field of fields) {
        if (field.type !== 'radio' && !field.value.trim()) field.setCustomValidity('Please complete this field.');
        if (!field.checkValidity()) {
          if (index !== current) show(index);
          field.focus();
          field.reportValidity();
          return false;
        }
      }
      return true;
    }
    form.addEventListener('input', event => { event.target.setCustomValidity?.(''); });
    form.addEventListener('change', event => { event.target.setCustomValidity?.(''); });
    const advance = () => { if (!sending && !submitted && validate()) show(current + 1); };
    $$('.scope-next').forEach(next => next.addEventListener('click', advance));
    $$('.scope-back').forEach(back => back.addEventListener('click', () => { if (!sending && !submitted) show(current - 1); }));
    form.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.isComposing && event.target.matches('input') && current < steps.length - 1) {
        event.preventDefault();
        advance();
      }
    });

    function generateBrief(){const data=new FormData(form),type=data.get('system_type')||'Not Sure',problem=(data.get('problem')||'').toLowerCase();let title='SYSTEM DISCOVERY',text='Begin with workflow discovery and architecture mapping before selecting the final technical approach.',tags=['Discovery','Architecture','Roadmap'];if(type==='Digital System'){title='CUSTOM DIGITAL SYSTEM';text='Recommended starting point: map users, workflows, data and permissions, then define a responsive platform or internal system architecture.';tags=['Platform','Dashboard','Data']}else if(type==='AI + Automation'){title='AUTOMATION WORKFLOW';text='Recommended starting point: identify repeatable hand-offs, information sources and decision points, then design the automation and human review layer.';tags=['Workflow','AI','Integration']}else if(type==='Connected Infrastructure'){title='CONNECTED CONTROL LAYER';text='Recommended starting point: audit devices, networking, access requirements and operational controls before defining the software and integration layer.';tags=['IoT','Control','Security']}
if(/whatsapp|message|lead|customer|booking|quote/.test(problem)&&!tags.includes('CRM'))tags.push('CRM / Messaging');if(/excel|spreadsheet|manual|capture|admin/.test(problem)&&!tags.includes('Automation'))tags.push('Automation');$('#briefTitle').textContent=title;$('#briefText').textContent=text;$('#briefTags').innerHTML=tags.map(t=>`<span>${t}</span>`).join('');$('#generatedBrief').value=`${title} | ${text} | Focus: ${tags.join(', ')}`}


    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (sending || submitted) return;
      if (current < steps.length - 1) { advance(); return; }
      for (let index = 0; index < steps.length; index++) { if (!validate(index)) return; }
      const data = new FormData(form);
      request = new AbortController();
      const timer = setTimeout(() => request?.abort(), 20000);
      sending = true;
      form.setAttribute('aria-busy', 'true');
      const buttons = [...form.querySelectorAll('button')];
      buttons.forEach(control => { control.disabled = true; });
      button.textContent = 'TRANSMITTING...';
      status.textContent = 'Transmitting your project brief…';
      try {
        const response = await fetch(form.action, { method: 'POST', body: data, headers: { Accept: 'application/json' }, signal: request.signal });
        if (!response.ok) throw new Error('Submission unavailable');
        const result = await response.json();
        if (result.ok !== true) throw new Error('Submission was not accepted');
        submitted = true;
        location.href = 'thank-you.html';
      } catch {
        status.textContent = 'Transmission failed. Please use email or WhatsApp, or try again.';
      } finally {
        clearTimeout(timer);
        request = null;
        sending = false;
        form.removeAttribute('aria-busy');
        if (!submitted) {
          buttons.forEach(control => { control.disabled = false; });
          button.textContent = 'Send Project Brief ↗';
        }
      }
    });
    addEventListener('pagehide', () => request?.abort());
    addEventListener('pageshow', event => {
      if (!event.persisted) return;
      submitted = false;
      form.querySelectorAll('button').forEach(control => { control.disabled = false; });
      button.textContent = 'Send Project Brief ↗';
    });
  }

  function lab() {
    const state = { security: true, gate: false, garage: false, temp: 22, lights: true, scene: 'HOME', energy: 4.8, water: 78 };
    const energyMeter = $('#energyValue')?.nextElementSibling;
    // Retain the scale of the existing prototype's initial reading and bar.
    const energyScale = state.energy / (parseFloat(energyMeter?.style.getPropertyValue('--meter') || '64') / 100);
    const text = (selector, value) => { const element = $(selector); if (element) element.textContent = value; };
    const render = () => {
      text('#securityStatus', state.security ? 'SECURE' : 'RELAXED');
      text('#securityBadge', state.security ? 'ARMED' : 'DISARMED');
      text('#gateStatus', state.gate ? 'OPEN' : 'CLOSED');
      text('#garageStatus', state.garage ? 'OPEN' : 'CLOSED');
      text('#tempValue', `${state.temp}°`);
      text('#lightBadge', state.lights ? 'ACTIVE' : 'STANDBY');
      $('#lightOrb')?.classList.toggle('off', !state.lights);
      text('#sceneBadge', state.scene);
      text('#energyValue', `${state.energy.toFixed(1)} kWh`);
      text('#waterValue', `${state.water}%`);
      energyMeter?.style.setProperty('--meter', `${Math.min(100, state.energy / energyScale * 100)}%`);
      $('#waterValue')?.nextElementSibling.style.setProperty('--meter', `${state.water}%`);
      for (const action of ['security', 'gate', 'garage', 'lights']) $(`[data-lab="${action}"]`)?.setAttribute('aria-pressed', String(state[action]));
      $$('[data-scene]').forEach(control => {
        const selected = control.dataset.scene === state.scene;
        control.classList.toggle('active', selected);
        control.setAttribute('aria-pressed', String(selected));
      });
    };
    $$('[data-lab]').forEach(control => control.addEventListener('click', () => {
      const action = control.dataset.lab;
      if (['security', 'gate', 'garage', 'lights'].includes(action)) state[action] = !state[action];
      if (action === 'tempUp') state.temp = Math.min(28, state.temp + 1);
      if (action === 'tempDown') state.temp = Math.max(16, state.temp - 1);
      if (action === 'refresh') { state.energy = Number((3.3 + Math.random() * 3).toFixed(1)); state.water = Math.round(68 + Math.random() * 22); }
      render();
    }));
    $$('[data-scene]').forEach(control => control.addEventListener('click', () => {
      state.scene = control.dataset.scene;
      if (state.scene === 'AWAY') { state.security = true; state.lights = false; }
      else if (state.scene === 'NIGHT') { state.security = true; state.lights = true; state.temp = 20; }
      else if (state.scene === 'FOCUS') { state.lights = true; state.temp = 21; }
      else { state.security = true; state.lights = true; state.temp = 22; }
      render();
    }));
    render();
  }

  document.addEventListener('DOMContentLoaded', () => { disposeUI = globalUI(); projectScope(); lab(); }, { once: true });
  addEventListener('pagehide', () => disposeUI());
  addEventListener('pageshow', event => { if (event.persisted) disposeUI = globalUI(); });
})();
/* SBM Cinematic Motion: position-based parallax with readable scroll reveals. */
(() => {
  const q = (selector, context = document) => context.querySelector(selector);
  const qa = (selector, context = document) => [...context.querySelectorAll(selector)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(pointer: fine)');
  const mobile = matchMedia('(max-width: 860px)');
  const lite = Boolean(navigator.connection?.saveData) || Number(navigator.deviceMemory || 8) <= 4;
  let pointerX = 0, pointerY = 0, dispose = () => {}, started = false;

  function preparePortraits() {
    qa('.leader-photo').forEach(frame => {
      const image = q('img', frame);
      if (!image || frame.dataset.depthReady) return;
      frame.dataset.depthReady = '1';
      const background = image.cloneNode(true);
      background.alt = '';
      background.setAttribute('aria-hidden', 'true');
      background.className = 'portrait-background';
      image.className = 'portrait-foreground';
      frame.insertBefore(background, image);
    });
  }

  function sectionReveals() {
    const sections = qa('main > section'), reveals = qa('.reveal');
    const activate = element => element.classList.add(element.classList.contains('reveal') ? 'show' : 'section-active');
    const targets = [...sections, ...reveals];
    if (reduce.matches || !('IntersectionObserver' in window)) {
      targets.forEach(activate);
      return () => {};
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { activate(entry.target); observer.unobserve(entry.target); } });
    }, { rootMargin: '250px 0px', threshold: 0 });
    // Batch geometry reads before class changes so reveals cannot force repeated layout.
    const measured = targets.map(element => ({ element, box: element.getBoundingClientRect() }));
    measured.forEach(({ element, box }) => {
      if (box.top <= innerHeight + 250 && box.bottom >= -250) activate(element);
      else observer.observe(element);
    });
    return () => observer.disconnect();
  }

  function decorativeMotion() {
    if (!('IntersectionObserver' in window) || reduce.matches) return () => {};
    const targets = qa('.system-visual,.ticker,.arch-map,.status,.footer-status,.lab-health');
    const visible = new Set();
    const update = () => targets.forEach(target => target.classList.toggle('motion-paused', document.hidden || !visible.has(target)));
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target));
      update();
    }, { rootMargin: '100px' });
    targets.forEach(target => observer.observe(target));
    document.addEventListener('visibilitychange', update);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
      targets.forEach(target => target.classList.remove('motion-paused'));
    };
  }

  function scroll3D() {
    const targets = qa('.hero,.page-hero,.system-visual,.arch-map,.case-preview,.brand-preview,.leader-photo,.vision-band,.work-screen,.sbm-corporate-park');
    if (reduce.matches || !targets.length) return { queue: () => {}, cleanup: () => {} };
    const controller = new AbortController(), { signal } = controller;
    const geometry = new Map();
    let raf = 0, settle = 0, dirty = true, alive = true, previousY = scrollY, previousTime = performance.now();
    const depthProperties = ['--depth-y', '--depth-y-inv', '--depth-y-soft', '--depth-y-inv-soft', '--depth-y-subtle', '--depth-y-inv-subtle', '--depth-x', '--depth-x-inv', '--depth-r'];
    const measure = () => {
      targets.forEach(element => {
        // Layout offsets exclude the transforms this effect writes, avoiding measurement feedback.
        let top = 0, parent = element;
        while (parent) { top += parent.offsetTop; parent = parent.offsetParent; }
        geometry.set(element, { top, height: element.offsetHeight });
      });
      dirty = false;
    };
    const paint = time => {
      raf = 0;
      if (!alive) return;
      if (dirty) measure();
      const height = innerHeight || 1, currentY = scrollY;
      const velocity = Math.max(-28, Math.min(28, (currentY - previousY) * 16 / Math.max(16, time - previousTime)));
      previousY = currentY;
      previousTime = time;
      const intensity = mobile.matches ? .48 : lite ? .68 : 1;
      const range = mobile.matches ? 12 : 22;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - height);
      const updates = targets.map(element => {
        const box = geometry.get(element);
        const active = box.top + box.height >= currentY - height * .25 && box.top <= currentY + height * 1.25;
        const position = Math.max(-1.15, Math.min(1.15, (box.top - currentY + box.height * .5 - height * .5) / height));
        return { element, active, y: Math.max(-range, Math.min(range, -position * range)) * intensity, x: pointerX * (mobile.matches ? 0 : 7) * intensity, tilt: position * (mobile.matches ? 1.15 : 1.8) * intensity };
      });
      document.documentElement.style.setProperty('--scroll-velocity', `${(velocity * .035).toFixed(3)}deg`);
      document.documentElement.style.setProperty('--scroll-page', `${Math.max(0, Math.min(1, currentY / maxScroll)).toFixed(4)}`);
      updates.forEach(({ element, active, y, x, tilt }) => {
        element.classList.toggle('depth-active', active);
        if (!active) return;
        const values = [y, -y, y * .45, -y * .45, y * .25, -y * .32, x, -x];
        values.forEach((value, index) => element.style.setProperty(depthProperties[index], `${value.toFixed(2)}px`));
        element.style.setProperty('--depth-r', `${tilt.toFixed(3)}deg`);
      });
    };
    const queue = () => { if (alive && !raf) raf = requestAnimationFrame(paint); };
    const onScroll = () => {
      queue();
      clearTimeout(settle);
      settle = setTimeout(queue, 120); // Finish the velocity accent at zero when scrolling stops.
    };
    const layoutChanged = () => { dirty = true; queue(); };
    addEventListener('scroll', onScroll, { passive: true, signal });
    addEventListener('resize', layoutChanged, { passive: true, signal });
    addEventListener('orientationchange', layoutChanged, { signal });
    addEventListener('load', layoutChanged, { capture: true, signal });
    const observer = 'ResizeObserver' in window ? new ResizeObserver(layoutChanged) : null;
    observer?.observe(document.documentElement);
    targets.forEach(element => observer?.observe(element));
    document.fonts?.ready.then(() => { if (alive) layoutChanged(); });
    queue(); // Includes restored scroll positions and direct fragment navigation before boot.
    return { queue, cleanup: () => {
      alive = false;
      controller.abort();
      observer?.disconnect();
      cancelAnimationFrame(raf);
      clearTimeout(settle);
      targets.forEach(element => {
        element.classList.remove('depth-active');
        depthProperties.forEach(property => element.style.removeProperty(property));
      });
      document.documentElement.style.setProperty('--scroll-velocity', '0deg');
      document.documentElement.style.removeProperty('--scroll-page');
    } };
  }

  function pointerDepth(queueDepth) {
    if (!fine.matches || reduce.matches || mobile.matches || lite) return () => {};
    const controller = new AbortController(), { signal } = controller;
    let raf = 0, activeCard, clientX = 0, clientY = 0;
    const cards = qa('.system-visual,.arch-map,.case-preview,.work-card,.leader-card');
    addEventListener('pointermove', event => {
      pointerX = event.clientX / innerWidth - .5;
      pointerY = event.clientY / innerHeight - .5;
      clientX = event.clientX;
      clientY = event.clientY;
      activeCard = event.target.closest?.('.system-visual,.arch-map,.case-preview,.work-card,.leader-card');
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const box = activeCard?.getBoundingClientRect();
        document.documentElement.style.setProperty('--pointer-x', `${(pointerX * 7).toFixed(2)}px`);
        document.documentElement.style.setProperty('--pointer-y', `${(pointerY * 7).toFixed(2)}px`);
        if (box?.width && box.height) {
          activeCard.style.setProperty('--tilt-y', `${((clientX - box.left) / box.width * 4.2 - 2.1).toFixed(2)}deg`);
          activeCard.style.setProperty('--tilt-x', `${(-((clientY - box.top) / box.height - .5) * 3.6).toFixed(2)}deg`);
        }
        queueDepth();
      });
    }, { passive: true, signal });
    cards.forEach(card => card.addEventListener('pointerleave', () => {
      card.style.setProperty('--tilt-y', '0deg');
      card.style.setProperty('--tilt-x', '0deg');
      if (activeCard === card) activeCard = null;
    }, { signal }));
    return () => {
      controller.abort();
      cancelAnimationFrame(raf);
      pointerX = pointerY = 0;
      ['--pointer-x', '--pointer-y'].forEach(property => document.documentElement.style.removeProperty(property));
      cards.forEach(card => ['--tilt-x', '--tilt-y'].forEach(property => card.style.removeProperty(property)));
    };
  }

  function pageWipe() {
    document.body.classList.remove('page-leaving');
    let wipe = q('.sbm-page-wipe');
    if (!wipe) {
      wipe = document.createElement('div');
      wipe.className = 'sbm-page-wipe';
      wipe.setAttribute('aria-hidden', 'true');
      document.body.appendChild(wipe);
    }
    if (reduce.matches || mobile.matches || lite) return () => {};
    const controller = new AbortController();
    let navigation = 0, reset = 0;
    document.addEventListener('click', event => {
      const anchor = event.target.closest('a[href]');
      if (!anchor || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || (anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return;
      let url;
      try { url = new URL(anchor.href, location.href); } catch { return; }
      if (url.origin !== location.origin || !/^https?:$/.test(url.protocol) || (url.pathname === location.pathname && url.hash) || !/\.html$|\/$/.test(url.pathname)) return;
      event.preventDefault();
      if (navigation) return;
      document.body.classList.add('page-leaving');
      navigation = setTimeout(() => { location.href = url.href; }, 160);
      reset = setTimeout(() => { navigation = 0; document.body.classList.remove('page-leaving'); }, 1500);
    }, { signal: controller.signal });
    return () => {
      controller.abort();
      clearTimeout(navigation);
      clearTimeout(reset);
      document.body.classList.remove('page-leaving');
    };
  }

  function boot() {
    dispose();
    document.body.classList.add('motion-ready');
    document.body.classList.toggle('scroll-3d', !reduce.matches);
    document.body.classList.toggle('motion-lite', lite);
    preparePortraits();
    const stopReveals = sectionReveals(), stopDecorative = decorativeMotion(), depth = scroll3D(), stopPointer = pointerDepth(depth.queue), stopWipe = pageWipe();
    dispose = () => { stopReveals(); stopDecorative(); stopPointer(); depth.cleanup(); stopWipe(); };
    started = true;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
  addEventListener('pagehide', () => { dispose(); started = false; });
  addEventListener('pageshow', event => { if (event.persisted) boot(); });
  [reduce, fine, mobile].forEach(query => query.addEventListener('change', () => { if (started) boot(); }));
})();

// Render a tiny launcher first. Load the full assistant only when a visitor opens it.
(() => {
  const release = new URL(document.currentScript?.src || location.href).searchParams.get('v');
  const assetUrl = path => release ? `${path}?v=${encodeURIComponent(release)}` : path;
  function addLaelLauncher(){
    const preview=document.createElement('button');
    preview.type='button';
    preview.className='lael-preview';
    preview.setAttribute('aria-label','Open LAEL assistant');
    preview.innerHTML='<span class="lael-preview-orb" aria-hidden="true"></span><span><b>ASK LAEL</b><small>SBM ASSISTANT</small></span>';
    document.body.appendChild(preview);
    document.body.classList.add('lael-preview-ready');
    let loading=false,attempt=0;
    const open=()=>{
      const launcher=document.querySelector('.lael-launcher');
      if(launcher){document.dispatchEvent(new Event('sbm:open-lael'));return}
      if(loading)return;
      loading=true;
      const turn=++attempt;
      preview.disabled=true;
      preview.setAttribute('aria-busy','true');
      preview.querySelector('b').textContent='OPENING…';
      const stylesheet=document.createElement('link');
      let script,deadline;
      const recover=()=>{
        if(turn!==attempt)return;
        clearTimeout(deadline);
        loading=false;
        preview.disabled=false;
        preview.removeAttribute('aria-busy');
        preview.querySelector('b').textContent='TRY LAEL AGAIN';
        preview.querySelector('small').textContent='COULD NOT LOAD';
        stylesheet.remove();
        script?.remove();
      };
      deadline=setTimeout(recover,12000);
      stylesheet.rel='stylesheet';
      stylesheet.href=assetUrl('lael.min.css');
      stylesheet.addEventListener('load',()=>{
        if(!loading||turn!==attempt)return;
        script=document.createElement('script');
        script.src=assetUrl('lael.min.js');
        script.async=true;
        script.addEventListener('load',()=>{
          if(turn!==attempt)return;
          clearTimeout(deadline);
          if(!document.querySelector('.lael-launcher')){recover();return}
          preview.remove();
          document.body.classList.remove('lael-preview-ready');
          document.dispatchEvent(new Event('sbm:open-lael'));
        },{once:true});
        script.addEventListener('error',()=>{script.remove();recover()},{once:true});
        document.body.appendChild(script);
      },{once:true});
      stylesheet.addEventListener('error',recover,{once:true});
      document.head.appendChild(stylesheet);
    };
    preview.addEventListener('click',open);
    document.addEventListener('click',event=>{
      if(event.target.closest('[data-open-lael]'))open();
    });
  }
  function scheduleLauncher(){
    if('requestIdleCallback'in window)requestIdleCallback(addLaelLauncher,{timeout:1200});
    else setTimeout(addLaelLauncher,300);
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',scheduleLauncher,{once:true}):scheduleLauncher();
})();
