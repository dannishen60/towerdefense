/* Plague World — germ types and evolution traits.
 *
 * Trait effect keys (all additive):
 *   inf      local infectivity (extra people infected per infected person per day)
 *   air/sea  chance an infected plane/ship carries the disease
 *   land     chance to cross a land border
 *   sev      severity (how noticeable it is — drives cure research & panic)
 *   leth     lethality (fraction of infected who die per day)
 *   cold/heat  resistance to cold/hot climates (0..1)
 *   rich/poor  bonus infectivity in rich/poor countries
 *   cureRes  slows cure research
 *
 * Germ mods multiply the matching stat; `cure` multiplies cure research speed.
 */
(function (root) {
  const GERMS = [
    {
      id: "bacteria", name: "Bacteria", icon: "🦠",
      desc: "The most common cause of disease. Well-rounded and tough, with no special weaknesses.",
      mods: { inf: 1, sev: 1, leth: 1, cure: 1, air: 1, sea: 1, land: 1 },
      start: { cold: 0.1, heat: 0.1 },
    },
    {
      id: "virus", name: "Virus", icon: "🧫",
      desc: "Spreads fast and mutates — it gains random symptoms for free, which can make it noticed early.",
      mods: { inf: 1.2, sev: 1, leth: 1, cure: 1, air: 1, sea: 1, land: 1 },
      mutates: true,
    },
    {
      id: "fungus", name: "Fungus", icon: "🍄",
      desc: "Spreads slowly between countries, but its spores make cure research harder.",
      mods: { inf: 1, sev: 1, leth: 1, cure: 0.8, air: 0.7, sea: 0.7, land: 0.6 },
    },
    {
      id: "parasite", name: "Parasite", icon: "🪱",
      desc: "Hides inside its host. Symptoms are only half as noticeable.",
      mods: { inf: 1, sev: 0.5, leth: 1, cure: 1, air: 1, sea: 1, land: 1 },
    },
    {
      id: "prion", name: "Prion", icon: "🧠",
      desc: "A twisted protein. Spreads slowly but the cure takes far longer.",
      mods: { inf: 0.85, sev: 1, leth: 1, cure: 0.6, air: 1, sea: 1, land: 1 },
    },
    {
      id: "nanovirus", name: "Nano-Virus", icon: "🤖",
      desc: "A rogue micro-machine. Detected the moment it appears — the cure starts on day one.",
      mods: { inf: 1.3, sev: 1, leth: 1, cure: 1.2, air: 1.2, sea: 1.2, land: 1 },
      noticedAtStart: true,
    },
    {
      id: "bioweapon", name: "Bio-Weapon", icon: "☣️",
      desc: "Engineered to kill. Extremely lethal — maybe too lethal.",
      mods: { inf: 1.1, sev: 1.2, leth: 2.2, cure: 1, air: 1, sea: 1, land: 1 },
    },
  ];

  /* ---- Build-your-own germ ----
   * The player spends POINT_BUDGET points on powers. Drawbacks have a negative
   * cost, so taking one hands points back to spend elsewhere. */
  const POINT_BUDGET = 10;

  const CUSTOM_ICONS = ["🦠", "🧫", "🍄", "🪱", "🧠", "🤖", "☣️", "👾", "🐛", "🦑", "💀", "🐙", "🌡️", "🧪", "🫧", "🕷️"];

  // `apply` fields: mul multiplies a germ mod, add adds a starting bonus, set sets a flag.
  const CUSTOM_OPTIONS = [
    { id: "cont1", name: "Contagious", cost: 3, desc: "Spreads noticeably faster inside every country.", apply: { mul: { inf: 1.25 } } },
    { id: "cont2", name: "Super Contagious", cost: 6, desc: "Spreads twice as fast inside every country.", apply: { mul: { inf: 1.6 } } },
    { id: "airborne", name: "Born Airborne", cost: 3, desc: "Starts able to ride on planes.", apply: { add: { air: 0.6 } } },
    { id: "waterborne", name: "Born Waterborne", cost: 3, desc: "Starts able to ride on ships.", apply: { add: { sea: 0.6 } } },
    { id: "crawler", name: "Border Crawler", cost: 2, desc: "Crosses land borders much more easily.", apply: { mul: { land: 1.8 } } },
    { id: "stealth", name: "Stealthy", cost: 4, desc: "Symptoms are only half as noticeable, so the world spots it late.", apply: { mul: { sev: 0.5 } } },
    { id: "deadly", name: "Deadly", cost: 3, desc: "Kills much faster — but dead people stop spreading it.", apply: { mul: { leth: 1.8 } } },
    { id: "hardy", name: "Hard to Cure", cost: 4, desc: "Scientists research the cure 25% slower.", apply: { mul: { cure: 0.75 } } },
    { id: "cold", name: "Cold Blooded", cost: 2, desc: "Starts resistant to freezing countries.", apply: { add: { cold: 0.5 } } },
    { id: "heat", name: "Heat Proof", cost: 2, desc: "Starts resistant to scorching countries.", apply: { add: { heat: 0.5 } } },
    { id: "mutator", name: "Mutator", cost: 3, desc: "Randomly grows new symptoms for free, like a virus.", apply: { set: { mutates: true } } },
    { id: "dnaboost", name: "DNA Head Start", cost: 2, desc: "Begin the game with 12 extra DNA to spend.", apply: { set: { startDna: 12 } } },

    { id: "obvious", name: "Obvious", cost: -3, drawback: true, desc: "Doctors spot it on day one, so the cure starts immediately.", apply: { set: { noticedAtStart: true } } },
    { id: "feeble", name: "Feeble", cost: -3, drawback: true, desc: "Spreads 20% slower inside every country.", apply: { mul: { inf: 0.8 } } },
    { id: "fastcure", name: "Easy to Cure", cost: -2, drawback: true, desc: "Scientists research the cure 30% faster.", apply: { mul: { cure: 1.3 } } },
    { id: "homebody", name: "Homebody", cost: -2, drawback: true, desc: "Much less likely to survive a plane or ship journey.", apply: { mul: { air: 0.6, sea: 0.6 } } },
  ];

  const CONFLICTS = [["cont1", "cont2", "feeble"], ["hardy", "fastcure"], ["airborne", "homebody"], ["waterborne", "homebody"]];

  function customConflict(id, chosen) {
    for (const group of CONFLICTS) {
      if (!group.includes(id)) continue;
      const other = group.find((o) => o !== id && chosen.has(o));
      if (other) return CUSTOM_OPTIONS.find((o) => o.id === other);
    }
    return null;
  }

  const customSpent = (chosen) =>
    CUSTOM_OPTIONS.reduce((sum, o) => (chosen.has(o.id) ? sum + o.cost : sum), 0);

  function buildCustomGerm(chosen, icon, name) {
    const germ = {
      id: "custom", name: name || "Custom Germ", icon: icon || "👾", custom: true,
      desc: "A germ you designed yourself.",
      mods: { inf: 1, sev: 1, leth: 1, cure: 1, air: 1, sea: 1, land: 1 },
      start: {},
      options: [...chosen],
    };
    for (const o of CUSTOM_OPTIONS) {
      if (!chosen.has(o.id)) continue;
      for (const [k, v] of Object.entries(o.apply.mul || {})) germ.mods[k] *= v;
      for (const [k, v] of Object.entries(o.apply.add || {})) germ.start[k] = (germ.start[k] || 0) + v;
      Object.assign(germ, o.apply.set || {});
    }
    return germ;
  }

  const T = (id, cat, name, cost, eff, desc, req, reqAll) => ({ id, cat, name, cost, eff, desc, req: req || [], reqAll: reqAll || [] });

  const TRAITS = [
    // ---- Transmission ----
    T("air1", "trans", "Air 1", 9, { inf: 0.02, air: 0.6 }, "Survives in tiny droplets. Much more likely to travel on planes."),
    T("air2", "trans", "Air 2", 15, { inf: 0.03, air: 1.0 }, "Airborne particles spread through aircraft ventilation.", ["air1"]),
    T("water1", "trans", "Water 1", 9, { inf: 0.02, sea: 0.6 }, "Survives in water. Much more likely to travel on ships."),
    T("water2", "trans", "Water 2", 15, { inf: 0.03, sea: 1.0 }, "Contaminates drinking water supplies and ship ballast.", ["water1"]),
    T("bioaero", "trans", "Extreme Bioaerosol", 22, { inf: 0.07, air: 1, sea: 1 }, "Airborne AND waterborne. Spreads everywhere.", [], ["air2", "water2"]),
    T("blood1", "trans", "Blood 1", 8, { inf: 0.03, poor: 0.08, rich: 0.04 }, "Spreads through infected blood."),
    T("blood2", "trans", "Blood 2", 14, { inf: 0.04, rich: 0.1 }, "Spreads via blood transfusions and hospitals.", ["blood1"]),
    T("insect1", "trans", "Insect 1", 10, { inf: 0.03, poor: 0.12, heat: 0.05 }, "Mosquitoes carry the disease."),
    T("insect2", "trans", "Insect 2", 16, { inf: 0.05, land: 0.6, poor: 0.12 }, "Insect swarms carry it across borders.", ["insect1"]),
    T("rodent1", "trans", "Rodent 1", 10, { inf: 0.03, rich: 0.1, land: 0.3 }, "Rats spread it through cities."),
    T("rodent2", "trans", "Rodent 2", 16, { inf: 0.04, rich: 0.15, land: 0.5 }, "Rodents stow away everywhere.", ["rodent1"]),
    T("live1", "trans", "Livestock 1", 9, { inf: 0.03, poor: 0.1, land: 0.3 }, "Farm animals become carriers."),
    T("live2", "trans", "Livestock 2", 15, { inf: 0.04, land: 0.5 }, "Livestock trade spreads it far.", ["live1"]),
    T("bird1", "trans", "Bird 1", 12, { inf: 0.02, land: 1, air: 0.3, sea: 0.3 }, "Birds carry it across borders and oceans.", ["insect1", "rodent1", "live1"]),
    T("bird2", "trans", "Bird 2", 18, { inf: 0.03, land: 1.5, air: 0.3, sea: 0.3 }, "Migrating flocks spread it worldwide.", ["bird1"]),

    // ---- Symptoms ----
    T("nausea", "sym", "Nausea", 3, { sev: 1, inf: 0.005 }, "Feeling sick. Barely noticed."),
    T("coughing", "sym", "Coughing", 4, { sev: 1, inf: 0.02, air: 0.2 }, "Irritated lungs spread droplets."),
    T("rash", "sym", "Rash", 3, { sev: 1, inf: 0.01 }, "Itchy skin. Spreads by touch."),
    T("sweating", "sym", "Sweating", 4, { sev: 1, inf: 0.015 }, "Excessive sweating spreads by contact.", ["rash"]),
    T("sneezing", "sym", "Sneezing", 6, { sev: 2, inf: 0.035, air: 0.3 }, "Violent sneezes spread the disease further.", ["coughing"]),
    T("vomiting", "sym", "Vomiting", 6, { sev: 2, inf: 0.03, leth: 0.0005 }, "Spreads through contaminated fluids.", ["nausea"]),
    T("fever", "sym", "Fever", 8, { sev: 3, inf: 0.02, leth: 0.001 }, "High temperatures weaken the body.", ["sweating", "coughing"]),
    T("pneumonia", "sym", "Pneumonia", 8, { sev: 3, inf: 0.03, leth: 0.0005 }, "Infected lungs.", ["coughing"]),
    T("cysts", "sym", "Cysts", 7, { sev: 2, inf: 0.02 }, "Painful cysts full of germs.", ["rash"]),
    T("insomnia", "sym", "Insomnia", 5, { sev: 2 }, "Nobody can sleep.", ["nausea", "fever"]),
    T("paranoia", "sym", "Paranoia", 6, { sev: 3, cureRes: 0.05 }, "Paranoid scientists work slower.", ["insomnia"]),
    T("anaemia", "sym", "Anaemia", 7, { sev: 2, leth: 0.001 }, "Weak blood.", ["vomiting", "cysts"]),
    T("seizures", "sym", "Seizures", 10, { sev: 4, leth: 0.002 }, "Violent seizures.", ["paranoia", "fever"]),
    T("oedema", "sym", "Pulmonary Oedema", 12, { sev: 4, inf: 0.02, leth: 0.005 }, "Lungs fill with fluid.", ["pneumonia"]),
    T("immune", "sym", "Immune Suppression", 14, { sev: 5, inf: 0.02, leth: 0.008 }, "The immune system shuts down.", ["fever", "pneumonia"]),
    T("haemo", "sym", "Hemorrhagic Shock", 14, { sev: 6, inf: 0.02, leth: 0.01 }, "Massive internal bleeding.", ["anaemia"]),
    T("coma", "sym", "Coma", 15, { sev: 6, leth: 0.006 }, "Victims fall unconscious.", ["seizures"]),
    T("insanity", "sym", "Insanity", 18, { sev: 8, inf: 0.03, leth: 0.005 }, "Victims go mad and spread chaos.", ["paranoia", "coma"]),
    T("necrosis", "sym", "Necrosis", 20, { sev: 8, inf: 0.04, leth: 0.015 }, "Flesh starts to rot.", ["haemo", "cysts"]),
    T("organ", "sym", "Organ Failure", 20, { sev: 8, leth: 0.02 }, "Vital organs shut down.", ["haemo", "immune", "oedema"]),
    T("totalorgan", "sym", "Total Organ Failure", 26, { sev: 10, leth: 0.045 }, "Nothing survives this.", ["organ"]),

    // ---- Abilities ----
    T("cold1", "abil", "Cold Resistance 1", 8, { cold: 0.4 }, "Survives in cold countries."),
    T("cold2", "abil", "Cold Resistance 2", 14, { cold: 0.5 }, "Thrives in freezing climates.", ["cold1"]),
    T("heat1", "abil", "Heat Resistance 1", 8, { heat: 0.4 }, "Survives in hot countries."),
    T("heat2", "abil", "Heat Resistance 2", 14, { heat: 0.5 }, "Thrives in scorching climates.", ["heat1"]),
    T("drug1", "abil", "Drug Resistance 1", 10, { rich: 0.12 }, "Medicines stop working in rich countries."),
    T("drug2", "abil", "Drug Resistance 2", 16, { rich: 0.18 }, "Antibiotics are useless.", ["drug1"]),
    T("envhard", "abil", "Environmental Hardening", 20, { cold: 0.3, heat: 0.3, rich: 0.08, poor: 0.08 }, "Survives anywhere.", [], ["cold1", "heat1"]),
    T("hard1", "abil", "Genetic Hardening 1", 15, { cureRes: 0.15 }, "Makes the cure harder to research."),
    T("hard2", "abil", "Genetic Hardening 2", 22, { cureRes: 0.25 }, "Makes the cure much harder to research.", ["hard1"]),
    T("reshuffle", "abil", "Genetic ReShuffle", 20, { cureRes: 0.05 }, "Scrambles your DNA: sets cure research back by 15%.", ["hard1"]),
  ];

  const CATS = [
    { id: "trans", name: "Transmission" },
    { id: "sym", name: "Symptoms" },
    { id: "abil", name: "Abilities" },
  ];

  root.PW = root.PW || {};
  root.PW.GERMS = GERMS;
  root.PW.POINT_BUDGET = POINT_BUDGET;
  root.PW.CUSTOM_ICONS = CUSTOM_ICONS;
  root.PW.CUSTOM_OPTIONS = CUSTOM_OPTIONS;
  root.PW.customConflict = customConflict;
  root.PW.customSpent = customSpent;
  root.PW.buildCustomGerm = buildCustomGerm;
  root.PW.TRAITS = TRAITS;
  root.PW.CATS = CATS;
})(typeof window !== "undefined" ? window : globalThis);
