/* Juice: pequeños efectos con presupuesto. Nada es permanente: cada efecto se autolimpia.
   - pulso(el): squash & stretch breve sobre un elemento.
   - petalos(x, y, n): pétalos azules y amarillos desde un punto (máximo 40 vivos a la vez).
   - chispa(x, y): un destello de un solo golpe.
   - nota(grado) / racha(n): sonido de escala y el grado de la n-ésima acción seguida.
   - muelle(el, clase): reinicia una animación de entrada con rebote.
   Con prefers-reduced-motion no hay movimiento (pulso, pétalos y chispa no hacen nada).
   Además, un único detalle automático: en pareja, cuando los dos cursores se cruzan (menos de 40 px),
   una chispa y una nota, con enfriamiento de 8 s. Todo es tolerante a fallos. */
(function () {
  'use strict';

  var MAX_PETALOS = 40;
  var MAX_CHISPAS = 6;
  var COLORES = ['#1d4ed8', '#facc15', '#5b8ff0', '#e0a800', '#facc15', '#1d4ed8'];

  var capa = null;
  var vivos = 0;
  var chispasVivas = 0;

  function reducido() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }

  function numero(v, porDefecto) {
    v = Number(v);
    return isFinite(v) ? v : porDefecto;
  }

  /* Capa fija, sin interacción, donde viven los pétalos y las chispas. */
  function obtenerCapa() {
    if (capa && capa.parentNode) { return capa; }
    if (!document.body) { return null; }
    capa = document.createElement('div');
    capa.className = 'juice-capa';
    capa.setAttribute('aria-hidden', 'true');
    document.body.appendChild(capa);
    return capa;
  }

  function quitar(nodo) {
    try { if (nodo && nodo.parentNode) { nodo.parentNode.removeChild(nodo); } } catch (e) { /* nada */ }
  }

  /* Anima un nodo con la Web Animations API; devuelve false si no existe (entonces no se crea el efecto). */
  function puedeAnimar(nodo) { return !!(nodo && typeof nodo.animate === 'function'); }

  /* Termina un efecto: al acabar la animación y, por si el navegador la pausa, con un temporizador de seguridad. */
  function alAcabar(anim, ms, fn) {
    var hecho = false;
    function fin() { if (hecho) { return; } hecho = true; fn(); }
    try { anim.onfinish = fin; } catch (e) { /* nada */ }
    setTimeout(fin, ms + 250);
  }

  /* Squash & stretch de unos 160 ms. Usa la propiedad `scale`, que se suma al transform propio del elemento. */
  function pulso(el) {
    if (!el || reducido()) { return; }
    try {
      if (el.ownerSVGElement && el.style) {
        el.style.transformBox = 'fill-box';
        el.style.transformOrigin = 'center';
      }
      if (puedeAnimar(el)) {
        el.animate([
          { scale: '1 1' },
          { scale: '1.18 0.84', offset: 0.35 },
          { scale: '0.94 1.07', offset: 0.7 },
          { scale: '1 1' }
        ], { duration: 160, easing: 'ease-out' });
      } else if (el.classList) {
        el.classList.remove('juice-pulso');
        void el.getBoundingClientRect();
        el.classList.add('juice-pulso');
        setTimeout(function () { el.classList.remove('juice-pulso'); }, 200);
      }
    } catch (e) { /* nada */ }
  }

  /* Pétalos desde (x, y) en píxeles de ventana. Devuelve cuántos ha creado. */
  function petalos(x, y, n) {
    if (reducido()) { return 0; }
    x = numero(x, NaN);
    y = numero(y, NaN);
    if (isNaN(x) || isNaN(y)) { return 0; }
    n = Math.floor(numero(n, 10));
    if (n < 1) { return 0; }
    n = Math.min(n, MAX_PETALOS - vivos);
    if (n < 1) { return 0; }
    var c = obtenerCapa();
    if (!c) { return 0; }
    var creados = 0;
    for (var i = 0; i < n; i++) {
      var p = document.createElement('div');
      if (!puedeAnimar(p)) { return creados; }
      p.className = 'juice-petalo';
      p.style.background = COLORES[i % COLORES.length];
      c.appendChild(p);
      var ang = (-155 + Math.random() * 130) * Math.PI / 180; /* abanico hacia arriba */
      var vel = 110 + Math.random() * 190;
      var T = 0.9 + Math.random() * 0.5;
      var vx = Math.cos(ang) * vel;
      var vy = Math.sin(ang) * vel;
      var g = 420;
      var giro = (Math.random() < 0.5 ? -1 : 1) * (200 + Math.random() * 360);
      var cuadros = [];
      for (var k = 0; k <= 8; k++) {
        var f = k / 8;
        var s = T * f;
        cuadros.push({
          transform: 'translate(' + Math.round(x - 4 + vx * s) + 'px,' + Math.round(y - 6 + vy * s + 0.5 * g * s * s) + 'px) rotate(' + Math.round(giro * f) + 'deg)',
          opacity: f < 0.65 ? 1 : Math.max(0, 1 - (f - 0.65) / 0.35),
          offset: f
        });
      }
      vivos += 1;
      creados += 1;
      (function (nodo, dur) {
        try {
          var anim = nodo.animate(cuadros, { duration: dur, easing: 'linear', fill: 'forwards' });
          alAcabar(anim, dur, function () { quitar(nodo); vivos = Math.max(0, vivos - 1); });
        } catch (e) {
          quitar(nodo);
          vivos = Math.max(0, vivos - 1);
        }
      })(p, Math.round(T * 1000));
    }
    return creados;
  }

  /* Destello pequeño de un solo golpe (una estrella de cuatro puntas que crece y se apaga). */
  function chispa(x, y) {
    if (reducido() || chispasVivas >= MAX_CHISPAS) { return; }
    x = numero(x, NaN);
    y = numero(y, NaN);
    if (isNaN(x) || isNaN(y)) { return; }
    var c = obtenerCapa();
    if (!c) { return; }
    var e = document.createElement('div');
    if (!puedeAnimar(e)) { return; }
    e.className = 'juice-chispa';
    c.appendChild(e);
    chispasVivas += 1;
    var base = 'translate(' + Math.round(x - 11) + 'px,' + Math.round(y - 11) + 'px)';
    try {
      var anim = e.animate([
        { transform: base + ' scale(0.2) rotate(0deg)', opacity: 1 },
        { transform: base + ' scale(1.25) rotate(50deg)', opacity: 1, offset: 0.4 },
        { transform: base + ' scale(0.6) rotate(90deg)', opacity: 0 }
      ], { duration: 420, easing: 'ease-out', fill: 'forwards' });
      alAcabar(anim, 420, function () { quitar(e); chispasVivas = Math.max(0, chispasVivas - 1); });
    } catch (err) {
      quitar(e);
      chispasVivas = Math.max(0, chispasVivas - 1);
    }
  }

  function nota(grado) {
    try { if (window.Sonidos && typeof window.Sonidos.escala === 'function') { window.Sonidos.escala(grado); } } catch (e) { /* nada */ }
  }

  /* Grado de escala de la n-ésima acción seguida (0 = primera): sube ocho pasos y vuelve a empezar. */
  function racha(n) {
    n = Math.floor(numero(n, 0));
    if (n < 0) { n = 0; }
    return n % 8;
  }

  /* Reinicia una clase con animación de entrada (con rebote) para que se vea de nuevo. */
  function muelle(el, clase) {
    if (!el || !el.classList) { return; }
    clase = clase || 'juice-muelle';
    try {
      el.classList.remove(clase);
      void el.getBoundingClientRect();
      el.classList.add(clase);
    } catch (e) { /* nada */ }
  }

  /* ---- Único detalle automático: cursores cruzados en pareja ---- */
  var RADIO_CRUCE = 40;
  var ENFRIAMIENTO = 8000;
  var GRADO_CRUCE = 5;
  var mio = { x: 0, y: 0, ok: false };
  var otro = null;
  var ultimoCruce = -Infinity;
  var cursorPareja = null;

  function enPareja() {
    try { return !!(window.Sala && typeof window.Sala.hayCompanero === 'function' && window.Sala.hayCompanero()); } catch (e) { return false; }
  }

  function evaluarCruce(desdeMensaje) {
    if (!mio.ok || !otro || !enPareja()) { return; }
    if (!desdeMensaje) {
      /* Con el movimiento propio, el cursor ajeno solo cuenta mientras se ve (la sala lo oculta a los 4 s). */
      if (!cursorPareja) { cursorPareja = document.getElementById('cursor-pareja'); }
      if (!cursorPareja || cursorPareja.hidden) { return; }
    }
    var ahora = Date.now();
    if (ahora - ultimoCruce < ENFRIAMIENTO) { return; }
    var dx = mio.x - otro.x;
    var dy = mio.y - otro.y;
    if (dx * dx + dy * dy > RADIO_CRUCE * RADIO_CRUCE) { return; }
    ultimoCruce = ahora;
    chispa((mio.x + otro.x) / 2, (mio.y + otro.y) / 2);
    nota(GRADO_CRUCE);
  }

  var iniciado = false;
  function iniciar() {
    if (iniciado) { return; }
    iniciado = true;
    try {
      window.addEventListener('pointermove', function (ev) {
        if (!ev) { return; }
        mio.x = ev.clientX;
        mio.y = ev.clientY;
        mio.ok = true;
        if (otro) { evaluarCruce(false); }
      }, { passive: true });
      if (window.Sala && typeof window.Sala.alRecibir === 'function') {
        window.Sala.alRecibir('cursor', function (d) {
          if (!d || typeof d.x !== 'number' || typeof d.y !== 'number' || !isFinite(d.x) || !isFinite(d.y)) { return; }
          otro = { x: d.x * window.innerWidth, y: d.y * window.innerHeight };
          evaluarCruce(true);
        });
      }
    } catch (e) { /* nada */ }
  }

  window.Juice = { pulso: pulso, petalos: petalos, chispa: chispa, nota: nota, racha: racha, muelle: muelle, reducido: reducido };

  /* Sala se crea después que este archivo: se engancha cuando ya están todos los scripts. */
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', iniciar); } else { iniciar(); }
})();
