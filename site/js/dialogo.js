/* Diálogo por viñetas: el piloto dice una línea detrás de otra.
   Un clic en cualquier parte de la pantalla (o Enter, Espacio, →) avanza: si la línea aún se está escribiendo,
   la completa; si ya está completa, pasa a la siguiente. La última línea no pide clic: al terminar de
   escribirse llama a `alTerminar` y se queda puesta. */
(function () {
  'use strict';

  var MS_POR_LETRA = 22;

  function sinMovimiento() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function esControl(nodo) {
    return !!(nodo && nodo.closest && nodo.closest('button, input, textarea, a, label, .radio-panel'));
  }

  /* Sincronización en pareja: cada diálogo tiene una clave (nivel + orden dentro del nivel) igual en las dos
     pantallas. Quien avanza una línea avisa ("dlg:avanza") y la otra persona salta a esa misma línea. */
  var ultimoNivel = -2;
  var contador = 0;
  var sesiones = {};
  var pendientes = {};
  var escuchando = false;

  function claveSesion() {
    var n = window.Juego && typeof window.Juego.nivel === 'function' ? window.Juego.nivel() : -1;
    if (n !== ultimoNivel) { ultimoNivel = n; contador = 0; }
    contador += 1;
    return n + ':' + contador;
  }

  function escucharPareja() {
    if (escuchando || !window.Sala) { return; }
    escuchando = true;
    window.Sala.alRecibir('dlg:avanza', function (d) {
      if (!d || typeof d.k !== 'string') { return; }
      if (sesiones[d.k]) { sesiones[d.k](d); } else { pendientes[d.k] = d; } /* aún no ha llegado a ese diálogo */
    });
  }

  /* elemento: el <p> de la viñeta. lineas: lista de textos.
     opciones: { lector: elemento que recibe cada línea completa para lectores de pantalla,
                 clase: clase CSS extra de la viñeta, alTerminar: función } */
  function reproducir(elemento, lineas, opciones) {
    opciones = opciones || {};
    var indice = -1;
    var escribiendo = false;
    var activo = true;
    var reloj = null;
    var texto = '';
    var cuantas = 0;
    var escrito = null;
    var resto = null;
    var clave = claveSesion();
    escucharPareja();

    function ultima() { return indice >= lineas.length - 1; }

    function dibujar() {
      escrito.textContent = texto.slice(0, cuantas);
      resto.textContent = texto.slice(cuantas);
    }

    function terminarLinea() {
      clearInterval(reloj);
      escribiendo = false;
      cuantas = texto.length;
      dibujar();
      if (ultima()) {
        parar();
        if (typeof opciones.alTerminar === 'function') { opciones.alTerminar(); }
      } else {
        var flecha = document.createElement('span');
        flecha.className = 'avanza';
        flecha.setAttribute('aria-hidden', 'true');
        elemento.appendChild(flecha);
      }
    }

    function mostrarLinea(i) {
      clearInterval(reloj);
      indice = i;
      texto = lineas[i];
      cuantas = 0;
      if (opciones.lector) { opciones.lector.textContent = texto; }

      /* Se reinicia la viñeta (para repetir la animación de aparición) y se prepara el texto:
         lo escrito y lo que falta, este último invisible, para que la viñeta no cambie de tamaño. */
      elemento.className = opciones.clase || '';
      elemento.textContent = '';
      escrito = document.createElement('span');
      resto = document.createElement('span');
      resto.className = 'resto';
      elemento.appendChild(escrito);
      elemento.appendChild(resto);
      void elemento.getBoundingClientRect();
      elemento.classList.add('visible');

      escribiendo = true;
      dibujar();
      if (sinMovimiento()) { terminarLinea(); return; }
      reloj = setInterval(function () {
        cuantas += 1;
        dibujar();
        if (cuantas >= texto.length) { terminarLinea(); }
      }, MS_POR_LETRA);
    }

    function avanzar() {
      if (!activo) { return; }
      if (escribiendo) { terminarLinea(); return; }
      if (!ultima()) { mostrarLinea(indice + 1); }
    }

    /* Avance hecho por esta persona: se aplica y se avisa a la otra. */
    function avanzarYAvisar() {
      if (!activo) { return; }
      avanzar();
      if (window.Sala && window.Sala.hayCompanero()) {
        window.Sala.emitir('dlg:avanza', { k: clave, i: indice, listo: !escribiendo });
      }
    }

    /* Avance hecho por la otra persona: nos ponemos en su misma línea. */
    function aplicarRemoto(d) {
      if (!activo || typeof d.i !== 'number') { return; }
      if (d.i > indice) { mostrarLinea(Math.min(d.i, lineas.length - 1)); }
      if (d.listo && escribiendo && d.i === indice) { terminarLinea(); }
    }

    function alClic(evento) {
      if (esControl(evento.target)) { return; }
      avanzarYAvisar();
    }

    function alTecla(evento) {
      if (esControl(evento.target)) { return; }
      if (evento.key === 'Enter' || evento.key === ' ' || evento.key === 'ArrowRight') {
        evento.preventDefault();
        avanzarYAvisar();
      }
    }

    function parar() {
      activo = false;
      clearInterval(reloj);
      delete sesiones[clave];
      document.removeEventListener('click', alClic);
      document.removeEventListener('keydown', alTecla);
    }

    document.addEventListener('click', alClic);
    document.addEventListener('keydown', alTecla);
    sesiones[clave] = aplicarRemoto;
    mostrarLinea(0);
    if (pendientes[clave]) { var previo = pendientes[clave]; delete pendientes[clave]; aplicarRemoto(previo); }

    return { cancelar: parar };
  }

  /* Mensajes sueltos del piloto (reacciones): una viñeta que se muestra y, si se indica, se esconde sola.
     elemento: el <p> de la viñeta. lector: elemento sr-only que repite el texto para lectores de pantalla.
     decir(texto, tipo, ms): tipo es una clase CSS extra (eroare, succes); ms, el tiempo visible (0 = se queda). */
  function hablante(elemento, lector) {
    var relojVineta = null;
    var relojSalida = null;

    function callar() {
      clearTimeout(relojVineta);
      clearTimeout(relojSalida);
      elemento.classList.add('saliendo');
      relojSalida = setTimeout(function () { elemento.classList.remove('visible', 'saliendo'); }, 240);
    }

    function decir(texto, tipo, ms) {
      clearTimeout(relojVineta);
      clearTimeout(relojSalida);
      if (lector) { lector.textContent = texto; }
      elemento.textContent = texto;
      elemento.className = tipo || '';
      void elemento.getBoundingClientRect();
      elemento.classList.add('visible');
      if (ms) { relojVineta = setTimeout(callar, ms); }
    }

    /* Cancela los temporizadores pendientes sin tocar la viñeta (para reiniciar o detener el nivel). */
    function cancelar() {
      clearTimeout(relojVineta);
      clearTimeout(relojSalida);
    }

    return { decir: decir, callar: callar, cancelar: cancelar };
  }

  window.Dialogo = { reproducir: reproducir, hablante: hablante };
})();
