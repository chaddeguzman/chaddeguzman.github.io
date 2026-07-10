// --- Google Gemini API configuration ---
const API_KEY = '__CHADBOT_API__';
const MODEL_NAME = 'gemini-3.1-flash-lite';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;
const API_KEY_PLACEHOLDERS = new Set(['', 'CHADBOT_API', ['__', 'CHADBOT_API', '__'].join('')]);
const MEMORY_STORAGE_KEY = 'gemini-chat-memory-log';

// --- Build Gemini Prompt ---
function buildPrompt(userInput, memories = []) {
  const memoryBlock = formatMemoryPrompt(memories);

  return `You are ChadBot, a friendly portfolio assistant for Chad De Guzman. Help visitors understand Chad's skills, experience, projects, and AI integration work. Keep replies clear, concise, practical, and helpful.
${memoryBlock}
User: ${userInput}`;
}

// --- Local Memory Helpers ---
function getStoredMemories() {
  if (typeof localStorage === 'undefined') return [];

  try {
    const stored = JSON.parse(localStorage.getItem(MEMORY_STORAGE_KEY) || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch (error) {
    console.warn('Could not read local memory:', error);
    return [];
  }
}

function setStoredMemories(memories) {
  if (typeof localStorage === 'undefined') return memories;

  localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(memories));
  return memories;
}

function addMemory(text) {
  const cleanText = String(text || '').trim();
  if (!cleanText) return null;

  const memory = {
    text: cleanText,
    createdAt: formatMemoryTimestamp()
  };

  setStoredMemories([...getStoredMemories(), memory]);
  return memory;
}

function clearMemories() {
  return setStoredMemories([]);
}

function formatMemoryTimestamp(date = new Date()) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const year = date.getFullYear();
  const month = months[date.getMonth()];
  const day = String(date.getDate()).padStart(2, '0');
  const hours24 = date.getHours();
  const hours12 = String(hours24 % 12 || 12).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const offsetMinutes = -date.getTimezoneOffset();
  const offsetSign = offsetMinutes >= 0 ? '+' : '-';
  const absoluteOffset = Math.abs(offsetMinutes);
  const offsetHours = Math.floor(absoluteOffset / 60);
  const offsetRemainder = absoluteOffset % 60;
  const offset = offsetRemainder
    ? `${offsetSign}${offsetHours}:${String(offsetRemainder).padStart(2, '0')}`
    : `${offsetSign}${offsetHours}`;

  return `${year}-${month}-${day} ${hours12}:${minutes}:${seconds} ${period} (GMT${offset})`;
}

function formatMemoryPrompt(memories = getStoredMemories()) {
  const lines = memories
    .map(memory => typeof memory === 'string' ? memory : memory?.text)
    .filter(Boolean);

  if (!lines.length) return '';

  return `

Remember these saved user facts and preferences when they are relevant:
${lines.map(line => `- ${line}`).join('\n')}`;
}

function formatMemoryLog(memories = getStoredMemories()) {
  const lines = memories
    .map(memory => {
      const text = typeof memory === 'string' ? memory : memory?.text;
      const createdAt = typeof memory === 'string' ? null : memory?.createdAt;
      return text ? `[${createdAt || 'unknown'}] ${text}` : '';
    })
    .filter(Boolean);

  return lines.join('\n');
}

function extractMemoryCommand(message) {
  const text = String(message || '').trim();
  const patterns = [
    /^(?:please\s+)?(?:commit|save|add)\s+(?:this\s+)?(?:to|in)\s+memory[:\s-]*(.+)$/i,
    /^(?:please\s+)?remember(?:\s+that)?[:\s-]*(.+)$/i,
    /^(?:please\s+)?memorize(?:\s+that)?[:\s-]*(.+)$/i,
    /^memory[:\s-]+(.+)$/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].trim();
  }

  const inlineMatch = text.match(/\b(?:commit|save|add)\s+(?:this\s+)?(?:to|in)\s+memory\b[:\s-]*(.*)$/i);
  return inlineMatch?.[1]?.trim() || '';
}

// --- Parse Gemini JSON Response ---
function parseGeminiJson(data) {
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

// --- Parse Gemini Text Response ---
function parseGeminiText(data) {
  return data?.candidates?.[0]?.content?.parts
    ?.map(part => part.text || '')
    .join('')
    .trim() || '';
}

// --- Main Gemini Function ---
async function askGemini(prompt, options = {}) {
  if (API_KEY_PLACEHOLDERS.has(API_KEY)) {
    throw new Error('Gemini API key is not configured. Replace the API key placeholder before using chatbot/chat_api.js.');
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: buildPrompt(prompt, options.memories || getStoredMemories()) }]
        }
      ],
      generationConfig: {
        temperature: options.temperature ?? 0.2,
        ...(options.responseMimeType ? { responseMimeType: options.responseMimeType } : {})
      }
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('API error:', data);
    throw new Error(data?.error?.message || 'API request failed');
  }

  return data;
}

// --- Main Gemini Text Function ---
async function askGeminiText(prompt, options = {}) {
  const data = await askGemini(prompt, options);
  return parseGeminiText(data);
}

// --- Main Gemini JSON Function ---
async function askGeminiJson(prompt, options = {}) {
  const data = await askGemini(prompt, {
    ...options,
    responseMimeType: 'application/json'
  });

  return parseGeminiJson(data);
}

// --- Main Gemini Chat Function ---
function createGeminiChat(options = {}) {
  const history = [...(options.history || [])];
  const getMemories = options.getMemories || getStoredMemories;

  return {
    history,
    async sendMessage(message) {
      if (API_KEY_PLACEHOLDERS.has(API_KEY)) {
        throw new Error('Gemini API key is not configured. Replace the API key placeholder before using chatbot/chat_api.js.');
      }

      history.push({
        role: 'user',
        parts: [{ text: buildPrompt(message, getMemories()) }]
      });

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: history,
          generationConfig: {
            temperature: options.temperature ?? 0.2
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('API error:', data);
        throw new Error(data?.error?.message || 'API request failed');
      }

      const reply = parseGeminiText(data);

      history.push({
        role: 'model',
        parts: [{ text: reply }]
      });

      return reply;
    }
  };
}

// --- Export for Browser, Node, or n8n ---
const GeminiApi = {
  API_KEY,
  API_URL,
  API_KEY_PLACEHOLDERS,
  MODEL_NAME,
  MEMORY_STORAGE_KEY,
  addMemory,
  buildPrompt,
  clearMemories,
  extractMemoryCommand,
  formatMemoryLog,
  formatMemoryPrompt,
  formatMemoryTimestamp,
  getStoredMemories,
  askGemini,
  askGeminiText,
  askGeminiJson,
  createGeminiChat,
  parseGeminiJson,
  parseGeminiText
};

if (typeof window !== 'undefined') {
  window.GeminiApi = GeminiApi;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GeminiApi;
}
