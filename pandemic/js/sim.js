/* Plague World — disease simulation. No DOM access; the UI listens to events. */
(function (root) {
  const TRAITS = () => root.PW.TRAITS;
  const EFF_KEYS = ["inf", "air", "sea", "land", "sev", "leth", "cold", "heat", "rich", "poor", "cureRes"];

  function createSim(world, germ, opts = {}) {
    const rng = opts.rng || Math.random;
    const emit = opts.onEvent || (() => {});
    const C = world.countries;
    const live = C.filter((c) => c.pop > 0);
    const worldPop = live.reduce((s, c) => s + c.pop, 0);

    for (const c of C) {
      c.H = c.pop; c.I = 0; c.D = 0;
      c.aware = 0;
      c.airOpen = c.airports.length > 0;
      c.seaOpen = c.seaports.length > 0;
      c.borderOpen = true;
      c.infectedDay = -1;
      c.deathNoted = false;
      c.collapsed = false;
    }

    const s = {
      germ, world, worldPop,
      day: 0, time: 0, dna: 5 + (germ.startDna || 0),
      owned: new Set(),
      eff: {},
      noticed: false, cure: 0, cureDeployed: false,
      started: false, over: null,
      vehicles: [], nextVehicleId: 1,
      milestones: { inf: 0, dead: 0, cure: 0 },
      totals: { H: worldPop, I: 0, D: 0, infectedCountries: 0 },
    };

    function recomputeEff() {
      const e = Object.fromEntries(EFF_KEYS.map((k) => [k, 0]));
      for (const [k, v] of Object.entries(germ.start || {})) e[k] += v;
      for (const t of TRAITS()) {
        if (!s.owned.has(t.id)) continue;
        for (const [k, v] of Object.entries(t.eff)) e[k] += v;
      }
      s.eff = e;
    }
    recomputeEff();

    // ---------- Evolution ----------
    const trait = (id) => TRAITS().find((t) => t.id === id);
    function cost(t) {
      let n = 0;
      for (const id of s.owned) if (trait(id).cat === t.cat) n++;
      return t.cost + n;
    }
    function unlocked(t) {
      const anyOk = t.req.length === 0 || t.req.some((r) => s.owned.has(r));
      return anyOk && t.reqAll.every((r) => s.owned.has(r));
    }
    function canEvolve(t) { return !s.owned.has(t.id) && unlocked(t) && s.dna >= cost(t) && !s.over; }
    // A trait can't be removed while something you own depends on it.
    function devolveBlocker(t) {
      for (const id of s.owned) {
        const o = trait(id);
        if (o.reqAll.includes(t.id)) return o;
        if (o.req.includes(t.id) && !o.req.some((r) => r !== t.id && s.owned.has(r))) return o;
      }
      return null;
    }
    const DEVOLVE_COST = 2;
    function canDevolve(t) { return s.owned.has(t.id) && t.cat === "sym" && !devolveBlocker(t) && s.dna >= DEVOLVE_COST && !s.over; }
    function evolve(id) {
      const t = trait(id);
      if (!t || !canEvolve(t)) return false;
      s.dna -= cost(t);
      s.owned.add(id);
      if (id === "reshuffle") s.cure = Math.max(0, s.cure - 0.15);
      recomputeEff();
      emit("evolved", { trait: t });
      return true;
    }
    function devolve(id) {
      const t = trait(id);
      if (!t || !canDevolve(t)) return false;
      s.dna -= DEVOLVE_COST;
      s.owned.delete(id);
      recomputeEff();
      emit("devolved", { trait: t });
      return true;
    }
    function addDna(n) { s.dna += n; }

    // ---------- Infection helpers ----------
    function seed(c, n, how) {
      if (c.pop <= 0 || c.H < 1) return;
      const k = Math.min(c.H, n);
      c.H -= k; c.I += k;
      if (c.infectedDay < 0) {
        c.infectedDay = s.day;
        s.totals.infectedCountries++;
        emit("countryInfected", { country: c, how });
        emit("bubble", { country: c, value: 3, kind: "infect" });
      }
    }

    function start(idx) {
      const c = C[idx];
      if (s.started || !c || c.pop <= 0) return false;
      s.started = true;
      seed(c, 1, "start");
      if (germ.noticedAtStart) notice();
      return true;
    }

    function notice() {
      if (s.noticed) return;
      s.noticed = true;
      emit("noticed", {});
    }

    // ---------- Vehicles ----------
    function carryChance(c, kind) {
      if (c.I < 1) return 0;
      const f = c.I / c.pop;
      const e = s.eff, m = germ.mods;
      const bonus = kind === "air" ? e.air : e.sea;
      const mod = kind === "air" ? m.air : m.sea;
      return Math.min(0.95, (0.12 + f * 25) * mod * (1 + bonus));
    }

    function spawn(kind, from, to) {
      const fromC = C[from.country];
      const dist = world.distance(from, to);
      const dur = kind === "air" ? 0.7 + dist * 1.3 : 2.5 + dist * 5;
      const v = {
        id: s.nextVehicleId++, kind, from, to,
        t0: s.time, dur,
        infected: rng() < carryChance(fromC, kind),
        interp: world.interpolate(from, to),
      };
      s.vehicles.push(v);
      emit("vehicle", { vehicle: v });
    }

    const openAirports = () => world.airports.filter((p) => C[p.country].airOpen);
    const pick = (arr) => arr[Math.floor(rng() * arr.length)];

    function spawnFlight(fromList) {
      const open = openAirports();
      const from = pick(fromList || open);
      if (!from) return;
      const dests = open.filter((p) => p.country !== from.country);
      if (dests.length) spawn("air", from, pick(dests));
    }
    function spawnShip(fromList) {
      const from = pick(fromList || world.seaports.filter((p) => C[p.country].seaOpen));
      if (!from) return;
      const dests = world.shipRoutes[from.id].map((j) => world.seaports[j]).filter((p) => C[p.country].seaOpen);
      if (dests.length) spawn("sea", from, pick(dests));
    }

    function updateVehicles() {
      const keep = [];
      for (const v of s.vehicles) {
        if (s.time < v.t0 + v.dur) { keep.push(v); continue; }
        const dest = C[v.to.country];
        if (v.infected && !s.over) seed(dest, 1 + Math.floor(rng() * 3), v.kind === "air" ? "plane" : "ship");
        emit("vehicleArrived", { vehicle: v });
      }
      s.vehicles = keep;
    }

    // ---------- Daily step ----------
    function stepDay() {
      s.day++;
      const e = s.eff, m = germ.mods;
      const sev = e.sev * m.sev;
      const sevNorm = Math.min(1, sev / 40);
      const leth = e.leth * m.leth;
      const tot = s.totals;
      const gI = tot.I / worldPop, gD = tot.D / worldPop;

      // Local growth, deaths, cure.
      for (const c of live) {
        if (c.I <= 0) continue;
        let env = 1;
        if (c.hot) env *= 1 - 0.4 * (1 - Math.min(1, e.heat));
        if (c.cold) env *= 1 - 0.4 * (1 - Math.min(1, e.cold));
        if (c.rich) env *= 0.7 + e.rich;
        else if (c.poor) env *= 1.15 + e.poor;
        else env *= 1 + (e.rich + e.poor) / 2;
        let rate = (0.1 + e.inf) * m.inf * env;
        if (s.cureDeployed) rate *= 0.1;

        // Infection pressure depends on the living share that is still healthy; the floor stops
        // the disease from burning out before it reaches the last few survivors.
        const newI = Math.min(c.H, c.I * rate * Math.max(0.3, c.H / (c.H + c.I)));
        const collapse = c.D / c.pop;
        const deathRate = Math.min(0.5, leth * (1 + 3 * collapse));
        const deaths = c.I * deathRate;
        const healed = s.cureDeployed ? c.I * 0.12 : 0;

        c.H += healed - newI;
        c.I += newI - deaths - healed;
        c.D += deaths;
        // Reanimating germs drag the dead back up, but only while there is still
        // someone healthy to attack — otherwise the outbreak could never end.
        if (germ.reanimate && c.H >= 1 && !s.cureDeployed) {
          const risen = Math.min(c.D, c.D * germ.reanimate);
          c.D -= risen;
          c.I += risen;
        }
        if (c.H < 1 && c.I >= 1) { c.I += c.H; c.H = 0; }
        if (c.I < 1) {
          if (deathRate > 0 && c.H < 1) c.D += c.I; else c.H += c.I;
          c.I = 0;
        }
        if (!c.deathNoted && c.D >= 1) {
          c.deathNoted = true;
          emit("firstDeath", { country: c });
          emit("bubble", { country: c, value: 2, kind: "death" });
        }
        if (!c.collapsed && c.H < 1 && c.I < 1) {
          c.collapsed = true;
          emit("countryDead", { country: c });
        }
      }

      // Land borders.
      for (const c of live) {
        if (c.I < 1) continue;
        const f = c.I / c.pop;
        for (const j of c.neighbors) {
          const n = C[j];
          if (n.I >= 1 || n.H < 1) continue;
          const open = c.borderOpen && n.borderOpen ? 1 : 0.12;
          const p = Math.min(0.5, (0.004 + f * 2) * (1 + e.land) * m.land * open);
          if (rng() < p) seed(n, 1, "land");
        }
      }

      // Stragglers: small boats, tourists, hikers — a slow catch-all so no country is unreachable.
      for (const c of live) {
        if (c.I >= 1 || c.H < 1) continue;
        const open = c.airOpen || c.seaOpen || c.borderOpen ? 1 : 0.4;
        if (rng() < 0.06 * (gI + gD) * open * (1 + (e.air + e.sea) * 0.2)) seed(c, 1, "travel");
      }

      // Planes & ships.
      const flights = 3 + Math.floor(rng() * 3);
      for (let i = 0; i < flights; i++) spawnFlight();
      if (rng() < 0.9) spawnShip();
      for (const c of live) {
        if (c.I < 1) continue;
        const f = c.I / c.pop;
        const busy = Math.min(0.7, 0.1 + f * 4);
        if (c.airOpen && rng() < busy) spawnFlight(c.airports);
        if (c.seaOpen && rng() < busy * 0.6) spawnShip(c.seaports);
      }

      // World notices the disease.
      if (s.started && !s.noticed) {
        const p = sev * 0.002 * Math.log10(1 + tot.I) + (tot.D >= 1 ? 0.5 : 0) + gI * 0.2;
        if (rng() < p) notice();
      }

      // Governments react: awareness rises, then airports, ports and borders close.
      if (s.noticed) {
        for (const c of live) {
          const f = c.I / c.pop, d = c.D / c.pop;
          const wk = c.rich ? 1.6 : c.poor ? 0.6 : 1;
          const gain = 0.002 + f * 0.1 * (0.3 + sevNorm * 3) + d * 2 + gD * 1.5 + gI * sevNorm * 0.1;
          c.aware = Math.min(1, c.aware + gain * wk);
          if (c.airOpen && c.aware > 0.5) { c.airOpen = false; emit("closed", { country: c, what: "airports" }); }
          if (c.seaOpen && c.aware > 0.6) { c.seaOpen = false; emit("closed", { country: c, what: "seaports" }); }
          if (c.borderOpen && c.aware > 0.75) { c.borderOpen = false; if (c.pop > 2e7) emit("closed", { country: c, what: "borders" }); }
        }
      }

      // Cure research.
      if (s.noticed && !s.cureDeployed) {
        let num = 0, den = 0;
        for (const c of live) {
          const w = (c.rich ? 3 : c.poor ? 0.3 : 1) * Math.sqrt(c.pop / 1e6);
          den += w;
          if (c.D / c.pop > 0.8) continue; // collapsed governments do no research
          // Infected scientists keep working unless the symptoms are severe.
          num += w * c.aware * ((c.H + c.I * (1 - sevNorm)) / c.pop);
        }
        const priority = 1 + Math.min(2, gD * 8) + sevNorm;
        s.cure += (0.012 * (num / den) * priority * m.cure) / (1 + e.cureRes * 2);
        const step = Math.floor(s.cure * 4);
        if (step > s.milestones.cure && step < 4) { s.milestones.cure = step; emit("cureProgress", { pct: step * 25 }); }
        if (s.cure >= 1) { s.cure = 1; s.cureDeployed = true; emit("cureDeployed", {}); }
      }

      // Virus mutations.
      if (germ.mutates && s.started && rng() < 0.025) {
        const options = TRAITS().filter((t) => t.cat === "sym" && !s.owned.has(t.id) && unlocked(t) && t.cost <= 12);
        if (options.length) {
          const t = pick(options);
          s.owned.add(t.id);
          recomputeEff();
          emit("mutation", { trait: t });
        }
      }

      // Random DNA bubbles from infected countries.
      const infected = live.filter((c) => c.I >= 1);
      if (infected.length && rng() < 0.12 + Math.min(0.25, infected.length * 0.01)) {
        emit("bubble", { country: pick(infected), value: 2, kind: "random" });
      }

      recount();

      // Passive DNA for milestones.
      const infM = tot.I >= 1 ? Math.floor(Math.log2(tot.I)) : 0;
      if (infM > s.milestones.inf) { s.dna += infM - s.milestones.inf; s.milestones.inf = infM; }
      const deadM = tot.D >= 1 ? Math.floor(Math.log10(tot.D)) : 0;
      if (deadM > s.milestones.dead) { s.dna += 2 * (deadM - s.milestones.dead); s.milestones.dead = deadM; }

      checkOver();
    }

    function recount() {
      let H = 0, I = 0, D = 0;
      for (const c of live) { H += c.H; I += c.I; D += c.D; }
      Object.assign(s.totals, { H, I, D });
    }

    function checkOver() {
      if (!s.started || s.over) return;
      const t = s.totals;
      if (t.H < 1 && t.I < 1) end(true, "Every last human is gone.");
      else if (t.I < 1) end(false, s.cureDeployed ? "The cure wiped out your disease." : "Your disease died out.");
    }

    function end(win, reason) {
      s.over = { win, reason };
      emit("over", s.over);
    }

    // Advance the simulation by dtDays (fractions allowed; vehicles move smoothly).
    function advance(dtDays) {
      if (!s.started || s.over) return;
      const target = s.time + dtDays;
      while (!s.over && Math.floor(target) > Math.floor(s.time)) {
        s.time = Math.floor(s.time) + 1;
        updateVehicles();
        stepDay();
      }
      if (!s.over) { s.time = target; updateVehicles(); }
    }

    return {
      state: s,
      start, advance, evolve, devolve, addDna,
      cost, unlocked, canEvolve, canDevolve, devolveBlocker,
      carryChance,
    };
  }

  root.PW = root.PW || {};
  root.PW.createSim = createSim;
})(typeof window !== "undefined" ? window : globalThis);
