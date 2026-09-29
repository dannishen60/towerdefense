/* Plague World — screens, map rendering and input. */
(function () {
  const { GERMS, TRAITS, CATS, createSim, buildWorld,
          CUSTOM_OPTIONS, CUSTOM_ICONS, POINT_BUDGET, buildCustomGerm, customSpent, customConflict } = window.PW;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  const DAY_MS = [Infinity, 700, 330, 140]; // by speed setting
  const BUBBLE_MS = 11000;
  const MAX_BUBBLES = 8;
  const COLORS = { land: "#6b8a78", empty: "#3a4750", infected: "#e3262e", dead: "#141414" };

  // ---------- Unlocks (saved per browser) ----------
  const STORE_KEY = "plagueworld.unlocked";
  function loadUnlocked() {
    if (new URLSearchParams(location.search).has("unlockall")) return GERMS.length - 1;
    try { return Math.max(0, Math.min(GERMS.length - 1, parseInt(localStorage.getItem(STORE_KEY), 10) || 0)); }
    catch { return 0; }
  }
  function saveUnlocked(n) { try { localStorage.setItem(STORE_KEY, String(n)); } catch { /* storage unavailable */ } }
  let unlocked = loadUnlocked();

  // ---------- App state ----------
  let world = null;         // built once
  let sim = null;           // per game
  let germ = GERMS[0];
  let diseaseName = "";
  let phase = "pick";       // pick | play | over
  let speed = 1, speedBeforeModal = 1;
  let selected = null;
  let lastDay = -1;

  // ---------- Screens ----------
  function show(id) {
    $$(".screen").forEach((s) => s.classList.toggle("active", s.id === id));
  }
  $$("[data-back]").forEach((b) => b.addEventListener("click", () => show(b.dataset.back)));

  $("#btn-start").addEventListener("click", () => { renderGerms(); show("screen-germ"); });

  function germCard(icon, name, desc, opts) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "germ" + (opts.locked ? " locked" : "") + (opts.selected ? " selected" : "") + (opts.build ? " build" : "");
    b.disabled = !!opts.locked;
    b.innerHTML = `<span class="germ-icon"></span><span class="germ-name"></span><span class="germ-desc"></span>`;
    b.querySelector(".germ-icon").textContent = icon;
    b.querySelector(".germ-name").textContent = name;
    b.querySelector(".germ-desc").textContent = desc;
    b.addEventListener("click", opts.onClick);
    return b;
  }

  function renderGerms() {
    const grid = $("#germ-grid");
    grid.innerHTML = "";
    GERMS.forEach((g, i) => {
      const locked = i > unlocked;
      grid.appendChild(germCard(locked ? "🔒" : g.icon, g.name,
        locked ? `Win with ${GERMS[i - 1].name} to unlock` : g.desc,
        { locked, selected: g.id === germ.id && !germ.custom, onClick: () => { germ = g; renderGerms(); } }));
    });
    grid.appendChild(germCard(custom.icon, "Build your own",
      "Design a germ from scratch: spend points on powers and weaknesses.",
      { build: true, selected: germ.custom, onClick: () => { renderBuilder(); show("screen-custom"); } }));
  }

  // ---------- Germ builder ----------
  const BUILD_KEY = "plagueworld.custom";
  const custom = { chosen: new Set(), icon: CUSTOM_ICONS[7], name: "" };
  try {
    const saved = JSON.parse(localStorage.getItem(BUILD_KEY) || "null");
    if (saved) {
      const valid = saved.chosen.filter((id) => CUSTOM_OPTIONS.some((o) => o.id === id));
      if (customSpent(new Set(valid)) <= POINT_BUDGET) custom.chosen = new Set(valid);
      if (CUSTOM_ICONS.includes(saved.icon)) custom.icon = saved.icon;
      custom.name = (saved.name || "").slice(0, 18);
    }
  } catch { /* storage unavailable or corrupt — start from the default build */ }
  function saveBuild() {
    try {
      localStorage.setItem(BUILD_KEY, JSON.stringify({ chosen: [...custom.chosen], icon: custom.icon, name: custom.name }));
    } catch { /* storage unavailable */ }
  }

  function renderBuilder() {
    const left = POINT_BUDGET - customSpent(custom.chosen);
    $("#points-left").textContent = left;
    $("#points-fill").style.width = (100 * Math.max(0, left)) / POINT_BUDGET + "%";
    $("#custom-name").value = custom.name;

    const icons = $("#icon-row");
    icons.innerHTML = "";
    for (const ic of CUSTOM_ICONS) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "icon-pick" + (ic === custom.icon ? " sel" : "");
      b.textContent = ic;
      b.title = "Use this look";
      b.addEventListener("click", () => { custom.icon = ic; saveBuild(); renderBuilder(); });
      icons.appendChild(b);
    }

    for (const [sel, drawback] of [["#power-grid", false], ["#weak-grid", true]]) {
      const grid = $(sel);
      grid.innerHTML = "";
      for (const o of CUSTOM_OPTIONS.filter((x) => !!x.drawback === drawback)) {
        const on = custom.chosen.has(o.id);
        const clash = on ? null : customConflict(o.id, custom.chosen);
        const tooDear = !on && o.cost > left;
        const b = document.createElement("button");
        b.type = "button";
        b.className = "opt" + (on ? " on" : "") + (drawback ? " drawback" : "");
        b.disabled = !on && (!!clash || tooDear);
        b.setAttribute("aria-pressed", String(on));
        b.innerHTML = `<span class="opt-top"><span class="opt-name"></span><span class="opt-cost"></span></span><span class="opt-desc"></span>`;
        b.querySelector(".opt-name").textContent = o.name;
        b.querySelector(".opt-cost").textContent = o.cost < 0 ? `+${-o.cost} pts` : `${o.cost} pts`;
        b.querySelector(".opt-desc").textContent = clash ? `Doesn't go with ${clash.name}.` : tooDear ? `Not enough points left.` : o.desc;
        b.addEventListener("click", () => {
          if (on) custom.chosen.delete(o.id); else custom.chosen.add(o.id);
          saveBuild();
          renderBuilder();
        });
        grid.appendChild(b);
      }
    }
  }

  $("#custom-name").addEventListener("input", (e) => { custom.name = e.target.value; saveBuild(); });
  $("#btn-custom-reset").addEventListener("click", () => { custom.chosen.clear(); custom.name = ""; saveBuild(); renderBuilder(); });
  $("#btn-custom-next").addEventListener("click", () => {
    germ = buildCustomGerm(custom.chosen, custom.icon, custom.name.trim());
    goToNaming();
  });

  function goToNaming() {
    $("#name-germ-icon").textContent = germ.icon;
    show("screen-name");
    setTimeout(() => $("#disease-name").focus(), 50);
  }

  $("#btn-germ-next").addEventListener("click", () => {
    if (germ.custom) { renderBuilder(); show("screen-custom"); return; }
    goToNaming();
  });

  $("#name-form").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    diseaseName = $("#disease-name").value.trim() || "Mystery " + germ.name;
    await ensureWorld();
    newGame();
    show("screen-game");
  });

  // ---------- Loading the world ----------
  async function ensureWorld() {
    if (world) return;
    $("#loading").classList.remove("hidden");
    const [topo, land] = await Promise.all([
      fetch("data/countries-50m.json").then((r) => r.json()),
      fetch("data/land-110m.json").then((r) => r.json()),
    ]);
    world = buildWorld(topo, land, d3, topojson);
    initMap();
    $("#loading").classList.add("hidden");
  }

  // ---------- Map ----------
  let svg, gRoot, gCountries, gPorts, gVehicles, gBubbles, projection, zoom;
  let W = 1000, H = 520, zoomK = 1;
  const countryPaths = [];
  const vehicleEls = new Map();
  let bubbles = [];

  function initMap() {
    const fc = { type: "FeatureCollection", features: world.countries.filter((c) => c.key !== "Antarctica").map((c) => c.feature) };
    projection = d3.geoNaturalEarth1().fitWidth(W, fc);
    const path = d3.geoPath(projection);
    H = Math.ceil(path.bounds(fc)[1][1]) + 4;

    svg = d3.select("#map").attr("viewBox", `0 0 ${W} ${H}`).attr("preserveAspectRatio", "xMidYMid meet");
    svg.append("rect").attr("class", "ocean").attr("width", W).attr("height", H);
    gRoot = svg.append("g");
    gCountries = gRoot.append("g").attr("class", "countries");
    gPorts = gRoot.append("g").attr("class", "ports");
    gVehicles = gRoot.append("g").attr("class", "vehicles");
    gBubbles = gRoot.append("g").attr("class", "bubbles");

    for (const c of world.countries) {
      if (c.key === "Antarctica") continue;
      const p = gCountries.append("path")
        .attr("d", path(c.feature))
        .attr("class", "country" + (c.pop > 0 ? "" : " empty"))
        .on("click", () => selectCountry(c));
      p.append("title").text(c.name);
      countryPaths[c.idx] = p;
      [c.x, c.y] = projection([c.lon, c.lat]);
    }

    const portGlyph = { air: "✈", sea: "⚓" };
    for (const p of [...world.airports, ...world.seaports]) {
      [p.x, p.y] = projection([p.lon, p.lat]);
      p.el = gPorts.append("g").attr("class", "port " + p.kind);
      p.el.append("circle").attr("r", 5.5);
      p.el.append("text").attr("text-anchor", "middle").attr("dy", "0.35em").text(portGlyph[p.kind]);
      p.el.append("title").text(`${p.kind === "air" ? "Airport" : "Seaport"} — ${p.city}`);
    }

    zoom = d3.zoom().scaleExtent([1, 12]).translateExtent([[0, 0], [W, H]]).on("zoom", (e) => {
      zoomK = e.transform.k;
      gRoot.attr("transform", e.transform);
      placeIcons();
    });
    svg.call(zoom).on("dblclick.zoom", null);
    $("#zoom-in").addEventListener("click", () => svg.transition().duration(250).call(zoom.scaleBy, 1.6));
    $("#zoom-out").addEventListener("click", () => svg.transition().duration(250).call(zoom.scaleBy, 1 / 1.6));
    $("#zoom-reset").addEventListener("click", () => svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity));
  }

  function iconTransform(x, y, rot) {
    return `translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${(1 / Math.sqrt(zoomK)).toFixed(3)})${rot ? ` rotate(${rot.toFixed(0)})` : ""}`;
  }
  function placeIcons() {
    for (const p of [...world.airports, ...world.seaports]) p.el.attr("transform", iconTransform(p.x, p.y));
    for (const b of bubbles) b.el.attr("transform", iconTransform(b.x, b.y));
    moveVehicles();
  }

  function colorFor(c) {
    if (c.pop <= 0) return COLORS.empty;
    const fi = c.I / c.pop, fd = c.D / c.pop;
    let col = COLORS.land;
    if (fi > 0) col = d3.interpolateRgb(COLORS.land, COLORS.infected)(Math.min(1, 0.2 + 0.8 * Math.sqrt(fi)));
    if (fd > 0) col = d3.interpolateRgb(col, COLORS.dead)(Math.min(1, fd * 1.05));
    return col;
  }

  function paintMap() {
    for (const c of world.countries) {
      const p = countryPaths[c.idx];
      if (p) p.attr("fill", colorFor(c)).classed("selected", c === selected);
    }
    for (const p of world.airports) p.el.classed("closed", !world.countries[p.country].airOpen);
    for (const p of world.seaports) p.el.classed("closed", !world.countries[p.country].seaOpen);
  }

  // ---------- Vehicles ----------
  const PLANE = "M7,0 L-3,-1.6 L-4,-6 L-6,-6 L-5,-1.4 L-8,-1 L-9,-3 L-10,-3 L-9.5,0 L-10,3 L-9,3 L-8,1 L-5,1.4 L-6,6 L-4,6 L-3,1.6 Z";
  const SHIP = "M-7,-1 L7,-1 L5,3 L-5,3 Z M-3,-1 L-3,-5 L2,-5 L2,-1 Z";

  function addVehicle(v) {
    const g = gVehicles.append("g").attr("class", "vehicle " + v.kind + (v.infected ? " infected" : ""));
    g.append("path").attr("d", v.kind === "air" ? PLANE : SHIP);
    vehicleEls.set(v.id, g);
  }
  function moveVehicles() {
    if (!sim) return;
    const t = sim.state.time;
    for (const v of sim.state.vehicles) {
      const g = vehicleEls.get(v.id);
      if (!g) continue;
      const k = Math.max(0, Math.min(1, (t - v.t0) / v.dur));
      const [x, y] = projection(v.interp(k));
      let rot = 0;
      if (v.kind === "air") {
        const [x2, y2] = projection(v.interp(Math.min(1, k + 0.01)));
        if (Math.abs(x2 - x) < 100) rot = (Math.atan2(y2 - y, x2 - x) * 180) / Math.PI;
      }
      g.attr("transform", iconTransform(x, y, rot));
    }
  }
  function removeVehicle(v) {
    const g = vehicleEls.get(v.id);
    if (g) g.remove();
    vehicleEls.delete(v.id);
  }

  // ---------- DNA bubbles ----------
  function addBubble(c, value, kind) {
    if (bubbles.length >= MAX_BUBBLES) {
      if (kind === "random") return;
      bubbles.shift().el.remove();
    }
    const jitter = () => (Math.random() - 0.5) * 14;
    const b = { x: c.x + jitter(), y: c.y + jitter(), value, age: 0 };
    b.el = gBubbles.append("g").attr("class", "bubble " + kind);
    b.el.append("circle").attr("r", 9);
    b.el.append("text").attr("text-anchor", "middle").attr("dy", "0.35em").text("+" + value);
    b.el.on("click", (ev) => {
      ev.stopPropagation();
      sim.addDna(b.value);
      popBubble(b);
      updateHud();
    });
    b.el.attr("transform", iconTransform(b.x, b.y));
    bubbles.push(b);
  }
  function popBubble(b) {
    bubbles = bubbles.filter((o) => o !== b);
    b.el.classed("popped", true);
    setTimeout(() => b.el.remove(), 250);
  }

  // ---------- News ----------
  const newsQueue = [];
  let newsShownAt = 0;
  function news(msg, important) {
    if (important) newsQueue.unshift(msg); else newsQueue.push(msg);
    if (newsQueue.length > 5) newsQueue.splice(important ? 5 : 0, 1);
  }
  function tickNews(now) {
    if (!newsQueue.length || now - newsShownAt < 2200) return;
    const el = $("#news-text");
    el.textContent = newsQueue.shift();
    el.classList.remove("flash");
    void el.offsetWidth;
    el.classList.add("flash");
    newsShownAt = now;
  }

  // ---------- Sim events ----------
  function onEvent(type, d) {
    const c = d && d.country;
    switch (type) {
      case "vehicle": addVehicle(d.vehicle); break;
      case "vehicleArrived": removeVehicle(d.vehicle); break;
      case "bubble": addBubble(c, d.value, d.kind); break;
      case "countryInfected":
        if (d.how === "start") news(`Patient zero: ${diseaseName} begins in ${c.name}.`, true);
        else if (d.how === "plane") news(`✈ An infected passenger landed in ${c.name}.`);
        else if (d.how === "ship") news(`⚓ Infected sailors came ashore in ${c.name}.`);
        else if (d.how === "land") { if (c.pop > 5e6) news(`${diseaseName} crossed the border into ${c.name}.`); }
        else if (c.pop > 1e6) news(`Travellers carried ${diseaseName} to ${c.name}.`);
        break;
      case "noticed": {
        const top = world.countries.reduce((a, b) => (b.I > a.I ? b : a));
        news(`🔬 Doctors in ${top.name} report a strange new ${germ.name.toLowerCase()}: "${diseaseName}".`, true);
        break;
      }
      case "firstDeath":
        if (sim.state.totals.D < 5) news(`☠ First deaths from ${diseaseName} reported in ${c.name}.`, true);
        break;
      case "closed":
        if (c.pop > 2e6) news(`🚫 ${c.name} closes its ${d.what}.`);
        break;
      case "countryDead":
        if (c.pop > 1e6) news(`☠ ${c.name} has fallen silent.`);
        break;
      case "mutation": news(`🧬 ${diseaseName} mutated and gained ${d.trait.name}!`, true); break;
      case "cureProgress": news(`💉 Cure research is ${d.pct}% complete.`, true); break;
      case "cureDeployed": news(`💉 The cure is complete and being given out worldwide!`, true); break;
      case "over": setTimeout(() => showOver(d), 900); break;
    }
  }

  // ---------- Game lifecycle ----------
  function newGame() {
    for (const g of vehicleEls.values()) g.remove();
    vehicleEls.clear();
    bubbles.forEach((b) => b.el.remove());
    bubbles = [];
    newsQueue.length = 0;
    sim = createSim(world, germ, { onEvent });
    phase = "pick";
    selected = null;
    lastDay = -1;
    setSpeed(1);
    $("#hud-name").textContent = diseaseName;
    $("#hud-icon").textContent = germ.icon;
    $("#news-text").textContent = "Choose a country to start your infection.";
    $("#pick-banner").classList.remove("hidden");
    $("#country-info").classList.add("hidden");
    $("#over").classList.add("hidden");
    $("#evo").classList.add("hidden");
    svg.call(zoom.transform, d3.zoomIdentity);
    paintMap();
    updateHud();
  }

  function selectCountry(c) {
    selected = c.pop > 0 ? c : null;
    paintMap();
    renderCountryInfo();
  }

  function renderCountryInfo() {
    const box = $("#country-info");
    if (!selected) { box.classList.add("hidden"); return; }
    const c = selected;
    box.classList.remove("hidden");
    const tags = [c.rich ? "Wealthy" : c.poor ? "Poor" : "Developing", c.hot ? "Hot" : c.cold ? "Cold" : "Mild"];
    const status = (open, has, label) => has ? `<span class="${open ? "ok" : "bad"}">${label} ${open ? "open" : "closed"}</span>` : "";
    box.innerHTML = `
      <button type="button" class="btn-icon close" title="Close">✕</button>
      <h3></h3>
      <div class="tags">${tags.map((t) => `<span>${t}</span>`).join("")}</div>
      <div class="ci-row"><span>Population</span><b>${fmt(c.pop)}</b></div>
      <div class="ci-row"><span>Healthy</span><b class="t-ok">${fmt(c.H)}</b></div>
      <div class="ci-row"><span>Infected</span><b class="t-inf">${fmt(c.I)}</b></div>
      <div class="ci-row"><span>Dead</span><b class="t-dead">${fmt(c.D)}</b></div>
      <div class="ports-status">${status(c.airOpen, c.airports.length, "✈ Airports")}${status(c.seaOpen, c.seaports.length, "⚓ Ports")}${status(c.borderOpen, c.neighbors.length, "Borders")}</div>
      ${phase === "pick" ? `<button type="button" class="btn btn-big btn-infect">Start infection here</button>` : ""}`;
    box.querySelector("h3").textContent = c.name;
    box.querySelector(".close").addEventListener("click", () => { selected = null; paintMap(); renderCountryInfo(); });
    const inf = box.querySelector(".btn-infect");
    if (inf) inf.addEventListener("click", () => startInfection(c));
  }

  function startInfection(c) {
    if (!sim.start(c.idx)) return;
    phase = "play";
    $("#pick-banner").classList.add("hidden");
    paintMap();
    renderCountryInfo();
    updateHud();
  }

  function setSpeed(n) {
    speed = n;
    $$("[data-speed]").forEach((b) => b.classList.toggle("active", Number(b.dataset.speed) === n));
  }
  $$("[data-speed]").forEach((b) => b.addEventListener("click", () => setSpeed(Number(b.dataset.speed))));
  document.addEventListener("keydown", (e) => {
    if (!$("#screen-game").classList.contains("active") || e.target.tagName === "INPUT") return;
    if (e.key === " ") {
      e.preventDefault();
      if (speed > 0) { speedBeforeModal = speed; setSpeed(0); } else setSpeed(speedBeforeModal || 1);
    }
    else if (["1", "2", "3"].includes(e.key)) setSpeed(Number(e.key));
    else if (e.key === "e" || e.key === "E") toggleEvo();
    else if (e.key === "Escape") closeModal("evo");
  });

  // ---------- HUD ----------
  function fmt(n) {
    n = Math.round(n);
    if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
    if (n >= 1e4) return (n / 1e3).toFixed(0) + "K";
    return n.toLocaleString();
  }

  const START_DATE = new Date(2026, 0, 1);
  function updateHud() {
    const s = sim.state, t = s.totals, P = s.worldPop;
    $("#hud-dna").textContent = s.dna;
    $("#st-healthy").textContent = fmt(t.H);
    $("#st-infected").textContent = fmt(t.I);
    $("#st-dead").textContent = fmt(t.D);
    $("#bar-healthy").style.width = (100 * t.H) / P + "%";
    $("#bar-infected").style.width = (100 * t.I) / P + "%";
    $("#bar-dead").style.width = (100 * t.D) / P + "%";
    $("#cure-fill").style.width = s.cure * 100 + "%";
    $("#cure-pct").textContent = s.noticed ? (s.cure * 100).toFixed(1) + "%" : "Not started";
    const d = new Date(START_DATE); d.setDate(d.getDate() + s.day);
    $("#hud-date").textContent = s.started ? `Day ${s.day} · ${d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}` : "Day 0";
    $("#btn-evolve").classList.toggle("pulse", phase === "play" && TRAITS.some((tr) => sim.canEvolve(tr)));
    if (!$("#evo").classList.contains("hidden")) renderEvo();
  }

  // ---------- Evolution ----------
  let evoCat = "trans", evoSel = null;
  $("#btn-evolve").addEventListener("click", () => toggleEvo());
  $$("[data-close]").forEach((b) => b.addEventListener("click", () => closeModal(b.dataset.close)));
  $("#evo").addEventListener("click", (e) => { if (e.target.id === "evo") closeModal("evo"); });

  function toggleEvo() {
    if (!sim || phase === "over") return;
    const m = $("#evo");
    if (!m.classList.contains("hidden")) return closeModal("evo");
    speedBeforeModal = speed || 1;
    setSpeed(0);
    m.classList.remove("hidden");
    renderEvo();
  }
  function closeModal(id) {
    const m = $("#" + id);
    if (m.classList.contains("hidden")) return;
    m.classList.add("hidden");
    if (id === "evo" && phase !== "over") setSpeed(speedBeforeModal || 1);
  }

  const EFF_LABELS = {
    inf: "Infectivity", air: "Plane spread", sea: "Ship spread", land: "Border spread", sev: "Severity",
    leth: "Lethality", cold: "Cold resistance", heat: "Heat resistance", rich: "Wealthy countries",
    poor: "Poor countries", cureRes: "Cure resistance",
  };

  function renderEvo() {
    const s = sim.state, e = s.eff, m = germ.mods;
    $("#evo-dna").textContent = s.dna;
    $("#m-inf").style.width = Math.min(100, ((0.1 + e.inf) * m.inf * 100) / 0.6) + "%";
    $("#m-sev").style.width = Math.min(100, (e.sev * m.sev * 100) / 60) + "%";
    $("#m-leth").style.width = Math.min(100, (e.leth * m.leth * 100) / 0.12) + "%";

    const tabs = $("#evo-tabs");
    tabs.innerHTML = "";
    for (const cat of CATS) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tab" + (cat.id === evoCat ? " active" : "");
      b.textContent = cat.name;
      b.addEventListener("click", () => { evoCat = cat.id; evoSel = null; renderEvo(); });
      tabs.appendChild(b);
    }

    const grid = $("#evo-grid");
    grid.innerHTML = "";
    for (const t of TRAITS.filter((x) => x.cat === evoCat)) {
      const owned = s.owned.has(t.id);
      const open = sim.unlocked(t);
      const b = document.createElement("button");
      b.type = "button";
      b.className = "trait" + (owned ? " owned" : open ? (sim.canEvolve(t) ? " ready" : " open") : " locked") + (evoSel === t.id ? " sel" : "");
      b.innerHTML = `<span class="tn"></span><span class="tc">${owned ? "✔" : open ? "🧬" + sim.cost(t) : "🔒"}</span>`;
      b.querySelector(".tn").textContent = t.name;
      b.addEventListener("click", () => { evoSel = t.id; renderEvo(); });
      grid.appendChild(b);
    }

    const det = $("#evo-detail");
    const t = TRAITS.find((x) => x.id === evoSel);
    if (!t) { det.innerHTML = `<p class="hint">Pick a trait to see what it does.<br><br>Collect 🧬 DNA by clicking the red bubbles that pop up on infected countries.</p>`; return; }
    const owned = s.owned.has(t.id);
    const reqNames = (ids) => ids.map((id) => TRAITS.find((x) => x.id === id).name);
    let reqText = "";
    if (t.req.length) reqText += `Needs ${t.req.length > 1 ? "one of: " : ""}${reqNames(t.req).join(", ")}. `;
    if (t.reqAll.length) reqText += `Needs all of: ${reqNames(t.reqAll).join(", ")}.`;
    det.innerHTML = `<h3></h3><p class="desc"></p>
      <ul class="effects">${Object.entries(t.eff).map(([k, v]) => `<li>+ ${EFF_LABELS[k]}${k === "sev" ? " " + v : ""}</li>`).join("")}</ul>
      ${reqText ? `<p class="req">${reqText}</p>` : ""}
      <div class="detail-actions"></div>`;
    det.querySelector("h3").textContent = t.name;
    det.querySelector(".desc").textContent = t.desc;
    const actions = det.querySelector(".detail-actions");
    if (!owned) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn";
      b.textContent = `Evolve (🧬 ${sim.cost(t)})`;
      b.disabled = !sim.canEvolve(t);
      b.addEventListener("click", () => { if (sim.evolve(t.id)) { renderEvo(); updateHud(); } });
      actions.appendChild(b);
    } else if (t.cat === "sym") {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn btn-ghost";
      const blocker = sim.devolveBlocker(t);
      b.textContent = blocker ? `Needed by ${blocker.name}` : "Devolve (🧬 2)";
      b.disabled = !sim.canDevolve(t);
      b.addEventListener("click", () => { if (sim.devolve(t.id)) { renderEvo(); updateHud(); } });
      actions.appendChild(b);
    } else {
      actions.innerHTML = `<span class="ok">Evolved ✔</span>`;
    }
  }

  // ---------- Game over ----------
  function showOver(o) {
    phase = "over";
    setSpeed(0);
    $("#evo").classList.add("hidden");
    const s = sim.state;
    $("#over-icon").textContent = o.win ? "☠️" : "💉";
    $("#over-title").textContent = o.win ? `${diseaseName} wiped out humanity!` : `${diseaseName} was defeated`;
    $("#over-reason").textContent = o.reason;
    $("#over-stats").innerHTML = `
      <div><span>Days</span><b>${s.day}</b></div>
      <div><span>Dead</span><b>${fmt(s.totals.D)}</b></div>
      <div><span>Countries reached</span><b>${s.totals.infectedCountries}</b></div>
      <div><span>Cure</span><b>${(s.cure * 100).toFixed(0)}%</b></div>`;
    const idx = GERMS.findIndex((g) => g.id === germ.id);
    let msg = "";
    if (o.win && germ.custom) {
      msg = "Custom germs don't unlock anything — beat the listed germs in order for that.";
    } else if (o.win && idx === unlocked && unlocked < GERMS.length - 1) {
      unlocked++;
      saveUnlocked(unlocked);
      msg = `🔓 New germ unlocked: ${GERMS[unlocked].icon} ${GERMS[unlocked].name}!`;
    } else if (!o.win) {
      msg = "Tip: spread everywhere before adding deadly symptoms, and buy Genetic Hardening to slow the cure.";
    }
    $("#over-unlock").textContent = msg;
    $("#over").classList.remove("hidden");
  }
  $("#btn-again").addEventListener("click", () => {
    $("#over").classList.add("hidden");
    renderGerms();
    show("screen-germ");
  });

  // ---------- Main loop ----------
  let prev = performance.now();
  function frame(now) {
    const dt = Math.min(100, now - prev);
    prev = now;
    if (sim && phase === "play" && speed > 0) {
      sim.advance(dt / DAY_MS[speed]);
      moveVehicles();
      for (const b of [...bubbles]) {
        b.age += dt;
        if (b.age > BUBBLE_MS) popBubble(b);
        else b.el.classed("fading", b.age > BUBBLE_MS - 2500);
      }
      if (sim.state.day !== lastDay) {
        lastDay = sim.state.day;
        paintMap();
        updateHud();
        if (selected) renderCountryInfo();
      }
    }
    tickNews(now);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
