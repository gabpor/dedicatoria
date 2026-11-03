/* Gestor de niveles: navegación lineal (cada nivel se abre al superar el anterior) y flores recogidas. */
(function () {
  'use strict';

  var NIVELES = [
    { titulo: 'Pornirea' },
    { titulo: 'Valencia' },
    { titulo: 'Barcelona' },
    { titulo: 'Lyon' },
    { titulo: 'Paris' },
    { titulo: 'Frontiera' },
    { titulo: 'Belgia' },
    { titulo: 'Bruxelles' }
  ];

  /* Una flor distinta por parada; la última (bicolor) lleva los colores de los dos. */
  var FLORES = [
    { petalo: '#facc15', sombra: '#e0a800', centro: '#0c1f5c' },
    { petalo: '#ef7a63', sombra: '#c4503f', centro: '#facc15' },
    { petalo: '#1d4ed8', sombra: '#0c1f5c', centro: '#facc15' },
    { petalo: '#f4a3b5', sombra: '#d9708c', centro: '#0c1f5c' },
    { petalo: '#a99be8', sombra: '#6f5fc4', centro: '#facc15' },
    { petalo: '#f5a04a', sombra: '#d4772a', centro: '#0c1f5c' },
    { petalo: '#5b8ff0', sombra: '#2f63e6', centro: '#fff4d6' },
    { petalo: '#5fc4b0', sombra: '#2f8f7d', centro: '#0c1f5c' },
    { bicolor: true }
  ];

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var modulos = {};
  var actual = -1;
  var floresCogidas = 0;

  function el(id) { return document.getElementById(id); }
  function seccion(id) { return el('nivel-' + id); }

  function registrar(id, modulo) { modulos[id] = modulo; }

  function actualizarHud(id) {
    el('hud-numero').textContent = 'Nivelul ' + id;
    el('hud-titulo').textContent = NIVELES[id].titulo;
    /* Un nivel puede pedir que el rótulo no se vea hasta que "se entre" (ver mostrarHud). */
    var oculto = !!(modulos[id] && modulos[id].ocultarHud);
    el('hud-nivel').classList.toggle('oculto', oculto);
    el('hud-flores').classList.toggle('oculto', oculto);
  }

  function mostrarHud() {
    el('hud-nivel').classList.remove('oculto');
    el('hud-flores').classList.remove('oculto');
  }

  /* Pantalla provisional para los niveles que aún no existen. */
  function crearProvisional(id) {
    var s = document.createElement('section');
    s.className = 'nivel';
    s.id = 'nivel-' + id;
    s.style.background = '#0c1f5c';
    var panel = document.createElement('div');
    panel.className = 'panel';
    var h = document.createElement('h1');
    h.textContent = NIVELES[id].titulo;
    var p = document.createElement('p');
    p.textContent = 'Această oprire este încă în pregătire.';
    panel.appendChild(h);
    panel.appendChild(p);
    s.appendChild(panel);
    el('juego').appendChild(s);
    return s;
  }

  function irA(id) {
    if (id < 0 || id >= NIVELES.length) { return; }
    var saliente = actual >= 0 ? seccion(actual) : null;

    function mostrar() {
      if (saliente) { saliente.classList.remove('activo', 'saliendo'); }
      var s = seccion(id) || crearProvisional(id);
      s.classList.add('activo', 'entrando');
      actual = id;
      actualizarHud(id);
      if (modulos[id] && typeof modulos[id].iniciar === 'function') { modulos[id].iniciar(s); }
      setTimeout(function () { s.classList.remove('entrando'); }, 1000);
    }

    if (saliente) {
      saliente.classList.add('saliendo');
      setTimeout(mostrar, 600);
    } else {
      mostrar();
    }
  }

  function siguiente() { irA(actual + 1); }

  /* Dibuja en el HUD todas las flores, apagadas (en gris); se van encendiendo al superar cada nivel. */
  function construirFlores() {
    var caja = el('hud-flores');
    caja.textContent = '';
    FLORES.forEach(function (datos) {
      var svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('viewBox', '-50 -50 100 100');
      svg.setAttribute('class', 'hud-flor apagada');
      svg.setAttribute('aria-hidden', 'true');
      var uso = document.createElementNS(SVG_NS, 'use');
      uso.setAttribute('href', datos.bicolor ? '#cabeza-bi' : '#cabeza');
      if (!datos.bicolor) {
        uso.setAttribute('style', '--petalo:' + datos.petalo + ';--sombra:' + datos.sombra + ';--centro:' + datos.centro);
      }
      svg.appendChild(uso);
      caja.appendChild(svg);
    });
    caja.setAttribute('aria-label', 'Flori adunate: 0 din ' + FLORES.length);
  }

  /* Enciende la siguiente flor (la del nivel superado). `rapido` la deja encendida sin animación. */
  function florecer(rapido) {
    var caja = el('hud-flores');
    var casillas = caja.children;
    if (floresCogidas >= casillas.length) { return; }
    casillas[floresCogidas].setAttribute('class', 'hud-flor encendida' + (rapido ? ' rapida' : ''));
    floresCogidas += 1;
    caja.setAttribute('aria-label', 'Flori adunate: ' + floresCogidas + ' din ' + casillas.length);
  }

  window.Juego = { registrar: registrar, irA: irA, siguiente: siguiente, florecer: florecer, mostrarHud: mostrarHud };

  document.addEventListener('DOMContentLoaded', function () {
    /* Para probar en local: ?nivel=3 salta a ese nivel con sus flores. */
    var inicio = parseInt(new URLSearchParams(window.location.search).get('nivel'), 10);
    if (isNaN(inicio) || inicio < 0 || inicio >= NIVELES.length) { inicio = 0; }
    construirFlores();
    for (var i = 0; i < inicio; i++) { florecer(true); }
    irA(inicio);
  });
})();
