// --- 0. Dark / Light Theme Toggle ---
const themeToggle = document.getElementById('themeToggle');
const body = document.body;

themeToggle.addEventListener('click', () => {
  body.classList.toggle('light-mode');
});


// --- 1. Dynamic Year in Footer ---
document.getElementById('year').textContent = new Date().getFullYear();


// --- 2. Nav: Shrink on Scroll ---
const nav = document.querySelector('.nav');

window.addEventListener('scroll', () => {
  if (window.scrollY > 60) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }
}, { passive: true });


// --- 3. Mobile Nav Toggle ---
const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');

navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

// Close mobile nav when a link is clicked
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
  });
});


// --- 4. Scroll-Triggered Reveal (.reveal elements) ---
const revealElements = document.querySelectorAll(
  '.about-grid, .contact-inner, .footer, .project-item, .timeline-item, .section-label, .section h2'
);

// Add reveal class to these elements
revealElements.forEach(el => {
  el.classList.add('reveal');
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target); // animate only once
    }
  });
}, {
  threshold: 0.12,
  rootMargin: '0px 0px -40px 0px'
});

revealElements.forEach(el => revealObserver.observe(el));


// --- 5. Skill Cards: Staggered Reveal ---
const skillCards = document.querySelectorAll('.skill-card');

const skillObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const delay = parseInt(entry.target.dataset.delay) || 0;
      setTimeout(() => {
        entry.target.classList.add('visible');
      }, delay);
      skillObserver.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.15
});

skillCards.forEach(card => skillObserver.observe(card));


// --- 6. Active Nav Link Highlight on Scroll ---
const sections = document.querySelectorAll('section[id]');
const navLinkItems = document.querySelectorAll('.nav-links a');

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.getAttribute('id');
      navLinkItems.forEach(link => {
        link.style.color = '';
        if (link.getAttribute('href') === `#${id}`) {
          link.style.color = 'var(--ink)';
        }
      });
    }
  });
}, {
  threshold: 0.4
});

sections.forEach(section => sectionObserver.observe(section));


// --- 7. Project Items: Hover Lift ---
// REMOVED padding modification logic to prevent text shifting and overflow
const projectItems = document.querySelectorAll('.project-item');

projectItems.forEach(item => {
  item.addEventListener('mouseenter', () => {
    // Left empty to prevent dynamic layout shifting
  });
  item.addEventListener('mouseleave', () => {
    // Left empty to prevent dynamic layout shifting
  });
});


// --- 8. Smooth Scroll Polyfill for older browsers ---
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});



// =============================================================================
// AI CHATBOT WIDGET — Powered by Google Gemini (Free Tier)
// =============================================================================

(function () {

  // --- System prompt: who Chad is ---
  const SYSTEM_PROMPT = `You are an AI assistant embedded in Chad De Guzman's personal portfolio website. Your job is to answer questions about Chad in a helpful, professional, and friendly tone.

Here is everything you know about Chad:

**Name:** Chad De Guzman
**Location:** Makati City, Philippines
**Current Role:** SAP Developer / AI Systems Engineer at Cambridge University Press & Assessment (2023 – Present, PH/UK)
**Title:** SAP Developer / Systems Engineer / AI Integrator

**About Chad:**
Chad is a full-stack software engineer and SAP specialist with 15+ years of experience. He has moved from enterprise SAP rollouts serving millions of users to full-stack builds and AI integration work. He is particularly focused on building LLM Wikis — converting massive, static data repositories into living, conversational knowledge systems that language models can reason with natively.

**Skills:**
- Frontend: HTML, JavaScript, React, Next.js, Tailwind CSS
- Backend & Enterprise: Node.js, Python, PHP, SAP ABAP, SQL
- AI & Automation: Context Engineering, RAG, LLM Wiki, Claude, Gemini, Bolt, Rovo, Copilot, Workflow Design
- SAP Modules: RE-FX, MM, FI, CO, PS, HCM, ABAP-HR, SAP Fiori

**Work Experience:**
1. Cambridge University Press & Assessment (2023–Present) — SAP Developer / AI Systems Engineer
2. OneTool Solutions Inc. (2017–2023) — E2E Systems Engineer — Delivered 50+ services across 7 countries for a major Asia Pacific healthcare distribution group
3. Accenture Inc. (2011–2017) — Application Development Senior Analyst — Projects in PH, US, SG including a 2,000,000+ record SAP RE greenfield implementation

**Projects:**
1. Manila Invoicing Project (2026) — BIR-approved SAP SmartForm invoices for CAS compliance
2. E2E SAP Platform – Asia Pacific Healthcare (2023) — 50+ services across 7 countries
3. SAP Real Estate Greenfield Implementation (2017) — 2M+ records across 195 business entities, 99% success rate

**Education:** BS Information Systems, University of Santo Tomas, 2007–2011
**Certifications:** Accenture ATA – Application Programming and Application Testing (2014)

**Contact:**
- Email: chadsama.27@gmail.com
- GitHub: https://github.com/chaddeguzman
- LinkedIn: https://www.linkedin.com/in/chad-de-guzman/
- Instagram: https://www.instagram.com/bebo.chad/

**Rules:**
- Answer only about Chad, his work, skills, and projects.
- Keep answers concise and helpful — 2–4 sentences unless more detail is needed.
- If asked something personal or not covered here, say you don't have that info but suggest contacting Chad directly.
- Never make up information about Chad.
- Be warm, professional, and slightly witty — match Chad's tone.`;

  // --- Conversation history (Gemini format) ---
  // Gemini uses { role: 'user'|'model', parts: [{ text }] }
  let conversationHistory = [];
  let isOpen = false;
  let isLoading = false;

  // --- DOM refs ---
  const widget      = document.getElementById('chatWidget');
  const bubble      = document.getElementById('chatBubble');
  const panel       = document.getElementById('chatPanel');
  const messages    = document.getElementById('chatMessages');
  const input       = document.getElementById('chatInput');
  const sendBtn     = document.getElementById('chatSendBtn');
  const closeBtn    = document.getElementById('chatCloseBtn');
  const suggestions = document.getElementById('chatSuggestions');

  // --- Toggle panel ---
  function toggleChat() {
    isOpen = !isOpen;
    widget.classList.toggle('is-open', isOpen);
    panel.setAttribute('aria-hidden', String(!isOpen));
    if (isOpen) setTimeout(() => input.focus(), 320);
  }

  bubble.addEventListener('click', toggleChat);
  closeBtn.addEventListener('click', toggleChat);

  // --- Auto-resize textarea ---
  input.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 100) + 'px';
  });

  // --- Send on Enter (Shift+Enter = newline) ---
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  sendBtn.addEventListener('click', sendMessage);

  // --- Suggestion chips ---
  window.sendSuggestion = function (btn) {
    const text = btn.textContent;
    if (suggestions) suggestions.remove();
    input.value = text;
    sendMessage();
  };

  // --- Append a message bubble ---
  function appendMessage(role, text) {
    const wrapper = document.createElement('div');
    wrapper.className = `chat-message chat-message--${role === 'user' ? 'user' : 'bot'}`;
    const bub = document.createElement('div');
    bub.className = 'chat-bubble-msg';
    bub.textContent = text;
    wrapper.appendChild(bub);
    messages.appendChild(wrapper);
    messages.scrollTop = messages.scrollHeight;
    return wrapper;
  }

  // --- Typing indicator ---
  function showTyping() {
    const wrapper = document.createElement('div');
    wrapper.className = 'chat-message chat-message--bot';
    wrapper.id = 'chatTyping';
    const indicator = document.createElement('div');
    indicator.className = 'chat-typing';
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('div');
      dot.className = 'chat-typing-dot';
      indicator.appendChild(dot);
    }
    wrapper.appendChild(indicator);
    messages.appendChild(wrapper);
    messages.scrollTop = messages.scrollHeight;
  }

  function removeTyping() {
    const t = document.getElementById('chatTyping');
    if (t) t.remove();
  }

  // --- Main send function ---
  async function sendMessage() {
    const text = input.value.trim();
    if (!text || isLoading) return;

    // Check API key
    const apiKey = (typeof GEMINI_API_KEY !== 'undefined') ? GEMINI_API_KEY : null;
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
      appendMessage('bot', '⚠️ Gemini API key not configured. Add your key to config.js to enable the chatbot.');
      return;
    }

    // Clear input
    input.value = '';
    input.style.height = 'auto';

    // Show user message
    appendMessage('user', text);

    // Add to Gemini-format history
    conversationHistory.push({ role: 'user', parts: [{ text }] });

    // Lock UI
    isLoading = true;
    sendBtn.disabled = true;
    showTyping();

    try {
      // Gemini 2.0 Flash — free tier endpoint
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: SYSTEM_PROMPT }]
          },
          contents: conversationHistory,
          generationConfig: {
            maxOutputTokens: 512,
            temperature: 0.7
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP ${response.status}`);
      }

      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text
        || "Sorry, I couldn't get a response. Please try again.";

      // Add model reply to history
      conversationHistory.push({ role: 'model', parts: [{ text: reply }] });

      removeTyping();
      appendMessage('bot', reply);

    } catch (err) {
      removeTyping();
      appendMessage('bot', `Something went wrong: ${err.message}. Please try again.`);
      conversationHistory.pop(); // remove failed user message
    }

    isLoading = false;
    sendBtn.disabled = false;
    input.focus();
  }

})();
