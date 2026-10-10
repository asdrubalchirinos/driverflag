/**
 * El popup NO lee la URL de la pestaña.
 * En Manifest V3, chrome.tabs.query no incluye tab.url sin el permiso
 * "tabs" o "activeTab". Pedir eso no hace falta: el content script, que
 * solo corre en x.com, escribe el estado en chrome.storage y aquí lo leemos.
 */
const toggle = document.getElementById("toggle");
const estado = document.getElementById("estado");
const detalle = document.getElementById("detalle");

function pintar(datos) {
  toggle.checked = datos.activado !== false;

  if (datos.activado === false) {
    estado.className = "estado apagado";
    estado.textContent = "DriverFlag está apagado.";
    detalle.textContent = "Actívalo con el interruptor de arriba.";
    return;
  }

  if (!datos.paginaX) {
    estado.className = "estado aviso";
    estado.textContent = "Aún no me he conectado a X.";
    detalle.textContent =
      "Si ya estás en x.com: ve a chrome://extensions, pulsa recargar en DriverFlag y luego recarga la pestaña de X.";
    return;
  }

  if (!datos.cuentaDetectada) {
    estado.className = "estado aviso";
    estado.textContent = "Estoy en X, pero no veo la cuenta.";
    detalle.textContent =
      "En x.com: clic derecho → Inspeccionar → Consola. Busca mensajes [DriverFlag]. Si no sale ninguno, recarga la pestaña.";
    return;
  }

  const cuenta = String(datos.cuentaDetectada).replace(/^@/, "");
  const permitida = String(datos.cuentaPermitida || "maquinasypilotos").replace(/^@/, "");
  const coincide = cuenta.toLowerCase() === permitida.toLowerCase();

  if (coincide) {
    estado.className = "estado ok";
    estado.textContent = "Activo para @" + cuenta + ".";
    detalle.textContent = "Al escribir un nombre de piloto se añadirá su bandera.";
    return;
  }

  estado.className = "estado aviso";
  estado.textContent = "Cuenta detectada: @" + cuenta + ".";
  detalle.textContent =
    "Solo actúa con @" + permitida + ". Cambia de cuenta o edita la constante en content.js.";
}

function leerEstado() {
  chrome.storage.local.get(
    {
      activado: true,
      paginaX: false,
      cuentaDetectada: null,
      cuentaPermitida: "maquinasypilotos"
    },
    function (datos) {
      pintar(datos);
    }
  );
}

toggle.addEventListener("change", function () {
  chrome.storage.local.set({ activado: toggle.checked }, function () {
    leerEstado();
  });
});

chrome.storage.onChanged.addListener(function (cambios, area) {
  if (area === "local") leerEstado();
});

leerEstado();
