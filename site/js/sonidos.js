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

  window.Sonidos = { intentar: intentar, arrancar: arrancar, alejarse: alejarse, acierto: acierto, llegar: llegar };
})();
