/* knowmad mood · «La marca la hacen las personas» (sección Personas)
 *
 * El isologo dibujado con exactamente 3.500 figuras humanas, una por persona
 * (posiciones precalculadas en people-data.js). Al entrar en pantalla, las
 * figuras llegan desde fuera y se agrupan hasta formar la marca. Una lupa
 * (ratón, o dedo en móvil) amplía la zona para que se vea que cada punto es
 * una persona. Con prefers-reduced-motion se muestra directamente formado.
 */
(function () {
  'use strict';

  var DATA = window.KM_PEOPLE;
  var host = document.querySelector('[data-people]');
  if (!DATA || !host) return;
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var TONES = ['#E0245E', '#F08A2C', '#F5BC39'];   // carmesí, naranja, amarillo (piezas del isologo)
  var N = DATA.count;

  var canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);
  var ctx = canvas.getContext('2d');

  // Cada figura: destino en el logo, origen disperso y un retardo propio
  var figs = [];
  for (var i = 0; i < N; i++) {
    var a = Math.random() * Math.PI * 2, d = 0.75 + Math.random() * 0.6;
    figs.push({
      tx: DATA.p[i * 3] / 1000, ty: DATA.p[i * 3 + 1] / 1000, tone: DATA.p[i * 3 + 2],
      ox: 0.5 + Math.cos(a) * d, oy: 0.5 + Math.sin(a) * d,
      delay: Math.random() * 0.45
    });
  }

  var W = 0, H = 0, dpr = 1, scale = 1, offX = 0, offY = 0, cell = 4;
  var sprites = [];

  // Pictograma de persona (cabeza + hombros), prerenderizado por tono y tamaño
  function figure(c, x, y, s, color) {
    c.fillStyle = color;
    c.beginPath(); c.arc(x, y - s * 0.22, s * 0.2, 0, Math.PI * 2); c.fill();
    c.beginPath();
    c.moveTo(x - s * 0.34, y + s * 0.42);
    c.quadraticCurveTo(x - s * 0.34, y + 0.02 * s, x, y + 0.02 * s);
    c.quadraticCurveTo(x + s * 0.34, y + 0.02 * s, x + s * 0.34, y + s * 0.42);
    c.closePath(); c.fill();
  }
  function makeSprites() {
    sprites = TONES.map(function (col) {
      var s = Math.ceil(cell * dpr), cv = document.createElement('canvas');
      cv.width = cv.height = s;
      figure(cv.getContext('2d'), s / 2, s / 2, s, col);
      return cv;
    });
  }

  function layout() {
    var r = host.getBoundingClientRect();
    W = r.width; H = r.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    var pad = Math.min(W, H) * 0.06;
    scale = Math.min((W - pad * 2) / (DATA.w / 1000), (H - pad * 2) / (DATA.h / 1000));
    offX = (W - scale * DATA.w / 1000) / 2; offY = (H - scale * DATA.h / 1000) / 2;
    cell = DATA.cell / 1000 * scale * 0.92;
    makeSprites();
    draw();
  }

  /* ---- Estado ---- */
  var progress = reduced ? 1 : 0;      // 0 = dispersas · 1 = logo formado
  var lens = null, lensOn = false, lensA = 0;  // posición, visible y opacidad de la lupa
  var ZOOM = 3.4;

  function ease(t) { return 1 - Math.pow(1 - t, 3); }

  function posOf(f, k) {
    var t = ease(Math.max(0, Math.min(1, (k - f.delay) / (1 - 0.45))));
    var x = f.ox + (f.tx - f.ox) * t, y = f.oy + (f.ty - f.oy) * t;
    return [offX + x * scale, offY + y * scale, t];
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var s = cell, i, f, p;
    for (i = 0; i < N; i++) {
      f = figs[i]; p = posOf(f, progress);
      ctx.globalAlpha = 0.25 + 0.75 * p[2];
      ctx.drawImage(sprites[f.tone], p[0] - s / 2, p[1] - s / 2, s, s);
    }
    ctx.globalAlpha = 1;
    if (lens && lensA > 0.01 && progress >= 1) drawLens();
  }

  function drawLens() {
    var R = Math.max(54, Math.min(W, H) * 0.2);
    var lx = lens[0], ly = lens[1];
    ctx.save();
    ctx.globalAlpha = lensA;
    ctx.beginPath(); ctx.arc(lx, ly, R, 0, Math.PI * 2);
    ctx.fillStyle = '#0D0A22'; ctx.fill();
    ctx.clip();
    var s = cell * ZOOM, reach = R / ZOOM + cell;
    for (var i = 0; i < N; i++) {
      var f = figs[i], x = offX + f.tx * scale, y = offY + f.ty * scale;
      if (Math.abs(x - lx) > reach || Math.abs(y - ly) > reach) continue;
      figure(ctx, lx + (x - lx) * ZOOM, ly + (y - ly) * ZOOM, s, TONES[f.tone]);
    }
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = lensA;
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(lx, ly, R, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  /* ---- Animación ---- */
  var raf = 0, last = 0, started = reduced;
  function tick(now) {
    var dt = last ? Math.min(64, now - last) / 1000 : 0.016; last = now;
    var busy = false;
    if (started && progress < 1) { progress = Math.min(1, progress + dt / 2.6); busy = true; }
    var target = lensOn && progress >= 1 ? 1 : 0;
    if (Math.abs(lensA - target) > 0.01) { lensA += (target - lensA) * Math.min(1, dt * 10); busy = true; }
    else lensA = target;
    draw();
    raf = busy ? requestAnimationFrame(tick) : 0;
    if (!busy) last = 0;
  }
  function kick() { if (!raf) { last = 0; raf = requestAnimationFrame(tick); } }

  /* ---- Lupa ---- */
  function point(e) {
    var r = canvas.getBoundingClientRect();
    lens = [e.clientX - r.left, e.clientY - r.top];
    lensOn = true;
    if (!raf) draw();
    kick();
  }
  function hide() { lensOn = false; kick(); }    // la lupa se funde, no desaparece de golpe
  host.addEventListener('pointermove', point);
  host.addEventListener('pointerdown', point);
  host.addEventListener('pointerleave', hide);
  var hideTimer = 0;
  host.addEventListener('pointerdown', function () { clearTimeout(hideTimer); });
  host.addEventListener('pointerup', function (e) { if (e.pointerType !== 'mouse') hideTimer = setTimeout(hide, 1800); });

  if ('ResizeObserver' in window) new ResizeObserver(layout).observe(host);
  else window.addEventListener('resize', layout);
  layout();

  // Se forma la primera vez que la ilustración entra en pantalla
  if (!reduced && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { started = true; io.disconnect(); setTimeout(kick, 250); }
    }, { threshold: 0.35 });
    io.observe(host);
  } else { progress = 1; draw(); }
})();
