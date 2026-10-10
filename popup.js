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

  if (!datos.enX) {
    estado.className = "estado aviso";
    estado.textContent = "Abre x.com para detectar la cuenta.";
    detalle.textContent = "Solo funciona en x.com o twitter.com.";
    return;
  }

  if (!datos.cuenta) {
    estado.className = "estado aviso";
    estado.textContent = "No pude detectar la cuenta de X.";
    detalle.textContent =
      "Si no se ve el menú lateral o el perfil, no inserto banderas (por seguridad).";
    return;
  }

  if (datos.coincide) {
    estado.className = "estado ok";
    estado.textContent = "Activo para @" + datos.cuenta + ".";
    detalle.textContent = "Al escribir un nombre de piloto se añadirá su bandera.";
    return;
  }

  estado.className = "estado aviso";
  estado.textContent = "Cuenta detectada: @" + datos.cuenta + ".";
  detalle.textContent =
    "Solo actúa con @" + (datos.permitida || "maquinasypilotos") + ". Cambia de cuenta o edita la constante en content.js.";
}

async function leerEstado() {
  const guardado = await chrome.storage.local.get({
    activado: true,
    cuentaDetectada: null,
    cuentaPermitida: "maquinasypilotos"
  });

  const info = {
    activado: guardado.activado,
    cuenta: guardado.cuentaDetectada,
    permitida: guardado.cuentaPermitida,
    coincide: false,
    enX: false
  };

  const pestañas = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = pestañas[0];
  const url = tab && tab.url ? tab.url : "";
  info.enX = /https:\/\/(x|twitter)\.com\//.test(url);

  if (info.enX && tab.id) {
    try {
      const resp = await chrome.tabs.sendMessage(tab.id, { tipo: "estado" });
      if (resp) {
        info.cuenta = resp.cuenta;
        info.permitida = resp.permitida;
        info.coincide = !!resp.coincide;
        info.activado = resp.activado;
      }
    } catch (e) {
      // El content script aún no está listo (página a medias o no es X).
    }
  }

  if (!info.coincide && info.cuenta && info.permitida) {
    info.coincide =
      String(info.cuenta).replace(/^@/, "").toLowerCase() ===
      String(info.permitida).replace(/^@/, "").toLowerCase();
  }

  pintar(info);
}

toggle.addEventListener("change", function () {
  chrome.storage.local.set({ activado: toggle.checked }, function () {
    leerEstado();
  });
});

leerEstado();
