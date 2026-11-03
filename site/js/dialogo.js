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

    function alClic(evento) {
      if (esControl(evento.target)) { return; }
      avanzar();
    }

    function alTecla(evento) {
      if (esControl(evento.target)) { return; }
      if (evento.key === 'Enter' || evento.key === ' ' || evento.key === 'ArrowRight') {
        evento.preventDefault();
        avanzar();
      }
    }

    function parar() {
      activo = false;
      clearInterval(reloj);
      document.removeEventListener('click', alClic);
      document.removeEventListener('keydown', alTecla);
    }

    document.addEventListener('click', alClic);
    document.addEventListener('keydown', alTecla);
    mostrarLinea(0);

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

    return { decir: decir, callar: callar };
  }

  window.Dialogo = { reproducir: reproducir, hablante: hablante };
})();
