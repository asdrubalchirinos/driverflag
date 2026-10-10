/**
 * Lógica de coincidencia de nombres de pilotos.
 *
 * Idea general (para no perderse):
 * 1. El usuario termina una palabra (espacio, coma, punto, etc.).
 * 2. Miramos SOLO esa última palabra.
 * 3. Si es un nombre / apellido / alias conocido, pedimos insertar la bandera
 *    justo después (con un espacio: "Hamilton 🇬🇧 ").
 * 4. Si acaba de escribir el apellido y la palabra anterior era el nombre
 *    de ese mismo piloto (y ya tenía bandera), movemos la bandera al apellido
 *    para que no queden dos: "Lewis 🇬🇧 Hamilton " → "Lewis Hamilton 🇬🇧 ".
 *
 * Todo es insensible a mayúsculas y a acentos: Perez = Pérez = PÉREZ.
 * Solo coinciden palabras completas: "Maximo" no es "Max".
 */

// Apodos que SÍ están en la lista pero no deben activar bandera si van solos.
const ALIAS_AMBIGUOS = new Set(["chili", "nano"]);

// Primera palabra de un alias compuesto que no queremos tratar como nombre.
const ALIAS_NOMBRE_IGNORAR = new Set(["mad", "magic", "danny"]);

function normalizar(texto) {
  return String(texto)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function esLetra(ch) {
  return /\p{L}/u.test(ch);
}

function esDelimitador(ch) {
  if (!ch) return false;
  if (/\s/.test(ch)) return true;
  return /[.,;:!?…¿¡)\]"'»]/.test(ch);
}

function esBanderaEmoji(texto) {
  const chars = Array.from(texto);
  if (chars.length !== 2) return false;
  return chars.every(function (c) {
    const cp = c.codePointAt(0);
    return cp >= 0x1f1e6 && cp <= 0x1f1ff;
  });
}

function registrar(mapa, clave, piloto) {
  const n = normalizar(clave);
  if (!n) return;
  const anterior = mapa.get(n);
  if (anterior && anterior !== piloto && anterior.bandera !== piloto.bandera) {
    // Dos pilotos distintos con la misma clave y distinta bandera:
    // no registramos para no poner la bandera equivocada.
    mapa.delete(n);
    return;
  }
  mapa.set(n, piloto);
}

/**
 * Prepara tres diccionarios a partir de la lista de pilotos:
 *   porApellido  → Hamilton, Pérez, Ricciardo, ...
 *   porNombre    → Lewis, Carlos, Checo, Kimi (Antonelli), ...
 *   nombresDe    → para saber si la palabra anterior es el nombre de ESTE piloto
 */
function construirDiccionarios(pilotos) {
  const porApellido = new Map();
  const porNombre = new Map();
  const nombresDe = new Map();

  pilotos.forEach(function (piloto, indice) {
    const id = String(indice);
    const nombres = new Set();

    piloto.nombre.split(/\s+/).forEach(function (parte) {
      nombres.add(normalizar(parte));
    });
    nombres.add(normalizar(piloto.nombre));
    nombres.add(normalizar(piloto.apellido));
    (piloto.alias || []).forEach(function (alias) {
      nombres.add(normalizar(alias));
      alias.split(/\s+/).forEach(function (parte) {
        nombres.add(normalizar(parte));
      });
    });
    nombresDe.set(id, nombres);
    piloto._id = id;

    registrar(porApellido, piloto.apellido, piloto);

    (piloto.alias || []).forEach(function (alias) {
      if (normalizar(alias) === normalizar(piloto.apellido)) {
        registrar(porApellido, alias, piloto);
      }
    });

    if (piloto.extra) {
      // Reservas / leyendas: solo apellido o nombre+apellido.
      // No registramos su nombre de pila ni apodos sueltos (Seb, Iceman, ...).
      return;
    }

    const partesNombre = piloto.nombre.trim().split(/\s+/);
    if (partesNombre.length === 1) {
      registrar(porNombre, partesNombre[0], piloto);
    } else {
      // Nombre compuesto (Andrea Kimi): solo la última parte.
      // Así "Kimi" → Antonelli 🇮🇹 y "Andrea" no pone bandera.
      registrar(porNombre, partesNombre[partesNombre.length - 1], piloto);
    }

    (piloto.alias || []).forEach(function (alias) {
      const n = normalizar(alias);
      if (ALIAS_AMBIGUOS.has(n)) return;

      const partes = alias.trim().split(/\s+/);
      if (partes.length === 1) {
        registrar(porNombre, alias, piloto);
        return;
      }

      const ultima = normalizar(partes[partes.length - 1]);
      const primera = normalizar(partes[0]);
      if (ultima === normalizar(piloto.apellido) && !ALIAS_NOMBRE_IGNORAR.has(primera)) {
        registrar(porNombre, partes[0], piloto);
      }
    });
  });

  return { porApellido: porApellido, porNombre: porNombre, nombresDe: nombresDe };
}

function esNombreDelMismoPiloto(palabra, piloto, dicc) {
  if (!palabra || !piloto) return false;
  const conjunto = dicc.nombresDe.get(piloto._id);
  if (!conjunto) return false;
  return conjunto.has(normalizar(palabra));
}

/**
 * Recorre el texto hacia atrás (saltando espacios y una bandera opcional)
 * y devuelve la palabra anterior.
 */
function palabraAnterior(texto) {
  let i = texto.length - 1;
  while (i >= 0 && /\s/.test(texto[i])) i--;
  if (i < 0) return { palabra: "", teniaBandera: false };

  // ¿Hay una bandera justo antes?
  const posible = Array.from(texto.slice(0, i + 1)).slice(-2).join("");
  let teniaBandera = false;
  if (esBanderaEmoji(posible)) {
    teniaBandera = true;
    i -= posible.length;
    while (i >= 0 && /\s/.test(texto[i])) i--;
  }

  const fin = i;
  while (i >= 0 && esLetra(texto[i])) i--;
  return {
    palabra: texto.slice(i + 1, fin + 1),
    teniaBandera: teniaBandera
  };
}

/**
 * Si el texto termina en un delimitador, extrae la palabra que acaba de terminar.
 */
function ultimaPalabraTerminada(texto) {
  if (!texto || !esDelimitador(texto[texto.length - 1])) return null;

  let i = texto.length - 2;
  while (i >= 0 && esDelimitador(texto[i]) && !/\s/.test(texto[i])) {
    // Varios signos seguidos (ej. "!!") no son una palabra.
    i--;
  }
  const finDelim = texto.length - 1;
  // Solo usamos el último delimitador; la palabra está justo antes.
  i = finDelim - 1;
  if (i < 0 || !esLetra(texto[i])) return null;

  const finPalabra = i;
  while (i >= 0 && esLetra(texto[i])) i--;
  const palabra = texto.slice(i + 1, finPalabra + 1);
  return {
    palabra: palabra,
    antes: texto.slice(0, i + 1)
  };
}

/**
 * Decide qué hacer con el texto a la izquierda del cursor.
 *
 * Devuelve:
 *   null
 *   { accion: "insertar", bandera }
 *   { accion: "mover", bandera }  → quitar la bandera del nombre y ponerla en el apellido
 */
function analizarTexto(texto, dicc) {
  const trozo = ultimaPalabraTerminada(texto);
  if (!trozo) return null;

  const palabra = trozo.palabra;
  if (!palabra || esBanderaEmoji(palabra)) return null;

  const clave = normalizar(palabra);
  const pilotoApellido = dicc.porApellido.get(clave);
  if (pilotoApellido) {
    const prev = palabraAnterior(trozo.antes);
    const mismo = esNombreDelMismoPiloto(prev.palabra, pilotoApellido, dicc);
    if (mismo && prev.teniaBandera) {
      return { accion: "mover", bandera: pilotoApellido.bandera };
    }
    return { accion: "insertar", bandera: pilotoApellido.bandera };
  }

  const pilotoNombre = dicc.porNombre.get(clave);
  if (pilotoNombre) {
    return { accion: "insertar", bandera: pilotoNombre.bandera };
  }

  return null;
}

function quitarBanderaDelNombreAnterior(cuerpo, bandera) {
  const marca = " " + bandera;
  const partes = cuerpo.match(/^(.*?)(\s+)(\S+)$/u);
  if (!partes) {
    return cuerpo.endsWith(marca) ? cuerpo.slice(0, -marca.length) : cuerpo;
  }
  let antes = partes[1];
  const ultima = partes[3];
  if (antes.endsWith(marca)) {
    antes = antes.slice(0, -marca.length);
  } else if (antes.endsWith(bandera)) {
    antes = antes.slice(0, -bandera.length).replace(/\s+$/u, "");
  }
  const juntas = (antes + " " + ultima).replace(/[ \t]+/g, " ");
  return juntas.replace(/\s+$/u, "");
}

/**
 * Aplica la decisión sobre un texto plano (para las pruebas).
 * El content script hace lo mismo, pero dentro del contenteditable de X.
 */
function aplicarDecision(texto, decision) {
  if (!decision) return texto;
  const delim = texto[texto.length - 1];
  const cuerpo = texto.slice(0, -1);

  if (decision.accion === "insertar") {
    return cuerpo + " " + decision.bandera + delim;
  }
  if (decision.accion === "mover") {
    const sinBandera = quitarBanderaDelNombreAnterior(cuerpo, decision.bandera);
    return sinBandera + " " + decision.bandera + delim;
  }
  return texto;
}

function procesarTexto(texto, dicc) {
  return aplicarDecision(texto, analizarTexto(texto, dicc));
}

/**
 * Simula escribir carácter a carácter, aplicando la lógica cada vez
 * que se termina una palabra. Así se prueba "Lewis Hamilton".
 */
function tipear(entrada, dicc) {
  let texto = "";
  for (const ch of entrada) {
    texto += ch;
    const decision = analizarTexto(texto, dicc);
    if (decision) texto = aplicarDecision(texto, decision);
  }
  return texto;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    normalizar: normalizar,
    esDelimitador: esDelimitador,
    esBanderaEmoji: esBanderaEmoji,
    construirDiccionarios: construirDiccionarios,
    analizarTexto: analizarTexto,
    aplicarDecision: aplicarDecision,
    procesarTexto: procesarTexto,
    tipear: tipear
  };
}
