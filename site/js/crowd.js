/* knowmad mood · campo de personas (sección «Personas»)
 *
 * Dibuja exactamente 3.500 puntos, uno por persona del equipo. Los puntos se
 * encienden en el degradado de marca en ondas lentas y con destellos sueltos,
 * como un equipo vivo. Se pausa fuera de pantalla o con la pestaña oculta; con
 * prefers-reduced-motion se dibuja un único fotograma.
 */
(function () {
  'use strict';

  var host = document.querySelector('[data-crowd]');
  if (!host) return;
  var PEOPLE = 3500;
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var canvas = document.createElement('canvas');
  host.appendChild(canvas);
  var ctx = canvas.getContext('2d');

  // Tonos de marca de izquierda a derecha (amarillo → naranja → rojo → carmesí)
  var TONES = ['245,188,57', '242,160,48', '240,138,44', '234,90,46', '222,35,48', '214,29,79'];
  var LEVELS = 4;                        // niveles de opacidad para agrupar el dibujo

  var W = 0, H = 0, dpr = 1, dots = [], r = 1;
  function layout() {
    var b = host.getBoundingClientRect();
    W = b.width; H = b.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    var cols = Math.max(1, Math.round(Math.sqrt(PEOPLE * W / H)));
    var rows = Math.ceil(PEOPLE / cols);
    var sx = W / cols, sy = H / rows;
    r = Math.max(0.8, Math.min(sx, sy) * 0.24);
    dots = [];
    for (var i = 0; i < PEOPLE; i++) {
      var c = i % cols, rw = (i / cols) | 0;
      dots.push({
        x: (c + 0.5) * sx, y: (rw + 0.5) * sy,
        u: c / cols, v: rw / rows,
        tone: Math.min(TONES.length - 1, Math.floor(c / cols * TONES.length)),
        ph: Math.random() * Math.PI * 2, sp: 0.6 + Math.random() * 0.8
      });
    }
    if (!raf) draw(t);
  }

  function draw(time) {
    var s = time / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var base = [], lit = [], k, d, i;
    for (k = 0; k < LEVELS; k++) base.push(new Path2D());
    for (k = 0; k < TONES.length * LEVELS; k++) lit.push(null);
    for (i = 0; i < dots.length; i++) {
      d = dots[i];
      // Ondas lentas que recorren el equipo + destellos individuales
      var wave = Math.sin(d.u * 7 + s * 0.55) * Math.cos(d.v * 5 - s * 0.4) + Math.sin((d.u + d.v) * 4 - s * 0.3);
      var w = Math.max(0, (wave - 1.15) / 0.85) * 0.85;                // 0…1, solo las crestas
      var flash = Math.pow(0.5 + 0.5 * Math.sin(s * d.sp * 0.7 + d.ph), 90); // destellos breves y espaciados
      var e = Math.min(1, w + flash);
      if (e < 0.08) {
        var lvl = Math.min(LEVELS - 1, ((0.5 + 0.5 * Math.sin(d.ph)) * LEVELS) | 0);
        base[lvl].moveTo(d.x + r, d.y); base[lvl].arc(d.x, d.y, r, 0, Math.PI * 2);
      } else {
        var key = d.tone * LEVELS + Math.min(LEVELS - 1, (e * LEVELS) | 0);
        var p = lit[key] || (lit[key] = new Path2D());
        var rr = r * (1 + e * 0.6);
        p.moveTo(d.x + rr, d.y); p.arc(d.x, d.y, rr, 0, Math.PI * 2);
      }
    }
    for (k = 0; k < LEVELS; k++) {
      ctx.fillStyle = 'rgba(176,166,214,' + (0.12 + 0.05 * k).toFixed(2) + ')';
      ctx.fill(base[k]);
    }
    for (k = 0; k < lit.length; k++) {
      if (!lit[k]) continue;
      ctx.fillStyle = 'rgba(' + TONES[(k / LEVELS) | 0] + ',' + (0.45 + 0.55 * ((k % LEVELS) + 1) / LEVELS).toFixed(2) + ')';
      ctx.fill(lit[k]);
    }
  }

  var raf = 0, t = 0, last = 0, visible = false;
  function frame(now) {
    t += last ? Math.min(64, now - last) : 16; last = now;
    draw(t);
    raf = requestAnimationFrame(frame);
  }
  function play() { if (!raf && !reduced && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } }
  function pause() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  if ('ResizeObserver' in window) new ResizeObserver(layout).observe(host);
  else window.addEventListener('resize', layout);
  layout();
  if (reduced) { t = 4000; draw(t); }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) play(); else pause(); }).observe(host);
  } else { visible = true; play(); }
  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); else play(); });
})();
