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


// --- 9. AI Chatbot Widget ---
const ChatbotConfig = {
  // API Configuration
  apiKey: 'AQ.Ab8RN6J7XW2Q3k2yep5veWRMKuY3A50nAbv_VfXcT1CmZMeQaA',
  apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', 
  model: 'gemini-1.5-flash'

  // Demo mode settings
  demoMode: false, // Set to false when API key is configured
  demoDelay: 1200, // Simulated response delay in ms
};

// Context about Chad for the AI to use
const ChadContext = `You are an AI assistant helping visitors learn about Chad De Guzman. Here's what you know about him:

PROFESSIONAL SUMMARY:
- Full-stack software engineer with 15+ years of experience
- Currently: SAP Developer / AI Systems Engineer at Cambridge University Press & Assessment (2023-Present)
- Previously: E2E Systems Engineer at OneTool Solutions (2017-2023), Application Development Senior Analyst at Accenture (2011-2017)
- Education: BS Information Systems from University of Santo Tomas (2007-2011)

KEY SKILLS:
- Frontend: HTML, JavaScript, React, Next.js, Tailwind CSS
- Backend: Node.js, Python, PHP, SAP ABAP, SQL
- AI Integration: Context Engineering, RAG, LLM Wiki, Claude, Gemini, Bolt, Rovo, Copilot, Workflow Design

NOTABLE PROJECTS:
1. Manila Invoicing Project (2026) - BIR E-Invoicing Compliance with SAP ECC
2. E2E SAP Platform for Asia Pacific Healthcare - 50+ services across 7 countries
3. SAP Real Estate Greenfield Implementation - 2M+ records with 99% success rate

INTERESTS:
- Building LLM Wikis - converting static data into conversational knowledge systems
- AI integration and automation
- Enterprise systems and infrastructure

Be helpful, friendly, and concise. If asked about something not in this context, politely say you'd be happy to help but suggest they contact Chad directly for more specific information.`;

const Chatbot = {
  elements: null,
  isOpen: false,

  init() {
    this.elements = {
      container: document.getElementById('chatbot-container'),
      toggle: document.getElementById('chatbot-toggle'),
      widget: document.getElementById('chatbot-widget'),
      minimize: document.getElementById('chatbot-minimize'),
      messages: document.getElementById('chatbot-messages'),
      input: document.getElementById('chatbot-input'),
      send: document.getElementById('chatbot-send'),
    };

    if (!this.elements.container) return;

    this.bindEvents();
  },

  bindEvents() {
    // Toggle chat widget
    this.elements.toggle.addEventListener('click', () => this.toggle());
    this.elements.minimize.addEventListener('click', () => this.close());

    // Send message
    this.elements.send.addEventListener('click', () => this.sendMessage());
    this.elements.input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  },

  toggle() {
    this.isOpen ? this.close() : this.open();
  },

  open() {
    this.isOpen = true;
    this.elements.toggle.classList.add('chatbot-open');
    this.elements.widget.classList.add('chatbot-visible');
    this.elements.input.focus();
  },

  close() {
    this.isOpen = false;
    this.elements.toggle.classList.remove('chatbot-open');
    this.elements.widget.classList.remove('chatbot-visible');
  },

  async sendMessage() {
    const message = this.elements.input.value.trim();
    if (!message) return;

    // Add user message
    this.addMessage(message, 'user');
    this.elements.input.value = '';
    this.elements.send.disabled = true;

    // Show typing indicator
    this.showTyping();

    // Get AI response
    const response = await this.getAIResponse(message);

    // Remove typing and add AI message
    this.hideTyping();
    this.addMessage(response, 'ai');
    this.elements.send.disabled = false;
  },

  addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chatbot-message chatbot-message-${sender}`;
    messageDiv.innerHTML = `<span class="chatbot-message-text">${this.escapeHtml(text)}</span>`;
    this.elements.messages.appendChild(messageDiv);
    this.scrollToBottom();
  },

  showTyping() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chatbot-typing';
    typingDiv.id = 'chatbot-typing';
    typingDiv.innerHTML = '<div class="chatbot-typing-dot"></div><div class="chatbot-typing-dot"></div><div class="chatbot-typing-dot"></div>';
    this.elements.messages.appendChild(typingDiv);
    this.scrollToBottom();
  },

  hideTyping() {
    const typing = document.getElementById('chatbot-typing');
    if (typing) typing.remove();
  },

  scrollToBottom() {
    this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  async getAIResponse(message) {
    if (ChatbotConfig.demoMode || !ChatbotConfig.apiKey) {
      return this.getDemoResponse(message);
    }

// Begin of API call - uncomment and configure when ready
    try {
      const response = await fetch(ChatbotConfig.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ChatbotConfig.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: ChatbotConfig.model,
          max_tokens: 1024,
          messages: [
            { role: 'user', content: message }
          ],
          system: ChadContext,
        }),
      });

      const data = await response.json();
      return data.content[0].text;
    } catch (error) {
      console.error('Chatbot API Error:', error);
      return 'Sorry, I encountered an error. Please try again later.';
    }
// End of API call

    return this.getDemoResponse(message);
  },

  getDemoResponse(message) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const lowerMessage = message.toLowerCase();
        let response = '';

        if (lowerMessage.includes('experience') || lowerMessage.includes('work')) {
          response = "Chad has over 15 years of experience! He's currently at Cambridge University Press & Assessment as a SAP Developer/AI Systems Engineer. Before that, he spent 6 years at OneTool Solutions and 6 years at Accenture. He's worked across multiple countries including the Philippines, UK, US, and Singapore.";
        } else if (lowerMessage.includes('skill') || lowerMessage.includes('tech')) {
          response = "Chad's tech stack is quite versatile! For frontend, he works with HTML, JavaScript, React, Next.js, and Tailwind CSS. On the backend, he's skilled in Node.js, Python, PHP, SAP ABAP, and SQL. He's also deep into AI integration with Context Engineering, RAG, LLM Wikis, and tools like Claude, Gemini, and Copilot.";
        } else if (lowerMessage.includes('project') || lowerMessage.includes('portfolio')) {
          response = "Chad has some impressive projects! His recent work includes a BIR E-Invoicing compliance system for Manila, an E2E SAP platform serving healthcare across 7 Asian countries, and a massive SAP Real Estate implementation with 2M+ records at 99% success rate. He's also working on experimental AI projects in his J4F section!";
        } else if (lowerMessage.includes('contact') || lowerMessage.includes('email') || lowerMessage.includes('hire')) {
          response = "You can reach Chad at chadsama.27@email.com. He's available for discussions about projects, collaborations, or just to chat about tech and AI integration. Feel free to also check out his GitHub or LinkedIn profiles linked on the site!";
        } else if (lowerMessage.includes('ai') || lowerMessage.includes('llm') || lowerMessage.includes('ai integration')) {
          response = "Chad is passionate about AI integration! He specializes in building LLM Wikis - converting massive static data repositories into conversational knowledge systems. He works with Claude, Gemini, Bolt, Rovo, and MS Copilot. His approach isn't just about plugging in APIs, but rethinking how software thinks and designing the layer between human intent and machine action.";
        } else if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
          response = "Hello! I'm here to help you learn about Chad De Guzman. Feel free to ask about his experience, skills, projects, or anything else you'd like to know. I'm currently running in demo mode, but I can still share quite a bit about Chad's background!";
        } else if (lowerMessage.includes('sap') || lowerMessage.includes('abap')) {
          response = "Chad is a seasoned SAP professional! He's worked with SAP ECC, SAP ABAP, SAP Fiori, and various modules including HCM, RE-FX, FICO, MM, and PS. He's delivered enterprise solutions serving millions of users and led data migration projects with exceptional success rates.";
        } else {
          response = "Thanks for your message! I'm currently running in demo mode, but I'd be happy to tell you about Chad's experience, skills, projects, or SAP expertise. For specific inquiries, you can also reach him directly at chadsama.27@email.com.";
        }

        resolve(response);
      }, ChatbotConfig.demoDelay);
    });
  },
};

// Initialize chatbot
document.addEventListener('DOMContentLoaded', () => {
  Chatbot.init();
});
