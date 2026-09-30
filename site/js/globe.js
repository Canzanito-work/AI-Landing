/* knowmad mood · globo giratorio de puntos
 *
 * Dibuja en <canvas> el mundo en puntos (datos en globe-data.js) con los países
 * de presencia resaltados en el degradado de marca.
 * Se monta en cada .globe-card[data-globe]; si no hay JS, la tarjeta conserva
 * la imagen estática de fondo.
 * - Gira de forma continua; se pausa fuera de pantalla o con la pestaña oculta.
 * - Con prefers-reduced-motion se dibuja un único fotograma fijo.
 */
(function () {
  'use strict';

  var DATA = window.KM_GLOBE;
  var cards = document.querySelectorAll('.globe-card[data-globe]');
  if (!DATA || !cards.length) return;

  var DEG = Math.PI / 180;
  var TILT = 14 * DEG;          // inclinación hacia el norte, compensada para que el cono sur no quede tapado
  var START_LON = -20;          // arranca centrado en el Atlántico
  var SPEED = 360 / 50;         // grados por segundo: una vuelta cada 50 s
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Puntos precalculados ---- */
  var GRAD = [[0, [245, 188, 57]], [0.3, [240, 138, 44]], [0.62, [222, 35, 48]], [1, [214, 29, 79]]];
  var TONES = 12;                // tonos del degradado (se agrupan para dibujar en lote)
  function toneOf(lat) { return Math.round(Math.max(0, Math.min(1, (55 - lat) / 100)) * (TONES - 1)); }
  function brand(tone) {
    // Norte → amarillo/naranja · sur → rojo/carmesí (como la imagen original)
    var t = tone / (TONES - 1);
    for (var i = 1; i < GRAD.length; i++) {
      if (t <= GRAD[i][0]) {
        var a = GRAD[i - 1], b = GRAD[i], k = (t - a[0]) / (b[0] - a[0]);
        return 'rgb(' + [0, 1, 2].map(function (c) { return Math.round(a[1][c] + (b[1][c] - a[1][c]) * k); }).join(',') + ')';
      }
    }
    return 'rgb(214,29,79)';
  }

  var base = [], hl = [];
  DATA.rings.forEach(function (ring) {
    var lat = ring[0], n = ring[1], runs = ring[2];
    var sp = Math.sin(lat * DEG), cp = Math.cos(lat * DEG), tone = toneOf(lat);
    for (var k = 0; k < runs.length; k += 3) {
      for (var i = runs[k]; i < runs[k] + runs[k + 1]; i++) {
        var lon = (-180 + (i + 0.5) * 360 / n) * DEG;
        if (runs[k + 2]) hl.push(sp, cp, lon, tone);
        else base.push(sp, cp, lon);
      }
    }
  });
  var TONE_COLORS = [];
  for (var tn = 0; tn < TONES; tn++) TONE_COLORS.push(brand(tn));

  var sT = Math.sin(TILT), cT = Math.cos(TILT);
  // Proyección ortográfica: devuelve [x, y, profundidad] (profundidad > 0 = cara visible)
  function project(sp, cp, lon, lon0, out) {
    var d = lon - lon0, cd = Math.cos(d);
    out[0] = cp * Math.sin(d);
    out[1] = cT * sp - sT * cp * cd;
    out[2] = sT * sp + cT * cp * cd;
    return out;
  }

  cards.forEach(mount);

  function mount(card) {
    var canvas = document.createElement('canvas');
    canvas.className = 'globe-card__canvas';
    canvas.setAttribute('aria-hidden', 'true');
    card.insertBefore(canvas, card.firstChild);
    card.classList.add('has-globe');
    var ctx = canvas.getContext('2d');
    var W = 0, H = 0, dpr = 1, R = 0, cx = 0, cy = 0;
    var BUCKETS = 6, paths = [], hlPaths = [];
    var p = [0, 0, 0];

    function resize() {
      var r = card.getBoundingClientRect();
      W = r.width; H = r.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      R = Math.max(W, H) * 0.39;
      cx = W / 2; cy = H * (W > H ? 0.4 : 0.44);
      draw(lastT);
    }

    function drawOrbit(rx, ry, color) {
      var STEPS = 240, R2 = R * R, drawing = false;
      ctx.strokeStyle = color; ctx.lineWidth = 1;
      ctx.beginPath();
      for (var k = 0; k <= STEPS; k++) {
        var ang = k / STEPS * Math.PI * 2;
        var x = Math.cos(ang) * rx, y = Math.sin(ang) * ry;
        var hidden = y < 0 && x * x + y * y < R2; // detrás y dentro del disco del globo
        if (hidden) { drawing = false; continue; }
        if (drawing) ctx.lineTo(x, y); else { ctx.moveTo(x, y); drawing = true; }
      }
      ctx.stroke();
    }

    var lastT = 0;
    function draw(t) {
      var lon0 = (START_LON - (reduced ? 0 : t * SPEED / 1000)) * DEG;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // Halo de fondo y esfera
      var g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.45);
      g.addColorStop(0, 'rgba(70,24,90,.35)'); g.addColorStop(1, 'rgba(8,6,26,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      g = ctx.createRadialGradient(cx - R * 0.15, cy - R * 0.2, R * 0.05, cx, cy, R);
      g.addColorStop(0, '#2a1846'); g.addColorStop(0.6, '#170f30'); g.addColorStop(1, '#0d0922');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

      // Tierra (puntos agrupados por opacidad para dibujar en pocas pasadas)
      var r0 = Math.max(0.7, R * 0.0045);
      for (var b = 0; b < BUCKETS; b++) paths[b] = new Path2D();
      for (var i = 0; i < base.length; i += 3) {
        project(base[i], base[i + 1], base[i + 2], lon0, p);
        if (p[2] <= 0) continue;
        var rr = r0 * (0.55 + 0.45 * p[2]);
        var x = cx + p[0] * R, y = cy - p[1] * R;
        var bk = Math.min(BUCKETS - 1, (p[2] * BUCKETS) | 0);
        paths[bk].moveTo(x + rr, y); paths[bk].arc(x, y, rr, 0, Math.PI * 2);
      }
      for (b = 0; b < BUCKETS; b++) {
        ctx.fillStyle = 'rgba(176,166,214,' + (0.16 + 0.5 * (b + 0.5) / BUCKETS).toFixed(3) + ')';
        ctx.fill(paths[b]);
      }

      // Países de presencia (agrupados por tono y opacidad)
      var rh = r0 * 1.3, HB = 4;
      for (b = 0; b < TONES * HB; b++) hlPaths[b] = null;
      for (i = 0; i < hl.length; i += 4) {
        project(hl[i], hl[i + 1], hl[i + 2], lon0, p);
        if (p[2] <= 0) continue;
        var key = hl[i + 3] * HB + Math.min(HB - 1, (p[2] * HB) | 0);
        var path = hlPaths[key] || (hlPaths[key] = new Path2D());
        var hx = cx + p[0] * R, hy = cy - p[1] * R, hr = rh * (0.55 + 0.45 * p[2]);
        path.moveTo(hx + hr, hy); path.arc(hx, hy, hr, 0, Math.PI * 2);
      }
      for (b = 0; b < TONES * HB; b++) {
        if (!hlPaths[b]) continue;
        ctx.globalAlpha = 0.3 + 0.7 * ((b % HB) + 0.5) / HB;
        ctx.fillStyle = TONE_COLORS[(b / HB) | 0];
        ctx.fill(hlPaths[b]);
      }
      ctx.globalAlpha = 1;

      // Atmósfera y contorno
      g = ctx.createRadialGradient(cx, cy, R * 0.94, cx, cy, R * 1.12);
      g.addColorStop(0, 'rgba(222,35,48,0)'); g.addColorStop(0.35, 'rgba(222,35,48,.14)'); g.addColorStop(1, 'rgba(222,35,48,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.12, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();

      // Órbitas en 3D: la mitad superior del anillo (en pantalla) queda detrás
      // de la esfera y no se dibuja donde la esfera la tapa.
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(-17 * DEG);
      drawOrbit(R * 1.2, R * 0.27, 'rgba(245,188,57,.2)');
      drawOrbit(R * 1.1, R * 0.21, 'rgba(255,255,255,.09)');
      if (!reduced) {
        // Chispa: se apaga al pasar por detrás del globo
        var a = t / 1000 * 0.35;
        var sx = Math.cos(a) * R * 1.2, sy = Math.sin(a) * R * 0.27;
        var vis = sy >= 0 ? 1 : Math.max(0, Math.min(1, (Math.sqrt(sx * sx + sy * sy) - R * 0.97) / (R * 0.08)));
        if (vis > 0) {
          ctx.globalAlpha = vis;
          g = ctx.createRadialGradient(sx, sy, 0, sx, sy, R * 0.05);
          g.addColorStop(0, 'rgba(255,230,170,.95)'); g.addColorStop(1, 'rgba(245,188,57,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, R * 0.05, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
      ctx.restore();
    }

    /* ---- Bucle: solo mientras la tarjeta está en pantalla ---- */
    var visible = false, raf = 0, t0 = 0, elapsed = 0;
    function frame(now) {
      if (!t0) t0 = now - elapsed;
      elapsed = now - t0;
      lastT = elapsed;
      draw(elapsed);
      raf = requestAnimationFrame(frame);
    }
    function play() { if (!raf && !reduced && visible && !document.hidden) { t0 = 0; raf = requestAnimationFrame(frame); } }
    function pause() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(card);
    else window.addEventListener('resize', resize);
    resize();

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        visible = e[0].isIntersecting; if (visible) play(); else pause();
      }, { rootMargin: '100px' }).observe(card);
    } else { visible = true; play(); }
    document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); else play(); });
  }
})();
