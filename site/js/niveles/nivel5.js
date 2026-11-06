/* Nivel 5 · Frontera: un campo rural entre Francia y Bélgica, visto desde arriba y de mundo libre. El coche se conduce
   con las flechas (o WASD) por donde se quiera: el camino de tierra es más rápido que la hierba, y el agua, los árboles,
   los setos y los edificios cierran el paso. La cámara sigue al coche; una flecha y un minimapa señalan la parada que
   toca. Hay trece paradas: once momentos ya vividos y dos por llegar (en blanco y negro y entre la niebla). Solo se
   puede abrir la siguiente: al acercarse sale "Apasă Spațiu"; las demás enseñan un candado. Al abrir una parada sale su
   ficha (foto, fecha y frase). Con las nueve vistas, hay que ir a la garita de la frontera: allí salen los kilómetros y
   los días, se levanta la barrera, el coche cruza y el cartel de la garita se ilumina con el versículo (Romani 12:12);
   cuando el coche ya ha salido se concede la flor del nivel (Logro) y, ya en el ramo, aparece "Mai departe". Poco antes de la frontera sale un
   caminito cerrado ("Momentan indisponibil") con un cartel hacia Francia y un rombo amarillo: no es una parada, no
   cuenta y no se puede abrir, solo se ve y se oye que ahora no está disponible.

   El mundo vive en el HTML (lo genera scripts/genera_mundo_nivel5.py, que no se publica; no se escribe a mano): el
   camino en #n5-camino[data-puntos], cada parada en #n5-edif-N[data-px, data-py], la garita en #n5-puerta, el desvío
   en #n5-desvio[data-px, data-py, data-puntos], y las
   colisiones en #n5-mundo[data-rejilla] (una rejilla de celdas bloqueadas, en hexadecimal). Aquí no hay coordenadas
   del mundo, solo cómo se conduce.

   Contenido privado (nada personal vive en este archivo; se lee con Contenido.obtener y lo de reserva es neutro):
   - nivel5.fechas: día, mes (0 = enero) y año de cada momento; de ellas salen la fecha que se ve y los días que pasaron
     o faltan, que se actualizan solos.
   - nivel5.paradas: una ficha por parada (fecha o fechaDe, título, frase, acum/cola/cuenta para los días, foto).
   - nivel5.cifras: kilómetros del viaje, fecha desde la que se cuentan los días y la frase del dato.
   - Fotos: se piden con Contenido.url('img/frontera/<archivo>') (WebP sin datos EXIF; 4:3 de 640 x 480, o 3:4 de
     900 x 1200 si el índice está en FOTOS_VERTICALES). Si una foto falla o no existe, la ficha enseña el edificio.
   - El tacto de la conducción: VELOCIDAD, SUAVIDAD, GIRO, FACTOR_HIERBA y RADIO_COCHE, justo debajo.

   En pareja (con Sala): el coche es uno solo. Quien conduce emite su posición (n5:coche, máx. 10/s, con un mensaje
   final al parar) y la otra pantalla lo sigue; para quitarle el volante basta pulsar una tecla de conducción, pero la
   entrada local se ignora ~1,5 s tras recibir una posición ajena (si los dos conducen a la vez gana el id menor).
   Las paradas (n5:parada), su cierre (n5:cierra), el diálogo inicial (n5:intro), los avisos (n5:aviso), la garita
   (n5:cifras, n5:cruza) y el final (n5:continua) se comparten. Quien entra tarde pide (n5:pide) y recibe n5:estado.
   Sin acompañante todo funciona como siempre.

   Todo el texto en rumano es un borrador que tiene que revisar alguien que hable el idioma. */
(function () {
  'use strict';

  /* Relojes pendientes del nivel: detener() los cancela todos para dejarlo limpio. */
  var relojes = [];
  var detenido = false; /* tras detener(), nada nuevo se programa hasta el siguiente iniciar() */

  function esperar(fn, ms) {
    if (detenido) { return 0; }
    var reloj = { tipo: 'espera', id: 0 };
    reloj.id = setTimeout(function () {
      var i = relojes.indexOf(reloj);
      if (i >= 0) { relojes.splice(i, 1); }
      fn();
    }, ms);
    relojes.push(reloj);
    return reloj.id;
  }

  function limpiarRelojes() {
    relojes.forEach(function (r) {
      if (r.tipo === 'cuadro') { cancelAnimationFrame(r.id); } else { clearTimeout(r.id); }
    });
    relojes = [];
  }

  /* Listeners en window/document: se guardan para quitarlos todos en detener(). */
  var escuchas = [];

  function escuchar(destino, tipo, fn, opciones) {
    if (detenido) { return; }
    destino.addEventListener(tipo, fn, opciones);
    escuchas.push({ destino: destino, tipo: tipo, fn: fn, opciones: opciones });
  }

  function dejarDeEscuchar(destino, tipo, fn) {
    escuchas = escuchas.filter(function (e) {
      if (e.destino === destino && e.tipo === tipo && e.fn === fn) {
        destino.removeEventListener(tipo, fn, e.opciones);
        return false;
      }
      return true;
    });
  }

  function quitarEscuchas() {
    escuchas.forEach(function (e) { e.destino.removeEventListener(e.tipo, e.fn, e.opciones); });
    escuchas = [];
  }

  /* Diálogo y viñeta en curso (se cancelan al detener). */
  var dialogo = null;
  var habla = null;
  var generacion = 0; /* cuenta los inicios del nivel: lo que quede de uno anterior no hace nada */
  var quitarSala = function () {}; /* deja de escuchar a la otra persona (lo redefine cada iniciar) */

  /* El logro del nivel: la flor 5, con el versículo que se lee en el cartel de la garita. Sin Logro, Juego.florecer(). */
  var ID_LOGRO = 'n5-frontera';
  var VERSICULO = {
    texto: 'Bucurați-vă în nădejde. Fiți răbdători în necaz. Stăruiți în rugăciune.',
    ref: 'Romani 12:12'
  };
  if (window.Logro && typeof window.Logro.definir === 'function') {
    window.Logro.definir(ID_LOGRO, { nivel: 5, flor: 5, titulo: 'Răbdarea drumului', versiculo: VERSICULO });
  }

  var KM_POR_DIA_A_PIE = 40; /* para la broma de cuánto se tardaría andando */
  var TOTAL = 13; /* paradas del mapa (las que dibuja el HTML) */

  var MESES = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];

  var RUTA_FOTOS = 'img/frontera/'; /* dentro del almacén de contenido privado */
  /* Una por parada, en el orden del camino (el contenido privado puede cambiarlas con "foto"). Las dos últimas son
     paradas por llegar y no llevan foto. */
  var FOTOS = ['parada-01.webp', 'parada-02.webp', 'parada-03.webp', 'parada-04.webp', 'parada-05.webp', 'parada-06.webp', 'parada-07.webp', 'parada-08.webp', 'parada-09.webp', 'parada-10.webp', 'parada-11.webp', null, null];
  /* Las fotos en vertical (3:4) se enseñan enteras, sin recortar: aquí, el índice de la parada. El resto son 4:3 (640 x 480). */
  var FOTOS_VERTICALES = [2, 4, 6, 7, 9];

  /* Cómo se conduce. Todo en unidades del mundo (la pantalla enseña unas 1280 x 720 de ellas). */
  var VELOCIDAD = 340; /* a tope sobre el camino de tierra, en unidades por segundo */
  var FACTOR_HIERBA = 0.62; /* por la hierba se va más despacio */
  var TIERRA = 44; /* distancia al centro del camino hasta la que se considera tierra */
  var SUAVIDAD = 9; /* lo rápido que arranca y frena (más alto = más brusco) */
  var GIRO = 11; /* radianes por segundo con los que el coche se vuelve hacia donde va */
  var RADIO_COCHE = 22; /* el coche choca como un círculo de este radio */
  var ALCANCE = 84; /* a qué distancia de una parada se puede abrir */
  var LEJOS = 380; /* a partir de esta distancia a la meta sale la flecha que la señala */
  var VELOCIDAD_AUTO = 460; /* el botón de ayuda lleva solo el coche a la siguiente parada */
  var VELOCIDAD_ENTRADA = 240; /* el coche entra por la izquierda */
  var VELOCIDAD_SALIDA = 280; /* y sale por la derecha al cruzar la frontera */
  var SEGUIMIENTO = 5; /* lo rápido que la cámara alcanza al coche */
  var ESPERA_AYUDA = 25; /* segundos sin tocar nada hasta que sale el botón de ayuda */
  var X_INICIO = 120;

  var INTERVALO_COCHE = 100; /* ms entre posiciones enviadas del coche (10 por segundo como mucho) */
  var VENTANA_AJENA = 1500; /* ms sin poder tomar el volante tras recibir una posición ajena */
  var SEGUIR_AJENO = 14; /* lo rápido que el coche alcanza la posición que manda la otra persona */

  var PASOS_CUENTA = 40; /* el cuentakilómetros sube en 40 pasos de 50 ms */
  var MS_PASO = 50;

  var SVG_NS = 'http://www.w3.org/2000/svg';

  var DIALOGO = [
    'Frontiera e aproape. Dar mai întâi, drumul nostru!',
    'Condu cu săgețile și oprește-te la fiecare semn, pe rând.'
  ];
  var BLOQUEADA = 'Încă nu. Mai întâi urmează semnul cu săgeata galbenă.';
  var TODAS = 'Ai adunat toate semnele! Acum, la poarta graniței.';
  var CERRADO = 'Drum închis momentan. Poate altă dată…';
  var PASAR = 'Control terminat. Poți trece!';

  var DIRECCIONES = { ArrowUp: 'arr', ArrowDown: 'aba', ArrowLeft: 'izq', ArrowRight: 'der', w: 'arr', s: 'aba', a: 'izq', d: 'der' };

  /* "o zi", "17 zile", "98 de zile", "101 zile": así se dice en rumano. */
  function zile(n) {
    if (n === 1) { return 'o zi'; }
    var resto = n % 100;
    return n + ((resto > 0 && resto <= 19) ? ' zile' : ' de zile');
  }

  /* Un número con puntos de millar y ceros a la izquierda hasta `ancho` cifras: 7 -> "0.007". */
  function formatear(n, ancho) {
    var s = String(Math.max(0, Math.round(n)));
    while (s.length < ancho) { s = '0' + s; }
    return s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  function sinMovimiento() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /* El día de hoy a medianoche (UTC) y los días que faltan hasta una fecha (negativos si ya pasó). */
  function hoy() {
    var d = new Date();
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  }
  function diasHasta(f) {
    return Math.round((Date.UTC(f.a, f.m, f.d) - hoy()) / 86400000);
  }
  function escribir(f) { return f.d + ' ' + MESES[f.m]; }

  function esNumero(v) { return typeof v === 'number' && isFinite(v); }
  function r1(v) { return Math.round(v * 10) / 10; }
  function fechaValida(f) { return !!f && typeof f === 'object' && esNumero(f.a) && esNumero(f.m) && esNumero(f.d); }

  /* El contenido privado, o el valor de reserva si no hay (modo local) o no es del tipo esperado. */
  function contenido(clave, porDefecto) {
    if (window.Contenido && typeof window.Contenido.obtener === 'function') { return window.Contenido.obtener(clave, porDefecto); }
    return porDefecto;
  }

  /* " Acum 98 de zile." si el momento ya pasó; si no, nada. */
  function acum(f) {
    if (!fechaValida(f)) { return ''; }
    var d = -diasHasta(f);
    return d > 0 ? ' Acum ' + zile(d) + '.' : '';
  }

  function rellenar(plantilla, marca, valor) {
    return String(plantilla == null ? '' : plantilla).split(marca).join(valor);
  }

  /* Las paradas, en el orden del camino, y las cifras de la garita, a partir del contenido privado.
     parada: { fecha (texto tal cual) | fechaDe (clave de nivel5.fechas), titulo, texto, acum (clave: añade los días
     que pasaron), cola (texto tras los días), cuenta: { fecha, antes ("{n}" = los días), hoy, despues }, foto }.
     fecha: lo que se ve en la etiqueta y en la ficha (null = sin fecha, y se enseña el título). */
  function construirDatos() {
    var fechas = contenido('nivel5.fechas', {});
    if (!fechas || typeof fechas !== 'object') { fechas = {}; }
    var lista = contenido('nivel5.paradas', []);
    if (!Array.isArray(lista)) { lista = []; }
    var puntos = [];
    for (var k = 0; k < TOTAL; k++) {
      var p = lista[k] && typeof lista[k] === 'object' ? lista[k] : {};
      var fecha = null;
      if (typeof p.fecha === 'string' && p.fecha) { fecha = p.fecha; }
      else if (fechaValida(fechas[p.fechaDe])) { fecha = escribir(fechas[p.fechaDe]); }
      var texto = typeof p.texto === 'string' ? p.texto : '…';
      var c = p.cuenta;
      if (c && typeof c === 'object' && fechaValida(fechas[c.fecha])) {
        var n = diasHasta(fechas[c.fecha]);
        texto = n > 0 ? rellenar(c.antes, '{n}', zile(n)) : (n === 0 ? String(c.hoy || '') : String(c.despues || ''));
      } else {
        if (p.acum) { texto += acum(fechas[p.acum]); }
        if (typeof p.cola === 'string') { texto += p.cola; }
      }
      var foto = p.foto === null ? null : (typeof p.foto === 'string' ? p.foto : (FOTOS[k] || null));
      puntos.push({ fecha: fecha, titulo: typeof p.titulo === 'string' && p.titulo ? p.titulo : '…', texto: texto, foto: foto });
    }
    var cif = contenido('nivel5.cifras', null);
    if (!cif || typeof cif !== 'object') { cif = {}; }
    return {
      puntos: puntos,
      cifras: {
        km: esNumero(cif.km) ? cif.km : 0,
        desde: fechaValida(fechas[cif.desde]) ? fechas[cif.desde] : null,
        dato: typeof cif.dato === 'string' && cif.dato ? cif.dato : null
      }
    };
  }

  /* La foto de una parada: enlace temporal del almacén privado (o la ruta local si no hay Supabase). */
  function urlFoto(nombre) {
    var ruta = RUTA_FOTOS + nombre;
    try {
      if (window.Contenido && typeof window.Contenido.url === 'function') { return window.Contenido.url(ruta); }
    } catch (e) { return Promise.reject(e); }
    return Promise.resolve('assets/' + ruta);
  }

  /* ---------- Geometría del camino ---------- */
  /* "x,y x,y ..." -> [{x, y}, ...] */
  function leerPuntos(texto) {
    return String(texto || '').split(/\s+/).filter(Boolean).map(function (p) {
      var c = p.split(',');
      return { x: parseFloat(c[0]), y: parseFloat(c[1]) };
    });
  }

  /* El punto del camino más cercano a (x, y): { x, y, d2 (distancia al cuadrado), i (índice del punto de la lista) }. */
  function masCercano(pts, x, y) {
    var mejor = { d2: Infinity, x: x, y: y, i: 0 };
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i];
      var b = pts[i + 1];
      var vx = b.x - a.x;
      var vy = b.y - a.y;
      var l2 = vx * vx + vy * vy;
      var t = l2 ? ((x - a.x) * vx + (y - a.y) * vy) / l2 : 0;
      t = t < 0 ? 0 : (t > 1 ? 1 : t);
      var px = a.x + vx * t;
      var py = a.y + vy * t;
      var d2 = (x - px) * (x - px) + (y - py) * (y - py);
      if (d2 < mejor.d2) { mejor = { d2: d2, x: px, y: py, i: t > 0.5 ? i + 1 : i }; }
    }
    return mejor;
  }

  /* El ángulo más corto para ir de a a b, entre -PI y PI. */
  function diferenciaAngulo(a, b) {
    var d = b - a;
    while (d > Math.PI) { d -= 2 * Math.PI; }
    while (d < -Math.PI) { d += 2 * Math.PI; }
    return d;
  }

  function limitar(v, min, max) { return v < min ? min : (v > max ? max : v); }

  /* Rejilla de colisiones: cada carácter hexadecimal son 4 celdas (1 = bloqueada). */
  function leerRejilla(nodo) {
    var celda = parseFloat(nodo.getAttribute('data-celda'));
    var cols = parseInt(nodo.getAttribute('data-cols'), 10);
    var filas = parseInt(nodo.getAttribute('data-filas'), 10);
    var hex = String(nodo.getAttribute('data-rejilla') || '');
    var datos = new Uint8Array(cols * filas);
    for (var k = 0; k < hex.length; k++) {
      var v = parseInt(hex.charAt(k), 16);
      for (var b = 0; b < 4; b++) {
        var idx = k * 4 + b;
        if (idx < datos.length) { datos[idx] = (v >> (3 - b)) & 1; }
      }
    }
    return { celda: celda, cols: cols, filas: filas, datos: datos, ancho: parseFloat(nodo.getAttribute('width')) || cols * celda, alto: parseFloat(nodo.getAttribute('height')) || filas * celda };
  }

  /* ¿Choca un círculo de radio r centrado en (x, y) con alguna celda bloqueada (o sale del mundo)? */
  function choca(rej, x, y, r) {
    var c = rej.celda;
    var i0 = Math.floor((x - r) / c);
    var i1 = Math.floor((x + r) / c);
    var j0 = Math.floor((y - r) / c);
    var j1 = Math.floor((y + r) / c);
    for (var j = j0; j <= j1; j++) {
      for (var i = i0; i <= i1; i++) {
        if (i < 0 || j < 0 || i >= rej.cols || j >= rej.filas) { return true; }
        if (rej.datos[j * rej.cols + i]) {
          var cx = i * c;
          var cy = j * c;
          var dx = x < cx ? cx - x : (x > cx + c ? x - cx - c : 0);
          var dy = y < cy ? cy - y : (y > cy + c ? y - cy - c : 0);
          if (dx * dx + dy * dy < r * r) { return true; }
        }
      }
    }
    return false;
  }

  /* Las celdas por donde cabe el coche (1 = libre), para la ayuda. */
  function celdasLibres(rej) {
    var libre = new Uint8Array(rej.cols * rej.filas);
    for (var j = 0; j < rej.filas; j++) {
      for (var i = 0; i < rej.cols; i++) {
        libre[j * rej.cols + i] = choca(rej, (i + 0.5) * rej.celda, (j + 0.5) * rej.celda, RADIO_COCHE) ? 0 : 1;
      }
    }
    return libre;
  }

  /* Ruta sin obstáculos de un punto a otro (para el botón de ayuda): búsqueda en anchura por la rejilla, desde la
     meta, con las celdas por donde cabe el coche; luego se estira el camino quedándose con las esquinas necesarias. */
  function buscarRuta(rej, libre, desde, hasta) {
    var cols = rej.cols;
    var filas = rej.filas;
    var c = rej.celda;
    function celdaDe(p) { return { i: limitar(Math.floor(p.x / c), 0, cols - 1), j: limitar(Math.floor(p.y / c), 0, filas - 1) }; }
    function libreCerca(p) {
      var o = celdaDe(p);
      for (var radio = 0; radio < 10; radio++) {
        for (var dj = -radio; dj <= radio; dj++) {
          for (var di = -radio; di <= radio; di++) {
            if (Math.max(Math.abs(di), Math.abs(dj)) !== radio) { continue; }
            var i = o.i + di;
            var j = o.j + dj;
            if (i >= 0 && j >= 0 && i < cols && j < filas && libre[j * cols + i]) { return { i: i, j: j }; }
          }
        }
      }
      return null;
    }
    var a = libreCerca(desde);
    var b = libreCerca(hasta);
    if (!a || !b) { return [desde, hasta]; }
    var dist = new Int32Array(cols * filas);
    dist.fill(-1);
    var cola = [b.j * cols + b.i];
    dist[cola[0]] = 0;
    var vec = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (var h = 0; h < cola.length; h++) {
      var cur = cola[h];
      var ci = cur % cols;
      var cj = (cur - ci) / cols;
      for (var k = 0; k < 8; k++) {
        var ni = ci + vec[k][0];
        var nj = cj + vec[k][1];
        if (ni < 0 || nj < 0 || ni >= cols || nj >= filas) { continue; }
        var n = nj * cols + ni;
        if (dist[n] >= 0 || !libre[n]) { continue; }
        if (k >= 4 && (!libre[cj * cols + ni] || !libre[nj * cols + ci])) { continue; } /* sin cortar esquinas */
        dist[n] = dist[cur] + 1;
        cola.push(n);
      }
    }
    if (dist[a.j * cols + a.i] < 0) { return [desde, hasta]; }
    var pts = [desde];
    var ci2 = a.i;
    var cj2 = a.j;
    while (dist[cj2 * cols + ci2] > 0) {
      var mejor = null;
      var md = dist[cj2 * cols + ci2];
      for (var m = 0; m < 8; m++) {
        var xi = ci2 + vec[m][0];
        var xj = cj2 + vec[m][1];
        if (xi < 0 || xj < 0 || xi >= cols || xj >= filas) { continue; }
        var dv = dist[xj * cols + xi];
        if (dv >= 0 && dv < md) { md = dv; mejor = { i: xi, j: xj }; }
      }
      if (!mejor) { break; }
      ci2 = mejor.i;
      cj2 = mejor.j;
      pts.push({ x: (ci2 + 0.5) * c, y: (cj2 + 0.5) * c });
    }
    pts.push(hasta);
    function despejado(p, q) {
      var l = Math.sqrt((q.x - p.x) * (q.x - p.x) + (q.y - p.y) * (q.y - p.y));
      var n2 = Math.max(1, Math.ceil(l / 6));
      for (var t = 0; t <= n2; t++) {
        if (choca(rej, p.x + (q.x - p.x) * t / n2, p.y + (q.y - p.y) * t / n2, RADIO_COCHE - 1)) { return false; }
      }
      return true;
    }
    var fin = [pts[0]];
    var ancla = 0;
    for (var u = 2; u < pts.length; u++) {
      if (!despejado(pts[ancla], pts[u])) { fin.push(pts[u - 1]); ancla = u - 1; }
    }
    fin.push(pts[pts.length - 1]);
    return fin;
  }

  /* Pide el siguiente fotograma y lo registra entre los relojes del nivel (para poder cancelarlo en detener). */
  function pedirFotograma(f) {
    if (detenido) { return; }
    var reloj = { tipo: 'cuadro', id: 0 };
    function alCuadro(t) {
      var i = relojes.indexOf(reloj);
      if (i >= 0) { relojes.splice(i, 1); }
      f(t);
    }
    if (typeof window.requestAnimationFrame === 'function') {
      reloj.id = window.requestAnimationFrame(alCuadro);
    } else {
      reloj.tipo = 'espera';
      reloj.id = setTimeout(function () { alCuadro(Date.now()); }, 16);
    }
    relojes.push(reloj);
  }

  function esControl(nodo) {
    return !!(nodo && nodo.closest && nodo.closest('button, input, textarea, a, label, .radio-panel'));
  }

  function iniciar(seccion) {
    detenido = false;
    generacion += 1;
    var mia = generacion;
    function q(id) { return seccion.querySelector('#' + id); }

    var camara = q('n5-camara');
    var juego = q('n5-juego');
    var coche = q('n5-coche');
    var aro = q('n5-aro');
    var brujula = q('n5-brujula');
    var brujulaGiro = q('n5-brujula-giro');
    var aviso = q('n5-aviso');
    var avisoAbre = q('n5-aviso-abre');
    var avisoNo = q('n5-aviso-no');
    var avisoCerrado = q('n5-aviso-cerrado');
    var miniCoche = q('n5-mini-coche');
    var pistaClic = q('n5-pista-clic');
    var mensaje = q('n5-mesaj');
    var vineta = q('n5-vineta-texto');
    var progreso = q('n5-progreso');
    var ayudaTeclas = q('n5-teclas');
    var botonAuto = q('n5-auto');
    var ficha = q('n5-ficha');
    var fichaFoto = q('n5-ficha-foto');
    var polaroid = q('n5-polaroid');
    var fichaFecha = q('n5-ficha-fecha');
    var fichaTitulo = q('n5-ficha-titulo');
    var fichaTexto = q('n5-ficha-texto');
    var botonCierra = q('n5-ficha-cierra');
    var panelCifras = q('n5-cifras');
    var cajaKm = q('n5-km');
    var cajaZilePanel = q('n5-caja-zile');
    var cajaZile = q('n5-zile');
    var dato = q('n5-dato');
    var lectura = q('n5-lectura');
    var botonCruza = q('n5-cruza');
    var botonContinua = q('n5-continua');

    var datos = construirDatos();
    var puntos = datos.puntos;
    var cifras = datos.cifras;
    var total = puntos.length;
    var camino = leerPuntos(q('n5-camino').getAttribute('data-puntos'));
    var rej = leerRejilla(q('n5-mundo'));
    var edif = [];
    var mini = [];
    var paradas = [];
    var i;
    for (i = 0; i < total; i++) {
      var e = q('n5-edif-' + i);
      edif.push(e);
      mini.push(q('n5-mini-' + i));
      paradas.push({ x: parseFloat(e.getAttribute('data-px')), y: parseFloat(e.getAttribute('data-py')) });
    }
    var datosDesvio = q('n5-desvio');
    var desvio = { x: parseFloat(datosDesvio.getAttribute('data-px')), y: parseFloat(datosDesvio.getAttribute('data-py')) };
    var camino2 = leerPuntos(datosDesvio.getAttribute('data-puntos'));
    var datosPuerta = q('n5-puerta');
    var puerta = { x: parseFloat(datosPuerta.getAttribute('data-px')), y: parseFloat(datosPuerta.getAttribute('data-py')) };

    habla = window.Dialogo.hablante(vineta, mensaje);

    /* Estado de la partida */
    var activo = true;
    var fase = 'entra'; /* entra, dialogo, conduce, auto, ficha, cifras, cruza, sale, fin */
    var vistos = [];
    var cuantos = 0; /* las paradas 0..cuantos-1 están vistas; la que toca es la número `cuantos` */
    var teclas = {};
    var x = -50;
    var y = 0;
    var vx = 0;
    var vy = 0;
    var ang = 0;
    var camX = 0;
    var camY = 0;
    var ultimaCamara = '';
    var candidato = -1; /* parada al alcance (total = la garita, total + 1 = el desvío cerrado), o -1 */
    var inactivo = 0; /* segundos sin tocar el volante */
    var conduciendo = 0; /* segundos con el coche en marcha (para esconder la ayuda de teclas) */
    var nivelMotor = 0;
    var ultimo = null;
    var libreAuto = null;
    var ruta = [];
    var rutaK = 0;
    var todasAnunciadas = false;
    var introHecha = false; /* el diálogo inicial ya terminó (o se saltó) */
    var fichaAbierta = -1;
    var continuando = false;
    var logroIniciado = false; /* la flor ya se está entregando (o se entregó) */
    /* Tiempo real */
    var siguiendo = false; /* el coche lo lleva la otra persona y aquí solo se sigue */
    var objetivo = null; /* última posición ajena: { x, y, ang, v } */
    var ultimaAjena = 0; /* cuándo llegó la última posición ajena */
    var bloqueoHasta = 0; /* hasta cuándo no se puede tomar el volante */
    var ultimoEnvio = 0;
    var envioPendiente = false; /* queda por enviar la posición final al parar */
    var pedido = false; /* se ha pedido el estado a la otra persona */
    var estadoAplicado = false;

    var S = window.Sala;
    function hayPareja() { return !!(S && S.hayCompanero()); }
    function emitir(tipo, carga) { if (S && S.hayCompanero()) { S.emitir(tipo, carga); } }
    function soyMenor() {
      var yo = S && S.yo();
      var otro = S && S.companero();
      return !!(yo && otro && yo.id < otro.id);
    }
    function vigente() { return activo && !detenido && mia === generacion; }

    function sonar(nombre, valor) {
      if (window.Sonidos && typeof window.Sonidos[nombre] === 'function') { window.Sonidos[nombre](valor); }
    }

    /* El camino empieza fuera del mundo: el coche entra desde ahí y se detiene en X_INICIO. */
    var inicio = camino[0];
    for (i = 0; i < camino.length; i++) { if (camino[i].x >= X_INICIO) { inicio = camino[i]; break; } }
    y = inicio.y;

    function colocarCoche() {
      coche.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + (ang * 180 / Math.PI).toFixed(1) + ')');
      miniCoche.setAttribute('cx', x.toFixed(0));
      miniCoche.setAttribute('cy', y.toFixed(0));
    }

    /* La cámara sigue al coche sin salirse del mundo. La escala es la de siempre: 720 unidades de alto en pantalla. */
    function colocarCamara(dt, salto) {
      var vw = window.innerWidth || 1280;
      var vh = window.innerHeight || 720;
      var s = vh / 720;
      var mitadAncho = vw / (2 * s);
      var mitadAlto = 360;
      var objX = mitadAncho * 2 >= rej.ancho ? rej.ancho / 2 : limitar(x, mitadAncho, rej.ancho - mitadAncho);
      var objY = mitadAlto * 2 >= rej.alto ? rej.alto / 2 : limitar(y, mitadAlto, rej.alto - mitadAlto);
      if (salto) { camX = objX; camY = objY; }
      else {
        var k = Math.min(1, SEGUIMIENTO * dt);
        camX += (objX - camX) * k;
        camY += (objY - camY) * k;
      }
      var t = 'translate3d(' + (vw / 2 - camX * s).toFixed(1) + 'px,' + (vh / 2 - camY * s).toFixed(1) + 'px,0) scale(' + s.toFixed(4) + ')';
      if (t !== ultimaCamara) { ultimaCamara = t; camara.style.transform = t; }
    }

    /* Las etiquetas de cada parada (la fecha, o el título si no hay) se rellenan ya, aunque se vean al abrirla. */
    for (i = 0; i < total; i++) {
      var texto = puntos[i].fecha || puntos[i].titulo;
      var ancho = Math.round(texto.length * 8.6 + 30);
      q('n5-etiq-texto-' + i).textContent = texto;
      q('n5-etiq-fondo-' + i).setAttribute('width', ancho);
      q('n5-etiq-fondo-' + i).setAttribute('x', -ancho / 2);
    }
    edif[0].classList.remove('bloq');
    edif[0].classList.add('sig');
    mini[0].classList.remove('bloq');
    mini[0].classList.add('sig');

    function actualizarProgreso() {
      progreso.textContent = cuantos + ' din ' + total;
    }

    /* La meta: la parada que toca o, con las nueve vistas, la garita. */
    function meta() { return cuantos < total ? paradas[cuantos] : puerta; }

    /* El aro y la flecha van a la parada que toca (o a la garita si ya se vieron todas). */
    function colocarAro() {
      var m = meta();
      aro.setAttribute('transform', 'translate(' + m.x.toFixed(1) + ' ' + m.y.toFixed(1) + ')');
      aro.classList.remove('oculto');
    }

    /* Si la meta queda lejos, una flecha junto al coche apunta hacia ella. */
    function senalar() {
      var m = meta();
      var dx = m.x - x;
      var dy = m.y - y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if ((fase !== 'conduce' && fase !== 'auto') || d < LEJOS) { brujula.classList.add('oculto'); return; }
      var a = Math.atan2(dy, dx);
      brujula.setAttribute('transform', 'translate(' + (x + Math.cos(a) * 96).toFixed(1) + ' ' + (y + Math.sin(a) * 96).toFixed(1) + ')');
      brujulaGiro.setAttribute('transform', 'rotate(' + (a * 180 / Math.PI).toFixed(1) + ')');
      brujula.classList.remove('oculto');
    }

    /* ---------- Cercanía y aviso ---------- */
    function mostrarAviso(tipo) {
      aviso.classList.remove('oculto');
      if (tipo === 'abre') { avisoAbre.classList.remove('oculto'); } else { avisoAbre.classList.add('oculto'); }
      if (tipo === 'no') { avisoNo.classList.remove('oculto'); } else { avisoNo.classList.add('oculto'); }
      if (tipo === 'cerrado') { avisoCerrado.classList.remove('oculto'); } else { avisoCerrado.classList.add('oculto'); }
    }

    function revisarCercania() {
      var mejor = -1;
      var md = ALCANCE;
      var k;
      for (k = 0; k < total; k++) {
        var dx = x - paradas[k].x;
        var dy = y - paradas[k].y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < md) { md = d; mejor = k; }
      }
      if (mejor < 0 && cuantos === total) {
        var gx = x - puerta.x;
        var gy = y - puerta.y;
        if (Math.sqrt(gx * gx + gy * gy) < ALCANCE) { mejor = total; }
      }
      if (mejor < 0) {
        var vx2 = x - desvio.x;
        var vy2 = y - desvio.y;
        if (Math.sqrt(vx2 * vx2 + vy2 * vy2) < ALCANCE) { mejor = total + 1; }
      }
      if (mejor !== candidato) {
        candidato = mejor;
        if (candidato < 0) {
          aviso.classList.add('oculto');
        } else if (candidato === total + 1) {
          mostrarAviso('cerrado');
          sonar('bloqueado');
        } else if (candidato === total) {
          mostrarAviso('abre');
          sonar('parada');
        } else if (candidato <= cuantos) {
          mostrarAviso('abre');
          if (candidato === cuantos) { sonar('parada'); }
        } else {
          mostrarAviso('no');
          sonar('bloqueado');
        }
      }
      if (candidato >= 0) {
        aviso.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + (y - 62).toFixed(1) + ')');
      }
    }

    /* ---------- Conducir ---------- */
    function ponerMotor(v) {
      var redondeado = Math.round(v * 10) / 10;
      if (redondeado !== nivelMotor) { nivelMotor = redondeado; sonar('conduccion', redondeado); }
    }

    function girarHacia(objetivo, dt) {
      ang += limitar(diferenciaAngulo(ang, objetivo), -GIRO * dt, GIRO * dt);
    }

    function conducir(dt) {
      var dx = (teclas.der ? 1 : 0) - (teclas.izq ? 1 : 0);
      var dy = (teclas.aba ? 1 : 0) - (teclas.arr ? 1 : 0);
      var tx = 0;
      var ty = 0;
      if (dx || dy) {
        var l = Math.sqrt(dx * dx + dy * dy);
        var enTierra = Math.min(masCercano(camino, x, y).d2, masCercano(camino2, x, y).d2) <= TIERRA * TIERRA;
        var vmax = VELOCIDAD * (enTierra ? 1 : FACTOR_HIERBA);
        tx = dx / l * vmax;
        ty = dy / l * vmax;
        inactivo = 0;
        botonAuto.hidden = true;
      } else {
        inactivo += dt;
        if (inactivo > ESPERA_AYUDA && botonAuto.hidden) { botonAuto.hidden = false; }
      }
      var k = Math.min(1, SUAVIDAD * dt);
      vx += (tx - vx) * k;
      vy += (ty - vy) * k;
      var nx = x + vx * dt;
      var ny = y + vy * dt;
      if (!choca(rej, nx, ny, RADIO_COCHE)) { x = nx; y = ny; }
      else if (!choca(rej, nx, y, RADIO_COCHE)) { x = nx; vy = 0; } /* roza un obstáculo: se desliza por él */
      else if (!choca(rej, x, ny, RADIO_COCHE)) { y = ny; vx = 0; }
      else { vx = 0; vy = 0; }
      var v = Math.sqrt(vx * vx + vy * vy);
      if (v > 25) { girarHacia(Math.atan2(vy, vx), dt); }
      if (v > 10) {
        conduciendo += dt;
        if (conduciendo > 6) { ayudaTeclas.classList.add('apagada'); }
      }
      ponerMotor(Math.min(1, v / VELOCIDAD));
      emitirCoche(v);
      colocarCoche();
      revisarCercania();
    }

    /* El coche lo lleva la otra persona: se acerca suave a la última posición recibida. */
    function seguir(dt) {
      if (objetivo) {
        var dx = objetivo.x - x;
        var dy = objetivo.y - y;
        if (dx * dx + dy * dy > 360000) { x = objetivo.x; y = objetivo.y; }
        else {
          var k = Math.min(1, SEGUIR_AJENO * dt);
          x += dx * k;
          y += dy * k;
        }
        ang += diferenciaAngulo(ang, objetivo.ang) * Math.min(1, SEGUIR_AJENO * dt);
      }
      var v = objetivo && Date.now() - ultimaAjena < 400 ? objetivo.v : 0;
      ponerMotor(Math.min(1, v / VELOCIDAD));
      if (v > 10) {
        conduciendo += dt;
        if (conduciendo > 6) { ayudaTeclas.classList.add('apagada'); }
      }
      inactivo += dt;
      if (inactivo > ESPERA_AYUDA && botonAuto.hidden) { botonAuto.hidden = false; }
      colocarCoche();
      revisarCercania();
    }

    /* Envía la posición del coche (como mucho 10 por segundo) y, al parar, una última con v = 0. */
    function emitirCoche(v) {
      if (!hayPareja()) { envioPendiente = false; return; }
      var ahora = Date.now();
      if (v > 8) {
        if (ahora - ultimoEnvio >= INTERVALO_COCHE) {
          ultimoEnvio = ahora;
          envioPendiente = true;
          S.emitir('n5:coche', { x: r1(x), y: r1(y), ang: Math.round(ang * 100) / 100, v: Math.round(v) });
        }
      } else if (envioPendiente) {
        envioPendiente = false;
        ultimoEnvio = ahora;
        S.emitir('n5:coche', { x: r1(x), y: r1(y), ang: Math.round(ang * 100) / 100, v: 0 });
      }
    }

    function teclasPulsadas() { return !!(teclas.arr || teclas.aba || teclas.izq || teclas.der); }

    /* Se toma el volante: el coche vuelve a ser cosa de esta pantalla. */
    function tomarVolante() {
      siguiendo = false;
      objetivo = null;
      vx = 0;
      vy = 0;
      inactivo = 0;
    }

    /* El botón de ayuda lleva el coche solo, esquivando todo, hasta la parada que toca. */
    function empezarAuto() {
      tomarVolante();
      if (!libreAuto) { libreAuto = celdasLibres(rej); }
      ruta = buscarRuta(rej, libreAuto, { x: x, y: y }, meta());
      rutaK = 1;
      fase = 'auto';
      botonAuto.hidden = true;
      inactivo = 0;
      vx = 0;
      vy = 0;
    }

    function autoconducir(dt) {
      var resto = VELOCIDAD_AUTO * dt;
      while (resto > 0 && rutaK < ruta.length) {
        var p = ruta[rutaK];
        var d = Math.sqrt((p.x - x) * (p.x - x) + (p.y - y) * (p.y - y));
        if (d <= resto) { x = p.x; y = p.y; resto -= d; rutaK += 1; }
        else { x += (p.x - x) / d * resto; y += (p.y - y) / d * resto; resto = 0; }
      }
      var mira = ruta[Math.min(rutaK, ruta.length - 1)];
      if (mira) { girarHacia(Math.atan2(mira.y - y, mira.x - x), dt); }
      ponerMotor(0.8);
      emitirCoche(VELOCIDAD_AUTO);
      colocarCoche();
      revisarCercania();
      if (rutaK >= ruta.length) { fase = 'conduce'; ponerMotor(0); emitirCoche(0); }
    }

    /* ---------- Bucle ---------- */
    function entrar(dt) {
      x += VELOCIDAD_ENTRADA * dt;
      ponerMotor(0.6);
      colocarCoche();
      if (x >= inicio.x) {
        x = inicio.x;
        colocarCoche();
        ponerMotor(0);
        fase = 'dialogo';
        empezarDialogo();
      }
    }

    function salir(dt) {
      x += VELOCIDAD_SALIDA * dt;
      girarHacia(0, dt);
      ponerMotor(0.7);
      colocarCoche();
      if (x > rej.ancho + 80) {
        fase = 'fin';
        ponerMotor(0);
        /* un momento para leer el cartel antes de la entrega */
        esperar(entregarLogro, 1600);
      }
    }

    function bucle(t) {
      if (!activo) { return; }
      var dt = ultimo === null ? 0 : Math.min(0.05, (t - ultimo) / 1000);
      ultimo = t;
      if (fase === 'entra') { entrar(dt); }
      else if (fase === 'conduce') { if (siguiendo) { seguir(dt); } else { conducir(dt); } }
      else if (fase === 'auto') { autoconducir(dt); }
      else if (fase === 'sale') { salir(dt); }
      colocarCamara(dt, false);
      senalar();
      pedirFotograma(bucle);
    }

    /* ---------- Fichas ---------- */
    /* Sin foto (o si falla), la ficha enseña el dibujo del edificio. */
    function dibujoEdificio(k) {
      polaroid.classList.remove('n5-vertical');
      fichaFoto.textContent = '';
      var svg = document.createElementNS(SVG_NS, 'svg');
      svg.setAttribute('viewBox', '-60 -118 120 122');
      svg.setAttribute('aria-hidden', 'true');
      var uso = document.createElementNS(SVG_NS, 'use');
      uso.setAttribute('href', '#n5-ed-' + k);
      svg.appendChild(uso);
      fichaFoto.appendChild(svg);
    }

    function llenarFicha(k) {
      var p = puntos[k];
      fichaTitulo.textContent = p.titulo;
      fichaFecha.textContent = p.fecha || p.titulo;
      fichaTexto.textContent = p.texto;
      fichaFoto.textContent = '';
      if (!p.foto) { dibujoEdificio(k); return; }
      if (FOTOS_VERTICALES.indexOf(k) >= 0) { polaroid.classList.add('n5-vertical'); }
      else { polaroid.classList.remove('n5-vertical'); }
      var img = document.createElement('img');
      img.setAttribute('alt', '');
      function actual() { return fichaAbierta === k && img.parentNode === fichaFoto; }
      function fallo() { if (actual()) { dibujoEdificio(k); } }
      img.addEventListener('error', fallo);
      fichaFoto.appendChild(img);
      urlFoto(p.foto).then(function (u) { if (actual() && u) { img.setAttribute('src', u); } else if (actual()) { fallo(); } }, fallo);
    }

    /* Marca una parada como vista y desbloquea la siguiente. */
    function marcarVisto(k) {
      if (vistos[k]) { return; }
      vistos[k] = true;
      cuantos += 1;
      edif[k].classList.remove('sig');
      edif[k].classList.add('visto');
      mini[k].classList.remove('sig');
      mini[k].classList.add('visto');
      actualizarProgreso();
      if (k + 1 < total && !vistos[k + 1]) {
        edif[k + 1].classList.remove('bloq');
        edif[k + 1].classList.add('sig');
        mini[k + 1].classList.remove('bloq');
        mini[k + 1].classList.add('sig');
      }
      colocarAro();
    }

    /* Las paradas anteriores a n quedan vistas (para ponerse al día con la otra persona). */
    function marcarHasta(n) {
      for (var j = 0; j < n && j < total; j++) { marcarVisto(j); }
    }

    function abrirFicha(k, remota) {
      fase = 'ficha';
      fichaAbierta = k;
      vx = 0;
      vy = 0;
      teclas = {};
      bloqueoHasta = 0;
      envioPendiente = false;
      ponerMotor(0);
      habla.callar();
      if (!remota) { emitir('n5:parada', { indice: k, x: r1(x), y: r1(y), ang: Math.round(ang * 100) / 100 }); }
      llenarFicha(k);
      ficha.hidden = false;
      if (!vistos[k]) {
        marcarVisto(k);
        sonar('sello');
      }
    }

    function cerrarFicha(remota) {
      if (!remota) { emitir('n5:cierra', {}); }
      ficha.hidden = true;
      fichaAbierta = -1;
      fase = 'conduce';
      inactivo = 0;
      bloqueoHasta = 0;
      revisarCercania();
      if (cuantos === total && !todasAnunciadas) {
        todasAnunciadas = true;
        habla.decir(TODAS, '', 3600);
      }
    }

    function abrirCandidato() {
      if (candidato < 0) { return; }
      if (candidato === total + 1) {
        emitir('n5:aviso', { tipo: 'cerrado' });
        sonar('bloqueado');
        habla.decir(CERRADO, '', 3600);
        return;
      }
      if (candidato === total) { abrirCifras(); return; }
      if (candidato > cuantos) {
        emitir('n5:aviso', { tipo: 'bloqueada' });
        sonar('bloqueado');
        habla.decir(BLOQUEADA, 'eroare', 3200);
        return;
      }
      abrirFicha(candidato);
    }

    botonCierra.addEventListener('click', function () { if (fase === 'ficha') { cerrarFicha(false); } });
    aviso.addEventListener('click', function () { if (fase === 'conduce') { abrirCandidato(); } });
    botonAuto.addEventListener('click', function () {
      if (fase === 'conduce') { empezarAuto(); }
      if (botonAuto.blur) { botonAuto.blur(); }
    });

    /* ---------- Teclado ---------- */
    function alBajar(ev) {
      if (!activo) { return; }
      var tecla = ev.key;
      var dir = DIRECCIONES[typeof tecla === 'string' && tecla.length === 1 ? tecla.toLowerCase() : tecla];
      if (dir) {
        if (fase === 'auto') { fase = 'conduce'; }
        if (fase === 'conduce') {
          if (siguiendo) {
            /* Con el coche en manos de la otra persona, la entrada propia se ignora un momento para no pelear */
            if (hayPareja() && Date.now() < bloqueoHasta) { ev.preventDefault(); return; }
            tomarVolante();
          }
          teclas[dir] = true;
          ev.preventDefault();
        }
        return;
      }
      var accion = tecla === ' ' || tecla === 'Spacebar' || tecla === 'Enter';
      if (!accion && tecla !== 'Escape') { return; }
      if (esControl(ev.target)) { return; } /* un botón con el foco se encarga con su propio clic */
      if (fase !== 'conduce' && fase !== 'auto' && fase !== 'ficha' && fase !== 'cifras') { return; }
      ev.preventDefault();
      if (ev.repeat) { return; }
      if (fase === 'ficha') { cerrarFicha(false); }
      else if (fase === 'cifras') { if (!botonCruza.hidden && !botonCruza.disabled) { botonCruza.click(); } }
      else if (accion) { abrirCandidato(); }
    }

    function alSoltar(ev) {
      var tecla = ev.key;
      var dir = DIRECCIONES[typeof tecla === 'string' && tecla.length === 1 ? tecla.toLowerCase() : tecla];
      if (dir) { teclas[dir] = false; }
    }

    function olvidarTeclas() { teclas = {}; }
    function alCambiarTamano() { ultimaCamara = ''; colocarCamara(0, true); }

    escuchar(document, 'keydown', alBajar);
    escuchar(document, 'keyup', alSoltar);
    escuchar(window, 'blur', olvidarTeclas);
    escuchar(window, 'resize', alCambiarTamano);

    function limpiar() {
      activo = false;
      quitarEscuchas();
      quitarSala();
      sonar('conduccion', -1);
    }

    /* ---------- Cuentakilómetros (en la garita) ---------- */
    /* Crea una casilla por carácter ("1.700" = 4 cifras y 1 punto) y devuelve la función que las pone a un valor. */
    function odometro(caja, final) {
      var anchoCifras = String(Math.round(final)).length;
      var inicial = formatear(0, anchoCifras);
      var casillas = [];
      caja.textContent = '';
      for (var k = 0; k < inicial.length; k++) {
        var c = document.createElement('span');
        c.className = inicial.charAt(k) === '.' ? 'n5-sep' : 'n5-dig';
        c.textContent = inicial.charAt(k);
        caja.appendChild(c);
        casillas.push(c);
      }
      return function (valor) {
        var t = formatear(valor, anchoCifras);
        for (var m = 0; m < casillas.length; m++) { casillas[m].textContent = t.charAt(m); }
      };
    }

    /* Sube de 0 a `final` con frenada al llegar; devuelve cuántos ms dura. */
    function contar(poner, final) {
      if (sinMovimiento()) { poner(final); return 0; }
      for (var paso = 1; paso <= PASOS_CUENTA; paso++) {
        (function (k) {
          esperar(function () {
            var f = k / PASOS_CUENTA;
            poner(final * (1 - Math.pow(1 - f, 3)));
          }, k * MS_PASO);
        })(paso);
      }
      return PASOS_CUENTA * MS_PASO;
    }

    function abrirCifras(remota) {
      fase = 'cifras';
      vx = 0;
      vy = 0;
      teclas = {};
      envioPendiente = false;
      ponerMotor(0);
      aviso.classList.add('oculto');
      habla.callar();
      if (!remota) { emitir('n5:cifras', { x: r1(x), y: r1(y), ang: Math.round(ang * 100) / 100 }); }
      panelCifras.hidden = false;
      panelCifras.classList.remove('fuera');

      var duracion = contar(odometro(cajaKm, cifras.km), cifras.km);
      var dias = cifras.desde ? Math.max(0, -diasHasta(cifras.desde)) : -1;
      if (dias >= 0) {
        cajaZilePanel.hidden = false;
        duracion = Math.max(duracion, contar(odometro(cajaZile, dias), dias));
      }

      esperar(function () {
        lectura.textContent = 'Kilometri: ' + formatear(cifras.km, 1) + (dias >= 0 ? '. Zile de când ne cunoaștem: ' + formatear(dias, 1) : '');
        if (cifras.dato) {
          dato.textContent = rellenar(cifras.dato, '{n}', String(Math.ceil(cifras.km / KM_POR_DIA_A_PIE)));
          dato.hidden = false;
        }
      }, duracion + 300);
      esperar(function () {
        botonCruza.hidden = false;
        botonCruza.focus();
      }, duracion + 1100);
    }

    /* ---------- Cruzar la frontera ---------- */
    function cruzar(remota) {
      if (fase !== 'cifras') { return; }
      botonCruza.disabled = true;
      fase = 'cruza';
      if (!remota) { emitir('n5:cruza', {}); }
      panelCifras.classList.add('fuera');
      esperar(function () {
        panelCifras.hidden = true;
        juego.classList.add('abierta');
        sonar('barrera');
        habla.decir(PASAR, 'succes', 2600);
      }, 700);
      esperar(function () { fase = 'sale'; }, 2400);
    }
    botonCruza.addEventListener('click', function () { cruzar(false); });

    /* La flor del nivel: se arrastra al ramo (Logro) y, ya en él, sale el botón. Sin Logro, florecer a secas. */
    function entregarLogro() {
      if (logroIniciado || !vigente()) { return; }
      logroIniciado = true;
      mensaje.textContent = VERSICULO.texto + ' ' + VERSICULO.ref; /* el cartel va en un SVG oculto a lectores de pantalla */
      function salida() {
        if (!vigente()) { return; }
        botonContinua.hidden = false;
        botonContinua.focus();
      }
      if (window.Logro && typeof window.Logro.conceder === 'function') {
        window.Logro.conceder(ID_LOGRO, { alTerminar: salida });
      } else {
        if (window.Juego && typeof window.Juego.florecer === 'function') { window.Juego.florecer(); }
        sonar('acierto');
        salida();
      }
    }

    /* Quien pulsa "Mai departe" avisa a la otra pantalla; el avance de nivel lo hace una sola (Juego.siguiente avisa
       a la otra). Si el aviso se perdiera, la otra avanza por su cuenta un poco después. */
    function continuar(remota) {
      if (continuando) { return; }
      continuando = true;
      botonContinua.disabled = true;
      if (!remota) { emitir('n5:continua', {}); }
      sonar('alejarse');
      botonContinua.classList.add('fuera');
      esperar(function () {
        limpiar();
        window.Juego.siguiente();
      }, remota ? 2600 : 1100);
    }
    botonContinua.addEventListener('click', function () { continuar(false); });

    /* ---------- Arranque ---------- */
    /* El diálogo inicial acaba (o se salta porque la otra persona ya lo terminó) y empieza la conducción. */
    function terminarIntro() {
      if (introHecha) { return; }
      introHecha = true;
      pistaClic.hidden = true;
      fase = 'conduce';
      progreso.hidden = false;
      ayudaTeclas.hidden = false;
      actualizarProgreso();
      colocarAro();
      esperar(function () { habla.callar(); }, 2800);
    }

    function saltarIntro() {
      if (introHecha) { return; }
      if (dialogo && typeof dialogo.cancelar === 'function') { dialogo.cancelar(); }
      dialogo = null;
      if (fase === 'entra') { x = inicio.x; }
      colocarCoche();
      ponerMotor(0);
      terminarIntro();
    }

    function empezarDialogo() {
      if (introHecha) { return; }
      dialogo = window.Dialogo.reproducir(vineta, DIALOGO, {
        lector: mensaje,
        alTerminar: function () {
          terminarIntro();
          emitir('n5:intro', {});
        }
      });
      esperar(function () { if (!introHecha) { pistaClic.hidden = false; } }, 2200);
    }

    /* ---------- Tiempo real en pareja ---------- */
    var desuscribir = [];
    function oir(tipo, fn) {
      if (!S || typeof S.alRecibir !== 'function') { return; }
      desuscribir.push(S.alRecibir(tipo, function (d) { if (vigente()) { fn(d); } }));
    }
    quitarSala = function () {
      desuscribir.forEach(function (f) { if (typeof f === 'function') { f(); } });
      desuscribir = [];
    };

    /* Pone el coche donde lo dejó la otra persona (al abrir una parada o la garita). */
    function colocarAjeno(d) {
      if (d && esNumero(d.x) && esNumero(d.y)) {
        x = d.x;
        y = d.y;
        if (esNumero(d.ang)) { ang = d.ang; }
        colocarCoche();
        revisarCercania();
      }
    }

    function enMarcha() { return fase === 'conduce' || fase === 'auto'; }

    function alCoche(d) {
      if (!d || !esNumero(d.x) || !esNumero(d.y) || !enMarcha()) { return; }
      var mio = !siguiendo && (fase === 'auto' || teclasPulsadas() || Math.abs(vx) + Math.abs(vy) > 20);
      if (mio && soyMenor()) { return; } /* los dos conducen a la vez: manda el id menor */
      siguiendo = true;
      teclas = {};
      vx = 0;
      vy = 0;
      envioPendiente = false;
      if (fase === 'auto') { fase = 'conduce'; }
      var v = esNumero(d.v) ? d.v : 0;
      objetivo = { x: d.x, y: d.y, ang: esNumero(d.ang) ? d.ang : ang, v: v };
      ultimaAjena = Date.now();
      bloqueoHasta = v > 0 ? ultimaAjena + VENTANA_AJENA : 0; /* al parar, el volante queda libre al instante */
      inactivo = 0;
      botonAuto.hidden = true;
    }

    function alParada(d) {
      if (!d || !esNumero(d.indice)) { return; }
      var k = Math.floor(d.indice);
      if (k < 0 || k >= total) { return; }
      saltarIntro();
      if (fase === 'ficha' && fichaAbierta === k) { return; }
      if (!enMarcha()) { return; }
      colocarAjeno(d);
      marcarHasta(k);
      abrirFicha(k, true);
    }

    function alCierra() { if (fase === 'ficha') { cerrarFicha(true); } }

    function alCifras(d) {
      saltarIntro();
      if (!enMarcha()) { return; }
      colocarAjeno(d);
      marcarHasta(total);
      abrirCifras(true);
    }

    function alCruza() { if (fase === 'cifras') { cruzar(true); } }

    function alContinua() { if (logroIniciado) { continuar(true); } }

    function alAviso(d) {
      if (!d || !enMarcha() && fase !== 'ficha') { return; }
      sonar('bloqueado');
      if (d.tipo === 'cerrado') { habla.decir(CERRADO, '', 3600); }
      else if (d.tipo === 'bloqueada') { habla.decir(BLOQUEADA, 'eroare', 3200); }
    }

    /* Foto fija del nivel para quien entra tarde. */
    function estadoActual() {
      var f = fase;
      if (f === 'entra' || f === 'dialogo') { f = 'intro'; }
      else if (f === 'auto') { f = 'conduce'; }
      return {
        fase: f, cuantos: cuantos, ficha: fichaAbierta, x: r1(x), y: r1(y), ang: Math.round(ang * 100) / 100,
        abierta: juego.classList.contains('abierta')
      };
    }

    function alPide() { emitir('n5:estado', estadoActual()); }

    function alEstado(e) {
      if (!pedido || estadoAplicado || !e || typeof e !== 'object') { return; }
      estadoAplicado = true;
      if (e.fase === 'intro') { return; }
      saltarIntro();
      marcarHasta(esNumero(e.cuantos) ? e.cuantos : 0);
      tomarVolante();
      if (esNumero(e.x) && esNumero(e.y)) {
        x = e.x;
        y = e.y;
        if (esNumero(e.ang)) { ang = e.ang; }
      }
      if (e.abierta) { juego.classList.add('abierta'); }
      if (e.fase === 'ficha' && esNumero(e.ficha) && e.ficha >= 0 && e.ficha < total) {
        colocarCoche();
        abrirFicha(Math.floor(e.ficha), true);
      } else if (e.fase === 'cifras') {
        colocarCoche();
        abrirCifras(true);
      } else if (e.fase === 'cruza' || e.fase === 'sale') {
        fase = 'sale';
        colocarCoche();
      } else if (e.fase === 'fin') {
        x = rej.ancho + 81;
        fase = 'fin';
        colocarCoche();
        entregarLogro();
      } else {
        colocarCoche();
        revisarCercania();
      }
      colocarCamara(0, true);
    }

    oir('n5:coche', alCoche);
    oir('n5:parada', alParada);
    oir('n5:cierra', alCierra);
    oir('n5:cifras', alCifras);
    oir('n5:cruza', alCruza);
    oir('n5:continua', alContinua);
    oir('n5:aviso', alAviso);
    oir('n5:intro', function () { saltarIntro(); });
    oir('n5:pide', alPide);
    oir('n5:estado', alEstado);
    if (S && typeof S.alCambiar === 'function') {
      /* Si la otra persona se va, el coche vuelve a ser solo nuestro */
      S.alCambiar(function (hay) { if (vigente() && !hay) { tomarVolante(); } });
    }

    /* Las fotos, listas antes de abrir cada parada */
    if (window.Contenido && typeof window.Contenido.precargar === 'function') {
      try {
        window.Contenido.precargar(puntos.filter(function (p) { return !!p.foto; }).map(function (p) { return RUTA_FOTOS + p.foto; }));
      } catch (e) { /* las fotos se piden de nuevo al abrir cada ficha */ }
    }

    /* Entrar tarde: se pide a la otra persona cómo va el nivel */
    if (hayPareja()) {
      pedido = true;
      emitir('n5:pide', {});
    }

    x = -50;
    colocarCoche();
    colocarCamara(0, true);
    pedirFotograma(bucle);
  }

  /* Deja el nivel limpio: sin fotogramas ni temporizadores, sin listeners, con el motor del mapa apagado y sin diálogo ni
     viñeta pendientes. Se puede llamar sin haber iniciado y varias veces. */
  function detener() {
    detenido = true;
    limpiarRelojes();
    quitarEscuchas();
    quitarSala();
    if (window.Sonidos && typeof window.Sonidos.conduccion === 'function') { window.Sonidos.conduccion(-1); }
    if (dialogo && typeof dialogo.cancelar === 'function') { dialogo.cancelar(); }
    if (habla && typeof habla.cancelar === 'function') { habla.cancelar(); }
    dialogo = null;
  }

  window.Juego.registrar(5, { iniciar: iniciar, detener: detener });
})();
