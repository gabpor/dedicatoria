/* Nivel 7 · Bruselas, el final: el coche llega, el piloto presenta un cofre con candado de cuatro cifras (ziua și luna
   de una fecha que cuenta para vosotros). Al acertar, el cofre se abre, suben farolillos amarillos sobre el cielo azul,
   salen el versículo (Cântarea Cântărilor 8:6, Cornilescu) con un sello de pasaporte y se concede el primer logro
   (la octava flor, Logro 'n7-cofre'). Después, la carta con efecto de máquina de escribir y, al terminarla, el segundo
   logro (la novena flor, la bicolor, Logro 'n7-carta'). Cada logro se arrastra al ramo y, ya en él, sale el botón que
   sigue ("Citește scrisoarea" tras el cofre; "Privește drumul" tras la carta). Sin Logro, se usa Juego.florecer(). Un último botón
   deja ver el camino, que sigue más allá, hasta una casita con la ventana encendida. Es el último nivel: no hay siguiente.

   Lo privado ya no vive aquí:
   - El código se comprueba en el servidor (RPC abrir_cofre); el navegador nunca conoce los códigos válidos.
   - La carta llega en la respuesta de abrir_cofre (o de leer_carta para la otra persona): { parrafos: [...], firma }.
   - Los textos del piloto salen de Contenido ('nivel7.dialogo', 'nivel7.fallos', 'nivel7.final_piloto'); aquí solo
     quedan frases neutras de reserva.
   - 'nivel7.mensaje' (opcional): { tipo: 'audio' | 'video', archivo: 'audio/mensaje.mp3' } con la ruta dentro del
     almacén privado; sin él no se enseña el botón. Pendiente de elegir.
   - La canción de cierre: pendiente de elegir.
   - Modo local (sin Supabase): vale el código de desarrollo y se enseña una carta genérica, para poder probar el flujo.

   En pareja: las cuatro ruedas son compartidas (n7:cifra), el cofre se abre a la vez en las dos pantallas (n7:abierto →
   la otra pide la carta con leer_carta), los farolillos y la máquina de escribir arrancan a la vez (n7:leer) y quien
   entra tarde pide el estado (n7:pide → n7:estado).

   Todo el texto en rumano es un borrador que tiene que revisar alguien que hable el idioma. */
(function () {
  'use strict';

  /* Relojes pendientes del nivel: detener() los cancela todos para dejarlo limpio. */
  var relojes = [];
  var detenido = false; /* tras detener(), nada nuevo se programa hasta el siguiente iniciar() */
  var sesion = 0; /* cambia en cada iniciar() y en detener(): las respuestas del servidor tardías se descartan */

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

  /* Suscripciones a la sala (tiempo real): cada una es la función que devuelve Sala.alRecibir. */
  var bajas = [];

  function alRecibir(tipo, fn) {
    if (detenido || !window.Sala || typeof window.Sala.alRecibir !== 'function') { return; }
    bajas.push(window.Sala.alRecibir(tipo, fn));
  }

  function quitarBajas() {
    bajas.forEach(function (baja) { if (typeof baja === 'function') { baja(); } });
    bajas = [];
  }

  function emitir(tipo, datos) {
    if (window.Sala && typeof window.Sala.emitir === 'function') { window.Sala.emitir(tipo, datos); }
  }

  /* Diálogo, viñeta y audio/vídeo del mensaje en curso (se paran al detener). */
  var dialogo = null;
  var habla = null;
  var medioActivo = null;

  /* Cliente de Supabase (null en modo local). */
  function clienteSupabase() {
    return window.Acceso && typeof window.Acceso.cliente === 'function' ? window.Acceso.cliente() : null;
  }

  function contenido(clave, porDefecto) {
    return window.Contenido ? window.Contenido.obtener(clave, porDefecto) : porDefecto;
  }

  function listaTextos(valor, porDefecto) {
    if (!Array.isArray(valor) || !valor.length) { return porDefecto; }
    var limpia = valor.filter(function (t) { return typeof t === 'string' && t; });
    return limpia.length ? limpia : porDefecto;
  }

  /* Solo en modo local: sin servidor no hay código real, y se enseña una carta genérica. */
  var CODIGO_LOCAL = '0000';

  /* Carta genérica de reserva (sin servidor, o si el servidor devuelve la carta vacía). */
  var CARTA_RESERVA = {
    parrafos: ['Dragă,', 'Mulțumesc că ai condus alături de mine.'],
    firma: ''
  };

  /* Normaliza lo que devuelve el servidor: { parrafos: [...], firma: '...' }. Vacío o raro → carta de reserva. */
  function normalizarCarta(valor) {
    if (!valor || typeof valor !== 'object' || !Array.isArray(valor.parrafos)) { return CARTA_RESERVA; }
    var parrafos = valor.parrafos.filter(function (p) { return typeof p === 'string' && p; });
    if (!parrafos.length) { return CARTA_RESERVA; }
    return { parrafos: parrafos, firma: typeof valor.firma === 'string' ? valor.firma : '' };
  }

  /* Textos de reserva del piloto: neutros. Los verdaderos llegan por Contenido. */
  var DIALOGO_RESERVA = [
    'Bruxelles. Am ajuns.',
    'În fața noastră e un cufăr cu patru cifre.'
  ];
  var FALLOS_RESERVA = [
    'Mmm, nu pare să fie asta.',
    'Nu... încă nu. Mai încearcă.',
    'Ziua și luna: patru cifre, ZZLL.'
  ];
  var FINAL_RESERVA = 'Drum bun.';
  var SE_DESCHIDE = 'Se deschide!';
  var AVISO_LIMITE = 'Prea multe încercări. Așteaptă un minut.';
  var AVISO_ERROR = 'Ceva nu a mers. Mai încearcă.';

  /* Los dos logros del nivel: el cofre (flor 7, con el versículo que ya se ve con el sello) y la carta (flor 8, bicolor). */
  var ID_COFRE = 'n7-cofre';
  var ID_CARTA = 'n7-carta';
  if (window.Logro && typeof window.Logro.definir === 'function') {
    window.Logro.definir(ID_COFRE, {
      nivel: 7,
      flor: 7,
      titulo: 'Cufărul deschis',
      versiculo: {
        texto: 'Pune-mă ca o pecete pe inima ta, ca o pecete pe brațul tău; căci dragostea este tare ca moartea…',
        ref: 'Cântarea Cântărilor 8:6'
      }
    });
    window.Logro.definir(ID_CARTA, { nivel: 7, flor: 8, titulo: 'Scrisoarea', versiculo: null });
  }

  /* Un clic suave al girar una rueda del cofre. Si Sonidos.definir no existe, el clic simplemente no suena. */
  if (window.Sonidos && typeof window.Sonidos.definir === 'function') {
    window.Sonidos.definir('clicRueda', function (api) {
      api.tono(api.t, 660, 0.05, 0.035, 'triangle');
    });
  }

  var N_FAROLES = 24;
  var MS_LETRA = 38;
  var CADA_TECLA = 3; /* un tic suave cada tres letras */

  function sinMovimiento() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function iniciar(seccion) {
    detenido = false;
    sesion += 1;
    var miSesion = sesion;
    function vigente() { return !detenido && miSesion === sesion; }
    function q(id) { return seccion.querySelector('#' + id); }

    var DIALOGO = listaTextos(contenido('nivel7.dialogo', null), DIALOGO_RESERVA);
    var FALLOS = listaTextos(contenido('nivel7.fallos', null), FALLOS_RESERVA);
    var textoFinal = contenido('nivel7.final_piloto', FINAL_RESERVA);
    if (typeof textoFinal !== 'string' || !textoFinal) { textoFinal = FINAL_RESERVA; }
    var MENSAJE = contenido('nivel7.mensaje', null);
    if (!MENSAJE || typeof MENSAJE !== 'object' || typeof MENSAJE.archivo !== 'string' || !MENSAJE.archivo) { MENSAJE = null; }

    var escena = seccion.querySelector('.escena');
    var pistaClic = q('n7-pista-clic');
    var mensaje = q('n7-mesaj');
    var vineta = q('n7-vineta-texto');
    var faroles = q('n7-faroles');
    var cufar = q('n7-cufar');
    var ruedas = q('n7-ruedas');
    var botonAbrir = q('n7-abrir');
    var aviso = q('n7-mensaje');
    var panelFlor = q('n7-flor');
    var botonLeer = q('n7-leer');
    var carta = q('n7-carta');
    var papel = q('n7-papel');
    var lectura = q('n7-lectura');
    var firma = q('n7-firma');
    var saltar = q('n7-saltar');
    var bloqueFinal = q('n7-final');
    var botonMirar = q('n7-mirar');
    var botonEscuchar = q('n7-escuchar');
    var botonReleer = q('n7-releer');

    habla = window.Dialogo.hablante(vineta, mensaje);
    var cifras = [0, 0, 0, 0];
    var rueda = [];
    var mas = [];
    var menos = [];
    var digito = [];
    var intentos = 0;
    var abierto = false;
    var comprobando = false; /* hay una consulta al servidor en curso */
    var escribiendo = false;
    var cartaLeida = false;
    var leyendo = false; /* "Citește scrisoarea" ya se pulsó (aquí o en la otra pantalla) */
    var leerPendiente = false; /* la otra persona pulsó leer antes de que aquí estuviera el versículo en pantalla */
    var cofreConcedido = false;
    var dialogoActivo = true;
    var datosCarta = CARTA_RESERVA;
    var i;

    function sonar(nombre) {
      if (window.Sonidos && typeof window.Sonidos[nombre] === 'function') { window.Sonidos[nombre](); }
    }

    /* Entrega un logro (la flor se arrastra al ramo) y, al terminar, ejecuta `despues`. Sin Logro, florecer a secas. */
    function conceder(id, despues) {
      var hecho = false;
      function salida() {
        if (hecho || !vigente()) { return; }
        hecho = true;
        despues();
      }
      if (window.Logro && typeof window.Logro.conceder === 'function') {
        window.Logro.conceder(id, { alTerminar: salida });
      } else {
        if (window.Juego && typeof window.Juego.florecer === 'function') { window.Juego.florecer(); }
        sonar('acierto');
        salida();
      }
    }

    /* ---------- Las cuatro ruedas del candado ---------- */
    for (i = 0; i < 4; i++) {
      rueda.push(q('n7-rueda-' + i));
      mas.push(q('n7-mas-' + i));
      menos.push(q('n7-menos-' + i));
      digito.push(q('n7-digito-' + i));
    }

    function pintar(k) {
      digito[k].textContent = String(cifras[k]);
      rueda[k].setAttribute('aria-valuenow', cifras[k]);
    }

    /* Cambia una cifra; si el cambio es de esta persona (no llega de la otra), se avisa a la otra pantalla. */
    function poner(k, valor, deLaOtra) {
      cifras[k] = ((valor % 10) + 10) % 10;
      pintar(k);
      if (!deLaOtra) {
        sonar('clicRueda');
        emitir('n7:cifra', { pos: k, valor: cifras[k] });
      }
    }

    function enfocar(k) {
      if (k >= 0 && k < 4 && rueda[k].focus) { rueda[k].focus(); }
    }

    /* ---------- Comprobar el código (en el servidor) ---------- */
    function intentar() {
      if (abierto || comprobando) { return; }
      var codigo = cifras.join('');
      var cliente = clienteSupabase();
      if (!cliente) {
        /* Modo local: código de desarrollo y carta genérica. */
        if (codigo === CODIGO_LOCAL) { abrirCufar(CARTA_RESERVA, true); } else { fallar(); }
        return;
      }
      comprobando = true;
      botonAbrir.disabled = true;
      var respuesta;
      try {
        respuesta = cliente.rpc('abrir_cofre', { p_codigo: codigo });
      } catch (e) {
        comprobando = false;
        botonAbrir.disabled = false;
        avisarError(null);
        return;
      }
      respuesta.then(function (r) {
        if (!vigente()) { return; }
        comprobando = false;
        if (abierto) { return; } /* la otra persona acertó mientras tanto */
        botonAbrir.disabled = false;
        if (r && r.error) { avisarError(r.error); return; }
        if (r && r.data) { abrirCufar(normalizarCarta(r.data), true); } else { fallar(); }
      }, function (error) {
        if (!vigente()) { return; }
        comprobando = false;
        botonAbrir.disabled = false;
        avisarError(error);
      });
    }

    function avisarError(error) {
      var texto = error && String(error.message || '').toLowerCase().indexOf('demasiados') >= 0 ? AVISO_LIMITE : AVISO_ERROR;
      aviso.textContent = texto;
      sonar('bloqueado');
    }

    function mostrarFallo(indice) {
      aviso.textContent = FALLOS[Math.min(indice, FALLOS.length - 1)];
      ruedas.classList.remove('tiembla');
      void ruedas.getBoundingClientRect();
      ruedas.classList.add('tiembla');
      sonar('bloqueado');
    }

    function fallar() {
      var indice = intentos;
      intentos += 1;
      mostrarFallo(indice);
      emitir('n7:fallo', { i: indice });
    }

    function manejar(k) {
      mas[k].addEventListener('click', function () { if (!abierto) { poner(k, cifras[k] + 1); enfocar(k); } });
      menos[k].addEventListener('click', function () { if (!abierto) { poner(k, cifras[k] - 1); enfocar(k); } });
      rueda[k].addEventListener('keydown', function (ev) {
        if (abierto) { return; }
        var tecla = ev.key;
        var manejada = true;
        if (tecla === 'ArrowUp') { poner(k, cifras[k] + 1); }
        else if (tecla === 'ArrowDown') { poner(k, cifras[k] - 1); }
        else if (tecla === 'ArrowLeft') { enfocar(k - 1); }
        else if (tecla === 'ArrowRight') { enfocar(k + 1); }
        else if (/^[0-9]$/.test(tecla)) { poner(k, parseInt(tecla, 10)); enfocar(k + 1); }
        else if (tecla === 'Backspace') { poner(k, 0); enfocar(k - 1); }
        else if (tecla === 'Enter') { intentar(); }
        else { manejada = false; }
        if (manejada && ev.preventDefault) { ev.preventDefault(); }
      });
    }
    for (i = 0; i < 4; i++) { manejar(i); }
    botonAbrir.addEventListener('click', intentar);

    /* ---------- Farolillos ---------- */
    function lanzarFaroles() {
      var xlink = 'http://www.w3.org/2000/svg';
      for (var k = 0; k < N_FAROLES; k++) {
        var f = document.createElement('div');
        f.className = 'n7-farol';
        f.style.setProperty('--x', (3 + (k * 97 / N_FAROLES) + (k % 3) * 1.4).toFixed(1) + '%');
        f.style.setProperty('--sz', (30 + (k * 7) % 26) + 'px');
        f.style.setProperty('--dur', (11 + (k * 5) % 9) + 's');
        f.style.setProperty('--delay', '-' + ((k * 3.7) % 14).toFixed(1) + 's');
        f.style.setProperty('--dx', (((k % 5) - 2) * 24) + 'px');
        f.style.setProperty('--y', (8 + (k * 13) % 70) + '%');
        var svg = document.createElementNS(xlink, 'svg');
        svg.setAttribute('viewBox', '0 0 40 64');
        svg.setAttribute('aria-hidden', 'true');
        var uso = document.createElementNS(xlink, 'use');
        uso.setAttribute('href', '#n7-farol');
        svg.appendChild(uso);
        f.appendChild(svg);
        faroles.appendChild(f);
      }
    }

    /* ---------- El cofre se abre ---------- */

    /* Si el cofre aún no se ha enseñado (la otra persona acertó durante la charla del piloto), se corta la charla. */
    function prepararCufar() {
      if (dialogoActivo) {
        dialogoActivo = false;
        if (dialogo && typeof dialogo.cancelar === 'function') { dialogo.cancelar(); }
        dialogo = null;
      }
      pistaClic.hidden = true;
      habla.callar();
      cufar.hidden = false;
      cufar.classList.remove('fuera');
    }

    /* `propia`: el código lo acertó esta persona (hay que avisar a la otra, que pedirá la carta al servidor). */
    function abrirCufar(cartaRecibida, propia) {
      if (abierto) { return; }
      abierto = true;
      datosCarta = cartaRecibida || CARTA_RESERVA;
      prepararCufar();
      aviso.textContent = SE_DESCHIDE;
      cufar.classList.add('abierto');
      botonAbrir.disabled = true;
      sonar('acierto');
      lanzarFaroles();
      if (propia) { emitir('n7:abierto', {}); }
      esperar(function () { cufar.classList.add('fuera'); }, 2600);
      esperar(function () {
        cufar.hidden = true;
        mostrarFlor();
      }, 3300);
    }

    /* La otra persona abrió el cofre: se pide la carta al servidor (leer_carta) y se abre a la vez. */
    function recogerCarta(intento) {
      if (abierto) { return; }
      var cliente = clienteSupabase();
      if (!cliente) { abrirCufar(CARTA_RESERVA, false); return; }
      function reintentar() {
        if (intento < 4) { esperar(function () { recogerCarta(intento + 1); }, 800); } else { abrirCufar(CARTA_RESERVA, false); }
      }
      var respuesta;
      try { respuesta = cliente.rpc('leer_carta'); } catch (e) { reintentar(); return; }
      respuesta.then(function (r) {
        if (!vigente() || abierto) { return; }
        if (r && !r.error && r.data) { abrirCufar(normalizarCarta(r.data), false); } else { reintentar(); }
      }, function () {
        if (vigente() && !abierto) { reintentar(); }
      });
    }

    function mostrarFlor() {
      panelFlor.hidden = false;
      void panelFlor.getBoundingClientRect();
      panelFlor.classList.add('florece');
      esperar(function () { sonar('sello'); }, 1700);
      /* El versículo y el sello se quedan a la vista un momento; después, la flor del cofre. */
      esperar(function () {
        if (cofreConcedido) { return; }
        cofreConcedido = true;
        conceder(ID_COFRE, function () {
          botonLeer.hidden = false;
          botonLeer.focus();
          if (leerPendiente) { leerPendiente = false; leer(false); }
        });
      }, 2600);
    }

    /* Empezar la carta: lo pulsa cualquiera de las dos y arranca a la vez en las dos pantallas. */
    function leer(propia) {
      if (leyendo) { return; }
      if (!propia && panelFlor.hidden) { leerPendiente = true; return; }
      leyendo = true;
      botonLeer.disabled = true;
      if (propia) { emitir('n7:leer', {}); }
      panelFlor.classList.add('fuera');
      esperar(function () {
        panelFlor.hidden = true;
        mostrarCarta();
      }, 700);
    }

    botonLeer.addEventListener('click', function () { leer(true); });

    /* ---------- La carta, letra a letra ---------- */
    var parrafos = [];
    var pActual = 0;
    var cActual = 0;
    var contadorTic = 0;

    function terminarCarta() {
      if (!escribiendo) { return; }
      escribiendo = false;
      dejarDeEscuchar(document, 'keydown', alTecla);
      dejarDeEscuchar(document, 'click', alClic);
      for (var k = 0; k < parrafos.length; k++) {
        parrafos[k].el.textContent = parrafos[k].texto;
        parrafos[k].el.classList.remove('escribiendo');
      }
      firma.hidden = false;
      saltar.hidden = true;
      esperar(function () {
        if (cartaLeida) { return; }
        cartaLeida = true;
        carta.classList.add('florece');
        conceder(ID_CARTA, function () {
          bloqueFinal.hidden = false;
          botonMirar.focus();
        });
      }, 900);
    }

    function siguienteLetra() {
      if (!escribiendo) { return; }
      var p = parrafos[pActual];
      if (!p) { terminarCarta(); return; }
      cActual += 1;
      p.el.textContent = p.texto.slice(0, cActual);
      contadorTic += 1;
      if (contadorTic % CADA_TECLA === 0) { sonar('tecla'); }
      if (cActual >= p.texto.length) {
        p.el.classList.remove('escribiendo');
        pActual += 1;
        cActual = 0;
        if (parrafos[pActual]) {
          parrafos[pActual].el.classList.add('escribiendo');
          esperar(siguienteLetra, MS_LETRA * 8);
        } else {
          terminarCarta();
        }
        return;
      }
      esperar(siguienteLetra, MS_LETRA);
    }

    function alTecla(ev) {
      if (ev.target && ev.target.closest && ev.target.closest('button, input, a')) { return; }
      if (ev.key === 'Enter' || ev.key === ' ') {
        if (ev.preventDefault) { ev.preventDefault(); }
        terminarCarta();
      }
    }

    function alClic() { terminarCarta(); }

    function mostrarCarta() {
      carta.hidden = false;
      carta.classList.remove('fuera');
      habla.callar();
      if (cartaLeida || parrafos.length) { return; }
      lectura.textContent = datosCarta.parrafos.join(' ');
      firma.textContent = datosCarta.firma;
      datosCarta.parrafos.forEach(function (texto) {
        var el = document.createElement('p');
        el.className = 'n7-parrafo';
        papel.appendChild(el);
        parrafos.push({ el: el, texto: texto });
      });
      escribiendo = true;
      if (sinMovimiento()) { terminarCarta(); return; }
      parrafos[0].el.classList.add('escribiendo');
      escuchar(document, 'keydown', alTecla);
      escuchar(document, 'click', alClic);
      esperar(siguienteLetra, 500);
    }

    /* ---------- El final: el camino sigue ---------- */
    if (MENSAJE) { botonEscuchar.hidden = false; }
    botonEscuchar.addEventListener('click', function () {
      if (!MENSAJE) { return; }
      botonEscuchar.hidden = true;
      var tipo = MENSAJE.tipo === 'video' ? 'video' : 'audio';
      window.Contenido.url(MENSAJE.archivo).then(function (enlace) {
        if (!vigente()) { return; }
        var medio = document.createElement(tipo);
        medio.setAttribute('src', enlace);
        medio.setAttribute('controls', 'controls');
        medio.className = 'n7-medio';
        bloqueFinal.appendChild(medio);
        medioActivo = medio;
        if (medio.play) { var p = medio.play(); if (p && p.catch) { p.catch(function () {}); } }
      }, function () {
        if (vigente()) { botonEscuchar.hidden = false; } /* sin enlace: se puede volver a intentar */
      });
    });

    botonMirar.addEventListener('click', function () {
      carta.classList.add('fuera');
      esperar(function () {
        carta.hidden = true;
        botonReleer.hidden = false;
        habla.decir(textoFinal, 'succes', 0);
      }, 700);
    });

    botonReleer.addEventListener('click', function () {
      botonReleer.hidden = true;
      habla.callar();
      mostrarCarta();
    });

    /* ---------- En pareja ---------- */
    alRecibir('n7:cifra', function (d) {
      if (!d || abierto) { return; }
      var k = d.pos;
      var v = d.valor;
      if (typeof k !== 'number' || typeof v !== 'number' || k < 0 || k > 3 || Math.floor(k) !== k || v < 0 || v > 9 || Math.floor(v) !== v) { return; }
      poner(k, v, true);
    });
    alRecibir('n7:fallo', function (d) {
      if (!d || abierto || typeof d.i !== 'number') { return; }
      var indice = Math.max(0, Math.floor(d.i));
      intentos = Math.max(intentos, indice + 1);
      mostrarFallo(indice);
    });
    alRecibir('n7:abierto', function () { recogerCarta(0); });
    alRecibir('n7:leer', function () { leer(false); });
    /* Entrada tardía: quien ya está aquí responde con el estado del candado y si el cofre se abrió. */
    alRecibir('n7:pide', function () { emitir('n7:estado', { cifras: cifras.slice(), abierto: abierto }); });
    alRecibir('n7:estado', function (d) {
      if (!d || abierto) { return; }
      if (Array.isArray(d.cifras)) {
        for (var k = 0; k < 4; k++) {
          var v = d.cifras[k];
          if (typeof v === 'number' && v >= 0 && v <= 9 && Math.floor(v) === v) { poner(k, v, true); }
        }
      }
      if (d.abierto === true) { recogerCarta(0); }
    });
    emitir('n7:pide', {});

    /* ---------- Llegada: el coche entra, frena, y habla el piloto ---------- */
    escena.classList.add('rodando');
    void escena.getBoundingClientRect();
    esperar(function () {
      escena.classList.add('aparca');
      sonar('llegar');
    }, 350);
    esperar(function () { escena.classList.remove('rodando'); }, 3000);
    esperar(function () {
      if (abierto) { return; } /* el cofre ya se abrió (entrada tardía): no hay charla */
      dialogo = window.Dialogo.reproducir(vineta, DIALOGO, {
        lector: mensaje,
        alTerminar: function () {
          dialogoActivo = false;
          pistaClic.hidden = true;
          esperar(function () {
            if (abierto) { return; }
            habla.callar();
            cufar.hidden = false;
            cufar.classList.remove('fuera');
            enfocar(0);
          }, 600);
        }
      });
      esperar(function () { if (dialogoActivo) { pistaClic.hidden = false; } }, 2200);
    }, 3400);
  }

  /* Deja el nivel limpio: sin temporizadores, listeners, suscripciones a la sala, diálogo, viñeta ni audio/vídeo del
     mensaje en marcha. Se puede llamar sin haber iniciado y varias veces. */
  function detener() {
    detenido = true;
    sesion += 1;
    limpiarRelojes();
    quitarEscuchas();
    quitarBajas();
    if (dialogo && typeof dialogo.cancelar === 'function') { dialogo.cancelar(); }
    if (habla && typeof habla.cancelar === 'function') { habla.cancelar(); }
    if (medioActivo && typeof medioActivo.pause === 'function') { medioActivo.pause(); }
    dialogo = null;
    medioActivo = null;
  }

  window.Juego.registrar(7, { iniciar: iniciar, detener: detener });
})();
