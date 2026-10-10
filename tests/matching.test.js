/**
 * Pruebas de la lógica de nombres (sin navegador).
 * Ejecutar: node tests/matching.test.js
 */
const assert = require("assert");
const { PILOTOS } = require("../pilotos.js");
const { construirDiccionarios, tipear, procesarTexto, normalizar } = require("../matching.js");

const dicc = construirDiccionarios(PILOTOS);

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

console.log("\nDriverFlag – pruebas de coincidencia\n");

igual(tipear("Hamilton ", dicc), "Hamilton 🇬🇧 ", "Hamilton → bandera británica");
igual(tipear("McLaren ", dicc), "McLaren 🧡 ", "McLaren → corazón naranja");
igual(tipear("mclaren ", dicc), "mclaren 🧡 ", "McLaren ignora mayúsculas");
igual(tipear("Lewis Hamilton ", dicc), "Lewis Hamilton 🇬🇧 ", "Lewis Hamilton → una sola bandera después del apellido");
igual(tipear("Carlos ", dicc), "Carlos 🇪🇸 ", "Carlos → España");
igual(tipear("Perez ", dicc), "Perez 🇲🇽 ", "Perez sin acento → México");
igual(tipear("Pérez ", dicc), "Pérez 🇲🇽 ", "Pérez con acento → México");
igual(tipear("Checo ", dicc), "Checo 🇲🇽 ", "Checo → México");
igual(tipear("Checo Pérez ", dicc), "Checo Pérez 🇲🇽 ", "Checo Pérez → una bandera después de Pérez");

const conBandera = tipear("Hamilton ", dicc);
igual(conBandera, "Hamilton 🇬🇧 ", "Hamilton deja el texto con una bandera");
igual(procesarTexto(conBandera, dicc), conBandera, "no duplica si la bandera ya está");
igual(tipear("Hamilton  ", dicc), "Hamilton 🇬🇧  ", "un segundo espacio no añade otra bandera");

igual(tipear("Maximo ", dicc), "Maximo ", "Maximo no coincide con Max");
igual(tipear("max ", dicc), "max 🇳🇱 ", "max en minúsculas sí coincide (insensible a mayúsculas)");

igual(tipear("Daniel ", dicc), "Daniel ", "Daniel solo (extra) no pone bandera");
igual(tipear("Ricciardo ", dicc), "Ricciardo 🇦🇺 ", "Ricciardo (extra) sí, por apellido");
igual(tipear("Daniel Ricciardo ", dicc), "Daniel Ricciardo 🇦🇺 ", "Daniel Ricciardo → bandera solo en el apellido");

igual(tipear("Chili ", dicc), "Chili ", "Chili solo no pone bandera");
igual(tipear("Nano ", dicc), "Nano ", "Nano solo no pone bandera");

igual(tipear("Kimi ", dicc), "Kimi 🇮🇹 ", "Kimi → Antonelli (Italia), no Räikkönen");
igual(tipear("Antonelli ", dicc), "Antonelli 🇮🇹 ", "Antonelli → Italia");
igual(tipear("Kimi Antonelli ", dicc), "Kimi Antonelli 🇮🇹 ", "Kimi Antonelli → una bandera");

igual(tipear("Vettel ", dicc), "Vettel 🇩🇪 ", "Vettel");
igual(tipear("Senna ", dicc), "Senna 🇧🇷 ", "Senna");
igual(tipear("Räikkönen ", dicc), "Räikkönen 🇫🇮 ", "Räikkönen con acentos");
igual(tipear("Raikkonen ", dicc), "Raikkonen 🇫🇮 ", "Raikkonen sin acentos");
igual(tipear("Schumacher ", dicc), "Schumacher 🇩🇪 ", "Schumacher");
igual(tipear("Mick Schumacher ", dicc), "Mick Schumacher 🇩🇪 ", "Mick Schumacher → bandera en el apellido");
igual(tipear("Michael Schumacher ", dicc), "Michael Schumacher 🇩🇪 ", "Michael Schumacher → bandera en el apellido");
igual(tipear("Mick ", dicc), "Mick ", "Mick solo no pone bandera (extra)");
igual(tipear("Michael ", dicc), "Michael ", "Michael solo no pone bandera (extra)");

igual(tipear("Franco ", dicc), "Franco 🇦🇷 ", "Franco → Colapinto");
igual(tipear("Franquito ", dicc), "Franquito 🇦🇷 ", "Franquito");
igual(tipear("Hulk ", dicc), "Hulk 🇩🇪 ", "Hulk");
igual(tipear("Alex ", dicc), "Alex 🇹🇭 ", "Alex → Albon");
igual(tipear("Alexander ", dicc), "Alexander 🇹🇭 ", "Alexander → Albon");
igual(tipear("Alex Albon ", dicc), "Alex Albon 🇹🇭 ", "Alex Albon → una bandera");
igual(tipear("Max ", dicc), "Max 🇳🇱 ", "Max → Verstappen");
igual(tipear("Fernando ", dicc), "Fernando 🇪🇸 ", "Fernando");
igual(tipear("Oliver ", dicc), "Oliver 🇬🇧 ", "Oliver");
igual(tipear("Ollie ", dicc), "Ollie 🇬🇧 ", "Ollie");
igual(tipear("Lewis ", dicc), "Lewis 🇬🇧 ", "Lewis solo también pone bandera (titular)");

igual(tipear("Yuki ", dicc), "Yuki ", "Yuki solo (extra) no pone bandera");
igual(tipear("Tsunoda ", dicc), "Tsunoda 🇯🇵 ", "Tsunoda sí");
igual(tipear("Guanyu ", dicc), "Guanyu ", "Guanyu solo no pone bandera");
igual(tipear("Zhou ", dicc), "Zhou 🇨🇳 ", "Zhou");
igual(tipear("Seb ", dicc), "Seb ", "Seb (alias extra) no pone bandera");
igual(tipear("Iceman ", dicc), "Iceman ", "Iceman no pone bandera");

igual(tipear("Hamilton,", dicc), "Hamilton 🇬🇧,", "coma después del apellido");
igual(tipear("Hamilton.", dicc), "Hamilton 🇬🇧.", "punto después del apellido");
igual(tipear("Hamilton\n", dicc), "Hamilton 🇬🇧\n", "salto de línea después del apellido");

igual(tipear("Hoy Lewis Hamilton gana.", dicc), "Hoy Lewis Hamilton 🇬🇧 gana.", "una frase completa, bandera solo en Hamilton");

igual(normalizar("Pérez"), "perez", "normalizar quita acentos");
igual(normalizar("Hülkenberg"), "hulkenberg", "normalizar ü → u");
igual(normalizar("Räikkönen"), "raikkonen", "normalizar ä/ö");

ok(PILOTOS.filter(function (p) { return !p.extra; }).length === 22, "hay 22 titulares (parrilla 2026)");

console.log("\n" + pasaron + " bien, " + fallaron + " mal\n");
process.exit(fallaron ? 1 : 0);
