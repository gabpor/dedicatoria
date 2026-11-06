/* Nivel 1 · Valencia: el coche llega y se detiene; el piloto presenta las 36 preguntas de Arthur Aron
   (Aron et al., 1997, «The Experimental Generation of Interpersonal Closeness») en tres seturi de 12, cada
   uno más personal que el anterior. Las preguntas son una BARAJA FÍSICA: tres mazos (I, II, III) sobre la mesa.
   Quien tiene el turno saca la carta de arriba, la lee en voz alta y, al cerrarla, el turno pasa a la otra
   persona. La web solo muestra las cartas y no guarda ninguna respuesta.

   Tipos de carta (según lo que pide cada pregunta; ver ESPECIALES):
     pregunta  (la mayoría): se lee y se responde hablando.
     tiempo    (nº 11, «patru minute»): reloj de arena con cronómetro, lo arranca quien tiene el turno, sin obligar.
     contador  (nº 8, 22 y 25): casillas que se tachan al pulsar.
     frase     (nº 26): frase a completar, con el hueco a la vista.
   Progreso: una carretera con el coche que avanza por cada carta cerrada y una bandera por set. Tras la 12.ª y
   la 24.ª hay una parada de descanso (no es un reto). Tras la 24.ª, además, una carta-sorpresa ligera que se
   responde hablando: su respuesta NO está en el código ni en pantalla.
   Al final, el versículo es un calendario cuyas hojas se desprenden solas; el texto queda escrito en la última.
   Después llega la flor (Logro.conceder) y el coche se va.

   Tiempo real (nivel 1). Un único contador monótono de ETAPAS (mesa, carta, mesa, carta, …, pausa, …, fin):
       n1:paso    {e}              se ha llegado a la etapa e (solo se acepta si e es mayor que la actual)
       n1:cuenta  {e, c}           casillas tachadas de la carta de la etapa e
       n1:reloj   {e, ms}          se ha arrancado el reloj de arena de la etapa e con ms por delante
       n1:pide    {}               quien entra tarde pregunta por el estado
       n1:estado  {e, c, ms}       respuesta a n1:pide
   Como e solo sube, los mensajes atrasados o repetidos se ignoran solos y no hace falta desempatar.
   Turno: alterna, empieza el id menor. Sin acompañante cualquiera saca y todo funciona igual.

   Texto fuente de las preguntas: ggia.berkeley.edu (36 Questions for Increasing Closeness), que atribuye
   el procedimiento a Aron, Melinat, Aron, Vallone y Bator (1997). La traducción al rumano de las preguntas es
   la ya existente. Todo el texto en rumano es un borrador que tiene que revisar alguien que hable el idioma. */
(function () {
  'use strict';

  var ID_LOGRO = 'n1-calendario';
  var VERSICULO = {
    texto: 'Astfel, Iacov a slujit șapte ani pentru Rahela; și anii aceștia i s-au părut ca vreo câteva zile, pentru că o iubea.',
    ref: 'Geneza 29:20'
  };

  /* Relojes pendientes del nivel: detener() los cancela todos para dejarlo limpio. */
  var relojes = [];
  var detenido = false; /* tras detener(), nada nuevo se programa hasta el siguiente iniciar() */

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

  /* Cancela una espera concreta (la que devolvió esperar). */
  function cancelarEspera(id) {
    if (!id) { return; }
    clearTimeout(id);
    relojes = relojes.filter(function (r) { return r.id !== id; });
  }

  function limpiarRelojes() {
    relojes.forEach(function (r) {
      if (r.tipo === 'cuadro') { cancelAnimationFrame(r.id); } else { clearTimeout(r.id); }
    });
    relojes = [];
  }

  /* Listeners de los elementos del nivel: se guardan para quitarlos todos en detener(). */
  var escuchas = [];

  function escuchar(destino, tipo, fn) {
    if (detenido || !destino) { return; }
    destino.addEventListener(tipo, fn);
    escuchas.push({ destino: destino, tipo: tipo, fn: fn });
  }

  function quitarEscuchas() {
    escuchas.forEach(function (e) { e.destino.removeEventListener(e.tipo, e.fn); });
    escuchas = [];
  }

  /* Diálogo y viñeta en curso (se cancelan al detener). */
  var dialogo = null;
  var habla = null;

  var DIALOGO = [
    'Valencia! Prima oprire de pe drumul nostru.',
    'Aici avem un joc de 36 de întrebări, făcut de psihologul Arthur Aron și colegii lui, ca două persoane să se apropie mai mult.',
    'Sunt trei pachete de cărți, tot mai personale. Pe rând, câte unul scoate o carte și o citește cu voce tare; răspundem amândoi, fără grabă.',
    'Noi ne cunoaștem deja. Hai să vedem ce mai putem descoperi.'
  ];

  var CIERRE = 'Am ajuns la capăt. Mulțumesc pentru toate răspunsurile.';

  /* Carta-sorpresa: pregunta ligera que se dice en voz alta. La respuesta la dice él hablando: aquí NO va. */
  var SORPRESA = 'Care crezi că este luna mea preferată din an?';

  var TEXTOS = {
    sorpresaEtiqueta: 'Carte-surpriză',
    sorpresaNota: 'O întrebare ușoară, ca să ieșim din adânc. Răspundeți cu voce tare.',
    pitTitulo: 'Pauză de drum',
    pit: [
      'Primul set e gata. Opriți-vă puțin: o cafea, brațele întinse, o respirație.',
      'Încă o oprire. Respirați puțin înainte de ultimul set.'
    ],
    relojPorneste: 'Pornește',
    relojDinNou: 'Din nou',
    relojGata: 'Timpul a trecut.',
    cartaGata: 'Gata',
    ultimaGata: 'Am terminat',
    continuam: 'Continuăm'
  };

  var SETURI = [
    {
      nombre: 'Setul I',
      intro: null,
      preguntas: [
        'Dacă ai putea alege pe oricine din lume, pe cine ai invita la cină?',
        'Ți-ar plăcea să fii o persoană faimoasă? În ce fel?',
        'Înainte de a da un telefon, îți repeți în gând ce vei spune? De ce?',
        'Cum ar arăta pentru tine o zi „perfectă”?',
        'Când ai cântat ultima dată doar pentru tine? Dar pentru altcineva?',
        'Dacă ai putea trăi până la 90 de ani și ai păstra, în ultimii 60 de ani, fie mintea, fie corpul unui om de 30 de ani, ce ai alege?',
        'Ai o presimțire secretă despre cum vei muri?',
        'Spuneți trei lucruri pe care pare că le aveți în comun.',
        'Pentru ce anume din viața ta simți cea mai mare recunoștință?',
        'Dacă ai putea schimba ceva din felul în care ai crescut, ce ai schimba?',
        'Luați patru minute și povestiți-vă, pe rând, povestea vieții, cât mai în detaliu.',
        'Dacă te-ai trezi mâine cu o calitate sau o abilitate în plus, la alegere, care ar fi aceasta?'
      ]
    },
    {
      nombre: 'Setul II',
      intro: 'Al doilea set. Mergem puțin mai adânc.',
      preguntas: [
        'Dacă un glob de cristal ți-ar putea spune adevărul despre tine, despre viața ta, despre viitor sau despre orice altceva, ce ai vrea să afli?',
        'Există ceva ce visezi de multă vreme să faci? De ce nu ai făcut-o încă?',
        'Care este cea mai mare realizare din viața ta?',
        'Ce prețuiești cel mai mult într-o prietenie?',
        'Care este cea mai prețioasă amintire a ta?',
        'Care este cea mai cumplită amintire a ta?',
        'Dacă ai ști că peste un an vei muri brusc, ai schimba ceva în felul în care trăiești acum? De ce?',
        'Ce înseamnă prietenia pentru tine?',
        'Ce rol au dragostea și afecțiunea în viața ta?',
        'Spuneți-vă, pe rând, câte o trăsătură pozitivă pe care o vedeți unul la altul, până ajungeți la cinci.',
        'Cât de unită și de caldă este familia ta? Simți că ai avut o copilărie mai fericită decât majoritatea oamenilor?',
        'Cum te simți în legătură cu relația ta cu mama ta?'
      ]
    },
    {
      nombre: 'Setul III',
      intro: 'Ultimul set, și cel mai personal. Fiți cât mai sinceri.',
      preguntas: [
        'Spuneți fiecare câte trei afirmații adevărate cu „noi”. De exemplu: „Noi doi, în clipa asta, simțim…”',
        'Completează fraza: „Mi-aș dori să am pe cineva cu care să împart…”',
        'Dacă ați deveni prieteni foarte apropiați, ce ar fi important să știți unul despre altul?',
        'Spuneți-vă ce vă place unul la altul. Fiți foarte sinceri și spuneți lucruri pe care poate nu le-ați spune cuiva pe care tocmai l-ați cunoscut.',
        'Povestiți-vă, pe rând, un moment jenant din viața voastră.',
        'Când ai plâns ultima dată în fața altcuiva? Dar fără să te vadă nimeni?',
        'Spuneți-vă ceva ce vă place deja unul la altul.',
        'Ce, dacă există ceva, este prea serios ca să se glumească pe seama lui?',
        'Dacă ai muri în seara asta, fără nicio șansă să mai vorbești cu cineva, ce ai regreta cel mai mult că nu i-ai spus cuiva? De ce nu i-ai spus încă?',
        'Casa ta, cu tot ce ai, ia foc. După ce ți-ai salvat cei dragi și animalele, mai ai timp pentru o ultimă fugă, în siguranță, ca să salvezi un singur obiect. Care ar fi acesta? De ce?',
        'Dintre toți oamenii din familia ta, a cui moarte ți s-ar părea cea mai greu de suportat? De ce?',
        'Povestește o problemă personală și cere sfatul persoanei de lângă tine: cum ar rezolva-o? Cere-i apoi să-ți spună cum i se pare că te simți în legătură cu problema aleasă.'
      ]
    }
  ];

  /* Las cartas que no son una simple pregunta, por su número de orden (1..36). */
  var ESPECIALES = {
    8: { tipo: 'contador', n: 3, nota: 'Bifați câte o căsuță pentru fiecare lucru găsit.' },
    11: { tipo: 'tiempo', seg: 240, nota: 'Cine are rândul pornește clepsidra. Nu e obligatoriu să așteptați sfârșitul.' },
    22: { tipo: 'contador', n: 5, nota: 'Bifați câte o căsuță pentru fiecare trăsătură spusă.' },
    25: { tipo: 'contador', n: 6, nota: 'Trei afirmații fiecare: bifați câte o căsuță pentru fiecare.' },
    26: { tipo: 'frase', nota: '' }
  };

  /* Lista plana: cada pregunta sabe a qué set pertenece, qué lugar ocupa dentro de él y de qué tipo es. */
  var PREGUNTAS = [];
  SETURI.forEach(function (set, s) {
    set.preguntas.forEach(function (texto, k) {
      var num = PREGUNTAS.length + 1;
      var esp = ESPECIALES[num] || { tipo: 'pregunta' };
      PREGUNTAS.push({
        num: num, texto: texto, set: s, lugar: k, de: set.preguntas.length,
        tipo: esp.tipo, n: esp.n || 0, seg: esp.seg || 0, nota: esp.nota || ''
      });
    });
  });
  var TOTAL = PREGUNTAS.length;

  /* Etapas de la partida, en orden. e (la etapa actual) solo sube. */
  var ETAPAS = [];
  PREGUNTAS.forEach(function (p, k) {
    ETAPAS.push({ t: 'mesa', k: k });
    ETAPAS.push({ t: 'carta', k: k });
    if (k === 11) { ETAPAS.push({ t: 'pit', n: 0 }); }
    if (k === 23) { ETAPAS.push({ t: 'pit', n: 1 }); ETAPAS.push({ t: 'sorpresa' }); }
  });
  ETAPAS.push({ t: 'fin' });
  var FIN = ETAPAS.length - 1;

  /* Para cada etapa: cuántas cartas están ya cerradas y cuántas se han sacado del montón. */
  var CERRADAS = [];
  var SACADAS = [];
  (function () {
    var cerradas = 0;
    var sacadas = 0;
    ETAPAS.forEach(function (et, i) {
      if (et.t === 'carta') { sacadas += 1; }
      CERRADAS[i] = cerradas;
      SACADAS[i] = sacadas;
      if (et.t === 'carta') { cerradas += 1; }
    });
    CERRADAS[FIN] = TOTAL;
    SACADAS[FIN] = TOTAL;
  })();

  var NUMEROS = ['I', 'II', 'III'];
  var LARGA = 110; /* a partir de tantos caracteres, la pregunta se escribe un poco más pequeña */
  var SALIDA_MS = 300; /* la carta se va antes de que aparezca la siguiente etapa */

  /* Carretera de progreso (viewBox 600x64): sinuosa, con las banderas de los sets sobre la línea base. */
  var RUTA = { x0: 24, x1: 576, base: 36, onda: 11, puntos: 48 };

  function puntoRuta(t) {
    var x = RUTA.x0 + (RUTA.x1 - RUTA.x0) * t;
    var y = RUTA.base + RUTA.onda * Math.sin(3 * Math.PI * t);
    var dy = RUTA.onda * 3 * Math.PI * Math.cos(3 * Math.PI * t) / (RUTA.x1 - RUTA.x0);
    return { x: x, y: y, ang: Math.atan(dy) * 180 / Math.PI };
  }

  function trazadoRuta() {
    var d = '';
    for (var i = 0; i <= RUTA.puntos; i++) {
      var p = puntoRuta(i / RUTA.puntos);
      d += (i === 0 ? 'M' : 'L') + p.x.toFixed(1) + ' ' + p.y.toFixed(1);
    }
    return d;
  }

  function redondear(n) { return Math.round(n * 10) / 10; }

  function sinMovimiento() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function reiniciarClase(nodo, clase) {
    nodo.classList.remove(clase);
    void nodo.getBoundingClientRect();
    nodo.classList.add(clase);
  }

  function vaciar(nodo) {
    while (nodo.firstChild) { nodo.removeChild(nodo.firstChild); }
  }

  function entero(n) { return typeof n === 'number' && isFinite(n) && Math.floor(n) === n; }

  function sonar(nombre) {
    if (window.Sonidos && typeof window.Sonidos[nombre] === 'function') { window.Sonidos[nombre](); }
  }

  /* Tiempo real */
  var sesion = null; /* { viva } de la partida en curso; detener() la marca como muerta */
  var limpiezas = []; /* funciones para dejar de escuchar a la Sala */

  function sala() { return window.Sala || null; }
  function conCompanero() { var s = sala(); return !!(s && s.hayCompanero()); }
  function emitir(tipo, datos) { var s = sala(); if (s && s.hayCompanero()) { s.emitir(tipo, datos); } }

  /* El logro se define al cargar el archivo (una sola vez); iniciar() lo reintenta por si Logro llegó después. */
  var logroDefinido = false;
  function definirLogro() {
    if (logroDefinido || !window.Logro || typeof window.Logro.definir !== 'function') { return; }
    window.Logro.definir(ID_LOGRO, {
      nivel: 1,
      flor: 1,
      titulo: 'Ca niște zile puține',
      versiculo: { texto: VERSICULO.texto, ref: VERSICULO.ref }
    });
    logroDefinido = true;
  }
  definirLogro();

  function iniciar(seccion) {
    detenido = false;
    definirLogro();
    var vida = { viva: true };
    sesion = vida;

    function q(id) { return seccion.querySelector('#' + id); }
    var escena = seccion.querySelector('.escena');
    var pistaClic = q('n1-pista-clic');
    var mensaje = q('n1-mesaj');
    var vineta = q('n1-vineta-texto');
    var mesa = q('n1-mesa');
    var ruta = q('n1-ruta');
    var rutaCoche = q('n1-ruta-coche');
    var rutaHecha = q('n1-ruta-hecha');
    var turno = q('n1-turno');
    var baraja = q('n1-baraja');
    var mazos = Array.prototype.slice.call(seccion.querySelectorAll('.n1-mazo'));
    var zona = q('n1-zona');
    var carta = q('n1-carta');
    var dorsoNum = q('n1-dorso-num');
    var etiqueta = q('n1-tipo');
    var pregunta = q('n1-pregunta');
    var nota = q('n1-nota');
    var contador = q('n1-contador');
    var casillas = q('n1-casillas');
    var cuentaTexto = q('n1-cuenta');
    var reloj = q('n1-reloj');
    var tiempo = q('n1-tiempo');
    var relojBoton = q('n1-reloj-boton');
    var botonCerrar = q('n1-cerrar');
    var pit = q('n1-pit');
    var pitTexto = q('n1-pit-texto');
    var pitContinua = q('n1-pit-continua');
    var calendario = q('n1-calendario');
    var calFinal = q('n1-cal-final');
    var calTexto = q('n1-cal-texto');
    var calRef = q('n1-cal-ref');
    var hojas = Array.prototype.slice.call(seccion.querySelectorAll('.n1-hoja'));
    var botonContinua = q('n1-continua');

    habla = window.Dialogo.hablante(vineta, mensaje);

    var e = 0; /* etapa actual */
    var intro = true; /* el piloto aún presenta el juego */
    var activo = false; /* la mesa ya está a la vista */
    var cuenta = 0; /* casillas tachadas de la carta en curso */
    var relojOn = false;
    var relojFin = 0;
    var relojTick = 0;
    var saliendo = false; /* la carta se está yendo hacia la etapa `destino` */
    var destino = 0;
    var esperandoEstado = false;
    var calendarioIniciado = false;
    var concedido = false;
    var salidaHecha = false;
    var dialogoActivo = true;

    /* ---- Estado derivado ---- */
    function cartaActual() { var et = ETAPAS[e]; return et.t === 'carta' ? PREGUNTAS[et.k] : null; }

    /* Turno: alterna con cada carta cerrada y empieza el id menor. Sin acompañante, cualquiera. */
    function puedoActuar() {
      var s = sala();
      var yo = s && s.yo && s.yo();
      var otro = s && s.companero && s.companero();
      if (!s || !s.hayCompanero() || !yo || !otro) { return true; }
      var empiezoYo = String(yo.id) < String(otro.id);
      return empiezoYo === (CERRADAS[e] % 2 === 0);
    }

    function setActual() {
      var et = ETAPAS[e];
      if (et.t === 'mesa' || et.t === 'carta') { return PREGUNTAS[et.k].set; }
      return -1;
    }

    /* ---- Pintado ---- */
    function pintarRuta() {
      var hechas = CERRADAS[e];
      var t = hechas / TOTAL;
      var p = puntoRuta(t);
      rutaCoche.style.transform = 'translate(' + redondear(p.x) + 'px,' + redondear(p.y) + 'px) rotate(' + redondear(p.ang) + 'deg)';
      rutaHecha.style.strokeDasharray = redondear(t * 100) + ' 100';
      ruta.setAttribute('aria-label', 'Drumul: ' + hechas + ' din ' + TOTAL + ' de întrebări');
    }

    function construirRuta() {
      var d = trazadoRuta();
      ['n1-ruta-asfalto', 'n1-ruta-hecha', 'n1-ruta-linea'].forEach(function (id) { q(id).setAttribute('d', d); });
      [1, 2, 3].forEach(function (n) {
        var p = puntoRuta(n / 3);
        q('n1-hito-' + n).setAttribute('transform', 'translate(' + redondear(p.x) + ' ' + redondear(p.y) + ')');
      });
    }

    function pintarBaraja() {
      var actual = setActual();
      var puedo = puedoActuar();
      mazos.forEach(function (mazo) {
        var s = Number(mazo.getAttribute('data-set'));
        var quedan = SETURI[s].preguntas.length - Math.max(0, Math.min(12, SACADAS[e] - 12 * s));
        var esActual = s === actual && quedan > 0;
        mazo.setAttribute('data-quedan', String(quedan));
        mazo.style.setProperty('--g', redondear(quedan * 1.2) + 'px');
        mazo.classList.toggle('actual', esActual);
        mazo.disabled = !(esActual && puedo);
        mazo.setAttribute('aria-label', SETURI[s].nombre + (quedan > 0 ? ': scoate o carte (au mai rămas ' + quedan + ')' : ': nu mai sunt cărți'));
        var cuantas = mazo.querySelector('.n1-mazo-quedan');
        if (cuantas) { cuantas.textContent = quedan > 0 ? String(quedan) : ''; }
      });
    }

    function pintarTurno() {
      var et = ETAPAS[e];
      var puedo = puedoActuar();
      var pareja = conCompanero();
      var texto = '';
      if (et.t === 'mesa') {
        var nombre = SETURI[PREGUNTAS[et.k].set].nombre;
        if (!pareja) { texto = 'Scoate o carte din ' + nombre + '.'; }
        else if (puedo) { texto = 'E rândul tău: scoate o carte din ' + nombre + '.'; }
        else { texto = 'E rândul celeilalte persoane să scoată o carte.'; }
      } else if (et.t === 'carta') {
        if (!pareja) { texto = 'Citiți cartea cu voce tare.'; }
        else if (puedo) { texto = 'Citește cartea cu voce tare.'; }
        else { texto = 'Cealaltă persoană citește cartea cu voce tare.'; }
      }
      turno.hidden = texto === '';
      turno.textContent = texto;
    }

    /* Texto de la carta; en la frase a completar, la parte entre „ ” se destaca y se deja el hueco a la vista. */
    function pintarTexto(pq) {
      vaciar(pregunta);
      if (pq.tipo === 'frase') {
        pq.texto.split(/(„[^”]*”)/).forEach(function (parte) {
          if (!parte) { return; }
          if (parte.charAt(0) === '„') {
            var span = document.createElement('span');
            span.className = 'n1-hueco-frase';
            span.textContent = parte;
            pregunta.appendChild(span);
          } else {
            pregunta.appendChild(document.createTextNode(parte));
          }
        });
        pregunta.className = 'n1-texto';
      } else {
        pregunta.textContent = pq.texto;
        pregunta.className = 'n1-texto' + (pq.texto.length > LARGA ? ' larga' : '');
      }
    }

    function formatoTiempo(ms) {
      var s = Math.max(0, Math.ceil(ms / 1000));
      var seg = s % 60;
      return Math.floor(s / 60) + ':' + (seg < 10 ? '0' : '') + seg;
    }

    function pintarReloj(restanteMs) {
      var pq = cartaActual();
      if (!pq || pq.tipo !== 'tiempo') { return; }
      var total = pq.seg * 1000;
      var p = Math.max(0, Math.min(1, 1 - restanteMs / total));
      tiempo.textContent = formatoTiempo(restanteMs);
      reloj.style.setProperty('--p', String(Math.round(p * 1000) / 1000));
    }

    function pintarPermisosReloj() {
      var pq = cartaActual();
      if (!pq || pq.tipo !== 'tiempo') { return; }
      relojBoton.disabled = relojOn || !puedoActuar();
    }

    function pintarCuenta() {
      var pq = cartaActual();
      if (!pq || pq.tipo !== 'contador') { return; }
      Array.prototype.forEach.call(casillas.children, function (c, i) {
        var hecha = i < cuenta;
        c.classList.toggle('hecha', hecha);
        c.setAttribute('aria-pressed', hecha ? 'true' : 'false');
      });
      cuentaTexto.textContent = cuenta + ' din ' + pq.n;
    }

    function pintarContenidoCarta(pq) {
      etiqueta.textContent = SETURI[pq.set].nombre + ' · ' + (pq.lugar + 1) + ' / ' + pq.de;
      pintarTexto(pq);
      carta.setAttribute('data-tipo', pq.tipo);
      dorsoNum.textContent = NUMEROS[pq.set];
      nota.textContent = pq.nota;
      nota.hidden = !pq.nota;
      contador.hidden = pq.tipo !== 'contador';
      reloj.hidden = pq.tipo !== 'tiempo';
      botonCerrar.textContent = pq.num === TOTAL ? TEXTOS.ultimaGata : TEXTOS.cartaGata;
      vaciar(casillas);
      if (pq.tipo === 'contador') {
        for (var i = 0; i < pq.n; i++) {
          var c = document.createElement('button');
          c.type = 'button';
          c.className = 'n1-casilla' + (pq.n === 6 && i === 2 ? ' grupo' : '');
          c.setAttribute('data-i', String(i));
          c.setAttribute('aria-pressed', 'false');
          c.setAttribute('aria-label', 'Căsuța ' + (i + 1));
          casillas.appendChild(c);
        }
        pintarCuenta();
      }
      if (pq.tipo === 'tiempo') {
        reloj.classList.remove('corre');
        relojBoton.textContent = TEXTOS.relojPorneste;
        pintarReloj(pq.seg * 1000);
        pintarPermisosReloj();
      }
    }

    function pintarContenidoSorpresa() {
      etiqueta.textContent = TEXTOS.sorpresaEtiqueta;
      vaciar(pregunta);
      pregunta.textContent = SORPRESA;
      pregunta.className = 'n1-texto';
      carta.setAttribute('data-tipo', 'sorpresa');
      dorsoNum.textContent = '?';
      nota.textContent = TEXTOS.sorpresaNota;
      nota.hidden = false;
      contador.hidden = true;
      reloj.hidden = true;
      botonCerrar.textContent = TEXTOS.continuam;
    }

    function enfocar(nodo) {
      try { if (nodo && typeof nodo.focus === 'function') { nodo.focus(); } } catch (err) { /* sin foco */ }
    }

    /* Pinta la etapa actual. `animar`: se llega desde la etapa anterior (no es un salto ni una entrada tardía). */
    function render(animar) {
      var et = ETAPAS[e];
      pintarRuta();
      if (et.t === 'fin') { terminar(); return; }
      mesa.hidden = false;
      var rectMazo = null;
      if (et.t === 'carta' && animar && !baraja.hidden) {
        var mz = mazos[PREGUNTAS[et.k].set];
        if (mz) { rectMazo = mz.getBoundingClientRect(); }
      }
      baraja.hidden = et.t !== 'mesa';
      zona.hidden = !(et.t === 'carta' || et.t === 'sorpresa');
      pit.hidden = et.t !== 'pit';
      pintarTurno();

      if (et.t === 'mesa') {
        pintarBaraja();
        if (animar) {
          var pq = PREGUNTAS[et.k];
          if (pq.lugar === 0 && SETURI[pq.set].intro) { habla.decir(SETURI[pq.set].intro, '', 3200); }
          var mz2 = mazos[pq.set];
          if (mz2 && !mz2.disabled) { enfocar(mz2); }
        }
      } else if (et.t === 'carta' || et.t === 'sorpresa') {
        carta.classList.remove('se-va', 'saca');
        if (et.t === 'carta') { pintarContenidoCarta(PREGUNTAS[et.k]); } else { pintarContenidoSorpresa(); }
        if (animar) {
          var dx = 0;
          var dy = 30;
          if (rectMazo) {
            var rc = carta.getBoundingClientRect();
            dx = (rectMazo.left + rectMazo.width / 2) - (rc.left + rc.width / 2);
            dy = (rectMazo.top + rectMazo.height / 2) - (rc.top + rc.height / 2);
          }
          carta.style.setProperty('--dx', redondear(dx) + 'px');
          carta.style.setProperty('--dy', redondear(dy) + 'px');
          reiniciarClase(carta, 'saca');
          sonar('voltear');
          enfocar(carta);
        }
      } else if (et.t === 'pit') {
        pitTexto.textContent = TEXTOS.pit[et.n];
        if (animar) {
          reiniciarClase(pit, 'nueva');
          sonar('parada');
          enfocar(pitContinua);
        }
      }
    }

    /* ---- Cambio de etapa ---- */
    function aplicar(nuevo) {
      saliendo = false;
      destino = 0;
      if (nuevo <= e) { return; }
      var salto = nuevo - e;
      pararReloj();
      e = nuevo;
      cuenta = 0;
      if (activo) { render(salto === 1); }
    }

    /* Sube a la etapa `nuevo`. Si la decide esta persona (local), avisa a la otra. Solo se sube, nunca se baja. */
    function ir(nuevo, local) {
      if (nuevo <= e || nuevo > FIN || nuevo <= destino) { return; }
      if (local) { emitir('n1:paso', { e: nuevo }); }
      var et = ETAPAS[e];
      var cartaVisible = activo && (et.t === 'carta' || et.t === 'sorpresa');
      if (saliendo) { destino = nuevo; return; }
      if (cartaVisible && nuevo === e + 1 && !sinMovimiento()) {
        saliendo = true;
        destino = nuevo;
        carta.classList.add('se-va');
        esperar(function () { aplicar(destino); }, SALIDA_MS);
        return;
      }
      aplicar(nuevo);
    }

    /* ---- Reloj de arena ---- */
    function pararReloj() {
      relojOn = false;
      cancelarEspera(relojTick);
      relojTick = 0;
    }

    function finReloj() {
      relojOn = false;
      reloj.classList.remove('corre');
      tiempo.textContent = '0:00';
      reloj.style.setProperty('--p', '1');
      relojBoton.textContent = TEXTOS.relojDinNou;
      pintarPermisosReloj();
      mensaje.textContent = TEXTOS.relojGata;
      sonar('pareja');
    }

    function tick() {
      relojTick = 0;
      if (!relojOn) { return; }
      var resto = relojFin - Date.now();
      if (resto <= 0) { finReloj(); return; }
      pintarReloj(resto);
      relojTick = esperar(tick, 250);
    }

    function arrancarReloj(ms, local) {
      var pq = cartaActual();
      if (!pq || pq.tipo !== 'tiempo' || relojOn) { return; }
      ms = Math.min(ms, pq.seg * 1000);
      relojOn = true;
      relojFin = Date.now() + ms;
      if (local) { emitir('n1:reloj', { e: e, ms: ms }); }
      reloj.classList.add('corre');
      pintarPermisosReloj();
      sonar('voltear');
      tick();
    }

    /* ---- Contador ---- */
    function fijarCuenta(c, local) {
      var pq = cartaActual();
      if (!pq || pq.tipo !== 'contador' || !entero(c) || c < 0 || c > pq.n || c === cuenta) { return; }
      var sube = c > cuenta;
      cuenta = c;
      pintarCuenta();
      if (local) { emitir('n1:cuenta', { e: e, c: c }); }
      if (sube) {
        if (c === pq.n) {
          sonar('pareja');
        } else if (window.Juice && typeof window.Juice.nota === 'function' && typeof window.Juice.racha === 'function') {
          window.Juice.nota(window.Juice.racha(c - 1));
        }
        if (window.Juice && typeof window.Juice.pulso === 'function' && casillas.children[c - 1]) {
          window.Juice.pulso(casillas.children[c - 1]);
        }
      }
    }

    /* Pulsar una casilla sin tachar tacha la siguiente; pulsar la última tachada la destacha. */
    function pulsarCasilla(i) {
      if (i >= cuenta) { fijarCuenta(cuenta + 1, true); } else if (i === cuenta - 1) { fijarCuenta(cuenta - 1, true); }
    }

    /* ---- Mesa ---- */
    function saltarDialogo() {
      dialogoActivo = false;
      pistaClic.hidden = true;
      if (dialogo && typeof dialogo.cancelar === 'function') { dialogo.cancelar(); }
      dialogo = null;
      habla.callar();
    }

    function mostrarMesa() {
      if (activo) { return; }
      intro = false;
      dialogoActivo = false;
      activo = true;
      pistaClic.hidden = true;
      mesa.hidden = false;
      reiniciarClase(mesa, 'nueva');
      render(false);
    }

    function sacar(s) {
      var et = ETAPAS[e];
      if (!activo || saliendo || et.t !== 'mesa' || PREGUNTAS[et.k].set !== s || !puedoActuar()) { return; }
      ir(e + 1, true);
    }

    function cerrarCarta() {
      var et = ETAPAS[e];
      if (!activo || saliendo || (et.t !== 'carta' && et.t !== 'sorpresa')) { return; }
      ir(e + 1, true);
    }

    function continuarPit() {
      if (!activo || saliendo || ETAPAS[e].t !== 'pit') { return; }
      ir(e + 1, true);
    }

    /* ---- Final: el calendario ---- */
    function entregarLogro() {
      if (concedido || !vida.viva) { return; }
      concedido = true;
      if (window.Logro && typeof window.Logro.conceder === 'function') {
        window.Logro.conceder(ID_LOGRO, { alTerminar: abrirSalida });
      } else {
        window.Juego.florecer();
        sonar('acierto');
        abrirSalida();
      }
    }

    function abrirSalida() {
      if (salidaHecha || !vida.viva) { return; }
      salidaHecha = true;
      botonContinua.hidden = false;
      enfocar(botonContinua);
    }

    function terminar() {
      if (calendarioIniciado) { return; }
      calendarioIniciado = true;
      if (!pit.hidden) { pit.hidden = true; }
      var rapido = sinMovimiento();
      var paso = rapido ? 250 : 650;
      var t0 = rapido ? 300 : 1600;
      esperar(function () { mesa.classList.add('fuera'); }, rapido ? 100 : 900);
      esperar(function () {
        mesa.hidden = true;
        calendario.hidden = false;
        reiniciarClase(calendario, 'nueva');
      }, t0);
      /* En el HTML la hoja del año 1 es la última (la de arriba): cae primero. */
      hojas.slice().reverse().forEach(function (hoja, i) {
        esperar(function () {
          hoja.classList.add('cae');
          sonar('voltear');
        }, t0 + (rapido ? 300 : 1100) + i * paso);
      });
      var tReveal = t0 + (rapido ? 300 : 1100) + hojas.length * paso + 100;
      esperar(function () {
        calFinal.classList.add('escrito');
        mensaje.textContent = VERSICULO.texto + ' ' + VERSICULO.ref;
        habla.decir(CIERRE, 'succes', 3000);
      }, tReveal);
      esperar(entregarLogro, tReveal + (rapido ? 800 : 2600));
    }

    /* ---- Eventos de esta persona ---- */
    mazos.forEach(function (mazo) {
      escuchar(mazo, 'click', function () { sacar(Number(mazo.getAttribute('data-set'))); });
    });
    escuchar(botonCerrar, 'click', cerrarCarta);
    escuchar(pitContinua, 'click', continuarPit);
    escuchar(relojBoton, 'click', function () {
      var pq = cartaActual();
      if (!pq || pq.tipo !== 'tiempo' || relojOn || !puedoActuar()) { return; }
      arrancarReloj(pq.seg * 1000, true);
    });
    escuchar(casillas, 'click', function (evento) {
      var c = evento && evento.target && evento.target.closest ? evento.target.closest('.n1-casilla') : null;
      if (!c) { return; }
      pulsarCasilla(Number(c.getAttribute('data-i')));
    });
    escuchar(botonContinua, 'click', function () {
      botonContinua.disabled = true;
      sonar('alejarse');
      calendario.classList.add('fuera');
      escena.classList.add('rodando', 'sale');
      esperar(function () { window.Juego.siguiente(); }, 1700);
    });

    /* ---- Mensajes de la otra persona ---- */
    function adoptar(nuevo) {
      /* Entrada tardía o salto: se salta el diálogo y se pinta sin animar. */
      pararReloj();
      saliendo = false;
      destino = 0;
      if (intro) { saltarDialogo(); }
      e = nuevo;
      cuenta = 0;
      if (activo) { render(false); } else { mostrarMesa(); }
    }

    function pedirEstado() {
      if (!conCompanero()) { return; }
      esperandoEstado = true;
      esperar(function () { esperandoEstado = false; }, 4000);
      emitir('n1:pide', {});
    }

    var s = sala();
    if (s) {
      limpiezas.push(s.alRecibir('n1:paso', function (d) {
        if (!vida.viva || !d || !entero(d.e) || d.e <= e || d.e > FIN) { return; }
        if (intro) { adoptar(d.e); return; }
        ir(d.e, false);
      }));

      limpiezas.push(s.alRecibir('n1:cuenta', function (d) {
        if (!vida.viva || !d || d.e !== e || !entero(d.c)) { return; }
        fijarCuenta(d.c, false);
      }));

      limpiezas.push(s.alRecibir('n1:reloj', function (d) {
        if (!vida.viva || !d || d.e !== e || !entero(d.ms) || d.ms < 1) { return; }
        arrancarReloj(d.ms, false);
      }));

      limpiezas.push(s.alRecibir('n1:pide', function () {
        if (!vida.viva) { return; }
        emitir('n1:estado', { e: e, c: cuenta, ms: relojOn ? Math.max(0, Math.round(relojFin - Date.now())) : 0 });
      }));

      limpiezas.push(s.alRecibir('n1:estado', function (d) {
        if (!vida.viva || !esperandoEstado || !d || !entero(d.e) || d.e < 0 || d.e > FIN) { return; }
        esperandoEstado = false;
        if (d.e < e) { return; }
        if (d.e > e) { adoptar(d.e); }
        if (activo && d.e === e) {
          if (entero(d.c)) { fijarCuenta(d.c, false); }
          if (entero(d.ms) && d.ms > 0) { arrancarReloj(d.ms, false); }
        }
      }));

      /* Si la otra persona se va, cualquiera puede sacar; si llega, se pide el estado. */
      s.alCambiar(function (hay) {
        if (!vida.viva || detenido) { return; }
        if (activo && ETAPAS[e].t !== 'fin') {
          pintarTurno();
          if (ETAPAS[e].t === 'mesa') { pintarBaraja(); }
          pintarPermisosReloj();
        }
        if (hay) { pedirEstado(); }
      });
    }

    /* ---- Estado inicial del DOM (por si el nivel se reinicia) ---- */
    mesa.hidden = true;
    mesa.classList.remove('fuera', 'nueva');
    calendario.hidden = true;
    calendario.classList.remove('fuera', 'nueva');
    botonContinua.hidden = true;
    botonContinua.disabled = false;
    hojas.forEach(function (h) { h.classList.remove('cae'); });
    calFinal.classList.remove('escrito');
    calTexto.textContent = VERSICULO.texto;
    calRef.textContent = VERSICULO.ref;
    construirRuta();

    /* Llegada: el coche entra rodando desde la izquierda, frena, y entonces habla el piloto. */
    escena.classList.add('rodando');
    void escena.getBoundingClientRect();
    esperar(function () {
      escena.classList.add('aparca');
      sonar('llegar');
    }, 350);
    esperar(function () { escena.classList.remove('rodando'); }, 3000);
    esperar(function () {
      if (!dialogoActivo) { return; } /* quien entró tarde ya pasó a la mesa */
      dialogo = window.Dialogo.reproducir(vineta, DIALOGO, {
        lector: mensaje,
        alTerminar: function () {
          dialogoActivo = false;
          mostrarMesa();
        }
      });
      esperar(function () { if (dialogoActivo) { pistaClic.hidden = false; } }, 2200);
    }, 3400);

    pedirEstado();
  }

  /* Deja el nivel limpio: sin temporizadores, listeners, diálogo, viñeta ni escuchas pendientes. Se puede llamar sin haber iniciado y varias veces. */
  function detener() {
    detenido = true;
    if (sesion) { sesion.viva = false; }
    limpiezas.forEach(function (f) { try { f(); } catch (err) { /* nada que limpiar */ } });
    limpiezas = [];
    limpiarRelojes();
    quitarEscuchas();
    if (dialogo && typeof dialogo.cancelar === 'function') { dialogo.cancelar(); }
    if (habla && typeof habla.cancelar === 'function') { habla.cancelar(); }
    dialogo = null;
  }

  window.Juego.registrar(1, { iniciar: iniciar, detener: detener });
})();
