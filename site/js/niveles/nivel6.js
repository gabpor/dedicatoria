/* Nivel 6 · Bélgica: gofres a dos manos. El coche llega a Bélgica y el piloto propone hacer un gofre entre los dos,
   en seis pasos con seis verbos distintos (una sola sesión de cocina):
     1. Verter: mantener pulsado el ulcior (o Enter) y soltar con el nivel de masa en la zona dorada.
     2. Cocer: cerrar la plancha y, mirando el ojo de buey (y el medidor), voltear justo cuando está dorado.
     3. Decorar: arrastrar los cinco ingredientes-recuerdo al gofre (o Enter sobre ellos). Cada uno muestra su
        «Îmi amintește de tine» y el piloto reacciona con humor.
     4. Aliñar: arrastrar cada una de las cuatro salsas (azul y amarilla) siguiendo una línea punteada; al terminar
        se lee su motivo (o mantener Enter sobre la botella).
     5. Escribir Coloseni 3:14 con azúcar glas arrastrando el cursor sobre las letras pálidas de una plantilla
        (o mantener Enter en el botón). El versículo queda legible dentro del propio gofre.
     6. Partir: cada persona tira de un mango a la vez y el gofre se parte en dos.
   Después Logro.conceder (flor 6 + versículo en la guantera) y el botón «Mai departe»: el coche se va.

   Contenido privado (nada personal vive en este archivo; se lee con Contenido.obtener y lo de reserva es neutro):
   - nivel6.recuerdos (5) y nivel6.motivos (4): lista de { titulo, texto } (texto null = sin frase), en el orden
     de los iconos n6-ic-N del HTML. Los recuerdos admiten además un campo opcional «reaccion» (la frase del piloto).

   En pareja (con Sala): reparto por turnos. El rol 0 es quien tiene el id menor (el mismo en las dos pantallas):
   rol 0 vierte la masa, rol 1 cierra y voltea la plancha; ingrediente i: rol (i % 2); salsa i: rol ((i + 1) % 2);
   el azúcar lo escriben las dos personas; en el paso 6 cada una tira de su mango. Sin acompañante una persona
   hace todos los roles, sin esperar. Mensajes (todos validados al recibir):
   n6:intro, n6:fase {f}, n6:masa {l, fin?, rebosa?}, n6:tapa, n6:dorado {g, q?, ok?}, n6:ing {i, x, y},
   n6:salsa {i, p}, n6:az {k: [índices]}, n6:parte {l, p}, n6:continua.
   Quien entra tarde manda n6:pide y recibe n6:estado con la foto completa del nivel.

   Todo el texto en rumano es un borrador que tiene que revisar alguien que hable el idioma. */
(function () {
  'use strict';

  /* ---------- Relojes, listeners y suscripciones (detener() los deja todos limpios) ---------- */
  var relojes = [];
  var detenido = false; /* tras detener(), nada nuevo se programa hasta el siguiente iniciar() */

  function esperar(fn, ms) {
    if (detenido) { return 0; }
    var reloj = { id: 0 };
    reloj.id = setTimeout(function () {
      var i = relojes.indexOf(reloj);
      if (i >= 0) { relojes.splice(i, 1); }
      fn();
    }, ms);
    relojes.push(reloj);
    return reloj.id;
  }

  function limpiarRelojes() {
    relojes.forEach(function (r) { clearTimeout(r.id); });
    relojes = [];
  }

  var escuchas = [];

  function escuchar(destino, tipo, fn, opciones) {
    if (detenido) { return; }
    destino.addEventListener(tipo, fn, opciones);
    escuchas.push({ destino: destino, tipo: tipo, fn: fn, opciones: opciones });
  }

  function quitarEscuchas() {
    escuchas.forEach(function (e) { e.destino.removeEventListener(e.tipo, e.fn, e.opciones); });
    escuchas = [];
  }

  var bajas = [];

  function alRecibir(tipo, fn) {
    if (detenido || !window.Sala || typeof window.Sala.alRecibir !== 'function') { return; }
    bajas.push(window.Sala.alRecibir(tipo, fn));
  }

  function quitarBajas() {
    bajas.forEach(function (baja) { if (typeof baja === 'function') { baja(); } });
    bajas = [];
  }

  /* Elementos y diálogos que hay que retirar al detener. */
  var dialogo = null;
  var hablaEscena = null;
  var hablaLocal = null;
  var fantasmas = [];
  var generacion = 0; /* cuenta los inicios del nivel: lo que quede de uno anterior no hace nada */

  function hayPareja() {
    return !!(window.Sala && typeof window.Sala.hayCompanero === 'function' && window.Sala.hayCompanero());
  }

  function emitir(tipo, datos) {
    if (hayPareja() && typeof window.Sala.emitir === 'function') { window.Sala.emitir(tipo, datos); }
  }

  /* Rol 0 = la persona con el id menor (la misma en las dos pantallas). */
  function miRol() {
    var yo = window.Sala && window.Sala.yo ? window.Sala.yo() : null;
    var otro = window.Sala && window.Sala.companero ? window.Sala.companero() : null;
    if (!yo || !otro) { return 0; }
    return yo.id < otro.id ? 0 : 1;
  }

  /* ¿Me toca a mí hacer lo del rol dado? Sin acompañante, todo me toca; rol -1 = las dos personas. */
  function puedo(rol) {
    return !hayPareja() || rol < 0 || rol === miRol();
  }

  /* ---------- Constantes ---------- */
  var ID_LOGRO = 'n6-gofre';
  var VERSICULO = {
    texto: 'Dar mai presus de toate acestea, îmbrăcați-vă cu dragostea, care este legătura desăvârșirii.',
    ref: 'Coloseni 3:14'
  };

  var MAXF = 7; /* 0 intro, 1 masa, 2 plancha, 3 ingredientes, 4 salsas, 5 azúcar, 6 partir, 7 final */
  var TICK = 50;
  var NING = 5;
  var NSAL = 4;
  var NPUNTOS = 73;
  /* Geometría del SVG del gofre (debe coincidir con index.html). */
  var VW = 520;
  var VH = 420;
  var GX = 40;
  var GY = 88;
  var GW = 440;
  var GH = 282;

  var ZONA_MASA = [0.74, 0.9];
  var RITMO_MASA = 0.3; /* fracción de la jarra por segundo */
  var ZONA_DORADO = [0.56, 0.78];
  var DURACION_DORADO = 7000;
  var PAUSA_QUEMADO = 1500;
  var TOL_SALSA = 34; /* unidades del SVG */
  var SALTO_SALSA = 10; /* puntos que se pueden avanzar de golpe */
  var RITMO_SALSA = 22; /* puntos por segundo con el teclado */
  var RADIO_AZUCAR = 24; /* px */
  var UMBRAL_AZUCAR = 0.9;
  var RITMO_AZUCAR = 14; /* letras por segundo con el teclado */
  var DIST_PARTE = 90; /* px que hay que tirar del mango */
  var RITMO_PARTE = 0.5; /* por segundo con el teclado */
  var RETROCESO_PARTE = 1.1; /* por segundo, en pareja, si se suelta */
  var SEPARACION = 22; /* px que se abre cada mitad al tirar */
  var SEPARACION_FIN = 34;
  var AUTOCOLOCA = [[230, 330], [500, 260], [770, 330], [370, 680], [640, 680]];

  /* Texto de reserva: lo verdadero (títulos y frases) viene del contenido privado. */
  var RECUERDOS = [
    { titulo: '…', texto: null, reaccion: 'Pâine pe gofră? Curajos.' },
    { titulo: '…', texto: null, reaccion: 'Paste pe gofră? Nu mă opun.' },
    { titulo: '…', texto: null, reaccion: 'Un mac! Ăsta chiar se potrivește.' },
    { titulo: '…', texto: null, reaccion: 'O mașinuță pe gofră. Pe asta o recunosc.' },
    { titulo: '…', texto: null, reaccion: 'Și culorile noastre, deasupra. Perfect.' }
  ];
  var MOTIVOS = [
    { titulo: '…', texto: null, reaccion: 'Sos albastru: rețeta e secretă.' },
    { titulo: '…', texto: null, reaccion: 'Galben, ca soarele de pe drum.' },
    { titulo: '…', texto: null, reaccion: 'Încă un strat. Nu mai încape nimic!' },
    { titulo: '…', texto: null, reaccion: 'Ultimul sos. Arată a acasă.' }
  ];

  var T = {
    dialogo: [
      'Bine ai venit în Belgia!',
      'Regula locului: nimeni nu pleacă fără gofre.',
      'Le facem împreună: aluatul, aparatul, ce punem deasupra și, la urmă, jumătate-jumătate.'
    ],
    fases: [
      null,
      { eti: 'Pasul 1 din 6', titulo: 'Toarnă aluatul', guia: 'Ține apăsat pe ulcior (sau Enter) și dă drumul când aluatul ajunge în zona aurie.' },
      { eti: 'Pasul 2 din 6', titulo: 'Gătește gofra', guia: 'Închide aparatul și întoarce gofra exact când ochiul de sticlă devine auriu.' },
      { eti: 'Îmi amintește de tine', titulo: 'Pune amintirile deasupra', guia: 'Trage fiecare ingredient pe gofră (sau apasă Enter pe el).' },
      { eti: 'De ce te iubesc', titulo: 'Toarnă sosurile', guia: 'Trage sticla pe linia punctată (sau ține apăsat Enter pe ea).' },
      { eti: 'Pasul 5 din 6', titulo: 'Scrie cu zahăr pudră', guia: 'Trage mouse-ul peste literele palide (sau ține apăsat pe buton).' },
      { eti: 'Pasul 6 din 6', titulo: 'Rupe gofra în două', guia: 'Trageți de mânere în același timp (sau țineți apăsat Enter pe mâner).' },
      { eti: 'Poftă bună!', titulo: 'Gofra e gata', guia: 'Jumătate pentru fiecare.' }
    ],
    rolSolo: 'Faci tu toți pașii.',
    rol: [
      null,
      ['Rândul tău: toarnă aluatul.', 'Perechea ta toarnă aluatul. Urmează aparatul.'],
      ['Perechea ta ține aparatul. Urmărește culoarea.', 'Rândul tău: aparatul e al tău.'],
      ['Ingredientele cu ★ sunt ale tale; restul le pune perechea ta.', 'Ingredientele cu ★ sunt ale tale; restul le pune perechea ta.'],
      ['Sosurile cu ★ sunt ale tale; restul le toarnă perechea ta.', 'Sosurile cu ★ sunt ale tale; restul le toarnă perechea ta.'],
      ['Scrieți împreună, amândoi.', 'Scrieți împreună, amândoi.'],
      ['Fiecare trage de un mâner, în același timp.', 'Fiecare trage de un mâner, în același timp.'],
      ['', '']
    ],
    aparatAjeno: 'Aparatul e la perechea ta acum. Tu urmărești.',
    poco: 'Mai e loc. Mai toarnă!',
    mucho: 'Prea mult! Mai scoatem cu lingura.',
    rebosa: 'Hopa! Aluatul a luat-o razna.',
    masaOk: 'Exact cât trebuie!',
    cierra: 'Acum așteptăm să se facă aurie.',
    crud: 'Încă e crudă! Mai așteaptă puțin.',
    quema: 'Ups, a ieșit „bine făcută”. Mai facem una!',
    dorOk: 'Aurie ca la carte!',
    voltea: 'Întoarce acum!',
    cierraBtn: 'Închide aparatul',
    leyMasa: 'Aluat',
    leyDorado: 'Aurire',
    fuera: 'Ești în afara gofrei. Pune ingredientul deasupra.',
    azucarInicio: 'Zahăr pudră: nu strănuta!',
    azucarFin: 'Scris cu zahăr. Citește-l cu voce tare.',
    parteSolo: 'Trage de ambele mânere, pe rând.',
    partePar: 'Trageți amândoi, în același timp!',
    parteOk: 'Jumătate pentru tine, jumătate pentru mine.',
    final: 'Poftă bună!'
  };

  /* ---------- Utilidades puras ---------- */
  function ent(v, min, max) {
    if (typeof v !== 'number' || !isFinite(v)) { return null; }
    var r = Math.round(v);
    return r < min ? min : (r > max ? max : r);
  }
  /* Índice o fase: si está fuera de rango se descarta (no se acota). */
  function idx(v, min, max) {
    var r = ent(v, -1e9, 1e9);
    return r !== null && r >= min && r <= max ? r : null;
  }
  function limitar(v, min, max) { return v < min ? min : (v > max ? max : v); }
  function pc(v) { return Math.round(limitar(v, 0, 1) * 100); }
  function r1(v) { return Math.round(v * 10) / 10; }

  function crear(tag, clase) {
    var e = document.createElement(tag);
    if (clase) { e.className = clase; }
    return e;
  }

  var NS_SVG = 'http://www.w3.org/2000/svg';
  function crearSvg(tag, atributos) {
    var e = document.createElementNS(NS_SVG, tag);
    Object.keys(atributos || {}).forEach(function (k) { e.setAttribute(k, atributos[k]); });
    return e;
  }

  /* Lo de reserva con el título, la frase (y la reacción) del contenido privado encima. */
  function leerLista(clave, base) {
    var privada = window.Contenido && typeof window.Contenido.obtener === 'function' ? window.Contenido.obtener(clave, null) : null;
    return base.map(function (b, i) {
      var d = Array.isArray(privada) && privada[i] && typeof privada[i] === 'object' ? privada[i] : {};
      return {
        titulo: typeof d.titulo === 'string' && d.titulo ? d.titulo : b.titulo,
        texto: typeof d.texto === 'string' && d.texto ? d.texto : b.texto,
        reaccion: typeof d.reaccion === 'string' && d.reaccion ? d.reaccion : b.reaccion
      };
    });
  }

  /* Los cuatro trazos de salsa (coordenadas del SVG): ola, zigzag, espiral y corazón. */
  function patron(k) {
    var pts = [];
    for (var i = 0; i < NPUNTOS; i++) {
      var t = i / (NPUNTOS - 1);
      var x;
      var y;
      if (k === 0) {
        x = 70 + 380 * t; y = 130 + 24 * Math.sin(t * Math.PI * 6);
      } else if (k === 1) {
        x = 70 + 380 * t; y = 330 - 46 * Math.abs(((t * 6) % 2) - 1);
      } else if (k === 2) {
        var a = t * Math.PI * 5; var r = 14 + 74 * t;
        x = 260 + r * Math.cos(a); y = 230 + r * Math.sin(a) * 0.82;
      } else {
        var u = t * Math.PI * 2;
        x = 260 + 6 * 16 * Math.pow(Math.sin(u), 3);
        y = 215 - 6 * (13 * Math.cos(u) - 5 * Math.cos(2 * u) - 2 * Math.cos(3 * u) - Math.cos(4 * u));
      }
      pts.push([r1(x), r1(y)]);
    }
    return pts;
  }
  var PATRONES = [patron(0), patron(1), patron(2), patron(3)];

  function trazoHasta(pts, k) {
    var d = 'M' + pts[0][0] + ' ' + pts[0][1];
    for (var i = 1; i <= k && i < pts.length; i++) { d += 'L' + pts[i][0] + ' ' + pts[i][1]; }
    return d;
  }

  function distSegmento(p, a, b) {
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    var l2 = dx * dx + dy * dy;
    var t = l2 ? limitar(((p.x - a.x) * dx + (p.y - a.y) * dy) / l2, 0, 1) : 0;
    var qx = a.x + t * dx;
    var qy = a.y + t * dy;
    return Math.sqrt((p.x - qx) * (p.x - qx) + (p.y - qy) * (p.y - qy));
  }

  /* Color del ojo de buey: masa clara, dorado en la zona buena y marrón quemado al final. */
  function colorDorado(g) {
    var a; var b; var t;
    if (g < 0.67) { a = [246, 226, 166]; b = [232, 170, 40]; t = g / 0.67; }
    else { a = [232, 170, 40]; b = [70, 35, 15]; t = (g - 0.67) / 0.33; }
    t = limitar(t, 0, 1);
    return 'rgb(' + [0, 1, 2].map(function (i) { return Math.round(a[i] + (b[i] - a[i]) * t); }).join(',') + ')';
  }

  /* Sonidos propios del nivel (suaves), con reserva silenciosa si Sonidos.definir no existe. */
  var sonidosDefinidos = false;
  function definirSonidos() {
    if (sonidosDefinidos || !window.Sonidos || typeof window.Sonidos.definir !== 'function') { return; }
    sonidosDefinidos = true;
    try {
      window.Sonidos.definir('n6Sizzle', function (api) { api.soplo(api.t, 0.035, 2600, 0.45); });
      window.Sonidos.definir('n6Plancha', function (api) {
        api.tono(api.t, 120, 0.18, 0.12, 'sine');
        api.soplo(api.t, 0.05, 600, 0.12);
      });
    } catch (e) { sonidosDefinidos = false; }
  }

  function sonar(nombre, alternativa) {
    var S = window.Sonidos;
    if (!S) { return; }
    if (typeof S[nombre] === 'function') { S[nombre](); }
    else if (alternativa && typeof S[alternativa] === 'function') { S[alternativa](); }
  }

  function efecto(nombre) {
    var J = window.Juice;
    if (J && typeof J[nombre] === 'function') {
      try { J[nombre].apply(J, Array.prototype.slice.call(arguments, 1)); } catch (e) { /* sin efecto */ }
    }
  }

  /* El logro se define al cargar el archivo (una vez). */
  if (window.Logro && typeof window.Logro.definir === 'function') {
    window.Logro.definir(ID_LOGRO, { nivel: 6, flor: 6, titulo: 'Gofre pentru doi', versiculo: VERSICULO });
  }

  /* ====================================================================== */
  function iniciar(seccion) {
    detenido = false;
    generacion += 1;
    var mia = generacion;
    definirSonidos();
    function vigente() { return !detenido && mia === generacion; }
    function q(id) { return seccion.querySelector('#' + id); }

    var escena = seccion.querySelector('.escena');
    var pistaClic = q('n6-pista-clic');
    var mensaje = q('n6-mesaj');
    var estado = q('n6-estado');
    var vineta = q('n6-vineta-texto');
    var cocina = q('n6-cocina');
    var etiqueta = q('n6-etiqueta');
    var titulo = q('n6-titulo');
    var pasos = q('n6-pasos');
    var botonContinua = q('n6-continua');
    var guia = q('n6-guia');
    var rolTxt = q('n6-rol');
    var mando = q('n6-mando');
    var jarra = q('n6-jarra');
    var accion = q('n6-accion');
    var medidor = q('n6-medidor');
    var medZona = q('n6-med-zona');
    var medFill = q('n6-med-fill');
    var medLey = q('n6-med-leyenda');
    var bandeja = q('n6-bandeja');
    var salsasCol = q('n6-salsas');
    var caja = q('n6-gofre-caja');
    var interior = q('n6-gofre-int');
    var masa = q('n6-masa');
    var gofre = q('n6-gofre');
    var quemado = q('n6-quemado');
    var capaSalsa = q('n6-capa-salsa');
    var capaGuia = q('n6-capa-guia');
    var capaIng = q('n6-capa-ing');
    var chorro = q('n6-chorro');
    var tapa = q('n6-tapa');
    var ojo = q('n6-ojo');
    var azucar = q('n6-azucar');
    var botonAzucar = q('n6-azucarbtn');
    var asas = [q('n6-asa-0'), q('n6-asa-1')];
    var carta = q('n6-carta');
    var cartaEti = q('n6-carta-eti');
    var cartaTitulo = q('n6-carta-titulo');
    var cartaTexto = q('n6-carta-texto');
    var burbuja = q('n6-habla');
    var itemsIng = Array.prototype.slice.call(seccion.querySelectorAll('.n6-ing'));
    var itemsSal = Array.prototype.slice.call(seccion.querySelectorAll('.n6-salsa'));
    if (!escena || !cocina || !caja) { return; }

    hablaEscena = window.Dialogo.hablante(vineta, mensaje);
    hablaLocal = window.Dialogo.hablante(burbuja, mensaje);
    function decir(texto, tipo, ms) { hablaLocal.decir(texto, tipo || '', ms === undefined ? 3200 : ms); }
    function avisar(texto) { estado.textContent = texto; }

    var recuerdos = leerLista('nivel6.recuerdos', RECUERDOS);
    var motivos = leerLista('nivel6.motivos', MOTIVOS);

    /* ---------- Estado del nivel ---------- */
    var fase = 0;
    var introHecha = false;
    var pedido = false;
    var estadoAplicado = false;
    var concedido = false;
    var salidaHecha = false;
    var continuando = false;
    var ultimoTick = Date.now();
    var ultimoEnvio = {};
    var firma = '';

    var nivelMasa = 0;
    var masaHecha = false;
    var nivelAlPulsar = 0;
    var cerrada = false;
    var cocido = false;
    var dorado = 0;
    var quemadoHasta = 0;
    var ings = [null, null, null, null, null];
    var salProg = [0, 0, 0, 0]; /* porcentaje 0..100 */
    var salIdx = [0, 0, 0, 0]; /* punto alcanzado */
    var salEnganche = [false, false, false, false];
    var salActiva = -1;
    var letras = [];
    var polvo = [];
    var centros = [];
    var pendientes = [];
    var envioPendiente = false;
    var azucarHecho = false;
    var ultimoRasca = 0;
    var parte = [0, 0];
    var parteHecha = false;
    var mitad = null;
    var sostiene = null; /* { tipo, i } mientras se mantiene pulsado */
    var arrastre = null; /* { tipo, i, fantasma, nodo, ... } mientras se arrastra */

    function limitado(clave, ms) {
      var t = Date.now();
      if (t - (ultimoEnvio[clave] || 0) < ms) { return false; }
      ultimoEnvio[clave] = t;
      return true;
    }

    function mostrar(el, si) { if (el) { el.hidden = !si; } }

    /* ---------- Roles ---------- */
    function rolIng(i) { return i % 2; }
    function rolSal(i) { return (i + 1) % 2; }

    function textoRol() {
      if (!hayPareja()) { return T.rolSolo; }
      var par = T.rol[fase];
      return par ? par[puedo(0) ? 0 : 1] : '';
    }

    function actualizarRol() {
      rolTxt.textContent = textoRol();
      var par = hayPareja();
      itemsIng.forEach(function (el, i) {
        var mio = par && puedo(rolIng(i));
        el.classList.toggle('n6-mio', mio);
        el.classList.toggle('n6-ajeno', par && !mio);
        el.setAttribute('aria-disabled', par && !mio && !ings[i] ? 'true' : 'false');
      });
      itemsSal.forEach(function (el, i) {
        var mio = par && puedo(rolSal(i));
        el.classList.toggle('n6-mio', mio);
        el.classList.toggle('n6-ajeno', par && !mio);
        el.setAttribute('aria-disabled', par && !mio && salProg[i] < 100 ? 'true' : 'false');
      });
      accion.setAttribute('aria-disabled', par && !puedo(1) ? 'true' : 'false');
      asas.forEach(function (el, l) {
        el.classList.toggle('n6-ajeno', par && !puedo(l));
        el.setAttribute('aria-disabled', par && !puedo(l) ? 'true' : 'false');
      });
    }

    function refrescarRoles() {
      var f = (hayPareja() ? '1' : '0') + miRol() + ':' + fase;
      if (f !== firma) { firma = f; actualizarRol(); }
    }

    /* ---------- Carta con el recuerdo o el motivo ---------- */
    function mostrarCarta(eti, datos) {
      cartaEti.textContent = eti;
      cartaTitulo.textContent = datos.titulo;
      cartaTexto.textContent = datos.texto || '';
      carta.classList.add('visible');
      efecto('muelle', carta, 'n6-entra');
      avisar(eti + '. ' + datos.titulo + (datos.texto ? '. ' + datos.texto : ''));
    }

    /* ---------- Medidor ---------- */
    function configurarMedidor(zona, leyenda) {
      medZona.style.left = Math.round(zona[0] * 100) + '%';
      medZona.style.width = Math.round((zona[1] - zona[0]) * 100) + '%';
      medLey.textContent = leyenda;
    }

    function pintarMedidor(v) {
      var p = pc(v);
      medFill.style.width = p + '%';
      medidor.setAttribute('aria-valuenow', String(p));
    }

    /* ---------- Paso 1: verter la masa ---------- */
    function pintarMasa() {
      var h = Math.round(limitar(nivelMasa, 0, 1) * GH);
      masa.setAttribute('height', String(h));
      masa.setAttribute('y', String(GY + GH - h));
      if (fase === 1) { pintarMedidor(nivelMasa); }
    }

    function pintarChorro(si) {
      jarra.classList.toggle('vertiendo', si);
      if (si) {
        var sup = GY + GH - nivelMasa * GH;
        chorro.setAttribute('height', String(Math.max(0, Math.round(sup - 18))));
      } else {
        chorro.setAttribute('height', '0');
      }
    }

    function empezarMasa(ev) {
      if (fase !== 1 || masaHecha || !puedo(0) || sostiene) { return; }
      sostiene = { tipo: 'masa', pid: ev ? ev.pointerId : undefined };
      nivelAlPulsar = nivelMasa;
      sonar('n6Sizzle', 'rasca');
      pintarChorro(true);
    }

    function rebosar(remota) {
      nivelMasa = 0;
      pintarChorro(false);
      pintarMasa();
      efecto('pulso', medidor);
      sonar('bloqueado');
      decir(T.rebosa, 'eroare');
      if (!remota) { sostiene = null; emitir('n6:masa', { l: 0, rebosa: true }); }
    }

    function exitoMasa(remota) {
      if (masaHecha) { return; }
      masaHecha = true;
      sostiene = null;
      pintarChorro(false);
      sonar('encaje');
      efecto('pulso', medidor);
      decir(T.masaOk, 'succes', 2200);
      esperar(function () { irAFase(2, true); }, 900);
      if (!remota) { emitir('n6:masa', { l: pc(nivelMasa), fin: true }); }
    }

    function soltarMasa() {
      if (!sostiene || sostiene.tipo !== 'masa') { return; }
      sostiene = null;
      pintarChorro(false);
      if (nivelMasa === nivelAlPulsar || masaHecha) { return; }
      if (nivelMasa < ZONA_MASA[0]) {
        decir(T.poco);
      } else if (nivelMasa <= ZONA_MASA[1]) {
        exitoMasa(false);
        return;
      } else {
        nivelMasa = 0.55;
        pintarMasa();
        decir(T.mucho, 'eroare');
        sonar('boing');
      }
      emitir('n6:masa', { l: pc(nivelMasa), fin: true });
    }

    function tickMasa(dt) {
      if (!sostiene || sostiene.tipo !== 'masa' || masaHecha) { return; }
      if (!puedo(0)) { return; }
      nivelMasa += RITMO_MASA * dt;
      if (nivelMasa >= 1) { rebosar(false); return; }
      pintarMasa();
      pintarChorro(true);
      if (limitado('masa', 120)) { emitir('n6:masa', { l: pc(nivelMasa) }); }
    }

    /* ---------- Paso 2: cerrar la plancha y voltear a tiempo ---------- */
    function pintarDorado() {
      pintarMedidor(dorado);
      ojo.setAttribute('fill', colorDorado(dorado));
    }

    function cerrar(remota) {
      if (cerrada) { return; }
      cerrada = true;
      dorado = 0;
      tapa.classList.add('cerrada');
      accion.textContent = T.voltea;
      sonar('n6Plancha', 'sello');
      pintarDorado();
      decir(T.cierra, '', 2600);
      if (!remota) { emitir('n6:tapa', {}); }
    }

    function quemar(remota) {
      dorado = 0;
      quemadoHasta = Date.now() + PAUSA_QUEMADO;
      quemado.classList.add('visible');
      esperar(function () { quemado.classList.remove('visible'); pintarDorado(); }, PAUSA_QUEMADO);
      ojo.setAttribute('fill', colorDorado(1));
      sonar('bloqueado');
      decir(T.quema, 'eroare');
      if (!remota) { emitir('n6:dorado', { g: 0, q: true }); }
    }

    function marcarCocido() {
      cocido = true;
      quemado.classList.remove('visible');
      tapa.classList.remove('cerrada');
      gofre.classList.add('listo');
      masa.setAttribute('height', '0');
    }

    function exitoDorado(remota) {
      if (cocido) { return; }
      marcarCocido();
      sonar('pareja', 'acierto');
      var rm = medidor.getBoundingClientRect();
      efecto('chispa', (rm.left || 0) + (rm.width || 0) / 2, (rm.top || 0));
      decir(T.dorOk, 'succes', 2200);
      esperar(function () { irAFase(3, true); }, 1300);
      if (!remota) { emitir('n6:dorado', { g: pc(dorado), ok: true }); }
    }

    function voltear() {
      if (fase !== 2 || cocido) { return; }
      if (!puedo(1)) { decir(T.aparatAjeno, '', 2600); return; }
      if (Date.now() < quemadoHasta) { return; }
      if (!cerrada) { cerrar(false); return; }
      if (dorado >= ZONA_DORADO[0] && dorado <= ZONA_DORADO[1]) {
        exitoDorado(false);
      } else if (dorado < ZONA_DORADO[0]) {
        dorado = Math.max(0, dorado - 0.1);
        pintarDorado();
        sonar('boing');
        decir(T.crud);
        emitir('n6:dorado', { g: pc(dorado) });
      } else {
        quemar(false);
      }
    }

    function tickPlancha(dt) {
      if (!cerrada || cocido || !puedo(1) || Date.now() < quemadoHasta) { return; }
      dorado += dt * 1000 / DURACION_DORADO;
      if (dorado >= 1) { quemar(false); return; }
      pintarDorado();
      if (limitado('dorado', 150)) { emitir('n6:dorado', { g: pc(dorado) }); }
    }

    /* ---------- Paso 3: ingredientes (recuerdos) ---------- */
    function dibujarIng(i) {
      var c = ings[i];
      var g = crearSvg('g', { transform: 'translate(' + r1(GX + c.x / 1000 * GW) + ' ' + r1(GY + c.y / 1000 * GH) + ')' });
      g.setAttribute('class', 'n6-ing-puesto');
      g.appendChild(crearSvg('use', { href: '#n6-ic-' + i, x: '-34', y: '-34', width: '68', height: '68' }));
      capaIng.appendChild(g);
    }

    function colocar(i, x, y, remota, silencioso) {
      if (ings[i]) { return; }
      ings[i] = { x: x, y: y };
      dibujarIng(i);
      var item = itemsIng[i];
      if (item) {
        item.classList.remove('cogido');
        item.classList.add('puesto');
        var nom = item.querySelector('.n6-nom');
        if (nom) { nom.textContent = recuerdos[i].titulo; }
        item.setAttribute('aria-label', recuerdos[i].titulo);
      }
      actualizarRol();
      if (!remota) { emitir('n6:ing', { i: i, x: x, y: y }); }
      if (silencioso) { return; }
      sonar('encaje');
      efecto('pulso', item);
      mostrarCarta(T.fases[3].eti, recuerdos[i]);
      decir(recuerdos[i].reaccion, '', 3600);
      if (ings.every(function (v) { return !!v; })) {
        esperar(function () { irAFase(4, false); }, 2200);
      }
    }

    /* Punto del SVG bajo un punto de la ventana. */
    function aSvg(cx, cy) {
      var r = caja.getBoundingClientRect();
      var w = r.width || VW;
      var h = r.height || VH;
      return { x: (cx - (r.left || 0)) / w * VW, y: (cy - (r.top || 0)) / h * VH };
    }

    function soltarIng(a, ev) {
      var p = aSvg(ev.clientX, ev.clientY);
      var dentro = p.x >= GX - 20 && p.x <= GX + GW + 20 && p.y >= GY - 20 && p.y <= GY + GH + 20;
      if (!dentro || fase !== 3 || ings[a.i]) {
        if (a.nodo) { a.nodo.classList.remove('cogido'); }
        if (!dentro && fase === 3) { avisar(T.fuera); }
        return;
      }
      var x = Math.round(limitar((p.x - GX) / GW * 1000, 70, 930));
      var y = Math.round(limitar((p.y - GY) / GH * 1000, 90, 910));
      colocar(a.i, x, y, false);
    }

    function colocarConTeclado(i) {
      if (fase !== 3 || ings[i] || !puedo(rolIng(i))) { return; }
      colocar(i, AUTOCOLOCA[i][0], AUTOCOLOCA[i][1], false);
    }

    /* ---------- Paso 4: salsas (motivos) ---------- */
    function pintarGuia() {
      capaGuia.textContent = '';
      if (fase !== 4 || salActiva < 0 || salProg[salActiva] >= 100) { return; }
      var pts = PATRONES[salActiva];
      capaGuia.appendChild(crearSvg('path', { d: trazoHasta(pts, NPUNTOS), class: 'n6-guia-trazo', fill: 'none' }));
      var p = pts[salIdx[salActiva]];
      capaGuia.appendChild(crearSvg('circle', { cx: p[0], cy: p[1], r: '9', class: 'n6-guia-punto' }));
    }

    function siguienteSalsaMia() {
      for (var i = 0; i < NSAL; i++) {
        if (salProg[i] < 100 && puedo(rolSal(i))) { return i; }
      }
      return -1;
    }

    function pintarSalsa(i) {
      var el = capaSalsa.querySelector('[data-i="' + i + '"]');
      if (!el) {
        el = crearSvg('path', { fill: 'none', 'data-i': String(i) });
        el.setAttribute('class', 'n6-salsa-trazo ' + (i % 2 === 0 ? 'azul' : 'amarilla'));
        capaSalsa.appendChild(el);
      }
      el.setAttribute('d', trazoHasta(PATRONES[i], salIdx[i]));
    }

    function completarSalsa(i, silencioso) {
      salProg[i] = 100;
      salIdx[i] = NPUNTOS - 1;
      pintarSalsa(i);
      var item = itemsSal[i];
      if (item) {
        item.classList.add('puesto');
        item.classList.remove('cogido');
        var nom = item.querySelector('.n6-nom');
        if (nom) { nom.textContent = motivos[i].titulo; }
        item.setAttribute('aria-label', motivos[i].titulo);
      }
      salActiva = siguienteSalsaMia();
      actualizarRol();
      pintarGuia();
      if (silencioso) { return; }
      sonar('sello');
      efecto('pulso', item);
      mostrarCarta(T.fases[4].eti, motivos[i]);
      decir(motivos[i].reaccion, '', 3600);
      if (salProg.every(function (p) { return p >= 100; })) {
        esperar(function () { irAFase(5, false); }, 2600);
      }
    }

    /* Avanza la salsa i hasta el punto idx (nunca hacia atrás). */
    function empujarSalsa(i, idx, remota) {
      idx = Math.min(NPUNTOS - 1, Math.floor(idx));
      if (idx <= salIdx[i]) { return; }
      salIdx[i] = idx;
      salProg[i] = Math.round(idx / (NPUNTOS - 1) * 100);
      if (salProg[i] >= 100) {
        completarSalsa(i, false);
        if (!remota) { emitir('n6:salsa', { i: i, p: 100 }); }
        return;
      }
      pintarSalsa(i);
      if (!remota && limitado('salsa' + i, 120)) { emitir('n6:salsa', { i: i, p: salProg[i] }); }
    }

    function trazarSalsa(i, ev) {
      var p = aSvg(ev.clientX, ev.clientY);
      var pts = PATRONES[i];
      var cur = salIdx[i];
      var dActual = Math.sqrt(Math.pow(p.x - pts[cur][0], 2) + Math.pow(p.y - pts[cur][1], 2));
      if (!salEnganche[i]) {
        if (dActual < TOL_SALSA * 1.6) { salEnganche[i] = true; } else { return; }
      } else if (dActual > TOL_SALSA * 2.4) {
        salEnganche[i] = false;
        return;
      }
      var mejor = cur;
      var mejorD = dActual;
      for (var j = cur + 1; j <= Math.min(NPUNTOS - 1, cur + SALTO_SALSA); j++) {
        var d = Math.sqrt(Math.pow(p.x - pts[j][0], 2) + Math.pow(p.y - pts[j][1], 2));
        if (d < TOL_SALSA && d <= mejorD + 0.001) { mejor = j; mejorD = d; }
      }
      if (mejor > cur) { empujarSalsa(i, mejor, false); }
      var punto = capaGuia.querySelector('.n6-guia-punto');
      if (punto && salProg[i] < 100) {
        punto.setAttribute('cx', pts[salIdx[i]][0]);
        punto.setAttribute('cy', pts[salIdx[i]][1]);
      }
    }

    function tickSalsaTecla(dt) {
      if (!sostiene || sostiene.tipo !== 'salsa') { return; }
      var i = sostiene.i;
      if (salProg[i] >= 100) { sostiene = null; return; }
      sostiene.acum = (sostiene.acum || 0) + RITMO_SALSA * dt;
      var paso = Math.floor(sostiene.acum);
      if (paso >= 1) {
        sostiene.acum -= paso;
        empujarSalsa(i, salIdx[i] + paso, false);
        if (limitado('rascaS', 250)) { sonar('rasca'); }
        if (salProg[i] < 100) { pintarGuia(); }
      }
    }

    /* ---------- Paso 5: versículo escrito con azúcar glas ---------- */
    function construirAzucar() {
      azucar.textContent = '';
      letras = [];
      polvo = [];
      centros = [];
      var cont = crear('span', 'n6-az-tx');
      function linea(txt, clase) {
        var l = crear('span', clase);
        var palabras = txt.split(' ');
        palabras.forEach(function (p, idx) {
          var w = crear('span', 'n6-pal');
          for (var c = 0; c < p.length; c++) {
            var s = crear('span', 'n6-lit');
            s.textContent = p.charAt(c);
            w.appendChild(s);
            letras.push(s);
            polvo.push(false);
          }
          l.appendChild(w);
          if (idx < palabras.length - 1) { l.appendChild(document.createTextNode(' ')); }
        });
        cont.appendChild(l);
      }
      linea(VERSICULO.texto, 'n6-az-linea');
      linea(VERSICULO.ref, 'n6-az-ref');
      azucar.appendChild(cont);
      azucar.setAttribute('role', 'img');
      azucar.setAttribute('aria-label', VERSICULO.texto + ' ' + VERSICULO.ref);
    }

    function medirLetras() {
      centros = letras.map(function (l) {
        var r = l.getBoundingClientRect();
        return { x: (r.left || 0) + (r.width || 0) / 2, y: (r.top || 0) + (r.height || 0) / 2 };
      });
    }

    function cuantoPolvo() {
      var n = 0;
      for (var i = 0; i < polvo.length; i++) { if (polvo[i]) { n += 1; } }
      return n;
    }

    function vaciarEnvioAzucar() {
      envioPendiente = false;
      while (pendientes.length) { emitir('n6:az', { k: pendientes.splice(0, 60) }); }
    }

    function aplicarPolvo(lista, remota) {
      var nuevos = [];
      lista.forEach(function (k) {
        if (k >= 0 && k < letras.length && !polvo[k]) {
          polvo[k] = true;
          letras[k].classList.add('puesto');
          nuevos.push(k);
        }
      });
      if (!nuevos.length) { return; }
      if (!remota) {
        pendientes = pendientes.concat(nuevos);
        if (!envioPendiente) { envioPendiente = true; esperar(vaciarEnvioAzucar, 120); }
        var t = Date.now();
        if (t - ultimoRasca > 220) { ultimoRasca = t; sonar('rasca'); }
      }
      if (fase === 5 && !azucarHecho && cuantoPolvo() >= Math.ceil(letras.length * UMBRAL_AZUCAR)) { completarAzucar(); }
    }

    function pasarAzucar(a, b) {
      var nuevos = [];
      for (var k = 0; k < letras.length; k++) {
        if (!polvo[k] && centros[k] && distSegmento(centros[k], a, b) <= RADIO_AZUCAR) { nuevos.push(k); }
      }
      if (nuevos.length) { aplicarPolvo(nuevos, false); }
    }

    function completarAzucar() {
      if (azucarHecho) { return; }
      azucarHecho = true;
      for (var k = 0; k < letras.length; k++) { polvo[k] = true; letras[k].classList.add('puesto'); }
      sonar('acierto');
      decir(T.azucarFin, 'succes', 3000);
      avisar(VERSICULO.texto + ' ' + VERSICULO.ref);
      esperar(function () { irAFase(6, false); }, 1700);
    }

    function tickAzucarTecla(dt) {
      if (!sostiene || sostiene.tipo !== 'azucar') { return; }
      sostiene.acum = (sostiene.acum || 0) + RITMO_AZUCAR * dt;
      var n = Math.floor(sostiene.acum);
      if (n < 1) { return; }
      sostiene.acum -= n;
      var lista = [];
      for (var k = 0; k < letras.length && lista.length < n; k++) { if (!polvo[k]) { lista.push(k); } }
      aplicarPolvo(lista, false);
    }

    /* ---------- Paso 6: partir el gofre y compartirlo ---------- */
    function crearMitades() {
      if (mitad) { return; }
      mitad = interior.cloneNode(true);
      (function quitarIds(n) {
        if (n.removeAttribute && n.getAttribute && n.getAttribute('id')) { n.removeAttribute('id'); }
        var hijos = n.children || [];
        for (var i = 0; i < hijos.length; i++) { quitarIds(hijos[i]); }
      })(mitad);
      mitad.setAttribute('aria-hidden', 'true');
      mitad.classList.add('mitad-1');
      interior.classList.add('mitad-0');
      caja.insertBefore(mitad, interior.nextSibling);
    }

    function pintarParte() {
      caja.style.setProperty('--n6-sep0', r1(parte[0] * SEPARACION) + 'px');
      caja.style.setProperty('--n6-sep1', r1(parte[1] * SEPARACION) + 'px');
    }

    function ponerParte(l, p, remota) {
      p = limitar(p, 0, 1);
      if (parteHecha || parte[l] === p) { return; }
      parte[l] = p;
      pintarParte();
      if (!remota && (limitado('parte' + l, 120) || p >= 0.98 || p === 0)) { emitir('n6:parte', { l: l, p: pc(p) }); }
      revisarParte();
    }

    function revisarParte() {
      if (fase !== 6 || parteHecha) { return; }
      if (parte[0] >= 0.98 && parte[1] >= 0.98) { finParte(); }
    }

    function finParte() {
      parteHecha = true;
      parte = [1, 1];
      caja.style.setProperty('--n6-sep0', SEPARACION_FIN + 'px');
      caja.style.setProperty('--n6-sep1', SEPARACION_FIN + 'px');
      sonar('pareja');
      decir(T.parteOk, 'succes', 3600);
      irAFase(7, false);
    }

    function asaTirada(l) {
      return (sostiene && sostiene.tipo === 'asa' && sostiene.l === l) || (arrastre && arrastre.tipo === 'asa' && arrastre.l === l);
    }

    function tickParte(dt) {
      if (parteHecha) { return; }
      var l;
      for (l = 0; l < 2; l++) {
        if (!puedo(l)) { continue; }
        if (sostiene && sostiene.tipo === 'asa' && sostiene.l === l) {
          ponerParte(l, parte[l] + RITMO_PARTE * dt, false);
        } else if (hayPareja() && !asaTirada(l) && parte[l] > 0) {
          ponerParte(l, parte[l] - RETROCESO_PARTE * dt, false);
        }
      }
    }

    /* ---------- Fantasma que sigue al puntero al arrastrar ---------- */
    function crearFantasma(tipo, i) {
      var f = crear('div', 'n6-fantasma ' + tipo);
      if (tipo === 'salsa') { f.classList.add(i % 2 === 0 ? 'azul' : 'amarilla'); }
      var svg = crearSvg('svg', { viewBox: tipo === 'salsa' ? '0 0 60 110' : '0 0 100 100', 'aria-hidden': 'true' });
      if (tipo === 'salsa') {
        svg.appendChild(crearSvg('use', { href: '#n6-botella' }));
      } else {
        svg.appendChild(crearSvg('use', { href: '#n6-ic-' + i }));
      }
      f.appendChild(svg);
      document.body.appendChild(f);
      fantasmas.push(f);
      return f;
    }

    function quitarFantasma(f) {
      if (!f) { return; }
      if (f.parentNode) { f.parentNode.removeChild(f); }
      var k = fantasmas.indexOf(f);
      if (k >= 0) { fantasmas.splice(k, 1); }
    }

    function moverFantasma(ev) {
      if (arrastre && arrastre.fantasma) {
        arrastre.fantasma.style.left = ev.clientX + 'px';
        arrastre.fantasma.style.top = ev.clientY + 'px';
      }
    }

    /* ---------- Entrada del puntero ---------- */
    /* Un puntero distinto del que empezó el gesto (otro dedo, otro ratón) no lo mueve ni lo suelta. */
    function esMio(ev, dueno) {
      return !ev || !dueno || dueno.pid === undefined || ev.pointerId === undefined || ev.pointerId === dueno.pid;
    }

    function alMover(ev) {
      if (!arrastre || !esMio(ev, arrastre)) { return; }
      var a = arrastre;
      if (a.tipo === 'ing') {
        moverFantasma(ev);
      } else if (a.tipo === 'salsa') {
        moverFantasma(ev);
        trazarSalsa(a.i, ev);
      } else if (a.tipo === 'azucar') {
        var p = { x: ev.clientX, y: ev.clientY };
        pasarAzucar(a.ult, p);
        a.ult = p;
      } else if (a.tipo === 'asa') {
        var dx = a.l === 0 ? a.x0 - ev.clientX : ev.clientX - a.x0;
        ponerParte(a.l, dx / DIST_PARTE, false);
      }
    }

    function soltarTodo(ev) {
      if (sostiene && esMio(ev, sostiene)) {
        if (sostiene.tipo === 'masa') { soltarMasa(); } else { sostiene = null; }
      }
      if (!arrastre || !esMio(ev, arrastre)) { return; }
      var a = arrastre;
      arrastre = null;
      if (a.tipo === 'ing') {
        if (ev && typeof ev.clientX === 'number') { soltarIng(a, ev); } else if (a.nodo) { a.nodo.classList.remove('cogido'); }
        quitarFantasma(a.fantasma);
      } else if (a.tipo === 'salsa') {
        salEnganche[a.i] = false;
        if (a.nodo) { a.nodo.classList.remove('cogido'); }
        quitarFantasma(a.fantasma);
      } else if (a.tipo === 'azucar') {
        vaciarEnvioAzucar();
      }
    }

    function empezarArrastre(tipo, i, ev, nodo) {
      if (arrastre || detenido) { return; }
      arrastre = { tipo: tipo, i: i, nodo: nodo, pid: ev.pointerId, fantasma: null, x0: ev.clientX, ult: { x: ev.clientX, y: ev.clientY } };
      if (tipo === 'ing' || tipo === 'salsa') {
        arrastre.fantasma = crearFantasma(tipo, i);
        moverFantasma(ev);
        if (nodo) { nodo.classList.add('cogido'); }
      }
    }

    function noPorDefecto(ev) { if (ev && ev.preventDefault) { ev.preventDefault(); } }

    function esTecla(ev) { return ev.key === 'Enter' || ev.key === ' '; }

    /* Jarra: mantener pulsado */
    escuchar(jarra, 'pointerdown', function (ev) { noPorDefecto(ev); empezarMasa(ev); });
    escuchar(jarra, 'keydown', function (ev) {
      if (!esTecla(ev)) { return; }
      noPorDefecto(ev);
      if (!ev.repeat) { empezarMasa(null); }
    });
    escuchar(jarra, 'keyup', function (ev) { if (esTecla(ev)) { noPorDefecto(ev); soltarMasa(); } });
    escuchar(jarra, 'blur', function () { soltarMasa(); });

    /* Plancha: un botón para cerrar y para voltear */
    escuchar(accion, 'click', function () { voltear(); });

    /* Ingredientes: arrastrar, o Enter */
    itemsIng.forEach(function (el, i) {
      escuchar(el, 'pointerdown', function (ev) {
        if (fase !== 3 || ings[i] || !puedo(rolIng(i))) { return; }
        noPorDefecto(ev);
        empezarArrastre('ing', i, ev, el);
      });
      escuchar(el, 'click', function (ev) {
        if (ings[i]) { mostrarCarta(T.fases[3].eti, recuerdos[i]); return; }
        if (!ev.detail) { colocarConTeclado(i); }
      });
    });

    /* Salsas: arrastrar la botella siguiendo la línea, o mantener Enter */
    itemsSal.forEach(function (el, i) {
      function elegir() {
        if (fase !== 4 || salProg[i] >= 100 || !puedo(rolSal(i))) { return false; }
        salActiva = i;
        pintarGuia();
        return true;
      }
      escuchar(el, 'pointerdown', function (ev) {
        if (!elegir()) { return; }
        noPorDefecto(ev);
        empezarArrastre('salsa', i, ev, el);
      });
      escuchar(el, 'focus', function () { elegir(); });
      escuchar(el, 'blur', function () { if (sostiene && sostiene.tipo === 'salsa' && sostiene.i === i) { sostiene = null; } });
      escuchar(el, 'keydown', function (ev) {
        if (!esTecla(ev) || ev.repeat) { if (esTecla(ev)) { noPorDefecto(ev); } return; }
        noPorDefecto(ev);
        if (fase === 4 && salProg[i] >= 100) { mostrarCarta(T.fases[4].eti, motivos[i]); return; }
        if (elegir()) { sostiene = { tipo: 'salsa', i: i, acum: 0 }; }
      });
      escuchar(el, 'keyup', function (ev) { if (esTecla(ev) && sostiene && sostiene.tipo === 'salsa') { sostiene = null; } });
      escuchar(el, 'click', function () { if (salProg[i] >= 100) { mostrarCarta(T.fases[4].eti, motivos[i]); } });
    });

    /* Azúcar: arrastrar sobre el gofre, o mantener el botón */
    escuchar(caja, 'pointerdown', function (ev) {
      if (fase !== 5 || azucarHecho) { return; }
      if (ev.target && ev.target.closest && ev.target.closest('button')) { return; }
      noPorDefecto(ev);
      medirLetras();
      empezarArrastre('azucar', 0, ev, null);
      pasarAzucar({ x: ev.clientX, y: ev.clientY }, { x: ev.clientX, y: ev.clientY });
    });
    escuchar(botonAzucar, 'pointerdown', function (ev) {
      if (fase === 5 && !azucarHecho) { noPorDefecto(ev); sostiene = { tipo: 'azucar', acum: 0, pid: ev.pointerId }; }
    });
    escuchar(botonAzucar, 'keydown', function (ev) {
      if (!esTecla(ev)) { return; }
      noPorDefecto(ev);
      if (!ev.repeat && fase === 5 && !azucarHecho) { sostiene = { tipo: 'azucar', acum: 0 }; }
    });
    escuchar(botonAzucar, 'keyup', function (ev) { if (esTecla(ev) && sostiene && sostiene.tipo === 'azucar') { sostiene = null; } });

    /* Mangos del gofre */
    asas.forEach(function (el, l) {
      escuchar(el, 'pointerdown', function (ev) {
        if (fase !== 6 || parteHecha || !puedo(l)) { return; }
        noPorDefecto(ev);
        empezarArrastre('asa', 0, ev, el);
        arrastre.l = l;
      });
      escuchar(el, 'keydown', function (ev) {
        if (!esTecla(ev)) { return; }
        noPorDefecto(ev);
        if (!ev.repeat && fase === 6 && !parteHecha && puedo(l)) { sostiene = { tipo: 'asa', l: l }; }
      });
      escuchar(el, 'keyup', function (ev) { if (esTecla(ev) && sostiene && sostiene.tipo === 'asa' && sostiene.l === l) { sostiene = null; } });
    });

    escuchar(document, 'pointermove', alMover);
    escuchar(document, 'pointerup', soltarTodo);
    escuchar(document, 'pointercancel', soltarTodo);
    escuchar(window, 'blur', function () { soltarTodo(null); });
    escuchar(window, 'resize', function () { if (fase === 5) { medirLetras(); } });

    /* ---------- Fases ---------- */
    function asentar(n) {
      if (n >= 2) {
        nivelMasa = Math.max(nivelMasa, 0.8);
        masaHecha = true;
        pintarMasa();
      }
      if (n >= 3 && !cocido) { marcarCocido(); }
      if (n >= 4) { itemsIng.forEach(function (el, i) { if (!ings[i]) { colocar(i, AUTOCOLOCA[i][0], AUTOCOLOCA[i][1], true, true); } }); }
      if (n >= 5) { for (var i = 0; i < NSAL; i++) { if (salProg[i] < 100) { completarSalsa(i, true); } } }
      if (n >= 6) {
        azucarHecho = true;
        for (var k = 0; k < letras.length; k++) { polvo[k] = true; letras[k].classList.add('puesto'); }
      }
      if (n >= 7) { parteHecha = true; parte = [1, 1]; }
    }

    /* El primer elemento de la lista que cumple la condición (para devolver el foco a quien juega con teclado). */
    function primeroMio(lista, cumple) {
      for (var i = 0; i < lista.length; i++) { if (cumple(i)) { return lista[i]; } }
      return null;
    }

    function entrar(n) {
      asentar(n);
      cocina.setAttribute('data-fase', String(n));
      var t = T.fases[n];
      etiqueta.textContent = t.eti;
      titulo.textContent = t.titulo;
      guia.textContent = t.guia;
      pasos.textContent = Math.min(n, 6) + ' din 6';
      mostrar(mando, n <= 2);
      mostrar(bandeja, n >= 3);
      mostrar(jarra, n === 1);
      mostrar(accion, n === 2);
      mostrar(medidor, n <= 2);
      mostrar(medLey, n <= 2);
      mostrar(botonAzucar, n === 5);
      mostrar(asas[0], n === 6);
      mostrar(asas[1], n === 6);
      salsasCol.classList.toggle('n6-apagado', n < 4);
      if (n === 1) { configurarMedidor(ZONA_MASA, T.leyMasa); pintarMasa(); }
      if (n === 2) {
        configurarMedidor(ZONA_DORADO, T.leyDorado);
        accion.textContent = cerrada ? T.voltea : T.cierraBtn;
        pintarDorado();
      }
      if (n === 4) {
        salActiva = siguienteSalsaMia();
        pintarGuia();
      } else {
        capaGuia.textContent = '';
      }
      if (n === 5) {
        esperar(medirLetras, 80);
        decir(T.azucarInicio, '', 2800);
      }
      if (n === 6) {
        crearMitades();
        pintarParte();
        decir(hayPareja() ? T.partePar : T.parteSolo, '', 3600);
      }
      if (n === 7) {
        crearMitades();
        caja.style.setProperty('--n6-sep0', SEPARACION_FIN + 'px');
        caja.style.setProperty('--n6-sep1', SEPARACION_FIN + 'px');
        mostrar(asas[0], false);
        mostrar(asas[1], false);
        esperar(conceder, 1800);
      }
      actualizarRol();
      firma = (hayPareja() ? '1' : '0') + miRol() + ':' + fase;
      /* El foco va al control principal, para quien juega con teclado. */
      var foco = n === 1 ? jarra : (n === 2 ? accion : (n === 5 ? botonAzucar : (n === 6 ? asas[puedo(0) ? 0 : 1] : null)));
      if (n === 3) { foco = primeroMio(itemsIng, function (i) { return !ings[i] && puedo(rolIng(i)); }); }
      if (n === 4) { foco = primeroMio(itemsSal, function (i) { return salProg[i] < 100 && puedo(rolSal(i)); }); }
      if (foco && foco.focus) { foco.focus(); }
    }

    /* Tras mezclar el estado de la otra pantalla, ¿ya está completo lo que pide la fase actual? */
    function revisarAvance() {
      if (fase === 3 && ings.every(function (v) { return !!v; })) { esperar(function () { irAFase(4, false); }, 1200); }
      else if (fase === 4 && salProg.every(function (v) { return v >= 100; })) { esperar(function () { irAFase(5, false); }, 1200); }
      else if (fase === 5 && !azucarHecho && cuantoPolvo() >= Math.ceil(letras.length * UMBRAL_AZUCAR)) { completarAzucar(); }
      else if (fase === 6) { revisarParte(); }
    }

    function irAFase(n, remota) {
      if (n <= fase || n > MAXF) { return false; }
      fase = n;
      if (!remota) { emitir('n6:fase', { f: n }); }
      entrar(n);
      return true;
    }

    /* ---------- Final: logro y salida ---------- */
    function salida() {
      if (!vigente() || salidaHecha) { return; }
      salidaHecha = true;
      mostrar(botonContinua, true);
      if (botonContinua.focus) { botonContinua.focus(); }
    }

    function conceder() {
      if (!vigente() || concedido) { return; }
      concedido = true;
      decir(T.final, 'succes', 3000);
      if (window.Logro && typeof window.Logro.conceder === 'function') {
        try {
          window.Logro.conceder(ID_LOGRO, { alTerminar: salida });
          return;
        } catch (e) { /* se cae a la reserva */ }
      }
      if (window.Juego && typeof window.Juego.florecer === 'function') { window.Juego.florecer(); }
      salida();
    }

    /* Quien pulsa "Mai departe" avisa a la otra pantalla; si el aviso se perdiera, la otra avanza por su cuenta. */
    function continuar(remota) {
      if (continuando) { return; }
      continuando = true;
      botonContinua.disabled = true;
      if (!remota) { emitir('n6:continua', {}); }
      sonar('alejarse');
      cocina.classList.add('fuera');
      escena.classList.add('rodando', 'sale');
      esperar(function () { quitarBajas(); window.Juego.siguiente(); }, remota ? 2800 : 1700);
    }
    escuchar(botonContinua, 'click', function () { continuar(false); });

    /* ---------- Intro ---------- */
    function empezarCocina() {
      pistaClic.hidden = true;
      hablaEscena.callar();
      cocina.hidden = false;
      if (fase === 0) { fase = 1; entrar(1); }
    }

    function terminarIntro() {
      if (introHecha) { return; }
      introHecha = true;
      pistaClic.hidden = true;
      esperar(empezarCocina, 500);
    }

    function saltarIntro() {
      if (introHecha) { return; }
      if (dialogo && typeof dialogo.cancelar === 'function') { dialogo.cancelar(); }
      dialogo = null;
      escena.classList.add('aparca');
      escena.classList.remove('rodando');
      introHecha = true;
      empezarCocina();
    }

    /* ---------- Tiempo real en pareja ---------- */
    function oir(tipo, fn) {
      alRecibir(tipo, function (d) { if (vigente()) { fn(d); } });
    }

    function pedirEstado() {
      pedido = true;
      estadoAplicado = false;
      emitir('n6:pide', {});
    }

    /* Tras un corte de la pareja (o al volver a verla) las dos pantallas se ponen de acuerdo otra vez. */
    var parejaAntes = hayPareja();
    function vigilarPareja() {
      var ahora = hayPareja();
      if (ahora && !parejaAntes) {
        pedirEstado();
        emitir('n6:estado', estadoActual());
      }
      parejaAntes = ahora;
    }

    oir('n6:intro', function () { saltarIntro(); });

    oir('n6:fase', function (d) {
      var f = d ? idx(d.f, 1, MAXF) : null;
      if (f === null) { return; }
      if (!introHecha) { saltarIntro(); pedirEstado(); }
      if (f > fase) { irAFase(f, true); }
    });

    oir('n6:masa', function (d) {
      var l = d ? ent(d.l, 0, 100) : null;
      if (l === null || fase !== 1 || masaHecha || (sostiene && sostiene.tipo === 'masa')) { return; }
      nivelMasa = l / 100;
      pintarMasa();
      if (d.rebosa) { rebosar(true); return; }
      if (d.fin && nivelMasa >= ZONA_MASA[0] && nivelMasa <= ZONA_MASA[1]) { exitoMasa(true); }
    });

    oir('n6:tapa', function () { if (fase === 2) { cerrar(true); } });

    oir('n6:dorado', function (d) {
      var g = d ? ent(d.g, 0, 100) : null;
      if (g === null || fase !== 2 || cocido) { return; }
      if (d.ok) { dorado = g / 100; exitoDorado(true); return; }
      if (!cerrada) { cerrar(true); }
      dorado = g / 100;
      if (d.q) { quemar(true); return; }
      pintarDorado();
    });

    oir('n6:ing', function (d) {
      var i = d ? idx(d.i, 0, NING - 1) : null;
      var x = d ? ent(d.x, 0, 1000) : null;
      var y = d ? ent(d.y, 0, 1000) : null;
      if (i === null || x === null || y === null || fase < 3) { return; }
      colocar(i, x, y, true);
    });

    oir('n6:salsa', function (d) {
      var i = d ? idx(d.i, 0, NSAL - 1) : null;
      var p = d ? ent(d.p, 0, 100) : null;
      if (i === null || p === null || fase < 4 || p <= salProg[i]) { return; }
      empujarSalsa(i, Math.round(p / 100 * (NPUNTOS - 1)), true);
    });

    oir('n6:az', function (d) {
      if (!d || !Array.isArray(d.k) || fase < 5) { return; }
      var lista = [];
      d.k.slice(0, 80).forEach(function (v) { var k = idx(v, 0, letras.length - 1); if (k !== null) { lista.push(k); } });
      aplicarPolvo(lista, true);
    });

    oir('n6:parte', function (d) {
      var l = d ? idx(d.l, 0, 1) : null;
      var p = d ? ent(d.p, 0, 100) : null;
      if (l === null || p === null || fase !== 6 || !hayPareja() || puedo(l)) { return; }
      ponerParte(l, p / 100, true);
    });

    oir('n6:continua', function () { if (salidaHecha) { continuar(true); } });

    /* Foto fija del nivel para quien entra tarde. */
    function estadoActual() {
      return {
        f: fase,
        n: pc(nivelMasa),
        c: cerrada,
        ck: cocido,
        g: pc(dorado),
        ings: ings.map(function (v) { return v ? [v.x, v.y] : 0; }),
        sal: salProg.slice(),
        az: polvo.map(function (b) { return b ? '1' : '0'; }).join(''),
        pa: [pc(parte[0]), pc(parte[1])]
      };
    }

    oir('n6:pide', function () { emitir('n6:estado', estadoActual()); });

    oir('n6:estado', function (e) {
      if (!e || typeof e !== 'object') { return; }
      var f = idx(e.f, 0, MAXF);
      if (f === null || f === 0) { return; }
      /* Se aplica si lo he pedido y aún no he recibido nada, o si la otra pantalla va por delante. */
      if (!(pedido && !estadoAplicado) && f <= fase) { return; }
      estadoAplicado = true;
      if (!introHecha) { saltarIntro(); }
      var n = ent(e.n, 0, 100);
      if (n !== null && (!puedo(0) || n / 100 > nivelMasa)) { nivelMasa = n / 100; }
      if (Array.isArray(e.ings)) {
        for (var i = 0; i < NING; i++) {
          var v = e.ings[i];
          if (Array.isArray(v)) {
            var x = ent(v[0], 0, 1000);
            var y = ent(v[1], 0, 1000);
            if (x !== null && y !== null) { colocar(i, x, y, true, true); }
          }
        }
      }
      if (Array.isArray(e.sal)) {
        for (var s = 0; s < NSAL; s++) {
          var p = ent(e.sal[s], 0, 100);
          if (p === null || p <= 0) { continue; }
          if (p >= 100) { completarSalsa(s, true); }
          else if (p > salProg[s]) { salIdx[s] = Math.round(p / 100 * (NPUNTOS - 1)); salProg[s] = p; pintarSalsa(s); }
        }
      }
      if (typeof e.az === 'string') {
        for (var k = 0; k < letras.length && k < e.az.length; k++) {
          if (e.az.charAt(k) === '1' && !polvo[k]) { polvo[k] = true; letras[k].classList.add('puesto'); }
        }
      }
      if (Array.isArray(e.pa)) {
        for (var l = 0; l < 2; l++) { var q2 = ent(e.pa[l], 0, 100); if (q2 !== null && !puedo(l)) { parte[l] = q2 / 100; } }
      }
      if (f > fase) { irAFase(f, true); } else { entrar(fase); revisarAvance(); }
      if (f === 2 || fase === 2) {
        if (e.c === true) { cerrar(true); }
        var g = ent(e.g, 0, 100);
        if (g !== null && !cocido) { dorado = g / 100; pintarDorado(); }
      }
    });

    /* ---------- Reloj del nivel ---------- */
    function paso() {
      if (!vigente()) { return; }
      var ahora = Date.now();
      var dt = Math.min(0.25, Math.max(0, (ahora - ultimoTick) / 1000));
      ultimoTick = ahora;
      if (fase === 1) { tickMasa(dt); }
      else if (fase === 2) { tickPlancha(dt); }
      else if (fase === 4) { tickSalsaTecla(dt); }
      else if (fase === 5) { tickAzucarTecla(dt); }
      else if (fase === 6) { tickParte(dt); }
      refrescarRoles();
      vigilarPareja();
      esperar(paso, TICK);
    }

    /* ---------- Arranque ---------- */
    construirAzucar();
    nivelMasa = 0;
    pintarMasa();
    pintarDorado();
    if (hayPareja()) { pedirEstado(); }

    esperar(paso, TICK);

    /* Llegada: el coche entra rodando desde la izquierda, frena, y entonces habla el piloto. */
    escena.classList.add('rodando');
    void escena.getBoundingClientRect();
    esperar(function () {
      if (introHecha) { return; }
      escena.classList.add('aparca');
      sonar('llegar');
    }, 350);
    esperar(function () { escena.classList.remove('rodando'); }, 3000);
    esperar(function () {
      if (introHecha) { return; }
      dialogo = window.Dialogo.reproducir(vineta, T.dialogo, {
        lector: mensaje,
        alTerminar: function () {
          terminarIntro();
          emitir('n6:intro', {});
        }
      });
      esperar(function () { if (!introHecha) { pistaClic.hidden = false; } }, 2200);
    }, 3400);
  }

  /* Deja el nivel limpio: sin temporizadores, listeners, suscripciones, fantasmas, diálogo ni viñeta pendientes.
     Se puede llamar sin haber iniciado y varias veces. */
  function detener() {
    detenido = true;
    limpiarRelojes();
    quitarEscuchas();
    quitarBajas();
    if (dialogo && typeof dialogo.cancelar === 'function') { dialogo.cancelar(); }
    if (hablaEscena && typeof hablaEscena.cancelar === 'function') { hablaEscena.cancelar(); }
    if (hablaLocal && typeof hablaLocal.cancelar === 'function') { hablaLocal.cancelar(); }
    fantasmas.slice().forEach(function (f) { if (f.parentNode) { f.parentNode.removeChild(f); } });
    fantasmas = [];
    dialogo = null;
  }

  window.Juego.registrar(6, { iniciar: iniciar, detener: detener });
})();
