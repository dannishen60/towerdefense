/* Plague World — invented casualty records for the death log.
 *
 * Everyone in the log is fictional: names are assembled at random from the pools
 * below. Each country points at a name pool so a victim usually has a name that
 * suits where they died, and sometimes gets one from anywhere, since people travel. */
(function (root) {
  const POOLS = {
    anglo: {
      first: ["Alice", "Jack", "Maya", "Owen", "Grace", "Ethan", "Ruby", "Noah", "Iris", "Leo", "Bella", "Sam", "Nora", "Finn"],
      last: ["Carter", "Bennett", "Holloway", "Price", "Sinclair", "Marsh", "Whitfield", "Doyle", "Rowe", "Fairbanks", "Quinn", "Ashby"],
    },
    westeuro: {
      first: ["Léa", "Matteo", "Anouk", "Bruno", "Elif", "Lukas", "Chiara", "Pieter", "Sofia", "Hugo", "Marta", "Nils", "Ines", "Théo"],
      last: ["Moreau", "Rossi", "Van Dijk", "Keller", "Silva", "Bauer", "Lombardi", "Dupont", "Costa", "Fischer", "Mertens", "Ferrari"],
    },
    nordic: {
      first: ["Sigrid", "Kasper", "Freya", "Eero", "Ingrid", "Magnus", "Liv", "Rasmus", "Astrid", "Jonas", "Saga", "Henrik"],
      last: ["Lindqvist", "Halvorsen", "Virtanen", "Dahl", "Nyberg", "Jokinen", "Bjørnstad", "Sørensen", "Ekström", "Rasmussen"],
    },
    slavic: {
      first: ["Ivana", "Milos", "Katya", "Tomasz", "Zofia", "Andrei", "Lena", "Dragan", "Marta", "Pavel", "Vesna", "Yuri"],
      last: ["Novak", "Kowalski", "Petrov", "Horvat", "Sokolov", "Marek", "Ivanova", "Dvorak", "Ilic", "Zielinski", "Bogdanov"],
    },
    latin: {
      first: ["Ana", "Mateo", "Lucía", "Diego", "Valeria", "Rafael", "Camila", "Tomás", "Renata", "Bruno", "Paula", "Esteban"],
      last: ["Lima", "Herrera", "Castillo", "Mendoza", "Vargas", "Ortega", "Ribeiro", "Salazar", "Fuentes", "Navarro", "Peña"],
    },
    arabic: {
      first: ["Layla", "Omar", "Nour", "Karim", "Salma", "Yusuf", "Hana", "Tariq", "Amira", "Rami", "Dina", "Bilal"],
      last: ["Haddad", "Nasser", "Khalil", "Mansour", "Farouk", "Rahman", "Aziz", "Sabri", "Darwish", "Hakim", "Sultan"],
    },
    africa: {
      first: ["Amara", "Kwame", "Zola", "Tendai", "Nia", "Sipho", "Adaeze", "Kofi", "Thandi", "Emeka", "Ayana", "Musa"],
      last: ["Okafor", "Mensah", "Dlamini", "Achebe", "Mwangi", "Banda", "Nkosi", "Diallo", "Osei", "Abebe", "Kamau"],
    },
    southasia: {
      first: ["Priya", "Arjun", "Meera", "Rohan", "Ayesha", "Vikram", "Zara", "Imran", "Anika", "Dev", "Sana", "Kiran"],
      last: ["Sharma", "Iqbal", "Nair", "Chowdhury", "Patel", "Rahman", "Desai", "Fernando", "Gupta", "Bhatt", "Sengupta"],
    },
    eastasia: {
      first: ["Mei", "Haruto", "Jia", "Min-jun", "Yuki", "Wei", "Soo-ah", "Ren", "Lian", "Takeshi", "Hana", "Cheng"],
      last: ["Chen", "Tanaka", "Kim", "Zhang", "Nakamura", "Park", "Liu", "Sato", "Huang", "Yoon", "Watanabe", "Xu"],
    },
    seasia: {
      first: ["Linh", "Arif", "Sari", "Dara", "Nadia", "Bayu", "Mai", "Rizal", "Intan", "Somchai", "Ploy", "Andi"],
      last: ["Nguyen", "Santos", "Wijaya", "Tran", "Rahmat", "Chaiyaporn", "Lim", "Reyes", "Putra", "Kaur", "Suryani"],
    },
    caucasus: {
      first: ["Ani", "Levan", "Nino", "Aram", "Tigran", "Gia", "Leyla", "Elnur", "Mariam", "Davit"],
      last: ["Petrosyan", "Beridze", "Sargsyan", "Gogoladze", "Mammadov", "Hakobyan", "Kvaratskhelia", "Aliyev"],
    },
    centralasia: {
      first: ["Aidar", "Gulnara", "Timur", "Dilnoza", "Nurlan", "Aigerim", "Rustam", "Saltanat", "Bekzat", "Malika"],
      last: ["Nazarov", "Alimova", "Karimov", "Toktogulov", "Sultanova", "Yusupov", "Abdullayeva", "Ergashev"],
    },
    hebrew: {
      first: ["Noa", "Eitan", "Tamar", "Yosef", "Shira", "Amit", "Maayan", "Ari", "Talia", "Boaz"],
      last: ["Levi", "Mizrahi", "Shapiro", "Ben-David", "Katz", "Avraham", "Peretz", "Golan"],
    },
    baltic: {
      first: ["Kadri", "Mārtiņš", "Egle", "Tomas", "Laima", "Jaan", "Rasa", "Kristaps"],
      last: ["Tamm", "Bērziņš", "Kazlauskas", "Saar", "Ozols", "Petrauskas", "Kask", "Jansons"],
    },
    pacific: {
      first: ["Talia", "Sione", "Moana", "Rangi", "Leilani", "Tevita", "Ariki", "Meli", "Kalani", "Tui"],
      last: ["Faleolo", "Ngata", "Kaleo", "Tupou", "Waqa", "Rewi", "Latu", "Māhoe", "Tamati", "Vakatawa"],
    },
  };

  // Countries not listed here draw from any pool at random.
  const COUNTRY_POOL = {
    "United States of America": "anglo", "Canada": "anglo", "United Kingdom": "anglo",
    "Ireland": "anglo", "Australia": "anglo", "New Zealand": "pacific", "Jamaica": "anglo",
    "France": "westeuro", "Germany": "westeuro", "Netherlands": "westeuro", "Belgium": "westeuro",
    "Italy": "westeuro", "Spain": "westeuro", "Portugal": "westeuro", "Switzerland": "westeuro",
    "Austria": "westeuro", "Greece": "westeuro", "Turkey": "westeuro", "Luxembourg": "westeuro",
    "Norway": "nordic", "Sweden": "nordic", "Denmark": "nordic", "Finland": "nordic", "Iceland": "nordic",
    "Russia": "slavic", "Ukraine": "slavic", "Poland": "slavic", "Czechia": "slavic", "Slovakia": "slavic",
    "Serbia": "slavic", "Croatia": "slavic", "Bulgaria": "slavic", "Belarus": "slavic", "Slovenia": "slavic",
    "Bosnia and Herz.": "slavic", "Macedonia": "slavic", "Montenegro": "slavic",
    "Mexico": "latin", "Brazil": "latin", "Argentina": "latin", "Colombia": "latin", "Peru": "latin",
    "Chile": "latin", "Venezuela": "latin", "Ecuador": "latin", "Bolivia": "latin", "Cuba": "latin",
    "Guatemala": "latin", "Honduras": "latin", "Panama": "latin", "Uruguay": "latin", "Paraguay": "latin",
    "Costa Rica": "latin", "Dominican Rep.": "latin", "Nicaragua": "latin", "El Salvador": "latin",
    "Egypt": "arabic", "Saudi Arabia": "arabic", "Iraq": "arabic", "Syria": "arabic", "Jordan": "arabic",
    "Lebanon": "arabic", "Morocco": "arabic", "Algeria": "arabic", "Tunisia": "arabic", "Libya": "arabic",
    "United Arab Emirates": "arabic", "Kuwait": "arabic", "Qatar": "arabic", "Oman": "arabic", "Yemen": "arabic",
    "Sudan": "arabic", "Iran": "arabic", "Palestine": "arabic", "Bahrain": "arabic",
    "Nigeria": "africa", "Kenya": "africa", "Ethiopia": "africa", "Ghana": "africa", "Tanzania": "africa",
    "Uganda": "africa", "South Africa": "africa", "Zimbabwe": "africa", "Zambia": "africa", "Angola": "africa",
    "Dem. Rep. Congo": "africa", "Congo": "africa", "Cameroon": "africa", "Senegal": "africa", "Mali": "africa",
    "Somalia": "africa", "Mozambique": "africa", "Madagascar": "africa", "Rwanda": "africa", "Malawi": "africa",
    "Côte d'Ivoire": "africa", "Burkina Faso": "africa", "Niger": "africa", "Chad": "africa", "Guinea": "africa",
    "Botswana": "africa", "Namibia": "africa", "S. Sudan": "africa", "Eritrea": "africa", "Benin": "africa",
    "India": "southasia", "Pakistan": "southasia", "Bangladesh": "southasia", "Sri Lanka": "southasia",
    "Nepal": "southasia", "Afghanistan": "southasia", "Bhutan": "southasia", "Maldives": "southasia",
    "China": "eastasia", "Japan": "eastasia", "South Korea": "eastasia", "North Korea": "eastasia",
    "Taiwan": "eastasia", "Mongolia": "eastasia", "Hong Kong": "eastasia", "Macao": "eastasia",
    "Vietnam": "seasia", "Thailand": "seasia", "Indonesia": "seasia", "Philippines": "seasia",
    "Malaysia": "seasia", "Singapore": "seasia", "Cambodia": "seasia", "Laos": "seasia",
    "Myanmar": "seasia", "Brunei": "seasia", "Timor-Leste": "seasia",
    "Armenia": "caucasus", "Georgia": "caucasus", "Azerbaijan": "caucasus",
    "Kazakhstan": "centralasia", "Uzbekistan": "centralasia", "Kyrgyzstan": "centralasia",
    "Tajikistan": "centralasia", "Turkmenistan": "centralasia",
    "Israel": "hebrew",
    "Estonia": "baltic", "Latvia": "baltic", "Lithuania": "baltic",
    "Papua New Guinea": "pacific", "Fiji": "pacific", "Samoa": "pacific", "Tonga": "pacific",
    "Solomon Is.": "pacific", "Vanuatu": "pacific",
  };

  const JOBS = [
    "bus driver", "nurse", "baker", "fisherman", "schoolteacher", "farmer", "taxi driver",
    "market trader", "factory worker", "student", "shopkeeper", "doctor", "airline pilot",
    "ship's cook", "engineer", "chef", "tailor", "barber", "mechanic", "accountant",
    "journalist", "librarian", "plumber", "dentist", "postal worker", "street sweeper",
    "football coach", "hotel porter", "vet", "bricklayer", "toy maker", "lighthouse keeper",
    "bee keeper", "train driver", "museum guard", "goat herder", "ferry captain", "retired soldier",
  ];

  const CAUGHT_IT = [
    "on a crowded bus", "at the fish market", "in a hospital waiting room", "at a football match",
    "on a long-haul flight", "at a family wedding", "in a school classroom", "at the docks",
    "in a packed lift", "at a street food stall", "on the metro", "at a music festival",
    "from a neighbour", "in a nursing home", "at the border crossing", "from a sick coworker",
    "at the town well", "on a fishing boat", "in an airport queue", "at a busy café",
  ];

  const PLACES = [
    "the capital", "a fishing village", "a mountain town", "the old quarter", "a farming district",
    "a port town", "the city outskirts", "a border village", "a river town", "the docklands",
  ];

  const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];
  const POOL_NAMES = Object.keys(POOLS);

  // Older people are likelier to die, so the age curve leans that way.
  function rollAge(rng) {
    const r = rng();
    if (r < 0.1) return 1 + Math.floor(rng() * 17);
    if (r < 0.35) return 18 + Math.floor(rng() * 32);
    if (r < 0.7) return 50 + Math.floor(rng() * 20);
    return 70 + Math.floor(rng() * 28);
  }

  function makeVictim(country, day, date, cause, rng, opts = {}) {
    // 80% of victims get a name from their country's pool; the rest are travellers.
    const poolKey = (rng() < 0.8 && COUNTRY_POOL[country.key]) || pick(POOL_NAMES, rng);
    const pool = POOLS[poolKey];
    const cities = [...country.airports, ...country.seaports].map((p) => p.city);
    const where = cities.length && rng() < 0.75 ? pick(cities, rng) : pick(PLACES, rng);
    return {
      id: opts.id,
      name: `${pick(pool.first, rng)} ${pick(pool.last, rng)}`,
      age: rollAge(rng),
      job: pick(JOBS, rng),
      where,
      country: country.name,
      day, date, cause,
      caught: pick(CAUGHT_IT, rng),
      first: !!opts.first,
    };
  }

  root.PW = root.PW || {};
  root.PW.makeVictim = makeVictim;
})(typeof window !== "undefined" ? window : globalThis);
