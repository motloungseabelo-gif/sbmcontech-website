/* LAEL: SBM's lightweight site assistant. No microphone or audio starts automatically. */
(() => {
  'use strict';

  if (document.querySelector('.lael-root')) return;

  const root = document.createElement('div');
  root.className = 'lael-root';
  root.innerHTML = `
    <button class="lael-launcher" type="button" aria-label="Open LAEL assistant" aria-controls="laelPanel" aria-expanded="false">
      <span class="lael-orb" aria-hidden="true"><i></i></span><span class="lael-launcher-label"><b>ASK LAEL</b><small>SBM ASSISTANT</small></span>
    </button>
    <section class="lael-panel" id="laelPanel" role="dialog" aria-label="LAEL, SBM ConTech assistant" hidden>
      <header class="lael-header">
        <span class="lael-orb lael-orb-small" aria-hidden="true"><i></i></span>
        <span class="lael-identity"><strong>LAEL <span>/ SBM</span></strong><small id="laelStatus">YOUR SITE GUIDE</small></span>
        <button class="lael-icon-button lael-close" type="button" aria-label="Close LAEL">×</button>
      </header>
      <div class="lael-conversation" id="laelConversation" role="log" aria-label="Chat messages" aria-live="polite" aria-relevant="additions"></div>
      <div class="lael-suggestions" aria-label="Suggested questions">
        <button type="button" data-question="What can SBM build?">What can SBM build?</button>
        <button type="button" data-question="How do I start a project?">Start a project</button>
        <button type="button" data-question="Do you build AI assistants?">AI assistants</button>
      </div>
      <div class="lael-controls">
        <button class="lael-voice-toggle" type="button" aria-pressed="false" title="Turn spoken replies on or off">♫ <span>Voice off</span></button>
        <label class="lael-select-label">Style <select class="lael-style" aria-label="Speaking style"><option value="classic">Classic</option><option value="warm">Warm</option><option value="bright">Bright</option></select></label>
        <label class="lael-select-label">Voice <select class="lael-voice" aria-label="Device voice"><option value="">Automatic</option></select></label>
      </div>
      <form class="lael-form">
        <label class="lael-input-label" for="laelInput">Message LAEL</label>
        <textarea id="laelInput" rows="1" maxlength="1000" placeholder="Ask me about SBM…"></textarea>
        <button class="lael-icon-button lael-mic" type="button" aria-label="Speak to LAEL" title="Speak to LAEL"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"></rect><path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8"></path></svg></button>
        <button class="lael-send" type="submit" aria-label="Send message" title="Send message">↗</button>
      </form>
      <p class="lael-note" id="laelNote" role="status">Voice is optional. Please avoid sharing sensitive information.</p>
    </section>`;
  document.body.append(root);
  document.body.classList.add('lael-present');

  const el = selector => root.querySelector(selector);
  const panel = el('.lael-panel');
  const launcher = el('.lael-launcher');
  const input = el('#laelInput');
  const log = el('#laelConversation');
  const note = el('#laelNote');
  const mic = el('.lael-mic');
  const voiceToggle = el('.lael-voice-toggle');
  const voiceSelect = el('.lael-voice');
  const speech = window.speechSynthesis;
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const history = [];
  let endpoint = '';
  let busy = false;
  let voiceOn = false;
  let listening = false;
  let recognition;
  let voices = [];
  let pendingRequest;
  let activeSpeech;
  let requestVersion = 0;
  let pageActive = true;

  const pageNames = {
    index: 'Home page', services: 'Services page', about: 'About page', contact: 'Contact page',
    work: 'Work page', industries: 'Industries page', insights: 'Insights page', app: 'SBM Labs',
    vision: 'Vision page', 'privacy-policy': 'Privacy policy', terms: 'Terms page'
  };
  const contactEnquiry = question => /\b(contact|email|phone|whatsapp|reach|talk to|call)\b/i.test(question);

  function decodeEntities(value) {
    const decoder = document.createElement('textarea');
    for (let pass = 0; pass < 3; pass++) {
      decoder.innerHTML = value;
      if (decoder.value === value) break;
      value = decoder.value;
    }
    return value;
  }

  function safeLink(href, label = '') {
    href = decodeEntities(href).trim();
    if (!href || /[\u0000-\u0020\u007f\\]/.test(href)) return null;
    let url;
    try { url = new URL(href, window.location.href); } catch { return null; }
    if (!['https:', 'http:', 'mailto:', 'tel:'].includes(url.protocol) || url.username || url.password) return null;
    const internal = url.origin === location.origin || url.hostname.replace(/^www\./, '') === 'sbmcontech.co.za';
    let page;
    if (internal && ['https:', 'http:'].includes(url.protocol)) {
      let path = url.pathname;
      try { path = decodeURIComponent(path); } catch { /* Keep malformed escapes as an unknown route. */ }
      path = path.replace(/\/+$/, '') || '/index.html';
      const base = location.pathname.slice(0, location.pathname.lastIndexOf('/') + 1);
      const name = path.replace(/\.html$/i, '').split('/').at(-1);
      if (path === `/${name}` || path === `/${name}.html` || path === `${base}${name}.html`) page = name;
    }
    label = decodeEntities(label).replace(/<[^>]*>|[*_`[\]]/g, '').trim();
    if (pageNames[page]) label = pageNames[page];
    else if (!label || /(?:https?:|www\.|\.html\b|\/)/i.test(label)) {
      label = url.protocol === 'mailto:' ? 'Email link' : url.protocol === 'tel:' ? 'Phone link' : url.hostname === 'wa.me' ? 'WhatsApp' : `${url.hostname.replace(/^www\./, '')} website`;
    }
    const spoken = pageNames[page] ? label.toLowerCase() : /(?:website$|https?:|www\.|\S+@\S+|\b[\w-]+\.[a-z]{2,}\b)/i.test(label) ? 'the linked website' : label;
    return { href, label, page, spoken };
  }

  // All assistant sources share this parser. Untrusted HTML stays in an inert
  // template; the live conversation only receives text nodes and safe anchors.
  function normalizeReply(message, action, options = {}) {
    const parts = [];
    const text = value => { if (value) parts.push({ text: value }); };
    const link = (href, label) => {
      const safe = safeLink(href, label);
      if (safe) parts.push(safe);
      else text(label?.replace(/<[^>]*>/g, '') || 'Link unavailable');
    };
    function inline(value) {
      const pattern = /\[[^\]\n]+\]\(\s*(?:<[^>\n]+>|(?:[^()\n]|\([^()\n]*\))+)\s*\)|(?:https?:\/\/|www\.|mailto:|tel:)[^\s<>"[\]`]+|(?:\.{0,2}\/)?(?:[\w-]+\/)*[\w-]+\.html\/?(?:[?#][^\s<>"[\]`]+)?|(?<![\w:])(?:\.{1,2}\/|\/)[^\s<>"[\]`]+/gi;
      let end = 0;
      for (const match of value.matchAll(pattern)) {
        text(value.slice(end, match.index));
        const markdown = match[0].match(/^\[([^\]]+)\]\(\s*([\s\S]+?)\s*\)$/);
        if (markdown) {
          const href = markdown[2].replace(/\s+["'][^"']*["']$/, '').replace(/^<|>$/g, '');
          link(href, markdown[1]);
        } else {
          let href = match[0].replace(/[.,;!]+$/, '');
          while (href.endsWith(')') && (href.match(/\)/g)?.length || 0) > (href.match(/\(/g)?.length || 0)) href = href.slice(0, -1);
          link(/^www\./i.test(href) ? `https://${href}` : href);
          text(match[0].slice(href.length));
        }
        end = match.index + match[0].length;
      }
      text(value.slice(end));
    }
    const template = document.createElement('template');
    template.innerHTML = decodeEntities(message).replace(/<((?:https?:\/\/|mailto:|tel:)[^<>]+)>/gi, '$1');
    function visit(node) {
      if (node.nodeType === Node.TEXT_NODE) { inline(node.textContent); return; }
      if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
      if (/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|SVG|MATH|TEMPLATE|NOSCRIPT)$/.test(node.nodeName)) return;
      if (node.nodeName === 'A') { link(node.getAttribute('href') || '', node.textContent); return; }
      if (node.nodeName === 'BR') text('\n');
      for (const child of node.childNodes) visit(child);
      if (/^(P|DIV|LI|H[1-6])$/.test(node.nodeName)) text('\n');
    }
    visit(template.content);
    if (action) {
      const safe = safeLink(action.href, action.label);
      if (safe && !parts.some(part => part.href === safe.href || (safe.page && part.page === safe.page))) {
        text('\n'); parts.push(safe);
      }
    }
    let spoken = parts.map(part => part.href ? part.spoken : part.text).join(' ')
      .replace(/(?:https?:|www\.)\S*/gi, '')
      .replace(/<[^>]*>|[()[\]<>*_`{}#]/g, '')
      .replace(/\//g, ' or ').replace(/&/g, ' and ').replace(/\s+/g, ' ').replace(/\s+([.,!?;:])/g, '$1').trim();
    if (options.contactEnquiry && parts.some(part => part.page === 'contact')) spoken = 'You can reach us through our contact page.';
    if (options.unavailable) spoken = `The AI connection is unavailable right now. ${spoken.replace(/^The AI connection is unavailable right now\.\s*/i, '')}`;
    return { parts, spoken };
  }

  function setNote(message) { note.textContent = message; }

  function addMessage(who, message, action, options) {
    const row = document.createElement('div');
    row.className = `lael-message lael-message-${who}`;
    const label = document.createElement('span');
    label.className = 'lael-message-label';
    label.textContent = who === 'assistant' ? 'LAEL' : 'YOU';
    const body = document.createElement('p');
    const normalized = who === 'assistant' ? normalizeReply(message, action, options) : null;
    if (normalized) {
      for (const part of normalized.parts) {
        if (!part.href) body.append(document.createTextNode(part.text));
        else {
          const anchor = document.createElement('a');
          anchor.setAttribute('href', part.href);
          anchor.textContent = part.label;
          body.append(anchor);
        }
      }
    } else body.textContent = message;
    row.append(label, body);
    log.append(row);
    log.scrollTop = log.scrollHeight;
    return normalized;
  }

  addMessage('assistant', 'Hello, I’m LAEL. Ask me about SBM’s services, explore a solution, or tell me what you want to build. You can type or use the microphone.');

  function cancelSpeech() {
    activeSpeech = null;
    if (speech) speech.cancel();
  }

  function stopListening() {
    const current = recognition;
    recognition = null;
    listening = false;
    mic.classList.remove('lael-listening');
    if (Recognition) mic.setAttribute('aria-label', 'Speak to LAEL');
    if (current) { try { current.abort(); } catch { /* Already stopped. */ } }
  }

  function updateViewport() {
    const viewport = window.visualViewport;
    const height = viewport?.height || innerHeight;
    root.style.setProperty('--lael-viewport-height', `${height}px`);
    root.style.setProperty('--lael-viewport-bottom', `${Math.max(0, innerHeight - height - (viewport?.offsetTop || 0))}px`);
    root.classList.toggle('lael-compact', height < 550);
    root.classList.toggle('lael-tight', height < 400);
  }
  updateViewport();
  window.addEventListener('resize', updateViewport);
  window.visualViewport?.addEventListener('resize', updateViewport);
  window.visualViewport?.addEventListener('scroll', updateViewport);

  function togglePanel(open) {
    panel.hidden = !open;
    launcher.setAttribute('aria-expanded', String(open));
    launcher.setAttribute('aria-label', open ? 'Close LAEL assistant' : 'Open LAEL assistant');
    if (open) { updateViewport(); input.focus({ preventScroll: true }); log.scrollTop = log.scrollHeight; }
    else {
      stopListening();
      cancelSpeech();
      launcher.focus({ preventScroll: true });
    }
  }

  launcher.addEventListener('click', () => togglePanel(panel.hidden));
  el('.lael-close').addEventListener('click', () => togglePanel(false));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) togglePanel(false);
  });
  window.addEventListener('pagehide', () => {
    pageActive = false;
    requestVersion++;
    pendingRequest?.abort();
    if (busy) {
      const message = 'That request was cancelled when you left the page. Please send your question again.';
      addMessage('assistant', message);
      history.push({ role: 'assistant', content: message });
      if (history.length > 8) history.splice(0, history.length - 8);
      setBusy(false);
    }
    cancelSpeech();
    stopListening();
  });
  window.addEventListener('pageshow', () => { pageActive = true; updateViewport(); });

  function refreshVoices() {
    if (!speech) return;
    const previous = voiceSelect.value;
    voices = speech.getVoices().filter(voice => /^en(?:-|$)/i.test(voice.lang));
    voiceSelect.replaceChildren(new Option('Automatic', ''));
    voices.forEach((voice, index) => {
      voiceSelect.add(new Option(`${voice.name} · ${voice.lang}`, String(index)));
    });
    if ([...voiceSelect.options].some(option => option.value === previous)) voiceSelect.value = previous;
  }

  if (speech && typeof window.SpeechSynthesisUtterance === 'function') {
    refreshVoices();
    speech.addEventListener('voiceschanged', refreshVoices);
  } else {
    voiceToggle.disabled = true;
    voiceSelect.disabled = true;
    setNote('Speech playback is unavailable in this browser. Text chat still works.');
  }

  voiceToggle.addEventListener('click', () => {
    voiceOn = !voiceOn;
    voiceToggle.setAttribute('aria-pressed', String(voiceOn));
    voiceToggle.querySelector('span').textContent = voiceOn ? 'Voice on' : 'Voice off';
    if (!voiceOn) cancelSpeech();
    setNote(voiceOn ? 'Spoken replies are on. Choose a style and a device voice.' : 'Voice is off. Please avoid sharing sensitive information.');
  });

  function speak(message) {
    if (!voiceOn || panel.hidden || !speech || !window.SpeechSynthesisUtterance) return;
    cancelSpeech();
    const utterance = new SpeechSynthesisUtterance(message);
    const selected = voices[Number(voiceSelect.value)];
    if (voiceSelect.value !== '' && selected) utterance.voice = selected;
    utterance.lang = selected?.lang || 'en-ZA';
    const styles = {
      classic: { rate: 0.97, pitch: 0.90 },
      warm: { rate: 0.93, pitch: 1.03 },
      bright: { rate: 1.08, pitch: 1.13 }
    };
    Object.assign(utterance, styles[el('.lael-style').value]);
    activeSpeech = utterance;
    utterance.onend = () => { if (activeSpeech === utterance) activeSpeech = null; };
    utterance.onerror = () => {
      if (activeSpeech !== utterance) return;
      activeSpeech = null;
      setNote('Speech playback could not start. You can read the reply or try another device voice.');
    };
    try { speech.speak(utterance); } catch { utterance.onerror(); }
  }

  function answerFromSite(question) {
    const text = question.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    const action = (label, href) => ({ label, href });
    if (/\b(open|show|go to|take me to)\b/.test(text) && /\b(work|projects|portfolio)\b/.test(text))
      return { text: 'Here are some systems and demonstrations from SBM.', action: action('Explore work', 'work.html') };
    if (/\b(open|show|go to|take me to)\b/.test(text) && /\b(solutions|services)\b/.test(text))
      return { text: 'Here is an overview of our solutions.', action: action('View solutions', 'services.html') };
    if (/\b(who are you|what is lael|are you lael)\b/.test(text))
      return { text: 'I’m LAEL, SBM’s website assistant. I can explain the company’s services and help you find the right project or contact page.' };
    if (/\b(price|pricing|cost|quote|budget|how much|fee)\b/.test(text))
      return { text: 'Every project has a different scope, so I cannot give a reliable price here. Share your goals through the project form and the team can discuss a quote with you.', action: action('Start a project', 'contact.html') };
    if (/\b(job|career|internship|learnership|vacanc|hiring)\b/.test(text))
      return { text: 'I do not have a live list of vacancies. For an employment enquiry, email the team directly.', action: action('Email SBM', 'mailto:sbmcontechindustries@gmail.com') };
    if (/\b(contact|email|phone|whatsapp|reach|talk to|call)\b/.test(text))
      return { text: 'You can reach us through our contact page. It includes the project scoping form, sbmcontechindustries@gmail.com and +27 64 026 2150.', action: action('Contact page', 'contact.html') };
    if (/\b(start|begin|brief|project|consult|process)\b/.test(text))
      return { text: 'Tell us the problem, the people affected, and what success would look like. The project scoping form turns that into an initial brief for the SBM team.', action: action('Start a project', 'contact.html') };
    if (/\b(ai|automation|automate|assistant|chatbot|agent|workflow)\b/.test(text))
      return { text: 'Yes. SBM designs AI assistants, knowledge experiences, workflow automation, lead qualification, and integrations with messaging or CRM systems. A discovery call helps define the right approach.', action: action('Explore AI + automation', 'services.html#automation') };
    if (/\b(smart|iot|sensor|security|access|energy|property|infrastructure)\b/.test(text))
      return { text: 'Our connected infrastructure work covers smart property control, access and security concepts, sensor integrations, and energy visibility.', action: action('Explore infrastructure', 'services.html#infrastructure') };
    if (/\b(software|website|web|mobile|app|platform|dashboard|database|api|cloud|build|services?|solutions?|sbm|contech|company)\b/.test(text))
      return { text: 'SBM builds custom web applications, mobile-ready portals, dashboards, APIs and cloud systems. We also offer AI automation and connected infrastructure.', action: action('View solutions', 'services.html') };
    if (/\b(hello|hi|hey|lael)\b/.test(text))
      return { text: 'Hello. I’m LAEL, SBM’s digital assistant. Ask me about our services or describe the project you have in mind.' };
    return { text: 'I can guide you through SBM’s services and project enquiries. For a specific answer, share your question with the team.', action: action('Contact SBM', 'contact.html') };
  }

  async function loadConfiguration() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    try {
      const response = await fetch('lael-config.json', { cache: 'no-cache', signal: controller.signal });
      if (!response.ok) throw new Error('Configuration unavailable');
      const { apiUrl } = await response.json();
      if (apiUrl === '' || apiUrl === undefined) return;
      if (typeof apiUrl !== 'string') throw new Error('Invalid configuration');
      const url = new URL(apiUrl, window.location.href);
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Invalid endpoint');
      endpoint = url.href;
      if (!busy) el('#laelStatus').textContent = 'AI CHAT CONFIGURED';
      setNote('Your chat text is sent to our AI provider when you ask a question. Do not share sensitive information.');
    } catch { setNote('The AI configuration could not be loaded. The site guide is available.'); }
    finally { clearTimeout(timer); }
  }
  const configuration = loadConfiguration();

  function setBusy(value) {
    busy = value;
    el('.lael-form').setAttribute('aria-busy', String(value));
    el('.lael-send').disabled = value;
    mic.disabled = value || !Recognition;
    el('.lael-suggestions').querySelectorAll('button').forEach(button => { button.disabled = value; });
    el('#laelStatus').textContent = value ? 'THINKING…' : endpoint ? 'AI CHAT CONFIGURED' : 'YOUR SITE GUIDE';
  }

  async function sendQuestion(question) {
    const message = question.trim().slice(0, 1000);
    if (!message || busy || !pageActive) return;
    const turn = ++requestVersion;
    input.value = '';
    cancelSpeech();
    stopListening();
    setBusy(true);
    addMessage('user', message);
    history.push({ role: 'user', content: message });
    let reply;
    try {
      await configuration;
      if (turn !== requestVersion || !pageActive) return;
      const navigation = /\b(open|show|go to|take me to)\b/i.test(message) ? answerFromSite(message) : null;
      if (navigation?.action && /^\b(open|show|go to|take me to)\b/i.test(message)) {
        reply = navigation;
      } else if (endpoint) {
        const controller = new AbortController();
        pendingRequest = controller;
        // The Worker has a 15-second upstream deadline; allow its error to arrive.
        const timer = setTimeout(() => controller.abort(), 18000);
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: history.slice(-7) }),
            signal: controller.signal
          });
          if (!response.ok) throw new Error('Assistant unavailable');
          const data = await response.json();
          if (typeof data?.reply !== 'string' || !data.reply.trim() || data.reply.length > 1400) throw new Error('Invalid reply');
          if (!normalizeReply(data.reply).parts.some(part => part.href || part.text.trim())) throw new Error('Empty display reply');
          const route = answerFromSite(message).action;
          reply = { text: data.reply.trim(), action: route };
        } finally { clearTimeout(timer); if (pendingRequest === controller) pendingRequest = null; }
      } else reply = answerFromSite(message);
    } catch {
      const siteAnswer = answerFromSite(message);
      reply = { ...siteAnswer, unavailable: true, text: `The AI connection is unavailable right now. ${siteAnswer.text}` };
    } finally {
      if (turn === requestVersion) setBusy(false);
    }
    if (turn !== requestVersion || !pageActive) return;
    const normalized = addMessage('assistant', reply.text, reply.action, { contactEnquiry: contactEnquiry(message), unavailable: reply.unavailable });
    const content = reply.action ? `${reply.text}\n${reply.action.label}: ${reply.action.href}` : reply.text;
    history.push({ role: 'assistant', content: content.slice(0, 1400) });
    if (history.length > 8) history.splice(0, history.length - 8);
    speak(normalized.spoken);
  }

  el('.lael-form').addEventListener('submit', event => {
    event.preventDefault();
    sendQuestion(input.value);
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      sendQuestion(input.value);
    }
  });
  el('.lael-suggestions').addEventListener('click', event => {
    const question = event.target.closest('[data-question]')?.dataset.question;
    if (question) sendQuestion(question);
  });

  if (!Recognition) {
    mic.disabled = true;
    mic.title = 'Microphone input is unavailable in this browser; type instead.';
    mic.setAttribute('aria-label', mic.title);
  } else {
    mic.addEventListener('click', () => {
      if (listening || recognition) { stopListening(); return; }
      cancelSpeech();
      const current = new Recognition();
      recognition = current;
      current.lang = 'en-ZA';
      current.continuous = false;
      current.interimResults = false;
      current.onstart = () => {
        if (recognition !== current || panel.hidden || !pageActive) { current.abort(); return; }
        listening = true;
        mic.classList.add('lael-listening');
        mic.setAttribute('aria-label', 'Stop listening');
        setNote('Listening… speak now. Microphone use depends on your browser.');
      };
      current.onresult = event => {
        if (recognition !== current || panel.hidden || !pageActive) return;
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) sendQuestion(transcript);
      };
      current.onerror = event => {
        if (recognition !== current) return;
        setNote(event.error === 'not-allowed' ? 'Microphone permission was denied. You can still type.' : 'I could not hear that clearly. Try again or type your question.');
      };
      current.onend = () => {
        if (recognition === current) stopListening();
      };
      try { current.start(); }
      catch { stopListening(); setNote('The microphone could not start. Please type your question.'); }
    });
  }
})();
