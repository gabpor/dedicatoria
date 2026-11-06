# Seguridad

Este documento dice qué protege la web, cómo lo hace y qué no protege. Está escrito para leerse sin conocimientos técnicos. Donde aparece un término técnico, se explica en una frase.

La idea general: la web es pública, así que cualquiera puede descargar sus archivos. Por eso lo privado no se guarda en esos archivos. Se guarda en Supabase, y Supabase solo lo entrega a cuentas autorizadas.

## Amenazas y qué se hizo

| Amenaza | Qué se hizo | Dónde está |
|---|---|---|
| Que entre cualquier desconocido | Solo existen dos cuentas, creadas a mano por el autor. Se bloquea el registro público (ver CONFIGURAR). Una tabla `perfiles` guarda las dos cuentas y una función `es_pareja()` comprueba si quien llama está en esa tabla. | `supabase/schema.sql` (tabla y función), `supabase/sembrar.mjs` (crea las cuentas), `site/js/acceso.js` (si la cuenta no está en `perfiles`, cierra la sesión) |
| Que alguien lea los textos o las fotos sin cuenta | RLS (reglas por fila, que deciden qué filas puede leer cada persona) activada en todas las tablas. Por defecto nadie puede nada. Solo `es_pareja()` abre la lectura de `perfiles`, `contenido` y `partida`. Las tablas `secretos`, `cofre_codigos` e `intentos_cofre` no tienen ninguna regla: solo las funciones internas las leen. | `supabase/schema.sql` |
| Que alguien lea las fotos o el audio directamente desde su dirección | El almacén `privado` no es público. Solo se entregan enlaces firmados que caducan a la hora. Los enlaces solo se piden si hay sesión válida. | `schema.sql` (bucket y política `privado_leer`), `site/js/contenido.js` |
| Que alguien mire el código del cofre o la carta en el código fuente | El código de cuatro cifras y la carta no viajan al navegador. La comprobación se hace en el servidor con la función `abrir_cofre`. La carta solo sale como respuesta a esa función, o a `leer_carta` si la otra persona ya abrió el cofre. | `schema.sql` (funciones), `site/js/niveles/nivel7.js` |
| Que alguien pruebe muchos códigos del cofre | Máximo 5 intentos por minuto y persona. Cada intento queda registrado en `intentos_cofre` antes de comprobar el código. | `schema.sql`, función `abrir_cofre` |
| Que alguien escuche o modifique la comunicación entre las dos pantallas | El canal `sala` es privado: las reglas de `realtime.messages` solo permiten leer y escribir a las dos cuentas autorizadas, y solo en ese canal. | `schema.sql` (políticas `sala_leer` y `sala_escribir`) |
| Ataques de página (inyección de código) | Política de contenidos (CSP, una lista de orígenes permitidos) en una etiqueta `<meta>`. Solo se cargan scripts del propio sitio y de YouTube. El código no usa `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `eval`, `document.write` ni `new Function`: el texto se escribe como texto. | `site/index.html` (meta CSP), `site/js/*.js` |
| Rastreo por YouTube | La música se carga desde `youtube-nocookie.com`, la variante de YouTube pensada para incrustar vídeos sin cookies de seguimiento. Ver límites más abajo. | `site/js/radio.js` |
| Dependencias externas | El cliente de Supabase está copiado en `site/vendor/`. El navegador no lo descarga de otro sitio. | `site/vendor/supabase.js` |
| Que el navegador envíe de qué página venía | Se pide no enviar la cabecera Referer. | `site/index.html` (meta `referrer` con valor `no-referrer`) |
| Que la sesión quede guardada en el navegador | La sesión vive en `sessionStorage`, que se borra al cerrar la pestaña. Si el navegador lo bloquea, se usa memoria temporal. | `site/js/acceso.js` |
| Que se suban secretos al repositorio público | `.gitignore` excluye `datos-privados/`, los documentos internos del proyecto, `.env`, claves `.pem`, las fotos y los audios. La clave `service_role` no aparece en ningún archivo: `sembrar.mjs` la pide en una variable de entorno. | `.gitignore`, `supabase/sembrar.mjs` |

## Claves: cuál es pública y cuál es secreta

| Clave | Dónde está | Es pública | Qué puede hacer |
|---|---|---|---|
| `anon` (pública) | `site/js/config.js` | Sí, por diseño | Solo lo que permitan las reglas RLS. Sin cuenta, casi nada. |
| `service_role` (secreta) | Solo en la terminal del autor, al ejecutar `sembrar.mjs` | No. Nunca se sube a git | Salta todas las reglas RLS. Puede leer y escribir todo. |

La clave `anon` aparece en el código de la web porque cualquier navegador la necesita para hablar con Supabase. Su seguridad no depende de que esté oculta, sino de las reglas de la base de datos.

## Límites honestos

- La contraseña del nivel 0 es parte del juego, no seguridad. Su resumen SHA-256 está en el código fuente. Cualquiera que lo lea puede probar combinaciones sin conexión. Protege solo contra una mirada casual.
- El límite de intentos de inicio de sesión (5 fallos y 30 segundos de espera) está en el navegador. Quien quiera saltárselo puede hacerlo. La protección real contra fuerza bruta depende de Supabase Auth (el sistema de cuentas de Supabase). El repositorio no configura ni documenta sus límites en el servidor.
- GitHub Pages no permite configurar cabeceras HTTP. Por eso la CSP va en una etiqueta `<meta>`. Una etiqueta `<meta>` no puede aplicar todas las reglas posibles: por ejemplo, no puede impedir que la página se meta dentro de un marco ajeno.
- Quien tenga una cuenta ve todo el contenido privado. Las reglas protegen frente a desconocidos, no frente a la otra persona de la pareja.
- Si alguien obtiene la contraseña de una de las cuentas, puede entrar como esa persona. Por eso las contraseñas deben tener al menos 12 caracteres (lo exige `sembrar.mjs`) y no reutilizarse.
- Los archivos de la web son públicos. Quien vea el código sabe qué niveles existen, cómo se llaman y qué tipo de mecánica tienen. Los textos, las fotos y el código del cofre no están ahí.
- Las fotos y audios que se borren del almacén privado no se borran de las copias locales del autor. Eso no está cubierto por la web.
- Los enlaces firmados de las fotos valen una hora. Si alguien copia uno, puede verlo durante ese tiempo.
- YouTube: la música usa `youtube-nocookie.com`, pero la carga del reproductor (`iframe_api`) viene de `youtube.com`, que la CSP permite. Por eso no hay garantía de que YouTube no registre la visita.
