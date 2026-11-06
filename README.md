# Web interactiva por niveles

Es una web de una sola página con forma de juego: se avanza de nivel en nivel por un recorrido en coche, de Valencia a Bruselas. Está hecha como regalo para mi pareja. Se juega en ordenador, en videollamada, y cada persona entra con su propia cuenta.

Este repositorio es público. Por eso no contiene ningún dato personal, ni fotos, ni audios, ni textos privados. Esos viven fuera de git, en una base de datos y un almacén de archivos privados de Supabase (un servicio en la nube que guarda datos y archivos con reglas de acceso).

## Qué hace

- 8 niveles (del 0 al 7) y 9 flores para llevar la cuenta del avance.
- Acceso con correo y contraseña. No hay registro público: las dos cuentas se crean a mano.
- Modo en pareja en tiempo real: las dos personas ven al mismo tiempo el mismo nivel, el cursor de la otra y las piezas que mueve.
- Privacidad: el contenido personal y el código del cofre no llegan al navegador hasta que se necesitan, y solo a cuentas autorizadas.
- Sin acompañante, el juego funciona en solitario.

## Tecnologías

| Parte | Qué se usa | Para qué |
|---|---|---|
| Web | HTML, CSS y JavaScript sin frameworks | La página y el juego |
| Acceso y datos | Supabase (Auth, base de datos, almacén de archivos, tiempo real) | Inicio de sesión, textos privados, fotos y audio privados, y comunicación en tiempo real |
| Publicación | GitHub Pages | Sirve la carpeta `site/` como web pública |

Las páginas se publican solas cada vez que se sube un cambio a la rama `main`, según `.github/workflows/pages.yml`.

## Probar en local

Hace falta Node.js (versión 18 o superior). Desde la raíz del proyecto:

```bash
npx serve site
```

Después se abre la dirección que indique la terminal (normalmente `http://localhost:3000`).

Si `site/js/config.js` no tiene los datos de Supabase, el juego arranca en solitario en `localhost`. El parámetro `?nivel=N` (por ejemplo `?nivel=3`) salta a ese nivel, pero solo funciona en `localhost`.

## Estructura de carpetas

```
site/                  Todo lo que se publica
  index.html           Página única: contiene todas las pantallas
  css/                 Estilos (uno por nivel, con prefijo propio)
  js/                  Motor, acceso, sala en tiempo real, contenido privado
  js/niveles/          Un archivo JavaScript por nivel (nivel0.js a nivel7.js)
  vendor/              Cliente de Supabase, copiado en el propio sitio
  assets/              Fuentes y restos locales; las fotos y audios privados no se suben aquí
supabase/
  schema.sql           Tablas, reglas de acceso y funciones de la base de datos
  sembrar.mjs          Script que crea las cuentas y sube el contenido privado
scripts/               Herramientas auxiliares para generar el mapa del nivel 5
docs/                  Documentación técnica (ver abajo)
```

## Documentación

- [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md): cómo encajan las piezas, cómo funciona un nivel y cómo se sincronizan las dos pantallas.
- [docs/SEGURIDAD.md](docs/SEGURIDAD.md): qué se protege, cómo, y qué no protege.
- [docs/CONFIGURAR.md](docs/CONFIGURAR.md): pasos para montar el proyecto con una base de datos propia.
- [docs/PORTFOLIO.md](docs/PORTFOLIO.md): el proyecto contado desde el punto de vista de quien lo hizo: retos, decisiones y lo que haría distinto.

## Estado y pendientes

- Pendiente de probar en un navegador real con dos personas a la vez.
- La carta, el mensaje de audio o vídeo del nivel 7 y la canción de cierre son marcadores: el contenido real se sube con `sembrar.mjs` y todavía no está elegido.
- Los textos del sitio están en rumano. Antes de publicar, hace falta que los revise alguien que hable rumano con nivel nativo. Los versículos están en la versión rumana Cornilescu y también deben revisarse.
- La parte en rumano de cada nivel figura en los comentarios de su archivo como borrador.
