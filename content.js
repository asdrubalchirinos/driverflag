/**
 * Content script de DriverFlag.
 * Solo corre en x.com / twitter.com (lo dice el manifest).
 *
 * Cuenta permitida
 * ----------------
 * Cambia esta constante si quieres usarlo con otra cuenta:
 */
const CUENTA_PERMITIDA = "maquinasypilotos";

/**
 * Cómo detectamos la cuenta (y sus límites)
 * -----------------------------------------
 * X no nos da el usuario logueado de forma oficial. Lo leemos del DOM:
 *   1) Botón [data-testid="SideNav_AccountSwitcher_Button"]:
 *      avatar UserAvatar-Container-NOMBRE, un @ en aria-label, o el texto.
 *   2) Enlace al perfil: a[data-testid="AppTabBar_Profile_Link"] → href="/nombre"
 *   3) El último avatar de la barra izquierda (header[role="banner"]).
 *
 * Si X cambia esas etiquetas, o la barra no está en pantalla, no sabremos
 * la cuenta y NO insertamos nada. Al cambiar de cuenta, volvemos a mirar.
 *
 * El estado se guarda en chrome.storage para que el popup lo lea sin
 * necesitar el permiso "tabs" (ese permiso haría falta para leer tab.url).
 */

function log() {
  const args = ["[DriverFlag]"];
  for (let i = 0; i < arguments.length; i++) args.push(arguments[i]);
  console.log.apply(console, args);
}

const DICC = construirDiccionarios(PILOTOS);

let activado = true;
let cuentaDetectada = null;
let ocupado = false;
let avisoCuenta = "";
let temporizadorCuenta = null;

function normalizarHandle(valor) {
  if (!valor) return null;
  return String(valor).replace(/^@/, "").trim().toLowerCase();
}

function primerHandleEnTexto(texto) {
  if (!texto) return null;
  const m = String(texto).match(/@([A-Za-z0-9_]+)/);
  return m ? m[1] : null;
}

function handleDesdeHref(href) {
  if (!href) return null;
  const limpio = href.split("?")[0].split("#")[0];
  const m = limpio.match(/^\/([A-Za-z0-9_]+)\/?$/);
  if (!m) return null;
  const reservadas = {
    home: true,
    explore: true,
    search: true,
    settings: true,
    notifications: true,
    messages: true,
    i: true,
    compose: true,
    login: true,
    logout: true,
    tos: true,
    privacy: true
  };
  if (reservadas[m[1].toLowerCase()]) return null;
  return m[1];
}

function handleDesdeAvatar(raiz) {
  const nodos = (raiz || document).querySelectorAll('[data-testid^="UserAvatar-Container-"]');
  for (let i = 0; i < nodos.length; i++) {
    const id = nodos[i].getAttribute("data-testid") || "";
    const nombre = id.replace("UserAvatar-Container-", "");
    if (nombre && nombre !== "unknown" && nombre !== "UserAvatar-Container") {
      return nombre;
    }
  }
  return null;
}

function detectarCuentaActual() {
  const switcher = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
  if (switcher) {
    const porAvatar = handleDesdeAvatar(switcher);
    if (porAvatar) return porAvatar;

    const porLabel = primerHandleEnTexto(switcher.getAttribute("aria-label"));
    if (porLabel) return porLabel;

    const porTexto = primerHandleEnTexto(switcher.textContent);
    if (porTexto) return porTexto;
  }

  const perfil = document.querySelector(
    'a[data-testid="AppTabBar_Profile_Link"], a[aria-label="Profile"], a[aria-label="Perfil"]'
  );
  if (perfil) {
    const desdeHref = handleDesdeHref(perfil.getAttribute("href") || "");
    if (desdeHref) return desdeHref;
  }

  const banner = document.querySelector('header[role="banner"]');
  if (banner) {
    const avatares = banner.querySelectorAll('[data-testid^="UserAvatar-Container-"]');
    if (avatares.length) {
      const ultimo = avatares[avatares.length - 1];
      const nombre = (ultimo.getAttribute("data-testid") || "").replace("UserAvatar-Container-", "");
      if (nombre && nombre !== "unknown") return nombre;
    }
  }

  return null;
}

function guardarEstado() {
  if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) return;
  chrome.storage.local.set({
    paginaX: true,
    cuentaDetectada: cuentaDetectada,
    cuentaPermitida: CUENTA_PERMITIDA,
    activado: activado,
    actualizado: Date.now()
  });
}

function refrescarCuenta() {
  const handle = detectarCuentaActual();
  if (handle === cuentaDetectada) return;

  const anterior = cuentaDetectada;
  cuentaDetectada = handle;
  guardarEstado();
  avisoCuenta = "";

  if (handle) {
    const ok = normalizarHandle(handle) === normalizarHandle(CUENTA_PERMITIDA);
    log("cuenta detectada: @" + handle + (ok ? " (activa)" : " (no es @" + CUENTA_PERMITIDA + ")"));
  } else if (anterior) {
    log("ya no veo la cuenta");
  } else {
    log("aún no veo la cuenta en la página");
  }
}

function esCuentaCorrecta() {
  return normalizarHandle(cuentaDetectada) === normalizarHandle(CUENTA_PERMITIDA);
}

/**
 * Queremos las cajas de post (principal, respuesta, cita, modal),
 * no el compositor de mensajes directos.
 */
function esCajaDePost(el) {
  if (!el || el.nodeType !== 1) return false;
  const caja =
    el.closest('[contenteditable="true"]') ||
    (el.getAttribute && el.getAttribute("contenteditable") === "true" ? el : null);
  if (!caja) return false;
  if (caja.closest('[data-testid="dmComposerTextInput"]')) return false;
  if (caja.closest('[data-testid="dmComposer"]')) return false;

  const testid = caja.getAttribute("data-testid") || "";
  if (testid.indexOf("tweetTextarea") === 0) return true;
  if (caja.closest('[data-testid^="tweetTextarea"]')) return true;
  if (caja.classList.contains("public-DraftEditor-content")) return true;
  if (caja.getAttribute("role") === "textbox") return true;

  const aria = (caja.getAttribute("aria-label") || "") + " " + (caja.getAttribute("placeholder") || "");
  if (/post|reply|tweet|what.?s happening|qu[eé] est[aá] pasando|publicaci[oó]n|responder/i.test(aria)) {
    return true;
  }
  return false;
}

function cajaDesdeEvento(ev) {
  const t = ev.target;
  if (!t) return null;
  const el = t.nodeType === 1 ? t : t.parentElement;
  if (!el) return null;
  if (!esCajaDePost(el)) return null;
  return el.closest('[contenteditable="true"]') || el;
}

function aplicarEnCaja(caja) {
  if (ocupado || !activado) return;

  refrescarCuenta();
  if (!esCuentaCorrecta()) {
    const clave = cuentaDetectada || "(ninguna)";
    if (avisoCuenta !== clave) {
      avisoCuenta = clave;
      log("no inserto: la cuenta no es @" + CUENTA_PERMITIDA + " (detectada: " + clave + ")");
    }
    return;
  }

  const texto = textoAntesDelCursor(caja);
  const decision = analizarTexto(texto, DICC);
  if (!decision) return;

  ocupado = true;
  try {
    if (decision.accion === "mover") {
      borrarUltimaAparicion(caja, " " + decision.bandera);
      ponerCursorAlFinal(caja);
    }
    insertarBanderaTrasNombre(decision.bandera);
    log("inserción: " + decision.accion + " " + decision.bandera);
  } finally {
    ocupado = false;
  }
}

function alEscribir(ev) {
  const caja = cajaDesdeEvento(ev);
  if (!caja) return;
  aplicarEnCaja(caja);
}

function cargarPreferencias() {
  if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) {
    activado = true;
    return;
  }
  chrome.storage.local.get({ activado: true }, function (datos) {
    activado = datos.activado !== false;
    guardarEstado();
  });
  chrome.storage.onChanged.addListener(function (cambios, area) {
    if (area !== "local" || !cambios.activado) return;
    activado = cambios.activado.newValue !== false;
    log(activado ? "activado" : "apagado");
  });
}

function escucharPopup() {
  if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.onMessage) return;
  chrome.runtime.onMessage.addListener(function (mensaje, _sender, responder) {
    if (!mensaje || mensaje.tipo !== "estado") return;
    refrescarCuenta();
    responder({
      paginaX: true,
      cuenta: cuentaDetectada,
      permitida: CUENTA_PERMITIDA,
      coincide: esCuentaCorrecta(),
      activado: activado
    });
  });
}

function vigilarCambiosDeCuenta() {
  refrescarCuenta();
  if (!cuentaDetectada) {
    log("aún no veo la cuenta; seguiré mirando la página");
  }

  function programarChequeo() {
    clearTimeout(temporizadorCuenta);
    temporizadorCuenta = setTimeout(refrescarCuenta, 250);
  }

  const obs = new MutationObserver(programarChequeo);
  if (document.body) {
    obs.observe(document.body, { childList: true, subtree: true, attributes: true });
  }

  // X carga la barra un poco después. Si no encontramos la cuenta al
  // arrancar, este intervalo la pillará cuando aparezca.
  setInterval(refrescarCuenta, 2000);

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) refrescarCuenta();
  });
}

function arrancar() {
  log("arrancó en " + location.href);
  cargarPreferencias();
  guardarEstado();
  escucharPopup();
  vigilarCambiosDeCuenta();
  document.addEventListener("input", alEscribir, true);
}

try {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", arrancar);
  } else {
    arrancar();
  }
} catch (e) {
  log("error al arrancar:", e);
}
