export type PlaceCategory = "Comida" | "Aventura" | "Cultura" | "Naturaleza";

export type PlaceKind =
  | "landmark"
  | "restaurant"
  | "adventure"
  | "food-stop"
  | "tourism-office";

export type Place = {
  id: string;
  name: string;
  category: PlaceCategory;
  kind: PlaceKind;
  coordinates: [number, number];
  city: string;
  region: string;
  address: string;
  description: string;
  highlight: string;
  tags: string[];
  typicalDishes?: string[];
  localTips: string[];
  hours?: string;
  website?: string;
};

export const CATEGORY_META: Record<
  PlaceCategory,
  { color: string; emoji: string; pinLabel: string }
> = {
  Comida: { color: "#ea580c", emoji: "🍽", pinLabel: "Comida" },
  Aventura: { color: "#dc2626", emoji: "🏄", pinLabel: "Aventura" },
  Cultura: { color: "#7c3aed", emoji: "🏛", pinLabel: "Cultura" },
  Naturaleza: { color: "#059669", emoji: "🌿", pinLabel: "Naturaleza" },
};

export const places: Place[] = [
  {
    id: "teatro-nacional",
    name: "Teatro Nacional de Costa Rica",
    category: "Cultura",
    kind: "landmark",
    coordinates: [9.93315, -84.07728],
    city: "San José",
    region: "Valle Central",
    address: "Avenida 2, Calles 3 y 5, San José",
    description:
      "El ícono cultural del país, inaugurado en 1897 con mármol italiano, oro y un techo pintado que representa la cosecha del café. Vale la pena tanto la función como el tour guiado.",
    highlight: "Landmark neoclásico y café histórico en el foyer",
    tags: ["arquitectura", "ópera", "tour-guiado", "centro-histórico"],
    localTips: [
      "El tour de 1 hora recorre bastidores y el foyer; compra boleto en taquilla el mismo día si no hay función.",
      "Al lado está la Plaza de la Cultura: vigila tus pertenencias en horas pico.",
    ],
    hours: "Mar–dom, tours 9:00–16:00",
    website: "https://www.teatronacional.go.cr",
  },
  {
    id: "basilica-los-angeles",
    name: "Basílica de Nuestra Señora de los Ángeles",
    category: "Cultura",
    kind: "landmark",
    coordinates: [9.86437, -83.91944],
    city: "Cartago",
    region: "Valle Central",
    address: "Calle 1, Avenida 2, Cartago",
    description:
      "Santuario bizantino de la Negrita, patrona de Costa Rica. Cada 2 de agosto miles hacen la romería desde San José. Aun fuera de fiesta, el interior y el manantial son una parada potente.",
    highlight: "La Negrita y el agua del manantial",
    tags: ["iglesia", "romería", "patrimonio", "cartago"],
    localTips: [
      "Prueba un jugo de frutas en las sodas alrededor de la plaza; Cartago es más barato que San José.",
      "Si vas el 2 de agosto, llega de madrugada o usa bus especial: el centro se cierra al tráfico.",
    ],
    hours: "Todos los días, 6:00–19:00",
  },
  {
    id: "ict-sjo",
    name: "ICT · Información turística SJO",
    category: "Cultura",
    kind: "tourism-office",
    coordinates: [9.9939, -84.2088],
    city: "Alajuela",
    region: "Valle Central",
    address: "Aeropuerto Internacional Juan Santamaría, área de llegadas",
    description:
      "Módulo oficial del Instituto Costarricense de Turismo al salir de inmigración. Mapas, consejos de transporte y alertas de temporada (ballenas, tortugas, lluvias).",
    highlight: "Primera parada oficial al aterrizar",
    tags: ["ict", "oficina", "mapas", "aeropuerto"],
    localTips: [
      "Pide el mapa oficial y pregunta por buses vs. uber/taxi naranja al centro.",
      "Cambia poco efectivo aquí; las tasas del aeropuerto no son las mejores. Usa un ATM afuera.",
    ],
    hours: "Coincide con vuelos internacionales",
    website: "https://www.ict.go.cr",
  },
  {
    id: "turismo-la-fortuna",
    name: "Oficina de Turismo La Fortuna",
    category: "Cultura",
    kind: "tourism-office",
    coordinates: [10.47105, -84.64515],
    city: "La Fortuna",
    region: "Norte / Arenal",
    address: "Parque central de La Fortuna, frente a la iglesia",
    description:
      "Kiosco y cámara de turismo junto al parque. Confirman tours de volcán, rafting y cataratas, y avisan si el parque nacional está nublado o cerrado por lluvia.",
    highlight: "Consejo local antes de reservar tours",
    tags: ["oficina", "arenal", "tours", "información"],
    localTips: [
      "Compara 2–3 operadores: los precios del hanging bridge y el volcán varían mucho.",
      "Si el Arenal está nublado (es frecuente), prioriza termales al atardecer.",
    ],
    hours: "Lun–sáb 8:00–17:00",
  },
  {
    id: "mercado-central",
    name: "Mercado Central de San José",
    category: "Comida",
    kind: "food-stop",
    coordinates: [9.93472, -84.08056],
    city: "San José",
    region: "Valle Central",
    address: "Avenida Central, Calles 6 y 8, San José",
    description:
      "Laberinto de sodas, especias, café y artesanía desde 1880. Es la parada gastronómica más auténtica del centro: casado, olla de carne y fresco de cas.",
    highlight: "Sodas clásicas y café de grano",
    tags: ["mercado", "soda", "casado", "café"],
    typicalDishes: [
      "Casado con chuleta o pescado",
      "Olla de carne",
      "Tamales de cerdo (fin de semana)",
      "Granizado de kola",
    ],
    localTips: [
      "Come en una soda con taburetes llenos de ticos, no en la primera del pasillo turístico.",
      "Lleva efectivo pequeño; muchas sodas no aceptan tarjeta.",
    ],
    hours: "Lun–sáb 6:30–18:00",
  },
  {
    id: "soda-tapia",
    name: "Soda Tapia",
    category: "Comida",
    kind: "restaurant",
    coordinates: [9.9356, -84.1015],
    city: "San José",
    region: "Valle Central",
    address: "Avenida de las Américas, La Sabana",
    description:
      "Soda icónica frente al Parque Metropolitano La Sabana, abierta desde 1957. Famosa por hamburguesas al estilo tico, sandwiches de chifrijo y el helado de sorbetera.",
    highlight: "Clásico josefino después de caminar La Sabana",
    tags: ["soda", "helado", "sabana", "histórico"],
    typicalDishes: [
      "Hamburguesa Tapia",
      "Sandwich de chifrijo",
      "Sorbetera de vainilla con natilla",
      "Batido de mora",
    ],
    localTips: [
      "Pide la sorbetera aparte aunque vengas por salado: es el ritual local.",
      "Está al lado del Estadio Nacional; los días de partido se llena.",
    ],
    hours: "Todos los días 7:00–22:00",
  },
  {
    id: "esquina-buenos-aires",
    name: "La Esquina de Buenos Aires",
    category: "Comida",
    kind: "restaurant",
    coordinates: [9.93005, -84.0739],
    city: "San José",
    region: "Valle Central",
    address: "Calle 11, Avenida 4, Barrio California",
    description:
      "Parrilla argentina de referencia en San José, con bodega seria y ambiente de barrio. Ideal para una noche en la capital antes de salir a la playa o al volcán.",
    highlight: "Bife de chorizo y malbec en el centro",
    tags: ["parrilla", "vino", "cena", "reservación"],
    typicalDishes: [
      "Bife de chorizo",
      "Empanadas criollas",
      "Provoleta",
      "Flan con dulce de leche",
    ],
    localTips: [
      "Reserva: se llena con diplomáticos y ticos de viernes.",
      "Si viajas light, comparte un corte y pide la ensalada de rúcula.",
    ],
    hours: "Lun–sáb 11:30–15:00 y 18:00–22:30",
    website: "https://laesquinadebuenosaires.com",
  },
  {
    id: "cafe-britt",
    name: "Café Britt · Coffee Tour",
    category: "Comida",
    kind: "food-stop",
    coordinates: [10.0103, -84.1164],
    city: "Heredia",
    region: "Valle Central",
    address: "Montecito de Heredia, camino a Barva",
    description:
      "Tour teatralizado de café (y cacao) entre cafetales del Valle Central. Incluye cata, tienda y a menudo traslado desde San José. Es la parada gastronómica más didáctica del país cafetalero.",
    highlight: "Cata de café de altura y show en la finca",
    tags: ["café", "cacao", "tour", "heredia"],
    typicalDishes: [
      "Cata de café de especialidad",
      "Chocolate Britt",
      "Peaberry y tuestes medios",
    ],
    localTips: [
      "El tour de la mañana tiene mejor luz en el cafetal; lleva zapatos cerrados.",
      "Compra grano verde o tostado aquí: suele ser más fresco que en el aeropuerto.",
    ],
    hours: "Tours diarios, reserva previa",
    website: "https://www.cafebritt.com",
  },
  {
    id: "pn-arenal",
    name: "Parque Nacional Volcán Arenal",
    category: "Naturaleza",
    kind: "landmark",
    coordinates: [10.4626, -84.7034],
    city: "La Fortuna",
    region: "Norte / Arenal",
    address: "Sector Península, 17 km al oeste de La Fortuna",
    description:
      "Conos de lava, senderos por bosque secundario y la silueta del coloso (1.633 m). El cráter está inactivo desde 2010, pero el paisaje y los tucanes siguen siendo el poster de Costa Rica.",
    highlight: "Senderos sobre coladas de lava",
    tags: ["volcán", "senderismo", "parque-nacional", "aves"],
    localTips: [
      "Entra temprano (8:00): el volcán se tapa de nubes después de mediodía.",
      "El sector Península tiene las mejores vistas; lleva agua, hay poco sombra en lava.",
    ],
    hours: "Todos los días 8:00–16:00",
    website: "https://www.sinac.go.cr",
  },
  {
    id: "catarata-fortuna",
    name: "Catarata Río Fortuna",
    category: "Naturaleza",
    kind: "landmark",
    coordinates: [10.4576, -84.6456],
    city: "La Fortuna",
    region: "Norte / Arenal",
    address: "Camino a la catarata, 5,5 km al suroeste del pueblo",
    description:
      "Salto de 70 m en cañón de bosque. La bajada son ~500 gradas; el pozo permite un chapuzón frío si no ha llovido fuerte. Uno de los miradores más fotografiados del norte.",
    highlight: "Pozo al pie de una cascada de 70 m",
    tags: ["cascada", "baño", "sendero", "fotografía"],
    localTips: [
      "Baja con zapatos con agarre: las gradas se ponen como jabón con lluvia.",
      "No entres al pozo si el agua baja chocolatosa: corriente y piedras sueltas.",
    ],
    hours: "Todos los días 8:00–16:30",
  },
  {
    id: "sky-monteverde",
    name: "Sky Adventures Monteverde",
    category: "Aventura",
    kind: "adventure",
    coordinates: [10.3472, -84.8295],
    city: "Santa Elena",
    region: "Monteverde",
    address: "Camino a reserva, Santa Elena de Monteverde",
    description:
      "Complejo de canopy, puentes colgantes y teleférico sobre el bosque nuboso. El zip-line más largo cruza quebradas con neblina: la actividad de aventura clásica de la cordillera de Tilarán.",
    highlight: "Canopy y sky tram sobre el bosque nuboso",
    tags: ["canopy", "puentes", "teleférico", "adrenalina"],
    localTips: [
      "Reserva el paquete tram + trek + zip; el solo zip se acaba en temporada alta.",
      "Lleva capa liviana: arriba hace 12–16 °C y llovizna horizontal.",
    ],
    hours: "Todos los días 7:00–16:00",
    website: "https://www.skyadventures.travel",
  },
  {
    id: "rio-pacuare",
    name: "Rafting en el río Pacuare",
    category: "Aventura",
    kind: "adventure",
    coordinates: [10.0952, -83.5078],
    city: "Siquirres",
    region: "Caribe",
    address: "Put-in San Martín / Siquirres, cuenca del Pacuare",
    description:
      "Uno de los mejores ríos de clase III–IV del mundo: selva, cascadas laterales y rápidos como Lower Huacas. Operadores salen de Siquirres o Turrialba con el almuerzo incluido en la playa del río.",
    highlight: "Rápidos clase IV entre selva primaria",
    tags: ["rafting", "río", "selva", "día-completo"],
    localTips: [
      "Temporada más estable: diciembre–abril. En septiembre el caudal puede cerrar salidas.",
      "Deja el teléfono en el dry bag del guía; el Pacuare se traga cámaras sueltas.",
    ],
    hours: "Salidas 6:30–7:30, retorno ~16:00",
  },
  {
    id: "tamarindo-surf",
    name: "Playa Tamarindo · Witch's Rock",
    category: "Aventura",
    kind: "adventure",
    coordinates: [10.2994, -85.8419],
    city: "Tamarindo",
    region: "Guanacaste",
    address: "Playa Tamarindo, Santa Cruz, Guanacaste",
    description:
      "Pueblo surf del Pacífico norte, escuela de olas para principiantes y puerta a Witch's Rock y Ollie's Point (Parque Nacional Santa Rosa) en lancha. Atardeceres y ceviche al final de la sesión.",
    highlight: "Clases de surf y day-trip a Witch's Rock",
    tags: ["surf", "playa", "guanacaste", "lancha"],
    typicalDishes: ["Ceviche de corvina", "Tacos de pescado", "Pipas frías"],
    localTips: [
      "Las escuelas frente al Hotel Tamarindo Diria son buenas para la primera ola.",
      "Witch's Rock depende del oleaje y del parque: confirma la lancha la noche anterior.",
    ],
    hours: "Olas de mañana; escuelas 8:00–16:00",
  },
  {
    id: "manuel-antonio",
    name: "Parque Nacional Manuel Antonio",
    category: "Naturaleza",
    kind: "landmark",
    coordinates: [9.3897, -84.141],
    city: "Quepos",
    region: "Pacífico Central",
    address: "Entrada principal, Manuel Antonio de Quepos",
    description:
      "Selva que cae en playas blancas, perezosos, mapaches y el sendero a Punta Catedral. Es pequeño y famoso: el cupo diario se agota. Una de las mejores combinaciones playa + vida silvestre del país.",
    highlight: "Perezosos y playas dentro del parque",
    tags: ["playa", "perezosos", "senderos", "parque-nacional"],
    typicalDishes: ["Mariscos en Quepos", "Patacones con camarón"],
    localTips: [
      "Compra el boleto en línea (SINAC) el día anterior; el cupo es limitado.",
      "No lleves comida: los monos capuchinos la arrebatan. Hidratación en botella dura.",
    ],
    hours: "Mié–lun 7:00–16:00 (martes cerrado)",
    website: "https://www.sinac.go.cr",
  },
  {
    id: "tortuguero",
    name: "Parque Nacional Tortuguero",
    category: "Naturaleza",
    kind: "landmark",
    coordinates: [10.5415, -83.5022],
    city: "Tortuguero",
    region: "Caribe Norte",
    address: "Canales y playa de anidación, Pueblo de Tortuguero",
    description:
      "Amazonas tico: se llega en lancha por canales. De julio a octubre las tortugas verdes anidan de noche. De día, caimanes, tucanes y el sendero Cerro Tortuguero.",
    highlight: "Anidación de tortugas y safari por canales",
    tags: ["tortugas", "canales", "caribe", "lancha"],
    typicalDishes: ["Rice and beans caribeño", "Pollo en leche de coco", "Pan bon"],
    localTips: [
      "La anidación nocturna es con guía certificado; no uses flash ni linterna blanca.",
      "Empaca en dry bag: el muelle y la lluvia caribeña mojan de verdad.",
    ],
    hours: "Canales 6:00–16:00; nesting tours de noche en temporada",
    website: "https://www.sinac.go.cr",
  },
];
