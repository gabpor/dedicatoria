/* Nivel 0 · Pornirea: el piloto habla en viñetas (clic en cualquier parte para avanzar); al terminar aparece la
   entrada de la contraseña-recuerdo, que arranca el motor, empieza la música y hace florecer la primera amapola.
   Los mensajes cortos los "dice" el piloto; las pistas (más largas) salen como notas. */
(function () {
  'use strict';

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

  function reiniciarClase(nodo, clase) {
    nodo.classList.remove(clase);
    void nodo.getBoundingClientRect();
    nodo.classList.add(clase);
  }

  function iniciar(seccion) {
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
    var panelVersiculo = seccion.querySelector('#n0-versiculo');
    var botonContinua = seccion.querySelector('#n0-continua');

    var indiciosMostrados = 0;
    var fallos = 0;
    var resuelto = false;
    var dialogoActivo = true;
    var relojVineta = null;
    var relojSalida = null;

    /* El piloto reacciona con un mensaje corto: viñeta sobre su cabeza (y el mismo texto para lectores de pantalla). */
    function hablar(texto, tipo, ms) {
      mensaje.textContent = texto;
      clearTimeout(relojVineta);
      clearTimeout(relojSalida);
      vineta.textContent = texto;
      vineta.className = tipo || '';
      void vineta.getBoundingClientRect();
      vineta.classList.add('visible');
      if (ms) { relojVineta = setTimeout(callar, ms); }
    }

    function callar() {
      vineta.classList.add('saliendo');
      relojSalida = setTimeout(function () { vineta.classList.remove('visible', 'saliendo'); }, 240);
    }

    function humo(ms) {
      escena.classList.add('humo-activo');
      setTimeout(function () { escena.classList.remove('humo-activo'); }, ms);
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
      setTimeout(function () { notas.hidden = true; }, 700);
      setTimeout(function () { escena.classList.add('rodando'); }, 1500);
      setTimeout(function () { acceso.classList.add('fuera'); }, 2600);
      setTimeout(function () {
        acceso.hidden = true;
        panelVersiculo.hidden = false;
        void panelVersiculo.getBoundingClientRect();
        panelVersiculo.classList.add('florece');
        window.Juego.florecer();
        botonContinua.focus();
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
      panelVersiculo.classList.add('fuera');
      escena.classList.add('sale');
      setTimeout(function () { window.Juego.siguiente(); }, 1700);
    });

    /* Arranca la conversación poco después de entrar. */
    setTimeout(function () {
      if (!window.Dialogo) { mostrarAcceso(); return; }
      window.Dialogo.reproducir(vineta, DIALOGO, { lector: mensaje, alTerminar: mostrarAcceso });
      setTimeout(function () { if (dialogoActivo) { pistaClic.hidden = false; } }, 2200);
    }, 900);
  }

  window.Juego.registrar(0, { iniciar: iniciar, ocultarHud: true });
})();
