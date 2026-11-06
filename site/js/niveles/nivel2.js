/* Nivel 2 · Barcelona: el coche llega y se detiene, el piloto presenta un álbum de fotos y, al abrirlo, el
   memory se juega sobre sus dos páginas. Cada pareja de fotos iguales se queda pegada y se agranda en un
   visor con su recompensa (una dedicatoria, una pregunta para hacerse, un indicio o un recuerdo); el juego
   no sigue hasta cerrarlo con la X. Cuando están todas, el álbum sigue abierto (pulsar una foto pegada
   vuelve a ampliarla) hasta que se cierra con el botón; entonces se concede la flor del nivel (Logro, sin
   versículo) y, ya en el ramo, aparece el botón de salida. Cada pareja encontrada suena como la siguiente nota de
   una escala ascendente (Juice.racha); un fallo reinicia la racha. Este nivel no lleva versículo.

   Contenido privado: las fotos (carpeta RUTA_FOTOS del almacén privado) y los textos de cada pareja (alt,
   recompensa) se leen con Contenido.obtener('nivel2.parejas', ...), con la misma estructura que PAREJAS. Lo que
   queda aquí es solo la estructura de reserva: nombre de archivo y tipo; sin contenido privado, cada pareja usa
   una frase genérica de GENERICAS. Hay de 2 a 9 parejas (con 7 o más el álbum usa tres filas). Las fotos van en
   cuadrado (casi 1:1, como la carta); las parejas con `foto: null` enseñan una amapola provisional.
   Los textos los tiene que revisar alguien que hable rumano. Todo el texto en rumano es un borrador que tiene que
   revisar alguien que hable el idioma.

   Tiempo real: la baraja sale igual en las dos pantallas (semilla común) y se juega por turnos. Empieza la
   persona con el id menor; cada turno son dos cartas; si acierta repite, si falla pasa a la otra. Solo quien
   tiene el turno puede voltear. Mensajes:
       n2:abre   {}                          se abre el álbum (se abre en las dos pantallas)
       n2:voltea {i}                         la persona con el turno voltea la carta de la posición i
       n2:turno  {id}                        de quién es el turno tras un fallo
       n2:pide   {nv}                        quien entra tarde pregunta por el estado
       n2:estado {orden, c, hechas, turno, nv, abierto, visor, albumCerrado}
                                             respuesta a n2:pide (gana el que lleva más volteos)
   Visor y álbum compartidos: la ficha ampliada y el cierre del álbum se ven igual en las dos pantallas.
   Cualquiera de las dos personas puede abrir o cerrar; lo aplicado por mensaje remoto no se vuelve a emitir.
       n2:visor      {i}                     se abre la ficha de la carta i (i = null la cierra)
       n2:cierra     {i}                     se cierra la ficha (solo si la otra pantalla muestra esa pareja)
       n2:cierraAlbum {}                     se cierra el álbum entero
   Si las dos abren fichas distintas a la vez, gana la del id menor. La ficha que sale sola al emparejar no se
   emite: las dos pantallas la abren por su cuenta. Sin acompañante, el nivel juega solo todas las cartas, como siempre. */
(function () {
  'use strict';

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

  function limpiarRelojes() {
    relojes.forEach(function (r) {
      if (r.tipo === 'cuadro') { cancelAnimationFrame(r.id); } else { clearTimeout(r.id); }
    });
    relojes = [];
  }

  /* Azar del nivel (sembrado en iniciar), diálogo y viñeta en curso (se cancelan al detener). */
  var azar = Math.random;
  var dialogo = null;
  var habla = null;
  var sesion = null; /* { viva } de la partida en curso */
  var limpiezas = []; /* funciones para dejar de escuchar a la Sala */

  /* El logro del nivel: la flor 2, sin versículo. Si Logro no existe, el nivel entrega la flor con Juego.florecer(). */
  var ID_LOGRO = 'n2-album';
  if (window.Logro && typeof window.Logro.definir === 'function') {
    window.Logro.definir(ID_LOGRO, { nivel: 2, flor: 2, titulo: 'Albumul nostru', versiculo: null });
  }

  var RUTA_FOTOS = 'img/barcelona/'; /* relativa al almacén de Contenido.url (en local, a assets/) */

  /* Clases de recompensa: la etiqueta que se ve junto al texto. */
  var TIPOS = {
    amintire: 'Amintire',
    dedicatie: 'Dedicație',
    intrebare: 'Întrebare',
    indiciu: 'Indiciu'
  };

  /* Estructura de reserva, una entrada por pareja (los textos reales vienen de Contenido).
     foto: nombre de archivo (o null = foto provisional con una amapola). alt: descripción corta de la foto.
     tipo: una clave de TIPOS. texto: lo que sale al emparejarla (o null = frase genérica de GENERICAS). */
  var PAREJAS = [
    { foto: 'par-1.webp', alt: '', tipo: 'dedicatie', texto: null },
    { foto: 'par-2.webp', alt: '', tipo: 'intrebare', texto: null },
    { foto: null, alt: '', tipo: 'indiciu', texto: null },
    { foto: 'par-4.webp', alt: '', tipo: 'dedicatie', texto: null },
    { foto: null, alt: '', tipo: 'intrebare', texto: null },
    { foto: 'par-6.webp', alt: '', tipo: 'amintire', texto: null },
    { foto: null, alt: '', tipo: 'intrebare', texto: null },
    { foto: null, alt: '', tipo: 'dedicatie', texto: null },
    { foto: 'par-9.webp', alt: '', tipo: 'amintire', texto: null }
  ];

  var DIALOGO = [
    'Barcelona! A doua oprire de pe drumul nostru.',
    'Am adus un album cu poze de-ale noastre. Hai să-l deschidem!',
    'Găsește perechile de poze la fel. Fiecare pereche ascunde o surpriză.'
  ];

  var AYUDA = 'Întoarce două poze. Dacă sunt la fel, rămân lipite în album.';
  var AYUDA_PAREJA = 'Întoarceți două poze, pe rând. Cine nimerește o pereche mai încearcă o dată.';
  var CIERRE = 'Albumul e plin! Apasă pe orice poză lipită ca s-o vezi din nou mărită.';

  /* Frases para las parejas sin texto propio. */
  var GENERICAS = [
    'O pereche! Rămâne lipită în album.',
    'Încă o amintire găsită.',
    'Asta o păstrăm în album.',
    'Bine ai ochit! Încă o poză la locul ei.',
    'Încă o pereche, încă o poveste.',
    'Una câte una, albumul se umple.'
  ];

  /* Colores de las fotos provisionales: fondo, pétalo, sombra y centro de la amapola. */
  var PROVISIONALES = [
    { fondo: '#f4a3b5', petalo: '#ef7a63', sombra: '#c4503f', centro: '#facc15' },
    { fondo: '#a99be8', petalo: '#facc15', sombra: '#e0a800', centro: '#0c1f5c' },
    { fondo: '#5fc4b0', petalo: '#1d4ed8', sombra: '#0c1f5c', centro: '#facc15' },
    { fondo: '#f5a04a', petalo: '#fff4d6', sombra: '#e0c79a', centro: '#0c1f5c' },
    { fondo: '#86aef5', petalo: '#f4a3b5', sombra: '#d9708c', centro: '#0c1f5c' },
    { fondo: '#facc15', petalo: '#ef7a63', sombra: '#c4503f', centro: '#0c1f5c' },
    { fondo: '#ef7a63', petalo: '#fff4d6', sombra: '#e0c79a', centro: '#1d4ed8' },
    { fondo: '#5b8ff0', petalo: '#facc15', sombra: '#e0a800', centro: '#0c1f5c' },
    { fondo: '#fff4d6', petalo: '#a99be8', sombra: '#6f5fc4', centro: '#facc15' }
  ];

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var MIN_PAREJAS = 2;
  var MAX_PAREJAS = 9;

  function reiniciarClase(nodo, clase) {
    nodo.classList.remove(clase);
    void nodo.getBoundingClientRect();
    nodo.classList.add(clase);
  }

  function barajar(lista) {
    for (var i = lista.length - 1; i > 0; i--) {
      var j = Math.floor(azar() * (i + 1));
      var t = lista[i]; lista[i] = lista[j]; lista[j] = t;
    }
    return lista;
  }

  function crearFlor(petalo, sombra, centro) {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '-50 -50 100 100');
    svg.setAttribute('aria-hidden', 'true');
    var uso = document.createElementNS(SVG_NS, 'use');
    uso.setAttribute('href', '#cabeza');
    uso.setAttribute('style', '--petalo:' + petalo + ';--sombra:' + sombra + ';--centro:' + centro);
    svg.appendChild(uso);
    return svg;
  }

  /* Pareja del contenido privado; si falta o viene mal formada, se usa la estructura de reserva. */
  function leerParejas() {
    var lista = window.Contenido ? window.Contenido.obtener('nivel2.parejas', PAREJAS) : PAREJAS;
    if (!Array.isArray(lista) || !lista.length) { return PAREJAS; }
    return lista;
  }

  function entero(n) { return typeof n === 'number' && isFinite(n) && Math.floor(n) === n; }

  function sala() { return window.Sala || null; }
  function conCompanero() { var s = sala(); return !!(s && s.hayCompanero()); }
  function emitir(tipo, datos) { var s = sala(); if (s && s.hayCompanero()) { s.emitir(tipo, datos); } }
  function miId() { var s = sala(); var yo = s && s.yo(); return yo ? yo.id : null; }
  function idCompanero() { var s = sala(); var o = s && s.companero(); return o ? o.id : null; }

  /* Id con el que empieza el turno: el menor de los dos. */
  function idInicial() {
    var yo = miId();
    var otro = idCompanero();
    if (yo === null || otro === null) { return yo; }
    return String(yo) < String(otro) ? yo : otro;
  }

  function iniciar(seccion) {
    detenido = false;
    var vida = { viva: true };
    sesion = vida;
    /* Mismo tablero para la misma semilla: el número y el orden de llamadas a azar no dependen de la pantalla. */
    azar = window.Utiles.crearAzar(window.Juego.semilla ? window.Juego.semilla(2) : undefined);
    var escena = seccion.querySelector('.escena');
    var pistaClic = seccion.querySelector('#n2-pista-clic');
    var mensaje = seccion.querySelector('#n2-mesaj');
    var vineta = seccion.querySelector('#n2-vineta-texto');
    var velo = seccion.querySelector('#n2-velo');
    var mesa = seccion.querySelector('#n2-mesa');
    var botonAbre = seccion.querySelector('#n2-abre');
    var paginaIzq = seccion.querySelector('#n2-pagina-izq');
    var paginaDcha = seccion.querySelector('#n2-pagina-dcha');
    var contador = seccion.querySelector('#n2-contador');
    var recuerdo = seccion.querySelector('#n2-recuerdo');
    var botonCierra = seccion.querySelector('#n2-inchide');
    var visor = seccion.querySelector('#n2-visor');
    var visorTarjeta = seccion.querySelector('#n2-visor-tarjeta');
    var visorFoto = seccion.querySelector('#n2-visor-foto');
    var visorTipo = seccion.querySelector('#n2-visor-tipo');
    var visorTexto = seccion.querySelector('#n2-visor-texto');
    var botonVisorCierra = seccion.querySelector('#n2-visor-cierra');
    var botonContinua = seccion.querySelector('#n2-continua');

    habla = window.Dialogo.hablante(vineta, mensaje);
    var datosParejas = leerParejas();
    var parejas = Math.max(MIN_PAREJAS, Math.min(MAX_PAREJAS, datosParejas.length));
    var cartas = [];
    var orden = []; /* la pareja que hay en cada posición del tablero (igual en las dos pantallas) */
    var volteadas = []; /* las que están boca arriba sin emparejar (como mucho dos) */
    var hechas = 0;
    var abierto = false;
    var jugando = false; /* el memory solo responde con el álbum abierto y hasta cerrarlo */
    var bloqueo = false; /* mientras dos cartas distintas siguen a la vista, o una pareja se pega y se amplía */
    var resolviendo = false; /* entre el segundo volteo de un fallo y el momento de taparlas */
    var visorActivo = null; /* { origen, automatico } mientras hay una pareja ampliada */
    var autoPendientes = {}; /* parejas pegadas cuya ficha automática aún no se ha abierto (par -> true) */
    var cierreAnticipado = {}; /* la otra persona cerró la ficha de esa pareja antes de que la nuestra se abriera */
    var visorRemoto = null; /* carta cuya ficha tiene abierta la otra persona y aún no se ha podido mostrar */
    var albumCerrado = false; /* este álbum ya se está cerrando (o se cerró) */
    var albumCerradoRemoto = false; /* la otra persona cerró el álbum entero */
    var albumListo = false; /* completar() ya se ejecutó: el botón de cerrar existe */
    var completado = false;
    var dialogoActivo = true;
    var racha = 0; /* parejas seguidas sin fallar (se reinicia al fallar) */
    var logroEntregado = false;

    /* Pareja: de quién es el turno (id), cuántos volteos van, y volteos de la otra persona que esperan su momento. */
    var turno = miId();
    var nVolteos = 0;
    var cola = [];
    var abrirRemoto = false; /* la otra persona abrió el álbum antes de que el nuestro estuviera a la vista */
    var siguienteFallo = null; /* a quién pasa el turno cuando termine de resolverse el fallo en curso */

    function sonar(nombre) {
      if (window.Sonidos && typeof window.Sonidos[nombre] === 'function') { window.Sonidos[nombre](); }
    }

    /* Acierto: la siguiente nota de la escala según la racha. Sin Juice/escala, el sonido de pareja de siempre. */
    function sonarAcierto() {
      var J = window.Juice;
      var S = window.Sonidos;
      if (J && typeof J.racha === 'function' && S && typeof S.escala === 'function') {
        S.escala(J.racha(racha));
      } else {
        sonar('pareja');
      }
    }

    /* Entrega de la flor: Logro (arrastrar al ramo) y, al terminar, la salida. Sin Logro, florecer a secas. */
    function entregarLogro() {
      if (logroEntregado) { return; }
      logroEntregado = true;
      var salida = function () {
        if (!vida.viva || detenido) { return; }
        botonContinua.hidden = false;
        botonContinua.focus();
      };
      if (window.Logro && typeof window.Logro.conceder === 'function') {
        window.Logro.conceder(ID_LOGRO, { alTerminar: salida });
      } else {
        if (window.Juego && typeof window.Juego.florecer === 'function') { window.Juego.florecer(); }
        sonar('acierto');
        salida();
      }
    }

    function datosDe(par) {
      var d = datosParejas[par];
      return d && typeof d === 'object' ? d : { foto: null, alt: '', tipo: 'amintire', texto: null };
    }

    function miTurno() { return !conCompanero() || turno === miId(); }

    /* ---- Fotos: se piden al almacén privado y se ponen cuando llega el enlace ---- */
    function crearProvisional(indicePareja) {
      var c = PROVISIONALES[indicePareja % PROVISIONALES.length];
      var prov = document.createElement('div');
      prov.className = 'foto-prov';
      prov.style.setProperty('--fondo', c.fondo);
      prov.appendChild(crearFlor(c.petalo, c.sombra, c.centro));
      return prov;
    }

    function crearCara(indicePareja) {
      var datos = datosDe(indicePareja);
      if (!datos.foto) { return crearProvisional(indicePareja); }
      var img = document.createElement('img');
      img.decoding = 'async';
      /* si la foto no llega, la carta enseña la amapola provisional y el nivel sigue */
      function fallar() {
        if (img.parentNode) { img.parentNode.replaceChild(crearProvisional(indicePareja), img); }
      }
      img.addEventListener('error', fallar);
      var pedida = window.Contenido ? window.Contenido.url(RUTA_FOTOS + datos.foto) : Promise.resolve('assets/' + RUTA_FOTOS + datos.foto);
      pedida.then(function (src) {
        if (!vida.viva) { return; }
        img.alt = datos.alt || '';
        img.src = src;
      }, fallar);
      return img;
    }

    /* Mensaje suelto bajo el álbum (ayuda, cierre). */
    function decir(texto) {
      recuerdo.textContent = texto;
      reiniciarClase(recuerdo, 'nuevo');
    }

    /* ---- Indicador de turno (solo en pareja) ---- */
    var indicador = seccion.querySelector('.n2-turno');
    if (indicador && indicador.parentNode) { indicador.parentNode.removeChild(indicador); }
    indicador = document.createElement('p');
    indicador.className = 'n2-turno';
    indicador.hidden = true;
    indicador.setAttribute('role', 'status');
    indicador.setAttribute('aria-live', 'polite');
    var puntoTurno = document.createElement('i');
    puntoTurno.setAttribute('aria-hidden', 'true');
    var textoTurno = document.createElement('span');
    indicador.appendChild(puntoTurno);
    indicador.appendChild(textoTurno);
    recuerdo.parentNode.insertBefore(indicador, recuerdo);

    function pintarTurno() {
      var hay = conCompanero();
      var s = sala();
      var yo = s && s.yo();
      var otro = s && s.companero();
      mesa.classList.toggle('n2-espera', hay && !miTurno());
      if (!hay || !yo || !otro || !jugando || completado) { indicador.hidden = true; return; }
      var mio = miTurno();
      textoTurno.textContent = mio ? 'Rândul tău' : 'Rândul lui ' + otro.nombre;
      indicador.className = 'n2-turno ' + (mio ? yo.color : otro.color) + (mio ? ' mio' : '');
      indicador.hidden = false;
    }

    function fijarTurno(id) {
      turno = conCompanero() ? id : miId();
      pintarTurno();
    }

    /* Aviso breve cuando se intenta voltear sin tener el turno. */
    function avisarTurno() {
      if (indicador.hidden) { return; }
      reiniciarClase(indicador, 'aviso');
    }

    /* Visor: la foto de la pareja en grande, con la etiqueta de su recompensa y el texto. Crece desde la carta
       pulsada. Mientras está abierto el álbum queda inerte: solo la X lo cierra y deja seguir. */
    function abrirVisor(par, origen, automatico, desdeRemoto) {
      if (!desdeRemoto && !automatico) { emitir('n2:visor', { i: cartas.indexOf(origen) }); }
      var datos = datosDe(par);
      var tipo = TIPOS[datos.tipo] ? datos.tipo : 'amintire';
      visorTipo.className = 'recuerdo-tipo tipo-' + tipo;
      visorTipo.textContent = TIPOS[tipo];
      visorTexto.textContent = datos.texto || GENERICAS[par % GENERICAS.length];
      visorFoto.textContent = '';
      visorFoto.appendChild(crearCara(par));
      visorActivo = { origen: origen, automatico: automatico };
      mesa.inert = true;
      visor.hidden = false;
      reiniciarClase(visor, 'abre');

      var r = origen.el.getBoundingClientRect();
      var t = visorTarjeta.getBoundingClientRect();
      if (r.width && t.width) {
        visorTarjeta.style.setProperty('--dx', (r.left + r.width / 2 - (t.left + t.width / 2)) + 'px');
        visorTarjeta.style.setProperty('--dy', (r.top + r.height / 2 - (t.top + t.height / 2)) + 'px');
        visorTarjeta.style.setProperty('--s', String(Math.max(0.1, r.width / t.width)));
      }
      reiniciarClase(visorTarjeta, 'crece');
      botonVisorCierra.focus();
    }

    /* Lo que queda por hacer cuando una ficha termina (se haya visto o no): soltar el bloqueo de la pareja y,
       si era la última, pasar a cerrar el álbum. Devuelve true si empezó a completar. */
    function terminarFicha(automatico) {
      if (automatico) { bloqueo = false; }
      if (hechas === parejas && !completado) {
        completado = true;
        esperar(completar, 500);
        return true;
      }
      return false;
    }

    /* Cierre de la ficha, el mismo camino para el cierre propio y el remoto (desdeRemoto no se vuelve a emitir). */
    function cerrarVisor(desdeRemoto) {
      if (!visorActivo) { return; }
      var v = visorActivo;
      visorActivo = null;
      if (!desdeRemoto) { emitir('n2:cierra', { i: cartas.indexOf(v.origen) }); }
      visor.hidden = true;
      mesa.inert = false;
      if (!terminarFicha(v.automatico) && v.origen) {
        v.origen.el.focus();
      }
    }

    /* La otra persona amplió la ficha de la carta i. Si ya tengo otra distinta abierta a mano, gana el id menor. */
    function abrirVisorRemoto(i) {
      var c = cartas[i];
      if (!c || !jugando || albumCerrado || albumCerradoRemoto) { return; }
      if (c.estado !== 'hecha' && c.estado !== 'pendiente') { return; }
      if (visorActivo) {
        if (visorActivo.origen && visorActivo.origen.par === c.par) { return; }
        if (visorActivo.automatico || soyElMenor()) { return; }
        cerrarVisor(true);
      }
      var auto = !!autoPendientes[c.par];
      delete autoPendientes[c.par];
      abrirVisor(c.par, c, auto, true);
    }

    /* La otra persona cerró su ficha (de la carta i, si lo dice). */
    function cerrarVisorRemoto(i) {
      var c = entero(i) && i >= 0 && i < cartas.length ? cartas[i] : null;
      if (visorActivo) {
        if (c && visorActivo.origen && visorActivo.origen.par !== c.par) { return; } /* cierra otra ficha, no la mía */
        cerrarVisor(true);
      } else if (c && (autoPendientes[c.par] || c.estado !== 'hecha')) {
        /* se adelantó a mi ficha automática: cuando le toque abrirse, ya está cerrada */
        cierreAnticipado[c.par] = true;
      }
    }

    function soyElMenor() {
      var yo = miId();
      var otro = idCompanero();
      return yo !== null && otro !== null && String(yo) < String(otro);
    }

    function pintarContador() {
      contador.textContent = 'Perechi: ' + hechas + ' / ' + parejas;
    }

    function etiquetaCarta(c) {
      var alt = datosDe(c.par).alt;
      if (c.estado === 'oculta') { return 'Poză ascunsă. Apasă pentru a o întoarce.'; }
      if (c.estado === 'volteada') { return 'Poză întoarsă' + (alt ? ': ' + alt : '') + '.'; }
      return 'Pereche găsită' + (alt ? ': ' + alt : '') + '. Apasă pentru a o mări.';
    }

    function pintarCarta(c) {
      c.el.setAttribute('aria-label', etiquetaCarta(c));
    }

    function crearCarta(par) {
      var el = document.createElement('button');
      el.type = 'button';
      el.className = 'carta';
      el.setAttribute('data-par', String(par));

      var giro = document.createElement('span');
      giro.className = 'carta-giro';
      var dorso = document.createElement('span');
      dorso.className = 'carta-dorso';
      dorso.appendChild(crearFlor('#facc15', '#e0a800', '#0c1f5c'));
      var cara = document.createElement('span');
      cara.className = 'carta-cara';
      cara.appendChild(crearCara(par));
      giro.appendChild(dorso);
      giro.appendChild(cara);
      el.appendChild(giro);

      var c = { el: el, par: par, estado: 'oculta' };
      pintarCarta(c);
      el.addEventListener('click', function () { pulsar(c); });
      return c;
    }

    /* Monta las cartas en las dos páginas siguiendo `ordenDado` (o una baraja nueva con la semilla común). */
    function construirTablero(ordenDado) {
      paginaIzq.textContent = '';
      paginaDcha.textContent = '';
      cartas = [];
      volteadas = [];
      cola = [];
      hechas = 0;
      resolviendo = false;
      if (ordenDado) {
        orden = ordenDado.slice();
      } else {
        orden = [];
        for (var p = 0; p < parejas; p++) { orden.push(p, p); }
        barajar(orden);
      }
      var filas = Math.max(2, Math.ceil(parejas / 3));
      mesa.style.setProperty('--filas', String(filas));
      orden.forEach(function (par, k) {
        var c = crearCarta(par);
        cartas.push(c);
        (k < parejas ? paginaIzq : paginaDcha).appendChild(c.el);
      });
      pintarContador();
      if (window.Contenido && typeof window.Contenido.precargar === 'function') {
        var rutas = [];
        for (var q = 0; q < parejas; q++) {
          var d = datosDe(q);
          if (d.foto) { rutas.push(RUTA_FOTOS + d.foto); }
        }
        window.Contenido.precargar(rutas);
      }
    }

    function voltear(c) {
      c.estado = 'volteada';
      c.el.classList.add('volteada');
      pintarCarta(c);
      sonar('voltear');
    }

    function ocultar(c) {
      c.estado = 'oculta';
      c.el.classList.remove('volteada', 'mal');
      pintarCarta(c);
    }

    function pegar(a, b) {
      [a, b].forEach(function (c) {
        c.estado = 'hecha';
        c.el.classList.add('hecha');
        c.el.style.setProperty('--rot', (azar() * 5 - 2.5).toFixed(1) + 'deg');
        c.el.classList.add('destello');
        pintarCarta(c);
      });
      esperar(function () { a.el.classList.remove('destello'); b.el.classList.remove('destello'); }, 1100);
      hechas += 1;
      racha += 1;
      pintarContador();
      sonarAcierto();
      /* Cuando acaba el destello, la pareja se agranda con su recompensa. */
      autoPendientes[a.par] = true;
      esperar(function () {
        if (!autoPendientes[a.par]) { return; } /* ya abierta (por la otra persona) o descartada por un estado nuevo */
        delete autoPendientes[a.par];
        if (cierreAnticipado[a.par]) {
          delete cierreAnticipado[a.par];
          terminarFicha(true);
          return;
        }
        abrirVisor(a.par, a, true);
      }, 1000);
    }

    /* Un volteo ya aceptado (propio o de la otra persona): mueve el tablero igual en las dos pantallas. */
    function procesarVolteo(c, ajena) {
      nVolteos += 1;
      c.porOtro = !!ajena;
      voltear(c);
      volteadas.push(c);
      if (volteadas.length < 2) { return; }

      var a = volteadas[0];
      var b = volteadas[1];
      volteadas = [];
      if (a.par === b.par) {
        /* "pendiente": ya no se puede volver a pulsar, pero todavía no se ha pegado (espera a que termine el giro).
           Acierto: el turno no cambia. */
        a.estado = 'pendiente';
        b.estado = 'pendiente';
        bloqueo = true; /* hasta que se cierre el visor de esta pareja */
        esperar(function () { pegar(a, b); }, 600);
      } else {
        /* Fallo: se reinicia la racha y el turno pasa a la otra persona. Se fija ahora a quién, para que no dependa del orden de los relojes. */
        racha = 0;
        var yoTeniaElTurno = turno === miId();
        var siguiente = yoTeniaElTurno ? idCompanero() : miId();
        siguienteFallo = siguiente;
        bloqueo = true;
        resolviendo = true;
        esperar(function () { a.el.classList.add('mal'); b.el.classList.add('mal'); }, 450);
        esperar(function () {
          ocultar(a);
          ocultar(b);
          bloqueo = false;
          resolviendo = false;
          siguienteFallo = null;
          if (conCompanero() && siguiente !== null) {
            fijarTurno(siguiente);
            if (yoTeniaElTurno) { emitir('n2:turno', { id: siguiente }); }
          }
          vaciarCola();
        }, 1150);
      }
    }

    /* Volteos de la otra persona que llegaron antes de poder aplicarse (álbum aún cerrado o fallo por resolver). */
    function vaciarCola() {
      while (cola.length && jugando && !resolviendo && volteadas.length < 2) {
        var c = cola.shift();
        if (c.estado === 'oculta') { procesarVolteo(c, true); }
      }
    }

    function pulsar(c) {
      if (!jugando) { return; }
      if (c.estado === 'hecha') {
        if (!bloqueo && !visorActivo) { abrirVisor(c.par, c, false, false); }
        return;
      }
      if (c.estado !== 'oculta' || bloqueo || resolviendo) { return; }
      if (!miTurno()) { avisarTurno(); return; }
      emitir('n2:voltea', { i: cartas.indexOf(c) });
      procesarVolteo(c);
    }

    /* Todas las parejas pegadas: el álbum se queda abierto para mirarlo con calma. */
    function completar() {
      albumListo = true;
      decir(CIERRE);
      pintarTurno();
      botonCierra.hidden = false;
      botonCierra.focus();
      intentarCierreRemoto();
    }

    /* La otra persona ya cerró el álbum: se cierra aquí en cuanto esté a la vista y completo. */
    function intentarCierreRemoto() {
      if (!albumCerradoRemoto || albumCerrado || !jugando || !albumListo) { return; }
      if (visorActivo) { cerrarVisor(true); }
      cerrarAlbum(true);
    }

    /* Muestra la ficha que la otra persona tenía abierta cuando entramos, en cuanto el álbum se pueda usar. */
    function aplicarVisorPendiente() {
      if (visorRemoto === null || !jugando || albumCerrado || albumCerradoRemoto) { return; }
      var i = visorRemoto;
      visorRemoto = null;
      if (visorActivo && cartas[i] && visorActivo.origen && visorActivo.origen.par === cartas[i].par) { return; }
      if (visorActivo) { cerrarVisor(true); }
      var c = cartas[i];
      if (c && c.estado === 'hecha') { abrirVisor(c.par, c, false, true); }
    }

    function abrirAlbum(desdeRemoto) {
      if (abierto) { return; }
      abierto = true;
      if (!desdeRemoto) { emitir('n2:abre', {}); }
      botonAbre.disabled = true;
      mesa.classList.add('abierto');
      sonar('hoja');
      esperar(function () {
        paginaIzq.inert = false;
        paginaDcha.inert = false;
        jugando = true;
        decir(conCompanero() ? AYUDA_PAREJA : AYUDA);
        pintarTurno();
        vaciarCola();
        aplicarVisorPendiente();
        if (hechas === parejas && !completado) {
          /* quien entra tarde a un álbum ya completo */
          completado = true;
          completar();
        }
      }, 1500);
    }

    function cerrarAlbum(desdeRemoto) {
      if (!jugando) { return; }
      jugando = false;
      albumCerrado = true;
      if (!desdeRemoto) { emitir('n2:cierraAlbum', {}); }
      botonCierra.disabled = true;
      paginaIzq.inert = true;
      paginaDcha.inert = true;
      mesa.classList.remove('abierto');
      indicador.hidden = true;
      sonar('hoja');
      esperar(function () {
        mesa.classList.add('guardado');
        velo.classList.remove('activo');
        esperar(function () {
          mesa.hidden = true;
          entregarLogro();
        }, 800);
      }, 1500);
    }

    /* El piloto termina de hablar y, un momento después, aparece el álbum cerrado. */
    function mostrarAlbum() {
      dialogoActivo = false;
      pistaClic.hidden = true;
      esperar(function () {
        habla.callar();
        velo.classList.add('activo');
        mesa.hidden = false;
        reiniciarClase(mesa, 'entra');
        botonAbre.focus();
        if (abrirRemoto) { esperar(function () { abrirAlbum(true); }, 900); }
      }, 1800);
    }

    botonAbre.addEventListener('click', function () { abrirAlbum(false); });
    botonCierra.addEventListener('click', function () { cerrarAlbum(false); });
    botonVisorCierra.addEventListener('click', function () { cerrarVisor(false); });

    botonContinua.addEventListener('click', function () {
      botonContinua.disabled = true;
      sonar('alejarse');
      botonContinua.classList.add('fuera');
      escena.classList.add('rodando', 'sale');
      esperar(function () { window.Juego.siguiente(); }, 1700);
    });

    /* ---- Estado completo (para quien entra tarde) ---- */
    function estadoCompleto() {
      return {
        orden: orden.slice(),
        /* 0 oculta, 1 volteada a la espera de la segunda, 2 pegada; un fallo que se está tapando cuenta como oculto */
        c: cartas.map(function (c) { return c.estado === 'hecha' || c.estado === 'pendiente' ? 2 : (c.estado === 'volteada' && volteadas.indexOf(c) >= 0 ? 1 : 0); }),
        hechas: hechas,
        turno: resolviendo && siguienteFallo !== null ? siguienteFallo : turno,
        nv: nVolteos,
        abierto: abierto,
        visor: indiceVisor(),
        albumCerrado: albumCerrado
      };
    }

    /* Posición de la carta cuya ficha está (o está a punto de estar) abierta; null si ninguna. */
    function indiceVisor() {
      if (visorActivo && visorActivo.origen) {
        var k = cartas.indexOf(visorActivo.origen);
        if (k >= 0) { return k; }
      }
      for (var j = 0; j < cartas.length; j++) {
        if (autoPendientes[cartas[j].par]) { return j; }
      }
      return null;
    }

    function ordenValido(o) {
      if (!Array.isArray(o) || o.length !== parejas * 2) { return false; }
      var cuenta = {};
      for (var k = 0; k < o.length; k++) {
        if (!entero(o[k]) || o[k] < 0 || o[k] >= parejas) { return false; }
        cuenta[o[k]] = (cuenta[o[k]] || 0) + 1;
      }
      for (var p = 0; p < parejas; p++) { if (cuenta[p] !== 2) { return false; } }
      return true;
    }

    function mismoOrden(o) {
      if (o.length !== orden.length) { return false; }
      for (var k = 0; k < o.length; k++) { if (o[k] !== orden[k]) { return false; } }
      return true;
    }

    function aplicarEstado(e) {
      if (!e || !ordenValido(e.orden) || !Array.isArray(e.c) || e.c.length !== e.orden.length || !entero(e.nv)) { return; }
      var otroId = idCompanero();
      /* Que el álbum esté abierto se contagia siempre, aunque el tablero no cambie. */
      if (e.abierto && !abierto) {
        if (!mesa.hidden) { abrirAlbum(true); } else { abrirRemoto = true; }
      }
      /* Que el álbum ya se cerró también se contagia siempre. */
      if (e.albumCerrado && !albumCerradoRemoto) {
        albumCerradoRemoto = true;
        intentarCierreRemoto();
      }
      /* Gana quien lleva más volteos; con los mismos, solo cambia el tablero si el estado viene del id menor. */
      var viene = e.nv > nVolteos || (e.nv === nVolteos && !mismoOrden(e.orden) && otroId !== null && String(otroId) < String(miId()));
      if (!viene) { return; }
      descartarJugadaEnCurso();
      autoPendientes = {};
      cierreAnticipado = {};
      if (!mismoOrden(e.orden)) { construirTablero(e.orden); }
      var rehechas = 0;
      e.c.forEach(function (valor, k) {
        var c = cartas[k];
        c.el.classList.remove('volteada', 'hecha', 'mal', 'destello');
        c.estado = 'oculta';
        if (valor === 2) {
          c.estado = 'hecha';
          c.el.classList.add('volteada', 'hecha');
          c.el.style.setProperty('--rot', (azar() * 5 - 2.5).toFixed(1) + 'deg');
          rehechas += 1;
        } else if (valor === 1) {
          c.estado = 'volteada';
          c.el.classList.add('volteada');
          volteadas.push(c);
        }
        pintarCarta(c);
      });
      volteadas = volteadas.slice(0, 1);
      hechas = Math.floor(rehechas / 2);
      nVolteos = e.nv;
      bloqueo = false;
      resolviendo = false;
      pintarContador();
      if (e.nv === 0) { turno = idInicial(); } else if (e.turno === miId() || e.turno === otroId) { turno = e.turno; }
      pintarTurno();
      /* La ficha que la otra persona tiene abierta: si no hay ninguna, se cierra la mía. */
      var objetivo = entero(e.visor) && e.visor >= 0 && e.visor < cartas.length ? e.visor : null;
      if (objetivo === null && visorActivo) { cerrarVisor(true); }
      visorRemoto = objetivo;
      aplicarVisorPendiente();
      if (jugando && hechas === parejas && !completado) {
        completado = true;
        completar();
      }
    }

    /* Un estado nuevo sustituye al tablero: se descartan las cartas a medias y los volteos en cola. */
    function descartarJugadaEnCurso() {
      cola = [];
      volteadas = [];
    }

    function pedirEstado() {
      if (conCompanero()) { emitir('n2:pide', { nv: nVolteos }); }
    }

    /* ---- Mensajes de la otra persona ---- */
    var s = sala();
    if (s) {
      limpiezas.push(s.alRecibir('n2:abre', function () {
        if (!vida.viva) { return; }
        if (abierto) { return; }
        if (!mesa.hidden) { abrirAlbum(true); } else { abrirRemoto = true; }
      }));

      limpiezas.push(s.alRecibir('n2:voltea', function (d) {
        if (!vida.viva || !d || !entero(d.i) || d.i < 0 || d.i >= cartas.length) { return; }
        var c = cartas[d.i];
        if (c.estado !== 'oculta' || cola.indexOf(c) >= 0) { return; }
        cola.push(c);
        vaciarCola();
      }));

      limpiezas.push(s.alRecibir('n2:turno', function (d) {
        if (!vida.viva || !d) { return; }
        if (d.id === miId() || d.id === idCompanero()) { fijarTurno(d.id); }
      }));

      limpiezas.push(s.alRecibir('n2:visor', function (d) {
        if (!vida.viva || !d) { return; }
        if (d.i === null) { cerrarVisorRemoto(null); return; }
        if (entero(d.i) && d.i >= 0 && d.i < cartas.length) { abrirVisorRemoto(d.i); }
      }));

      limpiezas.push(s.alRecibir('n2:cierra', function (d) {
        if (!vida.viva) { return; }
        cerrarVisorRemoto(d ? d.i : null);
      }));

      limpiezas.push(s.alRecibir('n2:cierraAlbum', function () {
        if (!vida.viva || albumCerradoRemoto) { return; }
        albumCerradoRemoto = true;
        intentarCierreRemoto();
      }));

      limpiezas.push(s.alRecibir('n2:pide', function (d) {
        if (!vida.viva || !d || !entero(d.nv)) { return; }
        /* Si quien pregunta va por delante, no se le pisa: es él quien responde con el suyo. */
        if (nVolteos >= d.nv) { emitir('n2:estado', estadoCompleto()); }
      }));

      limpiezas.push(s.alRecibir('n2:estado', function (e) {
        if (!vida.viva) { return; }
        aplicarEstado(e);
      }));

      s.alCambiar(function (hay) {
        if (!vida.viva || detenido) { return; }
        if (hay) {
          /* Llega alguien: si no ha empezado nadie, el turno es del id menor; si no, se sincroniza el estado. */
          if (nVolteos === 0) { turno = idInicial(); }
          pedirEstado();
          if (jugando && !completado) { decir(AYUDA_PAREJA); }
        } else {
          /* Se va: el turno pasa a quien queda y se destapa una carta suelta que dejó a medias. */
          turno = miId();
          cola = [];
          if (volteadas.length === 1 && volteadas[0].porOtro && !resolviendo) {
            ocultar(volteadas[0]);
            volteadas = [];
          }
          if (jugando && !completado) { decir(AYUDA); }
        }
        pintarTurno();
      });
    }

    construirTablero();
    if (conCompanero()) {
      turno = idInicial();
      pedirEstado();
    }
    pintarTurno();

    /* Llegada: el coche entra rodando desde la izquierda, frena, y entonces habla el piloto. */
    escena.classList.add('rodando');
    void escena.getBoundingClientRect();
    esperar(function () {
      escena.classList.add('aparca');
      sonar('llegar');
    }, 350);
    esperar(function () { escena.classList.remove('rodando'); }, 3000);
    esperar(function () {
      dialogo = window.Dialogo.reproducir(vineta, DIALOGO, { lector: mensaje, alTerminar: mostrarAlbum });
      esperar(function () { if (dialogoActivo) { pistaClic.hidden = false; } }, 2200);
    }, 3400);
  }

  /* Deja el nivel limpio: sin temporizadores, diálogo, viñeta ni escuchas pendientes. Se puede llamar sin haber iniciado y varias veces. */
  function detener() {
    detenido = true;
    if (sesion) { sesion.viva = false; }
    limpiezas.forEach(function (f) { try { f(); } catch (e) { /* nada que limpiar */ } });
    limpiezas = [];
    limpiarRelojes();
    if (dialogo && typeof dialogo.cancelar === 'function') { dialogo.cancelar(); }
    if (habla && typeof habla.cancelar === 'function') { habla.cancelar(); }
    dialogo = null;
  }

  window.Juego.registrar(2, { iniciar: iniciar, detener: detener });
})();
