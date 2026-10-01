/* knowmad mood · hero vivo
 *
 * 1) Cinta de luz: reinterpreta en tiempo real la imagen del hero (una cinta de
 *    líneas finas con cresta dorada). Decenas de líneas en el degradado de marca
 *    ondulan como seda, la cresta se desliza y la cinta se inclina hacia el cursor.
 * 2) Isologo 3D: se inclina en 3D siguiendo al cursor con un muelle suave
 *    (el flotado y el destello son CSS).
 *
 * Se pausa fuera de pantalla o con la pestaña oculta. Con prefers-reduced-motion
 * se dibuja un único fotograma y el logo no se mueve. Sin JS se mantiene la
 * imagen estática del hero (ver html.js en styles.css).
 */
(function () {
  'use strict';

  var panel = document.querySelector('.hero__panel');
  if (!panel) return;
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;

  var canvas = document.createElement('canvas');
  canvas.className = 'hero__ribbon';
  canvas.setAttribute('aria-hidden', 'true');
  panel.insertBefore(canvas, panel.firstChild);
  var ctx = canvas.getContext('2d');
  // Halo: la misma cinta dibujada a 1/10 de resolución; el navegador la estira
  // a tamaño completo con suavizado, lo que equivale a un desenfoque amplio casi gratis
  var glow = document.createElement('canvas');
  glow.className = 'hero__ribbon hero__ribbon--glow';
  glow.setAttribute('aria-hidden', 'true');
  panel.insertBefore(glow, canvas);
  var gctx = glow.getContext('2d');
  var GLOW_SCALE = 0.1;

  var iso = panel.querySelector('.iso');

  var W = 0, H = 0, dpr = 1, mobile = false;
  function resize() {
    var r = panel.getBoundingClientRect();
    W = r.width; H = r.height; mobile = W < 700;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    glow.width = Math.max(1, Math.round(W * GLOW_SCALE)); glow.height = Math.max(1, Math.round(H * GLOW_SCALE));
    if (!raf) draw(time);
  }

  /* ---- Puntero (suavizado con muelle) ---- */
  var px = 0.62, py = 0.4, tx = 0.62, ty = 0.4, active = 0, tActive = 0;
  var rx = 0, ry = 0;
  if (finePointer && !reduced) {
    panel.addEventListener('pointermove', function (e) {
      var r = panel.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width; ty = (e.clientY - r.top) / r.height; tActive = 1;
    });
    panel.addEventListener('pointerleave', function () { tx = 0.62; ty = 0.4; tActive = 0; });
  }

  /* ---- Cinta de luz ---- */
  function smoothstep(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  var LINES = 80, SEG = 140;
  function draw(t) {
    var s = t / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // Zona donde vive la cinta (en móvil, la franja superior detrás del isologo)
    var ax = 0, aw = W, ay = 0, ah = mobile ? Math.min(H, Math.max(420, W * 1.2)) : H;
    var x0 = ax + aw * (mobile ? -0.05 : 0.2), x1 = ax + aw * 1.04;

    var grad = ctx.createLinearGradient(x0, 0, x1, 0);
    grad.addColorStop(0, 'rgba(70,20,80,0)');
    // En escritorio la cola queda tenue bajo la columna de texto
    grad.addColorStop(mobile ? 0.15 : 0.3, mobile ? 'rgba(110,30,110,.45)' : 'rgba(110,30,110,.22)');
    grad.addColorStop(0.5, 'rgba(190,30,95,.85)');
    grad.addColorStop(0.75, 'rgba(232,110,60,.8)');
    grad.addColorStop(1, 'rgba(170,40,110,.6)');

    // Influencia del cursor: abomba la cinta cerca de su posición horizontal
    var pull = active * (0.5 - py) * 0.18;

    function edges(u, out) {
      var x = x0 + (x1 - x0) * u;
      var taper = smoothstep(0, 0.6, u) * (1 - 0.3 * smoothstep(0.78, 1.05, u)); // punta fina a la izquierda, cúpula a la derecha
      var cyBase = ay + ah * (mobile ? 0.36 : 0.47);
      var wave = Math.sin(u * 3.1 + s * 0.42) * 0.045 + Math.sin(u * 5.3 - s * 0.31 + 1.7) * 0.022;
      var near = Math.exp(-Math.pow((u - (px - 0.08) / 0.96) / 0.18, 2));
      var cy = cyBase + ah * (wave - near * pull);
      var th = ah * (mobile ? 0.26 : 0.34) * taper * (0.86 + 0.14 * Math.sin(u * 2.4 - s * 0.55));
      out.x = x; out.top = cy - th * (0.62 + 0.1 * Math.sin(s * 0.5 + u * 4)); out.bot = cy + th * 0.38;
      return out;
    }

    var e = {}, i, k, u;
    var tops = new Float32Array(SEG + 1), bots = new Float32Array(SEG + 1), xs = new Float32Array(SEG + 1);
    for (k = 0; k <= SEG; k++) { edges(k / SEG, e); xs[k] = e.x; tops[k] = e.top; bots[k] = e.bot; }

    // Cuerpo luminoso: la cinta rellena con halo, y una segunda capa más
    // brillante pegada a la cresta (volumen: arriba luz, abajo se apaga)
    function band(c, f0, f1) {
      c.beginPath();
      for (k = 0; k <= SEG; k++) { var yt = tops[k] + (bots[k] - tops[k]) * f0; if (k === 0) c.moveTo(xs[k], yt); else c.lineTo(xs[k], yt); }
      for (k = SEG; k >= 0; k--) c.lineTo(xs[k], tops[k] + (bots[k] - tops[k]) * f1);
      c.closePath();
    }
    // Halo (capa difuminada a baja resolución)
    gctx.setTransform(GLOW_SCALE, 0, 0, GLOW_SCALE, 0, 0);
    gctx.clearRect(0, 0, W, H);
    gctx.fillStyle = grad; gctx.globalAlpha = 0.9;
    band(gctx, 0, 1); gctx.fill();

    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = grad;
    ctx.globalAlpha = 0.2; band(ctx, 0, 1); ctx.fill();
    ctx.globalAlpha = 0.24; band(ctx, 0, 0.3); ctx.fill();

    // Hilos de seda
    ctx.lineWidth = 1;
    ctx.strokeStyle = grad;
    for (i = 0; i < LINES; i++) {
      var f = i / (LINES - 1);
      // Más luz cerca de la cresta, cuerpo translúcido abajo
      ctx.globalAlpha = 0.07 + 0.2 * Math.pow(1 - f, 2);
      ctx.beginPath();
      for (k = 0; k <= SEG; k++) {
        u = k / SEG;
        var y = tops[k] + (bots[k] - tops[k]) * f + Math.sin(u * 9 + s * 0.9 + f * 5) * ah * 0.004 * (1 - f);
        if (k === 0) ctx.moveTo(xs[k], y); else ctx.lineTo(xs[k], y);
      }
      ctx.stroke();
    }

    // Cresta dorada: brillo que recorre el borde superior
    var hot = mobile ? (s * 0.06) % 1.4 - 0.2 : 0.3 + (s * 0.05) % 1.0; // brillo que se desliza (en escritorio, solo a la derecha del texto)
    var crest = ctx.createLinearGradient(x0, 0, x1, 0);
    var c0 = Math.max(0, Math.min(1, hot - 0.25)), c1 = Math.max(0, Math.min(1, hot)), c2 = Math.max(0, Math.min(1, hot + 0.25));
    crest.addColorStop(0, 'rgba(245,188,57,0)');
    crest.addColorStop(c0, 'rgba(245,188,57,0)');
    crest.addColorStop(c1, 'rgba(255,238,190,.95)');
    crest.addColorStop(c2, 'rgba(245,188,57,0)');
    crest.addColorStop(1, 'rgba(245,188,57,0)');
    var warm = ctx.createLinearGradient(x0, 0, x1, 0);
    warm.addColorStop(0, 'rgba(245,188,57,0)'); warm.addColorStop(mobile ? 0.35 : 0.42, 'rgba(245,160,60,.35)');
    warm.addColorStop(0.7, 'rgba(255,214,140,.7)'); warm.addColorStop(1, 'rgba(245,188,57,.35)');
    [[warm, 10, 0.12], [warm, 2, 0.5], [crest, 14, 0.18], [crest, 5, 0.4], [crest, 1.6, 1]].forEach(function (pass) {
      ctx.strokeStyle = pass[0]; ctx.lineWidth = pass[1]; ctx.globalAlpha = pass[2];
      ctx.beginPath();
      for (k = 0; k <= SEG; k++) { if (k === 0) ctx.moveTo(xs[k], tops[k]); else ctx.lineTo(xs[k], tops[k]); }
      ctx.stroke();
    });
    // Filo inferior tenue
    ctx.strokeStyle = grad; ctx.lineWidth = 1; ctx.globalAlpha = 0.35;
    ctx.beginPath();
    for (k = 0; k <= SEG; k++) { if (k === 0) ctx.moveTo(xs[k], bots[k]); else ctx.lineTo(xs[k], bots[k]); }
    ctx.stroke();

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  /* ---- Bucle ---- */
  var raf = 0, time = 0, last = 0, visible = true;
  function frame(now) {
    var dt = last ? Math.min(64, now - last) : 16; last = now;
    time += dt;
    var k = 1 - Math.pow(0.0025, dt / 1000);   // muelle independiente de los fps
    px += (tx - px) * k; py += (ty - py) * k; active += (tActive - active) * k;
    draw(time);
    if (iso) {
      rx += ((0.5 - py) * 14 * active - rx) * k * 1.4;
      ry += ((px - 0.5) * 22 * active - ry) * k * 1.4;
      iso.style.setProperty('--rx', rx.toFixed(2) + 'deg');
      iso.style.setProperty('--ry', ry.toFixed(2) + 'deg');
    }
    raf = requestAnimationFrame(frame);
  }
  function play() { if (!raf && !reduced && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } }
  function pause() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(panel);
  else window.addEventListener('resize', resize);
  resize();
  if (reduced) { time = 9000; draw(time); }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) play(); else pause(); }).observe(panel);
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); else play(); });
  play();
  document.documentElement.classList.add('hero-live');
})();
