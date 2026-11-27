/* =====================================================================
   THE LITTLE UNIVERSE I MADE FOR YOU — script
   All text comes from content.js (window.CONTENT).
   Sections: 1 utilities · 2 sound · 3 effects · 4 modal & overlays
             5 characters · 6 scene manager & HUD · 7 companion & extras
             8 scenes 1–12 · 9 init
   ===================================================================== */
(() => {
  'use strict';

  /* ---------------------------------------------------------------
     1. UTILITIES
     --------------------------------------------------------------- */
  const C = window.CONTENT || {};
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rawSleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const list = (v, fallback = []) => (Array.isArray(v) && v.length ? v : fallback);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const paras = (s) => esc(s).split(/\n\s*\n/).map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
  const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const centerOf = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };

  /* Cycles through a list without repeating until every item is used. */
  function deck(items) {
    let pile = [];
    return () => { if (!pile.length) pile = shuffle(items); return pile.pop(); };
  }

  /* ---------------------------------------------------------------
     2. SOUND — everything is synthesised, so no files can go missing.
     --------------------------------------------------------------- */
  const Sound = (() => {
    let ctx = null, master = null, musicGain = null, sfxOn = true;
    let musicOn = false, musicTimer = null, nextTime = 0, step = 0, audioEl = null, usingFile = false;

    function ensure() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try {
          ctx = new AC();
          master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination);
          // Soft echo for the music box
          musicGain = ctx.createGain(); musicGain.gain.value = 0;
          const delay = ctx.createDelay(); delay.delayTime.value = 0.32;
          const fb = ctx.createGain(); fb.gain.value = 0.32;
          musicGain.connect(master); musicGain.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(master);
        } catch (e) { ctx = null; return null; }
      }
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    }

    function tone(freq, dur, { type = 'sine', vol = 0.15, delay = 0, slide = 0, out = null } = {}) {
      const c = ensure(); if (!c) return;
      const t = c.currentTime + delay;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(out || master); o.start(t); o.stop(t + dur + 0.05);
    }

    const sfx = {
      pop: () => tone(520, 0.14, { type: 'triangle', slide: 2, vol: 0.16 }),
      click: () => tone(880, 0.06, { type: 'triangle', vol: 0.08 }),
      chime: () => [880, 1319, 1760].forEach((f, i) => tone(f, 0.6, { delay: i * 0.08, vol: 0.09 })),
      collect: () => { tone(988, 0.1, { type: 'square', vol: 0.045 }); tone(1319, 0.22, { type: 'square', vol: 0.045, delay: 0.07 }); },
      star: () => [1568, 2093].forEach((f, i) => tone(f, 0.25, { type: 'triangle', delay: i * 0.06, vol: 0.06 })),
      knock: () => [0, 0.2, 0.4].forEach((d) => tone(150, 0.12, { type: 'triangle', vol: 0.45, delay: d, slide: 0.5 })),
      whoosh: () => tone(180, 0.55, { type: 'sine', slide: 4, vol: 0.06 }),
      sparkle: () => [0, 1, 2, 3, 4].forEach((i) => tone(1400 + i * 260, 0.22, { delay: i * 0.05, vol: 0.04 })),
      unlock: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.5, { delay: i * 0.09, vol: 0.08, type: 'triangle' })),
      scan: () => tone(660, 0.08, { type: 'square', vol: 0.03 }),
      alert: () => [0, 0.25].forEach((d) => tone(990, 0.18, { type: 'square', vol: 0.04, delay: d })),
      hug: () => [392, 494, 587, 784].forEach((f, i) => tone(f, 0.9, { delay: i * 0.1, vol: 0.07 })),
      balloon: () => tone(300, 0.2, { type: 'sawtooth', slide: 0.3, vol: 0.06 }),
      grow: () => tone(300, 1.2, { slide: 3, vol: 0.05 }),
    };

    function play(name) { if (!sfxOn) return; try { sfx[name] && sfx[name](); } catch (e) { /* audio is optional */ } }

    /* Original music-box lullaby: 32 steps, gentle arpeggios. */
    const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
    const melody = [76, 79, 84, 79, 77, 81, 84, 81, 74, 77, 83, 77, 76, 79, 84, 88,
                    81, 84, 88, 84, 77, 81, 84, 89, 79, 83, 86, 91, 84, 79, 76, null];
    const bass = [48, 53, 55, 48, 57, 53, 55, 48];
    const STEP = 0.36;
    function scheduleMusic() {
      while (nextTime < ctx.currentTime + 0.4) {
        const n = melody[step % melody.length];
        if (n) { tone(midi(n), 1.4, { vol: 0.05, delay: nextTime - ctx.currentTime, out: musicGain }); tone(midi(n + 12), 0.6, { type: 'triangle', vol: 0.012, delay: nextTime - ctx.currentTime, out: musicGain }); }
        if (step % 4 === 0) tone(midi(bass[(step / 4) % bass.length]), 2.2, { vol: 0.04, delay: nextTime - ctx.currentTime, out: musicGain });
        nextTime += STEP; step++;
      }
    }
    function startSynth() {
      const c = ensure(); if (!c) return false;
      musicGain.gain.cancelScheduledValues(c.currentTime);
      musicGain.gain.setTargetAtTime(1, c.currentTime, 0.5);
      nextTime = c.currentTime + 0.1;
      clearInterval(musicTimer); musicTimer = setInterval(scheduleMusic, 120);
      return true;
    }
    function stopSynth() {
      if (!ctx) return;
      musicGain.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
      setTimeout(() => { if (!musicOn || usingFile) clearInterval(musicTimer); }, 1200);
    }

    async function setMusic(on) {
      musicOn = on;
      const src = C.music && C.music.src;
      if (on) {
        if (src) {
          try {
            if (!audioEl) { audioEl = new Audio(src); audioEl.loop = true; audioEl.volume = 0.5; }
            await audioEl.play(); usingFile = true; return true;
          } catch (e) { usingFile = false; /* file missing or blocked → fall back */ }
        }
        return startSynth();
      }
      if (audioEl) audioEl.pause();
      stopSynth();
      return true;
    }

    return {
      ensure, play, setMusic,
      get music() { return musicOn; },
      get sfx() { return sfxOn; },
      set sfx(v) { sfxOn = v; },
    };
  })();

  /* ---------------------------------------------------------------
     3. EFFECTS — particles, confetti, toast, balloons
     --------------------------------------------------------------- */
  const fxLayer = $('#fxLayer');

  function burst(x, y, { items = ['💖', '✨', '🌸'], count = 14, spread = 160, rise = 40, dur = 1500, size = [16, 30] } = {}) {
    const n = reduceMotion ? Math.ceil(count / 3) : count;
    for (let i = 0; i < n; i++) {
      const el = document.createElement('span');
      el.className = 'fx';
      el.textContent = pick(items);
      el.style.fontSize = rand(size[0], size[1]) + 'px';
      fxLayer.appendChild(el);
      const a = rand(0, Math.PI * 2), d = rand(spread * 0.35, spread);
      const dx = Math.cos(a) * d, dy = Math.sin(a) * d - rise;
      const rot = rand(-70, 70);
      const anim = el.animate([
        { transform: `translate(${x}px, ${y}px) translate(-50%, -50%) scale(.2)`, opacity: 1 },
        { transform: `translate(${x + dx}px, ${y + dy}px) translate(-50%, -50%) scale(1) rotate(${rot}deg)`, opacity: 1, offset: 0.65 },
        { transform: `translate(${x + dx}px, ${y + dy - 50}px) translate(-50%, -50%) scale(.7) rotate(${rot}deg)`, opacity: 0 },
      ], { duration: reduceMotion ? 600 : dur * rand(0.8, 1.2), easing: 'cubic-bezier(.2,.8,.3,1)' });
      anim.onfinish = () => el.remove();
    }
  }
  const burstAt = (el, opts) => { const p = centerOf(el); burst(p.x, p.y, opts); };

  const Confetti = (() => {
    const cv = $('#confetti'), cx = cv.getContext('2d');
    let parts = [], raf = null, w = 0, h = 0;
    const colors = ['#ffafcc', '#ffc8dd', '#cdb4db', '#bde0fe', '#a2d2ff', '#ffd6a5', '#ffd88a', '#ff7aa2'];
    function size() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = innerWidth; h = innerHeight; cv.width = w * dpr; cv.height = h * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function heart(x, y, s) {
      cx.beginPath(); cx.moveTo(x, y + s * 0.3);
      cx.bezierCurveTo(x, y, x - s * 0.5, y, x - s * 0.5, y + s * 0.3);
      cx.bezierCurveTo(x - s * 0.5, y + s * 0.6, x, y + s * 0.8, x, y + s);
      cx.bezierCurveTo(x, y + s * 0.8, x + s * 0.5, y + s * 0.6, x + s * 0.5, y + s * 0.3);
      cx.bezierCurveTo(x + s * 0.5, y, x, y, x, y + s * 0.3); cx.fill();
    }
    function loop() {
      cx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.vy += 0.28; p.vx *= 0.99; p.vy *= 0.995; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life++;
        cx.save(); cx.translate(p.x, p.y); cx.rotate(p.rot); cx.fillStyle = p.c;
        if (p.heart) heart(0, -p.r, p.r * 2); else cx.fillRect(-p.r, -p.r * 0.6, p.r * 2, p.r * 1.2);
        cx.restore();
      }
      parts = parts.filter((p) => p.y < h + 30 && p.life < 420);
      raf = parts.length ? requestAnimationFrame(loop) : (cx.clearRect(0, 0, w, h), null);
    }
    function fire(n = 150, origin) {
      if (reduceMotion) n = 30;
      size();
      const ox = origin ? origin.x : w / 2, oy = origin ? origin.y : h * 0.55;
      for (let i = 0; i < n; i++) {
        parts.push({ x: ox + rand(-60, 60), y: oy + rand(-20, 20), vx: rand(-10, 10), vy: rand(-17, -6), r: rand(4, 8), c: pick(colors), rot: rand(0, 6), vr: rand(-0.25, 0.25), heart: Math.random() < 0.3, life: 0 });
      }
      if (!raf) raf = requestAnimationFrame(loop);
    }
    return { fire };
  })();

  const toastEl = $('#toast');
  let toastTimer = null;
  function toast(text, ms = 3600) {
    toastEl.textContent = text;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
  }

  const balloonLayer = $('#balloonLayer');
  const balloonColors = ['#ff9fc2', '#c9a7ee', '#a2d2ff', '#ffd6a5', '#ffe08a', '#b9f0c9'];
  function spawnBalloon({ left = rand(6, 90), dur = rand(11, 16), message = null } = {}) {
    if (reduceMotion && !message) return;
    const b = document.createElement('button');
    b.className = 'balloon';
    b.setAttribute('aria-label', 'A floating balloon. Pop it!');
    b.style.left = left + 'vw';
    b.style.setProperty('--bc', pick(balloonColors));
    b.style.setProperty('--dur', dur + 's');
    const msg = message || pick(list(C.surprises, ['You are loved 💖']));
    b.addEventListener('click', () => {
      Sound.play('balloon'); burstAt(b, { items: ['💖', '✨', '🎈', '🌸'], count: 14 });
      toast(msg); b.remove();
    });
    b.addEventListener('animationend', () => b.remove());
    balloonLayer.appendChild(b);
    if (reduceMotion) setTimeout(() => b.remove(), 8000);
  }

  /* ---------------------------------------------------------------
     4. MODAL & OVERLAYS
     --------------------------------------------------------------- */
  const Modal = (() => {
    const root = $('#modal'), box = $('#modalBox'), body = $('#modalBody'), closeBtn = $('#modalClose');
    let lastFocus = null, onClose = null, hideTimer = null;
    function open(html, { cls = '', label = 'Message', onClose: cb = null } = {}) {
      clearTimeout(hideTimer);
      lastFocus = document.activeElement;
      box.className = 'modal-box ' + cls;
      body.innerHTML = html;
      const title = body.querySelector('h3');
      if (title) { title.id = 'modalTitle'; box.setAttribute('aria-labelledby', 'modalTitle'); box.removeAttribute('aria-label'); }
      else { box.removeAttribute('aria-labelledby'); box.setAttribute('aria-label', label); }
      box.scrollTop = 0;
      root.hidden = false;
      requestAnimationFrame(() => root.classList.add('show'));
      onClose = cb;
      setTimeout(() => closeBtn.focus({ preventScroll: true }), 60);
    }
    function close() {
      if (root.hidden) return;
      root.classList.remove('show');
      hideTimer = setTimeout(() => { root.hidden = true; body.innerHTML = ''; }, 380);
      const cb = onClose; onClose = null;
      if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
      Sound.play('click');
      if (cb) cb();
    }
    root.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
    closeBtn.addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
      if (root.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key === 'Tab') {
        const f = $$('button, [href], input, textarea, [tabindex]:not([tabindex="-1"])', box).filter((el) => !el.disabled && el.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    return { open, close, get isOpen() { return !root.hidden; } };
  })();

  /* A full-screen animated hug. variant: 'bunny' (white arms) or 'teddy' (brown arms) */
  function bigHug(text, variant = 'bunny') {
    Sound.play('hug');
    const el = document.createElement('div');
    el.className = 'hug-overlay';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Virtual hug');
    const brown = variant === 'teddy' ? ' brown' : '';
    el.innerHTML = `
      <div>
        <div class="hug-stage">
          <span class="hug-arm l${brown}"></span><span class="hug-arm r${brown}"></span>
          <span class="hug-heart" aria-hidden="true">${variant === 'teddy' ? '🧸' : '💗'}</span>
        </div>
        <p class="hug-text">${esc(text)}</p>
        <p class="hug-sub">(tap anywhere to keep the warm feeling and close)</p>
      </div>`;
    document.body.appendChild(el);
    let closed = false;
    const close = () => {
      if (closed) return; closed = true;
      el.classList.add('out'); setTimeout(() => el.remove(), 500);
      document.removeEventListener('keydown', onKey);
    };
    const onKey = (e) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } };
    el.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    const heartsLoop = setInterval(() => {
      if (closed) return clearInterval(heartsLoop);
      burst(rand(innerWidth * 0.2, innerWidth * 0.8), innerHeight * rand(0.3, 0.7), { items: ['💗', '💞', '💕', '✨'], count: 5, spread: 90, rise: 80 });
    }, 450);
    setTimeout(close, 6500);
  }

  /* ---------------------------------------------------------------
     PHOTO LOCK — private photos are stored encrypted (see tools/lock-photos.mjs).
     They are decrypted in the browser only after the secret word is entered.
     --------------------------------------------------------------- */
  const PhotoLock = (() => {
    const base = 'assets/photos/locked/';
    const urls = new Map();
    let manifest = null, unlocked = false;
    const fileName = (src) => String(src || '').split(/[\\/]/).pop();
    const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
    const ready = fetch(base + 'manifest.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => { manifest = m && m.files ? m : null; })
      .catch(() => { manifest = null; });
    const isLocked = (src) => !!(manifest && src && manifest.files[fileName(src)]);
    async function unlock(pass) {
      if (!(window.crypto && crypto.subtle)) throw new Error('insecure');
      const raw = new TextEncoder().encode(String(pass).normalize('NFC').trim().toLowerCase());
      const baseKey = await crypto.subtle.importKey('raw', raw, 'PBKDF2', false, ['deriveKey']);
      const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(manifest.salt), iterations: manifest.iter, hash: 'SHA-256' }, baseKey, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
      const open = (u8) => crypto.subtle.decrypt({ name: 'AES-GCM', iv: u8.slice(0, 12) }, key, u8.slice(12));
      try { await open(b64(manifest.check)); } catch (e) { return false; } // wrong word
      await Promise.all(Object.entries(manifest.files).map(async ([name, meta]) => {
        const res = await fetch(base + meta.file);
        const plain = await open(new Uint8Array(await res.arrayBuffer()));
        urls.set(name, URL.createObjectURL(new Blob([plain], { type: meta.type })));
      }));
      unlocked = true;
      document.dispatchEvent(new Event('photos-unlocked'));
      return true;
    }
    return {
      ready, unlock, isLocked,
      get active() { return !!manifest; },
      get unlocked() { return unlocked; },
      /* URL to show for a photo: the original path, a decrypted blob URL, or null while locked. */
      src(src) { if (!src) return null; if (!isLocked(src)) return src; return urls.get(fileName(src)) || null; },
    };
  })();

  /* ---------------------------------------------------------------
     5. CHARACTERS — original inline SVG
     --------------------------------------------------------------- */
  const stroke = 'stroke="#f0cfe0" stroke-width="2.5"';
  function bunnySVG({ heart = false, lab = false } = {}) {
    const coat = lab ? `
      <path d="M32 116 Q60 100 88 116 L92 160 Q60 168 28 160 Z" fill="#eef6ff" stroke="#bcd6f2" stroke-width="2.5"/>
      <path d="M60 106 L52 128 M60 106 L68 128" stroke="#bcd6f2" stroke-width="2.5" fill="none"/>
      <circle cx="60" cy="138" r="2.6" fill="#a2d2ff"/><circle cx="60" cy="150" r="2.6" fill="#a2d2ff"/>
      <rect x="70" y="132" width="12" height="9" rx="2" fill="#ffc8dd"/>` : `
      <ellipse cx="60" cy="138" rx="17" ry="18" fill="#fff4f8"/>`;
    const goggles = lab ? `
      <path d="M28 66 Q60 56 92 66" stroke="#b79ce0" stroke-width="4" fill="none"/>
      <circle cx="48" cy="64" r="9" fill="#e7f6ff" stroke="#b79ce0" stroke-width="3.5"/>
      <circle cx="72" cy="64" r="9" fill="#e7f6ff" stroke="#b79ce0" stroke-width="3.5"/>
      <circle cx="45" cy="61" r="2.5" fill="#fff"/><circle cx="69" cy="61" r="2.5" fill="#fff"/>` : '';
    const heartG = heart ? `
      <g class="b-heart"><path d="M60 146 C38 131 41 110 54 112 C57 112 59 115 60 118 C61 115 63 112 66 112 C79 110 82 131 60 146Z" fill="#ff6f9c" stroke="#fff" stroke-width="2.5"/>
      <ellipse cx="53" cy="120" rx="4" ry="2.5" fill="#fff" opacity=".7"/></g>` : '';
    return `<svg class="bunny-svg" viewBox="0 0 120 172" aria-hidden="true" focusable="false">
      <g class="b-ear b-ear-l"><ellipse cx="44" cy="38" rx="11" ry="32" fill="#fff" ${stroke}/><ellipse cx="44" cy="41" rx="5.5" ry="23" fill="#ffc6db"/></g>
      <g class="b-ear b-ear-r"><ellipse cx="76" cy="38" rx="11" ry="32" fill="#fff" ${stroke}/><ellipse cx="76" cy="41" rx="5.5" ry="23" fill="#ffc6db"/></g>
      <ellipse cx="60" cy="134" rx="31" ry="30" fill="#fff" ${stroke}/>
      ${coat}
      <ellipse cx="44" cy="163" rx="12" ry="7" fill="#fff" ${stroke}/><ellipse cx="76" cy="163" rx="12" ry="7" fill="#fff" ${stroke}/>
      <circle cx="60" cy="84" r="34" fill="#fff" ${stroke}/>
      <g class="b-eyes"><ellipse cx="47" cy="82" rx="4.6" ry="5.6" fill="#3b2a4a"/><circle cx="48.6" cy="79.8" r="1.7" fill="#fff"/>
      <ellipse cx="73" cy="82" rx="4.6" ry="5.6" fill="#3b2a4a"/><circle cx="74.6" cy="79.8" r="1.7" fill="#fff"/></g>
      <ellipse cx="38" cy="94" rx="7" ry="4" fill="#ffb3cc" opacity=".75"/><ellipse cx="82" cy="94" rx="7" ry="4" fill="#ffb3cc" opacity=".75"/>
      <path d="M56.5 89 H63.5 L60 93 Z" fill="#ff8fb3"/>
      <path d="M60 93 Q57 98 53 96 M60 93 Q63 98 67 96" stroke="#3b2a4a" fill="none" stroke-width="1.8" stroke-linecap="round"/>
      ${goggles}
      ${heartG}
      <g class="b-arm b-arm-l"><ellipse cx="34" cy="126" rx="8.5" ry="14" fill="#fff" ${stroke} transform="rotate(${heart ? -25 : 10} 34 126)"/></g>
      <g class="b-arm b-arm-r"><ellipse cx="86" cy="126" rx="8.5" ry="14" fill="#fff" ${stroke} transform="rotate(${heart ? 25 : -10} 86 126)"/></g>
    </svg>`;
  }
  function teddySVG() {
    return `<svg class="teddy-svg" viewBox="0 0 160 190" aria-hidden="true" focusable="false">
      <circle cx="38" cy="30" r="19" fill="#c48a5c"/><circle cx="38" cy="30" r="10" fill="#f1d2b0"/>
      <circle cx="122" cy="30" r="19" fill="#c48a5c"/><circle cx="122" cy="30" r="10" fill="#f1d2b0"/>
      <ellipse cx="80" cy="140" rx="42" ry="40" fill="#c48a5c"/>
      <ellipse cx="80" cy="146" rx="26" ry="26" fill="#e9c39c"/>
      <circle cx="50" cy="176" r="16" fill="#b67c50"/><circle cx="50" cy="178" r="8" fill="#f1d2b0"/>
      <circle cx="110" cy="176" r="16" fill="#b67c50"/><circle cx="110" cy="178" r="8" fill="#f1d2b0"/>
      <circle cx="80" cy="66" r="46" fill="#c48a5c"/>
      <ellipse cx="80" cy="84" rx="21" ry="16" fill="#f1d2b0"/>
      <ellipse cx="80" cy="76" rx="7.5" ry="5.5" fill="#4a2c25"/>
      <path d="M80 82 V88 M80 88 Q74 94 70 90 M80 88 Q86 94 90 90" stroke="#4a2c25" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <g class="t-eyes"><circle cx="63" cy="62" r="5" fill="#2d1a15"/><circle cx="64.5" cy="60.5" r="1.7" fill="#fff"/>
      <circle cx="97" cy="62" r="5" fill="#2d1a15"/><circle cx="98.5" cy="60.5" r="1.7" fill="#fff"/></g>
      <ellipse cx="52" cy="80" rx="7" ry="4" fill="#ff9fbf" opacity=".6"/><ellipse cx="108" cy="80" rx="7" ry="4" fill="#ff9fbf" opacity=".6"/>
      <path class="t-heart" d="M80 160 C52 142 56 116 72 118 C76 118 79 122 80 126 C81 122 84 118 88 118 C104 116 108 142 80 160Z" fill="#ff5c8a" stroke="#fff" stroke-width="3"/>
      <ellipse cx="48" cy="134" rx="13" ry="21" fill="#b67c50" transform="rotate(-35 48 134)"/>
      <ellipse cx="112" cy="134" rx="13" ry="21" fill="#b67c50" transform="rotate(35 112 134)"/>
    </svg>`;
  }
  function mountCharacters() {
    $$('[data-char]').forEach((el) => {
      const kind = el.dataset.char;
      el.innerHTML = kind === 'teddy' ? teddySVG() : bunnySVG({ heart: kind === 'bunny-heart', lab: kind === 'bunny-lab' });
    });
  }

  /* Small SVG flower used for decoration */
  function flowerSVG(c1, c2, { h = 70 } = {}) {
    return `<svg viewBox="0 0 40 ${h + 20}" aria-hidden="true" focusable="false">
      <path d="M20 ${h + 20} Q18 ${h / 2 + 20} 20 20" stroke="#6cbf7a" stroke-width="3" fill="none"/>
      <path d="M20 ${h} Q8 ${h - 6} 8 ${h - 14} Q16 ${h - 12} 20 ${h}Z" fill="#8fd59c"/>
      <g>${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="20" cy="11" rx="6" ry="9" fill="${c1}" transform="rotate(${a} 20 20)"/>`).join('')}
      <circle cx="20" cy="20" r="5" fill="${c2}"/></g>
    </svg>`;
  }

  /* ---------------------------------------------------------------
     6. SCENE MANAGER & HUD
     --------------------------------------------------------------- */
  const scenes = $$('.scene');
  const N = scenes.length;
  const handlers = [];
  const visited = new Set([0]);
  let current = 0;
  let transitioning = false;
  let token = 0;        // changes on every scene switch; stale async flows stop
  let skipping = false; // "Skip" pressed: waits resolve instantly
  let waiters = [];

  const alive = (t) => t === token;
  function sleep(ms) {
    return new Promise((resolve) => {
      if (skipping) return resolve();
      let id = 0;
      const wake = () => { clearTimeout(id); resolve(); };
      id = setTimeout(() => { waiters = waiters.filter((w) => w !== wake); resolve(); }, ms);
      waiters.push(wake);
    });
  }
  function wakeAll() { const ws = waiters; waiters = []; ws.forEach((w) => w()); }

  /* Types text into el one character at a time. Respects skip & reduced motion. */
  async function typeText(el, text, speed = 42, onChar = null) {
    const t = token;
    el.textContent = '';
    const node = document.createTextNode('');
    el.appendChild(node);
    el.classList.add('typing');
    const chars = Array.from(String(text || ''));
    for (let i = 0; i < chars.length; i++) {
      if (!alive(t)) return false;
      if (skipping || reduceMotion) { node.data = chars.join(''); if (onChar) onChar(); break; }
      const ch = chars[i];
      node.appendData(ch);
      if (onChar && i % 3 === 0) onChar();
      await rawSleep(/[.!?…]/.test(ch) ? speed * 7 : /[,;:]/.test(ch) ? speed * 4 : ch === '\n' ? speed * 3 : speed);
    }
    el.classList.remove('typing');
    return alive(t);
  }

  /* ---- Starfields (canvas) ---- */
  function Starfield(canvas) {
    const ctx = canvas.getContext('2d');
    const base = +canvas.dataset.stars || 800;
    const shooting = canvas.dataset.shooting === '1';
    const colors = ['#ffffff', '#fff4d6', '#ffe0f0', '#dfe9ff'];
    let stars = [], raf = null, w = 0, h = 0, shoot = null, nextShoot = 2000;
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      if (!w || !h) return;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(base * clamp((w * h) / (1440 * 900), 0.35, 1));
      stars = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, r: Math.pow(Math.random(), 3) * 1.7 + 0.35, p: Math.random() * 6.28, s: rand(0.4, 2.2), c: pick(colors) }));
    }
    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        ctx.globalAlpha = reduceMotion ? 0.8 : 0.3 + 0.7 * Math.abs(Math.sin(s.p + t * 0.0006 * s.s));
        ctx.fillStyle = s.c;
        if (s.r < 1.1) ctx.fillRect(s.x, s.y, s.r * 1.6, s.r * 1.6);
        else { ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
      if (shooting && !reduceMotion) {
        if (!shoot && t > nextShoot) shoot = { x: rand(w * 0.1, w * 0.7), y: rand(0, h * 0.35), vx: rand(7, 11), vy: rand(2.5, 4.5), life: 0 };
        if (shoot) {
          shoot.x += shoot.vx; shoot.y += shoot.vy; shoot.life++;
          const tx = shoot.x - shoot.vx * 12, ty = shoot.y - shoot.vy * 12;
          const g = ctx.createLinearGradient(shoot.x, shoot.y, tx, ty);
          g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(shoot.x, shoot.y); ctx.lineTo(tx, ty); ctx.stroke();
          if (shoot.life > 60) { shoot = null; nextShoot = t + rand(2500, 6500); }
        }
      }
    }
    const loop = (t) => { draw(t); raf = requestAnimationFrame(loop); };
    return {
      start() { resize(); if (reduceMotion) { draw(0); return; } if (!raf) raf = requestAnimationFrame(loop); },
      stop() { cancelAnimationFrame(raf); raf = null; },
      resize() { resize(); if (reduceMotion || !raf) draw(performance.now()); },
    };
  }
  const starfields = new Map();
  $$('canvas.starfield').forEach((c) => starfields.set(c, Starfield(c)));
  const eachStarfield = (sceneEl, fn) => $$('canvas.starfield', sceneEl).forEach((c) => fn(starfields.get(c)));

  /* ---- Navigation ---- */
  async function go(n) {
    if (n < 0 || n >= N || n === current || transitioning) return;
    transitioning = true;
    Sound.play('whoosh');
    if (Modal.isOpen) Modal.close();
    const tr = $('#transition');
    tr.classList.add('in');
    await rawSleep(reduceMotion ? 150 : 720);

    const prev = current;
    try { handlers[prev] && handlers[prev].leave && handlers[prev].leave(); } catch (e) { console.error(e); }
    eachStarfield(scenes[prev], (sf) => sf.stop());
    scenes[prev].classList.remove('active');
    scenes[prev].inert = true;
    scenes[prev].setAttribute('aria-hidden', 'true');

    token++; skipping = false; wakeAll();
    current = n;
    const revisit = visited.has(n);
    visited.add(n);
    const s = scenes[n];
    s.inert = false;
    s.removeAttribute('aria-hidden');
    s.classList.add('active');
    $$('.scene-scroll', s).forEach((el) => { el.scrollTop = 0; });
    document.body.classList.toggle('on-intro', n === 0);
    eachStarfield(s, (sf) => sf.start());
    updateHUD();
    Companion.onScene(n);
    try { handlers[n] && handlers[n].enter && handlers[n].enter(revisit); } catch (e) { console.error(e); }

    await rawSleep(60);
    tr.classList.remove('in');
    const heading = s.querySelector('h1[tabindex], h2[tabindex]');
    if (heading) heading.focus({ preventScroll: true });
    await rawSleep(reduceMotion ? 100 : 600);
    transitioning = false;
  }
  const next = () => go(current + 1);

  /* ---- HUD ---- */
  const dotsEl = $('#hudDots');
  scenes.forEach((s, i) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `Chapter ${i + 1}: ${s.dataset.title}`);
    b.addEventListener('click', () => { if (visited.has(i)) go(i); });
    li.appendChild(b); dotsEl.appendChild(li);
  });
  function updateHUD() {
    $('#hudChapter').textContent = `Chapter ${current + 1} of ${N} · ${scenes[current].dataset.title}`;
    $$('button', dotsEl).forEach((b, i) => {
      b.classList.toggle('current', i === current);
      b.classList.toggle('visited', visited.has(i));
      b.disabled = !visited.has(i);
      if (i === current) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
    });
    $('#backBtn').disabled = current === 0;
  }

  $('#backBtn').addEventListener('click', () => { Sound.play('click'); go(current - 1); });
  $('#skipBtn').addEventListener('click', () => {
    Sound.play('click');
    skipping = true; wakeAll();
    try { handlers[current] && handlers[current].skip && handlers[current].skip(); } catch (e) { console.error(e); }
  });
  $('#musicBtn').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.classList.remove('pulse');
    const on = !Sound.music;
    await Sound.setMusic(on);
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? 'Pause music' : 'Play music');
    btn.textContent = on ? '🎶' : '🎵';
    toast(on ? 'Music on 🎶' : 'Music paused', 1600);
  });
  $('#soundBtn').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    Sound.sfx = !Sound.sfx;
    btn.setAttribute('aria-pressed', String(Sound.sfx));
    btn.setAttribute('aria-label', Sound.sfx ? 'Mute sound effects' : 'Unmute sound effects');
    btn.textContent = Sound.sfx ? '🔔' : '🔕';
    Sound.play('click');
  });
  document.addEventListener('click', (e) => {
    const nb = e.target.closest('[data-next]');
    if (nb) { Sound.play('pop'); next(); }
  });
  // Unlock audio on the first interaction anywhere (required by browsers).
  window.addEventListener('pointerdown', () => Sound.ensure(), { once: true });
  window.addEventListener('keydown', () => Sound.ensure(), { once: true });

  /* ---------------------------------------------------------------
     7. COMPANION, SECRETS, SURPRISES, DECORATION
     --------------------------------------------------------------- */
  const Companion = (() => {
    const root = $('#companion'), btn = $('#companionBtn'), bubble = $('#companionBubble');
    const showIn = new Set([1, 3, 5, 6, 7, 8, 9]);
    const hints = C.companionHints || {};
    const lines = deck(list(C.companionLines, ['Hi there! ✨']));
    let t = null, hideT = null;
    function say(text, ms = 4600) {
      if (!text) return;
      bubble.textContent = text;
      bubble.classList.add('show');
      clearTimeout(t);
      t = setTimeout(() => bubble.classList.remove('show'), ms);
    }
    function onScene(n) {
      clearTimeout(hideT);
      if (!showIn.has(n)) {
        root.classList.add('gone'); bubble.classList.remove('show');
        hideT = setTimeout(() => { root.hidden = true; }, 500);
        return;
      }
      root.hidden = false;
      requestAnimationFrame(() => root.classList.remove('gone'));
      setTimeout(() => { if (current === n) say(hints[n]); }, 1400);
    }
    btn.addEventListener('click', () => {
      Sound.play('sparkle');
      burstAt(btn, { items: ['✨', '⭐', '💛'], count: 8, spread: 70 });
      say(lines());
    });
    return { onScene, say };
  })();

  const foundSecrets = new Set();
  const secretList = list(C.secrets, ['You found a secret! ✨']);
  document.addEventListener('click', (e) => {
    const s = e.target.closest('.secret-obj');
    if (!s) return;
    const i = +s.dataset.secret || 0;
    Sound.play('sparkle');
    burstAt(s, { items: ['✨', '🌟', '💫'], count: 12, spread: 90 });
    s.classList.add('found');
    const first = !foundSecrets.has(i);
    foundSecrets.add(i);
    const total = secretList.length;
    toast(`${secretList[i] || 'You found a secret!'}  (${Math.min(foundSecrets.size, total)}/${total} secrets)`, 5200);
    if (first && foundSecrets.size === total) {
      setTimeout(() => { Confetti.fire(120); toast(((C.little && C.little.allSecrets) || "You found every secret!"), 5000); }, 5400);
    }
  });

  /* Random surprises: a balloon carrying a little message floats by now and then. */
  const surpriseScenes = new Set([1, 3, 5, 6, 7, 8, 9, 11]);
  setInterval(() => {
    if (document.hidden || Modal.isOpen || transitioning || !surpriseScenes.has(current)) return;
    if (Math.random() < 0.65) spawnBalloon();
  }, 38000);

  /* Generated decoration */
  const palettes = [['#ffafcc', '#ffe08a'], ['#cdb4db', '#fff1a8'], ['#a2d2ff', '#ffd6a5'], ['#ffd6a5', '#ff8fb8'], ['#ff8fa3', '#fff3c4'], ['#b9f0c9', '#ffafcc']];
  function decorate() {
    $$('[data-fireflies]').forEach((el) => {
      const n = reduceMotion ? 8 : +el.dataset.fireflies;
      for (let i = 0; i < n; i++) {
        const f = document.createElement('span');
        f.className = 'firefly';
        f.style.left = rand(3, 97) + '%'; f.style.top = rand(30, 92) + '%';
        f.style.setProperty('--d', rand(5, 10) + 's'); f.style.setProperty('--delay', -rand(0, 10) + 's');
        el.appendChild(f);
      }
    });
    $$('[data-flowers]').forEach((el) => {
      const n = +el.dataset.flowers;
      for (let i = 0; i < n; i++) {
        const [c1, c2] = pick(palettes);
        const f = document.createElement('div');
        f.className = 'sway-flower';
        f.style.left = (i / n) * 100 + rand(0, 100 / n - 3) + '%';
        f.style.width = rand(20, 34) + 'px';
        f.style.setProperty('--d', rand(3, 5.5) + 's');
        f.style.animationDelay = -rand(0, 4) + 's';
        f.innerHTML = flowerSVG(c1, c2, { h: randInt(40, 90) });
        el.appendChild(f);
      }
    });
    $$('[data-cinflowers]').forEach((el) => {
      const n = +el.dataset.cinflowers;
      for (let i = 0; i < n; i++) {
        const [c1, c2] = pick(palettes);
        const f = document.createElement('div');
        f.className = 'cin-flower';
        f.style.left = 18 + (i / n) * 80 + rand(-2, 2) + '%';
        f.style.setProperty('--delay', (i * 0.12).toFixed(2) + 's');
        f.style.animationDelay = -rand(0, 4) + 's';
        f.style.width = rand(26, 40) + 'px';
        f.innerHTML = `<svg viewBox="0 0 40 90" aria-hidden="true"><path class="cf-stem" d="M20 90 Q17 60 20 26" stroke="#6cbf7a" stroke-width="3" fill="none"/>
          <g class="cf-head">${[0, 60, 120, 180, 240, 300].map((a) => `<ellipse cx="20" cy="12" rx="6" ry="9" fill="${c1}" transform="rotate(${a} 20 22)"/>`).join('')}<circle cx="20" cy="22" r="5" fill="${c2}"/></g></svg>`;
        el.appendChild(f);
      }
    });
    $$('[data-bubbles]').forEach((el) => {
      const n = +el.dataset.bubbles;
      for (let i = 0; i < n; i++) {
        const b = document.createElement('span');
        b.className = 'cap-bubble';
        const s = rand(12, 46);
        b.style.width = b.style.height = s + 'px';
        b.style.left = rand(0, 98) + '%';
        b.style.setProperty('--top', rand(10, 90) + '%');
        b.style.setProperty('--d', rand(10, 20) + 's'); b.style.setProperty('--delay', -rand(0, 20) + 's'); b.style.setProperty('--dx', rand(-60, 60) + 'px');
        el.appendChild(b);
      }
    });
    $$('[data-hearts]').forEach((el) => {
      const n = +el.dataset.hearts;
      for (let i = 0; i < n; i++) {
        const h = document.createElement('span');
        h.className = 'r-heart'; h.textContent = pick(['♥', '♥', '❤', '✦']);
        h.style.left = rand(0, 98) + '%'; h.style.fontSize = rand(12, 28) + 'px';
        h.style.setProperty('--top', rand(10, 90) + '%');
        h.style.setProperty('--d', rand(10, 18) + 's'); h.style.setProperty('--delay', -rand(0, 18) + 's'); h.style.setProperty('--dx', rand(-60, 60) + 'px');
        el.appendChild(h);
      }
    });
    $$('[data-endflowers]').forEach((el) => {
      const n = +el.dataset.endflowers;
      for (let i = 0; i < n; i++) {
        const f = document.createElement('span');
        f.className = 'float-flower'; f.textContent = pick(['🌸', '🌷', '🌼', '✿', '💮']);
        f.style.left = rand(0, 98) + '%'; f.style.setProperty('--s', rand(14, 30) + 'px');
        f.style.setProperty('--top', rand(10, 80) + '%');
        f.style.setProperty('--d', rand(14, 24) + 's'); f.style.setProperty('--delay', -rand(0, 24) + 's'); f.style.setProperty('--dx', rand(-80, 80) + 'px');
        el.appendChild(f);
      }
    });
  }

  /* ---------------------------------------------------------------
     8. SCENES
     --------------------------------------------------------------- */

  /* ===== Scene 1 — A message from the universe ===== */
  handlers[0] = {
    async enter(revisit) {
      const typed = $('#introTyped'), btn = $('#enterBtn');
      $('#mainPlanet').classList.remove('zoom');
      $('#introCenter').classList.remove('zooming');
      const lines = list(C.intro, ['Somewhere in this enormous universe...']);
      if (revisit) { typed.textContent = lines[lines.length - 1]; btn.hidden = false; return; }
      btn.hidden = true;
      const t = token;
      await sleep(1000);
      for (let i = 0; i < lines.length; i++) {
        if (!alive(t)) return;
        typed.classList.remove('fade');
        await typeText(typed, lines[i], 48);
        if (!alive(t)) return;
        if (i < lines.length - 1) { await sleep(1500); typed.classList.add('fade'); await sleep(550); }
      }
      typed.classList.remove('fade', 'typing');
      await sleep(400);
      if (alive(t)) btn.hidden = false;
    },
    leave() {
      setTimeout(() => { $('#mainPlanet').classList.remove('zoom'); $('#introCenter').classList.remove('zooming'); }, 900);
    },
  };
  $('#enterBtn').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    Sound.ensure(); Sound.play('chime');
    btn.disabled = true;
    $('#introCenter').classList.add('zooming');
    $('#mainPlanet').classList.add('zoom');
    burstAt($('#mainPlanet'), { items: ['💖', '✨', '💫', '💗', '⭐'], count: 26, spread: 280 });
    await rawSleep(reduceMotion ? 200 : 1150);
    await go(1);
    btn.disabled = false;
    if (!Sound.music) setTimeout(() => { $('#musicBtn').classList.add('pulse'); toast(((C.little && C.little.musicTip) || "Tap the music button at the top for soft music"), 4200); }, 1800);
  });

  /* ===== Scene 2 — The magical door ===== */
  const doorState = { opened: false };
  handlers[1] = {
    async enter(revisit) {
      const s = scenes[1], typed = $('#doorTyped'), knock = $('#knockBtn'), letter = $('#doorLetter');
      const text = C.doorText || 'Someone has been waiting to tell you something...';
      if (revisit) {
        s.classList.add('walking', 'arrived');
        typed.textContent = doorState.opened ? ((C.little && C.little.doorRevisit) || "The letter is still waiting for you") : text;
        knock.hidden = doorState.opened;
        if (doorState.opened) { s.classList.add('opened'); letter.hidden = false; letter.classList.add('out'); }
        return;
      }
      const t = token;
      await sleep(500);
      if (!alive(t)) return;
      s.classList.add('walking');
      await sleep(2700);
      if (!alive(t)) return;
      s.classList.add('arrived');
      await typeText(typed, text, 45);
      if (!alive(t)) return;
      await sleep(300);
      if (alive(t) && !doorState.opened) knock.hidden = false;
    },
    skip() { scenes[1].classList.add('walking', 'arrived'); },
  };
  $('#knockBtn').addEventListener('click', async (e) => {
    const s = scenes[1], btn = e.currentTarget, letter = $('#doorLetter');
    btn.disabled = true;
    s.classList.add('walking', 'arrived', 'knocked');
    Sound.play('knock');
    $('#doorTyped').textContent = 'Knock knock… 🚪';
    await rawSleep(750);
    s.classList.remove('knocked');
    s.classList.add('opened');
    doorState.opened = true;
    Sound.play('chime');
    burstAt($('#door'), { items: ['💖', '🌸', '🌷', '✨', '💗', '🌼'], count: 28, spread: 210, rise: 90 });
    btn.hidden = true; btn.disabled = false;
    letter.hidden = false;
    await rawSleep(500);
    letter.classList.add('out');
    $('#doorTyped').textContent = ((C.little && C.little.doorOpened) || "Look! Something came out for you…");
    await rawSleep(900);
    Sound.play('sparkle');
    letter.focus({ preventScroll: true });
  });
  $('#doorLetter').addEventListener('click', () => { Sound.play('pop'); next(); });

  /* ===== Scene 3 — The apology cinema ===== */
  function Rain(canvas) {
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, drops = [], raf = null, intensity = 1;
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(clamp((w * h) / 5000, 80, 340));
      drops = Array.from({ length: n }, () => ({ x: Math.random() * w * 1.1, y: Math.random() * h, l: rand(10, 22), v: rand(9, 15) }));
    }
    function frame(move) {
      ctx.clearRect(0, 0, w, h);
      const count = Math.floor(drops.length * intensity);
      ctx.strokeStyle = 'rgba(225, 232, 255, .55)'; ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (let i = 0; i < count; i++) {
        const d = drops[i];
        if (move) { d.y += d.v; d.x -= d.v * 0.15; if (d.y > h) { d.y = -d.l; d.x = Math.random() * w * 1.1; } }
        ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + d.l * 0.15, d.y - d.l);
      }
      ctx.stroke();
    }
    const loop = () => { frame(true); raf = intensity > 0.01 ? requestAnimationFrame(loop) : (ctx.clearRect(0, 0, w, h), null); };
    return {
      start() { resize(); if (reduceMotion) { frame(false); return; } if (!raf && intensity > 0.01) raf = requestAnimationFrame(loop); },
      stop() { cancelAnimationFrame(raf); raf = null; },
      resize() { resize(); if (reduceMotion || !raf) frame(false); },
      setIntensity(v) {
        intensity = clamp(v, 0, 1);
        if (reduceMotion) { frame(false); return; }
        if (intensity > 0.01 && !raf && current === 2) raf = requestAnimationFrame(loop);
      },
    };
  }
  const rain = Rain($('#rainCanvas'));
  const cinema = (() => {
    const s = scenes[2], linesEl = $('#cinLines'), greet = $('#cinGreeting'), nextBtn = $('#cinNext'), cont = $('#cinContinue');
    const ap = C.apology || {};
    list(ap.paragraphs, ["I'm genuinely sorry."]).forEach((p) => {
      const el = document.createElement('p');
      el.className = 'cin-line' + (/sorry/i.test(p) && p.length < 40 ? ' emph' : '');
      el.textContent = p;
      linesEl.appendChild(el);
    });
    const lineEls = $$('.cin-line', linesEl);
    let done = false;
    function setClear(p) { s.style.setProperty('--clear', p.toFixed(3)); rain.setIntensity(1 - p); s.classList.toggle('blooming', p >= 0.5); }
    function finish() {
      done = true;
      greet.classList.remove('typing'); greet.textContent = ap.greeting || '';
      lineEls.forEach((l) => l.classList.add('show'));
      setClear(1);
      s.classList.add('cleared', 'offering');
      nextBtn.hidden = true; cont.hidden = false;
    }
    nextBtn.addEventListener('click', () => { Sound.play('click'); wakeAll(); });
    return {
      async enter(revisit) {
        rain.start();
        if (revisit && done) { finish(); return; }
        s.classList.remove('cleared', 'offering', 'blooming');
        lineEls.forEach((l) => l.classList.remove('show'));
        setClear(0);
        nextBtn.hidden = false; cont.hidden = true; greet.textContent = '';
        const t = token;
        await sleep(1300);
        if (!alive(t)) return;
        await typeText(greet, ap.greeting || '', 60);
        if (!alive(t)) return;
        await sleep(800);
        for (let i = 0; i < lineEls.length; i++) {
          if (!alive(t)) return;
          lineEls[i].classList.add('show');
          setClear(((i + 1) / lineEls.length) * 0.95);
          if (window.innerWidth < 860) lineEls[i].scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
          await sleep(clamp(1800 + lineEls[i].textContent.length * 45, 2600, 7000));
        }
        if (!alive(t)) return;
        finish();
        Sound.play('chime');
        const heart = $('.cin-character .b-heart');
        if (heart) setTimeout(() => burstAt(heart, { items: ['💖', '✨', '💗'], count: 12, spread: 110 }), 900);
      },
      leave() { rain.stop(); },
    };
  })();
  handlers[2] = cinema;

  /* ===== Scene 4 — The happiness lab ===== */
  (() => {
    const compliments = deck(list(C.compliments, ['You are wonderful.']));
    const notes = deck(list(C.scientistNotes, ['Research note: you are lovely.']));

    $('#hugBtn').addEventListener('click', (e) => {
      const needle = $('#hugNeedle');
      needle.style.transform = 'rotate(70deg)';
      Sound.play('pop');
      burstAt(e.currentTarget, { items: ['💗', '💞', '🫂'], count: 10 });
      setTimeout(() => bigHug(C.hugText || 'One giant virtual hug!'), 450);
      setTimeout(() => { needle.style.transform = ''; }, 2600);
    });

    let growing = false;
    $('#flowerBtn').addEventListener('click', async (e) => {
      if (growing) return;
      growing = true;
      const f = $('#growFlower'), btn = e.currentTarget;
      btn.disabled = true;
      if (f.classList.contains('grown')) { f.classList.remove('grown'); await rawSleep(700); }
      const [c1, c2] = pick(palettes);
      const n = randInt(5, 8);
      $('.gf-head', f).innerHTML =
        Array.from({ length: n }, (_, i) => `<ellipse cx="60" cy="44" rx="9" ry="15" fill="${c1}" stroke="#fff" stroke-width="1.5" transform="rotate(${(i * 360) / n} 60 58)"/>`).join('') +
        `<circle cx="60" cy="58" r="8" fill="${c2}"/>`;
      void f.getBoundingClientRect();
      f.classList.add('grown');
      Sound.play('grow');
      await rawSleep(reduceMotion ? 300 : 2100);
      burstAt(f, { items: ['🌸', '🌷', '✨'], count: 10, spread: 90 });
      Sound.play('chime');
      btn.textContent = 'Grow another 🌷';
      btn.disabled = false;
      growing = false;
    });

    $('#complimentBtn').addEventListener('click', () => {
      const scr = $('.tv-screen');
      scr.classList.remove('flicker'); void scr.offsetWidth; scr.classList.add('flicker');
      Sound.play('pop');
      setTimeout(() => { $('#complimentText').textContent = compliments(); }, 160);
    });

    let scanning = false;
    $('#scanBtn').addEventListener('click', async (e) => {
      if (scanning) return;
      scanning = true;
      const r = $('#radar'), st = $('#scanStatus'), bar = $('#scanBar'), btn = e.currentTarget;
      btn.disabled = true;
      r.classList.remove('alert'); r.classList.add('scanning');
      const steps = ['Scanning…', 'Detecting smile…', 'Measuring cuteness…', 'Cuteness off the charts…'];
      for (let p = 0; p <= 100; p += 4) {
        bar.style.width = p + '%';
        st.textContent = `${steps[Math.min(3, Math.floor(p / 26))]} ${p}%`;
        if (p % 12 === 0) Sound.play('scan');
        await rawSleep(reduceMotion ? 10 : 90);
      }
      r.classList.remove('scanning'); r.classList.add('alert');
      st.textContent = '⚠ Warning: An extremely adorable human detected!';
      Sound.play('alert');
      burstAt(r, { items: ['💖', '✨', '😊', '💗'], count: 12 });
      btn.textContent = 'Scan again 🔍';
      btn.disabled = false;
      scanning = false;
    });

    const goodies = ['💖', '⭐', '🌸', '🍬', '🧸', '🌈', '🐰', '🎀', '🦋', '🌷', '🍓', '☁️', '💌', '🌟'];
    $('#dispenseBtn').addEventListener('click', () => {
      $('#crank').animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], { duration: 650, easing: 'cubic-bezier(.34,1.56,.64,1)' });
      const g = $('.gumball'); g.classList.remove('shake'); void g.offsetWidth; g.classList.add('shake');
      Sound.play('pop');
      setTimeout(() => {
        burstAt($('#chute'), { items: goodies, count: 18, spread: 190, rise: 130, size: [18, 34] });
        Sound.play('sparkle');
        const tray = $('#tray'), emoji = pick(goodies);
        const st = document.createElement('button');
        st.type = 'button'; st.textContent = emoji;
        st.setAttribute('aria-label', `Sticker ${emoji}. Tap to pop it.`);
        st.addEventListener('click', () => { burstAt(st, { items: [emoji, '✨'], count: 8, spread: 60 }); Sound.play('pop'); st.remove(); });
        tray.appendChild(st);
        while (tray.children.length > 8) tray.firstElementChild.remove();
      }, 420);
    });

    $('#scientist').addEventListener('click', (e) => {
      Sound.play('sparkle');
      burstAt(e.currentTarget, { items: ['🫧', '✨', '🧪', '💗'], count: 10, spread: 90 });
      toast(notes(), 4200);
    });

    handlers[3] = { enter() { setTimeout(() => { if (current === 3) spawnBalloon({ left: rand(60, 85) }); }, 5000); } };
  })();

  /* ===== Scene 5 — Collect the little hearts (mini-game) ===== */
  const Game = (() => {
    const cv = $('#gameCanvas'), ctx = cv.getContext('2d');
    const heartsEl = $('#gHearts'), starsEl = $('#gStars'), msgEl = $('#gameMsg');
    const msgs = deck(list(C.gameMessages, ['💖']));
    const GOAL = 5, SPEED = 330;
    let w = 0, h = 0, dpr = 1, raf = null, last = 0, started = false, unlocked = false;
    let hearts = 0, starsN = 0, items = [], deco = [], petals = [], bg = null, msgTimer = null;
    const keys = new Set(), pad = new Set();
    let pointer = null;
    const p = { x: 0, y: 0, vx: 0, vy: 0, face: 1, t: 0, moving: false };

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = cv.clientWidth; h = cv.clientHeight;
      if (!w || !h) return;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildBg();
      if (!p.x) { p.x = w * 0.5; p.y = h * 0.75; }
      p.x = clamp(p.x, 30, w - 30); p.y = clamp(p.y, minY(), h - 24);
      items.forEach((it) => { it.x = clamp(it.x, 30, w - 30); it.y = clamp(it.y, minY(), h - 40); });
    }
    const minY = () => Math.max(h * 0.3, 150);

    function buildBg() {
      bg = document.createElement('canvas');
      bg.width = cv.width; bg.height = cv.height;
      const b = bg.getContext('2d');
      b.setTransform(dpr, 0, 0, dpr, 0, 0);
      const sky = b.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#ffd6ea'); sky.addColorStop(0.45, '#eadcff'); sky.addColorStop(0.7, '#fff0e0'); sky.addColorStop(1, '#fff0e0');
      b.fillStyle = sky; b.fillRect(0, 0, w, h);
      const sun = b.createRadialGradient(w * 0.82, h * 0.2, 0, w * 0.82, h * 0.2, 110);
      sun.addColorStop(0, 'rgba(255,250,220,1)'); sun.addColorStop(0.5, 'rgba(255,224,150,.6)'); sun.addColorStop(1, 'rgba(255,224,150,0)');
      b.fillStyle = sun; b.fillRect(0, 0, w, h);
      b.fillStyle = 'rgba(255,255,255,.85)';
      [[0.15, 0.18, 1], [0.5, 0.12, 0.7], [0.7, 0.3, 0.8]].forEach(([cx, cy, sc]) => {
        const x = w * cx, y = h * cy, r = 24 * sc;
        b.beginPath(); b.arc(x, y, r, 0, 7); b.arc(x + r * 1.2, y - r * 0.5, r * 1.3, 0, 7); b.arc(x + r * 2.6, y, r, 0, 7); b.fill();
        b.fillRect(x, y - 2, r * 2.6, r);
      });
      const hill = (y0, amp, color, phase) => {
        b.fillStyle = color; b.beginPath(); b.moveTo(0, h);
        for (let x = 0; x <= w + 20; x += 20) b.lineTo(x, y0 + Math.sin(x / w * Math.PI * 2 + phase) * amp);
        b.lineTo(w, h); b.closePath(); b.fill();
      };
      hill(h * 0.5, 26, '#d4f0d8', 0.5); hill(h * 0.62, 20, '#bfe8c8', 2); hill(h * 0.76, 14, '#a8ddb4', 4);
      b.fillStyle = 'rgba(255,255,255,.45)';
      for (let i = 0; i < 70; i++) { b.beginPath(); b.arc(rand(0, w), rand(h * 0.62, h), rand(1, 2.4), 0, 7); b.fill(); }
      deco = Array.from({ length: Math.round(clamp(w / 45, 12, 34)) }, () => {
        const [c1, c2] = pick(palettes);
        return { x: rand(0, w), y: rand(h * 0.6, h), s: rand(0.7, 1.3), c1, c2, ph: rand(0, 6) };
      }).sort((a, b2) => a.y - b2.y);
      petals = Array.from({ length: reduceMotion ? 0 : 14 }, () => ({ x: rand(0, w), y: rand(0, h), v: rand(14, 30), ph: rand(0, 6), c: pick(['#ffc8dd', '#ffd6a5', '#fff']) }));
    }

    function spawn(type) {
      let x, y, tries = 0;
      do { x = rand(40, w - 40); y = rand(minY(), h - 50); tries++; } while (Math.hypot(x - p.x, y - p.y) < 150 && tries < 20);
      items.push({ type, x, y, ph: rand(0, 6.28), born: performance.now() });
    }
    function ensureItems() {
      while (items.filter((i) => i.type === 'heart').length < 3) spawn('heart');
      while (items.filter((i) => i.type === 'star').length < 2) spawn('star');
    }

    function showMsg(text) {
      msgEl.textContent = text;
      msgEl.classList.add('show');
      clearTimeout(msgTimer);
      msgTimer = setTimeout(() => msgEl.classList.remove('show'), 2400);
    }
    function bump(el) { const pill = el.parentElement; pill.classList.remove('bump'); void pill.offsetWidth; pill.classList.add('bump'); }

    function collect(it) {
      items.splice(items.indexOf(it), 1);
      const r = cv.getBoundingClientRect();
      if (it.type === 'heart') {
        hearts++; heartsEl.textContent = Math.min(hearts, GOAL) + (hearts > GOAL ? '+' : '');
        bump(heartsEl); Sound.play('collect');
        burst(r.left + it.x, r.top + it.y, { items: ['💖', '💗', '✨'], count: 10, spread: 70 });
      } else {
        starsN++; starsEl.textContent = starsN;
        bump(starsEl); Sound.play('star');
        burst(r.left + it.x, r.top + it.y, { items: ['⭐', '✨', '💫'], count: 10, spread: 70 });
      }
      showMsg(msgs());
      if (hearts >= GOAL && !unlocked) unlock();
      setTimeout(ensureItems, 500);
    }
    function unlock() {
      unlocked = true;
      Sound.play('unlock');
      Confetti.fire(160);
      keys.clear(); pad.clear(); pointer = null;
      const L = C.secretLetter || {};
      setTimeout(() => {
        if (current !== 4) return;
        Modal.open(`<h3>${esc(L.title || 'A secret letter 💌')}</h3><div class="hand">${paras(L.text || '')}</div>`, { cls: 'paper' });
      }, 800);
      $('#gameNext').hidden = false;
      $('#gameSkip').hidden = true;
    }

    function update(dt) {
      let ix = 0, iy = 0;
      if (keys.has('left') || pad.has('left')) ix -= 1;
      if (keys.has('right') || pad.has('right')) ix += 1;
      if (keys.has('up') || pad.has('up')) iy -= 1;
      if (keys.has('down') || pad.has('down')) iy += 1;
      if (pointer) { const dx = pointer.x - p.x, dy = pointer.y - (p.y - 20), d = Math.hypot(dx, dy); if (d > 14) { ix = dx / d; iy = dy / d; } }
      const len = Math.hypot(ix, iy);
      const tx = len ? (ix / len) * SPEED : 0, ty = len ? (iy / len) * SPEED : 0;
      const k = Math.min(1, dt * 9);
      p.vx += (tx - p.vx) * k; p.vy += (ty - p.vy) * k;
      p.x = clamp(p.x + p.vx * dt, 28, w - 28);
      p.y = clamp(p.y + p.vy * dt, minY(), h - 22);
      p.moving = Math.hypot(p.vx, p.vy) > 40;
      if (Math.abs(p.vx) > 25) p.face = Math.sign(p.vx);
      p.t += dt;
      const time = performance.now() / 1000;
      for (const it of items.slice()) {
        const iy2 = it.y + Math.sin(time * 2 + it.ph) * 8;
        if (Math.hypot(it.x - p.x, iy2 - (p.y - 30)) < 44) collect(it);
      }
    }

    function heartPath(x, y, s) {
      ctx.beginPath();
      ctx.moveTo(x, y + s * 0.45);
      ctx.bezierCurveTo(x - s * 0.95, y - s * 0.1, x - s * 0.45, y - s * 0.8, x, y - s * 0.3);
      ctx.bezierCurveTo(x + s * 0.45, y - s * 0.8, x + s * 0.95, y - s * 0.1, x, y + s * 0.45);
      ctx.closePath();
    }
    function starPath(x, y, r, rot) {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = rot + (i * Math.PI) / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r;
        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.closePath();
    }
    function ell(x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); }

    function drawBunny(x, y, face, t, moving) {
      const bounce = moving ? Math.abs(Math.sin(t * 12)) * 9 : Math.sin(t * 3) * 1.5;
      ctx.fillStyle = 'rgba(120, 80, 140, .18)';
      ell(x, y + 2, 24 - bounce * 0.6, 6); ctx.fill();
      ctx.save();
      ctx.translate(x, y - bounce);
      ctx.scale(face, 1);
      ctx.lineWidth = 2.5; ctx.strokeStyle = '#f0cfe0';
      const earTilt = moving ? Math.sin(t * 12) * 0.12 : Math.sin(t * 2) * 0.05;
      [[-9, -0.18], [9, 0.18]].forEach(([ex, r]) => {
        ctx.fillStyle = '#fff'; ell(ex, -62, 7, 19, r - earTilt); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffc6db'; ell(ex, -61, 3.4, 13, r - earTilt); ctx.fill();
      });
      ctx.fillStyle = '#fff'; ell(-20, -10, 7, 7); ctx.fill(); ctx.stroke();
      ell(0, -14, 22, 19); ctx.fill(); ctx.stroke();
      ell(-10, -1, 8, 5); ctx.fill(); ctx.stroke(); ell(10, -1, 8, 5); ctx.fill(); ctx.stroke();
      ell(4, -38, 19, 17); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#3b2a4a'; ell(0, -40, 2.6, 3.2); ctx.fill(); ell(12, -40, 2.6, 3.2); ctx.fill();
      ctx.fillStyle = '#fff'; ell(1, -41.5, 1, 1); ctx.fill(); ell(13, -41.5, 1, 1); ctx.fill();
      ctx.fillStyle = 'rgba(255,170,200,.8)'; ell(-5, -33, 4, 2.4); ctx.fill(); ell(18, -33, 4, 2.4); ctx.fill();
      ctx.fillStyle = '#ff8fb3'; ell(7, -35, 2, 1.5); ctx.fill();
      ctx.restore();
    }

    function draw(time) {
      ctx.clearRect(0, 0, w, h);
      if (bg) ctx.drawImage(bg, 0, 0, w, h);
      for (const f of deco) {
        const sway = reduceMotion ? 0 : Math.sin(time * 1.6 + f.ph) * 4;
        const hh = 22 * f.s;
        ctx.strokeStyle = '#6cbf7a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.quadraticCurveTo(f.x, f.y - hh / 2, f.x + sway, f.y - hh); ctx.stroke();
        ctx.fillStyle = f.c1;
        for (let i = 0; i < 5; i++) { const a = (i / 5) * 6.283 + time * 0.2; ell(f.x + sway + Math.cos(a) * 5 * f.s, f.y - hh + Math.sin(a) * 5 * f.s, 4 * f.s, 4 * f.s); ctx.fill(); }
        ctx.fillStyle = f.c2; ell(f.x + sway, f.y - hh, 3 * f.s, 3 * f.s); ctx.fill();
      }
      for (const pt of petals) {
        pt.y += pt.v / 60; pt.x += Math.sin(time + pt.ph) * 0.5;
        if (pt.y > h + 10) { pt.y = -10; pt.x = rand(0, w); }
        ctx.fillStyle = pt.c; ctx.globalAlpha = 0.8; ell(pt.x, pt.y, 4, 2.5, time + pt.ph); ctx.fill(); ctx.globalAlpha = 1;
      }
      const drawables = items.map((it) => ({ y: it.y, it })).concat([{ y: p.y - 30, player: true }]).sort((a, b) => a.y - b.y);
      for (const d of drawables) {
        if (d.player) { drawBunny(p.x, p.y, p.face, p.t, p.moving); continue; }
        const it = d.it, age = Math.min(1, (performance.now() - it.born) / 400);
        const y = it.y + Math.sin(time * 2 + it.ph) * 8, s = age;
        ctx.save();
        ctx.shadowColor = it.type === 'heart' ? 'rgba(255, 90, 150, .8)' : 'rgba(255, 210, 90, .9)';
        ctx.shadowBlur = 16;
        if (it.type === 'heart') { ctx.fillStyle = '#ff6f9c'; heartPath(it.x, y, 26 * s); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.7)'; ell(it.x - 6 * s, y - 6 * s, 3.5 * s, 2.2 * s, -0.6); ctx.fill(); }
        else { ctx.fillStyle = '#ffd45c'; starPath(it.x, y, 15 * s, time * 0.8 + it.ph); ctx.fill(); }
        ctx.restore();
      }
    }

    function loop(ts) {
      const dt = Math.min(0.05, (ts - last) / 1000 || 0);
      last = ts;
      if (started && !Modal.isOpen) update(dt);
      draw(ts / 1000);
      raf = requestAnimationFrame(loop);
    }

    function begin() {
      if (started) return;
      started = true;
      Sound.ensure(); Sound.play('pop');
      $('#gameStart').hidden = true;
      ensureItems();
      cv.focus && cv.focus({ preventScroll: true });
      showMsg('Collect the hearts! 💖');
    }

    const keyMap = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down' };
    document.addEventListener('keydown', (e) => {
      if (current !== 4 || Modal.isOpen) return;
      const dir = keyMap[e.key];
      if (!dir) return;
      if (e.target.closest && e.target.closest('input, textarea')) return;
      e.preventDefault();
      if (!started) begin();
      keys.add(dir);
    });
    document.addEventListener('keyup', (e) => { const dir = keyMap[e.key]; if (dir) keys.delete(dir); });
    window.addEventListener('blur', () => { keys.clear(); pad.clear(); pointer = null; });

    const localPoint = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    cv.addEventListener('pointerdown', (e) => { if (!started) begin(); pointer = localPoint(e); try { cv.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ } });
    cv.addEventListener('pointermove', (e) => { if (pointer) pointer = localPoint(e); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => cv.addEventListener(ev, () => { pointer = null; }));

    $$('#dpad button').forEach((b) => {
      const dir = b.dataset.dir;
      const on = (e) => { e.preventDefault(); if (!started) begin(); pad.add(dir); b.classList.add('held'); };
      const off = () => { pad.delete(dir); b.classList.remove('held'); };
      b.addEventListener('pointerdown', on);
      b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
      b.addEventListener('contextmenu', (e) => e.preventDefault());
    });
    $('#gameStartBtn').addEventListener('click', begin);

    return {
      enter() { resize(); last = performance.now(); if (!raf) raf = requestAnimationFrame(loop); if (started) ensureItems(); },
      leave() { cancelAnimationFrame(raf); raf = null; keys.clear(); pad.clear(); pointer = null; },
      skip() { if (!started) begin(); },
      resize,
    };
  })();
  handlers[4] = Game;

  /* ===== Scene 6 — The garden of little things ===== */
  (() => {
    const s = scenes[5], field = $('#gField'), card = $('#flowerCard'), countEl = $('#gCount');
    const data = list(C.flowers, [{ title: 'You', message: 'Simply being yourself.' }]);
    const n = data.length, bloomed = new Set();
    const heights = [64, 82, 70, 90, 66, 80, 72];
    let butterflies = 0;
    countEl.textContent = `0 / ${n} bloomed`;
    $('.g-head p', s).textContent = `${n} flowers, ${n} things I love about you. Tap each bud.`;

    function spawnButterfly(fromEl) {
      if (butterflies >= n) return;
      butterflies++;
      const start = centerOf(fromEl);
      const bf = document.createElement('div');
      bf.className = 'free-bf';
      const [c1, c2] = pick(palettes);
      bf.style.setProperty('--wing', c1); bf.style.setProperty('--wing2', c2);
      bf.innerHTML = '<i></i><i></i>';
      bf.style.left = '0px'; bf.style.top = '0px';
      s.appendChild(bf);
      if (reduceMotion) { bf.style.transform = `translate(${start.x}px, ${start.y - 60}px)`; return; }
      const W = innerWidth, H = innerHeight;
      const pts = [start, ...Array.from({ length: 4 }, () => ({ x: rand(W * 0.08, W * 0.92), y: rand(H * 0.22, H * 0.6) }))];
      bf.animate(pts.map((pt, i) => ({ transform: `translate(${pt.x}px, ${pt.y}px) rotate(${i % 2 ? 12 : -12}deg)` })), { duration: 3200, easing: 'ease-in-out', fill: 'forwards' })
        .onfinish = () => {
          const end = pts[pts.length - 1];
          const loopPts = [end, ...Array.from({ length: 3 }, () => ({ x: clamp(end.x + rand(-160, 160), 20, W - 40), y: clamp(end.y + rand(-100, 100), H * 0.2, H * 0.7) }))];
          bf.animate(loopPts.map((pt, i) => ({ transform: `translate(${pt.x}px, ${pt.y}px) rotate(${i % 2 ? 10 : -10}deg)` })), { duration: rand(7000, 10000), iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' });
        };
    }


    /* Original illustrations, one per flower (used when no photo is set). */
    const svgArt = (bg1, bg2, body) => '<svg viewBox="0 0 240 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><defs><linearGradient id="artBg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + bg1 + '"/><stop offset="1" stop-color="' + bg2 + '"/></linearGradient></defs><rect width="240" height="150" fill="url(#artBg)"/>' + body + '</svg>';
    const sparkle = (x, y, s = 1, c = '#fff') => '<path class="art-twinkle" d="M' + x + ' ' + (y - 8 * s) + ' Q' + x + ' ' + y + ' ' + (x + 8 * s) + ' ' + y + ' Q' + x + ' ' + y + ' ' + x + ' ' + (y + 8 * s) + ' Q' + x + ' ' + y + ' ' + (x - 8 * s) + ' ' + y + ' Q' + x + ' ' + y + ' ' + x + ' ' + (y - 8 * s) + 'Z" fill="' + c + '"/>';
    const gardenArt = [
      // 1. Your beautiful smile: a smiling sun
      svgArt('#ffe1c9', '#ffc8dd',
        '<g class="art-spin">' + Array.from({ length: 12 }, (_, k) => '<rect x="117" y="14" width="6" height="18" rx="3" fill="#ffd88a" transform="rotate(' + k * 30 + ' 120 75)"/>').join('') + '</g>' +
        '<circle cx="120" cy="75" r="38" fill="#ffe08a" stroke="#fff3c4" stroke-width="4"/>' +
        '<path d="M104 70 q6 -7 12 0 M124 70 q6 -7 12 0" stroke="#7a4b3a" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
        '<path d="M102 82 Q120 104 138 82 Z" fill="#ff7a9c" stroke="#7a4b3a" stroke-width="3" stroke-linejoin="round"/>' +
        '<ellipse cx="97" cy="84" rx="7" ry="4" fill="#ff9fbf" opacity=".7"/><ellipse cx="143" cy="84" rx="7" ry="4" fill="#ff9fbf" opacity=".7"/>' +
        sparkle(40, 40) + sparkle(200, 110, .8) + sparkle(206, 34, .6)),
      // 2. Your laughter: a laughing face with music notes
      svgArt('#e9dcff', '#ffd9ec',
        '<circle cx="120" cy="80" r="42" fill="#fff0f6" stroke="#ffc8dd" stroke-width="4"/>' +
        '<path d="M100 72 l8 -7 l8 7 M124 72 l8 -7 l8 7" stroke="#5a3d6e" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M100 86 Q120 116 140 86 Z" fill="#ff7a9c" stroke="#5a3d6e" stroke-width="3" stroke-linejoin="round"/><path d="M110 100 q10 8 20 0" fill="#ffb3cc"/>' +
        '<ellipse cx="94" cy="90" rx="7" ry="4" fill="#ffafcc"/><ellipse cx="146" cy="90" rx="7" ry="4" fill="#ffafcc"/>' +
        '<text class="art-float" x="34" y="62" font-size="30" fill="#b79ce0">♪</text><text class="art-float d2" x="180" y="56" font-size="26" fill="#ff8fb8">♫</text>' +
        '<text class="art-float d3" x="192" y="118" font-size="20" fill="#a2d2ff">♪</text>' +
        '<text x="44" y="122" font-family="Fredoka, sans-serif" font-size="18" fill="#c2457a" transform="rotate(-10 44 122)">haha</text>'),
      // 3. Your kindness: two hands holding a heart
      svgArt('#d9f5e3', '#e0eeff',
        '<path d="M58 118 Q70 86 104 96 L118 110 Q96 128 58 118Z" fill="#ffd9c2" stroke="#e8b893" stroke-width="3"/>' +
        '<path d="M182 118 Q170 86 136 96 L122 110 Q144 128 182 118Z" fill="#ffd9c2" stroke="#e8b893" stroke-width="3"/>' +
        '<path class="art-beat" d="M120 98 C92 80 96 48 113 52 C117 53 119 57 120 61 C121 57 123 53 127 52 C144 48 148 80 120 98Z" fill="#ff6f9c" stroke="#fff" stroke-width="3"/>' +
        sparkle(80, 50, .9) + sparkle(162, 40, .7) + sparkle(178, 78, .5) + sparkle(64, 80, .5)),
      // 4. Your little habits: a cozy mug and a cookie
      svgArt('#fff1dc', '#ffe0ea',
        '<path class="art-steam" d="M102 46 q-8 -10 0 -20 q8 -10 0 -20" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".9"/>' +
        '<path class="art-steam d2" d="M122 46 q-8 -10 0 -20 q8 -10 0 -20" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".9"/>' +
        '<rect x="84" y="52" width="58" height="66" rx="12" fill="#cdb4db" stroke="#fff" stroke-width="3"/>' +
        '<path d="M142 66 q22 0 22 18 q0 18 -22 18" stroke="#cdb4db" stroke-width="9" fill="none"/>' +
        '<path d="M113 96 C100 88 101 74 109 75 C111 75 112 77 113 79 C114 77 115 75 117 75 C125 74 126 88 113 96Z" fill="#ff8fb8"/>' +
        '<ellipse cx="113" cy="122" rx="44" ry="6" fill="#e9c9b0" opacity=".6"/>' +
        '<circle cx="186" cy="114" r="18" fill="#e9b47a" stroke="#d39a5c" stroke-width="2"/><circle cx="180" cy="108" r="2.6" fill="#7a4b3a"/><circle cx="191" cy="112" r="2.4" fill="#7a4b3a"/><circle cx="184" cy="120" r="2.4" fill="#7a4b3a"/>' +
        sparkle(48, 44, .8, '#ffd88a') + sparkle(200, 40, .6)),
      // 5. Your personality: a rainbow with clouds
      svgArt('#cfe8ff', '#f3e8ff',
        ['#ff8fa3', '#ffd6a5', '#ffe08a', '#b9f0c9', '#a2d2ff', '#cdb4db'].map((c, k) => '<path d="M' + (44 + k * 9) + ' 118 A' + (76 - k * 9) + ' ' + (76 - k * 9) + ' 0 0 1 ' + (196 - k * 9) + ' 118" stroke="' + c + '" stroke-width="9" fill="none"/>').join('') +
        '<g fill="#fff"><circle cx="44" cy="118" r="14"/><circle cx="60" cy="122" r="12"/><circle cx="30" cy="124" r="10"/><circle cx="196" cy="118" r="14"/><circle cx="212" cy="122" r="11"/><circle cx="182" cy="124" r="10"/></g>' +
        sparkle(120, 30, .9) + sparkle(36, 44, .6) + sparkle(210, 50, .7)),
      // 6. Ordinary moments made special: a cozy night window
      svgArt('#3b2a6b', '#6b4b9a',
        '<rect x="62" y="22" width="116" height="96" rx="10" fill="#2a1d55" stroke="#ffe7c2" stroke-width="6"/>' +
        '<path d="M120 22 V118 M62 70 H178" stroke="#ffe7c2" stroke-width="5"/>' +
        '<circle cx="152" cy="46" r="13" fill="#fff1c1"/><circle cx="158" cy="42" r="11" fill="#2a1d55"/>' +
        sparkle(84, 40, .5) + sparkle(100, 92, .45) + sparkle(160, 96, .5) + sparkle(138, 88, .35) +
        '<rect x="50" y="116" width="140" height="10" rx="4" fill="#c79a7a"/>' +
        '<rect x="88" y="98" width="20" height="20" rx="4" fill="#ffafcc"/><rect x="130" y="98" width="20" height="20" rx="4" fill="#a2d2ff"/>' +
        '<path d="M98 92 q-4 -5 0 -10 M140 92 q-4 -5 0 -10" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".8"/>' +
        Array.from({ length: 9 }, (_, k) => '<circle class="art-twinkle" style="animation-delay:-' + (k * 0.3).toFixed(1) + 's" cx="' + (66 + k * 13.5) + '" cy="' + (16 + (k % 2) * 5) + '" r="3.2" fill="' + ['#ffe08a', '#ffafcc', '#a2d2ff'][k % 3] + '"/>').join('')),
      // 7. Simply being yourself: a mirror reflecting a crowned heart
      svgArt('#ffd9e8', '#e9dcff',
        '<ellipse cx="120" cy="75" rx="46" ry="58" fill="#ffd88a" stroke="#f6b26b" stroke-width="3"/>' +
        '<ellipse cx="120" cy="75" rx="37" ry="49" fill="#eef6ff"/><path d="M98 44 q8 -12 22 -14" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>' +
        '<path class="art-beat" d="M120 100 C98 86 101 62 114 65 C117 65 119 68 120 71 C121 68 123 65 126 65 C139 62 142 86 120 100Z" fill="#ff6f9c"/>' +
        '<path d="M108 58 l4 -12 l8 8 l8 -8 l4 12 Z" fill="#ffd88a" stroke="#f6b26b" stroke-width="2" stroke-linejoin="round"/>' +
        '<text x="120" y="146" text-anchor="middle" font-family="Caveat, cursive" font-size="18" fill="#c2457a">just you</text>' +
        sparkle(56, 40, .8) + sparkle(186, 60, .7) + sparkle(182, 118, .5)),
    ];

    const media = $('#flowerCardMedia');
    function showCard(d, i) {
      card.hidden = false;
      card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
      $('#flowerCardTitle').textContent = d.title;
      $('#flowerCardMsg').textContent = d.message;
      const drawing = gardenArt[i % gardenArt.length];
      const photo = PhotoLock.src(d.image);
      media.classList.toggle('is-photo', !!photo);
      if (photo) {
        media.innerHTML = '<img src="' + esc(photo) + '" alt="' + esc(d.alt || d.title) + '">';
        $('img', media).addEventListener('error', () => { media.classList.remove('is-photo'); media.innerHTML = drawing; }, { once: true });
      } else {
        media.innerHTML = drawing;
      }
    }
    $('#flowerCardClose').addEventListener('click', () => { card.hidden = true; Sound.play('click'); });

    data.forEach((d, i) => {
      const [c1, c2] = palettes[i % palettes.length];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'g-flower';
      const span = innerWidth < 640 ? 94 : 84;
      b.style.left = `${(100 - span) / 2 + (i + 0.5) * (span / n)}%`;
      b.style.setProperty('--h', heights[i % heights.length] + '%');
      b.style.setProperty('--d', rand(4, 6).toFixed(2) + 's');
      b.setAttribute('aria-label', `Flower ${i + 1} of ${n}, still a bud. Tap to bloom.`);
      const petals = 8;
      b.innerHTML = `<svg viewBox="0 0 100 300" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false"><g class="gfl-sway">
          <path d="M50 300 C46 220 56 140 50 60" stroke="#5fae6e" stroke-width="5" fill="none"/>
          <path d="M50 225 C30 214 20 194 24 184 C40 188 48 204 50 225Z" fill="#7cc98a"/>
          <path d="M50 170 C70 160 80 142 76 132 C60 136 52 152 50 170Z" fill="#7cc98a"/>
          <g class="gfl-head">
            ${Array.from({ length: petals }, (_, k) => `<g transform="rotate(${(k * 360) / petals} 50 50)"><g class="petal" style="--pd:${(k * 0.05).toFixed(2)}s"><ellipse cx="50" cy="27" rx="12" ry="22" fill="${c1}" stroke="#fff" stroke-width="2"/></g></g>`).join('')}
            <path class="sepal" d="M34 60 Q50 26 66 60 Q50 72 34 60Z" fill="#7cc98a"/>
            <circle class="fcenter" cx="50" cy="50" r="11" fill="${c2}" stroke="#fff" stroke-width="2"/>
          </g></g></svg>`;
      b.addEventListener('click', () => {
        const first = !bloomed.has(i);
        bloomed.add(i);
        b.classList.add('bloomed');
        b.setAttribute('aria-label', `${d.title}. Bloomed. Tap to read again.`);
        Sound.play(first ? 'chime' : 'pop');
        const head = $('.gfl-head', b);
        burstAt(head, { items: ['🌸', '✨', '💖', '🌷'], count: first ? 14 : 6, spread: 100 });
        if (first) spawnButterfly(head);
        showCard(d, i);
        countEl.textContent = `${bloomed.size} / ${n} bloomed`;
        if (first && bloomed.size === n) setTimeout(() => { Confetti.fire(120); Companion.say(((C.little && C.little.gardenDone) || "The whole garden is blooming for you")); }, 900);
      });
      field.appendChild(b);
    });
    handlers[5] = { leave() { card.hidden = true; } };
  })();

  /* ===== Scene 7 — Our little memory museum ===== */
  (() => {
    const s = scenes[6], gallery = $('#gallery'), layer = $('#stickerLayer');
    const photos = list(C.photos, []);
    const tilts = [-4, 3, -2, 5, -3, 2, -5, 4];
    const empties = [['#ffd1e3', '#d9c8f5'], ['#cfe8ff', '#ffd6e7'], ['#ffe5c4', '#ffc8dd'], ['#d9f5e3', '#cde3ff']];
    const emptyHTML = (i, big = false) => {
      const [e1, e2] = empties[i % empties.length];
      return `<span class="ph-empty" style="--e1:${e1};--e2:${e2}${big ? ';max-height:52vh' : ''}"><b>${['💗', '📷', '🌸', '✨'][i % 4]}</b>Your photo here</span>`;
    };
    const lockedHTML = () => '<span class="ph-empty ph-locked"><b>🔒</b>Locked</span>';
    const imgHTML = (ph, i, cls) => {
      if (!ph.src) return emptyHTML(i, cls === 'pv-img');
      const s = PhotoLock.src(ph.src);
      return s ? `<img class="${cls}" src="${esc(s)}" alt="${esc(ph.caption || 'Our photo')}" loading="lazy" decoding="async">` : lockedHTML();
    };
    const fallback = (root, i) => $$('img', root).forEach((img) => img.addEventListener('error', () => { img.outerHTML = emptyHTML(i, img.classList.contains('pv-img')); }, { once: true }));

    function openPhoto(ph, i) {
      Modal.open(`${imgHTML(ph, i, 'pv-img')}
        <p class="pv-date">${esc(ph.date || '')}</p>
        <h3 class="pv-caption">${esc(ph.caption || '')}</h3>
        <div class="hand">${paras(ph.message || '')}</div>`, { cls: 'photo-view paper' });
      fallback($('#modalBody'), i);
    }

    const makePolaroid = (ph, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'polaroid' + (ph.featured ? ' featured' : '');
      b.style.setProperty('--r', (ph.featured ? -1.5 : tilts[i % tilts.length]) + 'deg');
      b.style.setProperty('--fd', rand(5, 7.5).toFixed(2) + 's');
      b.style.setProperty('--fdl', -rand(0, 5).toFixed(2) + 's');
      b.setAttribute('aria-label', `Photo ${i + 1}: ${ph.caption || 'memory'}. Open.`);
      b.innerHTML = `${ph.featured ? '<span class="pol-ribbon" aria-hidden="true">♥ my favourite</span>' : i % 3 === 1 ? '<span class="pol-tape" aria-hidden="true"></span>' : ''}${imgHTML(ph, i, 'ph')}<span class="pol-cap">${esc(ph.caption || '')}</span><span class="pol-date">${esc(ph.date || '')}</span>`;
      fallback(b, i);
      b.addEventListener('click', () => {
        if (PhotoLock.isLocked(ph.src) && !PhotoLock.unlocked) { askForWord(); return; }
        Sound.play('pop'); openPhoto(ph, i);
      });
      if (!coarse && !reduceMotion) {
        b.addEventListener('pointermove', (e) => {
          const r = b.getBoundingClientRect();
          b.style.setProperty('--ty', (((e.clientX - r.left) / r.width - 0.5) * 16).toFixed(1) + 'deg');
          b.style.setProperty('--tx', ((0.5 - (e.clientY - r.top) / r.height) * 16).toFixed(1) + 'deg');
        });
        b.addEventListener('pointerleave', () => { b.style.setProperty('--tx', '0deg'); b.style.setProperty('--ty', '0deg'); });
      }
      return b;
    };

    function buildGallery() {
      gallery.innerHTML = '';
      gallery.classList.remove('has-featured');
      /* Layout: a photo marked featured sits in the middle and is the biggest.
         Desktop: 4-column grid, featured spans the centre 2×2 with the others
         around it. Phones: 2 columns, featured full-width halfway down. */
      const fIdx = photos.findIndex((ph) => ph.featured);
      if (fIdx < 0) {
        photos.forEach((ph, i) => gallery.appendChild(makePolaroid(ph, i)));
      } else {
        gallery.classList.add('has-featured');
        const others = photos.map((ph, i) => ({ ph, i })).filter((o) => o.i !== fIdx);
        const m = others.length;
        // Desktop slots: top row, then the two sides of the featured photo, then centred rows below.
        const ring = [[1, 1], [2, 1], [3, 1], [4, 1], [1, 2], [4, 2], [1, 3], [4, 3]];
        const dSlots = ring.slice(0, Math.min(m, 8));
        for (let r = 4, left = m - 8; left > 0; r++, left -= 4) {
          const k = Math.min(4, left), c0 = Math.floor((4 - k) / 2) + 1;
          for (let c = 0; c < k; c++) dSlots.push([c0 + c, r]);
        }
        // Phone slots: pairs, with the featured row in the middle.
        let before = Math.floor(m / 2); before -= before % 2;
        const fRow = before / 2 + 1;
        const mSlot = (j) => {
          const jj = j < before ? j : j - before;
          const row = (j < before ? 1 : fRow + 1) + Math.floor(jj / 2);
          const lastOdd = j === m - 1 && (m - before) % 2 === 1 && j >= before;
          return [lastOdd ? '1 / -1' : String((jj % 2) + 1), row];
        };
        const place = (el, gc, gr, mc, mr) => { el.style.setProperty('--gc', gc); el.style.setProperty('--gr', gr); el.style.setProperty('--mc', mc); el.style.setProperty('--mr', mr); };
        const els = others.map((o, j) => {
          const el = makePolaroid(o.ph, o.i);
          const [mc, mr] = mSlot(j);
          place(el, String(dSlots[j][0]), String(dSlots[j][1]), mc, String(mr));
          return el;
        });
        const fEl = makePolaroid(photos[fIdx], fIdx);
        fEl.querySelectorAll('img').forEach((img) => { img.loading = 'eager'; });
        place(fEl, '2 / span 2', '2 / span 2', '1 / -1', String(fRow));
        // DOM order follows the visual middle too, so keyboard focus reaches it halfway through.
        els.slice(0, before).forEach((el) => gallery.appendChild(el));
        gallery.appendChild(fEl);
        els.slice(before).forEach((el) => gallery.appendChild(el));
      }

    }

    /* Secret-word form for the locked photos */
    const lockForm = $('#photoLock'), passInput = $('#photoPass'), lockErr = $('#photoLockError'), lockBtn = $('#photoLockBtn');
    $('#photoLockHint').textContent = (C.photoLock && C.photoLock.hint) || 'Ask me for the secret word 💌';
    function askForWord() {
      Sound.play('click');
      lockForm.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
      lockForm.classList.remove('nudge'); void lockForm.offsetWidth; lockForm.classList.add('nudge');
      setTimeout(() => passInput.focus({ preventScroll: true }), 400);
    }
    lockForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const word = passInput.value;
      if (!word.trim()) { askForWord(); return; }
      lockBtn.disabled = true; lockBtn.textContent = 'Unlocking…'; lockErr.textContent = '';
      let ok = false;
      try { ok = await PhotoLock.unlock(word); }
      catch (err) { lockErr.textContent = err.message === 'insecure' ? 'Please open the site from its https:// link to unlock the photos.' : 'Something went wrong loading the photos. Please try again.'; }
      lockBtn.disabled = false; lockBtn.textContent = 'Unlock 🔑';
      if (ok) {
        passInput.value = '';
        lockForm.hidden = true;
        buildGallery();
        Sound.play('unlock'); Confetti.fire(140);
        toast((C.photoLock && C.photoLock.unlocked) || 'Unlocked 💖', 3600);
        $('.plaque', s).scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
      } else if (!lockErr.textContent) {
        lockErr.textContent = (C.photoLock && C.photoLock.wrong) || "That's not it. Try again 💭";
        lockForm.classList.remove('shake'); void lockForm.offsetWidth; lockForm.classList.add('shake');
        Sound.play('alert');
        passInput.select();
      }
    });
    PhotoLock.ready.then(() => {
      lockForm.hidden = !(PhotoLock.active && photos.some((ph) => PhotoLock.isLocked(ph.src)));
      buildGallery();
    });
    document.addEventListener('photos-unlocked', () => { lockForm.hidden = true; buildGallery(); });

    /* Draggable heart stickers */
    ['💖', '🌸', '⭐', '🎀', '🦋', '💕', '🌷', '✨'].forEach((emoji, i) => {
      const st = document.createElement('button');
      st.type = 'button';
      st.className = 'sticker';
      st.textContent = emoji;
      st.setAttribute('aria-label', `Sticker ${emoji}. Drag it around, or press to make it sparkle.`);
      const leftSide = i % 2 === 0;
      st.style.left = (leftSide ? rand(1, 7) : rand(88, 94)) + '%';
      st.style.top = 20 + Math.floor(i / 2) * 16 + rand(0, 5) + '%';
      st.style.animationDelay = -rand(0, 4) + 's';
      let drag = null, moved = false;
      st.addEventListener('pointerdown', (e) => {
        const r = st.getBoundingClientRect(), pr = layer.getBoundingClientRect();
        drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, pr };
        moved = false;
        st.classList.add('dragging');
        try { st.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      });
      st.addEventListener('pointermove', (e) => {
        if (!drag) return;
        moved = true;
        const x = clamp(e.clientX - drag.pr.left - drag.dx, 0, drag.pr.width - 40);
        const y = clamp(e.clientY - drag.pr.top - drag.dy, 0, drag.pr.height - 40);
        st.style.left = x + 'px'; st.style.top = y + 'px';
      });
      const end = () => { if (!drag) return; drag = null; st.classList.remove('dragging'); if (moved) Sound.play('pop'); };
      st.addEventListener('pointerup', end);
      st.addEventListener('pointercancel', end);
      st.addEventListener('click', () => { if (moved) { moved = false; return; } Sound.play('sparkle'); burstAt(st, { items: [emoji, '✨'], count: 8, spread: 60 }); });
      layer.appendChild(st);
    });
  })();

  /* ===== Scene 8 — The broken star repair shop ===== */
  (() => {
    const s = scenes[7], frags = $('#fragments'), log = $('#promiseLog'), cracks = $$('#bigStar .crack'), restoredMsg = $('#restoredMsg');
    $('#starIntro').textContent = C.starIntro || '';
    const promises = list(C.promises, ["I'll do better."]);
    let fixed = 0;
    const shards = ['20,2 31,15 25,38 9,27 7,11', '18,3 34,12 30,34 12,37 5,18', '21,1 36,20 22,39 6,24', '14,4 33,8 35,30 16,38 4,22', '20,3 30,10 34,28 20,38 8,30 6,12', '22,2 35,18 26,37 8,32 10,10'];
    promises.forEach((txt, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'fragment';
      b.style.setProperty('--a', (i * 360) / promises.length + 'deg');
      b.style.setProperty('--dl', -(i * 0.4).toFixed(1) + 's');
      b.setAttribute('aria-label', `Star fragment ${i + 1}. Tap to reveal a promise.`);
      b.innerHTML = `<span><svg viewBox="0 0 40 40" aria-hidden="true"><polygon points="${shards[i % shards.length]}" fill="#ffe08a" stroke="#fff6cf" stroke-width="2" stroke-linejoin="round"/><circle cx="17" cy="15" r="2.5" fill="#fff"/></svg></span>`;
      b.addEventListener('click', () => {
        if (b.disabled) return;
        b.disabled = true;
        const from = centerOf(b), to = centerOf($('#bigStar'));
        Sound.play('star');
        const anim = b.firstElementChild.animate([
          { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1 },
          { transform: `translate(${to.x - from.x}px, ${to.y - from.y}px) scale(.3) rotate(360deg)`, opacity: 0.2 },
        ], { duration: reduceMotion ? 10 : 900, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' });
        anim.onfinish = () => {
          b.classList.add('used');
          if (cracks[fixed]) cracks[fixed].classList.add('fixed');
          fixed++;
          s.style.setProperty('--fixed', fixed);
          Sound.play('chime');
          burst(to.x, to.y, { items: ['✨', '⭐', '💛'], count: 10, spread: 110 });
          const li = document.createElement('li');
          li.textContent = txt;
          log.appendChild(li);
          if (fixed === promises.length) restore(to);
        };
      });
      frags.appendChild(b);
    });
    function restore(at) {
      s.classList.add('restored');
      cracks.forEach((c) => c.classList.add('fixed'));
      setTimeout(() => {
        Sound.play('unlock');
        Confetti.fire(130, at);
        burst(at.x, at.y, { items: ['🌟', '✨', '💖', '⭐'], count: 24, spread: 240 });
        restoredMsg.textContent = C.starRestored || '';
        restoredMsg.hidden = !C.starRestored;
        setTimeout(() => restoredMsg.closest('.repair-log').scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' }), 1200);
      }, 500);
    }
  })();

  /* ===== Scene 9 — The secret constellation ===== */
  let layoutSky = () => {};
  (() => {
    const s = scenes[8], wrap = $('#constStars'), svg = $('#constLines'), msgEl = $('#starMsg'), hint = $('#skyHint');
    const msgs = list(C.constellation, ['You are wonderful.']);
    const n = msgs.length, found = new Set();
    const SVGNS = 'http://www.w3.org/2000/svg';
    let pos = [], center = { x: 50, y: 50 }, msgTimer = null, completed = false;
    // Heart curve: x = 16 sin³t, y = 13cos t − 5cos 2t − 2cos 3t − cos 4t
    const unit = Array.from({ length: n }, (_, i) => {
      const t = (Math.PI * 2 * i) / n;
      return { x: 16 * Math.pow(Math.sin(t), 3), y: -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) };
    });
    const btns = unit.map((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'c-star';
      b.style.setProperty('--dl', -(i * 0.37).toFixed(2) + 's');
      b.setAttribute('aria-label', `Twinkling star ${i + 1} of ${n}`);
      b.addEventListener('click', () => reveal(i, b));
      wrap.appendChild(b);
      return b;
    });
    const special = document.createElement('button');
    special.type = 'button';
    special.className = 'c-star special';
    special.setAttribute('aria-label', 'The brightest star. Opens a longer message.');
    special.addEventListener('click', () => {
      Sound.play('unlock');
      burstAt(special, { items: ['🌟', '✨', '💛'], count: 16, spread: 140 });
      const sp = C.specialStar || {};
      Modal.open(`<h3>${esc(sp.title || 'The brightest star 🌟')}</h3><div class="hand">${paras(sp.text || '')}</div>`, { cls: 'night' });
    });
    wrap.appendChild(special);

    layoutSky = () => {
      const W = s.clientWidth || innerWidth, H = s.clientHeight || innerHeight;
      const hw = Math.min(W * 0.3, H * 0.24);
      const k = hw / 16, cy = H * 0.5;
      pos = unit.map((u) => ({ x: ((W / 2 + u.x * k) / W) * 100, y: ((cy + (u.y - 2.5) * k) / H) * 100 }));
      center = { x: 50, y: (cy / H) * 100 };
      btns.forEach((b, i) => { b.style.left = pos[i].x + '%'; b.style.top = pos[i].y + '%'; });
      special.style.left = center.x + '%'; special.style.top = center.y + '%';
      $$('line', svg).forEach((ln) => {
        const a = +ln.dataset.a, c = +ln.dataset.b;
        ln.setAttribute('x1', pos[a].x); ln.setAttribute('y1', pos[a].y); ln.setAttribute('x2', pos[c].x); ln.setAttribute('y2', pos[c].y);
      });
    };
    function link(a, c) {
      if (svg.querySelector(`line[data-a="${a}"][data-b="${c}"]`)) return;
      const ln = document.createElementNS(SVGNS, 'line');
      ln.dataset.a = a; ln.dataset.b = c;
      ln.setAttribute('x1', pos[a].x); ln.setAttribute('y1', pos[a].y); ln.setAttribute('x2', pos[c].x); ln.setAttribute('y2', pos[c].y);
      svg.appendChild(ln);
    }
    function reveal(i, b) {
      const first = !found.has(i);
      found.add(i);
      b.classList.add('found');
      b.setAttribute('aria-label', `Star ${i + 1}: ${msgs[i]}`);
      Sound.play('star');
      burstAt(b, { items: ['✨', '⭐'], count: 6, spread: 50 });
      if (first) {
        const prev = (i - 1 + n) % n, nxt = (i + 1) % n;
        if (found.has(prev)) link(prev, i);
        if (found.has(nxt)) link(i, nxt);
      }
      msgEl.hidden = false;
      msgEl.innerHTML = `<small>STAR ${found.size} OF ${n}</small>${esc(msgs[i])}`;
      msgEl.style.animation = 'none'; void msgEl.offsetWidth; msgEl.style.animation = '';
      clearTimeout(msgTimer);
      msgTimer = setTimeout(() => { msgEl.hidden = true; }, 6000);
      if (found.size === n && !completed) {
        completed = true;
        setTimeout(() => {
          svg.classList.add('complete');
          Sound.play('unlock');
          Confetti.fire(90, centerOf(special));
          hint.textContent = ((C.little && C.little.constellationDone) || "You found the hidden heart. Now tap the brightest star in the middle.");
          Companion.say(((C.little && C.little.constellationTwinkle) || "Now try the big golden star"));
        }, 900);
      }
    }
    handlers[8] = { enter() { layoutSky(); }, leave() { msgEl.hidden = true; } };
  })();

  /* ===== Scene 10 — The time capsule ===== */
  (() => {
    const cap = C.capsule || {};
    const opened = new Set();
    const photos = list(C.photos, []);
    const empties = ['#ffd1e3', '#cfe8ff', '#ffe5c4', '#d9f5e3'];
    const views = {
      letter: () => [`<h3>A handwritten apology ✉️</h3><div class="hand">${paras(cap.letter || '')}</div>`, 'paper'],
      photos: () => [`<h3>${esc(cap.photosNote || 'Our photos')}</h3><div class="modal-photos">${photos.map((ph, i) => `<figure style="--r:${[-3, 2, -1, 3][i % 4]}deg">${PhotoLock.src(ph.src) ? `<img src="${esc(PhotoLock.src(ph.src))}" alt="${esc(ph.caption || 'Our photo')}" loading="lazy">` : PhotoLock.isLocked(ph.src) ? `<span class="ph-empty ph-locked"><b>🔒</b></span>` : `<span class="ph-empty" style="--e1:${empties[i % 4]};--e2:#e3d6fb"><b>📷</b></span>`}<figcaption>${esc(ph.caption || '')}</figcaption></figure>`).join('')}</div>`, ''],
      promises: () => [`<h3>${esc(cap.promisesTitle || 'Promises')} 📜</h3><ul class="modal-promises">${list(C.promises, []).map((p) => `<li>${esc(p)}</li>`).join('')}</ul>`, ''],
      future: () => [`<h3>A message for the future 🔮</h3><div class="hand">${paras(cap.future || '')}</div>`, 'holo'],
    };
    $$('.cap-item').forEach((b) => {
      b.addEventListener('click', () => {
        const key = b.dataset.cap;
        let [html, cls] = views[key]();
        if (key === 'photos' && photos.some((ph) => PhotoLock.isLocked(ph.src)) && !PhotoLock.unlocked) html = html.replace('</h3>', '</h3><p class="pl-note">🔒 These are locked. Unlock them with the secret word in the Memory Museum.</p>');
        Sound.play('chime');
        burstAt(b, { items: ['✨', '💫', '🫧'], count: 10, spread: 80 });
        Modal.open(html, { cls });
        $$('#modalBody img').forEach((img) => img.addEventListener('error', () => { img.outerHTML = '<span class="ph-empty"><b>📷</b></span>'; }, { once: true }));
        b.classList.add('opened');
        opened.add(key);
        if (opened.size === 4) setTimeout(() => Companion.say(((C.little && C.little.capsuleDone) || "You opened everything in the capsule!")), 600);
      });
    });
  })();

  /* ===== Scene 11 — The final love letter ===== */
  (() => {
    const s = scenes[10], env = $('#envelope'), sheet = $('#letterSheet'), textEl = $('#letterText'), signEl = $('#letterSign'), inner = $('#sheetInner');
    const nextBtn = $('#letterNext'), replay = $('#letterReplay');
    let state = 'closed'; // closed → opening → reading → done
    env.setAttribute('aria-expanded', 'false');

    function reset() {
      state = 'closed';
      env.classList.remove('open'); env.setAttribute('aria-expanded', 'false');
      s.classList.remove('reading');
      sheet.classList.remove('show'); sheet.hidden = true;
      textEl.textContent = ''; signEl.textContent = ''; signEl.classList.remove('show');
      nextBtn.hidden = true; replay.hidden = true;
    }
    function showDone() {
      env.classList.add('open'); s.classList.add('reading');
      sheet.hidden = false; sheet.classList.add('show');
      textEl.classList.remove('typing'); textEl.textContent = C.finalLetter || '';
      signEl.textContent = C.signature || ''; signEl.classList.add('show');
      nextBtn.hidden = false; replay.hidden = false; state = 'done';
    }
    async function readLetter() {
      const t = token;
      state = 'reading';
      replay.hidden = true; nextBtn.hidden = true;
      signEl.textContent = ''; signEl.classList.remove('show');
      inner.scrollTop = 0;
      const ok = await typeText(textEl, C.finalLetter || '', 34, () => { inner.scrollTop = inner.scrollHeight; });
      if (!ok || !alive(t)) return;
      await sleep(500);
      if (!alive(t)) return;
      signEl.textContent = C.signature || '';
      signEl.classList.add('show');
      inner.scrollTop = inner.scrollHeight;
      Sound.play('chime');
      burstAt(signEl, { items: ['💖', '💗', '✨'], count: 14, spread: 120 });
      await sleep(900);
      if (!alive(t)) return;
      nextBtn.hidden = false; replay.hidden = false;
      state = 'done';
    }
    env.addEventListener('click', async () => {
      if (state !== 'closed') return;
      const t = token;
      state = 'opening';
      Sound.play('pop');
      env.classList.add('open'); env.setAttribute('aria-expanded', 'true');
      burstAt(env, { items: ['💖', '🌹', '✨', '💌', '🦋'], count: 20, spread: 220 });
      await sleep(reduceMotion ? 100 : 1800);
      if (!alive(t)) return;
      s.classList.add('reading');
      sheet.hidden = false;
      requestAnimationFrame(() => sheet.classList.add('show'));
      Sound.play('chime');
      await sleep(reduceMotion ? 100 : 1200);
      if (!alive(t)) return;
      $('#letterReplay').focus({ preventScroll: true });
      readLetter();
    });
    replay.addEventListener('click', () => { skipping = false; Sound.play('click'); readLetter(); });
    handlers[10] = {
      enter() { if (state === 'done') showDone(); else reset(); },
      leave() { if (state !== 'done') setTimeout(reset, 800); },
    };
  })();

  /* ===== Scene 12 — The final surprise ===== */
  (() => {
    const l1 = $('#endLine1'), l2 = $('#endLine2'), btns = $('#endButtons'), fin = $('#finalText'), restart = $('#restartBtn');
    const lines = list(C.ending, ["That's the end of my little universe...", 'But I hope your happiness has no ending.']);
    l1.textContent = lines[0]; l2.textContent = lines[1] || '';
    fin.textContent = C.finalText || '';
    const parts = [l1, l2, btns, fin, restart];
    let flowers = 0;

    handlers[11] = {
      async enter(revisit) {
        if (revisit) { parts.forEach((e) => e.classList.add('show')); return; }
        parts.forEach((e) => e.classList.remove('show'));
        const t = token;
        await sleep(900);
        for (const el of parts) {
          if (!alive(t)) return;
          el.classList.add('show');
          await sleep(el === l1 ? 2200 : 1500);
        }
      },
      skip() { parts.forEach((e) => e.classList.add('show')); },
    };

    $('#endHug').addEventListener('click', () => {
      const heart = $('.teddy-wrap .t-heart');
      if (heart) burstAt(heart, { items: ['💗', '💞'], count: 10 });
      bigHug(C.endingHug || 'A warm hug for you.', 'teddy');
    });

    $('#endFlower').addEventListener('click', (e) => {
      Sound.play('grow');
      const from = centerOf(e.currentTarget);
      const to = { x: rand(innerWidth * 0.12, innerWidth * 0.88), y: rand(innerHeight * 0.12, innerHeight * 0.42) };
      const emoji = pick(['🌷', '🌸', '🌹', '🌼', '💐']);
      const f = document.createElement('span');
      f.className = 'flying-flower'; f.textContent = emoji;
      f.style.left = '0px'; f.style.top = '0px';
      document.body.appendChild(f);
      const mid = { x: (from.x + to.x) / 2 + rand(-120, 120), y: Math.min(from.y, to.y) - 120 };
      const anim = f.animate([
        { transform: `translate(${from.x}px, ${from.y}px) translate(-50%, -50%) scale(.4) rotate(0deg)` },
        { transform: `translate(${mid.x}px, ${mid.y}px) translate(-50%, -50%) scale(1.3) rotate(200deg)` },
        { transform: `translate(${to.x}px, ${to.y}px) translate(-50%, -50%) scale(1) rotate(360deg)` },
      ], { duration: reduceMotion ? 10 : 1500, easing: 'ease-in-out' });
      anim.onfinish = () => {
        f.remove();
        const sf = document.createElement('span');
        sf.className = 'sky-flower'; sf.textContent = emoji;
        sf.style.left = to.x + 'px'; sf.style.top = to.y + 'px';
        sf.style.animationDelay = -rand(0, 5) + 's';
        const garden = $('#skyGarden');
        garden.appendChild(sf);
        while (garden.children.length > 24) garden.firstElementChild.remove();
        Sound.play('chime');
        burst(to.x, to.y, { items: ['🌸', '✨', '💮'], count: 14, spread: 110, rise: -40 });
        flowers++;
        toast(flowers === 1 ? (C.endingFlower || 'A flower for you 🌷') : `${flowers} flowers in your sky now 🌷`, 3000);
      };
    });

    $('#endSurprise').addEventListener('click', () => {
      Sound.play('unlock');
      Confetti.fire(220);
      const surprises = list(C.surprises, ['💖']);
      for (let i = 0; i < 8; i++) setTimeout(() => spawnBalloon({ left: 5 + i * 12 + rand(-3, 3), dur: rand(9, 13), message: pick(surprises) }), i * 220);
      const ls = C.lastSurprise || {};
      setTimeout(() => Modal.open(`<h3>${esc(ls.title || 'One last surprise 🎁')}</h3><div class="hand">${paras(ls.text || '')}</div>`, { cls: 'night' }), 1100);
    });

    restart.addEventListener('click', () => go(0));
  })();

  /* ---------------------------------------------------------------
     9. INIT
     --------------------------------------------------------------- */
  /* Secret-code gate: shown first when the photos are locked. */
  function startWithGate() {
    const gate = $('#gate'), input = $('#gatePass'), btn = $('#gateBtn'), err = $('#gateError');
    const L = C.photoLock || {};
    $('#gateTitle').textContent = L.gateTitle || 'A secret code opens this little universe';
    $('#gateHint').textContent = L.gateHint || '';
    const begin = () => { document.body.classList.remove('gated'); scenes[0].classList.remove('gated'); handlers[0].enter(false); };
    PhotoLock.ready.then(() => {
      if (!PhotoLock.active) { begin(); return; }
      document.body.classList.add('gated'); scenes[0].classList.add('gated');
      gate.hidden = false;
      setTimeout(() => input.focus({ preventScroll: true }), 300);
    });
    gate.addEventListener('submit', async (e) => {
      e.preventDefault();
      Sound.ensure();
      if (!input.value.trim()) { input.focus(); return; }
      btn.disabled = true; btn.textContent = 'Opening…'; err.textContent = '';
      let ok = false;
      try { ok = await PhotoLock.unlock(input.value); }
      catch (x) { err.textContent = x.message === 'insecure' ? 'Please open the site from its https:// link.' : 'Something went wrong. Please try again.'; }
      btn.disabled = false; btn.textContent = 'Open ✨';
      if (ok) {
        input.value = '';
        Sound.play('unlock');
        burstAt(gate, { items: ['💖', '✨', '🔓', '💫'], count: 24, spread: 240 });
        gate.classList.add('opening');
        setTimeout(() => { gate.hidden = true; begin(); }, reduceMotion ? 50 : 700);
      } else if (!err.textContent) {
        err.textContent = L.wrong || "That's not it. Try again 💭";
        gate.classList.remove('shake'); void gate.offsetWidth; gate.classList.add('shake');
        Sound.play('alert');
        input.select();
      }
    });
  }

  function init() {
    mountCharacters();
    decorate();
    updateHUD();
    eachStarfield(scenes[0], (sf) => sf.start());
    Companion.onScene(0);
    startWithGate();

    let rt = null;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        eachStarfield(scenes[current], (sf) => sf.resize());
        if (current === 2) rain.resize();
        if (current === 4) Game.resize();
        if (current === 8) layoutSky();
      }, 150);
    });

    // Pause music while the tab is hidden; resume when back.
    let resumeMusic = false;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && Sound.music) { resumeMusic = true; Sound.setMusic(false); }
      else if (!document.hidden && resumeMusic) { resumeMusic = false; Sound.setMusic(true); }
    });
  }
  init();
})();
