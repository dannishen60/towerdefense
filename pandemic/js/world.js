/* Plague World — builds the playable world from the TopoJSON map. */
(function (root) {
  function buildWorld(topo, landTopo, d3, topojson) {
    const { POP, RICH, POOR, RENAME, AIRPORTS, SEAPORTS } = root.PW.data;
    const geoms = topo.objects.countries.geometries;
    const features = topojson.feature(topo, topo.objects.countries).features;
    const neighbors = topojson.neighbors(geoms);

    const countries = features.map((f, i) => {
      const raw = f.properties.name;
      const popM = raw in POP ? POP[raw] : 0.05;
      const [lon, lat] = mainCentroid(f, d3);
      return {
        idx: i,
        key: raw,
        name: RENAME[raw] || raw,
        feature: f,
        pop: Math.round(popM * 1e6),
        rich: RICH.has(raw),
        poor: POOR.has(raw),
        hot: Math.abs(lat) < 23.5,
        cold: Math.abs(lat) > 48,
        lon, lat,
        neighbors: [],
        airports: [],
        seaports: [],
      };
    });
    countries.forEach((c, i) => {
      c.neighbors = neighbors[i].filter((j) => countries[j].pop > 0 && j !== i);
    });

    const byKey = new Map(countries.map((c) => [c.key, c]));
    const mkPort = (kind) => ([key, city, lon, lat], id) => {
      const c = byKey.get(key);
      if (!c) throw new Error("Unknown country for port: " + key);
      const p = { id, kind, city, lon, lat, country: c.idx };
      (kind === "air" ? c.airports : c.seaports).push(p);
      return p;
    };
    const airports = AIRPORTS.map(mkPort("air"));
    const seaports = SEAPORTS.map(mkPort("sea"));

    return {
      countries,
      airports,
      seaports,
      shipRoutes: root.PW.SHIP_ROUTES && root.PW.SHIP_ROUTES.length === seaports.length
        ? root.PW.SHIP_ROUTES
        : buildShipRoutes(seaports, landTopo, d3, topojson),
      distance: (a, b) => d3.geoDistance([a.lon, a.lat], [b.lon, b.lat]),
      interpolate: (a, b) => d3.geoInterpolate([a.lon, a.lat], [b.lon, b.lat]),
    };
  }

  // Centroid of the largest polygon, so e.g. the USA's marker isn't pulled toward Alaska.
  function mainCentroid(f, d3) {
    const g = f.geometry;
    if (!g) return [0, 0];
    if (g.type !== "MultiPolygon") return d3.geoCentroid(f);
    let best = null, bestArea = -1;
    for (const coords of g.coordinates) {
      const poly = { type: "Polygon", coordinates: coords };
      const a = d3.geoArea(poly);
      if (a > bestArea) { bestArea = a; best = poly; }
    }
    return d3.geoCentroid(best);
  }

  // Ships only sail between ports whose great-circle path stays at sea.
  // This is slow (seconds), so js/routes.js holds a precomputed copy made by
  // tools/gen-routes.js; it is only recomputed here if the port list changed.
  // Ports left with too few routes get their nearest ports as a fallback.
  function buildShipRoutes(ports, landTopo, d3, topojson) {
    const land = topojson.feature(landTopo, landTopo.objects.land);
    const routes = ports.map(() => []);
    for (let i = 0; i < ports.length; i++) {
      for (let j = i + 1; j < ports.length; j++) {
        if (ports[i].country === ports[j].country) continue;
        const interp = d3.geoInterpolate([ports[i].lon, ports[i].lat], [ports[j].lon, ports[j].lat]);
        let clear = true;
        for (let k = 1; k < 16 && clear; k++) {
          const t = 0.06 + (0.88 * k) / 16;
          if (d3.geoContains(land, interp(t))) clear = false;
        }
        if (clear) { routes[i].push(j); routes[j].push(i); }
      }
    }
    ports.forEach((p, i) => {
      if (routes[i].length >= 3) return;
      const near = ports
        .map((q, j) => ({ j, d: d3.geoDistance([p.lon, p.lat], [q.lon, q.lat]) }))
        .filter((o) => ports[o.j].country !== p.country && !routes[i].includes(o.j))
        .sort((a, b) => a.d - b.d)
        .slice(0, 3 - routes[i].length);
      for (const { j } of near) { routes[i].push(j); routes[j].push(i); }
    });
    return routes;
  }

  root.PW = root.PW || {};
  root.PW.buildWorld = buildWorld;
  root.PW.buildShipRoutes = buildShipRoutes;
})(typeof window !== "undefined" ? window : globalThis);
