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
