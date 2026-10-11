/**
 * El popup NO lee la URL de la pestaña.
 * En Manifest V3, chrome.tabs.query no incluye tab.url sin el permiso
 * "tabs" o "activeTab". Pedir eso no hace falta: el content script, que
 * solo corre en x.com, escribe el estado en chrome.storage.local y aquí
 * lo leemos. Los ajustes de cuentas van en chrome.storage.sync.
 */
const toggle = document.getElementById("toggle");
const estado = document.getElementById("estado");
const detalle = document.getElementById("detalle");
const modoTodas = document.getElementById("modo-todas");
const modoLista = document.getElementById("modo-lista");
const bloqueLista = document.getElementById("bloque-lista");
const listaEl = document.getElementById("lista-cuentas");
const listaVacia = document.getElementById("lista-vacia");
const inputHandle = document.getElementById("nuevo-handle");
const btnAgregar = document.getElementById("btn-agregar");
const btnCuentaActual = document.getElementById("btn-cuenta-actual");
const errorHandle = document.getElementById("error-handle");

let pagina = {
  activado: true,
  paginaX: false,
  cuentaDetectada: null
};

let ajustes = {
  modoCuentas: "todas",
  cuentasPermitidas: []
};

function mostrarError(texto) {
  if (!texto) {
    errorHandle.hidden = true;
    errorHandle.textContent = "";
    return;
  }
  errorHandle.hidden = false;
  errorHandle.textContent = texto;
}

function pintarLista() {
  const lista = ajustes.cuentasPermitidas;
  listaEl.innerHTML = "";
  listaVacia.hidden = lista.length > 0;

  lista.forEach(function (handle) {
    const li = document.createElement("li");
    const nombre = document.createElement("span");
    nombre.className = "handle";
    nombre.textContent = "@" + handle;

    const quitar = document.createElement("button");
    quitar.type = "button";
    quitar.className = "quitar";
    quitar.textContent = "Quitar";
    quitar.setAttribute("data-handle", handle);

    li.appendChild(nombre);
    li.appendChild(quitar);
    listaEl.appendChild(li);
  });
}

function pintarAjustes() {
  const modo = modoCuentasValido(ajustes.modoCuentas);
  modoTodas.checked = modo !== "lista";
  modoLista.checked = modo === "lista";
  bloqueLista.hidden = modo !== "lista";
  pintarLista();

  const actual = normalizarHandle(pagina.cuentaDetectada);
  if (!actual) {
    btnCuentaActual.disabled = true;
    btnCuentaActual.title = "No veo la cuenta de X. Recarga x.com si ya estás dentro.";
  } else if (ajustes.cuentasPermitidas.indexOf(actual) !== -1) {
    btnCuentaActual.disabled = true;
    btnCuentaActual.title = "@" + actual + " ya está en la lista.";
  } else {
    btnCuentaActual.disabled = false;
    btnCuentaActual.title = "Añade @" + actual;
  }
}

function pintarEstado() {
  toggle.checked = pagina.activado !== false;

  if (pagina.activado === false) {
    estado.className = "estado apagado";
    estado.textContent = "DriverFlag está apagado.";
    detalle.textContent = "Actívalo con el interruptor de arriba.";
    return;
  }

  if (!pagina.paginaX) {
    estado.className = "estado aviso";
    estado.textContent = "Aún no me he conectado a X.";
    detalle.textContent =
      "Si ya estás en x.com: ve a chrome://extensions, pulsa recargar en DriverFlag y luego recarga la pestaña de X.";
    return;
  }

  if (!pagina.cuentaDetectada) {
    estado.className = "estado aviso";
    estado.textContent = "Estoy en X, pero no veo la cuenta.";
    detalle.textContent =
      "En x.com: clic derecho → Inspeccionar → Consola. Busca mensajes [DriverFlag]. Si no sale ninguno, recarga la pestaña.";
    return;
  }

  const cuenta = normalizarHandle(pagina.cuentaDetectada) || String(pagina.cuentaDetectada).replace(/^@/, "");
  const activa = cuentaEstaPermitida(cuenta, ajustes.modoCuentas, ajustes.cuentasPermitidas);

  if (activa) {
    estado.className = "estado ok";
    estado.textContent = "Activo para @" + cuenta + ".";
    detalle.textContent = "Al escribir un nombre de piloto se añadirá su bandera.";
    return;
  }

  estado.className = "estado aviso";
  estado.textContent = "Cuenta detectada: @" + cuenta + ".";
  if (modoCuentasValido(ajustes.modoCuentas) === "lista") {
    if (!ajustes.cuentasPermitidas.length) {
      detalle.textContent = "Elegiste “Solo estas cuentas” y la lista está vacía, así que no pondré banderas.";
    } else {
      detalle.textContent = "No está en tu lista, no pondré banderas. Puedes añadirla abajo.";
    }
    return;
  }

  detalle.textContent = "Esta cuenta no está permitida.";
}

function pintar() {
  pintarAjustes();
  pintarEstado();
}

function guardarAjustes() {
  chrome.storage.sync.set(
    {
      modoCuentas: modoCuentasValido(ajustes.modoCuentas),
      cuentasPermitidas: limpiarListaCuentas(ajustes.cuentasPermitidas)
    },
    function () {
      if (chrome.runtime.lastError) return;
      pintar();
    }
  );
}

function agregarHandle(valor) {
  const resultado = agregarHandleALista(ajustes.cuentasPermitidas, valor);
  if (!resultado.ok) {
    if (resultado.error === "duplicado") {
      mostrarError("Esa cuenta ya está en la lista.");
    } else {
      mostrarError("Eso no parece un usuario de X. Usa letras, números o _.");
    }
    return;
  }
  mostrarError("");
  ajustes.cuentasPermitidas = resultado.lista;
  inputHandle.value = "";
  guardarAjustes();
}

function leerEstado() {
  chrome.storage.local.get(
    {
      activado: true,
      paginaX: false,
      cuentaDetectada: null
    },
    function (datos) {
      if (chrome.runtime.lastError) return;
      pagina.activado = !datos || datos.activado !== false;
      pagina.paginaX = !!(datos && datos.paginaX);
      pagina.cuentaDetectada = datos && datos.cuentaDetectada ? datos.cuentaDetectada : null;
      pintar();
    }
  );
}

function leerAjustes() {
  chrome.storage.sync.get({ modoCuentas: "todas", cuentasPermitidas: [] }, function (datos) {
    if (chrome.runtime.lastError) return;
    ajustes.modoCuentas = modoCuentasValido(datos && datos.modoCuentas);
    ajustes.cuentasPermitidas = limpiarListaCuentas(datos && datos.cuentasPermitidas);
    pintar();
  });
}

toggle.addEventListener("change", function () {
  chrome.storage.local.set({ activado: toggle.checked }, function () {
    if (chrome.runtime.lastError) return;
    pagina.activado = toggle.checked;
    pintar();
  });
});

modoTodas.addEventListener("change", function () {
  if (!modoTodas.checked) return;
  ajustes.modoCuentas = "todas";
  mostrarError("");
  guardarAjustes();
});

modoLista.addEventListener("change", function () {
  if (!modoLista.checked) return;
  ajustes.modoCuentas = "lista";
  guardarAjustes();
});

btnAgregar.addEventListener("click", function () {
  agregarHandle(inputHandle.value);
});

inputHandle.addEventListener("keydown", function (ev) {
  if (ev.key === "Enter") {
    ev.preventDefault();
    agregarHandle(inputHandle.value);
  }
});

inputHandle.addEventListener("input", function () {
  if (errorHandle.hidden) return;
  mostrarError("");
});

listaEl.addEventListener("click", function (ev) {
  const boton = ev.target.closest("button.quitar");
  if (!boton) return;
  ajustes.cuentasPermitidas = quitarHandleDeLista(ajustes.cuentasPermitidas, boton.getAttribute("data-handle"));
  guardarAjustes();
});

btnCuentaActual.addEventListener("click", function () {
  if (!pagina.cuentaDetectada) {
    mostrarError("No veo la cuenta de X. Recarga la pestaña si ya estás dentro.");
    return;
  }
  agregarHandle(pagina.cuentaDetectada);
});

chrome.storage.onChanged.addListener(function (cambios, area) {
  if (area === "local") leerEstado();
  if (area === "sync" && (cambios.modoCuentas || cambios.cuentasPermitidas)) {
    leerAjustes();
  }
});

leerAjustes();
leerEstado();
