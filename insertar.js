/**
 * Inserción de texto en un contenteditable (como el de X).
 *
 * X usa un editor tipo Draft.js. Si cambiamos innerHTML a mano, el contador
 * de caracteres, el cursor y el botón Publicar se rompen. Por eso insertamos
 * como si el usuario hubiera tecleado: document.execCommand("insertText").
 * Ctrl/Z nativo debería deshacer esa inserción.
 */

function insertarTextoComoUsuario(texto) {
  try {
    return document.execCommand("insertText", false, texto);
  } catch (e) {
    return false;
  }
}

function moverSeleccion(direccion, unidad) {
  const sel = window.getSelection();
  if (sel && typeof sel.modify === "function") {
    sel.modify("move", direccion, unidad);
    return true;
  }
  return false;
}

function ponerCursorAlFinal(root) {
  root.focus();
  const sel = window.getSelection();
  if (!sel) return;
  const rango = document.createRange();
  rango.selectNodeContents(root);
  rango.collapse(false);
  sel.removeAllRanges();
  sel.addRange(rango);
}

/**
 * Texto desde el inicio de la caja hasta el cursor.
 * Usamos Range.toString() para respetar los bloques del editor.
 */
function textoAntesDelCursor(root) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return "";
  const fin = sel.getRangeAt(0);
  const rango = document.createRange();
  rango.selectNodeContents(root);
  rango.setEnd(fin.endContainer, fin.endOffset);
  return rango.toString();
}

function nodosDeTexto(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const lista = [];
  let nodo;
  while ((nodo = walker.nextNode())) {
    lista.push(nodo);
  }
  return lista;
}

/**
 * Selecciona la última aparición de `busqueda` dentro de `root` y la borra
 * con execCommand("delete"), para que entre en el historial de deshacer.
 */
function borrarUltimaAparicion(root, busqueda) {
  const nodos = nodosDeTexto(root);
  if (!nodos.length) return false;

  let texto = "";
  const piezas = [];
  nodos.forEach(function (nodo) {
    piezas.push({ nodo: nodo, inicio: texto.length, fin: texto.length + nodo.nodeValue.length });
    texto += nodo.nodeValue;
  });

  const idx = texto.lastIndexOf(busqueda);
  if (idx === -1) return false;

  const finIdx = idx + busqueda.length;
  let inicioNodo = null;
  let inicioOff = 0;
  let finNodo = null;
  let finOff = 0;

  piezas.forEach(function (p) {
    if (!inicioNodo && p.fin > idx) {
      inicioNodo = p.nodo;
      inicioOff = idx - p.inicio;
    }
    if (!finNodo && p.fin >= finIdx) {
      finNodo = p.nodo;
      finOff = finIdx - p.inicio;
    }
  });

  if (!inicioNodo || !finNodo) return false;

  const sel = window.getSelection();
  const rango = document.createRange();
  rango.setStart(inicioNodo, inicioOff);
  rango.setEnd(finNodo, finOff);
  sel.removeAllRanges();
  sel.addRange(rango);

  try {
    return document.execCommand("delete", false, undefined);
  } catch (e) {
    return false;
  }
}

/**
 * Inserta " 🇬🇧" justo después del nombre y deja el cursor detrás
 * del delimitador que el usuario acaba de teclear (espacio, coma, ...).
 */
function insertarBanderaTrasNombre(bandera) {
  moverSeleccion("backward", "character");
  const ok = insertarTextoComoUsuario(" " + bandera);
  moverSeleccion("forward", "character");
  return ok;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    insertarTextoComoUsuario: insertarTextoComoUsuario,
    textoAntesDelCursor: textoAntesDelCursor,
    borrarUltimaAparicion: borrarUltimaAparicion,
    insertarBanderaTrasNombre: insertarBanderaTrasNombre,
    ponerCursorAlFinal: ponerCursorAlFinal
  };
}
