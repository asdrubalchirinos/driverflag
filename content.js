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
 *   1) Botón del conmutador de cuentas (barra lateral):
 *      [data-testid="SideNav_AccountSwitcher_Button"]
 *      y dentro, [data-testid="UserAvatar-Container-NOMBRE"]
 *      o el @ que aparece en aria-label.
 *   2) Enlace al perfil en la barra inferior / lateral:
 *      a[data-testid="AppTabBar_Profile_Link"] → href="/nombre"
 *
 * Si X cambia esas etiquetas, o la barra no está en pantalla (ventana muy
 * estrecha, layout distinto), no sabremos la cuenta y NO insertamos nada.
 * Al cambiar de cuenta en X, volvemos a mirar el DOM.
 */

const DICC = construirDiccionarios(PILOTOS);

let activado = true;
let cuentaDetectada = null;
let ocupado = false;
let ultimoChequeoCuenta = 0;

function normalizarHandle(valor) {
  if (!valor) return null;
  return String(valor).replace(/^@/, "").trim().toLowerCase();
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

function detectarCuentaActual() {
  const switcher = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
  if (switcher) {
    const avatar = switcher.querySelector('[data-testid^="UserAvatar-Container-"]');
    if (avatar) {
      const id = (avatar.getAttribute("data-testid") || "").replace("UserAvatar-Container-", "");
      if (id) return id;
    }
    const label = switcher.getAttribute("aria-label") || "";
    const m = label.match(/@([A-Za-z0-9_]+)/);
    if (m) return m[1];
  }

  const perfil = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
  if (perfil) {
    const desdeHref = handleDesdeHref(perfil.getAttribute("href") || "");
    if (desdeHref) return desdeHref;
  }

  return null;
}

function guardarEstadoCuenta(handle) {
  cuentaDetectada = handle;
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({
      cuentaDetectada: handle,
      cuentaPermitida: CUENTA_PERMITIDA
    });
  }
}

function refrescarCuenta(forzar) {
  const ahora = Date.now();
  if (!forzar && ahora - ultimoChequeoCuenta < 400) return;
  ultimoChequeoCuenta = ahora;
  const handle = detectarCuentaActual();
  if (forzar || handle !== cuentaDetectada) {
    guardarEstadoCuenta(handle);
  }
}

function esCuentaCorrecta() {
  refrescarCuenta(false);
  return normalizarHandle(cuentaDetectada) === normalizarHandle(CUENTA_PERMITIDA);
}

/**
 * Queremos las cajas de post (principal, respuesta, cita, modal),
 * no el compositor de mensajes directos.
 */
function esCajaDePost(el) {
  if (!el || el.nodeType !== 1) return false;
  const caja = el.closest('[contenteditable="true"]') || (el.getAttribute && el.getAttribute("contenteditable") === "true" ? el : null);
  if (!caja) return false;
  if (caja.closest('[data-testid="dmComposerTextInput"]')) return false;
  if (caja.closest('[data-testid="dmComposer"]')) return false;

  const testid = caja.getAttribute("data-testid") || "";
  if (testid.indexOf("tweetTextarea") === 0) return true;
  if (caja.closest('[data-testid^="tweetTextarea"]')) return true;

  if (caja.classList.contains("public-DraftEditor-content")) return true;

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
  if (!esCuentaCorrecta()) return;

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
  });
  chrome.storage.onChanged.addListener(function (cambios, area) {
    if (area !== "local") return;
    if (cambios.activado) {
      activado = cambios.activado.newValue !== false;
    }
  });
}

function escucharPopup() {
  if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.onMessage) return;
  chrome.runtime.onMessage.addListener(function (mensaje, _sender, responder) {
    if (!mensaje || mensaje.tipo !== "estado") return;
    refrescarCuenta(true);
    responder({
      cuenta: cuentaDetectada,
      permitida: CUENTA_PERMITIDA,
      coincide: esCuentaCorrecta(),
      activado: activado
    });
  });
}

function vigilarCambiosDeCuenta() {
  refrescarCuenta(true);

  const obs = new MutationObserver(function () {
    refrescarCuenta(false);
  });
  if (document.body) {
    obs.observe(document.body, { childList: true, subtree: true, attributes: true });
  }

  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) refrescarCuenta(true);
  });
}

function arrancar() {
  cargarPreferencias();
  escucharPopup();
  vigilarCambiosDeCuenta();
  document.addEventListener("input", alEscribir, true);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", arrancar);
} else {
  arrancar();
}
