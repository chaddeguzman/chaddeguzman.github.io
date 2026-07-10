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
  const memoryLogBtn = document.getElementById('chadbotMemoryLogBtn');
  const downloadChatBtn = document.getElementById('chadbotDownloadChatBtn');
  const clearMemoryBtn = document.getElementById('chadbotClearMemoryBtn');
  const downloadMemoryBtn = document.getElementById('chadbotDownloadMemoryBtn');
  const closeMemoryBtn = document.getElementById('chadbotCloseMemoryBtn');
  const memoryModal = document.getElementById('chadbotMemoryModal');
  const memoryLogOutput = document.getElementById('chadbotMemoryLogOutput');

  const chat = GeminiApi.createGeminiChat();
  const initialMessage = 'Hi, I\'m ChadBot. Ask me about Chad\'s work, skills, projects, or AI integration experience.';
  const chatTranscript = [
    {
      role: 'bot',
      text: initialMessage
    }
  ];

  launcher.addEventListener('click', togglePanel);
  closePanelBtn.addEventListener('click', closePanel);
  chatForm.addEventListener('submit', event => {
    event.preventDefault();
    sendMessage();
  });

  clearBtn.addEventListener('click', clearChat);
  memoryLogBtn.addEventListener('click', openMemoryLog);
  downloadChatBtn.addEventListener('click', downloadChatHistory);
  clearMemoryBtn.addEventListener('click', clearMemory);
  downloadMemoryBtn.addEventListener('click', downloadMemoryLog);
  closeMemoryBtn.addEventListener('click', closeMemoryLog);
  memoryModal.addEventListener('click', event => {
    if (event.target === memoryModal) closeMemoryLog();
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (!memoryModal.hidden) {
      closeMemoryLog();
      return;
    }
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
    chatTranscript.push({ role, text });
    return message;
  }

  async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    chatInput.value = '';
    appendMessage('user', message);

    const memoryText = GeminiApi.extractMemoryCommand(message);
    if (memoryText) {
      GeminiApi.addMemory(memoryText);
      appendMessage('bot', `Saved to local memory: ${memoryText}`);
      chatInput.focus();
      return;
    }

    const typing = appendMessage('bot', 'Thinking...');
    sendBtn.disabled = true;
    chatInput.disabled = true;

    try {
      const reply = await chat.sendMessage(message);
      typing.textContent = reply;
      chatTranscript[chatTranscript.length - 1].text = reply;
    } catch (error) {
      typing.className = 'chadbot-message chadbot-message--error';
      typing.textContent = error.message || 'Something went wrong. Please try again.';
      chatTranscript[chatTranscript.length - 1].text = typing.textContent;
    }

    sendBtn.disabled = false;
    chatInput.disabled = false;
    chatInput.focus();
  }

  function clearChat() {
    chat.history.length = 0;
    chatTranscript.length = 0;
    chatTranscript.push({
      role: 'bot',
      text: 'Chat cleared. What would you like to talk about?'
    });
    chatBox.innerHTML = '<div class="chadbot-message chadbot-message--bot">Chat cleared. What would you like to talk about?</div>';
    chatInput.focus();
  }

  function openMemoryLog() {
    const log = GeminiApi.formatMemoryLog();
    memoryLogOutput.textContent = log || 'No local memories saved yet.';
    memoryModal.hidden = false;
    closeMemoryBtn.focus();
  }

  function closeMemoryLog() {
    memoryModal.hidden = true;
    memoryLogBtn.focus();
  }

  function downloadMemoryLog() {
    const log = GeminiApi.formatMemoryLog();
    const content = log || '# No local memories saved yet.';
    downloadTextFile('memory.log', content);
  }

  function downloadChatHistory() {
    const userLabel = getUserTranscriptLabel();
    const content = chatTranscript
      .map(entry => {
        const label = entry.role === 'user' ? userLabel : 'ChadBot';
        return `${label}:\n${entry.text}`;
      })
      .join('\n\n');

    downloadTextFile('chat-history.txt', content || 'ChadBot:\nNo chat history yet.');
  }

  function downloadTextFile(filename, content) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function getUserTranscriptLabel() {
    const transcriptName = chatTranscript
      .filter(entry => entry.role === 'user')
      .map(entry => extractUserName(entry.text))
      .find(Boolean);

    if (transcriptName) return transcriptName;

    const memoryName = GeminiApi.getStoredMemories()
      .map(memory => typeof memory === 'string' ? memory : memory?.text)
      .map(extractUserName)
      .find(Boolean);

    return memoryName || 'User';
  }

  function extractUserName(text) {
    const cleanText = String(text || '').trim();
    const patterns = [
      /\bmy name is\s+([a-z][a-z .'-]{0,40})/i,
      /\bi am\s+([a-z][a-z .'-]{0,40})/i,
      /\bi'm\s+([a-z][a-z .'-]{0,40})/i,
      /\bcall me\s+([a-z][a-z .'-]{0,40})/i
    ];

    for (const pattern of patterns) {
      const match = cleanText.match(pattern);
      if (match?.[1]) return cleanName(match[1]);
    }

    return '';
  }

  function cleanName(name) {
    return name
      .replace(/\b(?:and|but|because|so|with|from|who)\b.*$/i, '')
      .replace(/[.!?,:;].*$/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function clearMemory() {
    GeminiApi.clearMemories();
    if (!memoryModal.hidden) {
      memoryLogOutput.textContent = 'No local memories saved yet.';
    }
    appendMessage('bot', 'Local memory cleared. I will start fresh from here.');
    chatInput.focus();
  }
})();
