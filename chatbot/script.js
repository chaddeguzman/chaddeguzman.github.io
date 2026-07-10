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
  const dragThreshold = 6;
  const viewportMargin = 8;
  const botReplyDelayMs = 2000;
  const promptLimit = 10;
  const promptCooldownMs = 3 * 60 * 1000;
  const promptGateStorageKey = 'chadbot-prompt-gate';
  const replyChunkMinWords = 8;
  const replyChunkMaxWords = 28;
  const usageNoticeMessage = [
    'Quick note: you can ask up to 10 questions for now.',
    'After that, please wait 3 minutes to refresh the token limit',
    'and keep answers accurate.'
  ].join(' ');
  const clearChatMessage = 'Chat cleared. What would you like to talk about?';
  let dragState = null;
  let dragFrameId = 0;
  let ignoreClicksUntil = 0;
  let hasShownUsageNotice = false;
  let promptGateFallback = {
    count: 0,
    cooldownUntil: 0
  };

  launcher.addEventListener('click', event => {
    if (performance.now() < ignoreClicksUntil) {
      event.preventDefault();
      return;
    }
    togglePanel();
  });
  launcher.addEventListener('pointerdown', event => startDrag(event, 'launcher'));
  launcher.addEventListener('pointermove', moveDrag);
  launcher.addEventListener('pointerup', finishDrag);
  launcher.addEventListener('pointercancel', finishDrag);
  panel.addEventListener('pointerdown', event => {
    if (event.target.closest('input, textarea, select, button, a, [contenteditable="true"]')) return;
    startDrag(event, 'panel');
  });
  panel.addEventListener('pointermove', moveDrag);
  panel.addEventListener('pointerup', finishDrag);
  panel.addEventListener('pointercancel', finishDrag);
  closePanelBtn.addEventListener('click', closePanel);
  chatForm.addEventListener('submit', event => {
    event.preventDefault();
    sendMessage();
  });

  clearBtn.addEventListener('click', clearChat);
  window.addEventListener('resize', handleViewportResize);

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
    positionPanel();

    if (!hasShownUsageNotice) {
      appendMessage('bot', usageNoticeMessage);
      hasShownUsageNotice = true;
    }

    chatInput.focus();
  }

  function closePanel() {
    root.classList.remove('chadbot-open');
    launcher.setAttribute('aria-expanded', 'false');
    panel.setAttribute('hidden', '');
    launcher.focus();
  }

  function startDrag(event, source) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const rootRect = root.getBoundingClientRect();
    const panelRect = source === 'panel' ? panel.getBoundingClientRect() : null;
    const dragRects = panelRect ? [rootRect, panelRect] : [rootRect];
    dragState = {
      source,
      captureTarget: event.currentTarget,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: rootRect.left,
      startTop: rootRect.top,
      nextLeft: rootRect.left,
      nextTop: rootRect.top,
      startPanelLeft: panelRect?.left,
      startPanelTop: panelRect?.top,
      nextPanelLeft: panelRect?.left,
      nextPanelTop: panelRect?.top,
      minDeltaX: Math.max(...dragRects.map(rect => viewportMargin - rect.left)),
      maxDeltaX: Math.min(...dragRects.map(rect => window.innerWidth - viewportMargin - rect.right)),
      minDeltaY: Math.max(...dragRects.map(rect => viewportMargin - rect.top)),
      maxDeltaY: Math.min(...dragRects.map(rect => window.innerHeight - viewportMargin - rect.bottom)),
      moved: false
    };

    dragState.captureTarget.setPointerCapture(event.pointerId);
    root.classList.add('chadbot-dragging');
  }

  function moveDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;

    const rawDeltaX = event.clientX - dragState.startX;
    const rawDeltaY = event.clientY - dragState.startY;

    if (!dragState.moved && Math.hypot(rawDeltaX, rawDeltaY) < dragThreshold) return;

    dragState.moved = true;
    event.preventDefault();

    const deltaX = clamp(rawDeltaX, dragState.minDeltaX, dragState.maxDeltaX);
    const deltaY = clamp(rawDeltaY, dragState.minDeltaY, dragState.maxDeltaY);
    dragState.nextLeft = dragState.startLeft + deltaX;
    dragState.nextTop = dragState.startTop + deltaY;

    if (dragState.source === 'panel') {
      dragState.nextPanelLeft = dragState.startPanelLeft + deltaX;
      dragState.nextPanelTop = dragState.startPanelTop + deltaY;
    }

    if (!dragFrameId) {
      dragFrameId = window.requestAnimationFrame(renderDragFrame);
    }
  }

  function finishDrag(event) {
    if (!dragState || event.pointerId !== dragState.pointerId) return;

    const wasMoved = dragState.moved;
    const captureTarget = dragState.captureTarget;

    if (dragFrameId) {
      window.cancelAnimationFrame(dragFrameId);
      dragFrameId = 0;
    }

    if (wasMoved) applyDragPosition(dragState);

    dragState = null;
    root.classList.remove('chadbot-dragging');

    if (captureTarget.hasPointerCapture(event.pointerId)) {
      captureTarget.releasePointerCapture(event.pointerId);
    }

    if (wasMoved) {
      ignoreClicksUntil = performance.now() + 500;
    }
  }

  function renderDragFrame() {
    dragFrameId = 0;
    if (!dragState?.moved) return;
    applyDragPosition(dragState);
  }

  function applyDragPosition(state) {
    root.style.left = `${state.nextLeft}px`;
    root.style.top = `${state.nextTop}px`;
    root.style.right = 'auto';
    root.style.bottom = 'auto';

    if (state.source === 'panel') {
      panel.style.left = `${state.nextPanelLeft}px`;
      panel.style.top = `${state.nextPanelTop}px`;
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
    } else if (!panel.hidden) {
      positionPanel();
    }
  }

  function positionPanel() {
    const launcherRect = launcher.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const gap = 12;
    const spaceAbove = launcherRect.top - viewportMargin;
    const spaceBelow = window.innerHeight - launcherRect.bottom - viewportMargin;
    const openAbove = spaceAbove >= panelRect.height + gap || spaceAbove > spaceBelow;
    const preferredTop = openAbove
      ? launcherRect.top - panelRect.height - gap
      : launcherRect.bottom + gap;
    const preferredLeft = launcherRect.left + launcherRect.width / 2 > window.innerWidth / 2
      ? launcherRect.right - panelRect.width
      : launcherRect.left;
    const maxLeft = Math.max(viewportMargin, window.innerWidth - panelRect.width - viewportMargin);
    const maxTop = Math.max(viewportMargin, window.innerHeight - panelRect.height - viewportMargin);

    panel.style.left = `${clamp(preferredLeft, viewportMargin, maxLeft)}px`;
    panel.style.top = `${clamp(preferredTop, viewportMargin, maxTop)}px`;
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
  }

  function handleViewportResize() {
    const rect = root.getBoundingClientRect();

    if (root.style.left) {
      const maxLeft = Math.max(viewportMargin, window.innerWidth - root.offsetWidth - viewportMargin);
      const maxTop = Math.max(viewportMargin, window.innerHeight - root.offsetHeight - viewportMargin);
      root.style.left = `${clamp(rect.left, viewportMargin, maxLeft)}px`;
      root.style.top = `${clamp(rect.top, viewportMargin, maxTop)}px`;
    }

    if (!panel.hidden) positionPanel();
  }

  function clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum);
  }

  function appendMessage(role, text) {
    const message = document.createElement('div');
    message.className = `chadbot-message chadbot-message--${role}`;
    message.textContent = text;
    chatBox.appendChild(message);
    chatBox.scrollTop = chatBox.scrollHeight;
    return message;
  }

  function appendTypingStatus() {
    const typing = document.createElement('div');
    typing.className = 'chadbot-message chadbot-message--bot chadbot-typing-status';
    typing.setAttribute('aria-live', 'polite');
    typing.innerHTML = `
      <span class="chadbot-typing-status__text">ChadBot is typing</span>
      <span class="chadbot-typing-status__dots" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </span>
    `;
    chatBox.appendChild(typing);
    chatBox.scrollTop = chatBox.scrollHeight;
    return typing;
  }

  function splitReplyIntoChunks(reply) {
    const text = String(reply || '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!text) return [];

    const urls = [];
    const protectedText = text.replace(/https?:\/\/[^\s<>"')]+/g, url => {
      const token = `__CHADBOT_URL_${urls.length}__`;
      urls.push(url);
      return token;
    });

    const sentences = protectedText.match(/[^.!?]+(?:[.!?]+|$)/g) || [protectedText];
    const chunks = [];
    let current = '';

    sentences
      .map(sentence => sentence.trim())
      .filter(Boolean)
      .forEach(sentence => {
        const restoredSentence = restoreProtectedUrls(sentence, urls);
        const candidate = current ? `${current} ${restoredSentence}` : restoredSentence;
        const currentWords = countWords(current);
        const candidateWords = countWords(candidate);

        if (!current || candidateWords <= replyChunkMaxWords || currentWords < replyChunkMinWords) {
          current = candidate;
          return;
        }

        chunks.push(current);
        current = restoredSentence;
      });

    if (current) chunks.push(current);

    return chunks;
  }

  function restoreProtectedUrls(text, urls) {
    return urls.reduce((result, url, index) => (
      result.replace(new RegExp(`__CHADBOT_URL_${index}__`, 'g'), url)
    ), text);
  }

  function countWords(text) {
    return String(text || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
  }

  async function appendBotReply(reply, firstTypingBubble) {
    const chunks = splitReplyIntoChunks(reply);

    for (let index = 0; index < chunks.length; index += 1) {
      let typing = firstTypingBubble;

      if (!typing) {
        typing = appendTypingStatus();
        await sleep(botReplyDelayMs);
      }

      typing.className = 'chadbot-message chadbot-message--bot';
      typing.removeAttribute('aria-live');
      typing.textContent = chunks[index];

      if (index < chunks.length - 1) {
        firstTypingBubble = null;
      }
    }
  }

  function sleep(duration) {
    return new Promise(resolve => window.setTimeout(resolve, duration));
  }

  async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    const gate = getPromptGate();
    const cooldownRemainingMs = gate.cooldownUntil - Date.now();

    if (cooldownRemainingMs > 0) {
      appendMessage('bot', buildCooldownMessage(cooldownRemainingMs));
      return;
    }

    const updatedGate = {
      count: gate.count + 1,
      cooldownUntil: gate.cooldownUntil
    };

    if (updatedGate.count >= promptLimit) {
      updatedGate.count = 0;
      updatedGate.cooldownUntil = Date.now() + promptCooldownMs;
    }

    savePromptGate(updatedGate);

    chatInput.value = '';
    appendMessage('user', message);

    const typing = appendTypingStatus();
    sendBtn.disabled = true;
    chatInput.disabled = true;
    const startedAt = performance.now();

    try {
      const reply = await chat.sendMessage(message);
      const elapsed = performance.now() - startedAt;

      if (elapsed < botReplyDelayMs) {
        await sleep(botReplyDelayMs - elapsed);
      }

      await appendBotReply(reply, typing);
    } catch (error) {
      const elapsed = performance.now() - startedAt;

      if (elapsed < botReplyDelayMs) {
        await sleep(botReplyDelayMs - elapsed);
      }

      typing.className = 'chadbot-message chadbot-message--error';
      typing.textContent = error.message || 'Something went wrong. Please try again.';
    }

    sendBtn.disabled = false;
    chatInput.disabled = false;
    chatInput.focus();
  }

  function getPromptGate() {
    try {
      const gate = JSON.parse(localStorage.getItem(promptGateStorageKey) || '{}');
      const cooldownUntil = Number(gate.cooldownUntil) || 0;

      if (cooldownUntil > Date.now()) {
        return {
          count: Number(gate.count) || 0,
          cooldownUntil
        };
      }

      return {
        count: Number(gate.count) || 0,
        cooldownUntil: 0
      };
    } catch (error) {
      return promptGateFallback;
    }
  }

  function savePromptGate(gate) {
    promptGateFallback = gate;

    try {
      localStorage.setItem(promptGateStorageKey, JSON.stringify(gate));
    } catch (error) {
      // localStorage can be unavailable in private or restricted browsing contexts.
    }
  }

  function formatCooldown(milliseconds) {
    const totalSeconds = Math.max(1, Math.ceil(milliseconds / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (!minutes) return `${seconds} second${seconds === 1 ? '' : 's'}`;
    if (!seconds) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
    return `${minutes} minute${minutes === 1 ? '' : 's'} and ${seconds} second${seconds === 1 ? '' : 's'}`;
  }

  function buildCooldownMessage(milliseconds) {
    return [
      `Kindly wait ${formatCooldown(milliseconds)} before asking more questions.`,
      'This keeps ChadBot\'s answers focused and accurate.'
    ].join(' ');
  }

  function clearChat() {
    chat.history.length = 0;
    chatBox.innerHTML = '';
    appendMessage('bot', clearChatMessage);
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
