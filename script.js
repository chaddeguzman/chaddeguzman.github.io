// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------
const themeToggle = document.getElementById('themeToggle');
const rootElement = document.documentElement;
const body = document.body;

themeToggle.addEventListener('click', () => {
  const isLightMode = body.classList.toggle('light-mode');
  rootElement.classList.toggle('light-mode', isLightMode);
});


// ---------------------------------------------------------------------------
// Footer Year
// ---------------------------------------------------------------------------
document.getElementById('year').textContent = new Date().getFullYear();


// ---------------------------------------------------------------------------
// Navigation Behavior
// ---------------------------------------------------------------------------
const nav = document.querySelector('.nav');

window.addEventListener('scroll', () => {
  if (window.scrollY > 60) {
    nav.classList.add('scrolled');
  } else {
    nav.classList.remove('scrolled');
  }
}, { passive: true });


const navToggle = document.querySelector('.nav-toggle');
const navLinks = document.querySelector('.nav-links');

navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

// Close the mobile menu after a section link is selected.
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
  });
});


// ---------------------------------------------------------------------------
// Reveal Animations
// ---------------------------------------------------------------------------
const revealElements = document.querySelectorAll(
  '.about-grid, .contact-inner, .footer, .project-item, .timeline-item, .section-label, .section h2'
);

// Mark elements for the shared reveal animation before observing them.
revealElements.forEach(el => {
  el.classList.add('reveal');
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, {
  threshold: 0.12,
  rootMargin: '0px 0px -40px 0px'
});

revealElements.forEach(el => revealObserver.observe(el));


// Skill cards use their data-delay value for a staggered entrance.
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


// ---------------------------------------------------------------------------
// Active Section Tracking
// ---------------------------------------------------------------------------
const sections = document.querySelectorAll('section[id]');
const navLinkItems = document.querySelectorAll('.nav-links a');

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.getAttribute('id');
      navLinkItems.forEach(link => {
        link.classList.remove('active');
        link.style.color = '';
        if (link.getAttribute('href') === `#${id}`) {
          link.classList.add('active');
        }
      });
    }
  });
}, {
  threshold: 0.4
});

sections.forEach(section => sectionObserver.observe(section));


// ---------------------------------------------------------------------------
// Project Hover Hooks
// ---------------------------------------------------------------------------
// Kept as no-op hooks so the UI can add hover behavior later without
// reworking the event wiring.
const projectItems = document.querySelectorAll('.project-item');

projectItems.forEach(item => {
  item.addEventListener('mouseenter', () => {
    // Intentionally empty to prevent dynamic layout shifting.
  });
  item.addEventListener('mouseleave', () => {
    // Intentionally empty to prevent dynamic layout shifting.
  });
});


// ---------------------------------------------------------------------------
// Scroll Progress
// ---------------------------------------------------------------------------
const scrollProgress = document.getElementById('scrollProgress');

window.addEventListener('scroll', () => {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  scrollProgress.style.width = progress + '%';
}, { passive: true });


// ---------------------------------------------------------------------------
// Contact Actions
// ---------------------------------------------------------------------------
const copyEmailBtn = document.getElementById('copyEmailBtn');
const copyLabel = document.getElementById('copyLabel');

if (copyEmailBtn) {
  copyEmailBtn.addEventListener('click', () => {
    navigator.clipboard.writeText('chadsama.27@email.com').then(() => {
      copyLabel.textContent = 'Copied!';
      copyEmailBtn.classList.add('copied');
      setTimeout(() => {
        copyLabel.textContent = 'Copy';
        copyEmailBtn.classList.remove('copied');
      }, 2000);
    });
  });
}
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
