(function () {
  const root = document.getElementById('chadbotRoot');
  if (!root || !window.GeminiApi) return;

  const launcher = document.getElementById('chadbotLauncher');
  const panel = document.getElementById('chadbotPanel');
  const closePanelBtn = document.getElementById('chadbotClosePanelBtn');
  const chatBox = document.getElementById('chadbotChatBox');
  const chatForm = document.getElementById('chadbotChatForm');
  const chatInput = document.getElementById('chadbotChatInput');
  const sendBtn = document.getElementById('chadbotSendBtn');
  const clearBtn = document.getElementById('chadbotClearBtn');

  const portfolioContext = collectPortfolioContext();
  const chat = GeminiApi.createGeminiChat({ portfolioContext });

  launcher.addEventListener('click', togglePanel);
  closePanelBtn.addEventListener('click', closePanel);
  chatForm.addEventListener('submit', event => {
    event.preventDefault();
    sendMessage();
  });

  clearBtn.addEventListener('click', clearChat);

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (root.classList.contains('chadbot-open')) closePanel();
  });

  function togglePanel() {
    if (root.classList.contains('chadbot-open')) {
      closePanel();
    } else {
      openPanel();
    }
  }

  function openPanel() {
    root.classList.add('chadbot-open');
    launcher.setAttribute('aria-expanded', 'true');
    panel.removeAttribute('hidden');
    chatInput.focus();
  }

  function closePanel() {
    root.classList.remove('chadbot-open');
    launcher.setAttribute('aria-expanded', 'false');
    panel.setAttribute('hidden', '');
    launcher.focus();
  }

  function appendMessage(role, text) {
    const message = document.createElement('div');
    message.className = `chadbot-message chadbot-message--${role}`;
    message.textContent = text;
    chatBox.appendChild(message);
    chatBox.scrollTop = chatBox.scrollHeight;
    return message;
  }

  async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    chatInput.value = '';
    appendMessage('user', message);

    const typing = appendMessage('bot', 'Thinking...');
    sendBtn.disabled = true;
    chatInput.disabled = true;

    try {
      const reply = await chat.sendMessage(message);
      typing.textContent = reply;
    } catch (error) {
      typing.className = 'chadbot-message chadbot-message--error';
      typing.textContent = error.message || 'Something went wrong. Please try again.';
    }

    sendBtn.disabled = false;
    chatInput.disabled = false;
    chatInput.focus();
  }

  function clearChat() {
    chat.history.length = 0;
    chatBox.innerHTML = '<div class="chadbot-message chadbot-message--bot">Chat cleared. What would you like to talk about?</div>';
    chatInput.focus();
  }

  function collectPortfolioContext() {
    const sections = [
      ['Profile', ['#about', '#about-detail']],
      ['Skills', ['#skills']],
      ['Professional Timeline', ['#experience']],
      ['Featured Projects', ['#projects']],
      ['Just for Fun Projects', ['#j4f']],
      ['Contact', ['#contact']]
    ];

    return sections
      .map(([label, selectors]) => {
        const elements = selectors
          .map(selector => document.querySelector(selector))
          .filter(Boolean);
        const text = elements
          .map(getElementText)
          .filter(Boolean)
          .join('\n');
        const links = elements
          .flatMap(element => Array.from(element.querySelectorAll('a[href]')))
          .map(link => ({ label: normalizeText(link.innerText), href: link.href }))
          .filter(link => link.href && !link.href.endsWith('#'))
          .map(link => `${link.label || 'Link'}: ${link.href}`);

        return [`## ${label}`, text, ...new Set(links)].filter(Boolean).join('\n');
      })
      .join('\n\n');
  }

  function getElementText(element) {
    const clone = element.cloneNode(true);

    clone.querySelectorAll('[data-target]').forEach(counter => {
      counter.textContent = counter.dataset.target;
    });

    return normalizeText(clone.textContent);
  }

  function normalizeText(text) {
    return String(text || '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n+/g, '\n')
      .trim();
  }
})();
