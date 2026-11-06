/* Efectos de sonido del coche, sintetizados con Web Audio (no hay archivos de audio).
   Son deliberadamente suaves y sutiles. Para subir o bajar todo a la vez, cambia VOLUMEN_GENERAL.
   Todo debe llamarse dentro de un gesto del usuario para que el navegador permita el sonido. */
(function () {
  'use strict';

  var VOLUMEN_GENERAL = 0.45; /* de 0 a 1 */

  var ctx = null;
  var maestro = null;
  var ruido = null;

  function asegurar() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { return false; }
      try { ctx = new AC(); } catch (e) { return false; }
      /* Cadena final: volumen general y un filtro que redondea cualquier arista. */
      var suavizador = ctx.createBiquadFilter();
      suavizador.type = 'lowpass';
      suavizador.frequency.value = 1100;
      suavizador.Q.value = 0.5;
      maestro = ctx.createGain();
      maestro.gain.value = VOLUMEN_GENERAL;
      maestro.connect(suavizador);
      suavizador.connect(ctx.destination);
      ruido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      var datos = ruido.getChannelData(0);
      for (var i = 0; i < datos.length; i++) { datos[i] = Math.random() * 2 - 1; }
    }
    if (ctx.state === 'suspended') {
      var promesa = ctx.resume();
      if (promesa && typeof promesa.catch === 'function') { promesa.catch(function () {}); }
    }
    return true;
  }

  /* Envolvente suave: sube despacio a `vol` y se apaga exponencialmente. */
  function envolvente(nodoGanancia, t, vol, subida, duracion) {
    var g = nodoGanancia.gain;
    g.setValueAtTime(0.0001, t);
    g.linearRampToValueAtTime(vol, t + subida);
    g.exponentialRampToValueAtTime(0.0001, t + duracion);
  }

  /* Soplo de ruido filtrado hacia los graves: una tos o un "puf" amortiguado. */
  function soplo(t, vol, corte, duracion) {
    var fuente = ctx.createBufferSource();
    var filtro = ctx.createBiquadFilter();
    var g = ctx.createGain();
    fuente.buffer = ruido;
    filtro.type = 'lowpass';
    filtro.frequency.setValueAtTime(corte, t);
    filtro.Q.setValueAtTime(0.4, t);
    fuente.connect(filtro);
    filtro.connect(g);
    g.connect(maestro);
    envolvente(g, t, vol, Math.min(0.05, duracion / 3), duracion);
    fuente.start(t);
    fuente.stop(t + duracion + 0.05);
  }

  /* Un giro suave del arrancador: zumbido grave redondeado con un poco de fricción. */
  function giro(t, duracion, frecuencia, vol) {
    var osc = ctx.createOscillator();
    var filtro = ctx.createBiquadFilter();
    var g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(frecuencia, t);
    filtro.type = 'lowpass';
    filtro.frequency.setValueAtTime(380, t);
    osc.connect(filtro);
    filtro.connect(g);
    g.connect(maestro);
    envolvente(g, t, vol, duracion * 0.4, duracion);
    osc.start(t);
    osc.stop(t + duracion + 0.05);
    soplo(t, vol * 0.4, 240, duracion);
  }

  function arrancadorDando(t, n, periodo, f0, f1, vol) {
    for (var i = 0; i < n; i++) {
      giro(t + i * periodo, periodo * 0.95, f0 + (f1 - f0) * (i / n), vol);
    }
  }

  /* Motor encendido: ronroneo grave. `curva` es una lista de [segundos, hercios]. */
  function motor(t, curva, volumen, ataque, fadeDesde, fadeHasta) {
    var osc = ctx.createOscillator();
    var cuerpo = ctx.createOscillator();
    var filtro = ctx.createBiquadFilter();
    var g = ctx.createGain();
    var vibrato = ctx.createOscillator();
    var profundidad = ctx.createGain();

    osc.type = 'sawtooth';
    cuerpo.type = 'triangle';
    filtro.type = 'lowpass';
    filtro.frequency.setValueAtTime(360, t);
    vibrato.type = 'sine';
    vibrato.frequency.setValueAtTime(9, t);
    profundidad.gain.setValueAtTime(volumen * 0.25, t);

    osc.frequency.setValueAtTime(curva[0][1], t + curva[0][0]);
    cuerpo.frequency.setValueAtTime(curva[0][1], t + curva[0][0]);
    for (var i = 1; i < curva.length; i++) {
      osc.frequency.exponentialRampToValueAtTime(curva[i][1], t + curva[i][0]);
      cuerpo.frequency.exponentialRampToValueAtTime(curva[i][1], t + curva[i][0]);
    }

    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(volumen, t + ataque);
    g.gain.setValueAtTime(volumen, t + fadeDesde);
    g.gain.linearRampToValueAtTime(0.0001, t + fadeHasta);

    osc.connect(filtro);
    cuerpo.connect(filtro);
    filtro.connect(g);
    vibrato.connect(profundidad);
    profundidad.connect(g.gain);
    g.connect(maestro);

    [osc, cuerpo, vibrato].forEach(function (o) { o.start(t); o.stop(t + fadeHasta + 0.1); });
  }

  /* Intento fallido: el arrancador gira unas vueltas, casi prende y se apaga con una tosecita. */
  function intentar() {
    if (!asegurar()) { return; }
    var t = ctx.currentTime + 0.02;
    arrancadorDando(t, 4, 0.18, 86, 96, 0.1);
    soplo(t + 0.85, 0.07, 260, 0.25);
    soplo(t + 1.15, 0.04, 220, 0.2);
  }

  /* Arranque: gira, prende con un "puf" suave y se queda ronroneando. */
  function arrancar() {
    if (!asegurar()) { return; }
    var t = ctx.currentTime + 0.02;
    arrancadorDando(t, 4, 0.18, 86, 98, 0.1);
    var ti = t + 0.74;
    soplo(ti, 0.09, 300, 0.4);
    motor(ti, [[0, 80], [0.4, 108], [0.95, 86], [1.4, 88], [2.3, 100], [3.4, 92]], 0.09, 0.35, 2.4, 4.2);
  }

  /* Despedida: el coche acelera suavemente y se pierde a lo lejos. */
  function alejarse() {
    if (!asegurar()) { return; }
    var t = ctx.currentTime + 0.02;
    motor(t, [[0, 88], [0.6, 124], [1.7, 176]], 0.06, 0.25, 0.7, 1.9);
  }

  /* Una nota limpia y redonda (campanita suave). */
  function nota(t, frecuencia, duracion, vol) {
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frecuencia, t);
    osc.connect(g);
    g.connect(maestro);
    envolvente(g, t, vol, 0.03, duracion);
    osc.start(t);
    osc.stop(t + duracion + 0.05);
  }

  /* Respuesta correcta: tres notas ascendentes, muy suaves. */
  function acierto() {
    if (!asegurar()) { return; }
    var t = ctx.currentTime + 0.02;
    nota(t, 523.25, 0.55, 0.1);
    nota(t + 0.12, 659.25, 0.6, 0.1);
    nota(t + 0.24, 783.99, 0.85, 0.08);
  }

  /* Llegada: el coche frena despacio y se detiene. */
  function llegar() {
    if (!asegurar()) { return; }
    var t = ctx.currentTime + 0.02;
    motor(t, [[0, 168], [0.9, 130], [2, 92]], 0.06, 0.15, 1.7, 2.7);
    soplo(t + 2.3, 0.05, 260, 0.35);
  }

  /* Pasar la tapa o una hoja del álbum: dos soplos suaves, el segundo más flojo. */
  function hoja() {
    if (!asegurar()) { return; }
    var t = ctx.currentTime + 0.02;
    soplo(t, 0.07, 900, 0.4);
    soplo(t + 0.5, 0.04, 760, 0.35);
  }

  /* Voltear una carta: un toque seco y suave. */
  function voltear() {
    if (!asegurar()) { return; }
    soplo(ctx.currentTime + 0.02, 0.06, 700, 0.1);
  }

  /* Pareja encontrada: dos notas redondas. */
  function pareja() {
    if (!asegurar()) { return; }
    var t = ctx.currentTime + 0.02;
    nota(t, 659.25, 0.5, 0.09);
    nota(t + 0.11, 987.77, 0.75, 0.08);
  }

  /* Un "boing" corto y simpático: el botón que huye. */
  function boing() {
    if (!asegurar()) { return; }
    var t = ctx.currentTime + 0.02;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(330, t);
    osc.frequency.exponentialRampToValueAtTime(760, t + 0.14);
    osc.frequency.exponentialRampToValueAtTime(520, t + 0.28);
    osc.connect(g);
    g.connect(maestro);
    envolvente(g, t, 0.09, 0.02, 0.3);
    osc.start(t);
    osc.stop(t + 0.35);
  }

  /* Una pieza de puzzle que encaja: un "clac" corto y una notita redonda. */
  function encaje() {
    if (!asegurar()) { return; }
    var t = ctx.currentTime + 0.02;
    soplo(t, 0.07, 900, 0.07);
    nota(t + 0.02, 740, 0.22, 0.07);
  }

  /* Un sello que cae sobre el papel: un golpe grave y seco. */
  function sello() {
    if (!asegurar()) { return; }
    var t = ctx.currentTime + 0.02;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(190, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.14);
    osc.connect(g);
    g.connect(maestro);
    envolvente(g, t, 0.16, 0.01, 0.22);
    osc.start(t);
    osc.stop(t + 0.27);
    soplo(t, 0.06, 700, 0.08);
  }

  /* La barrera sube: un zumbido suave que sube de tono y un golpecito al llegar arriba. */
  function barrera() {
    if (!asegurar()) { return; }
    var t = ctx.currentTime + 0.02;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(270, t + 1.3);
    osc.connect(g);
    g.connect(maestro);
    envolvente(g, t, 0.07, 0.25, 1.5);
    osc.start(t);
    osc.stop(t + 1.55);
    soplo(t + 1.4, 0.05, 500, 0.12);
  }

  /* Motor del nivel 5 al conducir por el mapa, casi inaudible: un zumbido grave que sube un poco con la velocidad
     (v de 0 a 1). conduccion(-1) lo apaga del todo. Se actualiza varias veces por segundo, sin crear nodos nuevos. */
  var motorNodos = null;
  function conduccion(v) {
    if (v < 0) {
      if (motorNodos) {
        var n = motorNodos;
        motorNodos = null;
        var t0 = ctx.currentTime;
        n.g.gain.setTargetAtTime(0.0001, t0, 0.08);
        n.o1.stop(t0 + 0.5);
        n.o2.stop(t0 + 0.5);
      }
      return;
    }
    if (!asegurar()) { return; }
    if (!motorNodos) {
      var o1 = ctx.createOscillator();
      var o2 = ctx.createOscillator();
      var filtro = ctx.createBiquadFilter();
      var g = ctx.createGain();
      o1.type = 'sawtooth';
      o2.type = 'triangle';
      o1.frequency.value = 52;
      o2.frequency.value = 26;
      filtro.type = 'lowpass';
      filtro.frequency.value = 170;
      filtro.Q.value = 0.7;
      g.gain.value = 0.0001;
      o1.connect(filtro);
      o2.connect(filtro);
      filtro.connect(g);
      g.connect(maestro);
      o1.start(ctx.currentTime);
      o2.start(ctx.currentTime);
      motorNodos = { o1: o1, o2: o2, g: g };
    }
    var t = ctx.currentTime;
    var vel = Math.max(0, Math.min(1, v));
    motorNodos.o1.frequency.setTargetAtTime(52 + vel * 34, t, 0.12);
    motorNodos.o2.frequency.setTargetAtTime(26 + vel * 17, t, 0.12);
    motorNodos.g.gain.setTargetAtTime(vel > 0.02 ? 0.01 + vel * 0.022 : 0.0001, t, 0.15);
  }

  /* El coche llega a la parada que toca: un tintineo de dos notas, muy suave. */
  function parada() {
    if (!asegurar()) { return; }
    var t = ctx.currentTime + 0.02;
    nota(t, 880, 0.18, 0.04);
    nota(t + 0.1, 1175, 0.22, 0.035);
  }

  /* Se acerca a una parada que aún no toca: un toque grave y corto. */
  function bloqueado() {
    if (!asegurar()) { return; }
    var t = ctx.currentTime + 0.02;
    nota(t, 196, 0.16, 0.05);
    soplo(t, 0.02, 500, 0.06);
  }

  /* Un roce muy suave, al raspar un billete del rasca y gana. */
  function rasca() {
    if (!asegurar()) { return; }
    var t = ctx.currentTime + 0.01;
    soplo(t, 0.045, 1400, 0.09);
  }

  /* El tic de una tecla de máquina de escribir, muy suave. */
  function tecla() {
    if (!asegurar()) { return; }
    var t = ctx.currentTime + 0.005;
    soplo(t, 0.05, 2400, 0.03);
    nota(t, 1500, 0.04, 0.012);
  }

  /* ---- Escala pentatónica y sonidos definidos por los niveles ---- */

  var ESCALA_SEMITONOS = [0, 2, 4, 7, 9]; /* pentatónica mayor: do re mi sol la */
  var DO_CENTRAL = 261.6256;

  /* Frecuencia del grado `grado` (entero): 0 = do central; cada 5 grados sube una octava (negativos bajan). */
  function escalaFreq(grado) {
    grado = Math.round(Number(grado));
    if (!isFinite(grado)) { grado = 0; }
    grado = Math.max(-10, Math.min(12, grado));
    var octava = Math.floor(grado / 5);
    var indice = grado - octava * 5;
    return DO_CENTRAL * Math.pow(2, (ESCALA_SEMITONOS[indice] + 12 * octava) / 12);
  }

  /* Una nota de la escala, redonda y suave. vol opcional (0 a 0.2; por defecto 0.07). */
  function escala(grado, vol) {
    try {
      if (!asegurar()) { return; }
      var v = (typeof vol === 'number' && vol > 0) ? Math.min(vol, 0.2) : 0.07;
      nota(ctx.currentTime + 0.02, escalaFreq(grado), 0.6, v);
    } catch (e) { /* el audio nunca debe romper el juego */ }
  }

  /* Tono con tipo de onda a elegir, para los sonidos que definen los niveles. */
  function tonoApi(t, frecuencia, duracion, vol, tipo) {
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = (tipo === 'triangle' || tipo === 'square' || tipo === 'sawtooth') ? tipo : 'sine';
    osc.frequency.setValueAtTime(frecuencia, t);
    osc.connect(g);
    g.connect(maestro);
    envolvente(g, t, vol, Math.min(0.03, duracion / 3), duracion);
    osc.start(t);
    osc.stop(t + duracion + 0.05);
  }

  var NATIVOS = ['intentar', 'arrancar', 'alejarse', 'acierto', 'llegar', 'hoja', 'voltear', 'pareja', 'boing', 'encaje', 'sello', 'barrera', 'conduccion', 'parada', 'bloqueado', 'rasca', 'tecla', 'escala', 'definir'];

  /* Registra Sonidos[nombre](...args). fn se ejecuta con el contexto ya activo y recibe primero la API
     { ctx, t, destino, tono(t, freq, dur, vol, tipo), soplo(t, vol, corte, dur), escalaFreq(grado), args }
     y después los argumentos con que se llamó. No se pueden pisar los sonidos nativos. */
  function definir(nombre, fn) {
    if (typeof nombre !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]{0,40}$/.test(nombre) || typeof fn !== 'function') { return false; }
    if (NATIVOS.indexOf(nombre) >= 0) { return false; }
    window.Sonidos[nombre] = function () {
      try {
        if (!asegurar()) { return; }
        var args = Array.prototype.slice.call(arguments);
        var api = { ctx: ctx, t: ctx.currentTime + 0.02, destino: maestro, tono: tonoApi, soplo: soplo, escalaFreq: escalaFreq, args: args };
        fn.apply(null, [api].concat(args));
      } catch (e) { /* idem */ }
    };
    return true;
  }

  window.Sonidos = { intentar: intentar, arrancar: arrancar, alejarse: alejarse, acierto: acierto, llegar: llegar, hoja: hoja, voltear: voltear, pareja: pareja, boing: boing, encaje: encaje, sello: sello, barrera: barrera, conduccion: conduccion, parada: parada, bloqueado: bloqueado, rasca: rasca, tecla: tecla, escala: escala, definir: definir };
})();
