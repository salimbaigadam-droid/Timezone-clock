// app.js — main logic
// Modern browsers support ES modules. This file contains the clock logic, timezone handling, animations, and audio.

const template = document.getElementById('clockTemplate');
const clocksContainer = document.getElementById('clocksContainer');
const addClockBtn = document.getElementById('addClockBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settings');
const closeSettings = document.getElementById('closeSettings');
const themeSelect = document.getElementById('themeSelect');
const bgSelect = document.getElementById('bgSelect');
const tickEnableEl = document.getElementById('tickEnable');
const chimeEnableEl = document.getElementById('chimeEnable');
const tickVolEl = document.getElementById('tickVol');
const hour24El = document.getElementById('hour24');
const showSecondsEl = document.getElementById('showSeconds');

const bgCanvas = document.getElementById('bgCanvas');
const ctx = bgCanvas.getContext('2d');

let clocks = [];
let timezones = Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : guessTimezones();
timezones = timezones.sort();

// Audio setup
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}
function playTick(volume = 0.5) {
  // Try to load an external tick if provided, else synthesize a short click
  ensureAudio();
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'square';
  o.frequency.value = 900;
  g.gain.value = volume * 0.0007;
  o.connect(g);
  g.connect(audioCtx.destination);
  o.start();
  o.stop(audioCtx.currentTime + 0.02);
}
function playChime(volume = 0.6) {
  ensureAudio();
  const now = audioCtx.currentTime;
  for (let i = 0; i < 3; i++) {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.value = 600 - i * 100;
    g.gain.value = volume * 0.02;
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start(now + i * 0.18);
    o.stop(now + i * 0.18 + 0.5);
  }
}

// UI helpers
function createClockElement(tz = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  const node = template.content.cloneNode(true);
  const card = node.querySelector('.clock-card');
  const labelInput = node.querySelector('.labelInput');
  const tzSelect = node.querySelector('.tzSelect');
  const removeBtn = node.querySelector('.removeBtn');
  const timeStr = node.querySelector('.timeStr');
  const dateStr = node.querySelector('.dateStr');

  // populate timezone selector with a subset + search-friendly list
  const popular = ['UTC', 'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo', 'Asia/Kolkata', 'Australia/Sydney'];
  const addOpt = (z) => {
    const o = document.createElement('option'); o.value = z; o.textContent = z; tzSelect.appendChild(o);
  }
  popular.forEach(addOpt);
  tzSelect.appendChild(document.createElement('option'));
  timezones.forEach(z => { const o = document.createElement('option'); o.value = z; o.textContent = z; tzSelect.appendChild(o); });

  tzSelect.value = tz || Intl.DateTimeFormat().resolvedOptions().timeZone;
  labelInput.placeholder = tzSelect.value;

  removeBtn.addEventListener('click', () => {
    clocksContainer.removeChild(card);
    clocks = clocks.filter(c => c.card !== card);
  });

  // append and return object to manage update
  clocksContainer.appendChild(card);

  return {
    card,
    tzSelect,
    labelInput,
    timeStr,
    dateStr,
    analog: card.querySelector('.analog'),
    tz: tzSelect.value
  };
}

function addClock(tz) {
  const c = createClockElement(tz);
  clocks.push(c);

  // wire up select change
  c.tzSelect.addEventListener('change', () => { c.tz = c.tzSelect.value; c.labelInput.placeholder = c.tz; });
  c.labelInput.addEventListener('input', () => {});
}

// time reading helper using Intl.formatToParts
function getPartsForTimezone(tz) {
  const now = new Date();
  // Use formatToParts to get hour, minute, second in that timezone
  const fmt = new Intl.DateTimeFormat([], { timeZone: tz, hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit', year:'numeric', month:'2-digit', day:'2-digit' });
  const parts = fmt.formatToParts(now).reduce((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value;
    return acc;
  }, {});
  // convert to numbers
  const h = parseInt(parts.hour || '0', 10);
  const m = parseInt(parts.minute || '0', 10);
  const s = parseInt(parts.second || '0', 10);

  const dateStr = `${parts.year}-${parts.month}-${parts.day}`;
  return { h,m,s, dateStr };
}

// update loop
let lastSecondTick = null;
function updateAll() {
  clocks.forEach(c => {
    const tz = c.tzSelect.value || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const {h,m,s,dateStr} = getPartsForTimezone(tz);

    // analog hands
    const secondAngle = (s / 60) * 360;
    const minuteAngle = ((m + s/60) / 60) * 360;
    const hourAngle = ((h % 12 + m/60 + s/3600) / 12) * 360;

    const hr = c.card.querySelector('.hands .hour');
    const mn = c.card.querySelector('.hands .minute');
    const sc = c.card.querySelector('.hands .second');

    hr.style.transform = `rotate(${hourAngle}deg)`;
    mn.style.transform = `rotate(${minuteAngle}deg)`;
    sc.style.transform = `rotate(${secondAngle}deg)`;

    // digital
    const show24 = hour24El.checked;
    let displayHour = h;
    if (!show24) {
      displayHour = ((h + 11) % 12) + 1;
    }
    const pad = (x) => String(x).padStart(2,'0');
    const showSeconds = showSecondsEl.checked;
    c.timeStr.textContent = showSeconds ? `${pad(displayHour)}:${pad(m)}:${pad(s)}` : `${pad(displayHour)}:${pad(m)}`;
    c.dateStr.textContent = dateStr;
  });

  // sound scheduling: play tick on every new second if enabled
  const now = new Date();
  const secondNow = now.getSeconds();
  if (tickEnableEl.checked) {
    if (lastSecondTick !== secondNow) {
      lastSecondTick = secondNow;
      // play tick with volume
      playTick(Number(tickVolEl.value));
    }
  }
  // hourly chime: play when minute=0 and second=0
  if (chimeEnableEl.checked) {
    if (now.getMinutes() === 0 && now.getSeconds() === 0) {
      playChime(Number(tickVolEl.value));
    }
  }

  requestAnimationFrame(updateAll);
}

// background animation (particles)
const particles = [];
function resetCanvas() {
  bgCanvas.width = innerWidth * devicePixelRatio;
  bgCanvas.height = innerHeight * devicePixelRatio;
  bgCanvas.style.width = innerWidth + 'px';
  bgCanvas.style.height = innerHeight + 'px';
  ctx.scale(devicePixelRatio, devicePixelRatio);
}
function initParticles() {
  particles.length = 0;
  const count = Math.min(120, Math.floor((innerWidth * innerHeight) / 40000));
  for (let i=0;i<count;i++){
    particles.push({
      x: Math.random()*innerWidth,
      y: Math.random()*innerHeight,
      r: 0.8 + Math.random()*2.2,
      vx: (Math.random()-0.5)*0.2,
      vy: (Math.random()-0.5)*0.2,
      hue: 200 + Math.random()*60
    });
  }
}
function drawBg() {
  const bgChoice = bgSelect.value;
  if (bgChoice === 'gradient') {
    // subtle animated gradient background via canvas
    const t = performance.now() * 0.00006;
    const g = ctx.createLinearGradient(0,0,innerWidth,innerHeight);
    const a = Math.sin(t)*0.5+0.5;
    g.addColorStop(0, `rgba(10,18,48,${0.9 - a*0.06})`);
    g.addColorStop(1, `rgba(4,10,30,${0.9 - (1-a)*0.06})`);
    ctx.fillStyle = g;
    ctx.fillRect(0,0,innerWidth,innerHeight);
  } else {
    // base fill
    ctx.fillStyle = '#03040a';
    ctx.fillRect(0,0,innerWidth,innerHeight);
  }

  if (bgChoice === 'particles') {
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < -20) p.x = innerWidth + 20;
      if (p.x > innerWidth + 20) p.x = -20;
      if (p.y < -20) p.y = innerHeight + 20;
      if (p.y > innerHeight + 20) p.y = -20;
      ctx.beginPath();
      ctx.fillStyle = `hsla(${p.hue},60%,60%,0.12)`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fill();
    }
  }
  requestAnimationFrame(drawBg);
}

// UI wiring
addClockBtn.addEventListener('click', () => addClock(Intl.DateTimeFormat().resolvedOptions().timeZone));
settingsBtn.addEventListener('click', () => { settingsPanel.classList.remove('hidden'); settingsPanel.setAttribute('aria-hidden','false'); });
closeSettings.addEventListener('click', () => { settingsPanel.classList.add('hidden'); settingsPanel.setAttribute('aria-hidden','true'); });

themeSelect.addEventListener('change', () => {
  const t = themeSelect.value;
  if (t === 'light') {
    document.documentElement.style.setProperty('--bg1','#e6f0ff');
    document.documentElement.style.setProperty('--bg2','#f7fbff');
    document.documentElement.style.setProperty('--card-bg','rgba(0,0,0,0.04)');
    document.documentElement.style.setProperty('--fg','#06293a');
    document.documentElement.style.setProperty('--accent','#2b9eb3');
  } else if (t === 'pastel') {
    document.documentElement.style.setProperty('--bg1','#ffecf1');
    document.documentElement.style.setProperty('--bg2','#eaf7ff');
    document.documentElement.style.setProperty('--card-bg','rgba(255,255,255,0.5)');
    document.documentElement.style.setProperty('--fg','#243b4a');
    document.documentElement.style.setProperty('--accent','#ff6b6b');
  } else {
    // dark default
    document.documentElement.style.setProperty('--bg1','#0f1724');
    document.documentElement.style.setProperty('--bg2','#071032');
    document.documentElement.style.setProperty('--card-bg','rgba(255,255,255,0.03)');
    document.documentElement.style.setProperty('--fg','#e6eef8');
    document.documentElement.style.setProperty('--accent','#ffd166');
  }
});

bgSelect.addEventListener('change', () => {
  // re-init particles if selected
  if (bgSelect.value === 'particles') initParticles();
});

window.addEventListener('resize', () => {
  resetCanvas();
  initParticles();
});

// simple timezone guess fallback if not supported
function guessTimezones() {
  return ['UTC','Europe/London','America/New_York','Asia/Tokyo','Asia/Kolkata','Australia/Sydney'];
}

// initial setup
(function init(){
  // Add two default clocks
  addClock(Intl.DateTimeFormat().resolvedOptions().timeZone);
  addClock('UTC');

  // prepare canvas and particles
  resetCanvas();
  initParticles();
  drawBg();

  // resume audio on user gesture (most browsers require it)
  document.addEventListener('click', () => {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  }, { once:true });

  // start update loop
  requestAnimationFrame(updateAll);
})();
