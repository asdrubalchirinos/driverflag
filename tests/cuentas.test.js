/**
 * Pruebas del filtro de cuentas (sin navegador).
 * Ejecutar: node tests/cuentas.test.js
 */
const assert = require("assert");
const {
  normalizarHandle,
  esHandleValido,
  modoCuentasValido,
  limpiarListaCuentas,
  cuentaEstaPermitida,
  agregarHandleALista,
  quitarHandleDeLista
} = require("../cuentas.js");

let pasaron = 0;
let fallaron = 0;

function ok(condicion, titulo) {
  try {
    assert.ok(condicion, titulo);
    pasaron += 1;
    console.log("  OK   " + titulo);
  } catch (e) {
    fallaron += 1;
    console.log("  FALLO " + titulo);
    console.log("        " + e.message);
  }
}

function igual(obtenido, esperado, titulo) {
  try {
    assert.strictEqual(obtenido, esperado, titulo + "\n        esperado: " + JSON.stringify(esperado) + "\n        obtenido: " + JSON.stringify(obtenido));
    pasaron += 1;
    console.log("  OK   " + titulo);
  } catch (e) {
    fallaron += 1;
    console.log("  FALLO " + titulo);
    console.log("        " + e.message);
  }
}

function iguales(obtenido, esperado, titulo) {
  try {
    assert.deepStrictEqual(obtenido, esperado, titulo);
    pasaron += 1;
    console.log("  OK   " + titulo);
  } catch (e) {
    fallaron += 1;
    console.log("  FALLO " + titulo);
    console.log("        " + e.message);
  }
}

console.log("\nDriverFlag – pruebas de cuentas\n");

igual(normalizarHandle("@MaquinasYPilotos"), "maquinasypilotos", "quita @ y pasa a minúsculas");
igual(normalizarHandle("  Foo_Bar  "), "foo_bar", "quita espacios");
igual(normalizarHandle("@@dos"), "dos", "quita más de una @");
igual(normalizarHandle(null), null, "null → null");
igual(normalizarHandle(""), null, "vacío → null");
igual(normalizarHandle("@"), null, "solo @ → null");

ok(esHandleValido("maquinasypilotos"), "handle normal es válido");
ok(esHandleValido("@MaquinasYPilotos"), "con @ y mayúsculas también");
ok(esHandleValido("a"), "un carácter vale");
ok(esHandleValido("abcdefghijklmno"), "15 caracteres valen");
ok(esHandleValido("maquinasypilotos"), "16 caracteres también (cuenta del dueño)");
ok(!esHandleValido("abcdefghijklmnopqrsuv"), "más de 20 no valen");
ok(!esHandleValido("bad-handle"), "guion no vale");
ok(!esHandleValido("has space"), "espacio no vale");
ok(!esHandleValido(""), "vacío no vale");
ok(!esHandleValido("áéí"), "acentos no valen");

igual(modoCuentasValido("lista"), "lista", "modo lista se respeta");
igual(modoCuentasValido("todas"), "todas", "modo todas se respeta");
igual(modoCuentasValido(undefined), "todas", "sin modo → todas");
igual(modoCuentasValido("otra"), "todas", "modo raro → todas");

iguales(limpiarListaCuentas(["@Foo", "foo", "Bar", "bad-x", ""]), ["foo", "bar"], "limpia, minúsculas y sin duplicados");
iguales(limpiarListaCuentas(null), [], "lista null → vacía");

ok(cuentaEstaPermitida("maquinasypilotos", "todas", []), "todas: cualquier cuenta detectada vale");
ok(cuentaEstaPermitida("otra", "todas", ["maquinasypilotos"]), "todas: ignora la lista");
ok(!cuentaEstaPermitida(null, "todas", []), "todas: sin cuenta no vale");
ok(!cuentaEstaPermitida("", "todas", []), "todas: vacío no vale");

ok(cuentaEstaPermitida("maquinasypilotos", "lista", ["maquinasypilotos"]), "lista: coincide exacto");
ok(cuentaEstaPermitida("@MaquinasYPilotos", "lista", ["maquinasypilotos"]), "lista: @ y mayúsculas da igual");
ok(cuentaEstaPermitida("Foo", "lista", ["@foo", "Bar"]), "lista: está entre varias");
ok(!cuentaEstaPermitida("otra", "lista", ["maquinasypilotos"]), "lista: otra cuenta no");
ok(!cuentaEstaPermitida("maquinasypilotos", "lista", []), "lista vacía: nadie pasa");
ok(!cuentaEstaPermitida(null, "lista", ["maquinasypilotos"]), "lista: sin cuenta no");

const agregado = agregarHandleALista([], "@Foo");
ok(agregado.ok, "agregar @Foo funciona");
iguales(agregado.lista, ["foo"], "agregar guarda sin @ y en minúsculas");

const duplicado = agregarHandleALista(["foo"], "Foo");
igual(duplicado.error, "duplicado", "no agrega duplicado");
iguales(duplicado.lista, ["foo"], "duplicado no cambia la lista");

const invalido = agregarHandleALista([], "nope!");
igual(invalido.error, "invalido", "rechaza handle raro");
iguales(invalido.lista, [], "inválido no cambia la lista");

iguales(quitarHandleDeLista(["foo", "bar"], "@Foo"), ["bar"], "quitar respeta @ y mayúsculas");
iguales(quitarHandleDeLista(["foo"], "noesta"), ["foo"], "quitar algo que no está deja la lista");

console.log("\n" + pasaron + " bien, " + fallaron + " mal\n");
process.exit(fallaron ? 1 : 0);
