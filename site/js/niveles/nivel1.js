/* Nivel 1 · Valencia: el coche llega y se detiene; el piloto presenta las 36 preguntas de Arthur Aron
   (Aron et al., 1997, «The Experimental Generation of Interpersonal Closeness») en tres seturi de 12, cada
   uno más personal que el anterior. Responden los dos, por turnos y en voz alta: la web solo muestra las
   preguntas, una a una, y no guarda nada. Al final, versículo y segunda amapola.

   Texto fuente de las preguntas: ggia.berkeley.edu (36 Questions for Increasing Closeness), que atribuye
   el procedimiento a Aron, Melinat, Aron, Vallone y Bator (1997). La traducción al rumano es una primera
   versión y la tiene que revisar alguien que hable el idioma antes de la entrega. */
(function () {
  'use strict';

  var DIALOGO = [
    'Valencia! Prima oprire de pe drumul nostru.',
    'Aici avem un joc de 36 de întrebări, făcut de psihologul Arthur Aron și colegii lui, ca două persoane să se apropie mai mult.',
    'Sunt trei seturi, tot mai personale. Răspundem amândoi, pe rând, cu voce tare și fără grabă.',
    'Noi ne cunoaștem deja. Hai să vedem ce mai putem descoperi.'
  ];

  var CIERRE = 'Am ajuns la capăt. Mulțumesc pentru toate răspunsurile.';

  var SETURI = [
    {
      nombre: 'Setul I',
      intro: null,
      preguntas: [
        'Dacă ai putea alege pe oricine din lume, pe cine ai invita la cină?',
        'Ți-ar plăcea să fii o persoană faimoasă? În ce fel?',
        'Înainte de a da un telefon, îți repeți în gând ce vei spune? De ce?',
        'Cum ar arăta pentru tine o zi „perfectă”?',
        'Când ai cântat ultima dată doar pentru tine? Dar pentru altcineva?',
        'Dacă ai putea trăi până la 90 de ani și ai păstra, în ultimii 60 de ani, fie mintea, fie corpul unui om de 30 de ani, ce ai alege?',
        'Ai o presimțire secretă despre cum vei muri?',
        'Spuneți trei lucruri pe care pare că le aveți în comun.',
        'Pentru ce anume din viața ta simți cea mai mare recunoștință?',
        'Dacă ai putea schimba ceva din felul în care ai crescut, ce ai schimba?',
        'Luați patru minute și povestiți-vă, pe rând, povestea vieții, cât mai în detaliu.',
        'Dacă te-ai trezi mâine cu o calitate sau o abilitate în plus, la alegere, care ar fi aceasta?'
      ]
    },
    {
      nombre: 'Setul II',
      intro: 'Al doilea set. Mergem puțin mai adânc.',
      preguntas: [
        'Dacă un glob de cristal ți-ar putea spune adevărul despre tine, despre viața ta, despre viitor sau despre orice altceva, ce ai vrea să afli?',
        'Există ceva ce visezi de multă vreme să faci? De ce nu ai făcut-o încă?',
        'Care este cea mai mare realizare din viața ta?',
        'Ce prețuiești cel mai mult într-o prietenie?',
        'Care este cea mai prețioasă amintire a ta?',
        'Care este cea mai cumplită amintire a ta?',
        'Dacă ai ști că peste un an vei muri brusc, ai schimba ceva în felul în care trăiești acum? De ce?',
        'Ce înseamnă prietenia pentru tine?',
        'Ce rol au dragostea și afecțiunea în viața ta?',
        'Spuneți-vă, pe rând, câte o trăsătură pozitivă pe care o vedeți unul la altul, până ajungeți la cinci.',
        'Cât de unită și de caldă este familia ta? Simți că ai avut o copilărie mai fericită decât majoritatea oamenilor?',
        'Cum te simți în legătură cu relația ta cu mama ta?'
      ]
    },
    {
      nombre: 'Setul III',
      intro: 'Ultimul set, și cel mai personal. Fiți cât mai sinceri.',
      preguntas: [
        'Spuneți fiecare câte trei afirmații adevărate cu „noi”. De exemplu: „Noi doi, în clipa asta, simțim…”',
        'Completează fraza: „Mi-aș dori să am pe cineva cu care să împart…”',
        'Dacă ați deveni prieteni foarte apropiați, ce ar fi important să știți unul despre altul?',
        'Spuneți-vă ce vă place unul la altul. Fiți foarte sinceri și spuneți lucruri pe care poate nu le-ați spune cuiva pe care tocmai l-ați cunoscut.',
        'Povestiți-vă, pe rând, un moment jenant din viața voastră.',
        'Când ai plâns ultima dată în fața altcuiva? Dar fără să te vadă nimeni?',
        'Spuneți-vă ceva ce vă place deja unul la altul.',
        'Ce, dacă există ceva, este prea serios ca să se glumească pe seama lui?',
        'Dacă ai muri în seara asta, fără nicio șansă să mai vorbești cu cineva, ce ai regreta cel mai mult că nu i-ai spus cuiva? De ce nu i-ai spus încă?',
        'Casa ta, cu tot ce ai, ia foc. După ce ți-ai salvat cei dragi și animalele, mai ai timp pentru o ultimă fugă, în siguranță, ca să salvezi un singur obiect. Care ar fi acesta? De ce?',
        'Dintre toți oamenii din familia ta, a cui moarte ți s-ar părea cea mai greu de suportat? De ce?',
        'Povestește o problemă personală și cere sfatul persoanei de lângă tine: cum ar rezolva-o? Cere-i apoi să-ți spună cum i se pare că te simți în legătură cu problema aleasă.'
      ]
    }
  ];

  /* Lista plana: cada pregunta sabe a qué set pertenece y qué lugar ocupa dentro de él. */
  var PREGUNTAS = [];
  SETURI.forEach(function (set, s) {
    set.preguntas.forEach(function (texto, k) {
      PREGUNTAS.push({ texto: texto, set: s, lugar: k, de: set.preguntas.length });
    });
  });

  var NUMEROS = ['I', 'II', 'III'];
  var LARGA = 110; /* a partir de tantos caracteres, la pregunta se escribe un poco más pequeña */

  function reiniciarClase(nodo, clase) {
    nodo.classList.remove(clase);
    void nodo.getBoundingClientRect();
    nodo.classList.add(clase);
  }

  function iniciar(seccion) {
    var escena = seccion.querySelector('.escena');
    var pistaClic = seccion.querySelector('#n1-pista-clic');
    var mensaje = seccion.querySelector('#n1-mesaj');
    var vineta = seccion.querySelector('#n1-vineta-texto');
    var quiz = seccion.querySelector('#n1-quiz');
    var cajaProgreso = seccion.querySelector('#n1-progreso');
    var tramos = cajaProgreso.querySelectorAll('i');
    var etiqueta = seccion.querySelector('#n1-tipo');
    var pregunta = seccion.querySelector('#n1-pregunta');
    var botonAtras = seccion.querySelector('#n1-atras');
    var botonSiguiente = seccion.querySelector('#n1-siguiente');
    var panelVersiculo = seccion.querySelector('#n1-versiculo');
    var botonContinua = seccion.querySelector('#n1-continua');

    var habla = window.Dialogo.hablante(vineta, mensaje);
    var indice = 0;
    var dialogoActivo = true;
    var ocupado = false; /* mientras el piloto presenta un set no se avanza (tampoco con Enter) */

    function pintarProgreso(p) {
      Array.prototype.forEach.call(tramos, function (tramo, s) {
        if (s < p.set) {
          tramo.style.width = '100%';
          tramo.className = '';
        } else if (s === p.set) {
          tramo.style.width = Math.round(((p.lugar + 1) / p.de) * 100) + '%';
          tramo.className = 'actual';
        } else {
          tramo.style.width = '0%';
          tramo.className = '';
        }
      });
      cajaProgreso.setAttribute('aria-label', 'Întrebarea ' + (indice + 1) + ' din ' + PREGUNTAS.length);
    }

    function mostrarPregunta(i) {
      var p = PREGUNTAS[i];
      indice = i;
      pintarProgreso(p);
      etiqueta.textContent = SETURI[p.set].nombre + ' · ' + (p.lugar + 1) + ' / ' + p.de;
      pregunta.textContent = p.texto;
      pregunta.className = 'quiz-pregunta' + (p.texto.length > LARGA ? ' larga' : '');
      botonAtras.hidden = i === 0;
      botonSiguiente.textContent = i === PREGUNTAS.length - 1 ? 'Am terminat' : 'Mai departe';
      quiz.hidden = false;
      quiz.classList.remove('fuera');
      reiniciarClase(quiz, 'nueva');
    }

    function mostrarQuiz() {
      dialogoActivo = false;
      pistaClic.hidden = true;
      mostrarPregunta(0);
    }

    /* Las 36 hechas: el piloto se despide y aparecen el versículo y la segunda amapola. */
    function terminar() {
      ocupado = true;
      quiz.classList.add('fuera');
      habla.decir(CIERRE, 'succes', 2800);
      setTimeout(function () {
        quiz.hidden = true;
        panelVersiculo.hidden = false;
        void panelVersiculo.getBoundingClientRect();
        panelVersiculo.classList.add('florece');
        window.Juego.florecer();
        if (window.Sonidos) { window.Sonidos.acierto(); }
        botonContinua.focus();
        ocupado = false;
      }, 3000);
    }

    botonSiguiente.addEventListener('click', function () {
      if (ocupado) { return; }
      var proxima = PREGUNTAS[indice + 1];
      if (!proxima) { terminar(); return; }
      if (proxima.set !== PREGUNTAS[indice].set) {
        /* Cambio de set: la tarjeta se esconde, el piloto presenta el siguiente y la tarjeta vuelve. */
        ocupado = true;
        quiz.classList.add('fuera');
        habla.decir(SETURI[proxima.set].intro, '', 2800);
        setTimeout(function () {
          ocupado = false;
          habla.callar();
          mostrarPregunta(indice + 1);
        }, 3000);
      } else {
        habla.callar();
        mostrarPregunta(indice + 1);
      }
    });

    botonAtras.addEventListener('click', function () {
      if (ocupado || indice === 0) { return; }
      habla.callar();
      mostrarPregunta(indice - 1);
    });

    botonContinua.addEventListener('click', function () {
      botonContinua.disabled = true;
      if (window.Sonidos) { window.Sonidos.alejarse(); }
      panelVersiculo.classList.add('fuera');
      escena.classList.add('rodando', 'sale');
      setTimeout(function () { window.Juego.siguiente(); }, 1700);
    });

    /* Llegada: el coche entra rodando desde la izquierda, frena, y entonces habla el piloto. */
    escena.classList.add('rodando');
    void escena.getBoundingClientRect();
    setTimeout(function () {
      escena.classList.add('aparca');
      if (window.Sonidos) { window.Sonidos.llegar(); }
    }, 350);
    setTimeout(function () { escena.classList.remove('rodando'); }, 3000);
    setTimeout(function () {
      window.Dialogo.reproducir(vineta, DIALOGO, { lector: mensaje, alTerminar: mostrarQuiz });
      setTimeout(function () { if (dialogoActivo) { pistaClic.hidden = false; } }, 2200);
    }, 3400);
  }

  window.Juego.registrar(1, { iniciar: iniciar });
})();
