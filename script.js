/* ═══════════════════════════════════════════════════════
   SMARTHOME DASHBOARD — script.js
   WebSocket layer · State engine · All 12 system panels
═══════════════════════════════════════════════════════ */

'use strict';

/* ── CONFIG ── */
const CONFIG = {
  ha: {
    host:  localStorage.getItem('ha_host')  || 'homeassistant.local',
    port:  localStorage.getItem('ha_port')  || '8123',
    token: localStorage.getItem('ha_token') || ''
  },
  demo: true,
  reconnectDelay: 3000,
  simulationInterval: 4000
};

/* ══════════════════════════════════════
   STATE STORE
══════════════════════════════════════ */
const state = {
  ws: null,
  connected: false,
  demo: true,
  simTimer: null,
  msgId: 1,
  callbacks: {},

  rooms: {
    living:  { name: 'Living Room',    temp: 22, humidity: 48, co2: 620, brightness: 70,  lightsOn: true,  mode: 'cool' },
    bedroom: { name: 'Master Bedroom', temp: 19, humidity: 52, co2: 510, brightness: 0,   lightsOn: false, mode: 'heat' },
    kitchen: { name: 'Kitchen',        temp: 23, humidity: 55, co2: 740, brightness: 90,  lightsOn: true,  mode: 'auto' },
    bathroom:{ name: 'Bathroom',       temp: 21, humidity: 70, co2: 490, brightness: 40,  lightsOn: false, mode: 'off'  },
    office:  { name: 'Home Office',    temp: 20, humidity: 45, co2: 580, brightness: 80,  lightsOn: true,  mode: 'cool' },
    garden:  { name: 'Garden',         temp: 14, humidity: 80, co2: 415, brightness: 0,   lightsOn: false, mode: 'off'  }
  },

  security: {
    armed: true,
    sensors: [
      { id: 's1', name: 'Front Door',      location: 'Main entrance', state: 'locked'   },
      { id: 's2', name: 'Back Door',       location: 'Garden access', state: 'locked'   },
      { id: 's3', name: 'Garage Door',     location: 'Garage',        state: 'closed'   },
      { id: 's4', name: 'Living Room Win', location: 'Living room',   state: 'closed'   },
      { id: 's5', name: 'Bedroom Window',  location: 'Master bedroom',state: 'closed'   },
      { id: 's6', name: 'Basement Door',   location: 'Basement',      state: 'locked'   }
    ],
    cameras: [
      { id: 'c1', name: 'Front Door',    icon: '📷', live: true  },
      { id: 'c2', name: 'Back Garden',   icon: '📹', live: true  },
      { id: 'c3', name: 'Garage',        icon: '📷', live: false },
      { id: 'c4', name: 'Driveway',      icon: '📹', live: true  }
    ]
  },

  energy: {
    now:     1.42,
    solar:   0.87,
    battery: 72,
    today:   8.4,
    cost:    1.94,
    ev:      { charging: true, soc: 64, rate: 7.2 },
    consumers: [
      { name: 'HVAC System',      watts: 420, pct: 85 },
      { name: 'EV Charger',       watts: 380, pct: 76 },
      { name: 'Washing Machine',  watts: 180, pct: 36 },
      { name: 'Oven / Hob',       watts: 160, pct: 32 },
      { name: 'Refrigerator',     watts:  90, pct: 18 },
      { name: 'Lighting (all)',    watts:  70, pct: 14 }
    ],
    hourly: [0.8,0.7,0.6,0.5,0.5,0.6,0.9,1.1,1.3,1.2,1.1,1.0,
             1.2,1.3,1.1,1.2,1.4,1.6,1.8,1.7,1.5,1.4,1.2,1.0]
  },

  music: {
    playing: true,
    track:   'Midnight City',
    artist:  'M83',
    album:   '🎵',
    progress: 47,
    duration: 244,
    volume:  72,
    zones: [
      { id: 'z1', name: 'Living Room',  volume: 72, playing: true  },
      { id: 'z2', name: 'Kitchen',      volume: 55, playing: true  },
      { id: 'z3', name: 'Bedroom',      volume: 30, playing: false },
      { id: 'z4', name: 'Garden',       volume: 0,  playing: false },
      { id: 'z5', name: 'Home Office',  volume: 60, playing: true  }
    ]
  },

  appliances: [
    { id: 'ap1', icon: '🫧', name: 'Washing Machine', status: 'Cycle 34 min left', running: true,  progress: 62 },
    { id: 'ap2', icon: '🍽️', name: 'Dishwasher',      status: 'Rinse cycle',       running: true,  progress: 80 },
    { id: 'ap3', icon: '🌀', name: 'Dryer',           status: 'Ready to start',    running: false, progress: 0  },
    { id: 'ap4', icon: '🧊', name: 'Refrigerator',    status: '3°C · Optimal',     running: true,  progress: -1 },
    { id: 'ap5', icon: '♨️', name: 'Oven',            status: 'Preheating 180°C',  running: true,  progress: 45 },
    { id: 'ap6', icon: '☕', name: 'Coffee Maker',    status: 'Scheduled 07:30',   running: false, progress: -1 },
    { id: 'ap7', icon: '🤖', name: 'Robot Vacuum',    status: 'Cleaning kitchen',  running: true,  progress: 55 },
    { id: 'ap8', icon: '💨', name: 'Air Purifier',    status: 'Auto mode · Good',  running: true,  progress: -1 }
  ],

  garden: {
    weather: { icon: '🌤️', temp: 14, desc: 'Partly cloudy', humidity: 78, wind: 12, uv: 3, rain: 0.2 },
    irrigation: [
      { id: 'ir1', name: 'Front Lawn',    active: false, next: 'Tomorrow 06:00' },
      { id: 'ir2', name: 'Back Garden',   active: true,  next: 'Running now' },
      { id: 'ir3', name: 'Flower Beds',   active: false, next: 'Today 20:00' },
      { id: 'ir4', name: 'Greenhouse',    active: false, next: 'Tomorrow 07:00' },
      { id: 'ir5', name: 'Veg Patch',     active: false, next: 'Thu 06:30' }
    ]
  },

  family: [
    { id: 'f1', name: 'David',  initials: 'D', color: '#5b9cf6', location: 'Home',        status: 'home'   },
    { id: 'f2', name: 'Maria',  initials: 'M', color: '#f5a623', location: 'Work — 3.2km', status: 'away'   },
    { id: 'f3', name: 'Lucas',  initials: 'L', color: '#4cde80', location: 'School',       status: 'school' },
    { id: 'f4', name: 'Sophie', initials: 'S', color: '#2de0c0', location: 'Home',         status: 'home'   }
  ],

  accessLog: [
    { icon: '🔓', text: '<strong>David</strong> unlocked front door',     time: '18:42' },
    { icon: '📦', text: '<strong>Delivery</strong> — parcel detected',    time: '15:10' },
    { icon: '🔒', text: 'Auto-lock front door triggered',                  time: '15:12' },
    { icon: '🚗', text: '<strong>Maria</strong> departed',                 time: '08:04' },
    { icon: '🔓', text: '<strong>Lucas</strong> unlocked front door',      time: '07:52' }
  ],

  automations: [
    { icon: '🌅', name: 'Good Morning',      trigger: 'Weekdays at 07:00',         last: 'Today 07:00', active: true  },
    { icon: '🌙', name: 'Good Night',        trigger: 'Motion-free 30 min after 22:00', last: 'Yesterday 22:34', active: true  },
    { icon: '🔒', name: 'Auto Away',         trigger: 'All family departed',        last: 'Today 08:10', active: true  },
    { icon: '🌧️', name: 'Rain Pause',        trigger: 'Rain forecast > 3mm',        last: 'Mon 14:00',   active: true  },
    { icon: '⚡', name: 'Solar Boost',       trigger: 'Solar > 80% battery',        last: 'Today 13:30', active: true  },
    { icon: '🎬', name: 'Cinema Mode',       trigger: 'TV on + lights dim trigger', last: 'Sun 19:15',   active: false },
    { icon: '🌡️', name: 'Comfort Climate',   trigger: 'Arrival detected',           last: 'Today 18:42', active: true  },
    { icon: '🔔', name: 'Door Left Open',    trigger: 'Door open > 5 min',          last: 'Never',       active: true  }
  ],

  water: {
    dailyUsage: 142,
    monthlyUsage: 3840,
    leakSensors: [
      { id: 'lk1', name: 'Kitchen Sink',     location: 'Under sink',     status: 'dry'  },
      { id: 'lk2', name: 'Washing Machine',  location: 'Utility room',   status: 'dry'  },
      { id: 'lk3', name: 'Bathroom Basin',   location: 'Main bathroom',  status: 'dry'  },
      { id: 'lk4', name: 'Boiler',           location: 'Basement',       status: 'dry'  },
      { id: 'lk5', name: 'Garden Tap',       location: 'Back garden',    status: 'alert'}
    ],
    hotwater: { temp: 58, target: 60, mode: 'eco', scheduleOn: true }
  },

  health: {
    rooms: [
      { name: 'Living Room',    aqi: 18,  pm25: 6,  voc: 120, score: 'Good'    },
      { name: 'Bedroom',        aqi: 12,  pm25: 4,  voc:  85, score: 'Excellent'},
      { name: 'Kitchen',        aqi: 42,  pm25: 18, voc: 340, score: 'Fair'    },
      { name: 'Home Office',    aqi: 15,  pm25: 5,  voc: 100, score: 'Good'    }
    ],
    sleep: [
      { name: 'David',  hours: 7.2, deep: 1.8, score: 84, trend: '↑' },
      { name: 'Maria',  hours: 6.8, deep: 1.4, score: 76, trend: '→' },
      { name: 'Lucas',  hours: 9.1, deep: 2.3, score: 91, trend: '↑' },
      { name: 'Sophie', hours: 8.4, deep: 2.0, score: 88, trend: '↑' }
    ]
  },

  colorScenes: [
    { label: 'Warm white', color: '#ffe4b5' },
    { label: 'Cool white', color: '#e8f4ff' },
    { label: 'Sunset',     color: '#ff7043' },
    { label: 'Ocean',      color: '#26c6da' },
    { label: 'Forest',     color: '#66bb6a' },
    { label: 'Galaxy',     color: '#7e57c2' },
    { label: 'Romance',    color: '#ec407a' },
    { label: 'Focus',      color: '#fff9c4' }
  ],

  activityLog: [
    { color: '#4cde80', text: '<strong>Good Evening</strong> scene activated',        time: '18:30' },
    { color: '#f5a623', text: '<strong>Oven</strong> preheating to 180°C',            time: '18:25' },
    { color: '#5b9cf6', text: '<strong>David</strong> arrived home',                  time: '18:22' },
    { color: '#2de0c0', text: '<strong>Dishwasher</strong> cycle started',            time: '17:55' },
    { color: '#f5a623', text: '<strong>Solar battery</strong> reached 72%',           time: '16:10' },
    { color: '#ff5c5c', text: '<strong>Back garden</strong> irrigation started',      time: '15:00' }
  ]
};

/* ══════════════════════════════════════
   WEBSOCKET LAYER
══════════════════════════════════════ */
const WS = {
  connect() {
    if (state.demo) { WS.startDemo(); return; }
    const url = `ws://${CONFIG.ha.host}:${CONFIG.ha.port}/api/websocket`;
    try {
      state.ws = new WebSocket(url);
      WS.setStatus('connecting');

      state.ws.onopen = () => {
        console.log('[WS] Connected to Home Assistant');
      };

      state.ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        WS.handleMessage(msg);
      };

      state.ws.onclose = () => {
        WS.setStatus('error');
        toast('Disconnected from Home Assistant. Retrying…', 'warning');
        setTimeout(() => WS.connect(), CONFIG.reconnectDelay);
      };

      state.ws.onerror = () => {
        toast('WebSocket error — check host and token.', 'error');
      };
    } catch (e) {
      toast('Could not connect. Falling back to demo mode.', 'error');
      state.demo = true;
      WS.startDemo();
    }
  },

  handleMessage(msg) {
    switch (msg.type) {
      case 'auth_required':
        WS.send({ type: 'auth', access_token: CONFIG.ha.token });
        break;
      case 'auth_ok':
        WS.setStatus('connected');
        toast('Connected to Home Assistant', 'success');
        WS.subscribeEvents();
        WS.fetchStates();
        break;
      case 'auth_invalid':
        WS.setStatus('error');
        toast('Invalid access token', 'error');
        break;
      case 'result':
        if (state.callbacks[msg.id]) {
          state.callbacks[msg.id](msg.result);
          delete state.callbacks[msg.id];
        }
        break;
      case 'event':
        if (msg.event?.event_type === 'state_changed') {
          WS.handleStateChange(msg.event.data);
        }
        break;
    }
  },

  send(payload, callback) {
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;
    payload.id = state.msgId++;
    if (callback) state.callbacks[payload.id] = callback;
    state.ws.send(JSON.stringify(payload));
  },

  subscribeEvents() {
    WS.send({ type: 'subscribe_events', event_type: 'state_changed' });
  },

  fetchStates() {
    WS.send({ type: 'get_states' }, (states) => {
      states.forEach(s => WS.applyHAState(s));
    });
  },

  applyHAState(entity) {
    // Map Home Assistant entity_ids to dashboard state
    const id = entity.entity_id;
    const s  = entity.state;
    const a  = entity.attributes || {};

    if (id.startsWith('light.')) {
      const room = id.replace('light.', '').split('_')[0];
      if (state.rooms[room]) {
        state.rooms[room].lightsOn    = s === 'on';
        state.rooms[room].brightness  = a.brightness ? Math.round(a.brightness / 2.55) : 0;
      }
    }
    if (id.startsWith('climate.')) {
      const room = id.replace('climate.', '').split('_')[0];
      if (state.rooms[room]) {
        state.rooms[room].temp = parseFloat(a.current_temperature) || state.rooms[room].temp;
        state.rooms[room].mode = a.hvac_action || 'off';
      }
    }
    if (id.startsWith('sensor.') && id.includes('humidity')) {
      const room = id.replace('sensor.', '').split('_')[0];
      if (state.rooms[room]) state.rooms[room].humidity = parseFloat(s) || state.rooms[room].humidity;
    }
    if (id.startsWith('lock.')) {
      const sensor = state.security.sensors.find(s => id.includes(s.name.toLowerCase().replace(/ /g,'_')));
      if (sensor) sensor.state = s;
    }
    if (id === 'sensor.energy_power') {
      state.energy.now = parseFloat(s) || state.energy.now;
    }
    if (id === 'sensor.solar_power') {
      state.energy.solar = parseFloat(s) || state.energy.solar;
    }
    UI.refreshAll();
  },

  handleStateChange(data) {
    WS.applyHAState(data.new_state);
    addActivity(`<strong>${data.entity_id}</strong> changed to ${data.new_state?.state}`, '#5b9cf6');
  },

  callService(domain, service, target, data = {}) {
    if (state.demo) return; // demo mode — state already mutated directly
    WS.send({
      type: 'call_service',
      domain, service,
      target: { entity_id: target },
      service_data: data
    });
  },

  setStatus(s) {
    state.connected = s === 'connected';
    const dot   = document.getElementById('wsDot');
    const label = document.getElementById('wsLabel');
    if (!dot) return;
    dot.className   = `ws-dot ${s}`;
    label.textContent = s === 'connected'  ? 'Live · HA connected'
                      : s === 'connecting' ? 'Connecting…'
                      : s === 'demo'       ? 'Demo mode'
                      : 'Disconnected';
  },

  /* ── DEMO SIMULATION ── */
  startDemo() {
    WS.setStatus('demo');
    toast('Running in demo mode — simulated live data', 'warning');
    state.simTimer = setInterval(WS.simulate, CONFIG.simulationInterval);
  },

  simulate() {
    // Drift temperatures
    Object.values(state.rooms).forEach(r => {
      r.temp += (Math.random() - 0.5) * 0.4;
      r.temp = Math.round(r.temp * 10) / 10;
      r.humidity = Math.min(95, Math.max(30, r.humidity + (Math.random() - 0.5) * 1.5));
      r.co2 = Math.round(Math.min(1500, Math.max(400, r.co2 + (Math.random() - 0.5) * 20)));
    });

    // Drift energy
    state.energy.now   = Math.max(0.2, +(state.energy.now + (Math.random()-0.5)*0.15).toFixed(2));
    state.energy.solar = Math.max(0,   +(state.energy.solar + (Math.random()-0.5)*0.08).toFixed(2));
    state.energy.battery = Math.min(100, Math.max(10, state.energy.battery + (Math.random()-0.4)*0.5));
    state.energy.today += state.energy.now / 900;
    state.energy.cost   = +(state.energy.today * 0.231).toFixed(2);

    // Music progress
    if (state.music.playing) {
      state.music.progress = (state.music.progress + 1) % state.music.duration;
    }

    // Appliance progress
    state.appliances.forEach(ap => {
      if (ap.running && ap.progress >= 0 && ap.progress < 100) {
        ap.progress = Math.min(100, ap.progress + 0.5);
        if (ap.progress >= 100) {
          ap.running = false;
          ap.status  = 'Cycle complete';
          addActivity(`<strong>${ap.name}</strong> cycle complete`, '#4cde80');
        }
      }
    });

    // Occasional random activity
    if (Math.random() < 0.15) {
      const events = [
        { text: '<strong>Motion detected</strong> — front door camera', color: '#ff5c5c' },
        { text: '<strong>Solar output</strong> updated',                 color: '#f5a623' },
        { text: '<strong>Climate</strong> adjusted for comfort',         color: '#2de0c0' },
        { text: '<strong>Robot vacuum</strong> zone complete',           color: '#4cde80' }
      ];
      const ev = events[Math.floor(Math.random() * events.length)];
      addActivity(ev.text, ev.color);
    }

    // Update overview stats
    document.getElementById('stat-power').textContent = state.energy.now + 'kW';
    const avgTemp = Math.round(Object.values(state.rooms).reduce((a,r)=>a+r.temp,0)/Object.keys(state.rooms).length);
    document.getElementById('stat-temp').textContent = avgTemp + '°';

    // Refresh active panel
    UI.refreshActive();
  }
};

/* ══════════════════════════════════════
   NAVIGATION
══════════════════════════════════════ */
const Nav = {
  current: 'overview',

  init() {
    document.querySelectorAll('.nav-item').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        Nav.go(a.dataset.panel);
        // Close sidebar on mobile
        if (window.innerWidth <= 768) Sidebar.close();
      });
    });
  },

  go(panel) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(a => a.classList.remove('active'));

    const target = document.getElementById(`panel-${panel}`);
    const navItem = document.querySelector(`.nav-item[data-panel="${panel}"]`);

    if (target)  target.classList.add('active');
    if (navItem) navItem.classList.add('active');

    Nav.current = panel;
    document.getElementById('topbarTitle').textContent =
      navItem ? navItem.querySelector('span').textContent : panel;

    UI.renderPanel(panel);
  }
};

/* ══════════════════════════════════════
   SIDEBAR (mobile)
══════════════════════════════════════ */
const Sidebar = {
  overlay: null,

  init() {
    const sidebar = document.getElementById('sidebar');
    const toggle  = document.getElementById('menuToggle');

    this.overlay = document.createElement('div');
    this.overlay.className = 'sidebar-overlay';
    document.body.appendChild(this.overlay);

    toggle.addEventListener('click', () => {
      sidebar.classList.contains('open') ? Sidebar.close() : Sidebar.open();
    });
    this.overlay.addEventListener('click', Sidebar.close);
  },

  open() {
    document.getElementById('sidebar').classList.add('open');
    Sidebar.overlay.classList.add('visible');
  },

  close() {
    document.getElementById('sidebar').classList.remove('open');
    Sidebar.overlay.classList.remove('visible');
  }
};

/* ══════════════════════════════════════
   CLOCK
══════════════════════════════════════ */
function initClock() {
  const tick = () => {
    const now = new Date();
    const h   = now.getHours();
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

    const el = document.getElementById('topbarTime');
    if (el) el.textContent = timeStr;

    const ds = document.getElementById('dateString');
    if (ds) ds.textContent = dateStr;

    const tod = document.getElementById('timeOfDay');
    if (tod) tod.textContent = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  };
  tick();
  setInterval(tick, 10000);
}

/* ══════════════════════════════════════
   TOAST NOTIFICATIONS
══════════════════════════════════════ */
function toast(msg, type = 'success') {
  const icons = { success: '✓', warning: '⚠', error: '✕' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-msg">${msg}</span>`;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

/* ══════════════════════════════════════
   ACTIVITY LOG
══════════════════════════════════════ */
function addActivity(text, color) {
  const now  = new Date().toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
  state.activityLog.unshift({ color, text, time: now });
  if (state.activityLog.length > 20) state.activityLog.pop();
  if (Nav.current === 'overview') UI.renderActivity();
}

/* ══════════════════════════════════════
   UI RENDER ENGINE
══════════════════════════════════════ */
const UI = {
  refreshAll()    { UI.renderPanel(Nav.current); },
  refreshActive() { UI.renderPanel(Nav.current); },

  renderPanel(panel) {
    const renders = {
      overview:      UI.renderOverview,
      lighting:      UI.renderLighting,
      climate:       UI.renderClimate,
      security:      UI.renderSecurity,
      energy:        UI.renderEnergy,
      entertainment: UI.renderEntertainment,
      appliances:    UI.renderAppliances,
      garden:        UI.renderGarden,
      family:        UI.renderFamily,
      automations:   UI.renderAutomations,
      water:         UI.renderWater,
      health:        UI.renderHealth,
      settings:      UI.renderSettings
    };
    if (renders[panel]) renders[panel]();
  },

  /* ─── OVERVIEW ─── */
  renderOverview() {
    // Update room cards live values
    Object.entries(state.rooms).forEach(([key, r]) => {
      const tempEl = document.getElementById(`temp-${key}`);
      if (tempEl) tempEl.textContent = r.temp.toFixed(1) + '°C';

      // Sync brightness sliders
      const slider = document.querySelector(`.room-slider[data-room="${key}"]`);
      if (slider) slider.value = r.brightness;

      // Sync light device tags
      const lightTag = document.getElementById(`light-${key}`);
      if (lightTag) {
        lightTag.className = `device-tag${r.lightsOn ? ' on' : ''}`;
        lightTag.innerHTML = `Lights <em>${r.lightsOn ? 'on' : 'off'}</em>`;
      }
    });
    UI.renderActivity();
    wireRoomSliders();
  },

  renderActivity() {
    const feed = document.getElementById('activityFeed');
    if (!feed) return;
    feed.innerHTML = state.activityLog.map(a => `
      <div class="activity-item">
        <span class="activity-dot" style="background:${a.color}"></span>
        <span class="activity-text">${a.text}</span>
        <span class="activity-time">${a.time}</span>
      </div>
    `).join('');
  },

  /* ─── LIGHTING ─── */
  renderLighting() {
    const zones = document.getElementById('lightZones');
    if (!zones) return;

    zones.innerHTML = Object.entries(state.rooms).map(([key, r]) => `
      <div class="light-zone-card">
        <div class="lz-top">
          <span class="lz-name">${r.name}</span>
          <label class="toggle-switch">
            <input type="checkbox" ${r.lightsOn ? 'checked' : ''} onchange="toggleLight('${key}', this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="lz-controls">
          <div class="lz-row">
            <span class="lz-row-label">Brightness</span>
            <input type="range" min="0" max="100" value="${r.brightness}"
              oninput="setLightBrightness('${key}', this.value)"
              ${r.lightsOn ? '' : 'disabled'} />
            <span style="font-family:var(--font-data);font-size:11px;color:var(--text-muted);width:28px">${r.brightness}%</span>
          </div>
        </div>
      </div>
    `).join('');

    const cs = document.getElementById('colorScenes');
    if (!cs) return;
    cs.innerHTML = state.colorScenes.map((s, i) => `
      <button class="color-scene-btn ${i===0?'active':''}"
        style="background:${s.color}"
        title="${s.label}"
        onclick="applyColorScene('${s.label}', this)">
      </button>
    `).join('');
  },

  /* ─── CLIMATE ─── */
  renderClimate() {
    const grid = document.getElementById('climateGrid');
    if (!grid) return;

    grid.innerHTML = Object.entries(state.rooms).map(([key, r]) => `
      <div class="climate-card">
        <div class="climate-card-header">
          <span class="climate-room">${r.name}</span>
          <span class="climate-mode ${r.mode}">${r.mode === 'cool' ? '❄️ Cool' : r.mode === 'heat' ? '🔥 Heat' : r.mode === 'auto' ? '⚡ Auto' : '— Off'}</span>
        </div>
        <div class="climate-temps">
          <span class="climate-current">${r.temp.toFixed(1)}<sup>°C</sup></span>
          <div>
            <div class="climate-target">Target <strong>${(r.temp + 0.5).toFixed(1)}°</strong></div>
          </div>
        </div>
        <div class="climate-stats">
          <div class="climate-stat">
            <div class="climate-stat-val">${r.humidity.toFixed(0)}%</div>
            <div class="climate-stat-lbl">Humidity</div>
          </div>
          <div class="climate-stat">
            <div class="climate-stat-val">${r.co2}</div>
            <div class="climate-stat-lbl">CO₂ ppm</div>
          </div>
          <div class="climate-stat">
            <div class="climate-stat-val" style="color:${r.co2>1000?'var(--red)':r.co2>700?'var(--amber)':'var(--green)'}">
              ${r.co2 > 1000 ? 'Poor' : r.co2 > 700 ? 'Fair' : 'Good'}
            </div>
            <div class="climate-stat-lbl">Air</div>
          </div>
        </div>
        <div style="margin-top:14px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">Target temperature</div>
          <input type="range" min="15" max="30" step="0.5" value="${(r.temp+0.5).toFixed(1)}"
            oninput="setTargetTemp('${key}', this.value)" />
        </div>
      </div>
    `).join('');
  },

  /* ─── SECURITY ─── */
  renderSecurity() {
    const sensorList = document.getElementById('sensorList');
    if (sensorList) {
      sensorList.innerHTML = state.security.sensors.map(s => `
        <div class="sensor-item">
          <div>
            <div class="sensor-name">${s.name}</div>
            <div class="sensor-location">${s.location}</div>
          </div>
          <span class="sensor-badge ${s.state}">${s.state}</span>
        </div>
      `).join('');
    }

    const camGrid = document.getElementById('cameraGrid');
    if (camGrid) {
      camGrid.innerHTML = state.security.cameras.map(c => `
        <div class="camera-card">
          <div class="camera-preview">${c.icon}</div>
          <div class="camera-footer">
            <span class="camera-name">${c.name}</span>
            ${c.live ? '<span class="camera-live">● LIVE</span>' : '<span style="font-size:10px;color:var(--text-muted)">Offline</span>'}
          </div>
        </div>
      `).join('');
    }

    const btn   = document.getElementById('alarmBtn');
    const bar   = document.getElementById('alarmBar');
    const astate= document.getElementById('alarmState');
    if (btn) {
      if (state.security.armed) {
        btn.textContent = 'Disarm';
        btn.className = 'alarm-btn disarm';
        astate.innerHTML = `<span class="alarm-icon">🔒</span><div><div class="alarm-title">System secured</div><div class="alarm-sub">All doors locked · No alerts</div></div>`;
      } else {
        btn.textContent = 'Arm system';
        btn.className = 'alarm-btn arm';
        astate.innerHTML = `<span class="alarm-icon">🔓</span><div><div class="alarm-title">System disarmed</div><div class="alarm-sub">Click to re-arm</div></div>`;
      }
      btn.onclick = toggleAlarm;
    }
  },

  /* ─── ENERGY ─── */
  renderEnergy() {
    const summary = document.getElementById('energySummary');
    if (summary) {
      const e = state.energy;
      summary.innerHTML = `
        <div class="energy-card">
          <div class="energy-card-val" style="color:var(--amber)">${e.now.toFixed(2)} kW</div>
          <div class="energy-card-lbl">Live consumption</div>
          <div class="energy-card-delta down">↓ vs 30 min avg</div>
        </div>
        <div class="energy-card">
          <div class="energy-card-val" style="color:var(--green)">${e.solar.toFixed(2)} kW</div>
          <div class="energy-card-lbl">Solar generation</div>
          <div class="energy-card-delta down">☀️ Active</div>
        </div>
        <div class="energy-card">
          <div class="energy-card-val" style="color:var(--teal)">${e.battery.toFixed(0)}%</div>
          <div class="energy-card-lbl">Battery storage</div>
          <div class="energy-card-delta ${e.battery>50?'down':'up'}">${e.battery>50?'↑ Charging':'↓ Discharging'}</div>
        </div>
        <div class="energy-card">
          <div class="energy-card-val">${e.today.toFixed(1)} kWh</div>
          <div class="energy-card-lbl">Used today</div>
          <div class="energy-card-delta">€${e.cost.toFixed(2)} cost</div>
        </div>
        <div class="energy-card">
          <div class="energy-card-val" style="color:var(--blue)">${e.ev.soc}%</div>
          <div class="energy-card-lbl">EV battery</div>
          <div class="energy-card-delta ${e.ev.charging?'down':'up'}">${e.ev.charging?`⚡ ${e.ev.rate}kW charging`:'Not charging'}</div>
        </div>
      `;
    }

    const cl = document.getElementById('consumerList');
    if (cl) {
      cl.innerHTML = state.energy.consumers.map(c => `
        <div class="consumer-item">
          <span class="consumer-name">${c.name}</span>
          <div class="consumer-bar-wrap"><div class="consumer-bar" style="width:${c.pct}%"></div></div>
          <span class="consumer-val">${c.watts}W</span>
        </div>
      `).join('');
    }

    UI.drawEnergyChart();
  },

  drawEnergyChart() {
    const canvas = document.getElementById('energyChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W   = canvas.parentElement.offsetWidth - 32;
    const H   = 160;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.scale(dpr, dpr);

    const data = state.energy.hourly;
    const max  = Math.max(...data) * 1.15;
    const padL = 36, padB = 28, padT = 10, padR = 10;
    const cW   = W - padL - padR;
    const cH   = H - padT - padB;

    ctx.clearRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    [0.25, 0.5, 0.75, 1].forEach(p => {
      const y = padT + cH * (1 - p);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(139,145,168,0.7)';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      ctx.fillText((max * p).toFixed(1), padL - 4, y + 3);
    });

    // Hour labels
    const hours = ['0','3','6','9','12','15','18','21','23'];
    const hIdxs = [0,3,6,9,12,15,18,21,23];
    ctx.fillStyle = 'rgba(139,145,168,0.7)';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    hIdxs.forEach((h, i) => {
      const x = padL + (h / 23) * cW;
      ctx.fillText(hours[i]+'h', x, H - 6);
    });

    // Area gradient fill
    const grad = ctx.createLinearGradient(0, padT, 0, padT + cH);
    grad.addColorStop(0,   'rgba(245,166,35,0.3)');
    grad.addColorStop(1,   'rgba(245,166,35,0.01)');

    ctx.beginPath();
    data.forEach((v, i) => {
      const x = padL + (i / (data.length - 1)) * cW;
      const y = padT + cH * (1 - v / max);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(padL + cW, padT + cH);
    ctx.lineTo(padL, padT + cH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = '#f5a623';
    ctx.lineWidth   = 2;
    ctx.lineJoin    = 'round';
    ctx.lineCap     = 'round';
    data.forEach((v, i) => {
      const x = padL + (i / (data.length - 1)) * cW;
      const y = padT + cH * (1 - v / max);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Current hour dot
    const nowH = new Date().getHours();
    const dotX  = padL + (nowH / 23) * cW;
    const dotY  = padT + cH * (1 - (data[nowH] || 0) / max);
    ctx.beginPath();
    ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
    ctx.fillStyle   = '#f5a623';
    ctx.strokeStyle = '#0d0f14';
    ctx.lineWidth   = 2;
    ctx.fill();
    ctx.stroke();
  },

  /* ─── ENTERTAINMENT ─── */
  renderEntertainment() {
    const np = document.getElementById('nowPlaying');
    if (np) {
      const m = state.music;
      const pct = Math.round((m.progress / m.duration) * 100);
      const fmt = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
      np.innerHTML = `
        <div class="np-art">${m.album}</div>
        <div class="np-info">
          <div class="np-track">${m.track}</div>
          <div class="np-artist">${m.artist}</div>
          <div class="np-controls">
            <button class="np-btn" onclick="prevTrack()">⏮</button>
            <button class="np-btn play" onclick="togglePlay()">${m.playing ? '⏸' : '▶'}</button>
            <button class="np-btn" onclick="nextTrack()">⏭</button>
            <div class="np-progress">
              <span class="np-time">${fmt(m.progress)}</span>
              <input type="range" min="0" max="${m.duration}" value="${m.progress}"
                oninput="seekTrack(this.value)" />
              <span class="np-time">${fmt(m.duration)}</span>
            </div>
          </div>
        </div>
      `;
    }

    const sz = document.getElementById('speakerZones');
    if (sz) {
      sz.innerHTML = state.music.zones.map(z => `
        <div class="speaker-card">
          <div class="speaker-top">
            <span class="speaker-name">${z.name}</span>
            <label class="toggle-switch">
              <input type="checkbox" ${z.playing ? 'checked':''} onchange="toggleZone('${z.id}', this.checked)">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="speaker-vol">
            <span>🔈</span>
            <input type="range" min="0" max="100" value="${z.volume}"
              oninput="setZoneVolume('${z.id}', this.value)" ${z.playing ? '' : 'disabled'} />
            <span style="font-family:var(--font-data);font-size:11px;width:28px">${z.volume}%</span>
          </div>
        </div>
      `).join('');
    }
  },

  /* ─── APPLIANCES ─── */
  renderAppliances() {
    const grid = document.getElementById('applianceGrid');
    if (!grid) return;
    grid.innerHTML = state.appliances.map(ap => `
      <div class="appliance-card ${ap.running ? 'running' : ''}">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div class="appliance-icon-wrap">${ap.icon}</div>
          <label class="toggle-switch">
            <input type="checkbox" ${ap.running ? 'checked':''} onchange="toggleAppliance('${ap.id}', this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="appliance-name">${ap.name}</div>
        <div class="appliance-status ${ap.running ? 'active':''}">${ap.status}</div>
        ${ap.progress >= 0 ? `
          <div class="progress-track">
            <div class="progress-fill" style="width:${ap.progress}%"></div>
          </div>
          <div style="font-family:var(--font-data);font-size:11px;color:var(--text-muted);text-align:right">${ap.progress.toFixed(0)}%</div>
        ` : ''}
      </div>
    `).join('');
  },

  /* ─── GARDEN ─── */
  renderGarden() {
    const wc = document.getElementById('weatherCard');
    if (wc) {
      const w = state.garden.weather;
      wc.innerHTML = `
        <div class="weather-main">
          <div class="weather-icon">${w.icon}</div>
          <div class="weather-temp">${w.temp}°C</div>
          <div class="weather-desc">${w.desc}</div>
        </div>
        <div class="weather-stats">
          <div class="weather-stat">
            <div class="weather-stat-val">${w.humidity}%</div>
            <div class="weather-stat-lbl">Humidity</div>
          </div>
          <div class="weather-stat">
            <div class="weather-stat-val">${w.wind} km/h</div>
            <div class="weather-stat-lbl">Wind</div>
          </div>
          <div class="weather-stat">
            <div class="weather-stat-val">UV ${w.uv}</div>
            <div class="weather-stat-lbl">UV Index</div>
          </div>
          <div class="weather-stat">
            <div class="weather-stat-val">${w.rain} mm</div>
            <div class="weather-stat-lbl">Rain</div>
          </div>
        </div>
      `;
    }

    const ig = document.getElementById('irrigationGrid');
    if (ig) {
      ig.innerHTML = state.garden.irrigation.map(z => `
        <div class="irrigation-card">
          <div class="irrigation-info">
            <div class="irrigation-name">${z.name}</div>
            <div class="irrigation-next">${z.next}</div>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" ${z.active ? 'checked':''} onchange="toggleIrrigation('${z.id}', this.checked)">
            <span class="toggle-slider"></span>
          </label>
        </div>
      `).join('');
    }
  },

  /* ─── FAMILY ─── */
  renderFamily() {
    const fl = document.getElementById('familyList');
    if (fl) {
      fl.innerHTML = state.family.map(f => `
        <div class="family-card">
          <div class="family-avatar" style="background:${f.color}22;color:${f.color};border:1px solid ${f.color}44">
            ${f.initials}
          </div>
          <div class="family-info">
            <div class="family-name">${f.name}</div>
            <div class="family-location">📍 ${f.location}</div>
          </div>
          <span class="family-status ${f.status}">${f.status === 'home' ? '🏠 Home' : f.status === 'away' ? '🚗 Away' : '🏫 School'}</span>
        </div>
      `).join('');
    }

    const al = document.getElementById('accessLog');
    if (al) {
      al.innerHTML = state.accessLog.map(a => `
        <div class="access-item">
          <span class="access-icon">${a.icon}</span>
          <span class="access-text">${a.text}</span>
          <span class="access-time">${a.time}</span>
        </div>
      `).join('');
    }
  },

  /* ─── AUTOMATIONS ─── */
  renderAutomations() {
    const list = document.getElementById('automationList');
    if (!list) return;
    list.innerHTML = state.automations.map(a => `
      <div class="automation-card">
        <div class="auto-icon">${a.icon}</div>
        <div class="auto-info">
          <div class="auto-name">${a.name}</div>
          <div class="auto-trigger">${a.trigger}</div>
          <div class="auto-last">Last ran: ${a.last}</div>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" ${a.active ? 'checked':''} onchange="toggleAutomation('${a.name}', this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </div>
    `).join('');
  },

  /* ─── WATER ─── */
  renderWater() {
    const summary = document.getElementById('waterSummary');
    if (summary) {
      const w = state.water;
      summary.innerHTML = `
        <div class="energy-card">
          <div class="energy-card-val" style="color:var(--blue)">${w.dailyUsage} L</div>
          <div class="energy-card-lbl">Used today</div>
          <div class="energy-card-delta down">↓ 8% vs avg</div>
        </div>
        <div class="energy-card">
          <div class="energy-card-val" style="color:var(--teal)">${w.monthlyUsage} L</div>
          <div class="energy-card-lbl">This month</div>
          <div class="energy-card-delta down">On track</div>
        </div>
        <div class="energy-card">
          <div class="energy-card-val" style="color:${w.leakSensors.some(l=>l.status==='alert')?'var(--red)':'var(--green)'}">
            ${w.leakSensors.some(l=>l.status==='alert') ? '⚠ Alert' : '✓ Clear'}
          </div>
          <div class="energy-card-lbl">Leak sensors</div>
          <div class="energy-card-delta ${w.leakSensors.some(l=>l.status==='alert')?'up':'down'}">
            ${w.leakSensors.filter(l=>l.status==='alert').length} alert(s)
          </div>
        </div>
      `;
    }

    const ll = document.getElementById('leakList');
    if (ll) {
      ll.innerHTML = `<div class="sensor-list">${state.water.leakSensors.map(lk => `
        <div class="sensor-item">
          <div>
            <div class="sensor-name">${lk.name}</div>
            <div class="sensor-location">${lk.location}</div>
          </div>
          <span class="sensor-badge ${lk.status === 'dry' ? 'locked' : 'open'}">
            ${lk.status === 'dry' ? '💧 Dry' : '🚨 Leak detected'}
          </span>
        </div>
      `).join('')}</div>`;

      if (state.water.leakSensors.some(l => l.status === 'alert')) {
        toast('🚨 Leak detected — Garden Tap sensor', 'error');
      }
    }

    const hw = document.getElementById('hotwaterCard');
    if (hw) {
      const h = state.water.hotwater;
      hw.innerHTML = `
        <div class="climate-card" style="max-width:360px">
          <div class="climate-card-header">
            <span class="climate-room">Hot Water Boiler</span>
            <span class="climate-mode ${h.mode === 'eco' ? 'auto' : 'heat'}">${h.mode === 'eco' ? '🌿 Eco' : '🔥 Boost'}</span>
          </div>
          <div class="climate-temps">
            <span class="climate-current">${h.temp}<sup>°C</sup></span>
            <div><div class="climate-target">Target <strong>${h.target}°</strong></div></div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px">
            <span style="font-size:13px;color:var(--text-secondary)">Scheduled heating</span>
            <label class="toggle-switch">
              <input type="checkbox" ${h.scheduleOn ? 'checked' : ''} onchange="toggleHotWaterSchedule(this.checked)">
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div style="margin-top:12px">
            <input type="range" min="40" max="75" value="${h.target}" oninput="setHotWaterTemp(this.value)" />
          </div>
        </div>
      `;
    }
  },

  /* ─── HEALTH ─── */
  renderHealth() {
    const grid = document.getElementById('healthGrid');
    if (grid) {
      grid.innerHTML = state.health.rooms.map(r => {
        const scoreColor = r.score === 'Excellent' ? 'var(--green)'
                         : r.score === 'Good'      ? 'var(--teal)'
                         : r.score === 'Fair'      ? 'var(--amber)'
                         : 'var(--red)';
        return `
        <div class="climate-card">
          <div class="climate-card-header">
            <span class="climate-room">${r.name}</span>
            <span style="font-size:12px;color:${scoreColor};font-weight:500">${r.score}</span>
          </div>
          <div class="climate-stats">
            <div class="climate-stat">
              <div class="climate-stat-val" style="color:${r.aqi < 25 ? 'var(--green)' : r.aqi < 50 ? 'var(--amber)' : 'var(--red)'}">${r.aqi}</div>
              <div class="climate-stat-lbl">AQI</div>
            </div>
            <div class="climate-stat">
              <div class="climate-stat-val">${r.pm25} µg</div>
              <div class="climate-stat-lbl">PM2.5</div>
            </div>
            <div class="climate-stat">
              <div class="climate-stat-val">${r.voc}</div>
              <div class="climate-stat-lbl">VOC ppb</div>
            </div>
          </div>
        </div>
      `}).join('');
    }

    const sc = document.getElementById('sleepCards');
    if (sc) {
      sc.innerHTML = state.health.sleep.map(s => `
        <div class="family-card" style="flex-direction:column;align-items:flex-start;gap:10px">
          <div style="display:flex;align-items:center;gap:12px;width:100%">
            <div class="family-avatar" style="background:var(--blue-dim);color:var(--blue);border:1px solid rgba(91,156,246,0.25)">
              ${s.name[0]}
            </div>
            <div class="family-info">
              <div class="family-name">${s.name}</div>
              <div class="family-location">Sleep score: <strong style="color:var(--amber)">${s.score}/100</strong> ${s.trend}</div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;width:100%">
            <div class="climate-stat">
              <div class="climate-stat-val" style="color:var(--teal)">${s.hours}h</div>
              <div class="climate-stat-lbl">Total</div>
            </div>
            <div class="climate-stat">
              <div class="climate-stat-val" style="color:var(--blue)">${s.deep}h</div>
              <div class="climate-stat-lbl">Deep</div>
            </div>
            <div class="climate-stat">
              <div class="climate-stat-val" style="color:${s.score>85?'var(--green)':s.score>70?'var(--amber)':'var(--red)'}">
                ${s.score > 85 ? 'Great' : s.score > 70 ? 'Good' : 'Poor'}
              </div>
              <div class="climate-stat-lbl">Rating</div>
            </div>
          </div>
        </div>
      `).join('');
    }
  },

  /* ─── SETTINGS ─── */
  renderSettings() {
    const haHost  = document.getElementById('haHost');
    const haPort  = document.getElementById('haPort');
    const haToken = document.getElementById('haToken');
    const demoTog = document.getElementById('demoToggle');

    if (haHost)  haHost.value  = CONFIG.ha.host;
    if (haPort)  haPort.value  = CONFIG.ha.port;
    if (haToken) haToken.value = CONFIG.ha.token;
    if (demoTog) demoTog.checked = state.demo;

    const connectBtn = document.getElementById('connectBtn');
    if (connectBtn) {
      connectBtn.onclick = () => {
        CONFIG.ha.host  = document.getElementById('haHost').value.trim();
        CONFIG.ha.port  = document.getElementById('haPort').value.trim();
        CONFIG.ha.token = document.getElementById('haToken').value.trim();
        localStorage.setItem('ha_host',  CONFIG.ha.host);
        localStorage.setItem('ha_port',  CONFIG.ha.port);
        localStorage.setItem('ha_token', CONFIG.ha.token);
        state.demo = false;
        if (state.simTimer) clearInterval(state.simTimer);
        if (state.ws) state.ws.close();
        toast('Connecting to Home Assistant…', 'warning');
        WS.connect();
      };
    }

    const demoToggle = document.getElementById('demoToggle');
    if (demoToggle) {
      demoToggle.onchange = (e) => {
        state.demo = e.target.checked;
        if (state.demo) {
          if (state.ws) state.ws.close();
          WS.startDemo();
        } else {
          if (state.simTimer) clearInterval(state.simTimer);
          WS.connect();
        }
      };
    }
  }
};

/* ══════════════════════════════════════
   SCENE CONTROL
══════════════════════════════════════ */
function activateScene(sceneName) {
  const scenes = {
    evening: () => {
      Object.values(state.rooms).forEach(r => { r.lightsOn = true; r.brightness = 65; });
      toast('🌆 Evening scene activated', 'success');
    },
    morning: () => {
      Object.values(state.rooms).forEach(r => { r.lightsOn = true; r.brightness = 90; r.mode = 'auto'; });
      toast('🌅 Morning scene activated', 'success');
    },
    away: () => {
      Object.values(state.rooms).forEach(r => { r.lightsOn = false; r.brightness = 0; });
      state.security.armed = true;
      toast('🔒 Away mode — home secured', 'success');
    },
    sleep: () => {
      Object.values(state.rooms).forEach(r => { r.lightsOn = false; r.brightness = 0; });
      state.rooms.bedroom.lightsOn = false;
      state.music.playing = false;
      toast('🌙 Good night — sleep mode on', 'success');
    },
    party: () => {
      Object.values(state.rooms).forEach(r => { r.lightsOn = true; r.brightness = 100; });
      state.music.playing = true;
      state.music.volume = 90;
      toast('🎉 Party mode — let\'s go!', 'success');
    },
    cinema: () => {
      state.rooms.living.brightness = 15;
      state.music.playing = false;
      toast('🎬 Cinema mode — enjoy the film!', 'success');
    }
  };
  if (scenes[sceneName]) scenes[sceneName]();
  document.querySelectorAll('.scene-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll(`.scene-btn[data-scene="${sceneName}"]`).forEach(b => b.classList.add('active'));
  addActivity(`<strong>${sceneName.charAt(0).toUpperCase()+sceneName.slice(1)}</strong> scene activated`, '#f5a623');
}

/* ══════════════════════════════════════
   CONTROL HANDLERS
══════════════════════════════════════ */
function toggleLight(room, on) {
  if (!state.rooms[room]) return;
  state.rooms[room].lightsOn = on;
  state.rooms[room].brightness = on ? 70 : 0;
  WS.callService('light', on ? 'turn_on' : 'turn_off', `light.${room}`);
  addActivity(`<strong>${state.rooms[room].name}</strong> lights ${on ? 'on' : 'off'}`, on ? '#4cde80' : '#8b91a8');
  UI.renderLighting();
}

function setLightBrightness(room, val) {
  if (!state.rooms[room]) return;
  state.rooms[room].brightness = parseInt(val);
  WS.callService('light', 'turn_on', `light.${room}`, { brightness_pct: parseInt(val) });
}

function applyColorScene(label, btn) {
  document.querySelectorAll('.color-scene-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  toast(`🎨 Color scene: ${label}`, 'success');
  addActivity(`<strong>Color scene</strong> set to ${label}`, '#7e57c2');
}

function setTargetTemp(room, val) {
  toast(`🌡️ ${state.rooms[room]?.name} → ${parseFloat(val).toFixed(1)}°C`, 'success');
  WS.callService('climate', 'set_temperature', `climate.${room}`, { temperature: parseFloat(val) });
}

function toggleAlarm() {
  state.security.armed = !state.security.armed;
  addActivity(`<strong>Security system</strong> ${state.security.armed ? 'armed' : 'disarmed'}`, state.security.armed ? '#4cde80' : '#f5a623');
  toast(state.security.armed ? '🔒 System armed' : '🔓 System disarmed', state.security.armed ? 'success' : 'warning');
  UI.renderSecurity();
}

function togglePlay() {
  state.music.playing = !state.music.playing;
  UI.renderEntertainment();
}

function prevTrack() {
  const tracks = [
    { track: 'Midnight City',  artist: 'M83'           },
    { track: 'Breathe',        artist: 'Pink Floyd'     },
    { track: 'Starboy',        artist: 'The Weeknd'     },
    { track: 'Redbone',        artist: 'Childish Gambino'},
    { track: 'Blinding Lights',artist: 'The Weeknd'     }
  ];
  const idx = tracks.findIndex(t => t.track === state.music.track);
  const prev = tracks[(idx - 1 + tracks.length) % tracks.length];
  state.music.track    = prev.track;
  state.music.artist   = prev.artist;
  state.music.progress = 0;
  UI.renderEntertainment();
}

function nextTrack() {
  const tracks = [
    { track: 'Midnight City',  artist: 'M83'            },
    { track: 'Breathe',        artist: 'Pink Floyd'      },
    { track: 'Starboy',        artist: 'The Weeknd'      },
    { track: 'Redbone',        artist: 'Childish Gambino'},
    { track: 'Blinding Lights',artist: 'The Weeknd'      }
  ];
  const idx  = tracks.findIndex(t => t.track === state.music.track);
  const next = tracks[(idx + 1) % tracks.length];
  state.music.track    = next.track;
  state.music.artist   = next.artist;
  state.music.progress = 0;
  addActivity(`<strong>Now playing</strong> ${next.track} — ${next.artist}`, '#5b9cf6');
  UI.renderEntertainment();
}

function seekTrack(val) {
  state.music.progress = parseInt(val);
}

function toggleZone(id, on) {
  const zone = state.music.zones.find(z => z.id === id);
  if (zone) { zone.playing = on; if (!on) zone.volume = 0; else zone.volume = 50; }
  UI.renderEntertainment();
}

function setZoneVolume(id, val) {
  const zone = state.music.zones.find(z => z.id === id);
  if (zone) zone.volume = parseInt(val);
}

function toggleAppliance(id, on) {
  const ap = state.appliances.find(a => a.id === id);
  if (!ap) return;
  ap.running  = on;
  ap.progress = on ? 0 : ap.progress;
  ap.status   = on ? 'Starting…' : 'Standby';
  addActivity(`<strong>${ap.name}</strong> turned ${on ? 'on' : 'off'}`, on ? '#2de0c0' : '#8b91a8');
  toast(`${ap.icon} ${ap.name} ${on ? 'started' : 'stopped'}`, on ? 'success' : 'warning');
  UI.renderAppliances();
}

function toggleIrrigation(id, on) {
  const zone = state.garden.irrigation.find(z => z.id === id);
  if (!zone) return;
  zone.active = on;
  zone.next   = on ? 'Running now' : 'Paused';
  addActivity(`<strong>Irrigation</strong> ${zone.name} ${on ? 'started' : 'stopped'}`, on ? '#4cde80' : '#8b91a8');
  toast(`💧 ${zone.name} irrigation ${on ? 'started' : 'stopped'}`, on ? 'success' : 'warning');
  UI.renderGarden();
}

function toggleHotWaterSchedule(on) {
  state.water.hotwater.scheduleOn = on;
  toast(`🚿 Hot water schedule ${on ? 'enabled' : 'disabled'}`, on ? 'success' : 'warning');
}

function setHotWaterTemp(val) {
  state.water.hotwater.target = parseInt(val);
  toast(`🌡️ Hot water target → ${val}°C`, 'success');
}

function toggleAutomation(name, on) {
  const auto = state.automations.find(a => a.name === name);
  if (auto) auto.active = on;
  toast(`⚡ Automation "${name}" ${on ? 'enabled' : 'disabled'}`, on ? 'success' : 'warning');
}

/* ══════════════════════════════════════
   ROOM SLIDER WIRING (overview panel)
══════════════════════════════════════ */
function wireRoomSliders() {
  document.querySelectorAll('.room-slider').forEach(slider => {
    slider.addEventListener('input', function () {
      const room = this.dataset.room;
      if (state.rooms[room]) {
        state.rooms[room].brightness = parseInt(this.value);
        WS.callService('light', 'turn_on', `light.${room}`, { brightness_pct: parseInt(this.value) });
      }
    });
  });

  document.querySelectorAll('.scene-btn').forEach(btn => {
    btn.addEventListener('click', () => activateScene(btn.dataset.scene));
  });
}

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  initClock();
  Nav.init();
  Sidebar.init();

  // Initial overview render
  UI.renderPanel('overview');
  wireRoomSliders();

  // Kick WebSocket / demo
  WS.connect();

  // Window resize — redraw chart if on energy panel
  window.addEventListener('resize', () => {
    if (Nav.current === 'energy') UI.drawEnergyChart();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    const map = {
      '1':'overview','2':'lighting','3':'climate','4':'security',
      '5':'energy','6':'entertainment','7':'appliances','8':'garden',
      '9':'family','0':'automations'
    };
    if (map[e.key]) Nav.go(map[e.key]);
    if (e.key === 'Escape' && window.innerWidth <= 768) Sidebar.close();
  });

  console.log('%c SmartHome Dashboard ready ', 'background:#f5a623;color:#0d0f14;font-weight:bold;padding:4px 10px;border-radius:4px;');
});
