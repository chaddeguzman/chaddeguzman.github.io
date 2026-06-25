// Reading Mode and Command Palette

const readingModeToggle = document.getElementById('readingModeToggle');

if (readingModeToggle) {
  readingModeToggle.addEventListener('click', () => {
    const isActive = document.body.classList.toggle('reading-mode-active');
    readingModeToggle.classList.toggle('is-active', isActive);
    readingModeToggle.setAttribute('aria-pressed', String(isActive));
    readingModeToggle.querySelector('.reading-mode-toggle__text').textContent = isActive ? 'Exit Reading Mode' : 'Reading Mode';
  });
}

const commandPaletteOverlay = document.getElementById('commandPaletteOverlay');
const commandPaletteInput = document.getElementById('commandPaletteInput');
const commandPaletteItems = Array.from(document.querySelectorAll('.command-palette-item'));
const commandPaletteEmpty = document.getElementById('commandPaletteEmpty');
const commandPaletteTriggers = document.querySelectorAll('[data-command-open]');
const commandPaletteClose = document.getElementById('commandPaletteClose');
let activeCommandIndex = 0;

function openCommandPalette() {
  if (!commandPaletteOverlay || !commandPaletteInput) return;

  commandPaletteOverlay.classList.add('open');
  commandPaletteOverlay.setAttribute('aria-hidden', 'false');
  commandPaletteInput.value = '';
  filterCommandItems('');
  setActiveCommand(0);
  setTimeout(() => commandPaletteInput.focus(), 50);
}

function closeCommandPalette() {
  if (!commandPaletteOverlay) return;

  commandPaletteOverlay.classList.remove('open');
  commandPaletteOverlay.setAttribute('aria-hidden', 'true');
}

function visibleCommandItems() {
  return commandPaletteItems.filter(item => item.style.display !== 'none');
}

function setActiveCommand(index) {
  const visibleItems = visibleCommandItems();
  if (!visibleItems.length) return;

  activeCommandIndex = Math.max(0, Math.min(index, visibleItems.length - 1));
  commandPaletteItems.forEach(item => item.classList.remove('is-active'));
  visibleItems[activeCommandIndex].classList.add('is-active');
}

function filterCommandItems(query) {
  const normalizedQuery = query.trim().toLowerCase();
  let matchCount = 0;

  commandPaletteItems.forEach(item => {
    const label = `${item.dataset.label || ''} ${item.dataset.keywords || ''}`.toLowerCase();
    const isMatch = !normalizedQuery || label.includes(normalizedQuery);
    item.style.display = isMatch ? '' : 'none';
    if (isMatch) matchCount += 1;
  });

  if (commandPaletteEmpty) {
    commandPaletteEmpty.classList.toggle('show', matchCount === 0);
  }

  setActiveCommand(0);
}

function goToCommandTarget(item) {
  if (!item) return;

  const target = document.querySelector(item.dataset.target);
  if (!target) return;

  closeCommandPalette();
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

commandPaletteTriggers.forEach(trigger => {
  trigger.addEventListener('click', openCommandPalette);
});

if (commandPaletteClose) {
  commandPaletteClose.addEventListener('click', closeCommandPalette);
}

if (commandPaletteOverlay) {
  commandPaletteOverlay.addEventListener('click', event => {
    if (event.target === commandPaletteOverlay) {
      closeCommandPalette();
    }
  });
}

if (commandPaletteInput) {
  commandPaletteInput.addEventListener('input', event => {
    filterCommandItems(event.target.value);
  });

  commandPaletteInput.addEventListener('keydown', event => {
    const visibleItems = visibleCommandItems();

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveCommand((activeCommandIndex + 1) % visibleItems.length);
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveCommand((activeCommandIndex - 1 + visibleItems.length) % visibleItems.length);
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      goToCommandTarget(visibleItems[activeCommandIndex]);
    }
  });
}

commandPaletteItems.forEach(item => {
  item.addEventListener('click', () => goToCommandTarget(item));
});

document.addEventListener('keydown', event => {
  const tagName = document.activeElement ? document.activeElement.tagName : '';
  const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName) || document.activeElement?.isContentEditable;

  if (event.key === '/' && !isTyping) {
    event.preventDefault();
    openCommandPalette();
  }

  if (event.key === 'Escape') {
    closeCommandPalette();
  }
});
