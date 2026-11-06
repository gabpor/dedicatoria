/* Nivel 3 · Lyon: el coche llega y se detiene, y el piloto hace una sola pregunta, «Facem o poză împreună?», en la que
   el botón "Nu" huye del puntero unas pocas veces y acaba desapareciendo (prólogo). "Da" abre la cabina de un
   FOTOMATÓN ONLINE con la cámara real de las dos personas:

     1. Preparación de la cámara. La web no puede apagar la cámara de la app de videollamada: pide apagar el vídeo allí
        (el audio se queda) y reintenta getUserMedia cada ~1,5 s hasta lograrlo. Estados claros (esperando permiso,
        ocupada, denegada, sin cámara, contexto no seguro) y «Continuă fără cameră» siempre disponible.
     2. Cuatro fotos con consigna del piloto, complementos dibujados en canvas (sin ML) y cuenta atrás 3-2-1 común: la
        lanza la persona con el id menor de Sala cuando las dos han dicho «Sunt gata».
     3. Tira conjunta: cada fotograma lleva a una persona a cada lado (izquierda = id menor de Sala, igual en las dos
        pantallas). Cada una captura en local (320x240, JPEG ~0,6) y manda su fotograma al otro SOLO en el instante de la
        captura, en trozos pequeños, por Sala. Sin streaming. Si el fotograma del otro no llega en 3 s, silueta.
     4. Resultado: tira vertical de 4 fotogramas, marco azul y amarillo, leyenda «Lyon»; «Descarcă» (PNG local) y
        archivo en la guantera (solo memoria). Después, el logro de la flor 3 y «Mai departe».

   Al terminar las 4 fotos (y en detener()) se libera la cámara: se paran todas las pistas. Nada se sube ni se guarda: los
   fotogramas del otro viajan por el canal en tiempo real y se descartan al cerrar el nivel.

   Mensajes de Sala (todos validados al recibir):
     n3:boton     {x, y, rot, n}  "Nu" huye (posición normalizada a la ventana)
     n3:da        {}              se ha elegido "Da"
     n3:camara    {e}             estado de la cámara de quien envía: 'lista' | 'espera' | 'sin'
     n3:listo     {i}             quien envía está lista para la foto i
     n3:cuenta    {i}             el id menor lanza la cuenta atrás de la foto i
     n3:fotoparte {i, k, n, d}    trozo k de n (base64 del JPEG, <= 8 KB) del fotograma i de quien envía
     n3:pide      {}              quien entra pregunta por el estado
     n3:estado    {f, e, p}       respuesta: fase ('cabina' si ya se abrió, 'final' si ya hay tira), estado de la cámara y foto en curso

   Todo el texto en rumano es un borrador que tiene que revisar alguien que hable el idioma. */
(function () {
  'use strict';

  var ID_LOGRO = 'n3-fotomaton';
  var ID_TARJETA = 'n3-tira';
  var TITULO_LOGRO = 'Poză în doi';

  /* ---------- Geometría y tiempos ---------- */
  var FOTOS = 4;
  var ANCHO_FOTO = 320;
  var ALTO_FOTO = 240;
  var CALIDAD_JPEG = 0.6;
  var TROZO = 7500; /* caracteres base64 por mensaje: muy por debajo de 8 KB */
  var MAX_TROZOS = 12;
  var SEPARACION_TROZOS = 40; /* ms entre trozos, para no mandar ráfagas */
  var ESPERA_OTRO = 3000; /* máximo que se espera por el fotograma del otro */
  var PAUSA_CONGELADA = 900; /* mínimo que se ve la foto recién hecha */
  var PAUSA_ENTRE_FOTOS = 1400;
  var PASO_CUENTA = 1000;
  var REINTENTO_CAMARA = 1500; /* solo con la cámara ocupada por otra app */
  var REINTENTO_SIN_CAMARA = 5000; /* 'sin cámara': nadie pide permiso, se mira de vez en cuando */
  var TOPE_CUENTA = 8000; /* si la cuenta del id menor no llega en tanto, quien sigue la lanza sola */
  var PAUSA_LOGRO = 1800;
  var TIRA = { ancho: 706, alto: 1132, margen: 30, sep: 6, hueco: 14 };

  var RADIO = 110; /* a esta distancia del puntero, "Nu" huye */
  var PAUSA = 450; /* tiempo mínimo entre dos huidas, para poder leer al piloto */
  var MARGEN = 18;
  var ALTO_HUD = 92;

  /* ---------- Textos (rumano, borrador) ---------- */
  var DIALOGO = [
    'Lyon! A treia oprire de pe drumul nostru.',
    'În gară e o cabină foto veche, ca în filme.',
    'Am o singură întrebare, dar foarte serioasă.'
  ];
  var PREGUNTA = { etiqueta: 'Cabina din gară', texto: 'Facem o poză împreună?' };
  /* Lo que dice el piloto en cada huida de "Nu" (la última, justo antes de que desaparezca). */
  var REACCIONES_NU = [
    'Hei! Unde pleci?',
    'Butonul „Nu” are o problemă tehnică.',
    'Se pare că „Nu” e foarte timid.',
    'Bine, bine. „Nu” a plecat în vacanță.'
  ];
  var EXITO = 'Perfect! Hai în cabină.';

  var T_PREP = {
    etiqueta: 'Cabina foto',
    titlu: 'Pregătește camera',
    texto: 'Pentru cabina foto avem nevoie de camera ta. Oprește videoul în aplicația apelului (sunetul rămâne pornit), ca să o poată folosi pagina aceasta.',
    nota: 'Dacă apelul e într-o altă filă a aceluiași browser, ar trebui să meargă din prima.',
    entrar: 'Intră în cabină',
    reintenta: 'Reîncearcă acum',
    sinCamara: 'Continuă fără cameră'
  };
  var TEXTO_CAMARA = {
    pendiente: 'Pregătesc camera…',
    esperando: 'Aștept permisiunea… Alege „Permite” în fereastra browserului.',
    ocupada: 'Camera e ocupată de altă aplicație. Oprește videoul în aplicația apelului; încerc din nou singur.',
    denegada: 'Accesul la cameră e blocat. Permite-l din iconița de lângă adresă și apasă „Reîncearcă acum”.',
    sin: 'Nu găsesc nicio cameră. Dacă o conectezi acum, încerc din nou singur.',
    insegura: 'Pagina nu e într-un context sigur (HTTPS), deci browserul nu dă acces la cameră. Poți continua fără cameră.',
    lista: 'Camera ta e pornită.',
    omitida: 'Continui fără cameră: vei apărea ca o siluetă.',
    liberada: 'Camera s-a oprit.'
  };
  var TEXTO_OTRO = {
    sola: 'Momentan ești aici doar tu; cealaltă jumătate a pozelor va fi o siluetă.',
    espera: 'Cealaltă persoană își pregătește camera…',
    lista: 'Cealaltă persoană are camera pornită.',
    sin: 'Cealaltă persoană continuă fără cameră (va apărea o siluetă).'
  };
  var T_SESION = {
    complementos: 'Accesorii (opțional)',
    gafas: 'Ochelari de pilot',
    corona: 'Coroană de maci',
    bigote: 'Mustață',
    gata: 'Sunt gata',
    esperando: 'Aștept…',
    esperaOtro: 'Aștept cealaltă persoană…',
    ledListo: 'Pregătiți?',
    ledClic: 'Clic!'
  };
  var POSES = [
    'Față serioasă, ca la buletin. Fără zâmbet, promit că rămâne între noi!',
    'Față de pilot de curse: privirea spre orizont și vântul în păr!',
    'Un pupic sau o îmbrățișare virtuală, trimise spre cealaltă jumătate a pozei!',
    'Ultima poză e liberă: fă orice îți trece prin cap!'
  ];
  var REACCIONES_FOTO = [
    'Ce ședință foto serioasă!',
    'Asta da viteză!',
    'Se simte dragostea până în Lyon!'
  ];
  var T_FINAL = {
    etiqueta: 'Banda voastră foto',
    conCamara: 'Camera s-a oprit. Poți porni la loc videoul în apelul vostru.',
    sinCamara: 'Uite banda voastră foto din Lyon!',
    tarde: 'Pozele s-au făcut deja. Hai să mergem mai departe împreună!',
    descarca: 'Descarcă',
    siguiente: 'Mai departe',
    alt: 'Banda foto cu cele patru poze',
    tarjeta: 'Poză în doi · Lyon',
    archivo: 'poze-lyon.png'
  };

  /* ---------- Relojes pendientes del nivel: detener() los cancela todos para dejarlo limpio ---------- */
  var relojes = [];
  var detenido = false; /* tras detener(), nada nuevo se programa hasta el siguiente iniciar() */
  var generacion = 0; /* cada iniciar() es una generación; las promesas viejas no tocan la nueva */
  var limpiezas = []; /* funciones que detener() ejecuta (liberar cámara, revocar enlaces...) */

  function alDetener(fn) { limpiezas.push(fn); }

  /* Azar del nivel (sembrado en iniciar), diálogo y viñeta en curso (se cancelan al detener). */
  var azar = Math.random;
  var dialogo = null;
  var habla = null;

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

  /* Cancela un reloj de esperar() por su id (y lo quita de la lista). */
  function cancelarEspera(id) {
    if (!id) { return; }
    clearTimeout(id);
    relojes = relojes.filter(function (r) { return r.id !== id; });
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

  /* Suscripciones a la sala (tiempo real): cada una es la función que devuelve Sala.alRecibir. */
  var bajas = [];

  function alRecibir(tipo, fn) {
    if (detenido || !window.Sala || typeof window.Sala.alRecibir !== 'function') { return; }
    bajas.push(window.Sala.alRecibir(tipo, fn));
  }

  function quitarBajas() {
    bajas.forEach(function (baja) { if (typeof baja === 'function') { baja(); } });
    bajas = [];
  }

  function emitir(tipo, datos) {
    if (window.Sala && typeof window.Sala.emitir === 'function') { window.Sala.emitir(tipo, datos); }
  }

  function hayCompanero() {
    return !!(window.Sala && typeof window.Sala.hayCompanero === 'function' && window.Sala.hayCompanero());
  }

  /* En un choque manda la persona con el id menor, la misma en las dos pantallas. Sin acompañante, mando yo. */
  function mandoYo() {
    var yo = window.Sala && window.Sala.yo ? window.Sala.yo() : null;
    var otro = window.Sala && window.Sala.companero ? window.Sala.companero() : null;
    if (!yo || !otro) { return true; }
    return yo.id < otro.id;
  }

  /* Lado de la tira que me toca: izquierda para el id menor (y para quien está solo). */
  function miLado() { return mandoYo() ? 'izq' : 'der'; }

  function numeroEntero(v, min, max) {
    return typeof v === 'number' && isFinite(v) && Math.floor(v) === v && v >= min && v <= max;
  }

  function sonar(nombre) {
    if (window.Sonidos && typeof window.Sonidos[nombre] === 'function') { window.Sonidos[nombre](); }
  }

  /* ---------- Sonidos propios (Sonidos.definir); sin él, el fotomatón es mudo en estos dos momentos ---------- */
  if (window.Sonidos && typeof window.Sonidos.definir === 'function') {
    window.Sonidos.definir('n3Tic', function (api) {
      api.tono(api.t, 660, 0.16, 0.05, 'sine');
    });
    window.Sonidos.definir('n3Obturador', function (api) {
      api.soplo(api.t, 0.1, 1000, 0.05);
      api.tono(api.t, 520, 0.05, 0.04, 'triangle');
      api.soplo(api.t + 0.09, 0.07, 800, 0.08);
      api.tono(api.t + 0.09, 340, 0.06, 0.035, 'triangle');
    });
  }

  /* ---------- Logro: la flor 3 ---------- */
  if (window.Logro && typeof window.Logro.definir === 'function') {
    window.Logro.definir(ID_LOGRO, { nivel: 3, flor: 3, titulo: TITULO_LOGRO, versiculo: null });
  }

  /* ---------- Dibujo en canvas (sin ML ni librerías) ---------- */

  /* Silueta ilustrada: sustituye a quien no tiene cámara o cuyo fotograma no llega. Cada lado, su color. */
  function dibujarSilueta(g, lado) {
    var der = lado === 'der';
    g.fillStyle = der ? '#facc15' : '#1d4ed8';
    g.fillRect(0, 0, ANCHO_FOTO, ALTO_FOTO);
    g.fillStyle = der ? '#fde68a' : '#2f63e6';
    g.beginPath();
    g.arc(160, 112, 94, 0, Math.PI * 2);
    g.fill();
    /* figura clara sobre fondo oscuro y viceversa: así los complementos oscuros se ven siempre */
    g.fillStyle = der ? '#2f63e6' : '#fff4d6';
    g.beginPath();
    g.moveTo(52, ALTO_FOTO);
    g.bezierCurveTo(52, 192, 100, 174, 160, 174);
    g.bezierCurveTo(220, 174, 268, 192, 268, ALTO_FOTO);
    g.closePath();
    g.fill();
    g.fillRect(146, 148, 28, 34);
    g.beginPath();
    g.ellipse(160, 108, 50, 58, 0, 0, Math.PI * 2);
    g.fill();
  }

  /* Óvalo de ayuda para colocar la cara (solo en la vista previa, nunca en la foto). */
  function dibujarGuia(g) {
    g.save();
    if (g.setLineDash) { g.setLineDash([8, 7]); }
    g.strokeStyle = 'rgba(255,244,214,.85)';
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(160, 110, 58, 72, 0, 0, Math.PI * 2);
    g.stroke();
    g.restore();
  }

  function dibujarAmapola(g, cx, cy, r, color) {
    var d = r * 0.62;
    g.fillStyle = color;
    [[-d, -d], [d, -d], [d, d], [-d, d]].forEach(function (p) {
      g.beginPath();
      g.arc(cx + p[0], cy + p[1], r * 0.72, 0, Math.PI * 2);
      g.fill();
    });
    g.fillStyle = '#0c1f5c';
    g.beginPath();
    g.arc(cx, cy, r * 0.42, 0, Math.PI * 2);
    g.fill();
  }

  function dibujarGafas(g) {
    g.lineCap = 'round';
    g.strokeStyle = '#06113a';
    g.lineWidth = 9;
    g.beginPath();
    g.moveTo(30, 98);
    g.lineTo(96, 98);
    g.moveTo(224, 98);
    g.lineTo(290, 98);
    g.stroke();
    g.lineWidth = 7;
    g.beginPath();
    g.moveTo(138, 100);
    g.lineTo(182, 100);
    g.stroke();
    [120, 200].forEach(function (cx) {
      g.fillStyle = 'rgba(91,143,240,.55)';
      g.beginPath();
      g.arc(cx, 100, 26, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#e0a800';
      g.lineWidth = 7;
      g.stroke();
      g.strokeStyle = '#06113a';
      g.lineWidth = 3;
      g.beginPath();
      g.arc(cx, 100, 31, 0, Math.PI * 2);
      g.stroke();
      g.strokeStyle = 'rgba(255,244,214,.9)';
      g.lineWidth = 4;
      g.beginPath();
      g.arc(cx, 100, 15, Math.PI * 1.1, Math.PI * 1.45);
      g.stroke();
    });
  }

  function dibujarCorona(g) {
    g.lineCap = 'round';
    g.strokeStyle = '#2b6f62';
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(92, 88);
    g.quadraticCurveTo(160, 6, 228, 88);
    g.stroke();
    var colores = ['#ef7a63', '#facc15', '#f4a3b5', '#5b8ff0', '#ef7a63'];
    [0.1, 0.3, 0.5, 0.7, 0.9].forEach(function (t, k) {
      var u = 1 - t;
      var x = u * u * 92 + 2 * u * t * 160 + t * t * 228;
      var y = u * u * 88 + 2 * u * t * 6 + t * t * 88;
      if (k < 4) {
        var t2 = t + 0.1;
        var u2 = 1 - t2;
        g.fillStyle = '#5aa88a';
        g.beginPath();
        g.ellipse((x + (u2 * u2 * 92 + 2 * u2 * t2 * 160 + t2 * t2 * 228)) / 2, (y + (u2 * u2 * 88 + 2 * u2 * t2 * 6 + t2 * t2 * 88)) / 2 - 3, 9, 4, 0, 0, Math.PI * 2);
        g.fill();
      }
      dibujarAmapola(g, x, y, 11, colores[k]);
    });
  }

  function dibujarBigote(g) {
    g.fillStyle = '#06113a';
    g.beginPath();
    g.moveTo(160, 128);
    g.bezierCurveTo(150, 118, 128, 120, 112, 136);
    g.bezierCurveTo(124, 142, 144, 140, 160, 136);
    g.bezierCurveTo(176, 140, 196, 142, 208, 136);
    g.bezierCurveTo(192, 120, 170, 118, 160, 128);
    g.closePath();
    g.fill();
  }

  function dibujarComplementos(g, c) {
    if (c.corona) { dibujarCorona(g); }
    if (c.gafas) { dibujarGafas(g); }
    if (c.bigote) { dibujarBigote(g); }
  }

  /* Una mitad de fotograma: la imagen de la persona o, si falta, su silueta. */
  function dibujarMitad(g, fuente, lado, x, y) {
    g.save();
    g.beginPath();
    g.rect(x, y, ANCHO_FOTO, ALTO_FOTO);
    g.clip();
    g.translate(x, y);
    var hecho = false;
    if (fuente) {
      try { g.drawImage(fuente, 0, 0, ANCHO_FOTO, ALTO_FOTO); hecho = true; } catch (e) { hecho = false; }
    }
    if (!hecho) { dibujarSilueta(g, lado); }
    g.restore();
  }

  /* La tira completa: marco azul y amarillo, hasta 4 fotogramas (los que faltan, vacíos) y la leyenda "Lyon". */
  function componerTira(g, fotos) {
    var W = TIRA.ancho;
    var H = TIRA.alto;
    var anchoFila = 2 * ANCHO_FOTO + TIRA.sep;
    var altoFotos = FOTOS * ALTO_FOTO + (FOTOS - 1) * TIRA.hueco;
    var x0 = TIRA.margen;
    var y0 = TIRA.margen;
    g.fillStyle = '#1d4ed8';
    g.fillRect(0, 0, W, H);
    g.strokeStyle = '#facc15';
    g.lineWidth = 4;
    g.strokeRect(8, 8, W - 16, H - 16);
    g.fillStyle = '#facc15';
    for (var y = 40; y < H - 30; y += 36) {
      g.beginPath();
      g.arc(16, y, 3.5, 0, Math.PI * 2);
      g.arc(W - 16, y, 3.5, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#fff4d6';
    g.fillRect(x0 - 8, y0 - 8, anchoFila + 16, altoFotos + 16);

    for (var i = 0; i < FOTOS; i++) {
      var yy = y0 + i * (ALTO_FOTO + TIRA.hueco);
      var f = fotos[i];
      if (f) {
        dibujarMitad(g, f.izq, 'izq', x0, yy);
        dibujarMitad(g, f.der, 'der', x0 + ANCHO_FOTO + TIRA.sep, yy);
        g.strokeStyle = '#0c1f5c';
        g.lineWidth = 3;
        g.strokeRect(x0, yy, ANCHO_FOTO, ALTO_FOTO);
        g.strokeRect(x0 + ANCHO_FOTO + TIRA.sep, yy, ANCHO_FOTO, ALTO_FOTO);
      } else {
        g.fillStyle = '#e9ddb8';
        g.fillRect(x0, yy, anchoFila, ALTO_FOTO);
        g.save();
        if (g.setLineDash) { g.setLineDash([10, 8]); }
        g.strokeStyle = 'rgba(12,31,92,.45)';
        g.lineWidth = 3;
        g.strokeRect(x0 + 3, yy + 3, anchoFila - 6, ALTO_FOTO - 6);
        g.restore();
        g.fillStyle = 'rgba(12,31,92,.35)';
        g.font = '800 64px "Baloo 2","Nunito",sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(String(i + 1), x0 + anchoFila / 2, yy + ALTO_FOTO / 2);
      }
    }

    var yLey = H - 51;
    dibujarAmapola(g, W / 2 - 104, yLey, 14, '#ef7a63');
    dibujarAmapola(g, W / 2 + 104, yLey, 14, '#f4a3b5');
    g.fillStyle = '#facc15';
    g.font = '800 58px "Baloo 2","Nunito",sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('Lyon', W / 2, yLey);
  }

  function reiniciarClase(nodo, clase) {
    nodo.classList.remove(clase);
    void nodo.getBoundingClientRect();
    nodo.classList.add(clase);
  }

  /* Clasifica el error de getUserMedia: 'ocupada' (otra app la usa; se reintenta), 'denegada' o 'sin' cámara. */
  function clasificarError(error) {
    var nombre = error && error.name ? String(error.name) : '';
    if (nombre === 'NotAllowedError' || nombre === 'PermissionDeniedError' || nombre === 'SecurityError') { return 'denegada'; }
    if (nombre === 'NotFoundError' || nombre === 'DevicesNotFoundError' || nombre === 'OverconstrainedError') { return 'sin'; }
    return 'ocupada'; /* NotReadableError, TrackStartError, AbortError y lo desconocido: tratar como transitorio */
  }

  function pararFlujo(flujo) {
    if (!flujo) { return; }
    try {
      var pistas = typeof flujo.getTracks === 'function' ? flujo.getTracks() : [];
      pistas.forEach(function (p) { if (p && typeof p.stop === 'function') { p.stop(); } });
    } catch (e) { /* ya parada */ }
  }

  function iniciar(seccion) {
    detenido = false;
    generacion += 1;
    var miGeneracion = generacion;
    function viva() { return !detenido && miGeneracion === generacion; }

    azar = window.Utiles.crearAzar(window.Juego.semilla ? window.Juego.semilla(3) : undefined);
    var escena = seccion.querySelector('.escena');
    var pistaClic = seccion.querySelector('#n3-pista-clic');
    var mensaje = seccion.querySelector('#n3-mesaj');
    var vineta = seccion.querySelector('#n3-vineta-texto');
    var panel = seccion.querySelector('#n3-pregunta');
    var etiqueta = seccion.querySelector('#n3-etiqueta');
    var texto = seccion.querySelector('#n3-texto');
    var botonDa = seccion.querySelector('#n3-da');
    var hueco = seccion.querySelector('#n3-hueco');
    var botonNu = seccion.querySelector('#n3-nu');

    var cabina = seccion.querySelector('#n3-cabina');
    var anuncio = seccion.querySelector('#n3-anuncio');
    var prep = seccion.querySelector('#n3-prep');
    var prepEtiqueta = seccion.querySelector('#n3-prep-etiqueta');
    var prepTitulo = seccion.querySelector('#n3-prep-titlu');
    var prepTexto = seccion.querySelector('#n3-prep-texto');
    var prepNota = seccion.querySelector('#n3-prep-nota');
    var estadoYo = seccion.querySelector('#n3-estado-yo');
    var puntoYo = seccion.querySelector('#n3-punto-yo');
    var estadoOtro = seccion.querySelector('#n3-estado-otro');
    var puntoOtro = seccion.querySelector('#n3-punto-otro');
    var botonEntrar = seccion.querySelector('#n3-entrar');
    var botonReintenta = seccion.querySelector('#n3-reintenta');
    var botonSinCamara = seccion.querySelector('#n3-sin-camara');

    var sesion = seccion.querySelector('#n3-sesion');
    var consigna = seccion.querySelector('#n3-consigna');
    var contador = seccion.querySelector('#n3-contador');
    var compleTitulo = seccion.querySelector('#n3-comple-titlu');
    var botonesComp = {
      gafas: seccion.querySelector('#n3-c-gafas'),
      corona: seccion.querySelector('#n3-c-corona'),
      bigote: seccion.querySelector('#n3-c-bigote')
    };
    var botonGata = seccion.querySelector('#n3-gata');
    var estadoSesion = seccion.querySelector('#n3-estado-sesion');
    var led = seccion.querySelector('#n3-led');
    var video = seccion.querySelector('#n3-video');
    var sup = seccion.querySelector('#n3-sup');
    var cong = seccion.querySelector('#n3-cong');
    var numero = seccion.querySelector('#n3-numero');
    var destello = seccion.querySelector('#n3-flash');
    var tira = seccion.querySelector('#n3-tira');
    var bloqueFinal = seccion.querySelector('#n3-final');
    var finalEtiqueta = seccion.querySelector('#n3-final-etiqueta');
    var finalTexto = seccion.querySelector('#n3-final-texto');
    var botonDescarca = seccion.querySelector('#n3-descarca');
    var botonContinua = seccion.querySelector('#n3-continua');

    habla = window.Dialogo.hablante(vineta, mensaje);

    /* Fases del nivel: llegada -> pregunta -> prep (cámara) -> sesion -> final */
    var fase = 'llegada';

    /* ---------- Estado del prólogo ---------- */
    var esquives = 0;
    var ultimaEsquiva = -1e9;
    var activo = false; /* el panel de la pregunta está en pantalla */
    var terminada = false; /* "Nu" ya no huye (se rindió o se eligió Da) */
    var suelto = false; /* "Nu" está fuera de su hueco, volando por la pantalla */
    var pos = { x: 0, y: 0, w: 80, h: 46 }; /* dónde está "Nu" cuando está suelto */
    var puntero = null;
    var dialogoActivo = true;
    var saltando = false; /* la otra persona ya va por delante: no se enseña la pregunta */

    /* ---------- Estado del fotomatón ---------- */
    var camara = { estado: 'pendiente', flujo: null, intentando: false, ficha: 0, habia: false };
    var estadoEmitido = '';
    var otroCamara = ''; /* lo que sé de la cámara de la otra persona: 'espera' | 'lista' | 'sin' | '' */
    var accesorios = { gafas: false, corona: false, bigote: false };
    var foto = 0; /* índice de la foto en curso */
    var faseFoto = ''; /* 'pose' | 'espera' | 'cuenta' | 'cierre' */
    var otroListo = {}; /* i -> true: la otra persona está lista para la foto i */
    var ciclosEspera = 0;
    var mias = []; /* fotogramas capturados aquí (canvas) */
    var ladoMio = []; /* lado de la tira que ocupaba yo en cada foto */
    var suyas = []; /* fotogramas recibidos (Image), null si no se pudo decodificar; undefined mientras no llegan */
    var cerradas = [];
    var fotos = []; /* {izq, der} de cada foto cerrada */
    var recibos = {}; /* i -> {n, partes, cuantas, hecho}: reensamblado de los trozos */
    var revisarCierre = null;
    var concedido = false;
    var otroFoto = 0; /* por qué foto va la otra persona si ya estaba en la sesión cuando llegué */
    var relojReintento = 0; /* id del único temporizador de reintento de cámara que puede haber pendiente */
    var desdeListos = -1; /* desde cuándo la otra persona está lista y la cuenta no llega (solo quien sigue) */
    var urlsObjeto = [];

    /* ---------- Piezas pequeñas ---------- */
    function anunciar(t) {
      anuncio.textContent = '';
      anuncio.textContent = t;
    }

    function tamanoVentana() {
      return { w: window.innerWidth || 1280, h: window.innerHeight || 720 };
    }

    /* ======================= PRÓLOGO: el botón "Nu" que huye ======================= */

    /* "Nu" sale del panel (que tiene transform) y pasa a la sección, para poder volar por toda la ventana. */
    function soltarNu() {
      var r = botonNu.getBoundingClientRect();
      pos.w = r.width || pos.w;
      pos.h = r.height || pos.h;
      pos.x = typeof r.left === 'number' ? r.left : pos.x;
      pos.y = typeof r.top === 'number' ? r.top : pos.y;
      hueco.style.width = pos.w + 'px';
      hueco.style.height = pos.h + 'px';
      seccion.appendChild(botonNu);
      botonNu.classList.add('huye');
      botonNu.style.left = pos.x + 'px';
      botonNu.style.top = pos.y + 'px';
      void botonNu.getBoundingClientRect();
      suelto = true;
    }

    function devolverNu() {
      if (suelto || botonNu.parentNode !== hueco) {
        hueco.appendChild(botonNu);
        botonNu.classList.remove('huye');
        botonNu.style.left = '';
        botonNu.style.top = '';
        hueco.style.width = '';
        hueco.style.height = '';
        suelto = false;
      }
      botonNu.classList.remove('rendido');
      botonNu.style.setProperty('--rot', '0deg');
      botonNu.textContent = 'Nu';
      botonNu.hidden = false;
      botonNu.disabled = false;
    }

    /* De varios sitios al azar, el más lejano del puntero y no demasiado cerca de donde estaba. */
    function destino(px, py) {
      var v = tamanoVentana();
      var mejor = null;
      var mejorD = -1;
      for (var i = 0; i < 16; i++) {
        var x = MARGEN + azar() * Math.max(1, v.w - pos.w - 2 * MARGEN);
        var y = ALTO_HUD + azar() * Math.max(1, v.h - pos.h - ALTO_HUD - MARGEN);
        if (Math.hypot(x - pos.x, y - pos.y) < 140) { continue; }
        var d = Math.hypot(x + pos.w / 2 - px, y + pos.h / 2 - py);
        if (d > mejorD) { mejorD = d; mejor = { x: x, y: y }; }
      }
      if (!mejor) { mejor = { x: MARGEN, y: ALTO_HUD }; }
      mejor.rot = Math.round(azar() * 24 - 12);
      return mejor;
    }

    /* Coloca "Nu" donde toca (x, y en píxeles de esta ventana) con su giro. */
    function moverNu(x, y, rot) {
      pos.x = x;
      pos.y = y;
      botonNu.style.left = x + 'px';
      botonNu.style.top = y + 'px';
      botonNu.style.setProperty('--rot', rot + 'deg');
    }

    /* Cuenta una huida más (la número n): "Da" crece, el piloto comenta y, en la última, "Nu" acaba rindiéndose. */
    function contarEsquiva(n) {
      esquives = n;
      botonDa.style.setProperty('--crece', Math.min(1.45, 1 + 0.06 * esquives).toFixed(2));
      sonar('boing');
      habla.decir(REACCIONES_NU[Math.min(esquives, REACCIONES_NU.length) - 1], '', 2600);
      if (esquives >= REACCIONES_NU.length) {
        terminada = true;
        esperar(rendirse, 900);
      }
    }

    function esquivar() {
      if (!activo || terminada) { return; }
      var t = Date.now();
      if (t - ultimaEsquiva < PAUSA) { return; }
      ultimaEsquiva = t;
      if (!suelto) { soltarNu(); }

      var p = puntero || { x: pos.x + pos.w / 2, y: pos.y + pos.h / 2 };
      var d = destino(p.x, p.y);
      moverNu(d.x, d.y, d.rot);
      contarEsquiva(esquives + 1);
      var v = tamanoVentana();
      emitir('n3:boton', { x: d.x / v.w, y: d.y / v.h, rot: d.rot, n: esquives });
    }

    /* La otra persona ha ahuyentado a "Nu": aquí vuela al mismo sitio (la posición llega normalizada a la ventana). */
    function esquivaAjena(d) {
      if (!d || !activo || terminada) { return; }
      if (typeof d.x !== 'number' || typeof d.y !== 'number' || typeof d.rot !== 'number' || typeof d.n !== 'number') { return; }
      if (!isFinite(d.x) || !isFinite(d.y) || !isFinite(d.rot) || !isFinite(d.n)) { return; }
      var n = Math.floor(d.n);
      if (n < esquives) { return; } /* mensaje atrasado */
      if (n === esquives && mandoYo()) { return; } /* choque: gana mi posición */
      ultimaEsquiva = Date.now();
      if (!suelto) { soltarNu(); }
      var v = tamanoVentana();
      var x = Math.min(Math.max(MARGEN, d.x * v.w), Math.max(MARGEN, v.w - pos.w - MARGEN));
      var y = Math.min(Math.max(ALTO_HUD, d.y * v.h), Math.max(ALTO_HUD, v.h - pos.h - MARGEN));
      moverNu(x, y, Math.max(-30, Math.min(30, Math.round(d.rot))));
      if (n > esquives) { contarEsquiva(n); }
    }

    function ocultarNu() {
      botonNu.classList.add('rendido');
      esperar(function () { botonNu.hidden = true; }, 420);
    }

    /* "Nu" se da por vencido y desaparece; "Da" late. */
    function rendirse() {
      if (!activo) { return; }
      ocultarNu();
      botonDa.classList.add('late');
    }

    function alMover(evento) {
      puntero = { x: evento.clientX, y: evento.clientY };
      if (!activo || terminada) { return; }
      var cx = pos.x + pos.w / 2;
      var cy = pos.y + pos.h / 2;
      if (!suelto) {
        var r = botonNu.getBoundingClientRect();
        cx = r.left + r.width / 2;
        cy = r.top + r.height / 2;
      }
      if (Math.hypot(puntero.x - cx, puntero.y - cy) < RADIO) { esquivar(); }
    }

    function elegirDa(propia) {
      if (!activo) { return; }
      if (propia) { emitir('n3:da', {}); }
      activo = false;
      terminada = true;
      botonDa.disabled = true;
      botonDa.classList.remove('late');
      if (suelto && !botonNu.hidden) { ocultarNu(); }
      habla.decir(EXITO, 'succes', 2400);
      sonar('pareja');
      panel.classList.add('fuera');
      esperar(abrirCabina, 2600);
    }

    function mostrarPregunta() {
      if (!viva() || saltando || fase !== 'llegada') { return; }
      fase = 'pregunta';
      esquives = 0;
      terminada = false;
      devolverNu();
      botonDa.disabled = false;
      botonDa.classList.remove('late');
      botonDa.style.setProperty('--crece', '1');
      etiqueta.textContent = PREGUNTA.etiqueta;
      texto.textContent = PREGUNTA.texto;
      panel.hidden = false;
      panel.classList.remove('fuera');
      reiniciarClase(panel, 'nueva');
      activo = true;
    }

    /* La otra persona ya está en la cabina (o ha dicho "Da" mientras yo aún no veía la pregunta): me uno sin esperar. */
    function saltarACabina() {
      if (fase !== 'llegada' && fase !== 'pregunta') { return; }
      if (activo) { elegirDa(false); return; }
      saltando = true;
      if (dialogo && typeof dialogo.cancelar === 'function') { dialogo.cancelar(); }
      dialogoActivo = false;
      pistaClic.hidden = true;
      escena.classList.add('aparca'); /* el coche queda aparcado detrás de la cabina, listo para irse al final */
      esperar(abrirCabina, 800);
    }

    /* La otra persona ya terminó las fotos: aquí no hay sesión a la que unirse; se espera con ella a "Mai departe". */
    function saltarAFinal() {
      if (fase !== 'llegada' && fase !== 'pregunta' && fase !== 'prep') { return; }
      saltando = true;
      if (dialogo && typeof dialogo.cancelar === 'function') { dialogo.cancelar(); }
      dialogoActivo = false;
      pistaClic.hidden = true;
      activo = false;
      terminada = true;
      dejarDeEscuchar(document, 'pointermove', alMover);
      panel.hidden = true;
      habla.callar();
      cancelarReintento();
      camara.ficha += 1;
      liberarCamara();
      escena.classList.add('aparca');
      escena.classList.remove('rodando');
      fase = 'final';
      faseFoto = '';
      cabina.hidden = false;
      void cabina.getBoundingClientRect();
      cabina.classList.add('visible');
      cabina.setAttribute('data-fase', 'final');
      prep.hidden = true;
      sesion.hidden = false;
      tira.hidden = true;
      botonDescarca.hidden = true;
      bloqueFinal.hidden = false;
      finalEtiqueta.textContent = T_FINAL.etiqueta;
      finalTexto.textContent = T_FINAL.tarde;
      anunciar(T_FINAL.tarde);
      concedido = true; /* sin fotos propias no hay ceremonia: la flor se enciende sola al cambiar de nivel */
      mostrarSalida();
    }

    /* ======================= CÁMARA ======================= */

    /* Lo que sabe la otra persona de mi cámara: 'lista', 'sin' (ya no habrá) o 'espera' (aún lo intenta). */
    function estadoSimple(e) {
      if (e === 'lista') { return 'lista'; }
      if (e === 'omitida' || e === 'insegura' || e === 'liberada') { return 'sin'; }
      return 'espera';
    }

    function pintarEstadoOtro() {
      var clave = hayCompanero() ? (otroCamara || 'espera') : 'sola';
      var t = TEXTO_OTRO[clave] || TEXTO_OTRO.espera;
      if (estadoOtro.textContent !== t) { estadoOtro.textContent = t; }
      puntoOtro.className = 'n3-punto ' + (clave === 'lista' ? 'n3-ok' : (clave === 'sin' || clave === 'sola' ? 'n3-sin' : 'n3-espera'));
    }

    function ponerEstadoCamara(e) {
      camara.estado = e;
      var t = TEXTO_CAMARA[e] || '';
      if (estadoYo.textContent !== t) { estadoYo.textContent = t; }
      puntoYo.className = 'n3-punto ' + (e === 'lista' ? 'n3-ok' : (e === 'omitida' || e === 'insegura' ? 'n3-sin' : 'n3-espera'));
      botonEntrar.disabled = !(e === 'lista' || e === 'omitida');
      botonReintenta.hidden = !(e === 'ocupada' || e === 'denegada' || e === 'sin' || e === 'esperando' || e === 'pendiente');
      var simple = estadoSimple(e);
      if (simple !== estadoEmitido && e !== 'liberada') {
        estadoEmitido = simple;
        emitir('n3:camara', { e: simple });
      }
    }

    function aceptarFlujo(flujo) {
      camara.flujo = flujo;
      camara.habia = true;
      video.srcObject = flujo;
      video.muted = true;
      video.hidden = false;
      try {
        var promesa = video.play();
        if (promesa && typeof promesa.catch === 'function') { promesa.catch(function () {}); }
      } catch (e) { /* el vídeo arrancará con autoplay */ }
      var pistas = typeof flujo.getVideoTracks === 'function' ? flujo.getVideoTracks() : [];
      if (pistas[0] && typeof pistas[0].addEventListener === 'function') {
        escuchar(pistas[0], 'ended', function () { alPerderCamara(flujo); });
      }
      ponerEstadoCamara('lista');
      anunciar(TEXTO_CAMARA.lista);
      if (fase === 'prep') { botonEntrar.focus(); }
    }

    /* La app de la llamada (u otra) se ha llevado la cámara por el camino: sigo con siluetas. */
    function alPerderCamara(flujo) {
      if (!viva() || camara.flujo !== flujo) { return; }
      camara.flujo = null;
      pararFlujo(flujo);
      video.srcObject = null;
      video.hidden = true;
      if (fase === 'prep') {
        ponerEstadoCamara('ocupada');
        programarReintento(REINTENTO_CAMARA);
      } else {
        ponerEstadoCamara('omitida');
        anunciar(TEXTO_CAMARA.omitida);
        redibujarSup();
      }
    }

    /* Un solo temporizador de reintento: programar uno nuevo (o intentarlo a mano) cancela el que hubiera pendiente. */
    function cancelarReintento() {
      cancelarEspera(relojReintento);
      relojReintento = 0;
    }

    function programarReintento(ms) {
      cancelarReintento();
      relojReintento = esperar(function () {
        relojReintento = 0;
        intentarCamara();
      }, ms);
    }

    function intentarCamara() {
      if (!viva() || fase !== 'prep') { return; }
      cancelarReintento();
      if (camara.estado === 'lista' || camara.estado === 'omitida' || camara.estado === 'insegura' || camara.intentando) { return; }
      var md = window.navigator && window.navigator.mediaDevices;
      if (!md || typeof md.getUserMedia !== 'function' || window.isSecureContext === false) {
        ponerEstadoCamara('insegura');
        return;
      }
      camara.intentando = true;
      camara.ficha += 1;
      var ficha = camara.ficha;
      if (camara.estado === 'pendiente') { ponerEstadoCamara('esperando'); }
      var promesa;
      try {
        promesa = md.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }, audio: false });
      } catch (e) {
        promesa = Promise.reject(e);
      }
      promesa.then(function (flujo) {
        camara.intentando = false;
        if (!viva() || ficha !== camara.ficha || camara.estado === 'omitida') { pararFlujo(flujo); return; }
        aceptarFlujo(flujo);
      }, function (error) {
        camara.intentando = false;
        if (!viva() || ficha !== camara.ficha || camara.estado === 'omitida') { return; }
        var tipo = clasificarError(error);
        ponerEstadoCamara(tipo);
        /* Con el permiso denegado no se insiste (Chrome acaba bloqueando el sitio): solo a mano, con "Reîncearcă acum". */
        if (tipo === 'ocupada') { programarReintento(REINTENTO_CAMARA); }
        else if (tipo === 'sin') { programarReintento(REINTENTO_SIN_CAMARA); }
      });
    }

    /* Para todas las pistas: la cámara queda libre para la app de la llamada. */
    function liberarCamara() {
      var flujo = camara.flujo;
      camara.flujo = null;
      if (flujo) { pararFlujo(flujo); }
      try { video.srcObject = null; } catch (e) { /* sin vídeo */ }
      video.hidden = true;
    }

    function omitirCamara() {
      if (camara.estado === 'omitida') { return; }
      camara.ficha += 1; /* cualquier intento en curso queda invalidado y, si llega, se para */
      cancelarReintento();
      liberarCamara();
      camara.habia = false;
      ponerEstadoCamara('omitida');
      anunciar(TEXTO_CAMARA.omitida);
      botonEntrar.focus();
    }

    function camaraViva() {
      return !!camara.flujo && camara.estado === 'lista';
    }

    /* ======================= FOTOMATÓN ======================= */

    /* Vista previa: óvalo de ayuda (solo si hay cámara y aún no es la cuenta atrás), complementos y, sin cámara, silueta. */
    function redibujarSup() {
      var g = sup.getContext('2d');
      g.clearRect(0, 0, ANCHO_FOTO, ALTO_FOTO);
      if (!camaraViva()) {
        dibujarSilueta(g, miLado());
      } else if (faseFoto === 'pose' || faseFoto === 'espera') {
        dibujarGuia(g);
      }
      dibujarComplementos(g, accesorios);
    }

    function pintarTira() {
      componerTira(tira.getContext('2d'), fotos);
    }

    function decirPiloto(t) {
      consigna.textContent = t;
      anunciar(t);
    }

    function abrirCabina() {
      if (!viva() || (fase !== 'llegada' && fase !== 'pregunta')) { return; }
      fase = 'prep';
      activo = false;
      terminada = true;
      dejarDeEscuchar(document, 'pointermove', alMover);
      panel.hidden = true;
      habla.callar();
      cabina.hidden = false;
      void cabina.getBoundingClientRect();
      cabina.classList.add('visible');
      cabina.setAttribute('data-fase', 'prep');
      sesion.hidden = true;
      prep.hidden = false;
      prepTitulo.focus();
      emitir('n3:estado', { f: 'cabina', e: estadoSimple(camara.estado) });
      ponerEstadoCamara('pendiente');
      pintarEstadoOtro();
      intentarCamara();
    }

    function entrarEnCabina() {
      if (fase !== 'prep' || (camara.estado !== 'lista' && camara.estado !== 'omitida')) { return; }
      cancelarReintento();
      fase = 'sesion';
      cabina.setAttribute('data-fase', 'sesion');
      prep.hidden = true;
      sesion.hidden = false;
      video.hidden = !camaraViva();
      if (camaraViva()) {
        try {
          var reanuda = video.play();
          if (reanuda && typeof reanuda.catch === 'function') { reanuda.catch(function () {}); }
        } catch (e) { /* el vídeo ya está en marcha */ }
      }
      pintarTira();
      prepararFoto(otroFoto);
    }

    function prepararFoto(i) {
      if (!viva()) { return; }
      foto = i;
      faseFoto = 'pose';
      ciclosEspera = 0;
      desdeListos = -1;
      cong.hidden = true;
      numero.textContent = '';
      led.textContent = T_SESION.ledListo;
      contador.textContent = 'Poza ' + (i + 1) + ' din ' + FOTOS;
      botonGata.disabled = false;
      botonGata.textContent = T_SESION.gata;
      estadoSesion.textContent = '';
      Object.keys(botonesComp).forEach(function (k) { botonesComp[k].disabled = false; });
      consigna.textContent = POSES[i];
      anunciar(contador.textContent + '. ' + POSES[i]);
      redibujarSup();
      botonGata.focus();
    }

    function pulsarGata() {
      if (fase !== 'sesion' || faseFoto !== 'pose') { return; }
      faseFoto = 'espera';
      ciclosEspera = 0;
      desdeListos = -1;
      botonGata.disabled = true;
      botonGata.textContent = T_SESION.esperando;
      if (hayCompanero()) {
        emitir('n3:listo', { i: foto });
        if (!otroListo[foto]) { estadoSesion.textContent = T_SESION.esperaOtro; }
      }
      evaluarInicio();
      if (faseFoto === 'espera') { esperar(vigilarEspera, 700); }
    }

    /* Con las dos listas, la persona con el id menor lanza la cuenta atrás; sola, empieza ya. */
    function evaluarInicio() {
      if (!viva() || fase !== 'sesion' || faseFoto !== 'espera') { return; }
      if (!hayCompanero()) { lanzarCuenta(); return; }
      if (otroListo[foto]) {
        if (mandoYo()) {
          emitir('n3:cuenta', { i: foto });
          lanzarCuenta();
        } else {
          estadoSesion.textContent = '';
        }
      }
    }

    /* Mientras espero: reviso si la otra persona se ha ido o ha llegado, y le repito que estoy lista por si se perdió. */
    function vigilarEspera() {
      if (!viva() || faseFoto !== 'espera') { return; }
      evaluarInicio();
      if (faseFoto !== 'espera') { return; }
      /* Quien sigue: si la otra persona está lista y la cuenta no llega (se perdió), pasado el tope la lanza sola. */
      if (hayCompanero() && otroListo[foto] && !mandoYo()) {
        if (desdeListos < 0) { desdeListos = Date.now(); }
        else if (Date.now() - desdeListos >= TOPE_CUENTA) { lanzarCuenta(); return; }
      } else {
        desdeListos = -1;
      }
      ciclosEspera += 1;
      if (ciclosEspera % 3 === 0 && hayCompanero()) { emitir('n3:listo', { i: foto }); }
      esperar(vigilarEspera, 700);
    }

    function lanzarCuenta() {
      if (faseFoto === 'cuenta' || faseFoto === 'cierre') { return; }
      faseFoto = 'cuenta';
      botonGata.disabled = true;
      estadoSesion.textContent = '';
      Object.keys(botonesComp).forEach(function (k) { botonesComp[k].disabled = true; });
      redibujarSup();
      pasoCuenta(3);
    }

    function pasoCuenta(n) {
      if (!viva()) { return; }
      if (n > 0) {
        numero.textContent = String(n);
        reiniciarClase(numero, 'tic');
        sonar('n3Tic');
        anunciar(String(n));
        esperar(function () { pasoCuenta(n - 1); }, PASO_CUENTA);
      } else {
        disparar();
      }
    }

    /* Recorte 4:3 centrado del vídeo, volteado como un espejo (lo que se ve en la vista previa). */
    function dibujarVideo(g) {
      var vw = video.videoWidth;
      var vh = video.videoHeight;
      var razon = ANCHO_FOTO / ALTO_FOTO;
      var sw = vw;
      var sh = vw / razon;
      if (sh > vh) { sh = vh; sw = vh * razon; }
      g.save();
      g.translate(ANCHO_FOTO, 0);
      g.scale(-1, 1);
      g.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, ANCHO_FOTO, ALTO_FOTO);
      g.restore();
    }

    function capturarLocal() {
      var lienzo = document.createElement('canvas');
      lienzo.width = ANCHO_FOTO;
      lienzo.height = ALTO_FOTO;
      var g = lienzo.getContext('2d');
      var hecho = false;
      if (camaraViva() && video.videoWidth > 0) {
        try { dibujarVideo(g); hecho = true; } catch (e) { hecho = false; }
      }
      if (!hecho) { dibujarSilueta(g, miLado()); }
      dibujarComplementos(g, accesorios);
      return lienzo;
    }

    /* Manda mi fotograma en trozos pequeños (<= 8 KB de datos por mensaje). Solo ahora, en el instante de la captura. */
    function enviarFoto(i, lienzo) {
      if (!hayCompanero()) { return; }
      var url = '';
      try { url = lienzo.toDataURL('image/jpeg', CALIDAD_JPEG); } catch (e) { return; }
      var coma = url.indexOf(',');
      if (coma < 0) { return; }
      var datos = url.slice(coma + 1);
      var n = Math.ceil(datos.length / TROZO);
      if (n < 1 || n > MAX_TROZOS) { return; }
      for (var k = 0; k < n; k++) {
        (function (k) {
          var parte = datos.slice(k * TROZO, (k + 1) * TROZO);
          if (k === 0) { emitir('n3:fotoparte', { i: i, k: k, n: n, d: parte }); return; }
          esperar(function () { emitir('n3:fotoparte', { i: i, k: k, n: n, d: parte }); }, k * SEPARACION_TROZOS);
        })(k);
      }
    }

    /* Llega un trozo del fotograma del otro: valida, guarda y, con todos, reensambla (en cualquier orden). */
    function alParte(d) {
      if (!d || typeof d !== 'object') { return; }
      if (!numeroEntero(d.i, 0, FOTOS - 1) || !numeroEntero(d.n, 1, MAX_TROZOS) || !numeroEntero(d.k, 0, MAX_TROZOS - 1) || d.k >= d.n) { return; }
      if (typeof d.d !== 'string' || d.d.length === 0 || d.d.length > 8192 || !/^[A-Za-z0-9+\/=]+$/.test(d.d)) { return; }
      if (cerradas[d.i]) { return; } /* ya se cerró esa foto (llegó tarde) */
      var r = recibos[d.i];
      if (!r) { r = recibos[d.i] = { n: d.n, partes: [], cuantas: 0, hecho: false }; }
      if (r.hecho || r.n !== d.n) { return; }
      if (r.partes[d.k] === undefined) { r.cuantas += 1; }
      r.partes[d.k] = d.d;
      if (r.cuantas === r.n) {
        r.hecho = true;
        reconstruir(d.i, r.partes.join(''));
      }
    }

    function reconstruir(i, datos) {
      if (datos.indexOf('/9j/') !== 0) { suyas[i] = null; avisarCierre(); return; } /* no es un JPEG */
      var imagen = new window.Image();
      imagen.onload = function () {
        if (!viva()) { return; }
        suyas[i] = imagen;
        avisarCierre();
      };
      imagen.onerror = function () {
        if (!viva()) { return; }
        suyas[i] = null;
        avisarCierre();
      };
      imagen.src = 'data:image/jpeg;base64,' + datos;
    }

    function avisarCierre() {
      if (revisarCierre) { revisarCierre(); }
    }

    function disparar() {
      if (!viva()) { return; }
      var i = foto;
      faseFoto = 'cierre';
      numero.textContent = '';
      led.textContent = T_SESION.ledClic;
      anunciar(T_SESION.ledClic);
      var lienzo = capturarLocal();
      mias[i] = lienzo;
      ladoMio[i] = miLado();
      sonar('n3Obturador');
      reiniciarClase(destello, 'dispara');
      cong.getContext('2d').drawImage(lienzo, 0, 0);
      cong.hidden = false;
      enviarFoto(i, lienzo);
      if (i === FOTOS - 1) {
        liberarCamara();
        camara.estado = 'liberada';
      }

      var minimo = false;
      var maximo = false;
      revisarCierre = function () {
        if (!viva() || cerradas[i] || i !== foto) { return; }
        if (maximo || (minimo && (suyas[i] !== undefined || !hayCompanero()))) { cerrarFoto(i); }
      };
      esperar(function () { minimo = true; avisarCierre(); }, PAUSA_CONGELADA);
      esperar(function () { maximo = true; avisarCierre(); }, ESPERA_OTRO);
    }

    function cerrarFoto(i) {
      if (cerradas[i]) { return; }
      cerradas[i] = true;
      revisarCierre = null;
      cong.hidden = true;
      var propia = mias[i];
      var ajena = suyas[i] || null; /* sin fotograma del otro: silueta en su lado */
      fotos[i] = ladoMio[i] === 'izq' ? { izq: propia, der: ajena } : { izq: ajena, der: propia };
      pintarTira();
      led.textContent = T_SESION.ledListo;
      if (i < FOTOS - 1) {
        decirPiloto(REACCIONES_FOTO[i]);
        esperar(function () { prepararFoto(i + 1); }, PAUSA_ENTRE_FOTOS);
      } else {
        terminarSesion();
      }
    }

    /* ======================= RESULTADO ======================= */

    function terminarSesion() {
      fase = 'final';
      faseFoto = '';
      cabina.setAttribute('data-fase', 'final');
      var texto = camara.habia ? T_FINAL.conCamara : T_FINAL.sinCamara;
      finalEtiqueta.textContent = T_FINAL.etiqueta;
      finalTexto.textContent = texto;
      botonDescarca.textContent = T_FINAL.descarca;
      bloqueFinal.hidden = false;
      tira.setAttribute('aria-label', T_FINAL.alt);
      pintarTira();
      reiniciarClase(tira, 'revela');
      anunciar(texto);
      /* Archivo en la guantera: solo en memoria. */
      var imagen = '';
      try { imagen = tira.toDataURL('image/jpeg', 0.85); } catch (e) { imagen = ''; }
      if (window.Logro && typeof window.Logro.guardar === 'function') {
        var tarjeta = { id: ID_TARJETA, tipo: 'foto', titulo: T_FINAL.tarjeta };
        if (imagen) { tarjeta.imagen = imagen; }
        window.Logro.guardar(tarjeta);
      }
      botonDescarca.focus();
      esperar(concederLogro, PAUSA_LOGRO);
    }

    function concederLogro() {
      if (concedido || !viva()) { return; }
      concedido = true;
      if (window.Logro && typeof window.Logro.conceder === 'function') {
        window.Logro.conceder(ID_LOGRO, { alTerminar: mostrarSalida });
      } else {
        window.Juego.florecer();
        sonar('acierto');
        mostrarSalida();
      }
    }

    function mostrarSalida() {
      if (!viva()) { return; }
      botonContinua.textContent = T_FINAL.siguiente;
      botonContinua.hidden = false;
      botonContinua.focus();
    }

    /* Descarga local de la tira en PNG: un enlace <a download>, sin tocar ningún servidor. */
    function descargar() {
      function lanzar(href) {
        var enlace = document.createElement('a');
        enlace.href = href;
        enlace.download = T_FINAL.archivo;
        seccion.appendChild(enlace);
        enlace.click();
        seccion.removeChild(enlace);
      }
      if (typeof tira.toBlob === 'function' && window.URL && typeof window.URL.createObjectURL === 'function') {
        tira.toBlob(function (blob) {
          if (!blob) { return; }
          var url = window.URL.createObjectURL(blob);
          urlsObjeto.push(url);
          lanzar(url);
          esperar(function () {
            window.URL.revokeObjectURL(url);
            urlsObjeto = urlsObjeto.filter(function (u) { return u !== url; });
          }, 4000);
        }, 'image/png');
      } else {
        lanzar(tira.toDataURL('image/png'));
      }
    }

    /* ======================= Mensajes de Sala ======================= */

    function alCamaraAjena(d) {
      if (!d || (d.e !== 'lista' && d.e !== 'sin' && d.e !== 'espera')) { return; }
      otroCamara = d.e;
      pintarEstadoOtro();
    }

    function alListoAjeno(d) {
      if (!d || !numeroEntero(d.i, 0, FOTOS - 1)) { return; }
      otroListo[d.i] = true;
      if (d.i !== foto) { return; }
      if (faseFoto === 'espera') { evaluarInicio(); }
      /* Quien lanza la cuenta y ve que la otra persona sigue esperando esa misma foto: la cuenta se le perdió, se la repito. */
      else if ((faseFoto === 'cuenta' || faseFoto === 'cierre') && fase === 'sesion' && hayCompanero() && mandoYo()) { emitir('n3:cuenta', { i: foto }); }
    }

    function alCuentaAjena(d) {
      if (!d || !numeroEntero(d.i, 0, FOTOS - 1)) { return; }
      if (fase !== 'sesion' || d.i !== foto) { return; }
      if (faseFoto !== 'espera' && faseFoto !== 'pose') { return; }
      if (hayCompanero() && mandoYo()) { return; } /* la cuenta la lanza el id menor, nunca el otro */
      lanzarCuenta();
    }

    function alPedirEstado() {
      if (fase === 'final') {
        emitir('n3:estado', { f: 'final', e: estadoSimple(camara.estado), p: 0 });
      } else if (fase === 'prep' || fase === 'sesion') {
        emitir('n3:estado', { f: 'cabina', e: estadoSimple(camara.estado), p: fase === 'sesion' ? foto : 0 });
      } else {
        emitir('n3:estado', { f: 'pre', e: estadoSimple(camara.estado) });
      }
      if (fase !== 'llegada' && fase !== 'pregunta') { emitir('n3:camara', { e: estadoSimple(camara.estado) }); }
      if (fase === 'sesion' && faseFoto === 'espera') { emitir('n3:listo', { i: foto }); }
    }

    function alEstadoAjeno(d) {
      if (!d || typeof d !== 'object') { return; }
      if (d.e === 'lista' || d.e === 'sin' || d.e === 'espera') { otroCamara = d.e; pintarEstadoOtro(); }
      if (numeroEntero(d.p, 0, FOTOS - 1) && (fase === 'llegada' || fase === 'pregunta' || fase === 'prep')) { otroFoto = d.p; }
      if (d.f === 'final') { saltarAFinal(); }
      else if (d.f === 'cabina') { saltarACabina(); }
    }

    /* ======================= Cableado ======================= */

    escuchar(botonDa, 'click', function () { elegirDa(true); });
    escuchar(botonNu, 'click', esquivar);
    escuchar(botonNu, 'pointerdown', esquivar);
    escuchar(botonNu, 'focus', esquivar);
    escuchar(document, 'pointermove', alMover);

    escuchar(botonEntrar, 'click', entrarEnCabina);
    escuchar(botonReintenta, 'click', function () {
      if (camara.estado === 'omitida' || camara.estado === 'lista') { return; }
      intentarCamara();
    });
    escuchar(botonSinCamara, 'click', omitirCamara);
    escuchar(botonGata, 'click', pulsarGata);
    Object.keys(botonesComp).forEach(function (k) {
      escuchar(botonesComp[k], 'click', function () {
        if (fase !== 'sesion' || faseFoto === 'cuenta' || faseFoto === 'cierre') { return; }
        accesorios[k] = !accesorios[k];
        botonesComp[k].setAttribute('aria-pressed', accesorios[k] ? 'true' : 'false');
        redibujarSup();
      });
    });
    escuchar(botonDescarca, 'click', descargar);
    escuchar(botonContinua, 'click', function () {
      botonContinua.disabled = true;
      sonar('alejarse');
      cabina.classList.remove('visible');
      cabina.classList.add('saliendo');
      escena.classList.add('rodando', 'sale');
      esperar(function () { window.Juego.siguiente(); }, 1700);
    });

    alRecibir('n3:boton', esquivaAjena);
    alRecibir('n3:da', function () { if (fase === 'llegada' || fase === 'pregunta') { saltarACabina(); } });
    alRecibir('n3:camara', alCamaraAjena);
    alRecibir('n3:listo', alListoAjeno);
    alRecibir('n3:cuenta', alCuentaAjena);
    alRecibir('n3:fotoparte', alParte);
    alRecibir('n3:pide', alPedirEstado);
    alRecibir('n3:estado', alEstadoAjeno);

    alDetener(function () {
      camara.ficha += 1;
      liberarCamara();
      urlsObjeto.forEach(function (u) {
        try { window.URL.revokeObjectURL(u); } catch (e) { /* ya revocada */ }
      });
      urlsObjeto = [];
    });

    /* ---------- Estado inicial de la pantalla (por si se vuelve a entrar al nivel) ---------- */
    devolverNu();
    panel.hidden = true;
    cabina.hidden = true;
    cabina.classList.remove('visible', 'saliendo');
    cabina.setAttribute('data-fase', 'prep');
    prep.hidden = true;
    sesion.hidden = true;
    bloqueFinal.hidden = true;
    tira.hidden = false;
    botonDescarca.hidden = false;
    botonContinua.hidden = true;
    botonContinua.disabled = false;
    video.hidden = true;
    escena.classList.remove('aparca', 'sale', 'rodando');

    prepEtiqueta.textContent = T_PREP.etiqueta;
    prepTitulo.textContent = T_PREP.titlu;
    prepTexto.textContent = T_PREP.texto;
    prepNota.textContent = T_PREP.nota;
    botonEntrar.textContent = T_PREP.entrar;
    botonReintenta.textContent = T_PREP.reintenta;
    botonSinCamara.textContent = T_PREP.sinCamara;
    compleTitulo.textContent = T_SESION.complementos;
    botonesComp.gafas.textContent = T_SESION.gafas;
    botonesComp.corona.textContent = T_SESION.corona;
    botonesComp.bigote.textContent = T_SESION.bigote;
    tira.width = TIRA.ancho;
    tira.height = TIRA.alto;
    tira.setAttribute('aria-label', T_FINAL.alt);
    botonDescarca.textContent = T_FINAL.descarca;
    estadoYo.textContent = '';
    estadoOtro.textContent = '';

    /* Quien llega tarde pregunta dónde está la otra persona. */
    emitir('n3:pide', {});

    /* Llegada: el coche entra rodando desde la izquierda, frena, y entonces habla el piloto. */
    escena.classList.add('rodando');
    void escena.getBoundingClientRect();
    esperar(function () {
      if (saltando || fase !== 'llegada') { return; }
      escena.classList.add('aparca');
      sonar('llegar');
    }, 350);
    esperar(function () { escena.classList.remove('rodando'); }, 3000);
    esperar(function () {
      if (saltando || fase !== 'llegada') { return; }
      dialogo = window.Dialogo.reproducir(vineta, DIALOGO, {
        lector: mensaje,
        alTerminar: function () {
          dialogoActivo = false;
          pistaClic.hidden = true;
          esperar(mostrarPregunta, 600);
        }
      });
      esperar(function () { if (dialogoActivo && !saltando && fase === 'llegada') { pistaClic.hidden = false; } }, 2200);
    }, 3400);
  }

  /* Deja el nivel limpio: sin temporizadores, listeners, diálogo, viñeta ni cámara abierta. Se puede llamar sin haber iniciado y varias veces. */
  function detener() {
    detenido = true;
    limpiarRelojes();
    quitarEscuchas();
    quitarBajas();
    if (dialogo && typeof dialogo.cancelar === 'function') { dialogo.cancelar(); }
    if (habla && typeof habla.cancelar === 'function') { habla.cancelar(); }
    dialogo = null;
    var pendientes = limpiezas;
    limpiezas = [];
    pendientes.forEach(function (fn) { try { fn(); } catch (e) { /* una limpieza no debe impedir las demás */ } });
  }

  window.Juego.registrar(3, { iniciar: iniciar, detener: detener });
})();
