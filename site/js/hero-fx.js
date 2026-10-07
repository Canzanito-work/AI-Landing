/* knowmad mood · hero vivo
 *
 * 1) Cinta de luz: reinterpreta en tiempo real la imagen del hero (una cinta de
 *    líneas finas con cresta dorada). Se dibuja en la GPU con un shader WebGL:
 *    cada píxel calcula su color, así que va fluido a resolución completa.
 *    Las líneas ondulan como seda, la cresta se desliza y la cinta se abomba
 *    hacia el cursor.
 * 2) Isologo 3D: se inclina en 3D siguiendo al cursor con un muelle suave
 *    (el flotado y el destello son CSS).
 *
 * Se pausa fuera de pantalla o con la pestaña oculta. Con prefers-reduced-motion
 * se dibuja un único fotograma y el logo no se mueve. Sin JS o sin WebGL se
 * mantiene la imagen estática del hero (html.js / html.hero-static en styles.css).
 * Fondo estático a propósito: clase hero-static en <html> (o ?fondo=estatico);
 * la cinta no se dibuja, pero el isologo sigue animado.
 */
(function () {
  'use strict';

  var panel = document.querySelector('.hero__panel');
  if (!panel) return;
  var docEl = document.documentElement;
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  var iso = panel.querySelector('.iso');
  var ribbon = !docEl.classList.contains('hero-static');   // false = fondo estático

  /* ---- WebGL ---- */
  var canvas = document.createElement('canvas');
  canvas.className = 'hero__ribbon';
  canvas.setAttribute('aria-hidden', 'true');
  var gl = ribbon ? canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: 'high-performance' }) : null;
  if (!gl) { ribbon = false; docEl.classList.add('hero-static'); }

  var VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }';
  var FRAG = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'uniform vec2 uRes;',          // tamaño en px CSS
    'uniform float uDpr, uT, uMobile, uHot;',
    'uniform vec3 uPtr;',          // x, y (0–1) e intensidad del puntero
    'const float LINES = 80.0;',
    // Degradado de marca a lo largo de la cinta (rgb + alfa)
    'vec4 brand(float u){',
    '  float g1 = mix(0.3, 0.15, uMobile);',
    '  vec4 c0 = vec4(70.0/255.0, 20.0/255.0, 80.0/255.0, 0.0);',
    '  vec4 c1 = vec4(110.0/255.0, 30.0/255.0, 110.0/255.0, mix(0.22, 0.45, uMobile));',
    '  vec4 c2 = vec4(190.0/255.0, 30.0/255.0, 95.0/255.0, 0.85);',
    '  vec4 c3 = vec4(232.0/255.0, 110.0/255.0, 60.0/255.0, 0.8);',
    '  vec4 c4 = vec4(170.0/255.0, 40.0/255.0, 110.0/255.0, 0.6);',
    '  if (u < g1) return mix(c0, c1, clamp(u / g1, 0.0, 1.0));',
    '  if (u < 0.5) return mix(c1, c2, (u - g1) / (0.5 - g1));',
    '  if (u < 0.75) return mix(c2, c3, (u - 0.5) / 0.25);',
    '  return mix(c3, c4, clamp((u - 0.75) / 0.25, 0.0, 1.0));',
    '}',
    'void main(){',
    '  vec2 px = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;',
    '  float W = uRes.x, H = uRes.y, s = uT;',
    '  float ah = uMobile > 0.5 ? min(H, max(420.0, W * 1.2)) : H;',
    '  float x0 = W * mix(0.2, -0.05, uMobile), x1 = W * 1.04;',
    '  float u = (px.x - x0) / (x1 - x0);',
    '  if (u < -0.02 || px.y > ah * 0.95) { gl_FragColor = vec4(0.0); return; }',
    '  float uc = clamp(u, 0.0, 1.0);',
    // Geometría: punta fina a la izquierda, cúpula a la derecha
    '  float taper = smoothstep(0.0, 0.6, uc) * (1.0 - 0.3 * smoothstep(0.78, 1.05, uc));',
    '  float wave = sin(uc * 3.1 + s * 0.42) * 0.045 + sin(uc * 5.3 - s * 0.31 + 1.7) * 0.022;',
    '  float nd = (uc - (uPtr.x - 0.08) / 0.96) / 0.18;',
    '  float pull = uPtr.z * (0.5 - uPtr.y) * 0.18 * exp(-nd * nd);',
    '  float cy = ah * mix(0.47, 0.36, uMobile) + ah * (wave - pull);',
    '  float th = ah * mix(0.34, 0.26, uMobile) * taper * (0.86 + 0.14 * sin(uc * 2.4 - s * 0.55));',
    '  float top = cy - th * (0.62 + 0.1 * sin(s * 0.5 + uc * 4.0));',
    '  float bot = cy + th * 0.38;',
    '  float span = max(bot - top, 0.001);',
    '  float f = (px.y - top) / span;',
    '  vec4 c = brand(uc);',
    '  vec3 col = vec3(0.0);',
    // Halo exterior y cuerpo luminoso (arriba más luz, abajo se apaga)
    '  float outD = max(max(top - px.y, px.y - bot), 0.0);',
    '  col += c.rgb * c.a * 0.22 * exp(-outD / (ah * 0.05)) * taper;',
    '  if (f >= 0.0 && f <= 1.0) {',
    '    col += c.rgb * c.a * (0.2 + 0.24 * (1.0 - smoothstep(0.0, 0.32, f)));',
    // Hilos de seda: 80 líneas finas que ondulan
    '    float wob = sin(uc * 9.0 + s * 0.9 + f * 5.0) * ah * 0.004 * (1.0 - f);',
    '    float spacing = span / (LINES - 1.0);',
    '    float ph = (px.y - wob - top) / spacing;',
    '    float d = abs(fract(ph + 0.5) - 0.5) * spacing;',
    '    float line = clamp(1.0 - d, 0.0, 1.0);',
    '    col += c.rgb * c.a * line * (0.07 + 0.2 * (1.0 - f) * (1.0 - f));',
    '  }',
    // Cresta: luz cálida fija + brillo que se desliza
    '  float dy = px.y - top;',
    '  float wStart = mix(0.42, 0.35, uMobile);',
    '  float warmA = smoothstep(wStart - 0.2, wStart, uc) * mix(0.55, 1.0, smoothstep(0.4, 0.8, uc));',
    '  float hd = (uc - uHot) / 0.13;',
    '  float hot = exp(-hd * hd);',
    '  float core = exp(-(dy * dy) / 1.2), mid = exp(-(dy * dy) / 12.0), wide = exp(-(dy * dy) / 80.0);',
    '  col += vec3(1.0, 0.8, 0.5) * warmA * (0.12 * wide + 0.4 * core) * taper;',
    '  col += vec3(1.0, 0.93, 0.75) * hot * (0.2 * wide + 0.4 * mid + 0.9 * core) * taper;',
    // Filo inferior tenue
    '  float db = px.y - bot;',
    '  col += c.rgb * c.a * 0.3 * exp(-db * db);',
    '  col = min(col, vec3(1.0));',
    '  gl_FragColor = vec4(col, max(col.r, max(col.g, col.b)));',
    '}'
  ].join('\n');

  var U = {};
  function initRibbon() {
    function compile(type, src) {
      var sh = gl.createShader(type); gl.shaderSource(sh, src); gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh));
      return sh;
    }
    var prog;
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    } catch (err) {
      docEl.classList.add('hero-static');
      if (window.console) console.warn('hero-fx: WebGL no disponible, se usa la imagen fija.', err);
      return false;
    }
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); // un triángulo que cubre todo
    var loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['uRes', 'uDpr', 'uT', 'uMobile', 'uHot', 'uPtr'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

    panel.insertBefore(canvas, panel.firstChild);
    return true;
  }
  if (ribbon) ribbon = initRibbon();

  var W = 0, H = 0, dpr = 1, mobile = false;
  var raf = 0, time = 0, last = 0, visible = true;
  // Calidad adaptativa: si un equipo no llega a ~50 fps, se baja la resolución
  // interna de la cinta (es suave, apenas se nota) antes que perder fluidez.
  var quality = 1, MIN_QUALITY = 0.4, sampleT = 0, sampleN = 0, warm = 0;

  function resize() {
    var r = panel.getBoundingClientRect();
    W = r.width; H = r.height; mobile = W < 700;
    dpr = Math.min(window.devicePixelRatio || 1, 2) * quality;
    if (ribbon) {
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
    }
    if (!raf) draw(time);
  }

  /* ---- Puntero (suavizado con muelle) ---- */
  var px = 0.62, py = 0.4, tx = 0.62, ty = 0.4, active = 0, tActive = 0, rx = 0, ry = 0;
  var ptrX = -1, ptrY = -1;
  if (finePointer && !reduced) {
    panel.addEventListener('pointermove', function (e) { ptrX = e.clientX; ptrY = e.clientY; tActive = 1; }, { passive: true });
    panel.addEventListener('pointerleave', function () { ptrX = -1; tActive = 0; tx = 0.62; ty = 0.4; });
  }

  function draw(t) {
    if (!ribbon) return;
    var s = t / 1000;
    var hot = mobile ? (s * 0.06) % 1.4 - 0.2 : 0.3 + (s * 0.05) % 1.0; // en escritorio, solo a la derecha del texto
    gl.uniform2f(U.uRes, W, H);
    gl.uniform1f(U.uDpr, dpr);
    gl.uniform1f(U.uT, s);
    gl.uniform1f(U.uMobile, mobile ? 1 : 0);
    gl.uniform1f(U.uHot, hot);
    gl.uniform3f(U.uPtr, px, py, active);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  /* ---- Bucle ---- */
  function frame(now) {
    var dt = last ? Math.min(64, now - last) : 16; last = now;
    time += dt;
    if (warm < 30) warm++;               // ignora los primeros fotogramas (carga)
    else if (ribbon && quality > MIN_QUALITY) {
      sampleT += dt; sampleN++;
      if (sampleN >= 45) {
        if (sampleT / sampleN > 20) { quality = Math.max(MIN_QUALITY, quality * 0.75); resize(); warm = 15; }
        sampleT = 0; sampleN = 0;
      }
    }
    if (ptrX >= 0) {                       // una sola lectura de layout por fotograma
      var r = panel.getBoundingClientRect();
      tx = (ptrX - r.left) / r.width; ty = (ptrY - r.top) / r.height;
    }
    var k = 1 - Math.pow(0.0025, dt / 1000);   // muelle independiente de los fps
    px += (tx - px) * k; py += (ty - py) * k; active += (tActive - active) * k;
    draw(time);
    if (iso) {
      var kk = Math.min(1, k * 1.4);
      var nrx = rx + ((0.5 - py) * 14 * active - rx) * kk;
      var nry = ry + ((px - 0.5) * 22 * active - ry) * kk;
      if (Math.abs(nrx - rx) > 0.003 || Math.abs(nry - ry) > 0.003) {   // sin escrituras de estilo si no cambia
        rx = nrx; ry = nry;
        iso.style.transform = 'perspective(1000px) rotateX(' + rx.toFixed(3) + 'deg) rotateY(' + ry.toFixed(3) + 'deg)';
      }
    }
    raf = requestAnimationFrame(frame);
  }
  // Sin cinta, el bucle solo hace falta para inclinar el isologo con el ratón
  function needsLoop() { return ribbon || (!!iso && finePointer); }
  function play() { if (!raf && !reduced && visible && !document.hidden && needsLoop()) { last = 0; raf = requestAnimationFrame(frame); } }
  function pause() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  canvas.addEventListener('webglcontextlost', function (e) {
    e.preventDefault(); ribbon = false; canvas.remove(); docEl.classList.add('hero-static');
    if (!needsLoop()) pause();
  });

  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(panel);
  else window.addEventListener('resize', resize);
  resize();
  if (reduced) { time = 9000; draw(time); }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; if (visible) play(); else pause(); }).observe(panel);
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden) pause(); else play(); });
  play();
})();
