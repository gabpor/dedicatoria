/* Sala: tiempo real entre las dos personas (canal privado de Supabase Realtime).
   - Presencia: quién está conectado.
   - Mensajes: cualquier evento {t, d} que un nivel quiera compartir (movimiento de piezas, avance de nivel...).
   - Cursor de la otra persona.
   - Semilla compartida: las dos pantallas reparten el azar igual (ver Juego.semilla).
   Sin conexión o sin acompañante, todo sigue funcionando en solitario. */
(function () {
  'use strict';

  var cliente = null;
  var canal = null;
  var yo = null;
  var otros = {};
  var escuchas = {};
  var alCambiarFns = [];
  var semillaPropia = Math.floor(Math.random() * 4294967296) >>> 0;
  var INTERVALO_CURSOR = 100;
  var ultimoCursor = 0;
  var relojCursor = null;

  function el(id) { return document.getElementById(id); }

  function pintarPresencia() {
    var caja = el('sala-presencia');
    if (!caja || !yo) { return; }
    caja.textContent = '';
    var personas = [yo].concat(Object.keys(otros).map(function (k) { return otros[k]; }));
    personas.forEach(function (p) {
      var chip = document.createElement('span');
      chip.className = 'sala-chip ' + p.color;
      var punto = document.createElement('i');
      punto.setAttribute('aria-hidden', 'true');
      chip.appendChild(punto);
      chip.appendChild(document.createTextNode(p.nombre));
      caja.appendChild(chip);
    });
    caja.hidden = false;
    caja.setAttribute('aria-label', Object.keys(otros).length === 0 ? 'Momentan ești aici doar tu.' : 'Sunteți amândoi aici.');
  }

  function hayCompanero() { return Object.keys(otros).length > 0; }

  function companero() {
    var k = Object.keys(otros)[0];
    return k ? otros[k] : null;
  }

  function ocultarCursor() {
    var c = el('cursor-pareja');
    if (c) { c.hidden = true; }
  }

  function actualizarPresencia() {
    var estado = canal.presenceState();
    var nuevos = {};
    Object.keys(estado).forEach(function (clave) {
      if (clave === yo.id) { return; }
      var metas = estado[clave];
      if (metas && metas.length) { nuevos[clave] = metas[metas.length - 1]; }
    });
    otros = nuevos;
    if (!hayCompanero()) { ocultarCursor(); }
    pintarPresencia();
    alCambiarFns.forEach(function (fn) { fn(hayCompanero()); });
  }

  function despachar(mensaje) {
    var carga = mensaje && mensaje.payload;
    if (!carga || typeof carga.t !== 'string') { return; }
    (escuchas[carga.t] || []).slice().forEach(function (fn) { fn(carga.d); });
  }

  /* Escucha un tipo de evento. Devuelve una función para dejar de escuchar. */
  function alRecibir(tipo, fn) {
    (escuchas[tipo] = escuchas[tipo] || []).push(fn);
    return function () { escuchas[tipo] = (escuchas[tipo] || []).filter(function (f) { return f !== fn; }); };
  }

  function alCambiar(fn) { alCambiarFns.push(fn); }

  function emitir(tipo, datos) {
    if (!canal || !hayCompanero()) { return; }
    canal.send({ type: 'broadcast', event: 'm', payload: { t: tipo, d: datos } });
  }

  /* Semilla común: la del participante con el id menor. Así las dos pantallas coinciden sin ponerse de acuerdo. */
  function semillaBase() {
    var mejor = yo;
    Object.keys(otros).forEach(function (k) { if (!mejor || otros[k].id < mejor.id) { mejor = otros[k]; } });
    return mejor ? mejor.semilla : semillaPropia;
  }

  /* ---- Cursor de la otra persona ---- */
  function iniciarCursor() {
    window.addEventListener('pointermove', function (ev) {
      if (!hayCompanero()) { return; }
      var ahora = Date.now();
      if (ahora - ultimoCursor < INTERVALO_CURSOR) { return; }
      ultimoCursor = ahora;
      emitir('cursor', { x: ev.clientX / window.innerWidth, y: ev.clientY / window.innerHeight });
    }, { passive: true });
    alRecibir('cursor', function (d) {
      var c = el('cursor-pareja');
      var otro = companero();
      if (!c || !otro || !d) { return; }
      c.className = 'cursor-pareja ' + otro.color;
      c.style.transform = 'translate(' + Math.round(d.x * window.innerWidth) + 'px,' + Math.round(d.y * window.innerHeight) + 'px)';
      c.hidden = false;
      el('cursor-pareja-nombre').textContent = otro.nombre;
      clearTimeout(relojCursor);
      relojCursor = setTimeout(ocultarCursor, 4000);
    });
  }

  /* Se conecta al canal. Resuelve cuando está suscrito (o tras 6 s: el juego sigue en solitario). */
  function conectar(clienteSupabase, perfil) {
    cliente = clienteSupabase;
    yo = { id: perfil.id, nombre: perfil.nombre, color: perfil.color, semilla: semillaPropia };
    return new Promise(function (resolver) {
      var resuelto = false;
      function listo() { if (!resuelto) { resuelto = true; resolver(); } }
      setTimeout(listo, 6000);
      try {
        canal = cliente.channel('sala', { config: { private: true, presence: { key: yo.id }, broadcast: { self: false } } });
        canal.on('presence', { event: 'sync' }, actualizarPresencia);
        canal.on('broadcast', { event: 'm' }, despachar);
        canal.subscribe(function (estado) {
          if (estado === 'SUBSCRIBED') {
            canal.track(yo).then(function () { pintarPresencia(); listo(); }, listo);
          } else if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT') {
            listo();
          }
        });
        iniciarCursor();
      } catch (e) { listo(); }
    });
  }

  function desconectar() {
    if (canal && cliente) { cliente.removeChannel(canal); }
    canal = null;
    otros = {};
  }

  window.Sala = {
    conectar: conectar, desconectar: desconectar, hayCompanero: hayCompanero, companero: companero,
    semillaBase: semillaBase, emitir: emitir, alRecibir: alRecibir, alCambiar: alCambiar,
    yo: function () { return yo; }
  };
})();
