/**
 * Content script de DriverFlag.
 * Solo corre en x.com / twitter.com (lo dice el manifest).
 *
 * Cuenta permitida
 * ----------------
 * Cambia esta constante si quieres usarlo con otra cuenta:
 */
const CUENTA_PERMITIDA = "maquinaspilotos";
const VERSION = "1.0.3";

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

function extensionViva() {
  try {
    return typeof chrome !== "undefined" && !!(chrome.runtime && chrome.runtime.id);
  } catch (e) {
    return false;
  }
}

// Hay que LEER lastError en el callback. Si no, Chrome escribe
// "content.js:87 (anonymous function)" en la tarjeta de errores.
function hayErrorChrome() {
  try {
    return !!(chrome.runtime && chrome.runtime.lastError);
  } catch (e) {
    return true;
  }
}

function seguro(fn) {
  return function () {
    try {
      return fn.apply(null, arguments);
    } catch (e) {
      log("error:", e && e.message ? e.message : e);
      return undefined;
    }
  };
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
  try {
    const switcher = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
    if (switcher) {
      const porAvatar = handleDesdeAvatar(switcher);
      if (porAvatar) return porAvatar;

      const porLabel = primerHandleEnTexto(switcher.getAttribute("aria-label"));
      if (porLabel) return porLabel;

      // No leemos switcher.textContent entero: X reescribe el DOM y a veces
      // eso lanza un error (Chrome lo muestra como content.js:87).
      const spans = switcher.querySelectorAll("span, a");
      for (let i = 0; i < spans.length; i++) {
        const porSpan = primerHandleEnTexto(spans[i].getAttribute("aria-label") || "");
        if (porSpan) return porSpan;
      }
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
  } catch (e) {
    log("error al leer la cuenta:", e && e.message ? e.message : e);
  }

  return null;
}

function guardarEstado() {
  if (!extensionViva() || !chrome.storage || !chrome.storage.local) return;
  try {
    chrome.storage.local.set(
      {
        paginaX: true,
        cuentaDetectada: cuentaDetectada,
        cuentaPermitida: CUENTA_PERMITIDA,
        activado: activado,
        version: VERSION,
        actualizado: Date.now()
      },
      function () {
        hayErrorChrome();
      }
    );
  } catch (e) {
    log("no pude guardar el estado:", e && e.message ? e.message : e);
  }
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
  if (!extensionViva() || !chrome.storage || !chrome.storage.local) {
    activado = true;
    return;
  }
  try {
    chrome.storage.local.get({ activado: true }, function (datos) {
      if (hayErrorChrome() || !extensionViva()) return;
      activado = !datos || datos.activado !== false;
      guardarEstado();
    });
    chrome.storage.onChanged.addListener(function (cambios, area) {
      if (!extensionViva() || area !== "local" || !cambios.activado) return;
      activado = cambios.activado.newValue !== false;
      log(activado ? "activado" : "apagado");
    });
  } catch (e) {
    log("error al leer preferencias:", e && e.message ? e.message : e);
  }
}

function escucharPopup() {
  if (!extensionViva() || !chrome.runtime.onMessage) return;
  try {
    chrome.runtime.onMessage.addListener(function (mensaje, _sender, responder) {
      if (!mensaje || mensaje.tipo !== "estado") return;
      refrescarCuenta();
      try {
        responder({
          paginaX: true,
          cuenta: cuentaDetectada,
          permitida: CUENTA_PERMITIDA,
          coincide: esCuentaCorrecta(),
          activado: activado
        });
      } catch (e) {
        // El popup se cerró antes de recibir la respuesta.
      }
    });
  } catch (e) {
    log("error al escuchar el popup:", e && e.message ? e.message : e);
  }
}

function vigilarCambiosDeCuenta() {
  const chequear = seguro(refrescarCuenta);
  let obs = null;
  let intervalo = null;

  function pararSiMurio() {
    if (extensionViva()) return false;
    if (obs) obs.disconnect();
    if (intervalo) clearInterval(intervalo);
    clearTimeout(temporizadorCuenta);
    return true;
  }

  chequear();
  if (!cuentaDetectada) {
    log("aún no veo la cuenta; seguiré mirando la página");
  }

  function programarChequeo() {
    if (pararSiMurio()) return;
    clearTimeout(temporizadorCuenta);
    temporizadorCuenta = setTimeout(chequear, 250);
  }

  obs = new MutationObserver(seguro(programarChequeo));
  if (document.body) {
    obs.observe(document.body, { childList: true, subtree: true });
  }

  // X carga la barra un poco después. Si no encontramos la cuenta al
  // arrancar, este intervalo la pillará cuando aparezca.
  intervalo = setInterval(function () {
    if (pararSiMurio()) return;
    chequear();
  }, 2000);

  document.addEventListener(
    "visibilitychange",
    seguro(function () {
      if (!document.hidden && !pararSiMurio()) chequear();
    })
  );
}

function arrancar() {
  log("v" + VERSION + " arrancó en " + location.href);
  cargarPreferencias();
  guardarEstado();
  escucharPopup();
  vigilarCambiosDeCuenta();
  document.addEventListener("input", seguro(alEscribir), true);
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
