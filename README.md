# SmartHome Dashboard

A modern, mobile-first smart home control interface built in pure HTML, CSS, and JavaScript.  
No frameworks, no build step — open `index.html` in any browser and it works.

---

## Files

```
index.html   — Full app shell: all 13 panels, nav, topbar, markup
styles.css   — Complete design system: dark theme, tokens, all components, responsive
script.js    — WebSocket engine, state store, all render functions, control handlers
README.md    — This file
```

---

## Features

### 13 system panels
| Panel | What it controls |
|---|---|
| Overview | Scene launcher, room cards, live activity feed |
| Lighting | Per-room on/off, dimming, color temperature scenes |
| Climate | Temperature, humidity, CO₂, HVAC mode per room |
| Security | Alarm arm/disarm, door/window sensors, camera grid |
| Energy | Live consumption, solar, battery, EV charger, hourly chart |
| AV & Music | Now playing, playback controls, multi-room speaker zones |
| Appliances | Washer, dryer, dishwasher, oven, robot vacuum + progress bars |
| Garden | Weather station, irrigation zone control |
| Water | Daily usage, leak sensors, hot water boiler control |
| Health | AQI / PM2.5 / VOC per room, sleep scores per person |
| Family | Presence tracking, access log |
| Automations | Routine list with enable/disable toggles |
| Settings | HA connection config + demo mode toggle |

---

## Connecting to Home Assistant

1. Open **Settings** panel in the dashboard
2. Enter your Home Assistant host (e.g. `homeassistant.local` or `192.168.1.x`)
3. Enter port (default `8123`)
4. Paste a **Long-Lived Access Token** from HA → Profile → Security
5. Disable demo mode toggle
6. Click **Connect to Home Assistant**

The dashboard connects via the HA WebSocket API (`ws://host:port/api/websocket`), subscribes to `state_changed` events, and fetches all entity states on connect. Scene activations and device control use the HA `call_service` message type.

### Entity mapping convention (default)
| HA entity prefix | Dashboard room |
|---|---|
| `light.living_*` | Living Room lighting |
| `climate.bedroom_*` | Bedroom HVAC |
| `sensor.*_humidity` | Room humidity |
| `lock.front_door` | Front Door sensor |
| `sensor.energy_power` | Live consumption |
| `sensor.solar_power` | Solar generation |

Adjust `WS.applyHAState()` in `script.js` to match your own entity IDs.

---

## Demo mode

On by default. Runs a realistic simulation engine every 4 seconds:
- Drifts temperature, humidity, CO₂ per room
- Fluctuates energy and solar readings
- Advances appliance cycle progress bars
- Fires random activity log entries

Disable in Settings → Demo mode to connect to a live Home Assistant instance.

---

## Keyboard shortcuts (desktop)

| Key | Panel |
|---|---|
| `1` | Overview |
| `2` | Lighting |
| `3` | Climate |
| `4` | Security |
| `5` | Energy |
| `6` | AV & Music |
| `7` | Appliances |
| `8` | Garden |
| `9` | Family |
| `0` | Automations |
| `Esc` | Close sidebar (mobile) |

---

## Protocol stack (reference)

```
Your Dashboard  (HTML / CSS / JS)
      ↕  WebSocket API + REST API
Home Assistant  (local hub — no cloud required)
      ↕
Matter 1.5 · Thread · Zigbee · Z-Wave · Wi-Fi
      ↕
Lights · Locks · Sensors · HVAC · Cameras · EV · Solar
```

Recommended hardware: **Home Assistant Green** (dedicated local server) +  
**Aeotec SmartThings Hub v3** (for Z-Wave + Zigbee bridge).

---

## Customisation quick-reference

| What | Where |
|---|---|
| Brand colours & tokens | `:root {}` block — top of `styles.css` |
| Add/remove rooms | `state.rooms` object in `script.js` |
| Add appliances | `state.appliances` array in `script.js` |
| Add door/camera sensors | `state.security.sensors/cameras` in `script.js` |
| Add automations | `state.automations` array in `script.js` |
| Change fonts | `<head>` Google Fonts link in `index.html` |
| Simulation speed | `CONFIG.simulationInterval` in `script.js` |

---

## Browser support

Chrome 90+, Firefox 88+, Safari 14+, Edge 90+. No polyfills required.

---

## Licence

MIT — free to use, modify, and ship products on top of.
