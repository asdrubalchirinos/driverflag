/**
 * Lista de pilotos de F1 que DriverFlag conoce.
 *
 * Cómo añadir o editar un piloto
 * ------------------------------
 * Copia un bloque de abajo y cambia los campos:
 *   nombre        → nombre de pila (ej. "Carlos")
 *   apellido      → apellido (ej. "Sainz")
 *   alias         → otros nombres con los que lo escribes (ej. "Checo")
 *   equipo        → solo informativo, no se usa para buscar
 *   nacionalidad  → solo informativo
 *   bandera       → el emoji que se inserta (ej. "🇪🇸")
 *   extra         → false = piloto titular de 2026
 *                   true  = reserva, retirado o leyenda
 *
 * Reglas de búsqueda (las aplica matching.js):
 *   - Titulares (extra: false): coinciden nombre, apellido o nombre+apellido.
 *     También coinciden los alias de una sola palabra, salvo "Chili" y "Nano"
 *     que son demasiado ambiguos.
 *   - Extras (extra: true): solo apellido o nombre+apellido.
 *     Su nombre de pila solo NO pone bandera (así "Daniel" no marca a Ricciardo
 *     y "Kimi" se queda para Antonelli).
 *
 * No hace falta escribir la versión sin acento: "Perez" ya coincide con "Pérez".
 * Fuentes: lista de inscritos FIA GP de Singapur 2026 (ver notas.md).
 */
const PILOTOS = [
  {
    nombre: "Oscar",
    apellido: "Piastri",
    alias: [],
    equipo: "McLaren",
    nacionalidad: "Australia",
    bandera: "🇦🇺",
    extra: false
  },
  {
    nombre: "Lando",
    apellido: "Norris",
    alias: [],
    equipo: "McLaren",
    nacionalidad: "Reino Unido",
    bandera: "🇬🇧",
    extra: false
  },
  {
    nombre: "George",
    apellido: "Russell",
    alias: [],
    equipo: "Mercedes",
    nacionalidad: "Reino Unido",
    bandera: "🇬🇧",
    extra: false
  },
  {
    nombre: "Andrea Kimi",
    apellido: "Antonelli",
    alias: ["Kimi Antonelli"],
    equipo: "Mercedes",
    nacionalidad: "Italia",
    bandera: "🇮🇹",
    extra: false
  },
  {
    nombre: "Max",
    apellido: "Verstappen",
    alias: ["Mad Max"],
    equipo: "Red Bull Racing",
    nacionalidad: "Países Bajos",
    bandera: "🇳🇱",
    extra: false
  },
  {
    nombre: "Isack",
    apellido: "Hadjar",
    alias: [],
    equipo: "Red Bull Racing",
    nacionalidad: "Francia",
    bandera: "🇫🇷",
    extra: false
  },
  {
    nombre: "Charles",
    apellido: "Leclerc",
    alias: [],
    equipo: "Ferrari",
    nacionalidad: "Mónaco",
    bandera: "🇲🇨",
    extra: false
  },
  {
    nombre: "Lewis",
    apellido: "Hamilton",
    alias: [],
    equipo: "Ferrari",
    nacionalidad: "Reino Unido",
    bandera: "🇬🇧",
    extra: false
  },
  {
    nombre: "Alexander",
    apellido: "Albon",
    alias: ["Alex Albon"],
    equipo: "Williams",
    nacionalidad: "Tailandia",
    bandera: "🇹🇭",
    extra: false
  },
  {
    nombre: "Carlos",
    apellido: "Sainz",
    alias: ["Chili", "Carlos Sainz Jr."],
    equipo: "Williams",
    nacionalidad: "España",
    bandera: "🇪🇸",
    extra: false
  },
  {
    nombre: "Arvid",
    apellido: "Lindblad",
    alias: [],
    equipo: "Racing Bulls",
    nacionalidad: "Reino Unido",
    bandera: "🇬🇧",
    extra: false
  },
  {
    nombre: "Liam",
    apellido: "Lawson",
    alias: [],
    equipo: "Racing Bulls",
    nacionalidad: "Nueva Zelanda",
    bandera: "🇳🇿",
    extra: false
  },
  {
    nombre: "Lance",
    apellido: "Stroll",
    alias: [],
    equipo: "Aston Martin",
    nacionalidad: "Canadá",
    bandera: "🇨🇦",
    extra: false
  },
  {
    nombre: "Fernando",
    apellido: "Alonso",
    alias: ["Nano", "Magic Alonso"],
    equipo: "Aston Martin",
    nacionalidad: "España",
    bandera: "🇪🇸",
    extra: false
  },
  {
    nombre: "Esteban",
    apellido: "Ocon",
    alias: [],
    equipo: "Haas",
    nacionalidad: "Francia",
    bandera: "🇫🇷",
    extra: false
  },
  {
    nombre: "Oliver",
    apellido: "Bearman",
    alias: ["Ollie Bearman", "Ollie"],
    equipo: "Haas",
    nacionalidad: "Reino Unido",
    bandera: "🇬🇧",
    extra: false
  },
  {
    nombre: "Nico",
    apellido: "Hülkenberg",
    alias: ["Hulkenberg", "Hulk"],
    equipo: "Audi",
    nacionalidad: "Alemania",
    bandera: "🇩🇪",
    extra: false
  },
  {
    nombre: "Gabriel",
    apellido: "Bortoleto",
    alias: [],
    equipo: "Audi",
    nacionalidad: "Brasil",
    bandera: "🇧🇷",
    extra: false
  },
  {
    nombre: "Pierre",
    apellido: "Gasly",
    alias: [],
    equipo: "Alpine",
    nacionalidad: "Francia",
    bandera: "🇫🇷",
    extra: false
  },
  {
    nombre: "Franco",
    apellido: "Colapinto",
    alias: ["Franquito"],
    equipo: "Alpine",
    nacionalidad: "Argentina",
    bandera: "🇦🇷",
    extra: false
  },
  {
    nombre: "Sergio",
    apellido: "Pérez",
    alias: ["Checo", "Checo Pérez", "Perez"],
    equipo: "Cadillac",
    nacionalidad: "México",
    bandera: "🇲🇽",
    extra: false
  },
  {
    nombre: "Valtteri",
    apellido: "Bottas",
    alias: [],
    equipo: "Cadillac",
    nacionalidad: "Finlandia",
    bandera: "🇫🇮",
    extra: false
  },
  {
    nombre: "Yuki",
    apellido: "Tsunoda",
    alias: [],
    equipo: "Red Bull (reserva/estatus por confirmar)",
    nacionalidad: "Japón",
    bandera: "🇯🇵",
    extra: true
  },
  {
    nombre: "Jack",
    apellido: "Doohan",
    alias: [],
    equipo: "Ex-Alpine",
    nacionalidad: "Australia",
    bandera: "🇦🇺",
    extra: true
  },
  {
    nombre: "Guanyu",
    apellido: "Zhou",
    alias: ["Zhou Guanyu"],
    equipo: "Ferrari (reserva, por confirmar)",
    nacionalidad: "China",
    bandera: "🇨🇳",
    extra: true
  },
  {
    nombre: "Felipe",
    apellido: "Drugovich",
    alias: [],
    equipo: "Aston Martin (reserva, por confirmar)",
    nacionalidad: "Brasil",
    bandera: "🇧🇷",
    extra: true
  },
  {
    nombre: "Daniel",
    apellido: "Ricciardo",
    alias: ["Danny Ric"],
    equipo: "Retirado",
    nacionalidad: "Australia",
    bandera: "🇦🇺",
    extra: true
  },
  {
    nombre: "Sebastian",
    apellido: "Vettel",
    alias: ["Seb"],
    equipo: "Retirado",
    nacionalidad: "Alemania",
    bandera: "🇩🇪",
    extra: true
  },
  {
    nombre: "Kimi",
    apellido: "Räikkönen",
    alias: ["Raikkonen", "Iceman"],
    equipo: "Retirado",
    nacionalidad: "Finlandia",
    bandera: "🇫🇮",
    extra: true
  },
  {
    nombre: "Mick",
    apellido: "Schumacher",
    alias: [],
    equipo: "Ex-F1",
    nacionalidad: "Alemania",
    bandera: "🇩🇪",
    extra: true
  },
  {
    nombre: "Michael",
    apellido: "Schumacher",
    alias: [],
    equipo: "Leyenda",
    nacionalidad: "Alemania",
    bandera: "🇩🇪",
    extra: true
  },
  {
    nombre: "Ayrton",
    apellido: "Senna",
    alias: [],
    equipo: "Leyenda",
    nacionalidad: "Brasil",
    bandera: "🇧🇷",
    extra: true
  },
  {
    nombre: "Kevin",
    apellido: "Magnussen",
    alias: ["K-Mag"],
    equipo: "Ex-Haas",
    nacionalidad: "Dinamarca",
    bandera: "🇩🇰",
    extra: true
  },
  {
    nombre: "Logan",
    apellido: "Sargeant",
    alias: [],
    equipo: "Ex-Williams",
    nacionalidad: "Estados Unidos",
    bandera: "🇺🇸",
    extra: true
  }
];

if (typeof module !== "undefined" && module.exports) {
  module.exports = { PILOTOS };
}
