# Configurar el proyecto

Esta guía explica cómo montar la web con una base de datos propia. Sirve para quien quiera hacer su propia versión o recrear el proyecto desde cero. Los pasos están en orden. Donde aparece un término técnico, se explica en una frase.

Antes de empezar: el repositorio es público. Ninguno de estos pasos debe dejar datos personales, claves ni contraseñas dentro de los archivos del repositorio. Los datos privados van en una carpeta que git ignora, y las claves se escriben solo en la terminal.

## Requisitos

- Una cuenta en Supabase (supabase.com).
- Node.js 18 o superior, para ejecutar `sembrar.mjs`. Sin dependencias que instalar.
- Git y un editor de texto.
- Un navegador de escritorio.

## 1. Crear el proyecto en Supabase

En el panel de Supabase, crear un proyecto nuevo. Guardar la contraseña de la base de datos en un gestor de contraseñas. Esperar a que termine de crearse.

Nota: los proyectos gratuitos de Supabase se pausan tras 7 días sin uso. Un proyecto pausado no responde hasta que se reactiva desde el panel. Conviene entrar al panel antes de la fecha prevista.

## 2. Desactivar el registro público

Cualquier persona podría crear una cuenta en la web si el registro está abierto. Para impedirlo:

1. En el panel, ir a **Authentication** y después a la sección de configuración de proveedores o de inicio de sesión.
2. Desactivar la opción que permite a usuarios nuevos registrarse.

Los nombres exactos de estas opciones pueden cambiar según la versión del panel. La idea es que solo existan las cuentas que crea `sembrar.mjs`.

## 3. Restringir el canal en tiempo real

El canal `sala` es privado y sus reglas están en `schema.sql`. Además, en el panel de **Realtime** conviene desactivar el acceso a canales públicos, para que no quede ninguna puerta abierta. Igual que en el paso anterior, el nombre exacto de la opción depende de la versión del panel.

## 4. Ejecutar el esquema de la base de datos

En el panel, abrir **SQL Editor**, pegar el contenido completo de `supabase/schema.sql` y ejecutarlo.

El esquema crea las tablas, las reglas de acceso, las funciones del cofre, el almacén privado y las reglas del canal `sala`. Puede volver a ejecutarse sin romper nada: usa `if not exists` y `drop policy if exists`.

## 5. Copiar la dirección y la clave pública

En el panel, ir a **Project Settings > API**. Copiar:

- **Project URL**: la dirección del proyecto.
- **anon public**: la clave pública.

Pegar ambos valores en `site/js/config.js`, en las variables `SUPABASE_URL` y `SUPABASE_ANON_KEY`.

Esa clave es pública por diseño (ver [SEGURIDAD.md](SEGURIDAD.md)). Aun así, en este archivo nunca debe aparecer la clave `service_role` (la clave secreta del panel, en la misma página). Si aparece, hay que regenerarla desde el panel y reescribir el historial del repositorio antes de publicar.

## 6. Preparar los datos privados

Crear, en la raíz del proyecto, una carpeta llamada `datos-privados/`. Git la ignora por configuración (`.gitignore`), pero conviene comprobarlo antes de cada commit con `git status`.

Dentro hay tres cosas:

**`contenido.json`**: un archivo con este formato:

```json
{
  "contenido": { "clave": "valor" },
  "secretos": { "carta": { "parrafos": ["..."], "firma": "..." } },
  "codigos": ["0000"]
}
```

- `contenido`: textos y datos que leen los niveles. Cada clave es un nombre como `nivel4.dialogo`. La lista de claves que lee cada nivel está en el comentario de cabecera de su archivo en `site/js/niveles/`.
- `secretos`: la carta del cofre. Solo sale desde el servidor.
- `cofre_codigos`: los códigos válidos del cofre, de cuatro cifras cada uno.

**`partes/*.json`** (opcional): el mismo formato, repartido en varios archivos. `sembrar.mjs` los fusiona con `contenido.json`, en orden alfabético.

**`fotos/`** (opcional): fotos, audios y vídeos que se suben al almacén privado. La ruta dentro de `fotos/` debe coincidir con la que pide el código. Por ejemplo, si el código pide `img/frontera/parada-01.webp`, el archivo debe estar en `datos-privados/fotos/img/frontera/parada-01.webp`. Los tipos admitidos son `.webp`, `.jpg`, `.jpeg`, `.png`, `.mp3`, `.m4a`, `.ogg` y `.mp4`.

Las fotos conviene prepararlas antes en WebP y sin datos EXIF (la información oculta que guardan las cámaras, como fecha o ubicación). El nivel 5 indica en su cabecera las proporciones que espera (4:3 o 3:4).

## 7. Crear las dos cuentas y subir los datos

`sembrar.mjs` hace cuatro cosas: crea o actualiza las dos cuentas, las registra en la tabla `perfiles`, sube `contenido`, `secretos` y `cofre_codigos`, y sube las fotos al almacén privado.

Necesita estas variables de entorno:

| Variable | Qué es |
|---|---|
| `SUPABASE_URL` | La Project URL del paso 5. |
| `SERVICE_KEY` | La clave `service_role` (secreta). Solo se escribe en la terminal. |
| `EMAIL_1`, `PASS_1`, `NOMBRE_1`, `COLOR_1` | La primera cuenta: correo, contraseña (mínimo 12 caracteres), nombre visible y color. |
| `EMAIL_2`, `PASS_2`, `NOMBRE_2`, `COLOR_2` | La segunda cuenta, con los mismos campos. |

El color puede ser `azul`, `amarillo`, `verde` o `marino`. Conviene que cada persona tenga un color distinto, aunque el código no lo comprueba.

Ejemplo en Git Bash o en una terminal Linux o macOS:

```bash
SUPABASE_URL="https://TU-PROYECTO.supabase.co" \
SERVICE_KEY="pegar-aqui-la-clave-service-role" \
EMAIL_1="primera@ejemplo.com" PASS_1="contraseña-de-al-menos-12" NOMBRE_1="Nombre 1" COLOR_1="azul" \
EMAIL_2="segunda@ejemplo.com" PASS_2="otra-contraseña-de-12" NOMBRE_2="Nombre 2" COLOR_2="amarillo" \
node supabase/sembrar.mjs
```

En PowerShell, cada variable se asigna con `$env:NOMBRE = "valor"` antes de ejecutar `node supabase/sembrar.mjs`.

Reglas:

- La clave `service_role` nunca va a un archivo ni a git. Tampoco a un chat ni a un documento. Si se expone, regenerarla en el panel.
- No hace falta guardar las variables en ningún archivo. Cerrar la terminal al terminar.
- Si una cuenta ya existe, `sembrar.mjs` cambia su contraseña y su nombre por los nuevos valores. Sirve para corregir una contraseña.
- Si el script falla, el mensaje indica qué paso ha fallado. Se puede volver a ejecutar sin riesgo.

## 8. Activar GitHub Pages

En el repositorio de GitHub, ir a **Settings > Pages** y elegir como fuente **GitHub Actions**. El archivo `.github/workflows/pages.yml` publica la carpeta `site/` cada vez que se sube un cambio a `main`.

Solo se publica `site/`. `supabase/`, `docs/`, `scripts/` y `datos-privados/` no forman parte de la web publicada.

## 9. Comprobar que funciona

1. Abrir la web en local (`npx serve site`) o en la dirección de GitHub Pages.
2. Entrar con una de las dos cuentas. Si falla, comprobar `config.js` y que el paso 2 se hizo bien.
3. Abrir la web con la segunda cuenta en otra ventana. Las dos pantallas deben mostrar la presencia de la otra persona.
4. Si una foto no aparece, revisar que la ruta en `datos-privados/fotos/` coincide con la que pide el código.

La prueba completa con dos personas en navegadores reales sigue pendiente (ver el README).

## Problemas frecuentes

| Síntoma | Causa probable |
|---|---|
| "Acces nepermis." tras entrar | La cuenta no está en la tabla `perfiles`. Ejecutar de nuevo `sembrar.mjs`. |
| La web dice que el acceso no está configurado | `config.js` no tiene la URL o la clave. |
| Error al ejecutar `sembrar.mjs` por falta de variables | Falta alguna de las variables de la tabla del paso 7. |
| Las fotos no aparecen | La ruta de la foto no coincide con la que pide el código, o no se subió. |
| Ninguna respuesta del servidor durante un rato | El proyecto gratuito está pausado. Reactivarlo desde el panel. |
