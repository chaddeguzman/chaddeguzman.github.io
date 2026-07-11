(function () {
  // -------------------------------------------------------------------------
  // DOM References and Chat Setup
  // -------------------------------------------------------------------------
  const root = document.getElementById('chadbotRoot');
  if (!root || !window.GeminiApi) return;

  const launcher = document.getElementById('chadbotLauncher');
  const panel = document.getElementById('chadbotPanel');
  const panelHeader = panel.querySelector('.chadbot-header');
  const closePanelBtn = document.getElementById('chadbotClosePanelBtn');
  const chatBox = document.getElementById('chadbotChatBox');
  const chatForm = document.getElementById('chadbotChatForm');
  const chatInput = document.getElementById('chadbotChatInput');
  const sendBtn = document.getElementById('chadbotSendBtn');
  const clearBtn = document.getElementById('chadbotClearBtn');
  const clearMemoryBtn = document.getElementById('chadbotClearMemoryBtn');
  const memoryModal = document.getElementById('chadbotMemoryModal');
  const memoryList = document.getElementById('chadbotMemoryList');
  const closeMemoryBtn = document.getElementById('chadbotCloseMemoryBtn');
  const exitMemoryBtn = document.getElementById('chadbotExitMemoryBtn');
  const deleteMemoryBtn = document.getElementById('chadbotDeleteMemoryBtn');

  const portfolioContext = collectPortfolioContext();
  const memoryStorageKey = GeminiApi.MEMORY_STORAGE_KEY || 'gemini-chat-memory-log';
  const savedMemory = loadSavedMemory();
  const savedVisitorName = getSavedVisitorName(savedMemory);
  const chat = GeminiApi.createGeminiChat({
    portfolioContext,
    memoryContext: formatSavedMemory(savedMemory)
  });
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
  let memoryDragState = null;
  let memoryDragFrameId = 0;
  let ignoreClicksUntil = 0;
  let hasShownUsageNotice = false;
  let promptGateFallback = {
    count: 0,
    cooldownUntil: 0
  };

  setInitialGreeting(savedVisitorName);

  // -------------------------------------------------------------------------
  // Event Listeners
  // -------------------------------------------------------------------------
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
  panelHeader.addEventListener('pointerdown', event => {
    if (event.target.closest('input, textarea, select, button, a, [contenteditable="true"]')) return;
    startDrag(event, 'panel');
  });
  panelHeader.addEventListener('pointermove', moveDrag);
  panelHeader.addEventListener('pointerup', finishDrag);
  panelHeader.addEventListener('pointercancel', finishDrag);
  closePanelBtn.addEventListener('click', closePanel);
  chatForm.addEventListener('submit', event => {
    event.preventDefault();
    sendMessage();
  });

  clearBtn.addEventListener('click', clearChat);
  clearMemoryBtn.addEventListener('click', openMemoryModal);
  closeMemoryBtn.addEventListener('click', closeMemoryModal);
  exitMemoryBtn.addEventListener('click', closeMemoryModal);
  deleteMemoryBtn.addEventListener('click', clearMemory);
  memoryModal.addEventListener('pointerdown', event => {
    if (event.target.closest('button, a, [contenteditable="true"]')) return;
    startMemoryDrag(event);
  });
  memoryModal.addEventListener('pointermove', moveMemoryDrag);
  memoryModal.addEventListener('pointerup', finishMemoryDrag);
  memoryModal.addEventListener('pointercancel', finishMemoryDrag);
  window.addEventListener('resize', handleViewportResize);

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (!memoryModal.hidden) {
      closeMemoryModal();
      return;
    }
    if (root.classList.contains('chadbot-open')) closePanel();
  });

  // -------------------------------------------------------------------------
  // Panel Open / Close
  // -------------------------------------------------------------------------
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
    memoryModal.setAttribute('hidden', '');
    launcher.focus();
  }

  function openMemoryModal() {
    renderMemoryModal();
    memoryModal.removeAttribute('hidden');
    positionMemoryModal();
    closeMemoryBtn.focus();
  }

  function closeMemoryModal() {
    memoryModal.setAttribute('hidden', '');
    clearMemoryBtn.focus();
  }

  function renderMemoryModal() {
    memoryList.innerHTML = '';

    if (!savedMemory.length) {
      const emptyMessage = document.createElement('p');
      emptyMessage.className = 'chadbot-memory-empty';
      emptyMessage.textContent = 'No memory stored yet.';
      memoryList.appendChild(emptyMessage);
      return;
    }

    savedMemory.forEach(memory => {
      const item = document.createElement('div');
      item.className = 'chadbot-memory-item';
      item.textContent = memory.text;
      memoryList.appendChild(item);
    });
  }

  // -------------------------------------------------------------------------
  // Dragging
  // -------------------------------------------------------------------------
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

  function startMemoryDrag(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const rect = memoryModal.getBoundingClientRect();
    memoryDragState = {
      captureTarget: event.currentTarget,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      nextLeft: rect.left,
      nextTop: rect.top,
      moved: false
    };

    memoryDragState.captureTarget.setPointerCapture(event.pointerId);
    memoryModal.classList.add('chadbot-memory-dragging');
  }

  function moveMemoryDrag(event) {
    if (!memoryDragState || event.pointerId !== memoryDragState.pointerId) return;

    const rawDeltaX = event.clientX - memoryDragState.startX;
    const rawDeltaY = event.clientY - memoryDragState.startY;

    if (!memoryDragState.moved && Math.hypot(rawDeltaX, rawDeltaY) < dragThreshold) return;

    memoryDragState.moved = true;
    event.preventDefault();

    const maxLeft = Math.max(viewportMargin, window.innerWidth - memoryModal.offsetWidth - viewportMargin);
    const maxTop = Math.max(viewportMargin, window.innerHeight - memoryModal.offsetHeight - viewportMargin);
    memoryDragState.nextLeft = clamp(memoryDragState.startLeft + rawDeltaX, viewportMargin, maxLeft);
    memoryDragState.nextTop = clamp(memoryDragState.startTop + rawDeltaY, viewportMargin, maxTop);

    if (!memoryDragFrameId) {
      memoryDragFrameId = window.requestAnimationFrame(renderMemoryDragFrame);
    }
  }

  function finishMemoryDrag(event) {
    if (!memoryDragState || event.pointerId !== memoryDragState.pointerId) return;

    const captureTarget = memoryDragState.captureTarget;

    if (memoryDragFrameId) {
      window.cancelAnimationFrame(memoryDragFrameId);
      memoryDragFrameId = 0;
    }

    if (memoryDragState.moved) applyMemoryDragPosition(memoryDragState);

    memoryDragState = null;
    memoryModal.classList.remove('chadbot-memory-dragging');

    if (captureTarget.hasPointerCapture(event.pointerId)) {
      captureTarget.releasePointerCapture(event.pointerId);
    }
  }

  function renderMemoryDragFrame() {
    memoryDragFrameId = 0;
    if (!memoryDragState?.moved) return;
    applyMemoryDragPosition(memoryDragState);
  }

  function applyMemoryDragPosition(state) {
    memoryModal.style.left = `${state.nextLeft}px`;
    memoryModal.style.top = `${state.nextTop}px`;
    memoryModal.style.right = 'auto';
    memoryModal.style.bottom = 'auto';
  }

  // -------------------------------------------------------------------------
  // Positioning Helpers
  // -------------------------------------------------------------------------
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

  function positionMemoryModal() {
    if (memoryModal.style.left) return;

    const panelRect = panel.hidden ? null : panel.getBoundingClientRect();
    const modalRect = memoryModal.getBoundingClientRect();
    const baseLeft = panelRect
      ? panelRect.left + 14
      : window.innerWidth - modalRect.width - 32;
    const baseTop = panelRect
      ? panelRect.top + 56
      : window.innerHeight - modalRect.height - 128;
    const maxLeft = Math.max(viewportMargin, window.innerWidth - modalRect.width - viewportMargin);
    const maxTop = Math.max(viewportMargin, window.innerHeight - modalRect.height - viewportMargin);

    memoryModal.style.left = `${clamp(baseLeft, viewportMargin, maxLeft)}px`;
    memoryModal.style.top = `${clamp(baseTop, viewportMargin, maxTop)}px`;
    memoryModal.style.right = 'auto';
    memoryModal.style.bottom = 'auto';
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
    if (!memoryModal.hidden) keepMemoryModalInViewport();
  }

  function keepMemoryModalInViewport() {
    const rect = memoryModal.getBoundingClientRect();
    const maxLeft = Math.max(viewportMargin, window.innerWidth - memoryModal.offsetWidth - viewportMargin);
    const maxTop = Math.max(viewportMargin, window.innerHeight - memoryModal.offsetHeight - viewportMargin);

    memoryModal.style.left = `${clamp(rect.left, viewportMargin, maxLeft)}px`;
    memoryModal.style.top = `${clamp(rect.top, viewportMargin, maxTop)}px`;
    memoryModal.style.right = 'auto';
    memoryModal.style.bottom = 'auto';
  }

  function clamp(value, minimum, maximum) {
    return Math.min(Math.max(value, minimum), maximum);
  }

  // -------------------------------------------------------------------------
  // Message Rendering
  // -------------------------------------------------------------------------
  function appendMessage(role, text) {
    const message = document.createElement('div');
    message.className = `chadbot-message chadbot-message--${role}`;
    renderMessageText(message, text, role);
    chatBox.appendChild(message);
    chatBox.scrollTop = chatBox.scrollHeight;
    return message;
  }

  function renderMessageText(element, text, role = 'bot') {
    element.textContent = '';

    if (role === 'user') {
      element.textContent = text;
      return;
    }

    const parts = String(text || '').split(/(\*\*[^*]+\*\*)/g);

    parts.forEach(part => {
      const isBold = part.startsWith('**') && part.endsWith('**');
      const content = isBold ? part.slice(2, -2).trim() : part.replace(/\*\*/g, '');

      if (!content) return;

      const node = isBold
        ? document.createElement('strong')
        : document.createTextNode(content);

      if (isBold) node.textContent = content;
      element.appendChild(node);
    });
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

  // -------------------------------------------------------------------------
  // Reply Chunking and Timing
  // -------------------------------------------------------------------------
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
      renderMessageText(typing, chunks[index], 'bot');

      if (index < chunks.length - 1) {
        firstTypingBubble = null;
      }
    }
  }

  function sleep(duration) {
    return new Promise(resolve => window.setTimeout(resolve, duration));
  }

  // -------------------------------------------------------------------------
  // Sending and Prompt Limit
  // -------------------------------------------------------------------------
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
    rememberUserMessage(message);

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
      renderMessageText(
        typing,
        error.message || 'Something went wrong. Please try again.',
        'error'
      );
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

  // -------------------------------------------------------------------------
  // Chat Utilities and Portfolio Context
  // -------------------------------------------------------------------------
  function clearChat() {
    chat.history.length = 0;
    chatBox.innerHTML = '';
    appendMessage('bot', clearChatMessage);
    chatInput.focus();
  }

  function clearMemory() {
    savedMemory.length = 0;
    saveMemory(savedMemory);
    chat.updateMemoryContext('');
    renderMemoryModal();
    closeMemoryBtn.focus();
  }

  function loadSavedMemory() {
    try {
      const saved = JSON.parse(localStorage.getItem(memoryStorageKey) || '[]');
      return Array.isArray(saved) ? saved.filter(memory => memory?.text) : [];
    } catch (error) {
      return [];
    }
  }

  function saveMemory(memory) {
    try {
      localStorage.setItem(memoryStorageKey, JSON.stringify(memory));
    } catch (error) {
      // localStorage can be unavailable in private or restricted browsing contexts.
    }
  }

  function rememberUserMessage(message) {
    const visitorName = extractVisitorName(message);
    if (visitorName) saveVisitorName(visitorName);

    const memoryText = extractMemoryFromMessage(message);
    if (!memoryText) return;

    if (memoryText === '__CLEAR_CHADBOT_MEMORY__') {
      savedMemory.length = 0;
      saveMemory(savedMemory);
      chat.updateMemoryContext('');
      if (!memoryModal.hidden) renderMemoryModal();
      return;
    }

    const normalizedMemory = normalizeText(memoryText).slice(0, 180);
    const alreadySaved = savedMemory.some(memory => (
      memory.text.toLowerCase() === normalizedMemory.toLowerCase()
    ));

    if (alreadySaved) return;

    savedMemory.push({
      text: normalizedMemory,
      createdAt: new Date().toISOString()
    });

    if (savedMemory.length > 12) {
      savedMemory.splice(0, savedMemory.length - 12);
    }

    saveMemory(savedMemory);
    chat.updateMemoryContext(formatSavedMemory(savedMemory));
    if (!memoryModal.hidden) renderMemoryModal();
  }

  function saveVisitorName(name) {
    const cleanedName = cleanVisitorName(name);
    if (!cleanedName) return;

    const existingNameMemory = savedMemory.find(memory => memory.type === 'visitor-name');
    const nameText = `Visitor: ${cleanedName}`;

    if (existingNameMemory) {
      existingNameMemory.text = nameText;
      existingNameMemory.updatedAt = new Date().toISOString();
    } else {
      savedMemory.push({
        type: 'visitor-name',
        text: nameText,
        createdAt: new Date().toISOString()
      });
    }

    saveMemory(savedMemory);
    chat.updateMemoryContext(formatSavedMemory(savedMemory));
    if (!memoryModal.hidden) renderMemoryModal();
  }

  function getSavedVisitorName(memory) {
    const nameMemory = [...memory].reverse().find(item => (
      item.type === 'visitor-name' || /^visitor(?: name)?:/i.test(item.text || '')
    ));

    if (!nameMemory) return '';
    return cleanVisitorName(String(nameMemory.text).replace(/^visitor(?: name)?:\s*/i, ''));
  }

  function extractVisitorName(message) {
    const text = normalizeText(message);
    const patterns = [
      /^remember(?: that)? my name is\s+(.+)$/i,
      /^please remember(?: that)? my name is\s+(.+)$/i,
      /^(?:hi|hello|hey)[,.!\s]+(?:i am|i'm|im|my name is)\s+(.+)$/i,
      /^(?:i am|i'm|im|my name is)\s+(.+)$/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      const name = cleanVisitorName(match?.[1]);
      if (isLikelyVisitorName(name)) return name;
    }

    return '';
  }

  function cleanVisitorName(name) {
    const stopWords = new Set([
      'a',
      'an',
      'and',
      'asking',
      'because',
      'but',
      'developer',
      'from',
      'hello',
      'hey',
      'hi',
      'looking',
      'please',
      'thanks',
      'thank',
      'working'
    ]);
    const nameWords = [];
    const words = String(name || '')
      .replace(/[.!?]+$/g, '')
      .trim()
      .split(/\s+/);

    for (const word of words) {
      const cleanedWord = word.replace(/^[^A-Za-z]+|[^A-Za-z.'-]+$/g, '');
      if (!cleanedWord) continue;
      if (stopWords.has(cleanedWord.toLowerCase())) break;
      if (!/^[A-Za-z][A-Za-z.'-]*$/.test(cleanedWord)) break;

      nameWords.push(cleanedWord);
      if (nameWords.length >= 4) break;
    }

    return formatVisitorName(nameWords.join(' '));
  }

  function formatVisitorName(name) {
    return String(name || '')
      .split(' ')
      .map(part => part
        .split('-')
        .map(namePart => (
          namePart.charAt(0).toUpperCase() + namePart.slice(1).toLowerCase()
        ))
        .join('-'))
      .join(' ');
  }

  function isLikelyVisitorName(name) {
    if (!name) return false;
    if (/^(?:a|an|the|from|working|asking|looking|interested|hello|hi|hey)\b/i.test(name)) {
      return false;
    }
    return /^[A-Za-z][A-Za-z.'-]*(?:\s+[A-Za-z][A-Za-z.'-]*){0,3}$/.test(name);
  }

  function extractMemoryFromMessage(message) {
    const text = normalizeText(message);
    const lowerText = text.toLowerCase();

    if (/^(forget|clear|delete|reset) (my |the )?(chadbot )?memory\b/.test(lowerText)) {
      return '__CLEAR_CHADBOT_MEMORY__';
    }

    const patterns = [
      /^remember(?: that)? (.+)$/i,
      /^please remember(?: that)? (.+)$/i,
      /^i prefer (.+)$/i,
      /^i like (.+)$/i,
      /^my role is (.+)$/i,
      /^my job is (.+)$/i,
      /^i work (?:as|in|at|with) (.+)$/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) return cleanMemoryText(match[1]);
    }

    return '';
  }

  function setInitialGreeting(name) {
    if (!name) return;

    const initialBotMessage = chatBox.querySelector('.chadbot-message--bot');
    if (!initialBotMessage) return;

    renderMessageText(
      initialBotMessage,
      `Welcome back, ${name}. What can I do for you?`,
      'bot'
    );
  }

  function cleanMemoryText(text) {
    return String(text || '')
      .replace(/[.!?]+$/g, '')
      .trim();
  }

  function formatSavedMemory(memory) {
    const memoryLines = memory
      .map(item => normalizeText(item.text))
      .filter(Boolean)
      .slice(-12);

    if (!memoryLines.length) return '';
    return memoryLines.map(item => `- ${item}`).join('\n');
  }

  function collectPortfolioContext() {
    const sections = [
      ['Profile', ['#about', '#about-detail']],
      ['Skills', ['#skills']],
      ['Professional Timeline', ['#experience']],
      ['Featured Projects', ['#projects']],
      ['Just for Fun Projects', ['#j4f']],
      ['Github Repositories', ['#github']],
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
