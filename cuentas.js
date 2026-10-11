/**
 * Quién puede usar DriverFlag.
 *
 * modoCuentas:
 *   "todas" → cualquier cuenta de X que detectemos (por defecto)
 *   "lista" → solo las que el usuario apuntó en el popup
 *
 * Los handles se guardan sin @ y en minúsculas.
 * Se aceptan con o sin @, da igual mayúsculas.
 *
 * Este archivo no usa Chrome, así se puede probar con node.
 */

function normalizarHandle(valor) {
  if (valor == null) return null;
  const limpio = String(valor)
    .replace(/^@+/, "")
    .trim()
    .toLowerCase();
  return limpio || null;
}

function esHandleValido(valor) {
  const handle = normalizarHandle(valor);
  if (!handle) return false;
  // Letras, números y _. X suele limitar a 15, pero aceptamos 20
  // por si un usuario es un poco más largo (ej. maquinasypilotos).
  return /^[a-z0-9_]{1,20}$/.test(handle);
}

function modoCuentasValido(modo) {
  return modo === "lista" ? "lista" : "todas";
}

function limpiarListaCuentas(lista) {
  const vistos = {};
  const limpia = [];
  if (!lista || !lista.length) return limpia;
  for (let i = 0; i < lista.length; i++) {
    const handle = normalizarHandle(lista[i]);
    if (!handle || !esHandleValido(handle) || vistos[handle]) continue;
    vistos[handle] = true;
    limpia.push(handle);
  }
  return limpia;
}

/**
 * ¿Esta cuenta puede recibir banderas?
 * Si no detectamos handle, no: mejor no poner nada.
 */
function cuentaEstaPermitida(handle, modo, lista) {
  const normalizado = normalizarHandle(handle);
  if (!normalizado) return false;
  if (modoCuentasValido(modo) !== "lista") return true;
  return limpiarListaCuentas(lista).indexOf(normalizado) !== -1;
}

function agregarHandleALista(lista, valor) {
  const actual = limpiarListaCuentas(lista);
  if (!esHandleValido(valor)) {
    return { ok: false, error: "invalido", lista: actual };
  }
  const handle = normalizarHandle(valor);
  if (actual.indexOf(handle) !== -1) {
    return { ok: false, error: "duplicado", lista: actual };
  }
  return { ok: true, handle: handle, lista: actual.concat([handle]) };
}

function quitarHandleDeLista(lista, valor) {
  const handle = normalizarHandle(valor);
  return limpiarListaCuentas(lista).filter(function (item) {
    return item !== handle;
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    normalizarHandle: normalizarHandle,
    esHandleValido: esHandleValido,
    modoCuentasValido: modoCuentasValido,
    limpiarListaCuentas: limpiarListaCuentas,
    cuentaEstaPermitida: cuentaEstaPermitida,
    agregarHandleALista: agregarHandleALista,
    quitarHandleDeLista: quitarHandleDeLista
  };
}
