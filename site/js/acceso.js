/* Acceso: pantalla de inicio de sesión (correo + contraseña) antes de entrar al juego.
   Usa Supabase Auth. Las cuentas se crean a mano (no hay registro público). La sesión se guarda solo en
   sessionStorage: al cerrar la pestaña hay que volver a entrar. */
(function () {
  'use strict';

  var TXT = {
    verificando: 'Se verifică…',
    mal: 'E-mail sau parolă incorecte.',
    espera: 'Prea multe încercări. Mai încearcă peste câteva secunde.',
    sinPerfil: 'Acces nepermis.',
    sinConfig: 'Accesul nu este configurat.',
    red: 'Nu pot ajunge la server. Verifică conexiunea.'
  };
  var MAX_FALLOS = 5;
  var BLOQUEO_MS = 30000;

  var cliente = null;
  var perfil = null;
  var fallos = 0;
  var bloqueadoHasta = 0;

  function el(id) { return document.getElementById(id); }

  /* Almacén de sesión que no falla si el navegador bloquea sessionStorage. */
  function almacen() {
    var memoria = {};
    try {
      window.sessionStorage.setItem('_t', '1');
      window.sessionStorage.removeItem('_t');
      return window.sessionStorage;
    } catch (e) {
      return {
        getItem: function (k) { return Object.prototype.hasOwnProperty.call(memoria, k) ? memoria[k] : null; },
        setItem: function (k, v) { memoria[k] = String(v); },
        removeItem: function (k) { delete memoria[k]; }
      };
    }
  }

  function esLocal() { return ['localhost', '127.0.0.1', ''].indexOf(window.location.hostname) >= 0; }
  function configurado() { return !!(window.CONFIG && window.CONFIG.SUPABASE_URL && window.CONFIG.SUPABASE_ANON_KEY); }

  function crearCliente() {
    return window.supabase.createClient(window.CONFIG.SUPABASE_URL, window.CONFIG.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storage: almacen() },
      realtime: { params: { eventsPerSecond: 60 } }
    });
  }

  /* Comprueba que la cuenta es una de las dos personas (tabla perfiles). */
  function cargarPerfil(usuario) {
    return cliente.from('perfiles').select('id,nombre,color').eq('id', usuario.id).maybeSingle().then(function (r) {
      if (r.error || !r.data) { return cliente.auth.signOut().then(function () { return null; }); }
      return r.data;
    });
  }

  function mostrarMensaje(texto) { el('acceso-mensaje').textContent = texto || ''; }

  function ocultarPantalla() {
    var a = el('acceso');
    a.classList.add('saliendo');
    setTimeout(function () { a.hidden = true; a.classList.remove('saliendo'); }, 500);
  }

  /* Entra al juego con el perfil ya validado. */
  function entrar(alListo) {
    window.Contenido.cargar(cliente).catch(function () { /* sin contenido privado el juego usa los textos por defecto */ })
      .then(function () { return window.Sala.conectar(cliente, perfil); })
      .then(function () {
        el('acceso-clave').value = '';
        ocultarPantalla();
        alListo({ cliente: cliente, perfil: perfil });
      });
  }

  function alEnviar(evento, alListo) {
    evento.preventDefault();
    if (Date.now() < bloqueadoHasta) { mostrarMensaje(TXT.espera); return; }
    var correo = el('acceso-email').value.trim();
    var clave = el('acceso-clave').value;
    if (!correo || !clave) { mostrarMensaje(TXT.mal); return; }

    var boton = el('acceso-enviar');
    boton.disabled = true;
    mostrarMensaje(TXT.verificando);
    cliente.auth.signInWithPassword({ email: correo, password: clave }).then(function (r) {
      if (r.error || !r.data || !r.data.user) {
        fallos += 1;
        if (fallos >= MAX_FALLOS) {
          bloqueadoHasta = Date.now() + BLOQUEO_MS;
          fallos = 0;
          mostrarMensaje(TXT.espera);
        } else {
          mostrarMensaje(TXT.mal);
        }
        boton.disabled = false;
        el('acceso-clave').value = '';
        return null;
      }
      return cargarPerfil(r.data.user).then(function (p) {
        if (!p) { mostrarMensaje(TXT.sinPerfil); boton.disabled = false; return; }
        perfil = p;
        mostrarMensaje('');
        entrar(alListo);
      });
    }).catch(function () { mostrarMensaje(TXT.red); boton.disabled = false; });
  }

  /* Punto de entrada: pide el inicio de sesión (o retoma la sesión de esta pestaña) y llama a alListo. */
  function iniciar(alListo) {
    if (!configurado()) {
      if (esLocal()) { alListo({ local: true }); return; } /* desarrollo sin servidor: el juego funciona como antes */
      el('acceso').hidden = false;
      el('acceso-formulario').hidden = true;
      mostrarMensaje(TXT.sinConfig);
      return;
    }
    if (esLocal() && new URLSearchParams(window.location.search).get('local') === '1') { alListo({ local: true }); return; }
    try {
      cliente = crearCliente();
    } catch (e) {
      el('acceso').hidden = false;
      el('acceso-formulario').hidden = true;
      mostrarMensaje(TXT.red);
      return;
    }
    el('acceso').hidden = false;
    el('acceso-formulario').addEventListener('submit', function (e) { alEnviar(e, alListo); });

    /* ¿Sesión viva en esta pestaña (por ejemplo tras recargar)? */
    cliente.auth.getSession().then(function (r) {
      var sesion = r && r.data && r.data.session;
      if (!sesion) { el('acceso-email').focus(); return; }
      return cargarPerfil(sesion.user).then(function (p) {
        if (!p) { el('acceso-email').focus(); return; }
        perfil = p;
        entrar(alListo);
      });
    }).catch(function () { el('acceso-email').focus(); });
  }

  function salir() {
    var fin = function () { window.location.reload(); };
    if (cliente) { cliente.auth.signOut().then(fin, fin); } else { fin(); }
  }

  window.Acceso = {
    iniciar: iniciar, salir: salir,
    perfil: function () { return perfil; },
    cliente: function () { return cliente; } /* null en modo local (sin Supabase) */
  };
})();
