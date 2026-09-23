/* Lael: SBM's lightweight site assistant. No microphone or audio starts automatically. */
(() => {
  'use strict';

  if (document.querySelector('.lael-root')) return;

  const root = document.createElement('div');
  root.className = 'lael-root';
  root.innerHTML = `
    <button class="lael-launcher" type="button" aria-label="Open Lael assistant" aria-controls="laelPanel" aria-expanded="false">
      <span class="lael-orb" aria-hidden="true"><i></i></span><span class="lael-launcher-label"><b>ASK LAEL</b><small>SBM ASSISTANT</small></span>
    </button>
    <section class="lael-panel" id="laelPanel" role="dialog" aria-label="Lael, SBM ConTech assistant" hidden>
      <header class="lael-header">
        <span class="lael-orb lael-orb-small" aria-hidden="true"><i></i></span>
        <span class="lael-identity"><strong>LAEL <span>/ SBM</span></strong><small id="laelStatus">YOUR SITE GUIDE</small></span>
        <button class="lael-icon-button lael-close" type="button" aria-label="Close Lael">×</button>
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
        <label class="lael-input-label" for="laelInput">Message Lael</label>
        <textarea id="laelInput" rows="1" maxlength="1000" placeholder="Ask me about SBM…"></textarea>
        <button class="lael-icon-button lael-mic" type="button" aria-label="Speak to Lael" title="Speak to Lael"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"></rect><path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8"></path></svg></button>
        <button class="lael-send" type="submit" aria-label="Send message" title="Send message">↗</button>
      </form>
      <p class="lael-note" id="laelNote">Voice is optional. Please avoid sharing sensitive information.</p>
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

  function setNote(message) { note.textContent = message; }

  function addMessage(who, message, action) {
    const row = document.createElement('div');
    row.className = `lael-message lael-message-${who}`;
    const label = document.createElement('span');
    label.className = 'lael-message-label';
    label.textContent = who === 'assistant' ? 'LAEL' : 'YOU';
    const body = document.createElement('p');
    body.textContent = message;
    row.append(label, body);
    if (action) {
      const link = document.createElement('a');
      link.href = action.href;
      link.textContent = `${action.label} ↗`;
      row.append(link);
    }
    log.append(row);
    log.scrollTop = log.scrollHeight;
  }

  addMessage('assistant', 'Hello, I’m Lael. Ask me about SBM’s services, explore a solution, or tell me what you want to build. You can type or use the microphone.');

  function togglePanel(open) {
    panel.hidden = !open;
    launcher.setAttribute('aria-expanded', String(open));
    launcher.setAttribute('aria-label', open ? 'Close Lael assistant' : 'Open Lael assistant');
    if (open) input.focus();
    else {
      if (recognition && listening) recognition.stop();
      if (speech) speech.cancel();
      launcher.focus();
    }
  }

  launcher.addEventListener('click', () => togglePanel(panel.hidden));
  el('.lael-close').addEventListener('click', () => togglePanel(false));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) togglePanel(false);
  });
  window.addEventListener('pagehide', () => { if (speech) speech.cancel(); });

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
    if (!voiceOn && speech) speech.cancel();
    setNote(voiceOn ? 'Spoken replies are on. Choose a style and a device voice.' : 'Voice is off. Please avoid sharing sensitive information.');
  });

  function speak(message) {
    if (!voiceOn || panel.hidden || !speech || !window.SpeechSynthesisUtterance) return;
    speech.cancel();
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
    speech.speak(utterance);
  }

  function answerFromSite(question) {
    const text = question.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
    const action = (label, href) => ({ label, href });
    if (/\b(open|show|go to|take me to)\b/.test(text) && /\b(work|projects|portfolio)\b/.test(text))
      return { text: 'Here are some systems and demonstrations from SBM.', action: action('Explore work', 'work.html') };
    if (/\b(open|show|go to|take me to)\b/.test(text) && /\b(solutions|services)\b/.test(text))
      return { text: 'Here is an overview of our solutions.', action: action('View solutions', 'services.html') };
    if (/\b(who are you|what is lael|are you lael)\b/.test(text))
      return { text: 'I’m Lael, SBM’s website assistant. I can explain the company’s services and help you find the right project or contact page.' };
    if (/\b(price|pricing|cost|quote|budget|how much|fee)\b/.test(text))
      return { text: 'Every project has a different scope, so I cannot give a reliable price here. Share your goals through the project form and the team can discuss a quote with you.', action: action('Start a project', 'contact.html') };
    if (/\b(job|career|internship|learnership|vacanc|hiring)\b/.test(text))
      return { text: 'I do not have a live list of vacancies. For an employment enquiry, email the team directly.', action: action('Email SBM', 'mailto:sbmcontechindustries@gmail.com') };
    if (/\b(contact|email|phone|whatsapp|reach|talk to|call)\b/.test(text))
      return { text: 'You can contact SBM at sbmcontechindustries@gmail.com or +27 64 026 2150. The contact page also has a project scoping form.', action: action('Contact SBM', 'contact.html') };
    if (/\b(start|begin|brief|project|consult|process)\b/.test(text))
      return { text: 'Tell us the problem, the people affected, and what success would look like. The project scoping form turns that into an initial brief for the SBM team.', action: action('Start a project', 'contact.html') };
    if (/\b(ai|automation|automate|assistant|chatbot|agent|workflow)\b/.test(text))
      return { text: 'Yes. SBM designs AI assistants, knowledge experiences, workflow automation, lead qualification, and integrations with messaging or CRM systems. A discovery call helps define the right approach.', action: action('Explore AI + automation', 'services.html#automation') };
    if (/\b(smart|iot|sensor|security|access|energy|property|infrastructure)\b/.test(text))
      return { text: 'Our connected infrastructure work covers smart property control, access and security concepts, sensor integrations, and energy visibility.', action: action('Explore infrastructure', 'services.html#infrastructure') };
    if (/\b(software|website|web|mobile|app|platform|dashboard|database|api|cloud|build|service|solution|sbm|contech|company)\b/.test(text))
      return { text: 'SBM builds custom web applications, mobile-ready portals, dashboards, APIs and cloud systems. We also offer AI automation and connected infrastructure.', action: action('View solutions', 'services.html') };
    if (/\b(hello|hi|hey|lael)\b/.test(text))
      return { text: 'Hello. I’m Lael, SBM’s digital assistant. Ask me about our services or describe the project you have in mind.' };
    return { text: 'I can guide you through SBM’s services and project enquiries. For a specific answer, share your question with the team.', action: action('Contact SBM', 'contact.html') };
  }

  async function loadConfiguration() {
    try {
      const response = await fetch('lael-config.json', { cache: 'no-cache' });
      if (!response.ok) return;
      const { apiUrl } = await response.json();
      if (!apiUrl) return;
      const url = new URL(apiUrl, window.location.href);
      if (url.protocol !== 'https:') return;
      endpoint = url.href;
      el('#laelStatus').textContent = 'AI CHAT CONFIGURED';
      setNote('Your chat text is sent to our AI provider when you ask a question. Do not share sensitive information.');
    } catch { /* The site guide works without a backend. */ }
  }
  loadConfiguration();

  async function sendQuestion(question) {
    const message = question.trim().slice(0, 1000);
    if (!message || busy) return;
    input.value = '';
    busy = true;
    el('.lael-send').disabled = true;
    mic.disabled = true;
    addMessage('user', message);
    history.push({ role: 'user', content: message });
    el('#laelStatus').textContent = 'THINKING…';
    let reply;
    try {
      const navigation = /\b(open|show|go to|take me to)\b/i.test(message) ? answerFromSite(message) : null;
      if (navigation?.action && /^\b(open|show|go to|take me to)\b/i.test(message)) {
        reply = navigation;
      } else if (endpoint) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: history.slice(-7) }),
            signal: controller.signal
          });
          if (!response.ok) throw new Error('Assistant unavailable');
          const data = await response.json();
          if (typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('Empty reply');
          reply = { text: data.reply.trim().slice(0, 1400) };
        } finally { clearTimeout(timer); }
      } else reply = answerFromSite(message);
    } catch {
      const siteAnswer = answerFromSite(message);
      reply = { ...siteAnswer, text: `The AI connection is unavailable right now. ${siteAnswer.text}` };
    } finally {
      busy = false;
      el('.lael-send').disabled = false;
      mic.disabled = !Recognition;
      el('#laelStatus').textContent = endpoint ? 'AI CHAT CONFIGURED' : 'YOUR SITE GUIDE';
    }
    addMessage('assistant', reply.text, reply.action);
    history.push({ role: 'assistant', content: reply.text });
    if (history.length > 8) history.splice(0, history.length - 8);
    speak(reply.text);
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
      if (listening) { recognition.stop(); return; }
      if (speech) speech.cancel();
      recognition = new Recognition();
      recognition.lang = 'en-ZA';
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.onstart = () => {
        listening = true;
        mic.classList.add('lael-listening');
        mic.setAttribute('aria-label', 'Stop listening');
        setNote('Listening… speak now. Microphone use depends on your browser.');
      };
      recognition.onresult = event => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) sendQuestion(transcript);
      };
      recognition.onerror = event => {
        setNote(event.error === 'not-allowed' ? 'Microphone permission was denied. You can still type.' : 'I could not hear that clearly. Try again or type your question.');
      };
      recognition.onend = () => {
        listening = false;
        mic.classList.remove('lael-listening');
        mic.setAttribute('aria-label', 'Speak to Lael');
      };
      try { recognition.start(); }
      catch { setNote('The microphone could not start. Please type your question.'); }
    });
  }
})();
