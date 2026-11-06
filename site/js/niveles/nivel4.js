/* Nivel 4 · París: el coche llega y se detiene, el piloto cuenta que se le ha roto una foto de los dos y pide
   ayuda para recomponerla. El puzzle tiene 63 piezas (9 x 7) con forma de puzzle: el tablero (un marco vacío, sin silueta
   ni líneas que den pistas) queda en el centro y las piezas sueltas se reparten alrededor. Una pieza solo se
   coge manteniendo pulsado sobre ella y se suelta al dejar de pulsar; la que se suelta cerca de su sitio encaja
   y queda fija. Hay dos ayudas: "Vezi poza" (muestra el modelo) y "Un ajutor" (coloca una pieza). Al terminar se
   borran las juntas, el piloto comenta y el cuadro completo se da la vuelta: en el reverso del puzzle está impreso el
   versículo (1 Corinteni 13:7). Cuando se ha podido leer, Logro entrega la flor (se arrastra al ramo) y aparece
   "Mai departe".

   Sonido: cada pieza que ENCAJA suena como la siguiente nota de una melodía pentatónica que sube y baja suavemente
   (Sonidos.escala). La nota depende de cuántas piezas hay colocadas, que es igual en las dos pantallas, así que en pareja
   la melodía es de los dos. Coger o soltar en vacío no suena. Al completar, una frase final corta.

   La foto y los textos personales no viven en el código: la foto se pide al almacén privado (Contenido.url) y el
   diálogo del piloto y el comentario final se leen de Contenido (claves nivel4.*). Si no hay datos, se usan los
   textos de reserva y la ilustración provisional (dos amapolas bajo la torre). La foto se recorta al formato del
   tablero (COLUMNAS x FILAS); para una foto vertical, intercambiar COLUMNAS y FILAS (por ejemplo 7 x 9). Para más o
   menos piezas, cambiar COLUMNAS y FILAS (el tamaño de las piezas se calcula solo).

   Con la otra persona conectada el puzzle es de los dos: mismo tablero en las dos pantallas (sale de la semilla
   común; las piezas se identifican por su índice) y una pieza cogida queda bloqueada para la otra persona. Mensajes
   (todos con prefijo n4:, coordenadas en unidades del escenario SVG):
     coge {i}                  he cogido la pieza i
     mueve {i,x,y}             la llevo a (x,y); como mucho unas 16 veces por segundo
     suelta {i,x,y,v,colocada} la he soltado (colocada: ha encajado; v: sello). suelta {i,cede:true}: pierdo el desempate
     encaja {i,ayuda}          "Un ajutor" ha colocado la pieza i
     pide / estado {piezas}    quien entra tarde pide el estado y el que ya está lo responde
     latido {n,mano}           cada pocos segundos: cuántas piezas llevo y cuál tengo en la mano (corrige pérdidas)
   Si las dos personas cogen la misma pieza a la vez, gana la de id menor y la otra la devuelve a su sitio. Si dos
   sueltas de la misma pieza se cruzan por el camino, las dos pantallas se quedan con la de sello mayor (reloj lógico).

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

  /* Listeners en window/document: se guardan para quitarlos todos en detener(). */
  var escuchas = [];

  function escuchar(destino, tipo, fn, opciones) {
    if (detenido) { return; }
    destino.addEventListener(tipo, fn, opciones);
    escuchas.push({ destino: destino, tipo: tipo, fn: fn, opciones: opciones });
  }

  function dejarDeEscuchar(destino, tipo, fn) {
    escuchas = escuchas.filter(function (e) {
      if (e.destino === destino && e.tipo === tipo && e.fn === fn) {
        destino.removeEventListener(tipo, fn, e.opciones);
        return false;
      }
      return true;
    });
  }

  function quitarEscuchas() {
    escuchas.forEach(function (e) { e.destino.removeEventListener(e.tipo, e.fn, e.opciones); });
    escuchas = [];
  }

  /* Azar del nivel (sembrado en iniciar), diálogo y viñeta en curso (se cancelan al detener). */
  var azar = Math.random;
  var dialogo = null;
  var habla = null;

  var RUTA_FOTO = 'img/paris/puzzle.webp'; /* en el almacén privado (Contenido.url); 900 x 700 (9:7, el formato del tablero) */
  var ESPERA_FOTO = 7000; /* si la foto tarda más, el puzzle sale con la ilustración provisional */

  /* Versículo (texto exacto, versión Cornilescu ya contrastada): NO se modifica. */
  var VERSICULO = { texto: 'Acoperă totul, crede totul, nădăjduiește totul, suferă totul.', ref: '1 Corinteni 13:7' };
  var ID_LOGRO = 'puzzle-paris';
  var TITULO_LOGRO = 'Poza refăcută';

  /* Melodía de las piezas que encajan (grados de la escala pentatónica de Sonidos.escala): sube y baja suavemente.
     A cada tercio del puzzle toda la frase sube un grado. La frase final es un arpegio corto. */
  var MELODIA = [0, 1, 2, 4, 3, 2, 1, 2, 3, 4, 5, 4, 3, 2, 1, 0];
  var FRASE_FINAL = [2, 4, 5, 7];
  var CHISPA_AL_ENCAJAR = true; /* una chispa mínima por pieza que encaja; ponerlo a false si el rendimiento no lo permite */

  var logroDefinido = false;
  function definirLogro() {
    if (logroDefinido || !window.Logro || typeof window.Logro.definir !== 'function') { return; }
    logroDefinido = true;
    window.Logro.definir(ID_LOGRO, { nivel: 4, flor: 4, titulo: TITULO_LOGRO, versiculo: { texto: VERSICULO.texto, ref: VERSICULO.ref } });
  }
  definirLogro();

  function gradoMelodia(n, total) {
    var tercio = Math.floor(n * 3 / Math.max(1, total)); /* 0, 1 o 2 */
    return MELODIA[n % MELODIA.length] + Math.min(tercio, 2);
  }

  var COLUMNAS = 9;
  var FILAS = 7;

  /* Tamaño del escenario en unidades del dibujo; coincide con el viewBox del HTML (el SVG se escala solo a la ventana). */
  var ESCENARIO = { w: 1230, h: 566 };
  var ALTO_TABLERO = 0.70; /* fracción máxima del alto que ocupa el tablero */
  var ANCHO_TABLERO = 0.44; /* ídem del ancho: el resto es para las piezas sueltas */
  var AIRE = 8; /* distancia mínima entre una pieza suelta y el tablero */
  var CANDIDATOS = 30; /* sitios probados por pieza al repartirlas: se queda con el más despejado */
  var AJUSTE = 0.35; /* a qué distancia (en celdas) de su sitio una pieza encaja sola */
  var AJUSTE_MIN = 14; /* ...y nunca menos de estas unidades */
  var SALIENTE = 0.25; /* lo que sobresale cada lengüeta, en celdas */
  var BASE_FOTO = { ancho: 600, alto: 450 }; /* espacio en el que está dibujada la imagen provisional */

  /* Tiempo real en pareja */
  var INTERVALO_MOV = 60; /* ms entre mensajes de movimiento de una pieza (unos 16 por segundo; el cursor ya gasta 10) */
  var INTERVALO_LATIDO = 3000; /* ms entre latidos */
  var ESPERA_ESTADO = 4000; /* ms que se espera la respuesta a una petición de estado */

  /* Textos de reserva: los de verdad se leen de Contenido (nivel4.dialogo, nivel4.final). */
  var DIALOGO_RESERVA = [
    'Mă ajuți s-o refac? Trage fiecare piesă la locul ei.'
  ];
  var FINAL_RESERVA = '…';

  var INICIO = 'Ține apăsat pe o piesă și trage-o pe tablă.';
  var AYUDA_PRIMERA = 'Un ajutor mic. Nu spun nimănui.';
  var AYUDA_OTRA = 'Încă un ajutor? Bine, bine.';
  var AYUDA_MODELO = 'Să te uiți la model nu înseamnă să trișezi.';

  /* Lo que dice el piloto al llegar a ciertos puntos (por piezas colocadas). */
  function comentario(colocadas, total) {
    var c = {};
    c[Math.max(1, total - 1)] = 'Mai e o singură piesă!';
    c[Math.round(total * 0.75)] = 'Trei sferturi gata! Nu te opri acum.';
    c[Math.round(total / 2)] = 'Jumătate din poză! Parcă recunosc pe cineva.';
    c[Math.round(total * 0.25)] = 'Începe să se vadă ceva!';
    c[1] = 'Prima piesă la locul ei!';
    return c[colocadas] || null;
  }

  /* Contenido privado con valor de reserva (Contenido puede no estar cargado en pruebas sueltas). */
  function privado(clave, reserva) {
    var c = window.Contenido;
    return c && typeof c.obtener === 'function' ? c.obtener(clave, reserva) : reserva;
  }

  function lineasValidas(valor, reserva) {
    if (!Array.isArray(valor) || !valor.length) { return reserva; }
    return valor.every(function (s) { return typeof s === 'string'; }) ? valor : reserva;
  }

  /* Lengüeta de un borde, en un borde de longitud 1 que va de (0,0) a (1,0); "y" positivo es hacia fuera.
     Tres curvas de Bézier cúbicas: [c1x, c1y, c2x, c2y, finx, finy]. Es simétrica respecto a x = 0,5, así que el
     borde de una pieza encaja exactamente con el de su vecina. */
  var LENGUETA = [
    [0.2, 0, 0.5, -0.1, 0.4, 0.1],
    [0.3, 0.3, 0.7, 0.3, 0.6, 0.1],
    [0.5, -0.1, 0.8, 0, 1, 0]
  ];

  function r(n) { return Math.round(n * 100) / 100; }
  function r1(n) { return Math.round(n * 10) / 10; }
  function numero(v) { return typeof v === 'number' && isFinite(v); }

  /* Un borde que sale del punto (px,py) en la dirección (ux,uy), con el exterior hacia (nx,ny).
     lado: 1 = lengüeta hacia fuera, -1 = hueco hacia dentro, 0 = borde recto. */
  function borde(px, py, ux, uy, nx, ny, lado, s) {
    if (!lado) { return 'L' + r(px + ux * s) + ' ' + r(py + uy * s); }
    var d = '';
    LENGUETA.forEach(function (seg) {
      d += 'C';
      for (var k = 0; k < 6; k += 2) {
        var x = seg[k];
        var y = seg[k + 1] * lado;
        d += r(px + (ux * x + nx * y) * s) + ' ' + r(py + (uy * x + ny * y) * s) + ' ';
      }
    });
    return d.trim();
  }

  /* Contorno de una pieza con su casilla en (0,0) y lado s. Los cuatro lados valen 1, -1 o 0. */
  function trazo(arriba, derecha, abajo, izquierda, s) {
    return 'M0 0' +
      borde(0, 0, 1, 0, 0, -1, arriba, s) +
      borde(s, 0, 0, 1, 1, 0, derecha, s) +
      borde(s, s, -1, 0, 0, 1, abajo, s) +
      borde(0, s, 0, -1, -1, 0, izquierda, s) + 'Z';
  }

  function signo() { return azar() < 0.5 ? 1 : -1; }

  var SVG_NS = 'http://www.w3.org/2000/svg';
  function nodoSvg(nombre, atributos) {
    var n = document.createElementNS(SVG_NS, nombre);
    Object.keys(atributos || {}).forEach(function (k) { n.setAttribute(k, atributos[k]); });
    return n;
  }

  /* Tamaño de las piezas y sitio del tablero: centrado, y con las piezas ocupando el resto del escenario. */
  function medidas() {
    var c = Math.floor(Math.min(ESCENARIO.h * ALTO_TABLERO / FILAS, ESCENARIO.w * ANCHO_TABLERO / COLUMNAS));
    var w = COLUMNAS * c;
    var h = FILAS * c;
    return { c: c, w: w, h: h, x: Math.round((ESCENARIO.w - w) / 2), y: Math.round((ESCENARIO.h - h) / 2) };
  }

  /* Distancia con sqrt (correctamente redondeada en todos los motores; Math.hypot puede variar en el último decimal). */
  function distancia(dx, dy) { return Math.sqrt(dx * dx + dy * dy); }

  /* Reparte los sitios de las piezas sueltas por el escenario, fuera del tablero y lo más separadas que se pueda:
     para cada pieza prueba varios sitios al azar y se queda con el más alejado de las ya colocadas. */
  function repartir(total, tablero) {
    var c = tablero.c;
    var m = Math.ceil(SALIENTE * c) + 4; /* que las lengüetas no se salgan del escenario */
    var xMin = m, xMax = ESCENARIO.w - c - m, yMin = m, yMax = ESCENARIO.h - c - m;
    var x0 = tablero.x - AIRE, x1 = tablero.x + tablero.w + AIRE;
    var y0 = tablero.y - AIRE, y1 = tablero.y + tablero.h + AIRE;

    function libre(x, y) { return x + c <= x0 || x >= x1 || y + c <= y0 || y >= y1; }

    function candidato() {
      for (var i = 0; i < 60; i++) {
        var x = xMin + azar() * (xMax - xMin);
        var y = yMin + azar() * (yMax - yMin);
        if (libre(x, y)) { return { x: x, y: y }; }
      }
      return { x: xMin, y: yMin };
    }

    var puestos = [];
    for (var i = 0; i < total; i++) {
      var mejor = null;
      var mejorD = -1;
      for (var k = 0; k < CANDIDATOS; k++) {
        var q = candidato();
        var d = Infinity;
        for (var j = 0; j < puestos.length; j++) {
          d = Math.min(d, distancia(q.x - puestos[j].x, q.y - puestos[j].y));
        }
        if (d > mejorD) { mejorD = d; mejor = q; }
      }
      puestos.push(mejor);
    }
    return puestos;
  }

  /* ---------- Pareja ---------- */
  function hayPareja() {
    var s = window.Sala;
    return !!(s && typeof s.hayCompanero === 'function' && s.hayCompanero());
  }

  function personaYo() { return window.Sala && typeof window.Sala.yo === 'function' ? window.Sala.yo() : null; }
  function personaOtra() { return window.Sala && typeof window.Sala.companero === 'function' ? window.Sala.companero() : null; }

  /* Desempate determinista: gana la persona con el id menor. */
  function gano() {
    var yo = personaYo();
    var otra = personaOtra();
    if (!yo || !otra) { return true; }
    return String(yo.id) < String(otra.id);
  }

  function claseColor(persona) {
    return persona && (persona.color === 'azul' || persona.color === 'amarillo') ? 'n4-' + persona.color : '';
  }

  function iniciar(seccion) {
    detenido = false;
    var miGeneracion = ++generacion;
    alDetener.forEach(function (quitar) { quitar(); });
    alDetener = [];
    function vivo() { return !detenido && miGeneracion === generacion; }

    /* Mismo tablero para la misma semilla: el reparto y las lengüetas solo dependen de azar y de constantes
       (ESCENARIO, COLUMNAS, FILAS), nunca del tamaño de la ventana; los signos se generan antes que los sitios. */
    azar = window.Utiles.crearAzar(window.Juego.semilla ? window.Juego.semilla(4) : undefined);
    var escena = seccion.querySelector('.escena');
    var pistaClic = seccion.querySelector('#n4-pista-clic');
    var mensaje = seccion.querySelector('#n4-mesaj');
    var vineta = seccion.querySelector('#n4-vineta-texto');
    var panel = seccion.querySelector('#n4-puzzle');
    var contador = seccion.querySelector('#n4-contador');
    var botonPrevia = seccion.querySelector('#n4-previa');
    var botonAyuda = seccion.querySelector('#n4-ayuda');
    var botonListo = seccion.querySelector('#n4-listo');
    var mesa = seccion.querySelector('#n4-mesa');
    var defs = seccion.querySelector('#n4-defs');
    var imagen = seccion.querySelector('#n4-imagen');
    var tablero = seccion.querySelector('#n4-tablero');
    var capaColocadas = seccion.querySelector('#n4-colocadas');
    var capaPrevia = seccion.querySelector('#n4-capa-previa');
    var marco = seccion.querySelector('#n4-marco');
    var capaSueltas = seccion.querySelector('#n4-sueltas');
    var voz = seccion.querySelector('#n4-voz');
    var escenaPuzzle = seccion.querySelector('#n4-escena');
    var cuadro = seccion.querySelector('#n4-cuadro');
    var frenteSvg = seccion.querySelector('#n4-frente-svg');
    var reversoTexto = seccion.querySelector('#n4-reverso-texto');
    var reversoRef = seccion.querySelector('#n4-reverso-ref');
    var reverso = seccion.querySelector('#n4-reverso');
    definirLogro();
    reversoTexto.textContent = VERSICULO.texto;
    reversoRef.textContent = VERSICULO.ref;

    habla = window.Dialogo.hablante(voz, mensaje);
    var lineasDialogo = lineasValidas(privado('nivel4.dialogo', DIALOGO_RESERVA), DIALOGO_RESERVA);
    var textoFinal = privado('nivel4.final', FINAL_RESERVA);
    if (typeof textoFinal !== 'string') { textoFinal = FINAL_RESERVA; }

    var dialogoActivo = true;
    var jugando = false; /* se pueden coger piezas */
    var completo = false; /* todas las piezas están colocadas (puede ocurrir antes de que se vea el puzzle) */
    var piezas = [];
    var colocadas = 0;
    var celda = 0; /* lado de cada pieza */
    var medida = null; /* medidas() del tablero */
    var agarre = null; /* { p, id } mientras se mantiene pulsada una pieza; null si no se tiene ninguna */
    var ayudas = 0;
    var modeloVisto = false;
    var entregado = false; /* el logro se entrega una sola vez */

    /* Foto: se pide al almacén privado mientras habla el piloto; hasta entonces (o si falla) se ve la ilustración provisional. */
    var fotoLista = false;
    var alTenerFoto = null;

    /* Pareja */
    var esperandoEstado = false;
    var habiaPareja = hayPareja();
    var ultimoEnvio = 0;
    var ultimoMov = { i: -1, x: 0, y: 0 };
    var movPendiente = false;
    var reloj = 0; /* reloj lógico: cada suelta propia lleva un número mayor que cualquiera visto hasta entonces */

    function sonar(nombre) {
      if (window.Sonidos && typeof window.Sonidos[nombre] === 'function') { window.Sonidos[nombre](); }
    }

    function mover(p) {
      p.g.style.transform = 'translate(' + r(p.x) + 'px,' + r(p.y) + 'px)';
    }

    /* La siguiente nota de la melodía (solo al encajar). Sin Sonidos.escala, el clac de siempre. */
    function notaEncaje(p) {
      var S = window.Sonidos;
      if (S && typeof S.escala === 'function') { S.escala(gradoMelodia(colocadas - 1, piezas.length)); }
      else { sonar('encaje'); }
      if (CHISPA_AL_ENCAJAR && window.Juice && typeof window.Juice.chispa === 'function') {
        var q = aPantalla(p.tx + celda / 2, p.ty + celda / 2);
        window.Juice.chispa(q.x, q.y);
      }
    }

    function aPantalla(x, y) {
      var rc = mesa.getBoundingClientRect();
      var ancho = rc.width || ESCENARIO.w;
      var alto = rc.height || ESCENARIO.h;
      var escala = Math.min(ancho / ESCENARIO.w, alto / ESCENARIO.h) || 1;
      return {
        x: (rc.left || 0) + (ancho - ESCENARIO.w * escala) / 2 + x * escala,
        y: (rc.top || 0) + (alto - ESCENARIO.h * escala) / 2 + y * escala
      };
    }

    function actualizarContador() {
      contador.textContent = 'Piese: ' + colocadas + ' din ' + piezas.length;
    }

    /* Del puntero (píxeles de pantalla) al sistema de coordenadas del dibujo. */
    function aSvg(evento) {
      var rc = mesa.getBoundingClientRect();
      var ancho = rc.width || ESCENARIO.w;
      var alto = rc.height || ESCENARIO.h;
      var escala = Math.min(ancho / ESCENARIO.w, alto / ESCENARIO.h) || 1;
      var dx = (ancho - ESCENARIO.w * escala) / 2;
      var dy = (alto - ESCENARIO.h * escala) / 2;
      return { x: (evento.clientX - (rc.left || 0) - dx) / escala, y: (evento.clientY - (rc.top || 0) - dy) / escala };
    }

    function limitar(valor, max) { return Math.max(4, Math.min(max - 4, valor)); }

    /* ---------- Mensajes con la otra persona ---------- */
    function emitir(tipo, datos) {
      var s = window.Sala;
      if (s && typeof s.emitir === 'function' && hayPareja()) { s.emitir('n4:' + tipo, datos); }
    }

    function recibir(tipo, fn) {
      var s = window.Sala;
      if (!s || typeof s.alRecibir !== 'function') { return; }
      var quitar = s.alRecibir('n4:' + tipo, function (datos) {
        if (vivo()) { fn(datos || {}); }
      });
      if (typeof quitar === 'function') { alDetener.push(quitar); }
    }

    function pieza(d) { return d && numero(d.i) ? (piezas[d.i] || null) : null; }

    /* Borde del color de quien tiene la pieza (solo con la otra persona conectada). */
    function desmarcar(p) {
      p.g.classList.remove('n4-tiene', 'n4-ajena', 'n4-azul', 'n4-amarillo');
    }

    function marcar(p, persona, ajena) {
      desmarcar(p);
      p.g.classList.add('n4-tiene');
      if (ajena) { p.g.classList.add('n4-ajena'); }
      var color = claseColor(persona);
      if (color) { p.g.classList.add(color); }
    }

    function liberar(p) {
      p.dueno = null;
      desmarcar(p);
    }

    /* La otra persona ha cogido la pieza: queda arriba, bloqueada para mí y con su color. */
    function tomarlaOtra(p) {
      p.dueno = 'otra';
      marcar(p, personaOtra(), true);
      capaSueltas.appendChild(p.g);
    }

    /* Sitio "firme" de cada pieza: el de la última suelta que gana. Cada suelta lleva un sello (reloj lógico + id de
       quien la hace) y, si dos personas sueltan la misma pieza a la vez, las dos pantallas se quedan con la de sello
       mayor; así los mensajes cruzados nunca dejan una pieza en sitios distintos. */
    function sellar() {
      reloj += 1;
      return reloj;
    }

    function visto(v) {
      if (numero(v) && v > reloj) { reloj = v; }
    }

    function miId() {
      var yo = personaYo();
      return yo ? String(yo.id) : '';
    }

    function idOtra() {
      var otra = personaOtra();
      return otra ? String(otra.id) : '';
    }

    function seloMayor(p, v, id) {
      return numero(v) && (v > p.fv || (v === p.fv && String(id) > p.fid));
    }

    function fijar(p, x, y, v, id) {
      p.fijo = { x: x, y: y };
      p.fv = v;
      p.fid = String(id);
    }

    /* La pieza vuelve a su sitio firme (si no la llevo yo en la mano). */
    function restaurar(p) {
      if (p.dueno === 'yo') { return; }
      p.x = p.fijo.x;
      p.y = p.fijo.y;
      mover(p);
    }

    /* Mensajes de movimiento de la pieza que llevo en la mano: como mucho uno cada INTERVALO_MOV, con uno
       final diferido para que la otra pantalla no se quede unos píxeles atrás. */
    function emitirMovimiento() {
      var a = agarre;
      if (!a || !hayPareja()) { return; }
      var espera = INTERVALO_MOV - (Date.now() - ultimoEnvio);
      if (espera > 0) {
        if (!movPendiente) {
          movPendiente = true;
          esperar(function () { movPendiente = false; emitirMovimiento(); }, espera);
        }
        return;
      }
      var x = r1(a.p.x);
      var y = r1(a.p.y);
      if (ultimoMov.i === a.p.i && ultimoMov.x === x && ultimoMov.y === y) { return; }
      ultimoEnvio = Date.now();
      ultimoMov = { i: a.p.i, x: x, y: y };
      emitir('mueve', { i: a.p.i, x: x, y: y });
    }

    /* Estado para quien entra tarde: las piezas colocadas, las que ya tienen un sitio firme distinto del inicial
       (x,y y su sello v,id) y la que llevo en la mano (mx,my, donde está ahora). */
    function resumen() {
      var lista = [];
      piezas.forEach(function (p) {
        var enMano = !!(agarre && agarre.p === p);
        if (p.colocada || enMano || p.fv > 0) {
          var e = { i: p.i, x: p.fijo.x, y: p.fijo.y, v: p.fv, id: p.fid, colocada: p.colocada };
          if (enMano) { e.mano = true; e.mx = r1(p.x); e.my = r1(p.y); }
          lista.push(e);
        }
      });
      return lista;
    }

    function pedirEstado() {
      if (esperandoEstado || !hayPareja()) { return; }
      esperandoEstado = true;
      emitir('pide', {});
      esperar(function () { esperandoEstado = false; }, ESPERA_ESTADO);
    }

    function latir() {
      if (!vivo()) { return; }
      emitir('latido', { n: colocadas, mano: agarre ? agarre.p.i : -1 });
      esperar(latir, INTERVALO_LATIDO);
    }

    /* ---------- Foto ---------- */
    function aplicarFoto(url) {
      imagen.textContent = '';
      imagen.removeAttribute('transform');
      imagen.appendChild(nodoSvg('image', {
        href: url, x: 0, y: 0, width: medida.w, height: medida.h, preserveAspectRatio: 'xMidYMid slice'
      }));
    }

    function fotoResuelta() {
      fotoLista = true;
      var f = alTenerFoto;
      alTenerFoto = null;
      if (f && vivo()) { f(); }
    }

    function cargarFoto() {
      var c = window.Contenido;
      if (!c || typeof c.url !== 'function') { fotoResuelta(); return; }
      esperar(fotoResuelta, ESPERA_FOTO);
      var promesa = null;
      try { promesa = c.url(RUTA_FOTO); } catch (e) { promesa = null; }
      if (!promesa || typeof promesa.then !== 'function') { fotoResuelta(); return; }
      promesa.then(function (url) {
        if (!vivo()) { return; }
        if (typeof Image !== 'function') { aplicarFoto(url); fotoResuelta(); return; }
        var prueba = new Image(); /* se espera a que cargue para que las piezas no se vean en blanco */
        prueba.onload = function () { if (vivo()) { aplicarFoto(url); } fotoResuelta(); };
        prueba.onerror = function () { fotoResuelta(); };
        prueba.src = url;
      }).then(null, function () { fotoResuelta(); });
    }

    /* ---------- Construcción de la mesa ---------- */
    function construirMesa() {
      var t = medidas();
      var c = t.c;
      celda = c;
      medida = t;

      mesa.setAttribute('viewBox', '0 0 ' + ESCENARIO.w + ' ' + ESCENARIO.h);
      escenaPuzzle.style.setProperty('--razon', (ESCENARIO.w / ESCENARIO.h).toFixed(3));

      /* La imagen: la ilustración provisional ya dibujada en el HTML (escalada al tablero); la foto real la sustituye al llegar. */
      var escala = Math.max(t.w / BASE_FOTO.ancho, t.h / BASE_FOTO.alto);
      var desX = (t.w - BASE_FOTO.ancho * escala) / 2;
      var desY = (t.h - BASE_FOTO.alto * escala) / 2;
      imagen.setAttribute('transform', 'translate(' + desX.toFixed(2) + ' ' + desY.toFixed(2) + ') scale(' + escala.toFixed(4) + ')');

      tablero.setAttribute('x', t.x);
      tablero.setAttribute('y', t.y);
      tablero.setAttribute('width', t.w);
      tablero.setAttribute('height', t.h);
      marco.setAttribute('x', t.x - 3);
      marco.setAttribute('y', t.y - 3);
      marco.setAttribute('width', t.w + 6);
      marco.setAttribute('height', t.h + 6);
      capaPrevia.setAttribute('transform', 'translate(' + t.x + ' ' + t.y + ')');
      var recorteModelo = nodoSvg('clipPath', { id: 'n4-recorte-modelo' });
      recorteModelo.appendChild(nodoSvg('rect', { x: 0, y: 0, width: t.w, height: t.h }));
      defs.appendChild(recorteModelo);
      capaPrevia.setAttribute('clip-path', 'url(#n4-recorte-modelo)');

      /* Lengüetas: una por cada junta entre dos piezas, hacia un lado o hacia el otro al azar. */
      var horizontal = []; /* debajo de la pieza (f, col) */
      var vertical = []; /* a la derecha de la pieza (f, col) */
      var f, col;
      for (f = 0; f < FILAS; f++) {
        horizontal.push([]);
        vertical.push([]);
        for (col = 0; col < COLUMNAS; col++) {
          horizontal[f].push(f < FILAS - 1 ? signo() : 0);
          vertical[f].push(col < COLUMNAS - 1 ? signo() : 0);
        }
      }

      var sitios = repartir(FILAS * COLUMNAS, t);
      var n = 0;
      for (f = 0; f < FILAS; f++) {
        for (col = 0; col < COLUMNAS; col++) {
          var arriba = f > 0 ? -horizontal[f - 1][col] : 0;
          var derecha = vertical[f][col];
          var abajo = horizontal[f][col];
          var izquierda = col > 0 ? -vertical[f][col - 1] : 0;
          crearPieza(n, col, f, trazo(arriba, derecha, abajo, izquierda, c), t, sitios[n]);
          n += 1;
        }
      }
      actualizarContador();
    }

    function crearPieza(i, col, fila, d, t, sitio) {
      var c = t.c;
      var g = nodoSvg('g', { 'class': 'pieza', 'data-i': i });
      var clip = nodoSvg('clipPath', { id: 'n4-cp-' + i });
      clip.appendChild(nodoSvg('path', { d: d }));
      defs.appendChild(clip);
      var recorte = nodoSvg('g', { 'clip-path': 'url(#n4-cp-' + i + ')' });
      recorte.appendChild(nodoSvg('use', { href: '#n4-imagen', transform: 'translate(' + (-col * c) + ' ' + (-fila * c) + ')' }));
      g.appendChild(recorte);
      g.appendChild(nodoSvg('path', { 'class': 'borde-sombra', d: d }));
      g.appendChild(nodoSvg('path', { 'class': 'contorno', d: d }));

      var p = {
        i: i, col: col, fila: fila, g: g, colocada: false,
        tx: t.x + col * c, ty: t.y + fila * c,
        x: limitar(sitio.x, ESCENARIO.w - c),
        y: limitar(sitio.y, ESCENARIO.h - c),
        dx: 0, dy: 0,
        dueno: null, /* 'yo' | 'otra' | null: quién la tiene en la mano */
        fijo: null, /* sitio firme: dónde está cuando nadie la tiene en la mano (ver fijar) */
        fv: 0, fid: '' /* sello de ese sitio; 0 = el de partida */
      };
      p.fijo = { x: p.x, y: p.y };
      mover(p);
      capaSueltas.appendChild(g);
      piezas.push(p);

      g.addEventListener('pointerdown', function (ev) { alPulsar(p, ev); });
    }

    /* ---------- Coger, arrastrar y soltar ----------
       Una pieza solo está en la mano mientras se mantiene pulsado. El movimiento y el final de la pulsación se
       escuchan en la ventana (no en la pieza) para no depender de la captura del puntero: si el botón se suelta
       fuera de la ventana, o la ventana pierde el foco, la pieza se suelta igualmente. */
    function mismoPuntero(ev) {
      return ev.pointerId === undefined || agarre.id === undefined || ev.pointerId === agarre.id;
    }

    function alPulsar(p, ev) {
      if (!jugando || p.colocada) { return; }
      if (p.dueno === 'otra') { return; } /* la tiene la otra persona */
      if (typeof ev.button === 'number' && ev.button > 0) { return; }
      if (ev.isPrimary === false) { return; }
      if (ev.preventDefault) { ev.preventDefault(); }
      if (agarre) { soltar(); } /* una pulsación nueva significa que la anterior ya terminó */

      var punto = aSvg(ev);
      p.dx = punto.x - p.x;
      p.dy = punto.y - p.y;
      p.dueno = 'yo';
      p.g.classList.remove('encaja');
      p.g.classList.add('arrastra');
      if (hayPareja()) { marcar(p, personaYo(), false); }
      capaSueltas.appendChild(p.g); /* encima de las demás; antes de capturar, porque mover un nodo suelta la captura */
      agarre = { p: p, id: ev.pointerId };
      try { p.g.setPointerCapture(ev.pointerId); } catch (e) { /* sin captura también funciona */ }
      escuchar(window, 'pointermove', alArrastrar);
      escuchar(window, 'pointerup', alTerminarPulsacion);
      escuchar(window, 'pointercancel', alTerminarPulsacion);
      escuchar(window, 'blur', soltar);
      ultimoMov = { i: -1, x: 0, y: 0 };
      emitir('coge', { i: p.i });
    }

    function alArrastrar(ev) {
      if (!agarre || !mismoPuntero(ev)) { return; }
      if (ev.pointerType === 'mouse' && ev.buttons === 0) { soltar(); return; } /* el botón ya no está pulsado */
      var p = agarre.p;
      var punto = aSvg(ev);
      p.x = limitar(punto.x - p.dx, ESCENARIO.w - celda);
      p.y = limitar(punto.y - p.dy, ESCENARIO.h - celda);
      mover(p); /* primero se pinta aquí; el mensaje sale después */
      emitirMovimiento();
    }

    function alTerminarPulsacion(ev) {
      if (!agarre || !mismoPuntero(ev)) { return; }
      soltar();
    }

    /* Deja de tener la pieza en la mano (sin decidir qué pasa con ella). Devuelve el agarre, o null si no había. */
    function terminarAgarre() {
      var a = agarre;
      if (!a) { return null; }
      agarre = null;
      dejarDeEscuchar(window, 'pointermove', alArrastrar);
      dejarDeEscuchar(window, 'pointerup', alTerminarPulsacion);
      dejarDeEscuchar(window, 'pointercancel', alTerminarPulsacion);
      dejarDeEscuchar(window, 'blur', soltar);
      a.p.g.classList.remove('arrastra');
      try { a.p.g.releasePointerCapture(a.id); } catch (e) { /* ya soltado */ }
      return a;
    }

    /* La pieza se suelta donde esté; si queda cerca de su sitio, encaja. */
    function soltar() {
      var a = terminarAgarre();
      if (!a) { return; }
      var p = a.p;
      liberar(p);
      if (hayPareja()) { p.x = r1(p.x); p.y = r1(p.y); mover(p); } /* las dos pantallas guardan las mismas cifras */
      if (distancia(p.x - p.tx, p.y - p.ty) <= Math.max(AJUSTE * celda, AJUSTE_MIN)) { encajar(p, 'local'); }
      var v = sellar();
      fijar(p, p.x, p.y, v, miId());
      emitir('suelta', { i: p.i, x: p.x, y: p.y, v: v, colocada: p.colocada });
    }

    /* Pierdo el desempate: la pieza vuelve a su sitio firme y se la queda la otra persona. */
    function ceder(p) {
      terminarAgarre();
      liberar(p);
      restaurar(p);
      emitir('suelta', { i: p.i, cede: true });
    }

    /* La pieza va a su sitio y queda fija. modo: 'local' (la he soltado yo), 'ayuda' (el botón), 'remota' (la ha
       soltado la otra persona), 'ayuda-remota' (su botón) o 'estado' (al ponerme al día: sin sonido ni animación). */
    function encajar(p, modo) {
      if (p.colocada) { return; }
      var silencioso = modo === 'estado';
      p.colocada = true;
      liberar(p);
      colocadas += 1;
      p.x = p.tx;
      p.y = p.ty;
      p.g.classList.remove('arrastra');
      if (silencioso) {
        p.g.classList.add('colocada');
        capaColocadas.appendChild(p.g);
        mover(p);
      } else {
        p.g.classList.add('encaja', 'colocada');
        mover(p);
        notaEncaje(p);
        esperar(function () {
          p.g.classList.remove('encaja');
          capaColocadas.appendChild(p.g); /* las colocadas quedan por debajo de las sueltas */
        }, 280);
      }
      actualizarContador();

      if (colocadas === piezas.length) {
        jugando = false;
        esperar(completar, silencioso ? 0 : 700);
        return;
      }
      if (modo === 'local' || modo === 'remota') {
        var texto = comentario(colocadas, piezas.length);
        if (texto) { habla.decir(texto, '', 3400); }
      }
    }

    function completar() {
      if (completo) { return; }
      completo = true;
      jugando = false;
      if (!panel.hidden) { mostrarFinal(); } /* si el piloto aún habla, se muestra al abrir el puzzle */
    }

    function mostrarFinal() {
      mesa.classList.remove('ver');
      mesa.classList.add('completa');
      botonPrevia.hidden = true;
      botonAyuda.hidden = true;
      habla.decir(textoFinal, 'succes', 0);
      fraseFinal();
      /* Las juntas se borran, un respiro, y el cuadro se da la vuelta. */
      esperar(voltearCuadro, 1900);
    }

    /* Una frase final corta: un arpegio ascendente (solo en el momento de completar). */
    function fraseFinal() {
      var S = window.Sonidos;
      if (S && typeof S.escala === 'function') {
        FRASE_FINAL.forEach(function (g, k) {
          if (k === 0) { S.escala(g); } else { esperar(function () { S.escala(g); }, k * 140); }
        });
      } else {
        sonar('acierto');
      }
    }

    /* El cuadro completo se pone exactamente sobre el tablero y gira: detrás está el versículo impreso. */
    function voltearCuadro() {
      if (!vivo() || entregado) { return; }
      var t = medida;
      cuadro.style.left = (t.x / ESCENARIO.w * 100).toFixed(3) + '%';
      cuadro.style.top = (t.y / ESCENARIO.h * 100).toFixed(3) + '%';
      cuadro.style.width = (t.w / ESCENARIO.w * 100).toFixed(3) + '%';
      cuadro.style.height = (t.h / ESCENARIO.h * 100).toFixed(3) + '%';
      frenteSvg.setAttribute('viewBox', '0 0 ' + t.w + ' ' + t.h);
      cuadro.hidden = false;
      void cuadro.getBoundingClientRect();
      mesa.classList.add('n4-oculta-tablero'); /* el cuadro sustituye al tablero ya completo */
      esperar(function () {
        cuadro.classList.add('n4-vuelto');
        sonar('voltear');
      }, 60);
      esperar(function () {
        cuadro.classList.add('n4-impreso');
        reverso.removeAttribute('aria-hidden');
        mensaje.textContent = VERSICULO.texto + ' ' + VERSICULO.ref;
      }, 1400);
      /* Un respiro para leerlo antes de entregar la flor. */
      esperar(entregar, 4200);
    }

    function entregar() {
      if (!vivo() || entregado) { return; }
      entregado = true;
      function seguir() {
        if (!vivo()) { return; }
        botonListo.hidden = false;
        botonListo.focus();
      }
      if (window.Logro && typeof window.Logro.conceder === 'function') {
        window.Logro.conceder(ID_LOGRO, { alTerminar: seguir });
      } else {
        window.Juego.florecer();
        seguir();
      }
    }

    /* ---------- Ayudas ---------- */
    botonPrevia.addEventListener('click', function () {
      if (!jugando) { return; }
      var visible = !mesa.classList.contains('ver');
      if (visible) { mesa.classList.add('ver'); } else { mesa.classList.remove('ver'); }
      botonPrevia.setAttribute('aria-pressed', visible ? 'true' : 'false');
      botonPrevia.textContent = visible ? 'Ascunde poza' : 'Vezi poza';
      if (visible && !modeloVisto) {
        modeloVisto = true;
        habla.decir(AYUDA_MODELO, '', 3600);
      }
    });

    /* La pieza la elige quien pulsa; la otra pantalla recibe cuál es (no vuelve a tirar del azar). */
    botonAyuda.addEventListener('click', function () {
      if (!jugando) { return; }
      var libres = piezas.filter(function (p) { return !p.colocada && p.dueno === null; });
      if (!libres.length) { return; }
      var p = libres[Math.floor(azar() * libres.length)];
      capaSueltas.appendChild(p.g);
      ayudas += 1;
      encajar(p, 'ayuda');
      emitir('encaja', { i: p.i, ayuda: true });
      if (jugando) { habla.decir(ayudas === 1 ? AYUDA_PRIMERA : AYUDA_OTRA, '', 3400); }
    });

    /* ---------- Final del nivel ---------- */
    botonListo.addEventListener('click', function () {
      botonListo.disabled = true;
      sonar('alejarse');
      panel.classList.add('fuera');
      escena.classList.add('rodando', 'sale');
      esperar(function () { window.Juego.siguiente(); }, 1700);
    });

    function mostrarPuzzle() {
      if (!vivo()) { return; }
      if (!fotoLista) { alTenerFoto = mostrarPuzzle; return; } /* se reanuda en cuanto la foto llega (o falla) */
      panel.hidden = false;
      panel.classList.remove('fuera');
      if (completo) { mostrarFinal(); return; } /* se terminó entre los dos mientras hablaba el piloto */
      jugando = true;
      habla.decir(INICIO, '', 5200);
    }

    /* ---------- Mensajes recibidos ---------- */
    recibir('coge', function (d) {
      var p = pieza(d);
      if (!p || p.colocada) { return; }
      if (p.dueno === 'yo') {
        if (gano()) { return; } /* la misma pieza a la vez: gana el id menor, y soy yo */
        ceder(p);
      }
      tomarlaOtra(p);
    });

    recibir('mueve', function (d) {
      var p = pieza(d);
      if (!p || p.colocada || p.dueno !== 'otra' || !numero(d.x) || !numero(d.y)) { return; }
      p.x = limitar(d.x, ESCENARIO.w - celda);
      p.y = limitar(d.y, ESCENARIO.h - celda);
      mover(p);
    });

    recibir('suelta', function (d) {
      var p = pieza(d);
      if (!p) { return; }
      visto(d.v);
      if (d.cede) {
        /* La otra persona perdió el desempate: deja la pieza sin moverla, que vuelve a su sitio firme. */
        if (p.dueno === 'otra') {
          liberar(p);
          restaurar(p);
        }
        return;
      }
      if (p.colocada) { return; }
      if (d.colocada) {
        if (agarre && agarre.p === p) { terminarAgarre(); } /* la encajaron antes de enterarse de que la había cogido */
        liberar(p);
        encajar(p, 'remota');
        return;
      }
      if (numero(d.x) && numero(d.y) && seloMayor(p, d.v, idOtra())) {
        fijar(p, limitar(d.x, ESCENARIO.w - celda), limitar(d.y, ESCENARIO.h - celda), d.v, idOtra());
      }
      if (p.dueno === 'yo') { return; } /* la sigo teniendo yo: al soltarla, mi sello será mayor */
      liberar(p);
      restaurar(p); /* queda en el sitio de la suelta ganadora (esta, o una anterior si esta llega tarde) */
    });

    recibir('encaja', function (d) {
      var p = pieza(d);
      if (!p || p.colocada) { return; }
      if (agarre && agarre.p === p) { terminarAgarre(); }
      liberar(p);
      capaSueltas.appendChild(p.g);
      encajar(p, d.ayuda ? 'ayuda-remota' : 'remota');
    });

    recibir('pide', function () {
      emitir('estado', { piezas: resumen() });
    });

    recibir('estado', function (d) {
      if (!esperandoEstado || !Array.isArray(d.piezas)) { return; }
      esperandoEstado = false;
      d.piezas.forEach(function (e) {
        var p = pieza(e);
        if (!p) { return; }
        visto(e.v);
        if (p.colocada) { return; }
        if (e.colocada) {
          if (agarre && agarre.p === p) { terminarAgarre(); }
          liberar(p);
          encajar(p, 'estado');
          return;
        }
        if (numero(e.x) && numero(e.y) && seloMayor(p, e.v, e.id)) {
          fijar(p, limitar(e.x, ESCENARIO.w - celda), limitar(e.y, ESCENARIO.h - celda), e.v, e.id);
        }
        if (p.dueno === 'yo') { return; }
        if (e.mano && numero(e.mx) && numero(e.my)) {
          p.x = limitar(e.mx, ESCENARIO.w - celda);
          p.y = limitar(e.my, ESCENARIO.h - celda);
          mover(p);
          if (p.dueno !== 'otra') { tomarlaOtra(p); }
          return;
        }
        liberar(p);
        restaurar(p);
      });
    });

    recibir('latido', function (d) {
      if (numero(d.n) && d.n > colocadas) { pedirEstado(); } /* la otra pantalla lleva más piezas: se me ha perdido algo */
      var liberada = false;
      piezas.forEach(function (p) {
        if (p.dueno === 'otra' && p.i !== d.mano) { /* ya no la tiene en la mano: se perdió su suelta */
          liberar(p);
          restaurar(p);
          liberada = true;
        }
      });
      if (liberada) { pedirEstado(); } /* y con el estado se sabe dónde la dejó */
    });

    /* Si la otra persona sale, sus piezas en mano quedan libres; si entra (o vuelve), se le pide el estado. */
    if (window.Sala && typeof window.Sala.alCambiar === 'function') {
      window.Sala.alCambiar(function () {
        if (!vivo()) { return; }
        var hay = hayPareja();
        if (hay === habiaPareja) { return; }
        habiaPareja = hay;
        if (hay) {
          pedirEstado();
          return;
        }
        esperandoEstado = false;
        piezas.forEach(function (p) {
          if (p.dueno === 'otra') { /* se queda donde la dejó, y ese es ya su sitio firme */
            liberar(p);
            fijar(p, p.x, p.y, sellar(), miId());
          }
        });
      });
    }

    construirMesa();
    cargarFoto();
    if (hayPareja()) { pedirEstado(); } /* si entro cuando ya estaban jugando, me ponen al día */
    esperar(latir, INTERVALO_LATIDO);

    /* Llegada: el coche entra rodando desde la izquierda, frena, y entonces habla el piloto. */
    escena.classList.add('rodando');
    void escena.getBoundingClientRect();
    esperar(function () {
      escena.classList.add('aparca');
      sonar('llegar');
    }, 350);
    esperar(function () { escena.classList.remove('rodando'); }, 3000);
    esperar(function () {
      dialogo = window.Dialogo.reproducir(vineta, lineasDialogo, {
        lector: mensaje,
        alTerminar: function () {
          dialogoActivo = false;
          pistaClic.hidden = true;
          esperar(mostrarPuzzle, 600);
        }
      });
      esperar(function () { if (dialogoActivo) { pistaClic.hidden = false; } }, 2200);
    }, 3400);
  }

  /* Deja el nivel limpio: sin temporizadores, listeners, suscripciones, diálogo ni viñeta pendientes. Se puede llamar sin haber iniciado y varias veces. */
  function detener() {
    detenido = true;
    limpiarRelojes();
    quitarEscuchas();
    alDetener.forEach(function (quitar) { quitar(); });
    alDetener = [];
    if (dialogo && typeof dialogo.cancelar === 'function') { dialogo.cancelar(); }
    if (habla && typeof habla.cancelar === 'function') { habla.cancelar(); }
    dialogo = null;
  }

  window.Juego.registrar(4, { iniciar: iniciar, detener: detener });
})();
