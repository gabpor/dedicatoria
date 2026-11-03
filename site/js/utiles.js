/* Utilidades compartidas: normalizar texto y calcular SHA-256 (síncrono, sin depender de crypto.subtle). */
(function () {
  'use strict';

  /* Minúsculas, sin diacríticos (acepta ș/ş, ț/ţ, ă, â, î) y solo letras y cifras. */
  function normalizar(texto) {
    return String(texto)
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  /* SHA-256 de una cadena ASCII; devuelve el resumen en hexadecimal. */
  function sha256(mensaje) {
    var primos = [];
    for (var n = 2; primos.length < 64; n++) {
      var esPrimo = true;
      for (var i = 0; i < primos.length && primos[i] * primos[i] <= n; i++) {
        if (n % primos[i] === 0) { esPrimo = false; break; }
      }
      if (esPrimo) { primos.push(n); }
    }
    var fraccion = function (x) { return ((x - Math.floor(x)) * 4294967296) >>> 0; };
    var K = primos.map(function (p) { return fraccion(Math.cbrt(p)); });
    var H = primos.slice(0, 8).map(function (p) { return fraccion(Math.sqrt(p)); });

    var bytes = [];
    for (var j = 0; j < mensaje.length; j++) { bytes.push(mensaje.charCodeAt(j) & 0xff); }
    var bits = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) { bytes.push(0); }
    [Math.floor(bits / 4294967296), bits >>> 0].forEach(function (w) {
      bytes.push((w >>> 24) & 255, (w >>> 16) & 255, (w >>> 8) & 255, w & 255);
    });

    var rotar = function (x, k) { return (x >>> k) | (x << (32 - k)); };
    for (var bloque = 0; bloque < bytes.length; bloque += 64) {
      var w = new Array(64);
      var t;
      for (t = 0; t < 16; t++) {
        var p = bloque + 4 * t;
        w[t] = ((bytes[p] << 24) | (bytes[p + 1] << 16) | (bytes[p + 2] << 8) | bytes[p + 3]) >>> 0;
      }
      for (t = 16; t < 64; t++) {
        var s0 = rotar(w[t - 15], 7) ^ rotar(w[t - 15], 18) ^ (w[t - 15] >>> 3);
        var s1 = rotar(w[t - 2], 17) ^ rotar(w[t - 2], 19) ^ (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (t = 0; t < 64; t++) {
        var S1 = rotar(e, 6) ^ rotar(e, 11) ^ rotar(e, 25);
        var ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
        var S0 = rotar(a, 2) ^ rotar(a, 13) ^ rotar(a, 22);
        var maj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + maj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    return H.map(function (x) { return ('00000000' + x.toString(16)).slice(-8); }).join('');
  }

  window.Utiles = { normalizar: normalizar, sha256: sha256 };
})();
