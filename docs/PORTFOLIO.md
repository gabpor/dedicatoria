# Proyecto: web interactiva por niveles

## Qué construí

Una web interactiva por niveles, hecha como regalo para mi pareja. Es una sola página que se juega como un videojuego: un coche recorre el trayecto de Valencia a Bruselas, y en cada parada hay una prueba distinta (preguntas para responder en voz alta, un memory, un botón que huye del ratón, un puzzle de 63 piezas, un mapa para conducir, un rasca y gana, y un cofre con una carta al final). Son 8 niveles y 9 flores, que se van encendiendo al superar cada uno. Entran las dos personas con su cuenta, y pueden jugar juntas en tiempo real: ven el puntero de la otra, avanzan a la vez y comparten las piezas.

Todo el contenido personal vive fuera del código público, en Supabase (un servicio en la nube con base de datos y almacén de archivos privados), con reglas de acceso que solo dejan entrar a las dos cuentas.

## El reto

Una web estática, publicada en GitHub Pages, no tiene servidor propio. Eso significa que cualquier archivo que se publica es público, y que el navegador no puede guardar secretos. El reto era doble. Por un lado, proteger textos, fotos, audio y el código del cofre, de modo que nadie que llegue a la dirección los vea sin cuenta. Por otro, dejar que dos personas jueguen a la vez sobre el mismo estado, con cambios que se reflejan en las dos pantallas sin que una vaya más rápida que la otra. Ambos requisitos había que cumplirlos con las mismas piezas: HTML, CSS, JavaScript sin frameworks y servicios que no requieren mantener un servidor.

## Decisiones y por qué

| Decisión | Alternativa que descarté | Por qué |
|---|---|---|
| Supabase para cuentas, base de datos, archivos privados y tiempo real | Montar un servidor propio | Con un servidor propio tendría que mantenerlo, actualizarlo y pagarlo. Supabase cubre las cuatro necesidades con reglas de acceso (RLS, reglas por fila) escritas en SQL. |
| JavaScript vanilla, sin frameworks, con scripts clásicos | React o similares | La web es una sola página con pocas pantallas. Un framework añadía un paso de compilación sin aportar nada que se necesitara. Cada nivel es un archivo que se registra solo. |
| Semilla compartida en lugar de sincronizar todo el estado | Enviar cada resultado aleatorio por la red | Las dos pantallas calculan el mismo orden de cartas o de piezas a partir de un número común. Así no viaja nada grande por la red, y la sincronización se limita a las acciones. |
| Bloqueo de piezas, con desempate por el `id` menor | Dejar que gane siempre el último en llegar | Si las dos personas cogen la misma pieza a la vez, gana una regla fija y predecible. La otra pieza vuelve a su sitio. Nadie tiene que decidir a mano. |
| Código del cofre comprobado en el servidor | Comprobarlo en el navegador | Si el código estuviera en el navegador, quien mirara el código fuente lo vería. En el servidor solo se pregunta si el código es correcto, y la carta sale únicamente si lo es. |
| Contenido privado fuera del repositorio | Dejar los textos en el código | El repositorio es público, y su historial también. Lo personal se sube a Supabase con un script que se ejecuta solo en mi ordenador. |

## Lo más difícil

El puzzle. Es el nivel donde las dos pantallas tocan el mismo objeto a la vez, y cada movimiento puede llegar en cualquier orden. Tuve que resolver tres problemas a la vez.

- Bloqueos. Cuando una persona coge una pieza, la otra no puede moverla. El bloqueo se comunica con un mensaje, y si el mensaje se pierde, la pantalla se queda desincronizada. Por eso cada pocos segundos (3 segundos, en el código) cada pantalla envía un latido con cuántas piezas tiene colocadas y cuál lleva en la mano. Si una pantalla discrepa, el latido corrige la diferencia.
- Conflictos. Si las dos sueltan la misma pieza casi al mismo tiempo, las dos pantallas podrían quedarse con versiones distintas. Para resolverlo, cada suelta lleva un número de orden propio, el sello. Las dos pantallas se quedan con la suelta de sello mayor, sin depender de que los relojes de los dos ordenadores coincidan.
- Frecuencia de envío. Cada movimiento de pieza se envía como mucho unas 16 veces por segundo, para no llenar el canal de mensajes.

Lo que sé de este nivel es lo que hace el código. Todavía no lo he probado con dos personas en navegadores reales, y esa prueba sigue pendiente.

## Cómo trabajé

Antes de escribir código hice primero una auditoría del proyecto, para tener claro qué había, qué faltaba y qué podía fallar. Después repartí el trabajo entre asistentes de IA especializados, uno por grupo de niveles. Todos siguieron el mismo contrato de interfaz (los nombres de los mensajes, la forma de registrar un nivel y las funciones comunes), para que las piezas encajaran al unirlas. Usé Claude Code como entorno de trabajo. Revisé el resultado de cada grupo antes de integrarlo.

Revisé el resultado de cada grupo antes de unirlo al resto del proyecto.

## Qué aprendí

- Un fallo en las reglas de acceso no se ve en la pantalla, y aun así es el más grave. Son lo primero que hay que revisar.
- Un contrato de mensajes escrito de antemano facilita unir partes hechas por separado. Cada nivel documenta sus mensajes en la cabecera de su archivo.
- Las clases CSS llevan un prefijo por nivel (por ejemplo `n2-`). Así una clase de un nivel no se aplica por error a otro.
- Un nivel tiene que poder detenerse limpio. Cada uno cancela sus temporizadores y escuchas al salir, porque un temporizador olvidado cambia la pantalla de otro nivel.

## Qué haría distinto y pendientes

- Probar con dos personas en navegadores reales antes de darlo por terminado. Es el criterio de cierre que queda por cumplir.
- Elegir y subir el contenido real que todavía es provisional: la carta, el mensaje de audio o vídeo del último nivel y la canción de cierre.
- Revisar los textos en rumano con una persona que hable el idioma con nivel nativo, incluidos los versículos.
- Separar antes el contenido del código. Los textos personales ya están fuera del repositorio, pero algunos de los valores por defecto siguen dentro de los archivos de cada nivel.
- Automatizar la comprobación de privacidad antes de cada subida, en lugar de hacerla a mano con `git diff`.
