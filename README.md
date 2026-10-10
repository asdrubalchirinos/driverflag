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

Si actualizas los archivos, vuelve a `chrome://extensions` y pulsa el botón de recargar en DriverFlag.

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

Cuando cambias de cuenta en X, vuelve a mirar. Si no es @maquinasypilotos, no hace nada.

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
