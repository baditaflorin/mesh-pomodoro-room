# mesh-pomodoro-room

[![Live](https://img.shields.io/badge/live-baditaflorin.github.io%2Fmesh--pomodoro--room-E36A3C?style=flat-square)](https://baditaflorin.github.io/mesh-pomodoro-room/)
[![Version](https://img.shields.io/github/package-json/v/baditaflorin/mesh-pomodoro-room?style=flat-square&color=8a7a4a)](https://github.com/baditaflorin/mesh-pomodoro-room/blob/main/package.json)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
[![No backend](https://img.shields.io/badge/backend-none-1a160a?style=flat-square)](docs/adr/0001-deployment-mode.md)

> Group pomodoro for co-located or remote teams. Every phone runs the same mesh-time-synced 25/5 timer with ambient signals — done early or stuck.

**Live:** https://baditaflorin.github.io/mesh-pomodoro-room/

Open the page on every phone in the team. Anyone agrees the format (default 25 focus / 5 break / 3 rounds), anyone presses **Start round 1**. Every phone vibrates and switches between focus and break at the exact same mesh-time instant. During focus, tap **done early** or **stuck** to give the room a quiet, anonymous signal — no names, just counts.

A phone that joins mid-session sees the same remaining time as everyone else, instantly. No "let me reset my timer."

## How it works

- Each phone joins a Yjs room over y-webrtc and runs the [mesh clock-sync primitive](src/features/sync/clockSync.ts) from `mesh-firefly-walk`.
- "Start" writes a single Y.Map entry: `{ startedAt: meshNow, cycleMs: { focus, break }, rounds }`.
- Each phone derives its display from `clock.meshNow() - startedAt`. No `setTimeout`. ([ADR 0002](docs/adr/0002-mesh-time-timer.md))
- Per-peer status (`focused | done | stuck | breaking`) lives in Yjs awareness, not in a durable Y.Array. ([ADR 0003](docs/adr/0003-ephemeral-signals.md))
- Phase transitions trigger `navigator.vibrate([120, 60, 120])` on every phone within clock-sync precision (~10–30 ms).

## Privacy threat model

See [docs/privacy.md](docs/privacy.md). The signals are ephemeral and anonymous: no log of who got stuck when, by design.

## Architecture

- **Mode A** — pure GitHub Pages.
- **WebRTC** — Yjs + y-webrtc with self-hosted signaling and TURN.

## Run it locally

```bash
git clone https://github.com/baditaflorin/mesh-pomodoro-room.git
cd mesh-pomodoro-room
npm install
npm run dev
```

## Self-hosted infrastructure

| Repo                                                                   | Endpoint                               | Role                      |
| ---------------------------------------------------------------------- | -------------------------------------- | ------------------------- |
| [signaling-server](https://github.com/baditaflorin/signaling-server)   | `wss://turn.0docker.com/ws`            | y-webrtc protocol fan-out |
| [turn-token-server](https://github.com/baditaflorin/turn-token-server) | `https://turn.0docker.com/credentials` | HMAC TURN creds           |
| [coturn-hetzner](https://github.com/baditaflorin/coturn-hetzner)       | `turn:turn.0docker.com:3479`           | TURN relay                |

## ADRs

- [0001 — Deployment mode](docs/adr/0001-deployment-mode.md)
- [0002 — Mesh-time drives the timer](docs/adr/0002-mesh-time-timer.md)
- [0003 — Signals are ephemeral awareness](docs/adr/0003-ephemeral-signals.md)
- [0010 — GitHub Pages publishing](docs/adr/0010-pages-publishing.md)

## License

[MIT](LICENSE) © 2026 Florin Badita
