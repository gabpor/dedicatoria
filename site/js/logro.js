/* Logros: entrega de las flores del ramo y archivo de tarjetas en la guantera (el "torpedo" del coche).

   Un nivel registra sus logros con Logro.definir(id, {nivel, flor, titulo, versiculo}) y, cuando el reto y el objeto
   del versículo están completos, llama a Logro.conceder(id, {alTerminar}). La ceremonia:
     1. un aviso en la banda inferior (no tapa el centro) con el título y la flor grande flotando;
     2. la persona arrastra la flor al ramo del HUD (pointer events; con teclado, Enter o Espacio sobre la flor la manda sola);
     3. nota de la escala, pétalos y la flor se enciende en el ramo; el versículo (si hay) se archiva en la guantera;
     4. se llama a alTerminar UNA sola vez.
   En pareja cualquiera de los dos puede colocarla: se emite logro:puesta {id} y la otra pantalla ve la flor viajar
   sola al ramo. Sin acompañante (o sin window.Sala) todo es local. Con prefers-reduced-motion no hay vuelo ni
   pétalos: la flor aparece en el ramo.
   La guantera guarda las tarjetas (versículo, foto con imagen dataURL, recuerdo) solo en memoria: nada se persiste.

   Todo el texto en rumano es un borrador que tiene que revisar alguien que hable el idioma. */
(function () {
  'use strict';

  var TOTAL_FLORES = 9;
  var VUELO_MS = 650;
  var VUELTA_MS = 340;
  var TIPOS = ['foto', 'versiculo', 'recuerdo'];
  var ETIQUETAS_TIPO = { foto: 'Fotografie', versiculo: 'Verset', recuerdo: 'Amintire' };
  var MAX_IMAGEN = 12000000;

  var TXT = {
    guantera: 'Torpedoul',
    abrir: 'Deschide torpedoul',
    cerrar: 'Închide torpedoul',
    vacia: 'Torpedoul e încă gol. Aici se adună versetele, pozele și amintirile de pe drum.',
    etiqueta: 'O floare nouă',
    ayuda: 'Trage floarea în buchet.',
    ayudaTeclado: 'Sau apasă Enter pe floare.',
    ayudaAuto: 'Floarea pleacă singură în buchet.',
    florAria: 'O floare nouă: ',
    florAriaAyuda: '. Trage-o în buchet sau apasă Enter.',
    puesta: 'Floarea e în buchet: '
  };

  var defs = {};        /* id -> {id, nivel, flor, titulo, versiculo} */
  var concedidos = {};  /* id -> true: la flor ya se entregó (no se repite la ceremonia) */
  var remotas = {};     /* id -> true: la otra persona ya colocó esa flor */
  var cartas = [];      /* tarjetas de la guantera, en orden de llegada */
  var contadorCartas = 0;
  var activa = null;    /* ceremonia en curso */
  var cola = [];        /* ceremonias esperando su turno */
  var salaEnlazada = false;
  var botonEnlazado = false;

  /* ---------- Utilidades ---------- */

  function reducido() {
    try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }

  function el(id) { return document.getElementById(id); }

  function crear(tag, clase, texto) {
    var n = document.createElement(tag);
    if (clase) { n.className = clase; }
    if (texto) { n.textContent = texto; }
    return n;
  }

  function nodoSvg(tag, atributos, padre) {
    var n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    if (atributos) { Object.keys(atributos).forEach(function (k) { n.setAttribute(k, atributos[k]); }); }
    if (padre) { padre.appendChild(n); }
    return n;
  }

  function recorte(valor, max) { return String(valor === undefined || valor === null ? '' : valor).slice(0, max); }

  function llamar(fn) {
    if (typeof fn !== 'function') { return; }
    try { fn(); } catch (e) { if (window.console && console.error) { console.error(e); } }
  }

  function llamarLuego(fn) { if (typeof fn === 'function') { setTimeout(function () { llamar(fn); }, 0); } }

  function hayPareja() {
    try { return !!(window.Sala && typeof window.Sala.hayCompanero === 'function' && window.Sala.hayCompanero()); } catch (e) { return false; }
  }

  function emitir(tipo, datos) {
    try { if (hayPareja() && typeof window.Sala.emitir === 'function') { window.Sala.emitir(tipo, datos); } } catch (e) { /* nada */ }
  }

  function juice(nombre, a, b, c) {
    try { if (window.Juice && typeof window.Juice[nombre] === 'function') { return window.Juice[nombre](a, b, c); } } catch (e) { /* nada */ }
    return undefined;
  }

  function sonido(grado, vol) {
    try { if (window.Sonidos && typeof window.Sonidos.escala === 'function') { window.Sonidos.escala(grado, vol); } } catch (e) { /* nada */ }
  }

  function rectDe(nodo) {
    try {
      var r = nodo.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    } catch (e) { return { x: 0, y: 0, w: 0, h: 0 }; }
  }

  /* ---------- Definición de logros ---------- */

  function definir(id, d) {
    if (typeof id !== 'string' || !id || id.length > 40 || !d || typeof d !== 'object') { return false; }
    var flor = Math.floor(Number(d.flor));
    var nivel = Math.floor(Number(d.nivel));
    if (!(flor >= 0 && flor < TOTAL_FLORES) || !(nivel >= 0 && nivel <= 20)) { return false; }
    var v = null;
    if (d.versiculo && typeof d.versiculo === 'object' && typeof d.versiculo.texto === 'string' && d.versiculo.texto) {
      v = { texto: recorte(d.versiculo.texto, 600), ref: recorte(d.versiculo.ref, 80) };
    }
    defs[id] = { id: id, nivel: nivel, flor: flor, titulo: recorte(d.titulo, 80), versiculo: v };
    enlazarSala();
    enlazarBoton();
    return true;
  }

  /* ---------- Guantera: tarjetas ---------- */

  function guardar(c) {
    if (!c || typeof c !== 'object') { return false; }
    var carta = {
      id: (typeof c.id === 'string' && c.id) ? c.id.slice(0, 60) : 'c' + (++contadorCartas),
      tipo: TIPOS.indexOf(c.tipo) >= 0 ? c.tipo : 'recuerdo',
      titulo: recorte(c.titulo, 120),
      texto: recorte(c.texto, 800),
      ref: recorte(c.ref, 80),
      imagen: ''
    };
    if (typeof c.imagen === 'string' && c.imagen.length <= MAX_IMAGEN && /^data:image\/(png|jpeg|jpg|webp|gif);base64,/.test(c.imagen.slice(0, 40))) {
      carta.imagen = c.imagen;
    }
    var existente = -1;
    for (var i = 0; i < cartas.length; i++) { if (cartas[i].id === carta.id) { existente = i; break; } }
    if (existente >= 0) { cartas[existente] = carta; } else { cartas.push(carta); }
    refrescarContador();
    if (guantera && !guantera.raiz.hidden) { pintarGuantera(); }
    if (existente < 0) { juice('pulso', el('hud-guantera')); }
    return true;
  }

  function archivar(def) {
    if (!def || !def.versiculo) { return; }
    guardar({ id: 'v:' + def.id, tipo: 'versiculo', titulo: def.titulo, texto: def.versiculo.texto, ref: def.versiculo.ref });
  }

  function refrescarContador() {
    var cuenta = el('hud-guantera-cuenta');
    if (cuenta) {
      cuenta.textContent = String(cartas.length);
      cuenta.hidden = cartas.length === 0;
    }
    var b = el('hud-guantera');
    if (b) { b.setAttribute('aria-label', TXT.abrir + (cartas.length ? ' (' + cartas.length + ')' : '')); }
  }

  /* ---------- Guantera: panel ---------- */

  var guantera = null; /* {raiz, lista, cerrar} */
  var focoPrevio = null;

  function construirGuantera() {
    if (guantera) { return guantera; }
    if (!document.body) { return null; }
    var raiz = crear('div', 'guantera');
    raiz.id = 'guantera';
    raiz.hidden = true;
    var fondo = crear('div', 'guantera-fondo');
    var panel = crear('section', 'guantera-panel');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'guantera-titulo');
    panel.tabIndex = -1;
    var cab = crear('header', 'guantera-cabecera');
    var h = crear('h2', 'guantera-encabezado', TXT.guantera);
    h.id = 'guantera-titulo';
    var cerrar = crear('button', 'guantera-cerrar', '×');
    cerrar.type = 'button';
    cerrar.setAttribute('aria-label', TXT.cerrar);
    cab.appendChild(h);
    cab.appendChild(cerrar);
    var lista = crear('ul', 'guantera-lista');
    lista.tabIndex = 0;
    lista.setAttribute('aria-labelledby', 'guantera-titulo');
    panel.appendChild(cab);
    panel.appendChild(lista);
    raiz.appendChild(fondo);
    raiz.appendChild(panel);
    document.body.appendChild(raiz);

    fondo.addEventListener('click', function () { cerrarGuantera(); });
    cerrar.addEventListener('click', function () { cerrarGuantera(); });
    /* Lo que ocurre dentro de la guantera no debe llegar al nivel (p. ej. un clic que avance el diálogo). */
    raiz.addEventListener('click', function (ev) { ev.stopPropagation(); });
    guantera = { raiz: raiz, panel: panel, lista: lista, cerrar: cerrar };
    return guantera;
  }

  function pintarCarta(c) {
    var li = crear('li', 'guantera-carta guantera-carta-' + c.tipo);
    li.appendChild(crear('span', 'guantera-tipo', ETIQUETAS_TIPO[c.tipo] || ETIQUETAS_TIPO.recuerdo));
    if (c.imagen) {
      var img = document.createElement('img');
      img.className = 'guantera-foto';
      img.alt = c.titulo;
      img.src = c.imagen;
      li.appendChild(img);
    }
    if (c.titulo) { li.appendChild(crear('h3', 'guantera-nombre', c.titulo)); }
    if (c.texto) { li.appendChild(crear('p', 'guantera-texto', c.texto)); }
    if (c.ref) { li.appendChild(crear('p', 'guantera-ref', c.ref)); }
    return li;
  }

  function pintarGuantera() {
    var g = construirGuantera();
    if (!g) { return; }
    g.lista.textContent = '';
    if (!cartas.length) {
      g.lista.appendChild(crear('li', 'guantera-vacia', TXT.vacia));
      return;
    }
    cartas.forEach(function (c) { g.lista.appendChild(pintarCarta(c)); });
  }

  function alTeclaGuantera(ev) {
    if (!guantera || guantera.raiz.hidden) { return; }
    if (ev.key === 'Escape') {
      ev.preventDefault();
      ev.stopPropagation();
      cerrarGuantera();
      return;
    }
    if (ev.key === 'Tab') {
      /* El foco se queda dentro del panel: del último pasa al primero y al revés. */
      var orden = [guantera.cerrar, guantera.lista];
      var dentro = orden.indexOf(document.activeElement);
      var sig = dentro < 0 ? 0 : (dentro + (ev.shiftKey ? orden.length - 1 : 1)) % orden.length;
      ev.preventDefault();
      try { orden[sig].focus(); } catch (e) { /* nada */ }
    }
    /* Las demás teclas no deben llegar al nivel que hay debajo. */
    ev.stopPropagation();
  }

  function abrirGuantera() {
    var g = construirGuantera();
    if (!g || !g.raiz.hidden) { return; }
    focoPrevio = document.activeElement;
    pintarGuantera();
    g.raiz.hidden = false;
    document.addEventListener('keydown', alTeclaGuantera, true);
    try { g.cerrar.focus(); } catch (e) { /* nada */ }
    var b = el('hud-guantera');
    if (b) { b.setAttribute('aria-expanded', 'true'); }
  }

  function cerrarGuantera() {
    if (!guantera || guantera.raiz.hidden) { return; }
    guantera.raiz.hidden = true;
    document.removeEventListener('keydown', alTeclaGuantera, true);
    var b = el('hud-guantera');
    if (b) { b.setAttribute('aria-expanded', 'false'); }
    var f = focoPrevio;
    focoPrevio = null;
    try { if (f && typeof f.focus === 'function' && document.contains(f)) { f.focus(); } else if (b) { b.focus(); } } catch (e) { /* nada */ }
  }

  function enlazarBoton() {
    if (botonEnlazado) { return; }
    var b = el('hud-guantera');
    if (!b) { return; }
    botonEnlazado = true;
    b.addEventListener('click', function (ev) {
      ev.stopPropagation();
      if (guantera && !guantera.raiz.hidden) { cerrarGuantera(); } else { abrirGuantera(); }
    });
    refrescarContador();
  }

  /* ---------- Sala ---------- */

  function enlazarSala() {
    if (salaEnlazada || !window.Sala || typeof window.Sala.alRecibir !== 'function') { return; }
    salaEnlazada = true;
    try { window.Sala.alRecibir('logro:puesta', alPuestaRemota); } catch (e) { salaEnlazada = false; }
  }

  function alPuestaRemota(d) {
    if (!d || typeof d.id !== 'string' || !defs[d.id] || concedidos[d.id]) { return; }
    remotas[d.id] = true;
    if (activa && activa.id === d.id && activa.fase === 'esperando') { colocar(activa, true); }
  }

  /* ---------- Ceremonia ---------- */

  function encender(flor, rapido) {
    try {
      if (window.Juego && typeof window.Juego.encenderFlor === 'function') { return window.Juego.encenderFlor(flor, rapido); }
      if (window.Juego && typeof window.Juego.florecer === 'function') { window.Juego.florecer(rapido); return true; }
    } catch (e) { /* nada */ }
    return false;
  }

  function florYaEncendida(flor) {
    try { return !!(window.Juego && typeof window.Juego.florEncendida === 'function' && window.Juego.florEncendida(flor)); } catch (e) { return false; }
  }

  function centroFlor(flor) {
    var r = null;
    try { if (window.Juego && typeof window.Juego.rectFlor === 'function') { r = window.Juego.rectFlor(flor); } } catch (e) { r = null; }
    if (!r || !(r.w > 0)) {
      try { if (window.Juego && typeof window.Juego.rectRamo === 'function') { r = window.Juego.rectRamo(); } } catch (e2) { r = null; }
    }
    if (!r || !(r.w > 0)) { return { x: Math.round((window.innerWidth || 1024) / 2), y: 40 }; }
    return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  }

  function resaltarRamo(si) {
    var caja = el('hud-flores');
    if (caja && caja.classList) { caja.classList.toggle('ramo-objetivo', !!si); }
  }

  /* ¿Está la posición (centro de la flor) encima del ramo? Con un margen para no exigir precisión. */
  function dentroRamo(pos) {
    var r = null;
    try { r = window.Juego && typeof window.Juego.rectRamo === 'function' ? window.Juego.rectRamo() : null; } catch (e) { r = null; }
    if (!r || !(r.w > 0)) { r = { x: (window.innerWidth || 1024) / 2 - 90, y: 0, w: 180, h: 80 }; }
    var m = 18;
    return pos.x >= r.x - m && pos.x <= r.x + r.w + m && pos.y >= r.y - m && pos.y <= r.y + r.h + m;
  }

  function construirFlorSvg(flor) {
    var d = null;
    try { d = window.Juego && typeof window.Juego.datosFlor === 'function' ? window.Juego.datosFlor(flor) : null; } catch (e) { d = null; }
    if (!d) { d = { petalo: '#facc15', sombra: '#e0a800', centro: '#0c1f5c' }; }
    var svg = nodoSvg('svg', { viewBox: '-56 -56 112 152', 'class': 'logro-flor-svg', 'aria-hidden': 'true', focusable: 'false' });
    nodoSvg('path', { d: 'M0 40C-4 62 4 78 0 96', fill: 'none', stroke: '#2b6f62', 'stroke-width': '5', 'stroke-linecap': 'round' }, svg);
    nodoSvg('path', { d: 'M0 76C-24 72 -38 56 -36 40C-14 44 -2 56 0 76Z', fill: '#5aa88a' }, svg);
    nodoSvg('path', { d: 'M0 62C22 58 36 44 34 28C14 32 2 46 0 62Z', fill: '#5aa88a' }, svg);
    var uso = nodoSvg('use', { href: d.bicolor ? '#cabeza-bi' : '#cabeza' }, svg);
    if (!d.bicolor) { uso.setAttribute('style', '--petalo:' + d.petalo + ';--sombra:' + d.sombra + ';--centro:' + d.centro); }
    return svg;
  }

  function programar(c, fn, ms) {
    var id = setTimeout(function () { if (!c.cerrada) { fn(); } }, ms);
    c.timers.push(id);
  }

  function pintarFlor(c, escala) {
    if (!c.flor) { return; }
    c.flor.style.transform = 'translate3d(' + Math.round(c.pos.x) + 'px,' + Math.round(c.pos.y) + 'px,0)' + (escala ? ' scale(' + escala + ')' : '');
  }

  /* Posición de reposo de la flor: sobre la parte izquierda de la banda. */
  function casa(c) {
    var r = c.aviso ? rectDe(c.aviso) : { w: 0 };
    if (r.w > 0) { return { x: r.x + 58, y: r.y + 22 }; }
    return { x: Math.round((window.innerWidth || 1024) / 2 - 200), y: Math.round((window.innerHeight || 768) - 90) };
  }

  function alRedimensionar() {
    var c = activa;
    if (!c || c.cerrada || c.fase !== 'esperando' || c.drag) { return; }
    c.pos = casa(c);
    pintarFlor(c);
  }

  function construirUi(c) {
    var capa = crear('div', 'logro-capa');
    capa.id = 'logro-capa';
    var estado = crear('p', 'sr-only');
    estado.setAttribute('role', 'status');
    estado.setAttribute('aria-live', 'polite');
    var aviso = crear('div', 'logro-aviso');
    var cuerpo = crear('div', 'logro-cuerpo');
    cuerpo.appendChild(crear('p', 'logro-etiqueta', TXT.etiqueta));
    cuerpo.appendChild(crear('p', 'logro-titulo', c.def.titulo));
    cuerpo.appendChild(crear('p', 'logro-ayuda', c.auto ? TXT.ayudaAuto : TXT.ayuda + ' ' + TXT.ayudaTeclado));
    aviso.appendChild(cuerpo);
    var flor = crear('button', 'logro-flor');
    flor.type = 'button';
    flor.setAttribute('aria-label', TXT.florAria + c.def.titulo + TXT.florAriaAyuda);
    var aire = crear('span', 'logro-flor-aire');
    aire.appendChild(construirFlorSvg(c.def.flor));
    flor.appendChild(aire);
    capa.appendChild(estado);
    capa.appendChild(aviso);
    capa.appendChild(flor);
    document.body.appendChild(capa);
    capa.addEventListener('click', function (ev) { ev.stopPropagation(); });
    capa.addEventListener('keydown', function (ev) { ev.stopPropagation(); });
    c.capa = capa;
    c.aviso = aviso;
    c.cuerpo = cuerpo;
    c.flor = flor;
    c.estadoEl = estado;
    c.pos = casa(c);
    pintarFlor(c);
    estado.textContent = TXT.etiqueta + ': ' + c.def.titulo;
    if (!c.auto) { enlazarArrastre(c); }
  }

  function enlazarArrastre(c) {
    var flor = c.flor;

    flor.addEventListener('pointerdown', function (ev) {
      if (c.fase !== 'esperando' || c.cerrada) { return; }
      if (typeof ev.button === 'number' && ev.button !== 0) { return; }
      c.drag = { id: ev.pointerId, dx: ev.clientX - c.pos.x, dy: ev.clientY - c.pos.y, movido: false };
      try { flor.setPointerCapture(ev.pointerId); } catch (e) { /* nada */ }
      flor.classList.remove('logro-vuelve');
      flor.classList.add('logro-arrastrando');
      if (typeof ev.preventDefault === 'function') { ev.preventDefault(); }
    });

    flor.addEventListener('pointermove', function (ev) {
      var d = c.drag;
      if (!d || ev.pointerId !== d.id || c.fase !== 'esperando') { return; }
      var w = window.innerWidth || 1024;
      var h = window.innerHeight || 768;
      c.pos = { x: Math.max(0, Math.min(w, ev.clientX - d.dx)), y: Math.max(0, Math.min(h, ev.clientY - d.dy)) };
      d.movido = true;
      pintarFlor(c);
      resaltarRamo(dentroRamo(c.pos));
    });

    function soltar(ev, cancelado) {
      var d = c.drag;
      if (!d || (ev && ev.pointerId !== undefined && d.id !== undefined && ev.pointerId !== d.id)) { return; }
      c.drag = null;
      try { flor.releasePointerCapture(d.id); } catch (e) { /* nada */ }
      resaltarRamo(false);
      flor.classList.remove('logro-arrastrando');
      if (!cancelado && c.fase === 'esperando' && d.movido && dentroRamo(c.pos)) { colocar(c, false); } else { volver(c); }
    }
    flor.addEventListener('pointerup', function (ev) { soltar(ev, false); });
    flor.addEventListener('pointercancel', function (ev) { soltar(ev, true); });
    flor.addEventListener('lostpointercapture', function (ev) { soltar(ev, true); });

    /* Teclado: Enter o Espacio mandan la flor al ramo. */
    flor.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar') {
        ev.preventDefault();
        ev.stopPropagation();
        colocar(c, false);
      }
    });
    flor.addEventListener('keyup', function (ev) {
      if (ev.key === ' ' || ev.key === 'Spacebar') { ev.preventDefault(); }
    });
    /* Activación sin teclado físico (lector de pantalla): llega como clic con detail 0. Un clic de ratón sin arrastre solo recuerda que hay que arrastrar. */
    flor.addEventListener('click', function (ev) {
      if (ev.detail === 0) { colocar(c, false); } else { juice('pulso', flor); }
    });
  }

  function volver(c) {
    if (!c.flor || c.cerrada) { return; }
    c.pos = casa(c);
    if (!reducido()) {
      c.flor.classList.add('logro-vuelve');
      programar(c, function () { c.flor.classList.remove('logro-vuelve'); }, VUELTA_MS + 40);
    }
    pintarFlor(c);
  }

  function cancelarArrastre(c) {
    if (c.drag) {
      try { c.flor.releasePointerCapture(c.drag.id); } catch (e) { /* nada */ }
      c.drag = null;
    }
    resaltarRamo(false);
    if (c.flor) { c.flor.classList.remove('logro-arrastrando'); }
  }

  /* La flor va al ramo (la colocó esta persona, o la otra: auto). */
  function colocar(c, auto) {
    if (c.cerrada || c.fase !== 'esperando') { return; }
    c.fase = 'volando';
    cancelarArrastre(c);
    if (!auto) { emitir('logro:puesta', { id: c.id }); }
    if (reducido() || !c.flor) { llegar(c); return; }
    var destino = centroFlor(c.def.flor);
    c.flor.classList.remove('logro-vuelve');
    c.flor.classList.add('logro-vuela');
    c.pos = destino;
    pintarFlor(c, 0.2);
    programar(c, function () { llegar(c); }, VUELO_MS + 40);
  }

  /* La flor llega al ramo: se enciende, suena, caen pétalos y se archiva el versículo. */
  function llegar(c) {
    if (c.cerrada || c.fase === 'puesta') { return; }
    c.fase = 'puesta';
    concedidos[c.id] = true;
    var rapido = reducido();
    var centro = centroFlor(c.def.flor);
    if (c.flor && c.flor.parentNode) { c.flor.parentNode.removeChild(c.flor); }
    encender(c.def.flor, rapido);
    if (!rapido) { juice('petalos', centro.x, centro.y, 12); }
    sonido(c.def.flor);
    programar(c, function () { sonido(c.def.flor + 2); }, 110);
    if (c.estadoEl) { c.estadoEl.textContent = TXT.puesta + c.def.titulo; }
    archivar(c.def);
    if (c.aviso) {
      programar(c, function () { c.aviso.classList.add('logro-sale'); }, 300);
    }
    programar(c, function () { finalizar(c); }, rapido ? 120 : 620);
  }

  function limpiar(c) {
    c.cerrada = true;
    c.timers.forEach(function (t) { clearTimeout(t); });
    c.timers = [];
    cancelarArrastre(c);
    try { window.removeEventListener('resize', alRedimensionar); } catch (e) { /* nada */ }
    if (c.capa && c.capa.parentNode) { c.capa.parentNode.removeChild(c.capa); }
    c.capa = c.aviso = c.cuerpo = c.flor = c.estadoEl = null;
    try {
      var f = c.focoPrevio;
      if (f && typeof f.focus === 'function' && document.contains(f)) { f.focus(); }
    } catch (e2) { /* nada */ }
  }

  function finalizar(c) {
    var cbs = c.cbs;
    c.cbs = [];
    limpiar(c);
    if (activa === c) { activa = null; }
    cbs.forEach(llamar);
    procesarCola();
  }

  /* Se cancela sin llamar a alTerminar: el nivel ya no está. */
  function abortar(c) {
    c.cbs = [];
    limpiar(c);
    if (activa === c) { activa = null; }
  }

  function procesarCola() {
    if (activa || !cola.length) { return; }
    empezar(cola.shift());
  }

  function empezar(c) {
    activa = c;
    c.fase = 'esperando';
    c.auto = !!remotas[c.id];
    c.timers = [];
    c.cerrada = false;
    try { if (window.Juego && typeof window.Juego.mostrarHud === 'function') { window.Juego.mostrarHud(); } } catch (e) { /* nada */ }
    try {
      c.focoPrevio = document.activeElement;
      construirUi(c);
    } catch (e2) {
      /* Sin interfaz posible: se entrega la flor sin ceremonia. */
      c.fase = 'esperando';
      if (c.capa && c.capa.parentNode) { c.capa.parentNode.removeChild(c.capa); }
      c.capa = c.aviso = c.cuerpo = c.flor = c.estadoEl = null;
      llegar(c);
      return;
    }
    try { window.addEventListener('resize', alRedimensionar); } catch (e3) { /* nada */ }
    sonido(c.def.flor + 4, 0.04);
    if (c.auto) {
      programar(c, function () { colocar(c, true); }, reducido() ? 100 : 900);
    } else {
      try { c.flor.focus({ preventScroll: true }); } catch (e4) { /* nada */ }
    }
  }

  function conceder(id, opciones) {
    enlazarSala();
    enlazarBoton();
    var cb = opciones && typeof opciones.alTerminar === 'function' ? opciones.alTerminar : null;
    var def = typeof id === 'string' ? defs[id] : null;
    if (!def) { llamarLuego(cb); return false; }

    /* Ya entregada, o la flor ya está en el ramo por otro camino: sin ceremonia. */
    if (concedidos[id] || florYaEncendida(def.flor)) {
      concedidos[id] = true;
      archivar(def);
      llamarLuego(cb);
      return true;
    }

    /* Ya en curso o en cola: la devolución de llamada se suma a la misma ceremonia. */
    var pendiente = (activa && activa.id === id) ? activa : null;
    if (!pendiente) { cola.forEach(function (q) { if (q.id === id) { pendiente = q; } }); }
    if (pendiente) {
      if (cb) { pendiente.cbs.push(cb); }
      return true;
    }

    cola.push({ id: id, def: def, cbs: cb ? [cb] : [], fase: 'cola', timers: [], cerrada: false });
    procesarCola();
    return true;
  }

  /* Al saltar de nivel: enciende las flores y archiva las tarjetas de los logros anteriores, sin ceremonia. */
  function otorgarSilencioso(hastaNivel) {
    hastaNivel = Math.floor(Number(hastaNivel));
    if (!(hastaNivel > 0)) { return 0; }
    cola = cola.filter(function (q) { return !(q.def.nivel < hastaNivel); });
    if (activa && activa.def.nivel < hastaNivel) {
      var a = activa;
      abortar(a);
    }
    var lista = Object.keys(defs).map(function (k) { return defs[k]; })
      .filter(function (d) { return d.nivel < hastaNivel; })
      .sort(function (a, b) { return (a.nivel - b.nivel) || (a.flor - b.flor); });
    var n = 0;
    lista.forEach(function (d) {
      if (concedidos[d.id]) { return; }
      concedidos[d.id] = true;
      encender(d.flor, true);
      archivar(d);
      n += 1;
    });
    procesarCola();
    return n;
  }

  /* Solo lectura, para pruebas y depuración. */
  function tarjetas() { return cartas.map(function (c) { return { id: c.id, tipo: c.tipo, titulo: c.titulo, texto: c.texto, ref: c.ref, imagen: c.imagen }; }); }
  function concedido(id) { return !!concedidos[id]; }

  window.Logro = {
    definir: definir, conceder: conceder, guardar: guardar,
    abrirGuantera: abrirGuantera, cerrarGuantera: cerrarGuantera, otorgarSilencioso: otorgarSilencioso,
    tarjetas: tarjetas, concedido: concedido
  };

  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', enlazarBoton); } else { enlazarBoton(); }
})();
