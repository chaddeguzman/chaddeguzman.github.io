// Decorative background only. Static stars survive the moving sky's Q toggle.
(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const TURN_DURATION = 462000;
  const FRAME_INTERVAL = 1000 / 30;
  const FLIGHT_DURATION = 1300;
  const SHOT_INTERVAL = 20000;
  const EDITABLE = 'input, textarea, select, [role="textbox"]';
  const BLOCKING_UI = 'dialog[open], [aria-modal="true"]:not([hidden]):not([aria-hidden="true"]), '
    + '[role="dialog"]:not([hidden]):not([aria-hidden="true"]), '
    + '.chadbot-memory-modal:not([hidden]), [data-editing="true"], [data-transitioning="true"]';

  function createBackground() {
    const sky = document.createElement('div');
    sky.className = 'portfolio-sky';
    sky.setAttribute('aria-hidden', 'true');
    document.body.prepend(sky);
    document.body.classList.add('portfolio-stars-active');
    let moving = null;
    let disposed = false;
    let seed = 1337;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    // Each group covers the whole viewport, so mobile keeps an evenly spread sky.
    const sizes = [1, 1.5, 2, 3];
    const opacities = [0.16, 0.28, 0.42, 0.58];
    for (let i = 0; i < 118; i++) {
      const star = document.createElement('span');
      const cell = i % 60;
      star.className = 'portfolio-star';
      star.style.left = `${((cell % 10 + 0.15 + random() * 0.7) / 10) * 100}%`;
      star.style.top = `${((Math.floor(cell / 10) + 0.15 + random() * 0.7) / 6) * 100}%`;
      const size = random();
      const tone = random();
      star.style.setProperty('--star-size', `${sizes[size < 0.5 ? 0 : size < 0.85 ? 1 : size < 0.97 ? 2 : 3]}px`);
      star.style.setProperty('--star-opacity', opacities[tone < 0.5 ? 0 : tone < 0.83 ? 1 : tone < 0.96 ? 2 : 3]);
      if ([18, 37, 55].includes(i)) {
        star.classList.add('portfolio-star--sparkle');
        star.style.setProperty('--star-size', '3px');
      }
      sky.append(star);
    }

    function isEditing(event) {
      const editable = node => node instanceof Element
        && (node.isContentEditable || node.matches(EDITABLE));
      return event.composedPath().some(editable) || editable(document.activeElement)
        || Boolean(document.querySelector(BLOCKING_UI));
    }

    function onKey(event) {
      if (event.defaultPrevented || event.repeat || event.isComposing
        || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey
        || event.key.toLowerCase() !== 'q' || isEditing(event)) return;
      if (moving) {
        moving.dispose();
        moving = null;
      } else {
        moving = createMovingSky(sky);
      }
    }

    function onPageHide(event) {
      if (event.persisted) moving?.pause();
      else dispose();
    }

    function onPageShow() { moving?.resume(); }

    function dispose() {
      if (disposed) return;
      disposed = true;
      moving?.dispose();
      moving = null;
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
      sky.replaceChildren();
      sky.remove();
      document.body.classList.remove('portfolio-stars-active');
    }

    document.addEventListener('keydown', onKey);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);
    moving = createMovingSky(sky);
    return { dispose };
  }

  function createMovingSky(sky) {
    let canvas = document.createElement('canvas');
    let context = canvas.getContext('2d');
    if (!context) return null;
    canvas.setAttribute('aria-hidden', 'true');
    sky.append(canvas);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let particles = [];
    let frame = null;
    let disposed = false;
    let suspended = false;
    let width = 1;
    let height = 1;
    let focal = 1;
    let angle = 0;
    let elapsedTime = 0;
    let lastTime = performance.now();
    let lastPaint = lastTime;
    let nextShot = SHOT_INTERVAL;
    let quietUntil = 0;
    let meteor = null;

    function prepareSky() {
      // Only read viewport dimensions at setup/resize, never inside the draw loop.
      width = Math.max(1, window.innerWidth);
      height = Math.max(1, window.innerHeight);
      focal = width * 0.65;
      const resolution = Math.min(window.devicePixelRatio || 1, 1.25, 2560 / Math.max(width, height));
      canvas.width = Math.max(1, Math.floor(width * resolution));
      canvas.height = Math.max(1, Math.floor(height * resolution));
      context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
      const halfFov = Math.atan(width / (2 * focal));
      const verticalSpan = height / focal * 0.9;
      const visibleCount = width <= 760 ? 220 : 600;
      // Account for stars behind the viewer and outside the camera's frustum.
      const count = Math.ceil(visibleCount * 1.8 * Math.PI / Math.sin(halfFov));
      particles = Array.from({ length: count }, (_, i) => {
        const direction = (i + Math.random()) / count * TAU;
        const distance = 1.2 + Math.random() * 3;
        const kind = Math.random();
        const rock = kind >= 0.985;
        const radius = kind < 0.65 ? 0.45 + Math.random() * 0.45
          : kind < 0.93 ? 0.9 + Math.random() * 0.45
          : !rock ? 1.4 + Math.random() * 0.65 : 2.2 + Math.random() * 1.8;
        const opacity = 0.12 + Math.random() * (rock ? 0.14 : 0.3);
        return {
          x: Math.sin(direction) * distance,
          y: (Math.random() * 2 - 1) * verticalSpan * distance,
          z: Math.cos(direction) * distance,
          radius,
          color: `rgba(${rock ? '170,180,198' : '235,240,250'},${opacity})`,
          shape: rock ? Array.from({ length: 6 }, (_, corner) => {
            const turn = corner * TAU / 6;
            const length = 0.65 + Math.random() * 0.35;
            return [Math.cos(turn) * length, Math.sin(turn) * length];
          }) : null,
          twinkle: !rock && Math.random() < 0.23
            ? { period: 6000 + Math.random() * 5000, phase: Math.random() * TAU } : null,
        };
      });
      meteor = null;
    }

    function blocked() {
      return elapsedTime < quietUntil || Boolean(document.querySelector(BLOCKING_UI + ', .chadbot-dragging'))
        || document.getAnimations().some(animation => animation.playState === 'running'
          && (animation instanceof CSSTransition
            || animation.effect?.target?.matches?.('.reveal, .hero-title, .hero-sub, .hero-cta')));
    }

    function launchMeteor() {
      const tail = Math.min(320, Math.max(180, width * 0.24));
      const dx = width + tail * 3;
      const dy = -height - tail * 3;
      const length = Math.hypot(dx, dy);
      meteor = {
        start: elapsedTime, tailFraction: tail / length,
        x: -tail, y: height + tail, dx, dy,
        nx: dy / length, ny: -dx / length,
        arch: Math.min(width, height) * (0.08 + Math.random() * 0.04),
      };
    }

    function meteorPoint(t) {
      const bend = 4 * meteor.arch * t * (1 - t);
      return [meteor.x + meteor.dx * t + meteor.nx * bend,
        meteor.y + meteor.dy * t + meteor.ny * bend];
    }

    function paintMeteor() {
      if (!meteor) return;
      const t = (elapsedTime - meteor.start) / FLIGHT_DURATION;
      if (t >= 1) { meteor = null; return; }
      // Sample the same curved path for head and tail, tapering toward the rear.
      let previous = meteorPoint(t - meteor.tailFraction);
      context.strokeStyle = '#edf4ff';
      context.lineCap = 'round';
      for (let i = 1; i <= 28; i++) {
        const portion = i / 28;
        const point = meteorPoint(t - meteor.tailFraction * (1 - portion));
        context.globalAlpha = 0.8 * portion * portion;
        context.lineWidth = 0.15 + 1.8 * portion;
        context.beginPath();
        context.moveTo(...previous);
        context.lineTo(...point);
        context.stroke();
        previous = point;
      }
      context.globalAlpha = 1;
      context.fillStyle = '#fff';
      context.shadowColor = 'rgba(225,238,255,0.7)';
      context.shadowBlur = 6;
      context.beginPath();
      context.arc(...previous, 1.8, 0, TAU);
      context.fill();
      context.shadowBlur = 0;
    }

    function paint() {
      context.clearRect(0, 0, width, height);
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      for (const star of particles) {
        // Yaw the camera about its vertical axis: stars sweep right to left.
        const x = star.x * cosine - star.z * sine;
        const z = star.z * cosine + star.x * sine;
        if (z <= 0.1) continue;
        const px = width / 2 + focal * x / z;
        const py = height / 2 + focal * star.y / z;
        if (px < -10 || px > width + 10 || py < -10 || py > height + 10) continue;
        const radius = star.radius * Math.min(1.8, Math.max(0.65, 1.8 / z));
        context.globalAlpha = star.twinkle && !motion.matches
          ? 0.78 + 0.22 * Math.sin(elapsedTime * TAU / star.twinkle.period + star.twinkle.phase) : 1;
        context.fillStyle = star.color;
        context.beginPath();
        if (star.shape) {
          star.shape.forEach(([sx, sy], index) => {
            if (index === 0) context.moveTo(px + sx * radius, py + sy * radius);
            else context.lineTo(px + sx * radius, py + sy * radius);
          });
          context.closePath();
        } else context.arc(px, py, radius, 0, TAU);
        context.fill();
      }
      context.globalAlpha = 1;
      if (!motion.matches) paintMeteor();
    }

    function schedule() {
      if (!disposed && !suspended && !document.hidden && !motion.matches && frame === null) {
        frame = requestAnimationFrame(tick);
      }
    }

    function tick(now) {
      frame = null;
      if (disposed || suspended || document.hidden || motion.matches) return;
      const delta = Math.max(0, now - lastTime);
      lastTime = now;
      elapsedTime += delta;
      angle = (angle + delta * TAU / TURN_DURATION) % TAU;
      if (elapsedTime >= nextShot) {
        if (blocked()) nextShot = elapsedTime + 500;
        else { launchMeteor(); nextShot = elapsedTime + SHOT_INTERVAL; }
      }
      if (now - lastPaint >= FRAME_INTERVAL) {
        paint();
        lastPaint = now - (now - lastPaint) % FRAME_INTERVAL;
      }
      schedule();
    }

    function pause() {
      suspended = true;
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
    }

    function resume() {
      if (disposed) return;
      suspended = false;
      lastTime = lastPaint = performance.now();
      schedule();
    }

    function syncMotion() {
      pause();
      if (motion.matches) {
        meteor = null;
        nextShot = elapsedTime + SHOT_INTERVAL;
        paint();
      }
      resume();
    }

    function resize() {
      if (disposed) return;
      prepareSky();
      paint();
      lastPaint = performance.now();
    }

    function onScroll() { quietUntil = elapsedTime + 500; }

    function dispose() {
      if (disposed) return;
      disposed = true;
      pause();
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', syncMotion);
      motion.removeEventListener('change', syncMotion);
      particles.length = 0;
      meteor = null;
      canvas.remove();
      canvas.width = canvas.height = 0;
      canvas = context = null;
    }

    window.addEventListener('resize', resize);
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', syncMotion);
    motion.addEventListener('change', syncMotion);
    prepareSky();
    paint();
    resume();
    return { dispose, pause, resume };
  }

  // A small lifecycle handle permits explicit teardown without adding UI.
  window.portfolioBackground?.dispose();
  window.portfolioBackground = createBackground();
})();
