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
  let dragState = null;
  let dragFrameId = 0;
  let ignoreClicksUntil = 0;

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
