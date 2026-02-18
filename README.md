# M1 Abrams - Advanced Tank Combat (Browser)

A lightweight canvas tank-combat prototype with a modern HUD, AI enemies/allies, objective capture, and proximity alerts.

## Features
- Player-driven M1 Abrams with acceleration, braking, forward/reverse movement, and steering.
- Enhanced M1 visual model (better hull/turret shading, barrel detail, and track/wheel styling).
- Faster, more responsive hull mobility and turret traverse/elevation tuning for tighter combat feel.
- Turret aiming with mouse tracking and shell selection (APFSDS / HEAT / SMOKE).
- Enemy and ally AI units on a large battlefield.
- Flag capture objective (3 capture points).
- Tactical HUD: health, fuel, shell counts, reload progress, minimap, and control helper panel.

## Controls
- `W` / `ArrowUp`: move forward
- `S` / `ArrowDown`: move backward (reverse)
- `A` / `ArrowLeft`: steer left
- `D` / `ArrowRight`: steer right
- `Space`: brake
- `Left Mouse`: fire
- `1` / `2` / `3`: select shell type
- `R`: reload
- `F`: capture nearby flag
- `P`: pause
- `T`: open/close research modal

## Run
Open `index.html` in a modern browser.

Tip: for local-server behavior, run:

```bash
python -m http.server 8000
```

Then browse to `http://localhost:8000`.
