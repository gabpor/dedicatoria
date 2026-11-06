/* Contenido privado: textos y fotos que ya no viven en el repositorio público, sino en Supabase.
   Se carga una vez tras iniciar sesión. Si no hay conexión con Supabase (modo local), devuelve los valores por defecto. */
(function () {
  'use strict';

  var cliente = null;
  var datos = {};
  var urls = {};
  var DURACION_URL = 14400; /* segundos de vida de cada enlace firmado */

  /* Descarga todas las filas de `contenido` (son pocas y pequeñas). */
  function cargar(clienteSupabase) {
    cliente = clienteSupabase;
    if (!cliente) { return Promise.resolve(); }
    return cliente.from('contenido').select('clave,valor').then(function (r) {
      if (r.error) { throw r.error; }
      (r.data || []).forEach(function (fila) { datos[fila.clave] = fila.valor; });
    });
  }

  function obtener(clave, porDefecto) {
    return Object.prototype.hasOwnProperty.call(datos, clave) ? datos[clave] : porDefecto;
  }

  /* Devuelve una promesa con un enlace temporal a un archivo del almacén privado. Sin Supabase, usa la ruta local. */
  function url(ruta) {
    if (!cliente) { return Promise.resolve('assets/' + ruta); }
    if (urls[ruta]) { return urls[ruta]; }
    urls[ruta] = cliente.storage.from('privado').createSignedUrl(ruta, DURACION_URL).then(function (r) {
      if (r.error || !r.data) { delete urls[ruta]; throw (r.error || new Error('sin enlace')); }
      return r.data.signedUrl;
    });
    return urls[ruta];
  }

  /* Pide ya todos los enlaces para que las fotos estén listas cuando se necesiten. */
  function precargar(rutas) {
    return Promise.all(rutas.map(function (r) { return url(r).catch(function () { return null; }); }));
  }

  window.Contenido = { cargar: cargar, obtener: obtener, url: url, precargar: precargar };
})();
