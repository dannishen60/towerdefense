/**
 * Web Audio–based SFX (no external files). Resumes after user gesture.
 */
(function () {
  const LS_MUTE = "td_sound_muted_v1";
  let audioCtx = null;

  function ctxReady() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function isMuted() {
    return localStorage.getItem(LS_MUTE) === "1";
  }

  function setMuted(m) {
    localStorage.setItem(LS_MUTE, m ? "1" : "0");
    window.gameSoundMuted = m;
  }

  window.gameSoundMuted = isMuted();

  /** @returns {boolean} true if sound is now on */
  window.toggleGameSound = function () {
    const nextMuted = !isMuted();
    setMuted(nextMuted);
    return !nextMuted;
  };

  window.isGameSoundMuted = isMuted;

  window.initGameAudio = function () {
    ctxReady();
  };

  function tone(freq, dur, vol, type, freqEnd) {
    if (window.gameSoundMuted) return;
    const c = ctxReady();
    if (!c) return;
    const t0 = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t0);
    if (freqEnd != null) {
      o.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), t0 + dur);
    }
    const v = vol ?? 0.07;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  function noiseBurst(dur, vol) {
    if (window.gameSoundMuted) return;
    const c = ctxReady();
    if (!c) return;
    const t0 = c.currentTime;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol ?? 0.06, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(g);
    g.connect(c.destination);
    src.start(t0);
    src.stop(t0 + dur + 0.01);
  }

  window.playSoundShoot = function (kind) {
    switch (kind) {
      case "bullet":
        noiseBurst(0.045, 0.05);
        break;
      case "shard":
        tone(880, 0.06, 0.055, "triangle", 420);
        break;
      case "beam":
        tone(220, 0.08, 0.045, "sine", 660);
        break;
      case "planet":
        tone(180, 0.1, 0.06, "sine", 90);
        break;
      case "volt":
        tone(120, 0.05, 0.05, "square", 400);
        tone(400, 0.04, 0.035, "square", 150);
        break;
      default:
        noiseBurst(0.04, 0.045);
    }
  };

  window.playSoundHit = function () {
    tone(180, 0.05, 0.06, "sine", 80);
  };

  window.playSoundKill = function () {
    tone(520, 0.1, 0.055, "sine", 880);
    tone(660, 0.08, 0.03, "triangle", 990);
  };

  window.playSoundWaveStart = function () {
    tone(220, 0.12, 0.06, "square", 330);
    setTimeout(() => {
      if (!window.gameSoundMuted) tone(330, 0.1, 0.05, "square", 440);
    }, 80);
  };

  window.playSoundBuild = function () {
    noiseBurst(0.06, 0.055);
    tone(300, 0.08, 0.04, "sine", 450);
  };

  window.playSoundBaseHit = function () {
    tone(90, 0.25, 0.1, "sine", 45);
    noiseBurst(0.12, 0.08);
  };

  window.playSoundWaveComplete = function () {
    tone(392, 0.1, 0.045, "sine", 523);
    setTimeout(() => {
      if (!window.gameSoundMuted) tone(523, 0.12, 0.04, "sine", 659);
    }, 90);
  };

  window.playSoundVictory = function () {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => {
      setTimeout(() => {
        if (!window.gameSoundMuted) tone(f, 0.18, 0.055, "triangle", f * 1.02);
      }, i * 120);
    });
  };

  window.playSoundDefeat = function () {
    tone(392, 0.2, 0.07, "sine", 98);
    setTimeout(() => {
      if (!window.gameSoundMuted) tone(196, 0.35, 0.06, "sine", 80);
    }, 150);
  };

  window.playSoundBomb = function () {
    noiseBurst(0.35, 0.12);
    tone(60, 0.4, 0.09, "sawtooth", 30);
  };

  window.playSoundPackOpen = function () {
    tone(660, 0.08, 0.05, "sine", 880);
    setTimeout(() => {
      if (!window.gameSoundMuted) tone(880, 0.12, 0.055, "triangle", 1320);
    }, 60);
  };

  window.playSoundUpgrade = function () {
    tone(440, 0.06, 0.045, "square", 880);
  };

  window.playSoundRainbowPop = function () {
    tone(880, 0.1, 0.05, "triangle", 220);
    tone(1320, 0.08, 0.04, "sine", 660);
  };
})();
