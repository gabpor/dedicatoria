/* Gestor de niveles: navegación lineal (cada nivel se abre al superar el anterior) y ramo de flores del HUD.
   El ramo es un jarrón con nueve huecos en abanico; cada flor ganada (Logro.conceder, o Juego.florecer en los
   niveles sin migrar) se enciende en su hueco.
   Todo el texto en rumano es un borrador que tiene que revisar alguien que hable el idioma. */
(function () {
  'use strict';

  var NIVELES = [
    { titulo: 'Pornirea' },
    { titulo: 'Valencia' },
    { titulo: 'Barcelona' },
    { titulo: 'Lyon' },
    { titulo: 'Paris' },
    { titulo: 'Frontiera' },
    { titulo: 'Belgia' },
    { titulo: 'Bruxelles' }
  ];

  /* Una flor distinta por parada; la última (bicolor) lleva los colores de los dos. */
  var FLORES = [
    { petalo: '#facc15', sombra: '#e0a800', centro: '#0c1f5c' },
    { petalo: '#ef7a63', sombra: '#c4503f', centro: '#facc15' },
    { petalo: '#1d4ed8', sombra: '#0c1f5c', centro: '#facc15' },
    { petalo: '#f4a3b5', sombra: '#d9708c', centro: '#0c1f5c' },
    { petalo: '#a99be8', sombra: '#6f5fc4', centro: '#facc15' },
    { petalo: '#f5a04a', sombra: '#d4772a', centro: '#0c1f5c' },
    { petalo: '#5b8ff0', sombra: '#2f63e6', centro: '#fff4d6' },
    { petalo: '#5fc4b0', sombra: '#2f8f7d', centro: '#0c1f5c' },
    { bicolor: true }
  ];

  /* Hueco del abanico (0 = el de más a la izquierda, 4 = el centro) que ocupa cada flor:
     de fuera hacia dentro, y la bicolor (la última) en el centro. */
  var ORDEN_HUECO = [0, 8, 1, 7, 2, 6, 3, 5, 4];
  var RAMO_W = 170;
  var RAMO_H = 58;

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var modulos = {};
  var actual = -1;
  var floresCogidas = 0;
  var encendidas = [];
  var huecos = [];
  var ramoSvg = null;
  var hudOculto = true;

  function el(id) { return document.getElementById(id); }
  function seccion(id) { return el('nivel-' + id); }

  function registrar(id, modulo) { modulos[id] = modulo; }

  /* El botón de la guantera aparece con la primera flor y se esconde junto al resto del HUD. */
  function actualizarGuantera() {
    var b = el('hud-guantera');
    if (!b) { return; }
    b.hidden = floresCogidas < 1;
    b.classList.toggle('oculto', hudOculto);
  }

  function actualizarHud(id) {
    el('hud-numero').textContent = 'Nivelul ' + id;
    el('hud-titulo').textContent = NIVELES[id].titulo;
    /* Un nivel puede pedir que el rótulo no se vea hasta que "se entre" (ver mostrarHud). */
    var oculto = !!(modulos[id] && modulos[id].ocultarHud);
    el('hud-nivel').classList.toggle('oculto', oculto);
    el('hud-flores').classList.toggle('oculto', oculto);
    hudOculto = oculto;
    actualizarGuantera();
  }

  function mostrarHud() {
    el('hud-nivel').classList.remove('oculto');
    el('hud-flores').classList.remove('oculto');
    hudOculto = false;
    actualizarGuantera();
  }

  /* Pantalla provisional para los niveles que aún no existen. */
  function crearProvisional(id) {
    var s = document.createElement('section');
    s.className = 'nivel';
    s.id = 'nivel-' + id;
    s.style.background = '#0c1f5c';
    var panel = document.createElement('div');
    panel.className = 'panel';
    var h = document.createElement('h1');
    h.textContent = NIVELES[id].titulo;
    var p = document.createElement('p');
    p.textContent = 'Această oprire este încă în pregătire.';
    panel.appendChild(h);
    panel.appendChild(p);
    s.appendChild(panel);
    el('juego').appendChild(s);
    return s;
  }

  var destino = -1; /* nivel al que se está yendo; mayor que `actual` mientras dura el fundido */

  function irA(id) {
    if (id < 0 || id >= NIVELES.length) { return; }
    if (id === destino) { return; } /* ya vamos hacia ahí: evita iniciar dos veces el mismo nivel */
    destino = id;
    var saliente = actual >= 0 ? seccion(actual) : null;

    function mostrar() {
      if (saliente) { saliente.classList.remove('activo', 'saliendo'); }
      if (actual >= 0 && modulos[actual] && typeof modulos[actual].detener === 'function') { modulos[actual].detener(); }
      /* Si se llega por un salto (la otra persona avanzó, o se retoma la partida), enciende las flores que falten:
         primero Logro enciende las suyas y archiva sus tarjetas; lo que quede se completa por cuenta. */
      if (floresCogidas < id) {
        if (window.Logro && typeof window.Logro.otorgarSilencioso === 'function') {
          try { window.Logro.otorgarSilencioso(id); } catch (e) { /* el ramo se completa igualmente */ }
        }
        while (floresCogidas < id) { if (!florecer(true)) { break; } }
      }
      var s = seccion(id) || crearProvisional(id);
      s.classList.add('activo', 'entrando');
      actual = id;
      actualizarHud(id);
      if (modulos[id] && typeof modulos[id].iniciar === 'function') { modulos[id].iniciar(s); }
      setTimeout(function () { s.classList.remove('entrando'); }, 1000);
    }

    if (saliente) {
      saliente.classList.add('saliendo');
      setTimeout(mostrar, 600);
    } else {
      mostrar();
    }
  }

  /* Avanzar es cosa de los dos: quien pulsa avisa a la otra persona y las dos pantallas cambian a la vez. */
  function siguiente() {
    if (destino > actual) { return; } /* ya se está cambiando de nivel */
    if (window.Sala && window.Sala.hayCompanero()) { window.Sala.emitir('avanzar', { desde: actual }); }
    irA(actual + 1);
  }

  /* Semilla del azar de cada nivel: igual en las dos pantallas (se fija la primera vez que se pide). */
  var semillas = {};
  function semilla(id) {
    if (semillas[id] === undefined) {
      var base = window.Sala ? window.Sala.semillaBase() : 0;
      semillas[id] = (Math.imul((base ^ Math.imul(id + 1, 2654435761)) >>> 0, 2246822519) >>> 0);
    }
    return semillas[id];
  }

  function nodoSvg(tag, atributos, padre) {
    var n = document.createElementNS(SVG_NS, tag);
    if (atributos) { Object.keys(atributos).forEach(function (k) { n.setAttribute(k, atributos[k]); }); }
    if (padre) { padre.appendChild(n); }
    return n;
  }

  /* Centro del hueco k del abanico, en coordenadas del ramo (170 x 58). */
  function centroHueco(k) {
    var u = (k - 4) / 4;
    return { x: 85 + (k - 4) * 17.2, y: 14 + 19 * u * u };
  }

  /* Dibuja en el HUD el ramo: un jarrón con un hueco por flor (vacío) que se va llenando al ganar cada una. */
  function construirFlores() {
    var caja = el('hud-flores');
    caja.textContent = '';
    huecos = [];
    encendidas = FLORES.map(function () { return false; });
    floresCogidas = 0;

    var svg = nodoSvg('svg', { viewBox: '0 0 ' + RAMO_W + ' ' + RAMO_H, 'class': 'ramo-svg', 'aria-hidden': 'true', focusable: 'false' });
    var defs = nodoSvg('defs', null, svg);
    var recorte = nodoSvg('clipPath', { id: 'ramo-vaso-clip' }, defs);
    var forma = 'M68 44H102C106 47 108 52 106 56Q105 58 103 58H67Q65 58 64 56C62 52 64 47 68 44Z';
    nodoSvg('path', { d: forma }, recorte);

    /* Los huecos se dibujan de fuera hacia dentro: el del centro (la flor bicolor) queda encima. */
    var orden = FLORES.map(function (_, i) { return i; }).sort(function (a, b) {
      var ka = ORDEN_HUECO[a] === undefined ? a : ORDEN_HUECO[a];
      var kb = ORDEN_HUECO[b] === undefined ? b : ORDEN_HUECO[b];
      return Math.abs(kb - 4) - Math.abs(ka - 4);
    });
    orden.forEach(function (i) {
      var datos = FLORES[i];
      var k = ORDEN_HUECO[i] === undefined ? i : ORDEN_HUECO[i];
      var c = centroHueco(k);
      var g = nodoSvg('g', { 'class': 'ramo-slot' }, svg);
      nodoSvg('path', {
        'class': 'ramo-tallo', pathLength: '100',
        d: 'M85 42Q' + (85 + (c.x - 85) * 0.5).toFixed(1) + ' ' + (c.y + (42 - c.y) * 0.55 - 6).toFixed(1) + ' ' + c.x.toFixed(1) + ' ' + c.y.toFixed(1)
      }, g);
      nodoSvg('circle', { 'class': 'ramo-hueco', cx: c.x.toFixed(1), cy: c.y.toFixed(1), r: '6.5' }, g);
      var pos = nodoSvg('g', { transform: 'translate(' + c.x.toFixed(1) + ' ' + c.y.toFixed(1) + ')' }, g);
      var cabeza = nodoSvg('g', { 'class': 'ramo-cabeza' }, pos);
      var uso = nodoSvg('use', { href: datos.bicolor ? '#cabeza-bi' : '#cabeza', transform: 'scale(' + (datos.bicolor ? '.2' : '.17') + ')' }, cabeza);
      if (!datos.bicolor) {
        uso.setAttribute('style', '--petalo:' + datos.petalo + ';--sombra:' + datos.sombra + ';--centro:' + datos.centro);
      }
      huecos[i] = { g: g, cx: c.x, cy: c.y };
    });

    /* Jarrón: cuerpo azul con banda amarilla, sombra a la derecha, borde oscuro y grano de impresión. */
    nodoSvg('path', { d: forma, fill: '#1d4ed8' }, svg);
    var vaso = nodoSvg('g', { 'clip-path': 'url(#ramo-vaso-clip)' }, svg);
    nodoSvg('path', { d: 'M88 44H110V58H88Z', fill: '#0c1f5c', opacity: '.3' }, vaso);
    nodoSvg('rect', { x: '60', y: '50', width: '50', height: '3.6', fill: '#facc15' }, vaso);
    nodoSvg('rect', { x: '60', y: '40', width: '50', height: '19', filter: 'url(#grano)', opacity: '.5', style: 'pointer-events:none' }, vaso);
    nodoSvg('rect', { x: '65', y: '40', width: '40', height: '6', rx: '3', fill: '#0c1f5c' }, svg);

    caja.appendChild(svg);
    ramoSvg = svg;
    caja.setAttribute('aria-label', 'Flori adunate: 0 din ' + FLORES.length);
    actualizarGuantera();
  }

  /* Enciende la flor `i` en su hueco del ramo (si no lo estaba). `rapido` la deja puesta sin animación. */
  function encenderFlor(i, rapido) {
    i = Math.floor(Number(i));
    if (!(i >= 0 && i < FLORES.length) || encendidas[i]) { return false; }
    encendidas[i] = true;
    floresCogidas += 1;
    if (huecos[i]) { huecos[i].g.setAttribute('class', 'ramo-slot encendida' + (rapido ? ' rapida' : '')); }
    el('hud-flores').setAttribute('aria-label', 'Flori adunate: ' + floresCogidas + ' din ' + FLORES.length);
    actualizarGuantera();
    return true;
  }

  /* Enciende la siguiente flor que falte (la del nivel superado), sin ceremonia. `rapido` la deja sin animación. */
  function florecer(rapido) {
    for (var i = 0; i < FLORES.length; i++) {
      if (!encendidas[i]) { return encenderFlor(i, rapido); }
    }
    return false;
  }

  function florEncendida(i) { return !!encendidas[Math.floor(Number(i))]; }

  function datosFlor(i) {
    var d = FLORES[Math.floor(Number(i))];
    return d ? JSON.parse(JSON.stringify(d)) : null;
  }

  function rectDe(nodo) {
    try {
      var r = nodo.getBoundingClientRect();
      return { x: r.left, y: r.top, w: r.width, h: r.height };
    } catch (e) { return { x: 0, y: 0, w: 0, h: 0 }; }
  }

  /* Rectángulo del ramo en el HUD, en píxeles de ventana: destino del arrastre de las flores. */
  function rectRamo() {
    var caja = el('hud-flores');
    return caja ? rectDe(caja) : { x: 0, y: 0, w: 0, h: 0 };
  }

  /* Rectángulo del hueco de la flor `i` dentro del ramo (si no hay dibujo, el ramo entero). */
  function rectFlor(i) {
    i = Math.floor(Number(i));
    var h = huecos[i];
    if (!h || !ramoSvg) { return rectRamo(); }
    var r = rectDe(ramoSvg);
    if (!(r.w > 0)) { return rectRamo(); }
    var k = r.w / RAMO_W;
    return { x: r.x + (h.cx - 8) * k, y: r.y + (h.cy - 8) * k, w: 16 * k, h: 16 * k };
  }

  /* Empieza el juego (tras el acceso). Si la otra persona ya está jugando, se une a su nivel. */
  function arrancar() {
    /* Para probar en local: ?nivel=3 salta a ese nivel con sus flores. Solo funciona en localhost. */
    var local = ['localhost', '127.0.0.1', ''].indexOf(window.location.hostname) >= 0;
    var inicio = local ? parseInt(new URLSearchParams(window.location.search).get('nivel'), 10) : NaN;
    if (isNaN(inicio) || inicio < 0 || inicio >= NIVELES.length) { inicio = 0; }

    if (window.Sala) {
      /* La otra persona avanza: la seguimos solo si estamos en el mismo nivel (evita saltos dobles). */
      window.Sala.alRecibir('avanzar', function (d) { if (d && d.desde === actual && destino <= actual) { irA(actual + 1); } });
      /* Si la otra persona aparece (o vuelve tras una caída), le decimos dónde estamos; si va por delante, la seguimos. */
      var habiaCompanero = window.Sala.hayCompanero();
      window.Sala.alCambiar(function (hay) {
        if (hay && !habiaCompanero && actual >= 0) { window.Sala.emitir('estado', { nivel: actual, semillas: semillas }); }
        habiaCompanero = hay;
      });
      window.Sala.alRecibir('estado', function (e) {
        if (!e || typeof e.nivel !== 'number' || actual < 0 || e.nivel <= actual || destino > actual) { return; }
        Object.keys(e.semillas || {}).forEach(function (k) { if (semillas[k] === undefined) { semillas[k] = e.semillas[k]; } });
        irA(e.nivel);
      });
      /* Alguien nuevo pregunta dónde estamos: respondemos con el nivel y las semillas. */
      window.Sala.alRecibir('hola', function () {
        if (actual >= 0) { window.Sala.emitir('estado', { nivel: actual, semillas: semillas }); }
      });
    }

    function empezar(nivel) {
      /* irA enciende las flores que falten (con Logro.otorgarSilencioso) al ponerse al día. */
      irA(nivel);
    }

    if (window.Sala && window.Sala.hayCompanero() && inicio === 0) {
      var respondido = false;
      var quitar = window.Sala.alRecibir('estado', function (e) {
        if (respondido || !e) { return; }
        respondido = true;
        quitar();
        Object.keys(e.semillas || {}).forEach(function (k) { semillas[k] = e.semillas[k]; });
        empezar(typeof e.nivel === 'number' ? e.nivel : 0);
        if (e.nivel > 0 && window.Radio) { window.Radio.iniciar({ fundido: true, duracion: 3000 }); }
      });
      window.Sala.emitir('hola', {});
      setTimeout(function () { if (!respondido) { respondido = true; quitar(); empezar(0); } }, 1500);
    } else {
      empezar(inicio);
    }
  }

  window.Juego = {
    registrar: registrar, irA: irA, siguiente: siguiente, florecer: florecer, mostrarHud: mostrarHud,
    semilla: semilla, arrancar: arrancar, nivel: function () { return actual; },
    rectRamo: rectRamo, rectFlor: rectFlor, encenderFlor: encenderFlor, florEncendida: florEncendida, datosFlor: datosFlor
  };

  document.addEventListener('DOMContentLoaded', function () {
    construirFlores();
    /* Primero el acceso (correo y contraseña); al entrar, empieza el juego. */
    window.Acceso.iniciar(arrancar);
  });
})();
