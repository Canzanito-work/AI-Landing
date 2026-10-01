/* knowmad mood · web corporativa — comportamiento
 *
 * Variantes (equivalen a los «Tweaks» del prototipo), por parámetro de URL:
 *   ?hero=A|B                 titular del hero (A por defecto)
 *   ?cta=diagnostico|experto  texto del CTA en toda la página (apartado 4.12)
 *   ?pendientes=0             oculta los marcadores [PENDIENTE]
 *   ?form=error|success       fuerza un estado del formulario (QA / revisión)
 */
(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search);

  /* ---------- Copy dependiente de la versión del CTA ---------- */
  var COPY = {
    diagnostico: {
      cta: 'Solicitar diagnóstico de IA',
      closeText: 'En una sesión de diagnóstico, un experto en IA de knowmad mood analizará contigo la situación de tu organización e identificará las oportunidades de mayor impacto.',
      formTitle: 'Solicita una sesión de diagnóstico con un experto en IA',
      formText: 'Evaluaremos el punto de partida de tu organización e identificaremos las oportunidades de mayor impacto.',
      confirmEnd: 'la sesión de diagnóstico.'
    },
    experto: {
      cta: 'Hablar con un experto en IA',
      closeText: 'Un experto en IA de knowmad mood analizará contigo la situación de tu organización y las oportunidades de mayor impacto.',
      formTitle: 'Habla con un experto en IA',
      formText: 'Cuéntanos en qué punto está tu organización y te ayudaremos a identificar por dónde empezar para generar impacto.',
      confirmEnd: 'una conversación.'
    }
  };

  function setText(selector, text) {
    document.querySelectorAll(selector).forEach(function (el) { el.textContent = text; });
  }

  var ctaVersion = params.get('cta') === 'experto' ? 'experto' : 'diagnostico';
  if (ctaVersion === 'experto') {
    var c = COPY.experto;
    setText('[data-cta]', c.cta);
    setText('[data-close-text]', c.closeText);
    setText('[data-form-title]', c.formTitle);
    setText('[data-form-text]', c.formText);
    setText('[data-confirm-end]', c.confirmEnd);
    document.querySelectorAll('[data-diag-only]').forEach(function (el) { el.hidden = true; });
  }

  /* ---------- Titular A/B ---------- */
  var heroVariant = (params.get('hero') || 'A').toUpperCase() === 'B' ? 'B' : 'A';
  document.querySelectorAll('[data-hero]').forEach(function (el) {
    el.hidden = el.getAttribute('data-hero') !== heroVariant;
  });

  /* ---------- Marcadores [PENDIENTE] ---------- */
  if (params.get('pendientes') === '0') document.documentElement.classList.add('no-pendientes');

  /* ---------- Formulario ---------- */
  var FREE_DOMAINS = ['gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.es', 'outlook.com', 'outlook.es', 'live.com', 'msn.com', 'yahoo.com', 'yahoo.es', 'icloud.com', 'me.com', 'aol.com', 'gmx.com', 'proton.me', 'protonmail.com'];
  var REQ = 'Este campo es obligatorio.';
  var MSG_CONSENT = 'Para enviar tu solicitud, acepta la política de privacidad.';
  var REQUIRED = ['nombre', 'email', 'empresa', 'cargo', 'area', 'consent'];

  var root = document.getElementById('km-form-diagnostico');
  if (root) initForm(root);

  function initForm(root) {
    var form = root.querySelector('form');
    var success = root.querySelector('.kmf__success');
    var area = form.elements.area;
    var touched = {};

    function value(name) {
      var el = form.elements[name];
      return el.type === 'checkbox' ? el.checked : String(el.value || '').trim();
    }

    function check(name) {
      var v = value(name);
      if (name === 'email') {
        if (!v) return REQ;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Introduce un email válido.';
        if (FREE_DOMAINS.indexOf(v.split('@')[1].toLowerCase()) !== -1) return 'Introduce tu email corporativo.';
        return '';
      }
      if (name === 'consent') return v ? '' : MSG_CONSENT;
      return v ? '' : REQ;
    }

    function showError(name, msg) {
      var el = form.elements[name];
      var err = document.getElementById('kmf-' + name + '-err');
      if (msg) el.setAttribute('aria-invalid', 'true'); else el.removeAttribute('aria-invalid');
      if (err) err.textContent = msg;
    }

    // Igual que el prototipo: un campo con error se revalida mientras se edita.
    REQUIRED.forEach(function (name) {
      var el = form.elements[name];
      var evt = (el.type === 'checkbox' || el.tagName === 'SELECT') ? 'change' : 'input';
      el.addEventListener(evt, function () {
        if (touched[name]) showError(name, check(name));
      });
    });

    function syncArea() { area.classList.toggle('is-filled', !!area.value); }
    area.addEventListener('change', syncArea);

    var radios = form.querySelectorAll('input[name="madurez"]');
    function syncRadios() {
      radios.forEach(function (r) { r.closest('.kmf__option').classList.toggle('is-checked', r.checked); });
    }
    radios.forEach(function (r) { r.addEventListener('change', syncRadios); });

    var toggle = form.querySelector('.kmf__rgpd-toggle');
    var rgpdBody = document.getElementById('kmf-rgpd-body');
    var rgpdIcon = toggle.querySelector('[data-rgpd-icon]');
    toggle.addEventListener('click', function () {
      var open = rgpdBody.hidden;
      rgpdBody.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      rgpdIcon.textContent = open ? '−' : '+';
    });

    function validateAll() {
      var firstInvalid = null;
      REQUIRED.forEach(function (name) {
        var msg = check(name);
        touched[name] = true;
        showError(name, msg);
        if (msg && !firstInvalid) firstInvalid = form.elements[name];
      });
      return firstInvalid;
    }

    function showSuccess() {
      var first = value('nombre').split(/\s+/)[0] || '{{nombre}}';
      root.querySelector('[data-success-name]').textContent = first;
      form.hidden = true;
      success.hidden = false;
    }

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var firstInvalid = validateAll();
      if (firstInvalid) { firstInvalid.focus(); return; }

      var data = Object.fromEntries(new FormData(form).entries());
      data.consent = true;
      data.ctaVersion = ctaVersion;
      data.heroVariant = heroVariant;
      // Punto de integración (HubSpot Forms API / CRM): escucha este evento o
      // sustituye este bloque por el envío real antes de mostrar la confirmación.
      root.dispatchEvent(new CustomEvent('kmf:submit', { detail: data, bubbles: true }));
      showSuccess();
      success.focus();
    });

    /* Estados forzados para revisión (equivalen al tweak «formState») */
    var state = params.get('form');
    if (state === 'error') {
      form.elements.nombre.value = 'Laura Martín';
      form.elements.email.value = 'laura.martin@gmail.com';
      form.elements.cargo.value = 'Directora de Operaciones';
      radios[1].checked = true;
      syncRadios();
      validateAll();
    } else if (state === 'success') {
      form.elements.nombre.value = 'Laura Martín';
      showSuccess();
    }
  }

  /* ---------- Compañías del grupo: filas en bucle ----------
   * Se duplica el contenido de cada fila (copia oculta a lectores de pantalla)
   * para que la animación CSS de -50% sea un bucle continuo. Con movimiento
   * reducido no se anima y la fila se puede desplazar a mano. */
  var reducedMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reducedMotion) {
    document.querySelectorAll('.cm-row').forEach(function (row) {
      var track = row.querySelector('.cm-track');
      Array.prototype.slice.call(track.children).forEach(function (li) {
        var copy = li.cloneNode(true);
        copy.setAttribute('aria-hidden', 'true');
        track.appendChild(copy);
      });
      row.classList.add('is-looping');
    });
  }

  /* ---------- Modelos de colaboración: tarjeta activa en táctil ----------
   * Sin hover, se destaca la tarjeta que cruza la franja central de la pantalla. */
  if (!reducedMotion && window.matchMedia && matchMedia('(hover: none)').matches && 'IntersectionObserver' in window) {
    var modelIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { e.target.classList.toggle('is-active', e.isIntersecting); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    document.querySelectorAll('.model').forEach(function (el) { modelIo.observe(el); });
  }

  /* ---------- Explorador de sectores ----------
   * Al elegir un sector, el panel de foco muestra su peso (con cifra animada),
   * su posición y sus clientes. Mientras nadie interactúa, recorre los sectores
   * solo: la línea de progreso de la fila activa marca el tiempo y, al terminar
   * su animación, pasa al siguiente. Se pausa con el ratón encima, con el foco
   * dentro o fuera de pantalla, y se detiene del todo cuando el usuario elige uno.
   * Con movimiento reducido no avanza solo. */
  var sx = document.querySelector('[data-sx]');
  if (sx) initSectors(sx);

  function initSectors(root) {
    var rows = Array.prototype.slice.call(root.querySelectorAll('.sx-row'));
    var spot = root.querySelector('.sx-spot');
    var el = function (sel) { return spot.querySelector(sel); };
    var title = el('[data-sx-title]'), num = el('[data-sx-num]'), pos = el('[data-sx-pos]');
    var value = el('[data-sx-value]'), meter = el('[data-sx-meter]'), clients = el('[data-sx-clients]');
    var share = function (row) { return parseFloat(row.getAttribute('data-share').replace(',', '.')); };
    var max = Math.max.apply(null, rows.map(share));
    var fmt = function (v) { return v.toFixed(1).replace('.', ','); };
    var current = 0, shown = share(rows[0]), countRaf = 0, swapTimer = 0;

    function countTo(target) {
      cancelAnimationFrame(countRaf);
      if (reducedMotion) { shown = target; value.textContent = fmt(target); return; }
      var from = shown, t0 = performance.now(), D = 750;
      (function step(now) {
        var k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3);
        shown = from + (target - from) * e;
        value.textContent = fmt(shown);
        if (k < 1) countRaf = requestAnimationFrame(step);
      })(t0);
    }

    function select(i) {
      if (i === current) return;
      rows[current].classList.remove('is-active');
      rows[current].setAttribute('aria-pressed', 'false');
      current = i;
      var row = rows[i];
      row.classList.add('is-active');
      row.setAttribute('aria-pressed', 'true');
      var n = String(i + 1).padStart(2, '0');
      meter.style.width = (share(row) / max * 100) + '%';
      countTo(share(row));
      spot.classList.add('is-swapping');
      clearTimeout(swapTimer);
      swapTimer = setTimeout(function () {
        title.textContent = row.querySelector('.sx-row__t').textContent;
        num.textContent = n; pos.textContent = n;
        clients.innerHTML = '';
        row.getAttribute('data-clients').split('|').forEach(function (c, k) {
          var li = document.createElement('li');
          li.textContent = c; li.style.setProperty('--i', k);
          clients.appendChild(li);
        });
        spot.classList.remove('is-swapping');
      }, reducedMotion ? 0 : 180);
    }

    // Elección del usuario: detiene el recorrido automático
    var stopped = reducedMotion;
    rows.forEach(function (row, i) {
      row.addEventListener('click', function () { stopped = true; root.classList.remove('is-cycling'); select(i); });
      row.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        rows[(i + d + rows.length) % rows.length].focus();
      });
    });

    if (stopped) return;
    // Recorrido automático sincronizado con la línea de progreso (animationend)
    root.addEventListener('animationend', function (e) {
      if (e.animationName !== 'sx-timer' || stopped) return;
      select((current + 1) % rows.length);
    });
    var hovering = false, focused = false, onScreen = false;
    function sync() {
      var run = !stopped && onScreen && !hovering && !focused;
      root.classList.toggle('is-cycling', !stopped);
      root.classList.toggle('is-paused', !run);
    }
    root.addEventListener('mouseenter', function () { hovering = true; sync(); });
    root.addEventListener('mouseleave', function () { hovering = false; sync(); });
    root.addEventListener('focusin', function () { focused = true; sync(); });
    root.addEventListener('focusout', function (e) { focused = root.contains(e.relatedTarget); sync(); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { onScreen = en[0].isIntersecting; sync(); }, { threshold: 0.35 }).observe(root);
    } else { onScreen = true; }
    sync();
  }

  /* ---------- Movimiento al hacer scroll ----------
   * La clase html.fx la añade el script en línea del <head> (salvo movimiento
   * reducido). Aquí se marcan los elementos al entrar y se alimentan las
   * variables CSS de los bloques [data-fx]. */
  window.__kmFx = true;
  var docEl = document.documentElement;
  if (docEl.classList.contains('fx')) {
    initReveal();
    initScrollFx();
  }

  function initReveal() {
    var items = document.querySelectorAll('[data-reveal], [data-reveal-group] > *');
    if (!('IntersectionObserver' in window)) { docEl.classList.remove('fx'); return; }
    var STEP = 90, MAX_DELAY = 540;
    var io = new IntersectionObserver(function (entries) {
      // Los elementos que entran a la vez se escalonan en orden de documento.
      var batch = entries.filter(function (e) { return e.isIntersecting; }).map(function (e) { return e.target; });
      batch.sort(function (a, b) { return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1; });
      batch.forEach(function (el, i) {
        io.unobserve(el);
        var delay = Math.min(i * STEP, MAX_DELAY);
        el.style.setProperty('--rd', delay + 'ms');
        el.classList.add('is-in');
        // Al terminar, se retira el estado de animación para que el elemento
        // recupere sus propias transiciones (p. ej. los hover de las tarjetas).
        setTimeout(function () {
          el.classList.add('is-revealed');
          el.style.removeProperty('--rd');
        }, delay + 1300);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
    items.forEach(function (el) { io.observe(el); });
  }

  function initScrollFx() {
    var els = Array.prototype.slice.call(document.querySelectorAll('[data-fx]'));
    if (!els.length) return;
    var clamp = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
    var smooth = function (t) { return t * t * (3 - 2 * t); };
    var ticking = false;

    function update() {
      ticking = false;
      var vh = window.innerHeight;
      var span = vh * 0.65; // distancia de scroll que dura cada transición
      els.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -vh || r.top > vh * 2) return;
        var enter = smooth(clamp((vh - r.top) / span));
        var leave = smooth(clamp(r.bottom / span));
        var pv = Math.max(-1, Math.min(1, -((r.top + r.height / 2) - vh / 2) / (vh / 2 + r.height / 2)));
        el.style.setProperty('--enter', enter.toFixed(4));
        el.style.setProperty('--leave', leave.toFixed(4));
        el.style.setProperty('--v', Math.min(enter, leave).toFixed(4));
        el.style.setProperty('--pv', pv.toFixed(4));
      });
    }
    function request() {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    update();
  }

  /* ---------- Barra CTA fija en móvil ----------
   * Aparece a partir del segundo pantallazo (cuando el hero sale de la vista)
   * y se oculta mientras el formulario está visible para no taparlo. */
  var bar = document.querySelector('[data-sticky-cta]');
  var hero = document.querySelector('.hero__panel');
  if (bar && hero && 'IntersectionObserver' in window) {
    var heroVisible = true;
    var formVisible = false;
    var update = function () {
      var show = !heroVisible && !formVisible;
      bar.classList.toggle('is-visible', show);
    };
    new IntersectionObserver(function (entries) {
      heroVisible = entries[0].isIntersecting; update();
    }).observe(hero);
    if (root) {
      new IntersectionObserver(function (entries) {
        formVisible = entries[0].isIntersecting; update();
      }).observe(root);
    }
  }
})();
