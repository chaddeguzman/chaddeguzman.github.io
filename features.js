// --- Animated Stats Counter ---
const statsContainer = document.querySelector('.about-stats');

if (statsContainer) {
  const statNums = statsContainer.querySelectorAll('.stat-num[data-target]');

  const easeOutQuad = t => t * (2 - t);

  const animateCounter = (el) => {
    const target = parseInt(el.dataset.target, 10);
    const duration = 1400;
    const start = performance.now();

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      el.textContent = Math.round(easeOutQuad(progress) * target);
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  };

  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        statNums.forEach(animateCounter);
        statsObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  statsObserver.observe(statsContainer);
}


// Reading Mode

const readingModeToggle = document.getElementById('readingModeToggle');

if (readingModeToggle) {
  readingModeToggle.addEventListener('click', () => {
    const isActive = document.body.classList.toggle('reading-mode-active');
    readingModeToggle.classList.toggle('is-active', isActive);
    readingModeToggle.setAttribute('aria-pressed', String(isActive));
    readingModeToggle.querySelector('.reading-mode-toggle__text').textContent = isActive ? 'Exit Reading Mode' : 'Reading Mode';
  });
}
