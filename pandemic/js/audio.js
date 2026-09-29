/* Plague World — sound effects, synthesised with the Web Audio API so the game
 * ships no audio files. The context is created on the first user gesture,
 * because browsers block audio that starts on its own. */
(function (root) {
  const STORE_KEY = "plagueworld.sound";
  let ctx = null;
  let master = null;
  let on = true;
  let recent = [];

  try {
    on = localStorage.getItem(STORE_KEY) !== "off";
  } catch { /* storage unavailable — default to sound on */ }

  function ensure() {
    if (ctx) return ctx;
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.3;
      master.connect(ctx.destination);
    } catch { ctx = null; }
    return ctx;
  }

  // One note. `slide` bends the pitch over the note's life.
  function tone({ freq, dur = 0.12, type = "sine", gain = 0.5, slide = null, delay = 0, attack = 0.008 }) {
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  // Filtered white noise, for pops and whooshes.
  function noise({ dur = 0.1, gain = 0.3, freq = 1200, q = 1, delay = 0, sweep = null }) {
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const frames = Math.ceil(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = "bandpass";
    filt.frequency.setValueAtTime(freq, t);
    filt.Q.value = q;
    if (sweep) filt.frequency.exponentialRampToValueAtTime(sweep, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filt).connect(g).connect(master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  const SOUNDS = {
    click: () => tone({ freq: 520, slide: 380, dur: 0.06, type: "square", gain: 0.18 }),
    back: () => tone({ freq: 380, slide: 260, dur: 0.07, type: "square", gain: 0.16 }),
    pop: () => {
      noise({ dur: 0.05, gain: 0.25, freq: 1400, sweep: 3000, q: 0.8 });
      tone({ freq: 700, slide: 1500, dur: 0.09, type: "triangle", gain: 0.3 });
    },
    infect: () => tone({ freq: 240, slide: 430, dur: 0.16, type: "sine", gain: 0.3 }),
    plague: () => {
      tone({ freq: 180, slide: 320, dur: 0.22, type: "sawtooth", gain: 0.22 });
      tone({ freq: 270, slide: 480, dur: 0.22, type: "sine", gain: 0.2, delay: 0.05 });
    },
    evolve: () => {
      tone({ freq: 440, dur: 0.1, type: "triangle", gain: 0.3 });
      tone({ freq: 660, dur: 0.1, type: "triangle", gain: 0.3, delay: 0.08 });
      tone({ freq: 880, dur: 0.16, type: "triangle", gain: 0.28, delay: 0.16 });
    },
    devolve: () => {
      tone({ freq: 660, dur: 0.1, type: "triangle", gain: 0.25 });
      tone({ freq: 400, dur: 0.14, type: "triangle", gain: 0.25, delay: 0.08 });
    },
    alert: () => {
      tone({ freq: 700, dur: 0.14, type: "square", gain: 0.2 });
      tone({ freq: 560, dur: 0.2, type: "square", gain: 0.2, delay: 0.16 });
    },
    cure: () => {
      tone({ freq: 880, dur: 0.12, type: "sine", gain: 0.24 });
      tone({ freq: 1180, dur: 0.18, type: "sine", gain: 0.22, delay: 0.1 });
    },
    close: () => tone({ freq: 300, slide: 150, dur: 0.18, type: "sawtooth", gain: 0.18 }),
    death: () => tone({ freq: 160, slide: 90, dur: 0.3, type: "sawtooth", gain: 0.22 }),
    win: () => [262, 330, 392, 523].forEach((f, i) =>
      tone({ freq: f, dur: 0.34, type: "triangle", gain: 0.3, delay: i * 0.14 })),
    lose: () => [440, 370, 294, 220].forEach((f, i) =>
      tone({ freq: f, dur: 0.38, type: "sawtooth", gain: 0.24, delay: i * 0.16 })),
  };

  // Busy days can fire many events at once; keep the mix from turning to mush.
  function throttled(name, now) {
    const limit = { infect: 2, pop: 4, death: 1, click: 6 }[name];
    if (!limit) return false;
    recent = recent.filter((r) => now - r.t < 1000);
    if (recent.filter((r) => r.name === name).length >= limit) return true;
    recent.push({ name, t: now });
    return false;
  }

  const audio = {
    get enabled() { return on; },
    // Call from a click handler: browsers only allow audio to start from a gesture.
    unlock() {
      if (!on) return;
      const c = ensure();
      if (c && c.state === "suspended") c.resume().catch(() => {});
    },
    play(name) {
      if (!on || !SOUNDS[name]) return;
      if (throttled(name, performance.now())) return;
      if (!ensure()) return;
      if (ctx.state === "suspended") return; // waiting for the first gesture
      try { SOUNDS[name](); } catch { /* ignore a sound that fails to play */ }
    },
    toggle() {
      on = !on;
      try { localStorage.setItem(STORE_KEY, on ? "on" : "off"); } catch { /* storage unavailable */ }
      if (on) { audio.unlock(); audio.play("click"); }
      return on;
    },
  };

  root.PW = root.PW || {};
  root.PW.audio = audio;
})(typeof window !== "undefined" ? window : globalThis);
