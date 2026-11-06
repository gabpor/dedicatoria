/* Radio del coche: música de fondo desde un vídeo de YouTube.
   Solo arranca tras un gesto del usuario. Si el navegador bloquea el sonido o YouTube falla,
   se abre un reproductor visible para que se pueda pulsar Play a mano.
   Control en el HUD: botón de silenciar + deslizador de volumen. */
(function () {
  'use strict';

  var ID_VIDEO = 'aI0wupYSQGo';
  var VOLUMEN = 35;      /* volumen inicial de la música (0-100) */
  var ESPERA_MS = 4500;

  var T_BLOQUEO = 'Apasă Play ca să pornească muzica.';
  var T_ERROR = 'Muzica nu a putut porni. Încearcă din nou cu Play.';

  var jugador = null;
  var listo = false;
  var quiereSonar = false;
  var sonando = false;
  var cargando = false;
  var abiertaSola = false;
  var silenciada = false;
  var volumenUsuario = VOLUMEN;   /* lo que marca el deslizador */
  var volumenActual = VOLUMEN;    /* lo que se aplica ahora (puede ir por una rampa) */
  var rampa = null;
  var vigilante = null;

  function porId(id) { return document.getElementById(id); }

  function pintarControl() {
    var caja = porId('radio-control');
    if (caja) { caja.hidden = false; }
    var b = porId('radio-boton');
    if (b) {
      var audible = sonando && !silenciada && volumenUsuario > 0;
      b.setAttribute('aria-pressed', audible ? 'true' : 'false');
    }
    var s = porId('radio-volumen');
    if (s) {
      s.value = volumenUsuario;
      s.style.setProperty('--nivel', volumenUsuario + '%');
    }
  }

  function abrirPanel(texto) {
    var p = porId('radio-panel');
    if (!p) { return; }
    p.classList.remove('cerrado');
    var nota = porId('radio-nota');
    if (nota) { nota.textContent = texto || ''; }
    abiertaSola = true;
  }

  function cerrarPanel() {
    var p = porId('radio-panel');
    if (p) { p.classList.add('cerrado'); }
    abiertaSola = false;
  }

  function aplicarVolumen(v) {
    volumenActual = v;
    if (listo) { jugador.setVolume(Math.max(1, v)); }
  }

  /* Sube el volumen poco a poco (nunca desde 0: YouTube lo trata como silenciado). */
  function fundir(desde, hasta, retraso, duracion) {
    if (rampa) { clearInterval(rampa); }
    aplicarVolumen(desde);
    var inicio = Date.now() + retraso;
    rampa = setInterval(function () {
      var t = (Date.now() - inicio) / duracion;
      if (t < 0) { return; }
      if (t >= 1) { aplicarVolumen(hasta); clearInterval(rampa); rampa = null; return; }
      aplicarVolumen(Math.max(1, Math.round(desde + (hasta - desde) * t)));
    }, 100);
  }

  /* Silenciar sin pausar: la música sigue corriendo y vuelve donde estaba. */
  function silenciar(si) {
    silenciada = si;
    if (listo) {
      if (si) {
        jugador.mute();
      } else {
        jugador.unMute();
        jugador.setVolume(Math.max(1, volumenUsuario));
      }
    }
    pintarControl();
  }

  /* Deslizador: 0 silencia; cualquier otro valor la reactiva con ese volumen. */
  function cambiarVolumen(v) {
    if (rampa) { clearInterval(rampa); rampa = null; }
    volumenUsuario = v;
    volumenActual = v;
    if (v === 0) {
      silenciar(true);
    } else if (silenciada) {
      silenciar(false);
    } else {
      if (listo) { jugador.setVolume(v); }
      pintarControl();
    }
  }

  function alCambiar(evento) {
    var estado = evento.data;
    if (estado === 1) {
      sonando = true;
      clearTimeout(vigilante);
      if (abiertaSola) { setTimeout(cerrarPanel, 1200); }
    } else if (estado === 2 || estado === 0) {
      sonando = false;
    }
    pintarControl();
  }

  function crearJugador() {
    if (jugador || !window.YT || !window.YT.Player) { return; }
    jugador = new window.YT.Player('radio-reproductor', {
      width: 356,
      height: 200,
      videoId: ID_VIDEO,
      host: 'https://www.youtube-nocookie.com',
      playerVars: {
        autoplay: 0, controls: 1, disablekb: 1, fs: 0, iv_load_policy: 3,
        modestbranding: 1, playsinline: 1, rel: 0, loop: 1, playlist: ID_VIDEO
      },
      events: {
        onReady: function () {
          listo = true;
          if (silenciada) {
            jugador.mute();
          } else {
            jugador.unMute();
          }
          jugador.setVolume(Math.max(1, volumenActual));
          if (quiereSonar) { jugador.playVideo(); }
        },
        onStateChange: alCambiar,
        onAutoplayBlocked: function () { abrirPanel(T_BLOQUEO); },
        onError: function () { abrirPanel(T_ERROR); }
      }
    });
  }

  /* Carga la API de YouTube y deja el reproductor preparado (aún sin sonar). */
  function precargar() {
    if (cargando) { return; }
    cargando = true;
    if (window.YT && window.YT.Player) { crearJugador(); return; }
    var previa = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      if (typeof previa === 'function') { previa(); }
      crearJugador();
    };
    var s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    document.head.appendChild(s);
  }

  /* Debe llamarse dentro de un gesto del usuario para que el navegador permita el sonido. */
  function iniciar(opciones) {
    quiereSonar = true;
    silenciada = false;
    precargar();
    if (opciones && opciones.fundido) {
      fundir(1, Math.max(1, volumenUsuario), opciones.retraso || 0, opciones.duracion || 3000);
    } else {
      aplicarVolumen(Math.max(1, volumenUsuario));
    }
    if (listo) { jugador.unMute(); jugador.playVideo(); }
    pintarControl();

    /* Si pasado un rato no suena, se muestra el reproductor para pulsar Play a mano. */
    clearTimeout(vigilante);
    vigilante = setTimeout(function () {
      if (!sonando) { abrirPanel(listo ? T_BLOQUEO : T_ERROR); }
    }, ESPERA_MS);
  }

  /* Botón del altavoz: si aún no suena, lo intenta de nuevo; si suena, silencia o reactiva. */
  function alternar() {
    if (!sonando) { iniciar(); return; }
    if (silenciada || volumenUsuario === 0) {
      if (volumenUsuario === 0) { volumenUsuario = VOLUMEN; }
      silenciar(false);
    } else {
      silenciar(true);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var b = porId('radio-boton');
    if (b) { b.addEventListener('click', alternar); }
    var s = porId('radio-volumen');
    if (s) {
      s.addEventListener('input', function () { cambiarVolumen(parseInt(s.value, 10) || 0); });
    }
    var c = porId('radio-cerrar');
    if (c) { c.addEventListener('click', cerrarPanel); }
    precargar();
  });

  window.Radio = { iniciar: iniciar, alternar: alternar };
})();
