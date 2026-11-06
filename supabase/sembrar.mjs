// Siembra Supabase: crea las dos cuentas, sube el contenido privado y las fotos.
// Se ejecuta en el ordenador de Gabriel, nunca en la web. Sin dependencias (Node 18 o superior).
//
// Variables de entorno (se escriben en la terminal, nunca en un archivo):
//   SUPABASE_URL   https://xxxx.supabase.co
//   SERVICE_KEY    clave "service_role" del panel (Settings > API). Es secreta.
//   EMAIL_1 PASS_1 NOMBRE_1 COLOR_1    primera cuenta (color: azul, amarillo, verde o marino)
//   EMAIL_2 PASS_2 NOMBRE_2 COLOR_2    segunda cuenta
//
// Datos privados (carpeta datos-privados/, ignorada por git):
//   datos-privados/contenido.json   { "contenido": {clave: valor}, "secretos": {"carta": {...}}, "codigos": ["0000"] }
//   datos-privados/fotos/...        archivos que se suben al bucket privado con la misma ruta relativa

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';

const { SUPABASE_URL, SERVICE_KEY } = process.env;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Faltan SUPABASE_URL y SERVICE_KEY.');
  process.exit(1);
}
const base = SUPABASE_URL.replace(/\/$/, '');
const cabecera = { apikey: SERVICE_KEY, Authorization: 'Bearer ' + SERVICE_KEY };

async function llamar(ruta, opciones = {}) {
  const r = await fetch(base + ruta, { ...opciones, headers: { ...cabecera, ...(opciones.headers || {}) } });
  const texto = await r.text();
  if (!r.ok) { throw new Error(opciones.method + ' ' + ruta + ' -> ' + r.status + ' ' + texto); }
  return texto ? JSON.parse(texto) : null;
}

const json = { 'Content-Type': 'application/json' };

async function asegurarCuenta(n) {
  const email = process.env['EMAIL_' + n];
  const password = process.env['PASS_' + n];
  const nombre = process.env['NOMBRE_' + n];
  const color = process.env['COLOR_' + n];
  if (!email || !password || !nombre || !['azul', 'amarillo', 'verde', 'marino'].includes(color)) {
    throw new Error('Cuenta ' + n + ': faltan EMAIL, PASS, NOMBRE o COLOR (azul|amarillo|verde|marino).');
  }
  if (password.length < 12) { throw new Error('Cuenta ' + n + ': la contraseña debe tener al menos 12 caracteres.'); }

  const lista = await llamar('/auth/v1/admin/users?per_page=200');
  let usuario = (lista.users || []).find((u) => u.email === email);
  if (usuario) {
    usuario = await llamar('/auth/v1/admin/users/' + usuario.id, {
      method: 'PUT', headers: json, body: JSON.stringify({ password, email_confirm: true })
    });
  } else {
    usuario = await llamar('/auth/v1/admin/users', {
      method: 'POST', headers: json, body: JSON.stringify({ email, password, email_confirm: true })
    });
  }
  await llamar('/rest/v1/perfiles?on_conflict=id', {
    method: 'POST',
    headers: { ...json, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ id: usuario.id, nombre, color })
  });
  console.log('Cuenta lista: ' + nombre + ' (' + color + ')');
}

async function subirFilas(tabla, filas, clave) {
  if (!filas.length) { return; }
  await llamar('/rest/v1/' + tabla + '?on_conflict=' + clave, {
    method: 'POST',
    headers: { ...json, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(filas)
  });
  console.log(tabla + ': ' + filas.length + ' fila(s)');
}

function archivos(dir) {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    return statSync(ruta).isDirectory() ? archivos(ruta) : [ruta];
  });
}

const TIPOS = { '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg', '.mp4': 'video/mp4' };

async function subirFotos(dir) {
  if (!existsSync(dir)) { console.log('Sin carpeta de fotos: se omite.'); return; }
  const lista = archivos(dir);
  for (const ruta of lista) {
    const tipo = TIPOS[extname(ruta).toLowerCase()];
    if (!tipo) { console.log('Tipo no admitido, se omite: ' + ruta); continue; }
    const destino = relative(dir, ruta).split('\\').join('/');
    await llamar('/storage/v1/object/privado/' + destino, {
      method: 'POST', headers: { 'Content-Type': tipo, 'x-upsert': 'true' }, body: readFileSync(ruta)
    });
  }
  console.log('Archivos subidos: ' + lista.length);
}

await asegurarCuenta(1);
await asegurarCuenta(2);

const raiz = 'datos-privados';
/* Datos: contenido.json y, además, un archivo por nivel en partes/*.json (se fusionan). */
const archivosDatos = [join(raiz, 'contenido.json')];
if (existsSync(join(raiz, 'partes'))) {
  readdirSync(join(raiz, 'partes')).filter((n) => n.endsWith('.json')).sort().forEach((n) => archivosDatos.push(join(raiz, 'partes', n)));
}
const total = { contenido: {}, secretos: {}, codigos: [] };
for (const archivo of archivosDatos.filter((a) => existsSync(a))) {
  const datos = JSON.parse(readFileSync(archivo, 'utf8'));
  Object.assign(total.contenido, datos.contenido || {});
  Object.assign(total.secretos, datos.secretos || {});
  total.codigos.push(...(datos.codigos || []));
  console.log('Leído: ' + archivo);
}
await subirFilas('contenido', Object.entries(total.contenido).map(([clave, valor]) => ({ clave, valor })), 'clave');
await subirFilas('secretos', Object.entries(total.secretos).map(([clave, valor]) => ({ clave, valor })), 'clave');
await subirFilas('cofre_codigos', [...new Set(total.codigos)].map((codigo) => ({ codigo })), 'codigo');
await subirFotos(join(raiz, 'fotos'));
console.log('Hecho.');
