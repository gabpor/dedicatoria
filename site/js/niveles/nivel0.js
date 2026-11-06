/* Nivel 0 · Pornirea: el piloto habla en viñetas (clic en cualquier parte para avanzar); al terminar aparece la
   entrada de la contraseña-recuerdo, que arranca el motor y empieza la música. Después, el versículo no se "lee":
   se teje. Es un cordón de tres dobleces (hilo azul, hilo amarillo e hilo dorado) que se trenza arrastrando cada hilo,
   por turno, sobre el del centro (4 gestos). A medida que se trenza, las palabras del versículo se van tejiendo en la
   cinta del cordón hasta quedar legibles; al cerrarse el cordón, la flor se entrega con Logro (arrastrarla al ramo) y
   aparece "Mai departe".

   Con la otra persona conectada el trenzado es de los dos (el nivel no usaba Sala antes; solo se añade esto).
   Mensajes (todos con prefijo n0:, pequeños y validados al recibir):
     mueve {p,f}   estoy arrastrando el hilo del gesto p (0..3) y voy por la fracción f (0..1); como mucho unas 14 veces por segundo
     paso {p}      he completado el gesto: el cordón lleva p gestos (1..4)
     pide / estado {p}  quien llega tarde pide el estado y el que ya está lo responde
   Todo es idempotente: un paso que no supera lo que ya llevo se ignora; si llega uno por delante, se alcanza.
   Sin acompañante el trenzado funciona igual, en solitario.

   Todo el texto en rumano es un borrador que tiene que revisar alguien que hable el idioma. */
(function () {
  'use strict';

  /* Relojes pendientes del nivel: detener() los cancela todos para dejarlo limpio. */
  var relojes = [];
  var detenido = false; /* tras detener(), nada nuevo se programa hasta el siguiente iniciar() */
  var generacion = 0; /* cada iniciar() es una generación: lo que no se puede quitar (Sala.alCambiar) comprueba la suya */
  var alDetener = []; /* cosas que quitar al detener (suscripciones a la Sala) */

  function esperar(fn, ms) {
    if (detenido) { return 0; }
    var reloj = { tipo: 'espera', id: 0 };
    reloj.id = setTimeout(function () {
      var i = relojes.indexOf(reloj);
      if (i >= 0) { relojes.splice(i, 1); }
      fn();
    }, ms);
    relojes.push(reloj);
    return reloj.id;
  }

  function limpiarRelojes() {
    relojes.forEach(function (r) {
      if (r.tipo === 'cuadro') { cancelAnimationFrame(r.id); } else { clearTimeout(r.id); }
    });
    relojes = [];
  }

  /* Listeners en window: se guardan para quitarlos todos en detener(). */
  var escuchas = [];

  function escuchar(destino, tipo, fn) {
    if (detenido) { return; }
    destino.addEventListener(tipo, fn);
    escuchas.push({ destino: destino, tipo: tipo, fn: fn });
  }

  function dejarDeEscuchar(destino, tipo, fn) {
    escuchas = escuchas.filter(function (e) {
      if (e.destino === destino && e.tipo === tipo && e.fn === fn) {
        destino.removeEventListener(tipo, fn);
        return false;
      }
      return true;
    });
  }

  function quitarEscuchas() {
    escuchas.forEach(function (e) { e.destino.removeEventListener(e.tipo, e.fn); });
    escuchas = [];
  }

  /* Diálogo en curso (se cancela al detener). */
  var dialogo = null;

  /* La palabra no está en claro: solo su resumen SHA-256 (normalizada y con prefijo). */
  var PREFIJO = 'n0|';
  var HASH = 'b2ecc02cafb1d98cbbfe2de74f469c4abcbc439d9f054bcd3b2c6029bbe2fac7';

  /* Diálogo inicial: una viñeta detrás de otra. La última no pide clic y deja ver la entrada. */
  var DIALOGO = [
    'Salut! Mă ajuți să pornesc motorul?',
    'Drumul de la Valencia până la Bruxelles are aproape 1.700 de kilometri.',
    'Vreau să îl parcurgem împreună, oprindu-ne la fiecare etapă ca să-ți arăt câte ceva care ne aparține doar nouă.',
    'Se spune că mașinile vechi pornesc doar pentru cine le știe povestea.'
  ];

  var INDICII = [
    'Cuvântul este numele locului în care am fost împreună la prima noastră întâlnire.',
    'Era un restaurant, iar înăuntru atârna, legată de lanțuri, o mașinuță de curse.',
    'Uită-te la mașina de pe ecran: e chiar ea. Cuvântul are 7 litere și începe cu B.'
  ];
  var MSG_GOL = 'Scrie mai întâi un cuvânt.';
  var MSG_EROARE = 'Motorul tușește, dar nu pornește. Mai încearcă.';
  var MSG_PORNIT = 'Motorul a pornit. Drum bun.';

  /* ---------- El cordón de tres dobleces ---------- */

  /* Versículo (texto exacto, versión Cornilescu ya contrastada): NO se modifica. */
  var VERSICULO = {
    texto: 'Și dacă se scoală cineva asupra unuia, doi pot să-i stea împotrivă; și funia împletită în trei nu se rupe ușor.',
    ref: 'Ecleziastul 4:12'
  };
  var ID_LOGRO = 'cordon-trei-fire';
  var TITULO_LOGRO = 'Funia împletită';

  var HILOS = [
    { nombre: 'albastru', color: '#1d4ed8' },
    { nombre: 'galben', color: '#facc15' },
    { nombre: 'auriu', color: '#fff4c2' }
  ];
  var CONSIGNA_HILO = [
    'Firul albastru: trage-l spre mijloc.',
    'Firul galben: trage-l spre mijloc.',
    'Firul auriu: trage-l spre mijloc.'
  ];
  var MSG_TURNO_OTRA = 'Acum e rândul celuilalt.';
  var MSG_TURNO_MIO = 'E rândul tău.';
  var MSG_CERRADO = 'Funia s-a închis.';
  var ETIQUETA_ASA = ['Firul albastru', 'Firul galben', 'Firul auriu'];
  var AYUDA_ASA = ': apasă Enter ca să-l treci peste cel din mijloc';

  var PASOS = 4; /* gestos para cerrar el cordón */
  var LIENZO = { w: 760, h: 190 }; /* coincide con el viewBox del HTML */
  var CY = 95; /* eje del cordón */
  var SEPARA = 44; /* distancia entre hilos dentro de la trenza */
  var X0 = 120; /* donde empieza la trenza */
  var TRAMO = 120; /* ancho de cada cruce */
  var X_ANCLA = 62; /* nudo de la izquierda */
  var X_DERECHA = 700; /* extremo derecho donde se anudan los hilos al cerrar */
  var ABANICO = 60; /* separación de los hilos sueltos a la derecha */
  var UMBRAL = 0.55; /* a partir de qué fracción se completa el gesto al soltar */
  var TOQUE = 6; /* px: menos que esto es un toque, que cuenta como gesto completo */
  var INTERVALO_MOV = 70; /* ms entre mensajes de movimiento */
  var ESPERA_ESTADO = 3000;
  var CAIDA_REMOTA = 700; /* ms sin noticias del hilo que arrastra la otra persona: se suelta */
  var ESCALA_RESERVA = [0, 2, 4, 5]; /* grados si Juice no está */

  /* Plan del trenzado: en cada gesto, el hilo de un borde pasa sobre el del centro y se cambian de sitio;
     los bordes se alternan (arriba, abajo, arriba, abajo). Posición 0 = arriba, 1 = centro, 2 = abajo. */
  function posiciones(orden) {
    var p = [0, 0, 0];
    orden.forEach(function (hilo, pos) { p[hilo] = pos; });
    return p;
  }

  function planificar() {
    var orden = [0, 1, 2];
    var plan = [];
    for (var k = 0; k < PASOS; k++) {
      var borde = k % 2 === 0 ? 0 : 2;
      var mover = orden[borde];
      var socio = orden[1];
      var antes = posiciones(orden);
      orden[borde] = socio;
      orden[1] = mover;
      plan.push({ mover: mover, socio: socio, borde: borde, antes: antes, despues: posiciones(orden) });
    }
    return plan;
  }

  var PLAN = planificar();

  function r(n) { return Math.round(n * 100) / 100; }
  function numero(v) { return typeof v === 'number' && isFinite(v); }
  function entero(v, min, max) { return numero(v) && Math.floor(v) === v && v >= min && v <= max; }
  function limitar01(v) { return v < 0 ? 0 : (v > 1 ? 1 : v); }
  function yDe(pos) { return CY + (pos - 1) * SEPARA; }

  function trazoS(xa, ya, xb, yb) {
    var xm = r((xa + xb) / 2);
    return 'M' + r(xa) + ' ' + r(ya) + 'C' + xm + ' ' + r(ya) + ' ' + xm + ' ' + r(yb) + ' ' + r(xb) + ' ' + r(yb);
  }

  var SVG_NS = 'http://www.w3.org/2000/svg';
  function nodoSvg(nombre, atributos) {
    var n = document.createElementNS(SVG_NS, nombre);
    Object.keys(atributos || {}).forEach(function (k) { n.setAttribute(k, atributos[k]); });
    return n;
  }

  function sinMovimiento() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /* El logro se define una sola vez al cargar el archivo (y se comprueba de nuevo al iniciar, por si Logro llegó tarde). */
  var logroDefinido = false;
  function definirLogro() {
    if (logroDefinido || !window.Logro || typeof window.Logro.definir !== 'function') { return; }
    logroDefinido = true;
    window.Logro.definir(ID_LOGRO, { nivel: 0, flor: 0, titulo: TITULO_LOGRO, versiculo: { texto: VERSICULO.texto, ref: VERSICULO.ref } });
  }
  definirLogro();

  /* ---------- Pareja ---------- */
  function hayPareja() {
    var s = window.Sala;
    return !!(s && typeof s.hayCompanero === 'function' && s.hayCompanero());
  }

  function reiniciarClase(nodo, clase) {
    nodo.classList.remove(clase);
    void nodo.getBoundingClientRect();
    nodo.classList.add(clase);
  }

  function iniciar(seccion) {
    detenido = false;
    var miGeneracion = ++generacion;
    alDetener.forEach(function (quitar) { quitar(); });
    alDetener = [];
    function vivo() { return !detenido && miGeneracion === generacion; }
    definirLogro();

    var escena = seccion.querySelector('.escena');
    var tose = seccion.querySelector('.coche-tose');
    var acceso = seccion.querySelector('#n0-acceso');
    var pistaClic = seccion.querySelector('#n0-pista-clic');
    var formulario = seccion.querySelector('#n0-formular');
    var campo = seccion.querySelector('#n0-cuvant');
    var enviar = formulario.querySelector('button[type="submit"]');
    var mensaje = seccion.querySelector('#n0-mesaj');
    var vineta = seccion.querySelector('#n0-vineta-texto');
    var notas = seccion.querySelector('#n0-notas');
    var lista = seccion.querySelector('#n0-indicii');
    var botonIndicio = seccion.querySelector('#n0-indiciu');
    var cordon = seccion.querySelector('#n0-cordon');
    var lienzo = seccion.querySelector('#n0-hilos');
    var consigna = seccion.querySelector('#n0-consigna');
    var cinta = seccion.querySelector('#n0-cinta');
    var textoCinta = seccion.querySelector('#n0-texto');
    var refCinta = seccion.querySelector('#n0-ref');
    var botonContinua = seccion.querySelector('#n0-continua');

    var indiciosMostrados = 0;
    var fallos = 0;
    var resuelto = false;
    var dialogoActivo = true;
    var relojVineta = null;
    var relojSalida = null;

    /* Estado del cordón */
    var mostrado = false; /* el cordón ya está en pantalla */
    var paso = 0; /* gestos completados */
    var fracc = 0; /* fracción del gesto en curso (0..1) */
    var cierre = 0; /* 0 = hilos sueltos a la derecha, 1 = anudados */
    var animando = false; /* un gesto se está completando */
    var pendiente = 0; /* el paso más alto que sé que ha hecho la otra persona */
    var arrastre = null; /* { id, x0, y0, moved } mientras se arrastra el hilo con el puntero */
    var concedido = false;
    var quien = null; /* quién hizo el último gesto: 'yo' | 'otra' | null */
    var palabras = [];
    var visibles = 0;
    var segmentos = null; /* elementos SVG: { izq, abanico, tramos, nudo, asa } */
    var brillaK = -1;
    var ultimoEnvio = 0;
    var movPendiente = false;
    var esperandoEstado = false;
    var habiaPareja = hayPareja();
    var relojRemoto = 0;

    /* El piloto reacciona con un mensaje corto: viñeta sobre su cabeza (y el mismo texto para lectores de pantalla). */
    function hablar(texto, tipo, ms) {
      mensaje.textContent = texto;
      clearTimeout(relojVineta);
      clearTimeout(relojSalida);
      vineta.textContent = texto;
      vineta.className = tipo || '';
      void vineta.getBoundingClientRect();
      vineta.classList.add('visible');
      if (ms) { relojVineta = esperar(callar, ms); }
    }

    function callar() {
      vineta.classList.add('saliendo');
      relojSalida = esperar(function () { vineta.classList.remove('visible', 'saliendo'); }, 240);
    }

    function humo(ms) {
      escena.classList.add('humo-activo');
      esperar(function () { escena.classList.remove('humo-activo'); }, ms);
    }

    /* Termina el diálogo: la última viñeta se queda puesta y aparece la entrada de la palabra. */
    function mostrarAcceso() {
      dialogoActivo = false;
      pistaClic.hidden = true;
      acceso.hidden = false;
      acceso.classList.add('entra');
      campo.focus();
    }

    function pedirIndicio() {
      if (indiciosMostrados >= INDICII.length) { return; }
      var li = document.createElement('li');
      var etiqueta = document.createElement('b');
      etiqueta.textContent = 'Indiciu ' + (indiciosMostrados + 1) + '. ';
      li.appendChild(etiqueta);
      li.appendChild(document.createTextNode(INDICII[indiciosMostrados]));
      lista.appendChild(li);
      notas.hidden = false;
      indiciosMostrados += 1;
      botonIndicio.classList.remove('pulsa');
      if (indiciosMostrados >= INDICII.length) { botonIndicio.hidden = true; }
      campo.focus();
    }

    function fallar() {
      fallos += 1;
      hablar(MSG_EROARE, 'eroare', 3800);
      reiniciarClase(tose, 'tose');
      humo(1300);
      if (window.Sonidos) { window.Sonidos.intentar(); }
      campo.select();
      if (fallos >= 2 && indiciosMostrados === 0) { botonIndicio.classList.add('pulsa'); }
    }

    /* ---------- Mensajes con la otra persona ---------- */
    function emitir(tipo, datos) {
      var s = window.Sala;
      if (s && typeof s.emitir === 'function' && hayPareja()) { s.emitir('n0:' + tipo, datos); }
    }

    function recibir(tipo, fn) {
      var s = window.Sala;
      if (!s || typeof s.alRecibir !== 'function') { return; }
      var quitar = s.alRecibir('n0:' + tipo, function (datos) {
        if (vivo()) { fn(datos || {}); }
      });
      if (typeof quitar === 'function') { alDetener.push(quitar); }
    }

    /* ---------- Animación (un reloj de cuadro que detener() cancela) ---------- */
    function animar(ms, cuadro, fin) {
      if (detenido) { return; }
      if (sinMovimiento() || ms <= 0 || typeof requestAnimationFrame !== 'function') {
        cuadro(1);
        if (fin) { fin(); }
        return;
      }
      var inicio = null;
      var reloj = { tipo: 'cuadro', id: 0 };
      function marco(ahora) {
        if (inicio === null) { inicio = ahora; }
        var t = Math.min(1, (ahora - inicio) / ms);
        cuadro(t);
        if (t < 1) {
          reloj.id = requestAnimationFrame(marco);
        } else {
          var i = relojes.indexOf(reloj);
          if (i >= 0) { relojes.splice(i, 1); }
          if (fin) { fin(); }
        }
      }
      reloj.id = requestAnimationFrame(marco);
      relojes.push(reloj);
    }

    function suave(t) { return t * t * (3 - 2 * t); }

    /* ---------- Dibujo del cordón ---------- */
    function crearSegmento(color, redondo) {
      var g = nodoSvg('g', { 'class': 'n0-seg' });
      var borde = nodoSvg('path', { 'class': 'n0-hilo-borde' + (redondo ? ' n0-redondo' : '') });
      var cuerpo = nodoSvg('path', { 'class': 'n0-hilo-cuerpo' + (redondo ? ' n0-redondo' : ''), stroke: color });
      var trenza = nodoSvg('path', { 'class': 'n0-hilo-trenza' });
      g.appendChild(borde);
      g.appendChild(cuerpo);
      g.appendChild(trenza);
      return { g: g, caminos: [borde, cuerpo, trenza] };
    }

    function ponerD(seg, d) {
      seg.caminos.forEach(function (c) { c.setAttribute('d', d); });
      seg.g.removeAttribute('visibility');
    }

    function ocultar(seg) { seg.g.setAttribute('visibility', 'hidden'); }

    function construirCordon() {
      lienzo.textContent = '';
      segmentos = { izq: [], abanico: [], tramos: [], nudo: null, asa: null };

      /* Postes */
      lienzo.appendChild(nodoSvg('rect', { 'class': 'n0-poste', x: 22, y: 40, width: 16, height: 110, rx: 6 }));
      lienzo.appendChild(nodoSvg('rect', { 'class': 'n0-poste', x: 722, y: 40, width: 16, height: 110, rx: 6 }));

      var s, k;
      for (s = 0; s < 3; s++) {
        var izq = crearSegmento(HILOS[s].color, true);
        ponerD(izq, trazoS(X_ANCLA, CY, X0, yDe(s)));
        lienzo.appendChild(izq.g);
        segmentos.izq.push(izq);
      }
      for (s = 0; s < 3; s++) {
        var ab = crearSegmento(HILOS[s].color, true);
        lienzo.appendChild(ab.g);
        segmentos.abanico.push(ab);
      }
      /* Cada cruce: primero el hilo que no participa, luego el que pasa por debajo y por último el que pasa por encima. */
      for (k = 0; k < PASOS; k++) {
        var plan = PLAN[k];
        var libre = 3 - plan.mover - plan.socio;
        var orden = [libre, plan.socio, plan.mover];
        var fila = [null, null, null];
        orden.forEach(function (hilo) {
          var seg = crearSegmento(HILOS[hilo].color, false);
          lienzo.appendChild(seg.g);
          fila[hilo] = seg;
        });
        segmentos.tramos.push(fila);
      }

      lienzo.appendChild(nodoSvg('circle', { 'class': 'n0-ancla', cx: X_ANCLA, cy: CY, r: 13 }));
      segmentos.nudo = nodoSvg('circle', { 'class': 'n0-nudo', cx: X_DERECHA, cy: CY, r: 1 });
      lienzo.appendChild(segmentos.nudo);

      /* El asa: el extremo del hilo que toca mover. Zona de agarre grande y círculo visible. */
      var asa = nodoSvg('g', { 'class': 'n0-asa', role: 'button', tabindex: '0' });
      asa.appendChild(nodoSvg('circle', { 'class': 'n0-asa-zona', r: 30 }));
      asa.appendChild(nodoSvg('circle', { 'class': 'n0-asa-anillo', r: 21 }));
      asa.appendChild(nodoSvg('circle', { 'class': 'n0-asa-bola', r: 12 }));
      lienzo.appendChild(asa);
      segmentos.asa = asa;
      asa.addEventListener('pointerdown', alPulsarAsa);
      asa.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar') {
          if (ev.preventDefault) { ev.preventDefault(); }
          gestoLocal();
        }
      });
    }

    function pintar() {
      var yFin = [0, 0, 0];
      var k, s;
      for (k = 0; k < PASOS; k++) {
        var xa = X0 + k * TRAMO;
        for (s = 0; s < 3; s++) {
          var seg = segmentos.tramos[k][s];
          if (k > paso) { ocultar(seg); continue; }
          var ya = yDe(PLAN[k].antes[s]);
          var yb = yDe(PLAN[k].despues[s]);
          if (k === paso) { yb = ya + (yb - ya) * fracc; }
          ponerD(seg, trazoS(xa, ya, xa + TRAMO, yb));
          if (k === paso) { yFin[s] = yb; }
        }
      }
      if (paso >= PASOS) {
        for (s = 0; s < 3; s++) { yFin[s] = yDe(PLAN[PASOS - 1].despues[s]); }
      }
      var xFin = X0 + Math.min(paso + 1, PASOS) * TRAMO;
      for (s = 0; s < 3; s++) {
        var yFan = CY + ((yFin[s] - CY) / SEPARA) * ABANICO * (1 - cierre);
        ponerD(segmentos.abanico[s], trazoS(xFin, yFin[s], X_DERECHA, yFan));
      }
      segmentos.nudo.setAttribute('r', r(18 * cierre));

      /* El asa se queda en el extremo del hilo que toca; y el cruce en curso brilla. */
      var asa = segmentos.asa;
      if (paso >= PASOS) {
        asa.setAttribute('visibility', 'hidden');
        asa.setAttribute('tabindex', '-1');
      } else {
        var m = PLAN[paso].mover;
        asa.removeAttribute('visibility');
        asa.setAttribute('tabindex', '0');
        asa.setAttribute('transform', 'translate(' + r(xFin) + ' ' + r(yFin[m]) + ')');
        asa.querySelector('.n0-asa-bola').setAttribute('fill', HILOS[m].color);
        asa.setAttribute('aria-label', ETIQUETA_ASA[m] + AYUDA_ASA);
      }
      if (brillaK !== paso) {
        if (brillaK >= 0 && brillaK < PASOS) {
          segmentos.tramos[brillaK].forEach(function (sg) { sg.g.classList.remove('n0-brilla'); });
        }
        brillaK = paso;
        if (paso < PASOS) { segmentos.tramos[paso][PLAN[paso].mover].g.classList.add('n0-brilla'); }
      }
      tejer();
    }

    /* ---------- El versículo se teje en la cinta ---------- */
    function construirCinta() {
      textoCinta.textContent = '';
      palabras = [];
      VERSICULO.texto.split(' ').forEach(function (palabra, i) {
        var span = document.createElement('span');
        span.className = 'n0-pal';
        span.textContent = palabra;
        span.setAttribute('aria-hidden', 'true');
        span.style.setProperty('--hilo', HILOS[i % 3].color);
        textoCinta.appendChild(span);
        textoCinta.appendChild(document.createTextNode(' '));
        palabras.push(span);
      });
      refCinta.textContent = VERSICULO.ref;
      visibles = 0;
    }

    function tejer() {
      var avance = Math.min(1, (paso + (paso >= PASOS ? 0 : fracc)) / PASOS);
      var n = paso >= PASOS ? palabras.length : Math.floor(palabras.length * avance + 1e-9);
      if (n === visibles) { return; }
      var i;
      for (i = 0; i < palabras.length; i++) {
        var tejida = i < n;
        var ya = palabras[i].classList.contains('n0-tejida');
        if (tejida && !ya) { palabras[i].classList.add('n0-tejida'); palabras[i].removeAttribute('aria-hidden'); }
        if (!tejida && ya) { palabras[i].classList.remove('n0-tejida'); palabras[i].setAttribute('aria-hidden', 'true'); }
      }
      visibles = n;
    }

    function actualizarConsigna() {
      if (paso >= PASOS) { consigna.textContent = MSG_CERRADO; return; }
      var t = CONSIGNA_HILO[PLAN[paso].mover];
      if (hayPareja() && quien) { t += ' ' + (quien === 'yo' ? MSG_TURNO_OTRA : MSG_TURNO_MIO); }
      consigna.textContent = t;
    }

    /* ---------- Sonido y efecto de cada gesto (1 + 1) ---------- */
    function sonarGesto(n) {
      var J = window.Juice;
      var S = window.Sonidos;
      if (J && typeof J.nota === 'function' && typeof J.racha === 'function') { J.nota(J.racha(n)); }
      else if (S && typeof S.escala === 'function') { S.escala(ESCALA_RESERVA[(n - 1) % ESCALA_RESERVA.length]); }
      else if (S && typeof S.encaje === 'function') { S.encaje(); }
      if (J && typeof J.pulso === 'function') { J.pulso(lienzo); }
    }

    function puntoPantalla(x, y) {
      var rc = lienzo.getBoundingClientRect();
      var ancho = rc.width || LIENZO.w;
      var alto = rc.height || LIENZO.h;
      var escala = Math.min(ancho / LIENZO.w, alto / LIENZO.h) || 1;
      return {
        x: (rc.left || 0) + (ancho - LIENZO.w * escala) / 2 + x * escala,
        y: (rc.top || 0) + (alto - LIENZO.h * escala) / 2 + y * escala
      };
    }

    /* ---------- Gestos ---------- */
    function emitirMovimiento() {
      if (!hayPareja()) { return; }
      var espera = INTERVALO_MOV - (Date.now() - ultimoEnvio);
      if (espera > 0) {
        if (!movPendiente) {
          movPendiente = true;
          esperar(function () { movPendiente = false; if (arrastre) { emitirMovimiento(); } }, espera);
        }
        return;
      }
      ultimoEnvio = Date.now();
      emitir('mueve', { p: paso, f: r(fracc) });
    }

    /* Completa el gesto en curso desde la fracción actual. modo: 'local' | 'remoto'. */
    function completar(modo) {
      if (animando || paso >= PASOS) { return; }
      animando = true;
      var desde = fracc;
      var destino = paso + 1;
      animar(modo === 'local' ? 320 : 420, function (t) {
        fracc = desde + (1 - desde) * suave(t);
        pintar();
      }, function () {
        animando = false;
        paso = destino;
        fracc = 0;
        quien = modo === 'local' ? 'yo' : 'otra';
        if (modo === 'local') { emitir('paso', { p: paso }); }
        sonarGesto(paso);
        pintar();
        actualizarConsigna();
        if (paso >= PASOS) { cerrar(false); return; }
        seguirRemoto();
      });
    }

    /* Alcanza lo que la otra persona ya hizo (si va por delante). */
    function seguirRemoto() {
      if (!mostrado || animando || paso >= PASOS || pendiente <= paso) { return; }
      cancelarArrastre();
      if (pendiente > paso + 1) { fijarPaso(pendiente); return; }
      completar('remoto');
    }

    /* Salto sin animación ni sonido (al ponerse al día o llegar tarde). */
    function fijarPaso(n) {
      if (n <= paso || n > PASOS) { return; }
      paso = n;
      fracc = 0;
      pintar();
      actualizarConsigna();
      if (paso >= PASOS) { cerrar(true); }
    }

    function gestoLocal() {
      if (!mostrado || animando || paso >= PASOS || concedido) { return; }
      cancelarArrastre();
      completar('local');
    }

    function escalaLienzo() {
      var rc = lienzo.getBoundingClientRect();
      return Math.min((rc.width || LIENZO.w) / LIENZO.w, (rc.height || LIENZO.h) / LIENZO.h) || 1;
    }

    function alPulsarAsa(ev) {
      if (!mostrado || animando || paso >= PASOS) { return; }
      if (typeof ev.button === 'number' && ev.button > 0) { return; }
      if (ev.isPrimary === false) { return; }
      if (ev.preventDefault) { ev.preventDefault(); }
      cancelarArrastre();
      clearTimeout(relojRemoto);
      arrastre = { id: ev.pointerId, x0: ev.clientX, y0: ev.clientY, moved: false, f0: fracc };
      segmentos.asa.classList.add('n0-agarrada');
      escuchar(window, 'pointermove', alMover);
      escuchar(window, 'pointerup', alSoltar);
      escuchar(window, 'pointercancel', alSoltar);
      escuchar(window, 'blur', alSoltar);
    }

    function mismoPuntero(ev) {
      return ev.pointerId === undefined || arrastre.id === undefined || ev.pointerId === arrastre.id;
    }

    function alMover(ev) {
      if (!arrastre || !mismoPuntero(ev)) { return; }
      if (ev.pointerType === 'mouse' && ev.buttons === 0) { alSoltar(ev); return; } /* el botón ya no está pulsado */
      var escala = escalaLienzo();
      var dx = ev.clientX - arrastre.x0;
      var dy = ev.clientY - arrastre.y0;
      if (Math.abs(dx) + Math.abs(dy) > TOQUE) { arrastre.moved = true; }
      var signo = PLAN[paso].borde === 0 ? 1 : -1; /* el hilo de arriba baja; el de abajo sube */
      fracc = limitar01((dy / escala) * signo / SEPARA);
      pintar();
      emitirMovimiento();
    }

    function alSoltar(ev) {
      if (!arrastre) { return; }
      if (ev && ev.type !== 'blur' && !mismoPuntero(ev)) { return; }
      var a = arrastre;
      var cancelado = !!ev && (ev.type === 'blur' || ev.type === 'pointercancel');
      cancelarArrastre();
      if (!cancelado && (!a.moved || fracc >= UMBRAL)) {
        completar('local');
      } else {
        volverAtras();
      }
    }

    function cancelarArrastre() {
      if (!arrastre) { return; }
      arrastre = null;
      if (segmentos && segmentos.asa) { segmentos.asa.classList.remove('n0-agarrada'); }
      dejarDeEscuchar(window, 'pointermove', alMover);
      dejarDeEscuchar(window, 'pointerup', alSoltar);
      dejarDeEscuchar(window, 'pointercancel', alSoltar);
      dejarDeEscuchar(window, 'blur', alSoltar);
    }

    /* El hilo vuelve a su sitio si se soltó antes de tiempo. */
    function volverAtras() {
      var desde = fracc;
      if (desde <= 0) { emitir('mueve', { p: paso, f: 0 }); return; }
      animar(200, function (t) { fracc = desde * (1 - suave(t)); pintar(); }, function () {
        fracc = 0;
        pintar();
        emitir('mueve', { p: paso, f: 0 });
      });
    }

    /* ---------- Cierre del cordón y entrega del logro ---------- */
    function cerrar(rapido) {
      if (concedido) { return; }
      concedido = true;
      cancelarArrastre();
      cinta.classList.add('n0-completa');
      refCinta.classList.add('n0-visible');
      mensaje.textContent = VERSICULO.texto + ' ' + VERSICULO.ref;
      consigna.textContent = MSG_CERRADO;
      animar(rapido ? 0 : 800, function (t) { cierre = suave(t); pintar(); }, function () {
        cierre = 1;
        pintar();
        if (!rapido) {
          var punto = puntoPantalla(X_DERECHA, CY);
          if (window.Sonidos && typeof window.Sonidos.acierto === 'function') { window.Sonidos.acierto(); }
          if (window.Juice && typeof window.Juice.chispa === 'function') { window.Juice.chispa(punto.x, punto.y); }
        }
        /* Un respiro para leer el versículo ya tejido antes de entregar la flor. */
        esperar(entregar, rapido ? 400 : 1800);
      });
    }

    function entregar() {
      if (!vivo()) { return; }
      function seguir() {
        if (!vivo()) { return; }
        botonContinua.hidden = false;
        botonContinua.focus();
      }
      if (window.Logro && typeof window.Logro.conceder === 'function') {
        window.Logro.conceder(ID_LOGRO, { alTerminar: seguir });
      } else {
        window.Juego.florecer();
        seguir();
      }
    }

    function mostrarCordon() {
      mostrado = true;
      construirCinta();
      construirCordon();
      cordon.hidden = false;
      void cordon.getBoundingClientRect();
      cordon.classList.add('n0-entra');
      /* Si la otra persona ya había trenzado, se parte de ahí. */
      var previo = pendiente;
      pintar();
      actualizarConsigna();
      if (previo > 0) { fijarPaso(previo); }
      if (hayPareja()) { pedirEstado(); }
      if (paso < PASOS && typeof segmentos.asa.focus === 'function') { segmentos.asa.focus(); }
    }

    /* ---------- Mensajes recibidos ---------- */
    function pedirEstado() {
      if (esperandoEstado || !hayPareja()) { return; }
      esperandoEstado = true;
      emitir('pide', {});
      esperar(function () { esperandoEstado = false; }, ESPERA_ESTADO);
    }

    function aceptarPaso(n) {
      if (n > pendiente) { pendiente = n; }
      if (mostrado) { seguirRemoto(); }
    }

    recibir('paso', function (d) {
      if (!entero(d.p, 1, PASOS)) { return; }
      aceptarPaso(d.p);
    });

    recibir('mueve', function (d) {
      if (!mostrado || arrastre || animando || concedido) { return; }
      if (!entero(d.p, 0, PASOS - 1) || !numero(d.f) || d.f < 0 || d.f > 1) { return; }
      if (d.p !== paso) { return; } /* atrasado o adelantado: el paso decide */
      fracc = d.f;
      pintar();
      clearTimeout(relojRemoto);
      if (d.f > 0) {
        relojRemoto = esperar(function () {
          if (arrastre || animando || fracc <= 0) { return; }
          volverAtras();
        }, CAIDA_REMOTA);
      }
    });

    recibir('pide', function () {
      if (paso > 0 || pendiente > 0) { emitir('estado', { p: Math.max(paso, 0) }); }
    });

    recibir('estado', function (d) {
      if (!entero(d.p, 0, PASOS)) { return; }
      esperandoEstado = false;
      if (d.p > 0) { aceptarPaso(d.p); }
    });

    /* Si la otra persona entra, se le ofrece el estado: ella lo pide cuando llega a su cordón; yo lo pido si ya tengo el mío. */
    if (window.Sala && typeof window.Sala.alCambiar === 'function') {
      window.Sala.alCambiar(function () {
        if (!vivo()) { return; }
        var hay = hayPareja();
        if (hay === habiaPareja) { return; }
        habiaPareja = hay;
        if (hay && mostrado) { pedirEstado(); }
        if (mostrado) { actualizarConsigna(); }
      });
    }

    function arrancar() {
      resuelto = true;
      campo.disabled = true;
      enviar.disabled = true;
      botonIndicio.hidden = true;
      hablar(MSG_PORNIT, 'succes', 3000);

      /* Ahora sí "entras": aparece el rótulo del nivel. */
      window.Juego.mostrarHud();

      /* Dentro del gesto del usuario: así el navegador deja sonar el motor y la música.
         La música entra poco a poco cuando el motor ya ronronea. */
      if (window.Sonidos) { window.Sonidos.arrancar(); }
      if (window.Radio) { window.Radio.iniciar({ fundido: true, retraso: 1800, duracion: 3500 }); }

      escena.classList.add('encendida');
      reiniciarClase(tose, 'tose');
      humo(1700);

      notas.classList.add('fuera');
      esperar(function () { notas.hidden = true; }, 700);
      esperar(function () { escena.classList.add('rodando'); }, 1500);
      esperar(function () { acceso.classList.add('fuera'); }, 2600);
      esperar(function () {
        acceso.hidden = true;
        mostrarCordon();
      }, 3400);
    }

    formulario.addEventListener('submit', function (evento) {
      evento.preventDefault();
      if (resuelto) { return; }
      var palabra = window.Utiles.normalizar(campo.value);
      if (!palabra) { hablar(MSG_GOL, 'eroare', 3000); campo.focus(); return; }
      if (window.Utiles.sha256(PREFIJO + palabra) === HASH) { arrancar(); } else { fallar(); }
    });

    botonIndicio.addEventListener('click', pedirIndicio);

    botonContinua.addEventListener('click', function () {
      botonContinua.disabled = true;
      if (window.Sonidos) { window.Sonidos.alejarse(); }
      callar();
      cordon.classList.add('fuera');
      escena.classList.add('sale');
      esperar(function () { window.Juego.siguiente(); }, 1700);
    });

    /* Arranca la conversación poco después de entrar. */
    esperar(function () {
      if (!window.Dialogo) { mostrarAcceso(); return; }
      dialogo = window.Dialogo.reproducir(vineta, DIALOGO, { lector: mensaje, alTerminar: mostrarAcceso });
      esperar(function () { if (dialogoActivo) { pistaClic.hidden = false; } }, 2200);
    }, 900);
  }

  /* Deja el nivel limpio: sin temporizadores, listeners, suscripciones ni diálogo pendientes. Se puede llamar sin haber iniciado y varias veces. */
  function detener() {
    detenido = true;
    limpiarRelojes();
    quitarEscuchas();
    alDetener.forEach(function (quitar) { quitar(); });
    alDetener = [];
    if (dialogo && typeof dialogo.cancelar === 'function') { dialogo.cancelar(); }
    dialogo = null;
  }

  window.Juego.registrar(0, { iniciar: iniciar, detener: detener, ocultarHud: true });
})();
