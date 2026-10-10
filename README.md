# DriverFlag

Extensión de Chrome (Manifest V3) para la cuenta **@maquinasypilotos**.

Cuando escribes un post en [X](https://x.com), si terminas el nombre de un piloto de F1 (con un espacio, una coma, un punto…), se inserta sola la bandera de su país:

`Hamilton ` → `Hamilton 🇬🇧 `

Si escribes nombre y apellido (`Lewis Hamilton`), deja **una sola** bandera, después del apellido.

No llama a internet, no tiene anuncios y solo pide el permiso `storage` para recordar si la dejaste encendida o apagada.

## Cómo instalarla en Chrome

1. Abre Chrome y ve a `chrome://extensions`.
2. Arriba a la derecha, activa **Modo de desarrollador**.
3. Pulsa **Cargar descomprimida**.
4. Elige **esta carpeta** (la que tiene el archivo `manifest.json`).
5. Entra en [x.com](https://x.com) con la cuenta **@maquinasypilotos**.
6. Escribe un post de prueba: `Hamilton ` y debería aparecer 🇬🇧.

Si actualizas los archivos (o te dicen que recargues):

1. Abre `chrome://extensions`.
2. En la tarjeta **DriverFlag**, pulsa el icono de recargar (círculo).
3. Vuelve a la pestaña de **x.com** y recárgala (F5 o Cmd+R).
4. Para ver si está viva: en x.com, clic derecho → **Inspeccionar** → pestaña **Consola**. Debe aparecer `[DriverFlag] arrancó en https://x.com/...`.

Sin recargar la pestaña de X, Chrome sigue usando el script viejo.

## Cómo se usa

- El interruptor del icono de la extensión (arriba a la derecha en Chrome) enciende o apaga las banderas.
- Ahí mismo verás si detectó tu cuenta de X y si está activa.
- Funciona en la caja principal, respuestas, citas y la ventana de “Publicar”.
- `Ctrl+Z` (o `Cmd+Z` en Mac) justo después de una bandera la quita.

## Cómo actualizar la lista de pilotos

Edita **`pilotos.js`**. Arriba del archivo hay un comentario que explica cada campo.

Ejemplo para añadir a alguien:

```js
{
  nombre: "Carlos",
  apellido: "Sainz",
  alias: ["Chili"],
  equipo: "Williams",
  nacionalidad: "España",
  bandera: "🇪🇸",
  extra: false
}
```

- `extra: false` = piloto titular: coincide el nombre, el apellido o los dos.
- `extra: true` = reserva / retirado / leyenda: solo apellido o nombre+apellido.  
  Así `Daniel` solo no pone bandera, pero `Ricciardo` sí.

No hace falta escribir la versión sin acento: `Perez` ya coincide con `Pérez`.

La lista titular sigue la entry list de la FIA del GP de Singapur 2026. Detalles en `notas.md`.

## Cómo cambiar la cuenta

Abre **`content.js`**. La primera constante es:

```js
const CUENTA_PERMITIDA = "maquinasypilotos";
```

Cámbiala por el usuario de X que quieras (sin la `@`) y recarga la extensión.

## Cómo detecta la cuenta (y cuándo falla)

X no nos dice oficialmente quién está logueado. DriverFlag mira el DOM de la página:

1. El botón de cambiar de cuenta en la barra de la izquierda.
2. El enlace al perfil (icono de persona).

Si no encuentra ninguno (ventana muy estrecha, X cambió el diseño, aún no cargó la página), **no inserta nada**. Es a propósito: mejor quedarse quieto que poner banderas en otra cuenta.

El popup no mira la URL de la pestaña (eso pediría más permisos). El script de x.com escribe en `chrome.storage` si está en X y qué cuenta vio; el popup solo lee eso.

Cuando cambias de cuenta en X, vuelve a mirar. Si no es @maquinasypilotos, no hace nada.

## Si el popup dice que no está en X, o no salen banderas

1. `chrome://extensions` → recargar DriverFlag.
2. Recarga la pestaña de x.com.
3. Abre el popup otra vez: debería decir “Activo para @maquinasypilotos” o, si no ve la cuenta, un aviso distinto.
4. Consola de x.com (Inspeccionar → Consola), busca `[DriverFlag]`:
   - `arrancó en …` → el script está inyectado.
   - `cuenta detectada: @… (activa)` → debería insertar banderas.
   - `no inserto: la cuenta no es @maquinasypilotos` → estás con otra cuenta.
   - `inserción: …` → acaba de poner una bandera.
   - Si no hay ningún `[DriverFlag]`, el script no corre: revisa que la extensión esté activa y que la URL sea `https://x.com/...`.

## Cómo probar que la lógica funciona

En una terminal, dentro de esta carpeta:

```bash
node tests/matching.test.js
```

No hace falta instalar nada. Comprueba cosas como:

- `Hamilton` → 🇬🇧
- `Lewis Hamilton` → una bandera después de Hamilton
- `Carlos` → 🇪🇸
- `Perez` / `Pérez` / `Checo` → 🇲🇽
- no duplica banderas
- `Maximo` no coincide con Max

## Limitaciones conocidas

- Solo actúa si puede leer la cuenta y es @maquinasypilotos.
- Hay que **terminar** la palabra (espacio, coma, punto, intro…). Si publicas `Hamilton` sin nada detrás, no pone bandera.
- X puede cambiar el editor. La inserción usa `document.execCommand('insertText')` para que X lo trate como texto tuyo (contador, cursor, botón Publicar). Si un día deja de funcionar, ese es el sitio a revisar (`insertar.js`).
- Nombres comunes en español (`Carlos`, `Franco`, `Max`…) pondrán bandera aunque no hables de F1. Es la regla acordada para los titulares.
- `Chili` y `Nano` solos no ponen bandera (son ambiguos). `Checo`, `Hulk` y `Franquito` sí.
- `Kimi` solo es Antonelli 🇮🇹, no Räikkönen.
- No funciona en mensajes directos.
- El icono de la extensión y el popup están en español.

## Archivos

| Archivo        | Qué es                                      |
|----------------|---------------------------------------------|
| `manifest.json`| Ficha de la extensión (Chrome)              |
| `pilotos.js`   | Lista de pilotos (edita aquí)               |
| `matching.js`  | Cómo se reconoce un nombre                  |
| `insertar.js`  | Cómo se escribe la bandera en la caja de X  |
| `content.js`   | Se engancha a x.com; aquí está la cuenta    |
| `popup.html`   | Ventanita del icono                         |
| `notas.md`     | Fuentes de la lista 2026                    |
